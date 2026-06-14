#!/usr/bin/env bun
import { Command } from "commander";
import { createMember, createMemberFrom, deleteMember, getHat, getMember, listHats, listMembers, promoteMember } from "./members.js";
import { ensureSandboxed, listAvailableModels, makeJobPaths, runMember, spawnDetached, waitForJobs, type RunMemberOpts } from "./runner.js";
import { getRun, listRuns } from "./db.js";
import { existsSync, readFileSync } from "node:fs";
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
    .version("0.1.0");

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
    .action((opts) => {
        const runs = listRuns({ member: opts.member, limit: opts.limit });
        if (!runs.length) die("No runs recorded.");
        out(runs);
    });

program
    .command("get <id>")
    .description("Run details (output included if available)")
    .action((id: string) => {
        const run = getRun(id);
        if (!run) die(`Run not found: "${id}"`);
        let output: string | null = null;
        if (run.out_path && existsSync(run.out_path)) {
            output = readFileSync(run.out_path, "utf8");
        }
        out({ ...run, output });
    });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
    die(errorMessage(err));
});
