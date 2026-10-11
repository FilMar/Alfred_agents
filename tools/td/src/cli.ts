#!/usr/bin/env bun

import { Command } from "commander";

import { ContractError } from "../../contract/contract.js";
import { errorMessage } from "../../tb/src/types.js";
import { distillAll, distillerOf } from "./distiller.js";
import type { ExchangeReport, SessionReport } from "./distiller.js";
import { Version } from "./registry.js";
import { pendingSessions } from "./session.js";

function out(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function die(message: string): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function exchangeSummary(report: ExchangeReport) {
  return {
    exchange: report.turn.id(),
    extraction: report.extraction.answer.isOk() ? "ok" : "failed",
    notes: report.extraction.notes.length,
    rules: report.extraction.rules.length,
    kept: report.judgements.length,
    criticFailed: report.judgements.filter((j) => j.probabilities === null).length,
    passed: report.outcomes.filter((o) => o.isOpen()).length,
    verdicts: report.decision.verdicts.map((v) => v.verdict),
    saved: report.outcomes.filter((o) => o.savedId() !== null).map((o) => o.savedId()),
    failures: report.decision.failures,
  };
}

function summary(report: SessionReport, version: Version, run: string) {
  return {
    session: report.read.session(),
    extractor: version.id(),
    run,
    turns: report.read.turns().length,
    split: report.split.map === null ? "failed" : "ok",
    closed: report.closed.length,
    failures: report.failures,
    exchanges: report.exchanges.map(exchangeSummary),
  };
}

const program = new Command();

program.name("td").description("Third Distiller — turns the pending exchanges into candidates").version("1.0.0");

program
  .command("distill [session]")
  .description("Run one session, or every session with pending exchanges, through the extractor. Shadow unless --active")
  .option("--extractor <id>", "Extractor row id, or active", "active")
  .option("--active", "Save to tb and ti, and set distilled in tl")
  .option("--max-saved <n>", "Stop writing after n items in this run")
  .action(async (session: string | undefined, opts) => {
    try {
      const id = opts.extractor === "active" ? "active" : parseInt(opts.extractor, 10);
      if (id !== "active" && !Number.isInteger(id)) die("--extractor must be a row id or active.");
      const maxSaved = opts.maxSaved === undefined ? null : parseInt(opts.maxSaved, 10);
      if (maxSaved !== null && !(Number.isInteger(maxSaved) && maxSaved > 0)) die("--max-saved must be a positive integer.");
      const version = await Version.read(id);
      if (version === null) die(`No extractor ${opts.extractor}.`);
      const sessions = session === undefined ? await pendingSessions() : [session];
      const distiller = await distillerOf(version, new Date(), opts.active ? "active" : "shadow", maxSaved);
      const reports = await distillAll(distiller, sessions);
      if (session !== undefined && reports.length === 0) die(`Session ${session} has no pending exchange.`);
      out({
        extractor: version.id(),
        run: distiller.recorder.run(),
        mode: distiller.mode,
        saved: distiller.budget.spent(),
        sessions: reports.map((r) => summary(r, version, distiller.recorder.run())),
      });
    } catch (err) {
      die(errorMessage(err));
    }
  });

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof ContractError) die(`td bug, please report: ${err.message}\n${err.stack ?? ""}`);
  die(errorMessage(err));
});
