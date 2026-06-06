#!/usr/bin/env bun
import { Command } from "commander";
import { createMember, createMemberFrom, deleteMember, getHat, getMember, listHats, listMembers, promoteMember } from "./members.js";
import { ensureSandboxed, listAvailableModels, makeJobPaths, runMember, spawnDetached, type RunMemberOpts } from "./runner.js";
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

// ─── Programma ────────────────────────────────────────────────────────────────

const program = new Command();

program
    .name("th")
    .description("CLI per l'orchestrazione di agenti — Third Hand")
    .version("0.1.0");

// ─── member ───────────────────────────────────────────────────────────────────

const member = new Command("member").description("Gestione membri");

member
    .command("create <name>")
    .description("Crea un nuovo membro")
    .option("--hat <hat>", "Cappello de Bono (es. blue-core, black-core)")
    .option("--role <role>", "Descrizione del ruolo del membro")
    .option("--tools <tools>", "Tool disponibili separati da virgola", "read,bash")
    .option("--tmp", "Crea il membro in /tmp invece che nel progetto corrente")
    .option("--from <global>", "Crea da un membro globale come base (ignora --hat, --role, --tools)")
    .action((name: string, opts) => {
        try {
            if (opts.from) {
                out(createMemberFrom(name, opts.from));
            } else {
                if (!opts.hat) die("--hat è richiesto (o usa --from <global>)");
                if (!opts.role) die("--role è richiesto (o usa --from <global>)");
                out(createMember(name, opts.hat, opts.role, splitCSV(opts.tools), [], opts.tmp));
            }
        } catch (err) {
            die(errorMessage(err));
        }
    });

member
    .command("list")
    .description("Lista membri (locale + globale + tmp per default)")
    .option("--local", "Solo membri locali (.th/members/)")
    .option("--global", "Solo membri globali (~/.th/members/)")
    .option("--tmp", "Solo membri temporanei (/tmp/.th/members/)")
    .action((opts) => {
        const groups = listMembers({ local: opts.local, global: opts.global, tmp: opts.tmp });
        const filtered = opts.local || opts.global || opts.tmp;
        if (filtered) {
            const key = opts.local ? "local" : opts.global ? "global" : "tmp";
            const list = groups[key];
            if (list.length === 0) die(`Nessun membro ${key}.`);
            out(list);
        } else {
            if (!groups.local.length && !groups.global.length && !groups.tmp.length) {
                die("Nessun membro. Usa: th member create <name>");
            }
            out(groups);
        }
    });

member
    .command("get <name>")
    .description("Mostra il dettaglio di un membro")
    .action((name: string) => {
        try {
            out(getMember(name));
        } catch (err) {
            die(errorMessage(err));
        }
    });

member
    .command("delete <name>")
    .description("Elimina un membro")
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
    .description("Promuove un membro locale o tmp a globale (~/.th/members/)")
    .option("--force", "Sovrascrive il membro globale se esiste già")
    .action((name: string, opts) => {
        try {
            out(promoteMember(name, opts.force));
        } catch (err) {
            die(errorMessage(err));
        }
    });

program.addCommand(member);

// ─── hats ─────────────────────────────────────────────────────────────────────

const hats = new Command("hats").description("Gestione cappelli de Bono");

hats
    .command("list")
    .description("Lista i cappelli disponibili")
    .action(() => out(listHats()));

hats
    .command("get <name>")
    .description("Mostra il contenuto di un cappello")
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
    .description("Esegue un task con un singolo membro")
    .requiredOption("--member <name>", "Nome del membro")
    .requiredOption("--task <task>", "Task da eseguire")
    .option("--thinking <level>", "Livello di thinking esteso (off, minimal, low, medium, high, xhigh)")
    .option("--model <provider/id>", "Modello da usare (es. anthropic/claude-opus-4-7)")
    .option("--detach", "Esegui in background; ritorna subito i path di out/log/status")
    .option("--timeout <secondi>", "Timeout in secondi — aborta la sessione se superato", (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n <= 0) throw new Error(`--timeout deve essere un intero positivo (ricevuto: "${v}")`);
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

// ─── models ───────────────────────────────────────────────────────────────────

program
    .command("models")
    .description("Lista i modelli disponibili (con API key configurata)")
    .action(async () => {
        try {
            const models = await listAvailableModels();
            if (models.length === 0) die("Nessun modello disponibile. Configura una API key.");
            out(models);
        } catch (err) {
            die(errorMessage(err));
        }
    });

// ─── history ──────────────────────────────────────────────────────────────────

program
    .command("history")
    .description("Lista run recenti")
    .option("--member <name>", "Filtra per membro")
    .option("--limit <n>", "Numero massimo di risultati (default: 20)", (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n <= 0) throw new Error(`--limit deve essere un intero positivo`);
        return n;
    })
    .action((opts) => {
        const runs = listRuns({ member: opts.member, limit: opts.limit });
        if (!runs.length) die("Nessun run registrato.");
        out(runs);
    });

program
    .command("get <id>")
    .description("Dettaglio di un run (output incluso se disponibile)")
    .action((id: string) => {
        const run = getRun(id);
        if (!run) die(`Run non trovato: "${id}"`);
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
