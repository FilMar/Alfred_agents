# th CLI

## Frontmatter

tags: [th, cli, riferimento, agenti, orchestrazione]
sources: [tools/th/src/cli.ts, tools/th/src/runner.ts, tools/th/src/members.ts, tools/th/src/db.ts]
updated: 2026-06-06

## Panoramica

`th` (Third Hand) — orchestratore di agenti. Ogni `th run` esegue un agente Claude Code in sandbox bwrap con system prompt specializzato (ruolo + cappello de Bono) e traccia il run in SQLite (`~/.pi/th.db`).

## member

```bash
th member create <name> --hat <hat> --role "<ruolo>" [--tools <csv>] [--tmp]
th member create <name> --from <globale>   # clona da membro globale
th member list [--local | --global | --tmp]
th member get <name>
th member delete <name>
th member promote <name> [--force]         # da locale/tmp → ~/.th/members/
```

- Nome limitato a `[a-zA-Z0-9_-]` (path traversal protection)
- Default tools: `read,bash`
- `--tmp`: salva in `/tmp/.th/members/` invece di `.th/members/`
- Risoluzione: cerca prima `.th/members/`, poi `~/.th/members/`, poi `/tmp/.th/members/`
- Se il membro globale esiste ma non quello locale, `th run` lo istanzia automaticamente in `.th/members/`

## hats

```bash
th hats list
th hats get <name>
```

I cappelli de Bono definiscono il frame cognitivo. Directory: configurata via `TH_HATS_DIR` env var (default: embedded nella distribuzione).

## run

```bash
th run --member <name> --task "<task>" [opzioni]
```

**Opzioni:**

| Flag | Descrizione |
|------|-------------|
| `--thinking <level>` | Thinking esteso: off, minimal, low, medium, high, xhigh. Il reasoning va in `/tmp/th-<member>-<ts>.log` |
| `--model <provider/id>` | Es. `anthropic/claude-opus-4-7`. Default: impostazione globale pi. |
| `--detach` | Background: ritorna subito `{pid, out, log, status}`. Status in `/tmp/th-*.status` |
| `--timeout <sec>` | Aborta la sessione dopo N secondi |

**Sandbox bwrap**: automatica se `bwrap` è nel PATH. Read-only su tutto tranne `cwd`, `~/.pi`, `~/.bun`, `/tmp`.

**Output files** (in `/tmp`):
- `.out` — output dell'agente
- `.log` — thinking + tool calls
- `.status` — `running` → `done` / `error: ...` / `timeout`

## models

```bash
th models   # lista modelli disponibili per le API key configurate
```

## history / get

```bash
th history [--member <name>] [--limit <n>]   # default limit: 20, ordine decrescente
th get <runId>                                 # metadati + output se ancora su disco
```

Run tracciati in `~/.pi/th.db` (tabella `runs`): id, member, task (troncata a 300 char), started_at, finished_at, status, out_path, log_path.

## Esempi tipici

```bash
# Esecuzione semplice
th run --member oracolo --task "cosa so su Zettelkasten?"

# Con output salvato per pipeline
th run --member oracolo --task "recupera su X" > /tmp/out.txt
th run --member feynman --task "$(cat /tmp/out.txt)"

# Background parallelo
th run --member socrate --task "trova lacune in questa idea: ..." --detach
th run --member aristotele --task "suggerisci hub per cluster TB" --detach

# Con thinking alto e timeout
th run --member indiana --task "analizza questo codebase" --thinking high --timeout 300
```

## Riferimenti incrociati

- [agenti](agenti) — lista agenti e cappelli
- [architettura](architettura) — sandbox e struttura file system
