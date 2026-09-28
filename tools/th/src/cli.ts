#!/usr/bin/env bun
import { Command } from "commander";
import { createMember, createMemberFrom, deleteMember, getHat, getMember, listHats, listMembers, promoteMember } from "./members.js";
import { ensureSandboxed, listAvailableModels, makeJobPaths, runMember, sandboxExec, spawnDetached, waitForJobs, type RunMemberOpts } from "./runner.js";
import { archivePending, spooledFiles } from "./archive.js";
import * as tl from "../../tl/src/client.js";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// ─── Output helpers ───────────────────────────────────────────────────────────

function out(data: unknown): void {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function die(message: string): never {
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

function splitCSV(val: string): string[] {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
}

// ─── Program ──────────────────────────────────────────────────────────────────

const program = new Command();

program
    .name("th")
    .description("CLI for agent orchestration — Third Hand")
    .version("0.1.0")
    .enablePositionalOptions();

// ─── member ───────────────────────────────────────────────────────────────────

const member = new Command("member").description("Member management");

member
    .command("create <name>")
    .description("Create a new member")
    .option("--hat <hat>", "de Bono hat (e.g. blue-core, black-core)")
    .option("--role <role>", "Member role description")
    .option("--tools <tools>", "Available tools, comma-separated", "read,bash")
    .option("--tmp", "Create member in /tmp instead of the current project")
    .option("--from <global>", "Create from a global member as base (ignores --hat, --role, --tools)")
    .action((name: string, opts) => {
        try {
            if (opts.from) {
                out(createMemberFrom(name, opts.from));
            } else {
                if (!opts.hat) die("--hat is required (or use --from <global>)");
                if (!opts.role) die("--role is required (or use --from <global>)");
                out(createMember(name, opts.hat, opts.role, splitCSV(opts.tools), opts.tmp));
            }
        } catch (err) {
            die(errorMessage(err));
        }
    });

member
    .command("list")
    .description("List members (local + global + tmp by default)")
    .option("--local", "Local members only (.th/members/)")
    .option("--global", "Global members only (~/.th/members/)")
    .option("--tmp", "Temporary members only (/tmp/.th/members/)")
    .action((opts) => {
        const groups = listMembers({ local: opts.local, global: opts.global, tmp: opts.tmp });
        const filtered = opts.local || opts.global || opts.tmp;
        if (filtered) {
            const key = opts.local ? "local" : opts.global ? "global" : "tmp";
            const list = groups[key];
            if (list.length === 0) die(`No ${key} members.`);
            out(list);
        } else {
            if (!groups.local.length && !groups.global.length && !groups.tmp.length) {
                die("No members found. Use: th member create <name>");
            }
            out(groups);
        }
    });

member
    .command("get <name>")
    .description("Show member details")
    .action((name: string) => {
        try {
            out(getMember(name));
        } catch (err) {
            die(errorMessage(err));
        }
    });

member
    .command("delete <name>")
    .description("Delete a member")
    .action((name: string) => {
        try {
            deleteMember(name);
            out({ deleted: true, name });
        } catch (err) {
            die(errorMessage(err));
        }
    });

member
    .command("promote <name>")
    .description("Promote a local or tmp member to global (~/.th/members/)")
    .option("--force", "Overwrite the global member if it already exists")
    .action((name: string, opts) => {
        try {
            out(promoteMember(name, opts.force));
        } catch (err) {
            die(errorMessage(err));
        }
    });

program.addCommand(member);

// ─── hats ─────────────────────────────────────────────────────────────────────

const hats = new Command("hats").description("de Bono hat management");

hats
    .command("list")
    .description("List available hats")
    .action(() => out(listHats()));

hats
    .command("get <name>")
    .description("Show hat content")
    .action((name: string) => {
        try {
            // raw markdown — intentionally not JSON
            process.stdout.write(getHat(name) + "\n");
        } catch (err) {
            die(errorMessage(err));
        }
    });

program.addCommand(hats);

// ─── run ──────────────────────────────────────────────────────────────────────

program
    .command("run")
    .description("Run a task with a single member")
    .requiredOption("--member <name>", "Member name")
    .requiredOption("--task <task>", "Task to execute")
    .option("--thinking <level>", "Extended thinking level (off, minimal, low, medium, high, xhigh)")
    .option("--model <provider/id>", "Model to use (e.g. anthropic/claude-opus-4-7)")
    .option("--detach", "Run in background; returns out/log/status paths immediately")
    .option("--timeout <seconds>", "Timeout in seconds — aborts the session if exceeded", (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n <= 0) throw new Error(`--timeout must be a positive integer (received: "${v}")`);
        return n;
    })
    .action(async (opts) => {
        if (!opts.detach) ensureSandboxed();

        const paths = makeJobPaths(opts.member);
        const runOpts: RunMemberOpts = {
            thinkingLevel: opts.thinking,
            modelStr: opts.model,
            timeoutSec: opts.timeout,
        };
        try {
            if (opts.detach) {
                const runnerPath = join(dirname(process.argv[1]), "detached-runner.ts");
                const pid = spawnDetached(opts.member, opts.task, paths, runOpts, process.argv[0], runnerPath);
                out({ pid, out: paths.out, log: paths.log, status: paths.status });
            } else {
                await runMember(opts.member, opts.task, paths, runOpts);
            }
        } catch (err) {
            die(errorMessage(err));
        }
    });

// ─── wait ─────────────────────────────────────────────────────────────────────

program
    .command("wait <status...>")
    .description("Wait for detached jobs to finish, by their status-file path")
    .option("--timeout <seconds>", "Global timeout in seconds (default: 600)", (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n <= 0) throw new Error(`--timeout must be a positive integer (received: "${v}")`);
        return n;
    })
    .action(async (statusPaths: string[], opts) => {
        const outcomes = await waitForJobs(statusPaths, opts.timeout ?? 600);
        out(outcomes);
        if (outcomes.some((o) => !o.ok)) process.exit(1);
    });

// ─── sandbox-exec ─────────────────────────────────────────────────────────────

program
    .command("sandbox-exec <bin> [args...]")
    .passThroughOptions()
    .description("Run an arbitrary command inside the bwrap sandbox — fails if bwrap is missing (usage: th sandbox-exec -- <bin> <args...>)")
    .action(async (bin: string, args: string[]) => {
        try {
            process.exit(await sandboxExec(bin, args));
        } catch (err) {
            die(errorMessage(err));
        }
    });

// ─── models ───────────────────────────────────────────────────────────────────

program
    .command("models")
    .description("List available models (with configured API key)")
    .action(async () => {
        try {
            const models = await listAvailableModels();
            if (models.length === 0) die("No models available. Configure an API key.");
            out(models);
        } catch (err) {
            die(errorMessage(err));
        }
    });

// ─── history ──────────────────────────────────────────────────────────────────

program
    .command("history")
    .description("List recent runs")
    .option("--member <name>", "Filter by member")
    .option("--limit <n>", "Maximum number of results (default: 20)", (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n <= 0) throw new Error(`--limit must be a positive integer`);
        return n;
    })
    .action(async (opts) => {
        const running = inflightRuns().filter((r) => !opts.member || r.member === opts.member);
        let finished: unknown[] = [];
        try {
            const rows = await tl.fetchExchanges({ kind: "subtask", limit: opts.limit ?? 20 });
            finished = rows
                .filter((r) => !opts.member || r.actor === opts.member)
                .map((r) => ({
                    run: r.session,
                    member: r.actor,
                    started_at: r.timestamp,
                    model: r.model,
                    tokens_out: r.tokens_out,
                    ...(r.meta as Record<string, unknown>),
                }));
        } catch (err) {
            process.stderr.write(`warn: archive unreachable, only running jobs shown: ${errorMessage(err)}\n`);
        }
        const pending = spooledFiles(tmpdir()).length;
        if (!running.length && !finished.length) die("No runs found.");
        out({ running, finished, ...(pending > 0 && { spooled_not_archived: pending }) });
    });

/** A run in flight is its file set in /tmp — the archive only hears from it at the end. */
function inflightRuns(): Array<{ member: string; started_at: string; status: string; out: string }> {
    const dir = tmpdir();
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
        .filter((n) => n.startsWith("th-") && n.endsWith(".status"))
        .map((n) => ({ name: n, path: join(dir, n) }))
        .filter((f) => readStatus(f.path) === "running")
        .map((f) => ({
            member: f.name.replace(/^th-/, "").replace(/-\d+\.status$/, ""),
            started_at: statSync(f.path).mtime.toISOString(),
            status: "running",
            out: f.path.replace(/\.status$/, ".out"),
        }));
}

function readStatus(path: string): string {
    try {
        return readFileSync(path, "utf8").trim();
    } catch {
        return "";
    }
}

program
    .command("get <id>")
    .description("Run details (output included if available)")
    .action(async (id: string) => {
        try {
            const rows = await tl.fetchExchanges({ session: id, limit: 1 });
            if (!rows.length) die(`Run not found in the archive: "${id}". A run still going lives in its files: th history`);
            const body = await tl.fetchContents(rows[0].id);
            out({ ...rows[0], input: body.input, output: body.output });
        } catch (err) {
            die(errorMessage(err));
        }
    });

program
    .command("archive-pending")
    .description("Send the runs the archive never got, spooled next to their files in /tmp")
    .action(async () => {
        out(await archivePending(tmpdir()));
    });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
    die(errorMessage(err));
});
