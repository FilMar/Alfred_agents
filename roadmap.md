# Roadmap

---

## Phase 1: Third Brain ✅
**Status:** Done

CLI `tb` with save, search, update, browse, random, tags, graph. Immutable associative graph with backrefs, hybrid search, Hub. Complete cognitive agents: Platone, Debate, Oracolo, Socrate, Aristotele.

---

## Phase 2: Third Hand (`th`) — Flow Engine
**Status:** 🚧 In Progress

### Objective
Build an agent orchestration system with divergent cognitive identities (de Bono hats), configurable execution flows, performance evaluation and a suggested evolutionary cycle.

The CLI is called `th` (Third Hand), symmetric to `tb`. De Bono hats live in `tools/th/hats/`. Project members in `.th/members/`, temporary members in `/tmp/.th/members/`.

### 2A — Member ✅

- [x] **`th member create <name>`**: Creates a member with `--hat`, `--role`, `--tools`. Persists in `.th/members/<name>.md` as frontmatter + role; the hat is stored by reference and resolved at load time (fixing a hat updates every member).
- [x] **`--tmp`**: Optional flag — saves the member in `/tmp/.th/members/` instead of the project. Useful for throwaway members.
- [x] **`th member list [--all]`**: Lists members of the current project; `--all` includes temporary ones too.
- [x] **`th member get <name>`**: JSON detail of a member.
- [x] **`th member delete <name>`**: Deletes a member.
- [x] **Member resolution**: `loadMember()` searches first in `.th/members/`, then in `/tmp/.th/members/`. Single read — returns member + system prompt together.
- [x] **`th hats list`**: Lists the available hats.
- [x] **`th hats get <name>`**: Shows the content of a hat.
- [x] **Input validation**: Member name limited to `[a-zA-Z0-9_-]` — blocks path traversal. Role cannot contain newlines.
- [x] **YAML list format**: `parseList()` handles both `[a, b]` inline and `- item` multi-line.
- [x] **`TH_HATS_DIR`**: Optional env var to override the hats directory (useful for compiled binaries).

### 2B — Single execution ✅

- [x] **`th run --member <name> --task "..."`**: Loads the member, calls `createAgentSession()` with system prompt override (role + hat resolved by reference) and member tools. Streaming to stdout. `SessionManager.inMemory()`.
- [x] **`--thinking <level>`**: Enables extended thinking (off, minimal, low, medium, high, xhigh). Internal reasoning is redirected to `/tmp/th-<member>-<timestamp>.log`; stdout receives only the final result.
- [x] **`--model <provider/id>`**: Chooses the model to use (e.g. `anthropic/claude-opus-4-7`). Optional — default from pi settings.
- [x] **`--output <file>`**: Saves the result to a file in addition to stdout. Useful for passing output between members in sequential execution.
- [x] **`--timeout <seconds>`**: Aborts the session with `session.abort()` if the run exceeds the limit. Validation: positive integer — explicit error on invalid input.
- [x] **`--detach`**: Runs in background; returns immediately `{ pid, out, log, status }`. The child process writes the status (`running` → `done` / `error: ...`) and output to files in `/tmp`.
- [x] **`th models`**: Lists available models with the configured API key.
- [x] **File descriptor safety**: `try/finally` ensures fd closure for log and output even on error or abort.
- [x] **bwrap sandbox**: Every `th run` is automatically executed inside a bwrap container if available. Read-only filesystem except `cwd`, `~/.pi` and `/tmp`. The agent cannot write outside the project.

### 2C — SQLite tracking ✅

- [x] **Data layer**: SQLite via Bun (`~/.pi/th.db`). Schema: `runs` (id, member, task, started_at, finished_at, status, out_path, log_path).
- [x] **`th history [--member <name>] [--limit <n>]`**: Lists recent runs in descending order.
- [x] **`th get <runId>`**: Run metadata + output if still available on disk.
- [ ] **Per-member performance**: aggregate metrics per hat over time (output quality, tokens, duration).

---

## Phase 3: Third Brain Integration ✅
**Status:** Done

Alfred queries `tb search` before every flow. Platone is interactive: proposes note + connections, user confirms/modifies/adds refs, then saves. Feynman teaches the corpus with the Feynman technique.

- [x] **Interactive Platone**: proposes note + connections, waits for confirmation, applies changes, saves.
- [x] **Feynman**: retrieves TB material on a topic and teaches it at three levels (core / mechanisms / tensions), declares gaps.

---

## Phase 4: GTD Task Manager (`td`) ✅
**Status:** Done

CLI `td` (Third Done) with SQLite + JSON column for flexibility without migrations. Global DB in `~/.pi/td.db`. Two tables: `projects` (id, name, start, goal_end, real_end, data) and `tasks` (id, list, project_id, done_at, created_at, data). Task links via array in `data.links`.

> **Note:** `tools/td/` not present in this repo — the symlink `~/.local/bin/td` points to a non-existent path. The DB exists (`~/.pi/td.db`), the source code does not.

- [x] CLI `td` with `add`, `inbox`, `next`, `waiting`, `someday`, `list`, `move`, `done`, `get`
- [x] **`td edit <id>`**: Post-creation patch of `what`, `context`, `due`, `notes`, `waiting-for`. Empty string deletes the field.
- [x] **`td search <query>`**: Keyword search on task JSON. `--all` includes completed ones.
- [x] Project management: `td project add/list/done`
- [x] Symlink in `~/.local/bin/td` — setup.sh updated (but source missing)
- [x] Skill `taiichi` — capture, inbox processing, work sessions, weekly review

---

## Phase 5: Third Wiki (`.wiki/`) ✅
**Status:** Done

Local wiki per project in `.wiki/` — plain markdown pages, style guides and code conventions. Maintained entirely by the `omero` skill (Read/Write/Edit/Glob/Grep), with page/style templates.

- [x] Skill `omero` — ingest, query, style guides, health-check; operates directly on `.wiki/`.
- [x] Page/style/index templates in `skills/omero/templates/`.
- [x] Default conventions (page naming, sections, frontmatter, index/log) defined in the skill.

---

## Phase 6: Career Coach ← after TB is populated
**Status:** Planned

Works better when the TB is already rich with history and personal patterns. To be built after real use of the system.

- [ ] Consult the TB before every response (who you are, what you have already tried, patterns)
- [ ] Advice on how to move (pivot, focus, product priorities)
- [ ] Not generic — calibrated on the user's real history and objectives

---

## Phase 7: Per-hat metrics ← when measurement is needed
**Status:** Planned

Data already ready (Phase 2C). Makes sense after using Alfred enough to want to measure per-hat performance.

- [ ] Aggregate metrics per member/hat: average duration, error rate, status distribution.
- [ ] `th stats [--member <name>]`: concise report on stdout.

---

## Phase 8: Personal Server + Remote Agent
**Status:** Planned

Self-hosted personal server with centralised DBs, OpenClaw as remote interface via Telegram, personal file system accessible via agent.

### Architecture

```
Server
├── container: pi-core
│   ├── Qdrant
│   └── SQLite (td, th, tb)
├── container: openclaw
│   ├── tb / td / th → point to pi-core DBs
│   ├── skills/
│   ├── /repos/   (persistent volume — work repo clones)
│   └── /files/   (persistent volume — personal documents and media)
└── exposed: Telegram polling only (zero open ports)
```

### Telegram Interface

Group with separate topics:
- **GTD** — morning recap, `td` commands
- **ThirdBrain** — `tb` searches, Platone sedimentation
- **Dev** — OpenClaw working on repos, `th run` output
- **Recap** — Seneca weekly review (Monday morning)
- **Alfred** — general conversation
- **Files** — request and receive files, upload documents

### Personal File System

`/files/` on the server as single source of truth for documents and media.
Access via Telegram: "send me X" → OpenClaw finds and sends (up to 2GB). Upload: send the file to Telegram, OpenClaw saves to `/files/`.
No sync to manage — everything goes through the agent.

GitHub repos stay on GitHub — nothing else needed.

### Backup (Mega + megacmd)

Nightly cron on everything critical:
- DB: Qdrant snapshot + `td.db` + `th.db`
- Config: skills, pi configuration
- `/files/`: documents and media

Structure on Mega:
```
/pi-backup/
├── db/      (nightly snapshots)
├── config/  (skills, config)
└── files/   (documents and media)
```

Interactive restore via Telegram: "restore yesterday's backup" → OpenClaw downloads and restores.

### Tasks

- [ ] Server setup + pi-core container (Qdrant + SQLite)
- [ ] OpenClaw container with access to tb/td/th/skills
- [ ] Telegram group with topics + configured bot
- [ ] Scheduled notifications: morning recap and weekly review
- [ ] `/repos/` volume: OpenClaw on own branches, explicit trigger
- [ ] `/files/` volume: upload/download via Telegram
- [ ] Backup cron to Mega via megacmd
- [ ] Interactive restore script

---

## Operative Skills

### Annibale (Orchestrator) ✅

Orchestrates agents with de Bono hats via `th run`. Two patterns: sequential (one's output becomes the next's context) and parallel (`--detach` + poll + synthesis). Repeatable flows → sh/ts scripts. Predefined flows in `skills/annibale/flows/`: `debate` (de Bono panel with synthesis), `tdd-coding` (agent-guided TDD), `council` (parallel expert council with adjustable rounds).

### Platone (Memory Cultivator) ✅

Interactive flow: proposes note (what, why, kind, tags) + connections found in TB → user confirms/modifies/adds refs → saves. One note at a time.

### Feynman (Corpus Professor) ✅

Retrieves TB material with multiple queries, explains at three levels (core / mechanisms / tensions), declares gaps explicitly. Complementary to Socrate: Feynman builds understanding, Socrate stress-tests it.

### Socrate (Friction Generator) ✅

Does not answer — interrogates. Finds contradictions, gaps and undeclared assumptions. Never closes the reasoning.

### Aristotele (Synthesis Curator) ✅

Analyses the TB graph, finds dense clusters and missing connections, creates Hubs (kind: indice) to compress saturated areas.

### Oracolo (Memory) ✅

Retrieves knowledge from the TB on a topic. Does not interpret, does not advise — returns what has been sedimented.

### Ermes (Extractor) ✅

Extracts text from any external source: web articles and YouTube transcripts. A single entry point for all sources.

### Indiana (Code Archaeology) ✅

Digs into software projects to extract hidden structural patterns, technical debt, buried architectural decisions. Does not fix — diagnoses.

### Archimede (Project Founder) ✅

Starts new projects via structured dialogue. Extracts purpose, constraints, users and AI work rules before touching code. Produces README.md, ROADMAP.md and CLAUDE.md calibrated to the specific project.

### Giano (Team Designer) ✅

Designs and builds the `th` member team for a project. Reads context (README, roadmap, CLAUDE.md), proposes a roster with hats and specific roles, generates all members. Use it at the start of a project or when the team needs revision.

### Prometeo (Skill Creator) ✅

Creates new skills, modifies and improves existing ones, measures performance via evals and benchmarks.

### Omero (Local Wiki) ✅

Maintains the local wiki of any project in `.wiki/`. Synthesises project files, answers index queries, runs health-checks (contradictions, orphan pages, gaps). Works for technical projects and worldbuilding.

---
