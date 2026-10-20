#!/usr/bin/env bun

import { Command } from "commander";
import { checkHealth, EMBED_MODEL } from "../../tb/src/infra.js";
import * as identity from "./identity.js";
import { serveApi, API_PORT } from "./api.js";
import { collect, die, errorMessage, out, outText, readGuide } from "../../common/cli.js";
import { blocksOf, ruleBlock, ruleView } from "../../common/render.js";
import { normalizeTags } from "../../common/tags.js";
import { ContractError } from "../../common/contract.js";
import { refineReport } from "../../tb/src/refine.js";
import { countedOf, COUNTERS_START } from "./refine.js";
import { promptTextsOf, reachOf } from "./reach.js";

// The prompt hook searches with these values.
const HOOK_LIMIT = "2";
const HOOK_MIN_SCORE = "0.5";
const SEARCHES_IN_FLIGHT = 8;


// ─── Output helpers ───────────────────────────────────────────────────────────

// ─── Health guard ─────────────────────────────────────────────────────────────

async function requireServices(opts: { needsEmbedding?: boolean } = {}): Promise<void> {
  const status = await checkHealth();
  const missing: string[] = [];

  if (!status.qdrant) missing.push("Qdrant");
  if (opts.needsEmbedding !== false) {
    if (!status.ollama) missing.push("Ollama");
    else if (!status.model) missing.push(`model ${EMBED_MODEL}`);
  }

  if (missing.length > 0) {
    die(`Services unavailable: ${missing.join(", ")}.\nStart services with: tb start`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Programma ────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("ti")
  .description("CLI for Third Identity — Context-Action Rules")
  .version("0.1.0");

program
  .command("add")
  .description("Embed a context (if) and associate it with an action (do)")
  .requiredOption("--if <string>", "Context/trigger")
  .requiredOption("--do <string>", "Action to perform")
  .option("--tags <tag>", "Tags (repeatable)", collect, [] as string[])
  .option("--exchange <id>", "Id of the tl exchange the rule comes from")
  .action(async (opts) => {
    await requireServices({ needsEmbedding: true });
    const entry = await identity.addEntry(opts.if, opts.do, normalizeTags(opts.tags), opts.exchange);
    out(entry);
  });

program
  .command("search <query>")
  .description("Semantic search for context rules")
  .option("--limit <n>", "Maximum number of results", "10")
  .option("--tags <tag>", "Filter by tag (repeatable)", collect, [] as string[])
  .option("--min-score <n>", "Minimum similarity score (0-1) to keep a result")
  .option("--json", "Print the full results as JSON instead of text blocks")
  .option("--no-hits", "Do not count this search as a hit on the returned rules")
  .option("--no-archived", "Leave out the archived rules")
  .action(async (query: string, opts) => {
    await requireServices({ needsEmbedding: true });
    const results = await identity.searchEntries(query, {
      limit: parseInt(opts.limit, 10),
      tags: opts.tags.length ? normalizeTags(opts.tags) : undefined,
      min_score: opts.minScore !== undefined ? parseFloat(opts.minScore) : undefined,
      record_hits: opts.hits,
      exclude_archived: opts.archived === false,
    });
    if (opts.json) out(results.map(ruleView));
    else outText(blocksOf(results.map(ruleBlock)));
  });

program
  .command("meta <id>")
  .description("Print the whole rule as JSON, without the vector. Accepts a full id or a unique prefix.")
  .action(async (id: string) => {
    await requireServices({ needsEmbedding: false });
    out(ruleView(await identity.entryById(id)));
  });

program
  .command("list")
  .description("List all identity rules")
  .option("--tags <tag>", "Filter by tag (repeatable)", collect, [] as string[])
  .action(async (opts) => {
    await requireServices({ needsEmbedding: false });
    const entries = await identity.listEntries(opts.tags.length ? normalizeTags(opts.tags) : undefined);
    out(entries);
  });

program
  .command("delete <id>")
  .description("Remove a rule by ID")
  .action(async (id: string) => {
    await requireServices({ needsEmbedding: false });
    const full = await identity.resolveEntryId(id);
    await identity.deleteEntry(full);
    out({ id: full, deleted: true });
  });

program
  .command("append-do <id>")
  .description("Append an action to an existing rule")
  .requiredOption("--do <string>", "Action to append")
  .action(async (id: string, opts) => {
    await requireServices({ needsEmbedding: false });
    const entry = await identity.appendDo(await identity.resolveEntryId(id), opts.do);
    out(entry);
  });

program
  .command("refine")
  .description("Print the trust spread, the rules under the floor and the plan. Writes only with --apply.")
  .option("--apply", "Write archived_at on the rules to archive, and remove it from the rules to restore")
  .action(async (opts) => {
    await requireServices({ needsEmbedding: false });
    const now = new Date();
    const rules = await identity.listEntries();
    const report = refineReport(rules.map((rule) => countedOf(rule, COUNTERS_START)), now, COUNTERS_START);

    if (!opts.apply) {
      out(report);
      return;
    }

    await identity.markArchived(report.plan.archive.map((entry) => entry.id), now);
    await identity.clearArchived(report.plan.restore.map((entry) => entry.id));
    out({ ...report, applied: { archived: report.plan.archive.length, restored: report.plan.restore.length } });
  });

program
  .command("near")
  .description("Print the pairs of live rules whose if is closer than --min, closest first, with both texts")
  .requiredOption("--min <cosine>", "Lowest cosine kept, between -1 and 1")
  .option("--limit <n>", "Maximum number of pairs", "100")
  .action(async (opts) => {
    await requireServices({ needsEmbedding: false });
    const min = parseFloat(opts.min);
    const limit = parseInt(opts.limit, 10);
    if (!(Number.isFinite(min) && min >= -1 && min <= 1)) die("--min must be a number between -1 and 1.");
    if (!Number.isInteger(limit) || limit < 1) die("--limit must be a positive integer.");
    out(await identity.nearRules(min, limit));
  });

program
  .command("reach")
  .description("Read the output of tl prompts on stdin, search each prompt like the hook does, and print how often each live rule comes up. Counts no hit.")
  .option("--limit <n>", "Results per search", HOOK_LIMIT)
  .option("--min-score <n>", "Minimum score per result", HOOK_MIN_SCORE)
  .action(async (opts) => {
    const limit = parseInt(opts.limit, 10);
    const minScore = parseFloat(opts.minScore);
    if (!Number.isInteger(limit) || limit < 1) die("--limit must be a positive integer.");
    if (!Number.isFinite(minScore)) die("--min-score must be a number.");

    let input: unknown;
    try {
      input = JSON.parse(await Bun.stdin.text());
    } catch {
      die("stdin is not JSON. Pipe tl prompts into ti reach.");
    }
    const parsed = promptTextsOf(input);
    if (!parsed.ok) die(parsed.error);

    await requireServices({ needsEmbedding: true });
    const rules = (await identity.listEntries()).filter((rule) => rule.archived_at === undefined);
    const found: string[][] = [];
    for (let i = 0; i < parsed.texts.length; i += SEARCHES_IN_FLIGHT) {
      const batch = parsed.texts.slice(i, i + SEARCHES_IN_FLIGHT);
      const results = await Promise.all(batch.map((text) =>
        identity.searchEntries(text, { limit, min_score: minScore, record_hits: false, exclude_archived: true })));
      found.push(...results.map((list) => list.map((entry) => entry.id)));
    }
    out(reachOf(rules.map((rule) => ({ id: rule.id, if: rule.if })), found));
  });

program
  .command("guide")
  .description("Print the quality rules of a rule")
  .action(() => {
    outText(readGuide(new URL("../guide.md", import.meta.url)));
  });

program
  .command("serve")
  .description("Start the HTTP API (OpenAPI-compatible, for tool integrations)")
  .action(async () => {
    await requireServices({ needsEmbedding: false });
    serveApi();
    process.stdout.write(`API: http://localhost:${API_PORT} (spec: /openapi.json)\n`);
    await new Promise(() => {}); // keep process alive
  });

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof ContractError) die(`ti bug, please report: ${err.message}\n${err.stack ?? ""}`);
  die(errorMessage(err));
});
