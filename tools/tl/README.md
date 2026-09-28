# Third Log (tl)

The archive of work done. A row is one thing that was asked and everything that came of it.

`tl` is the episodic layer: what happened. It never judges, never merges, never distills. `tb` holds what you know, `ti` what you do in a context, `.wiki/` the state of a project. Distillation into notes and rules is the distiller's job, downstream.

Design decision: [`memory_tl_work_archive_not_event_log`](../../.wiki/memory_tl_work_archive_not_event_log.md).

## Why it exists

Transcripts rotate. Measured: 95 MB, 76 sessions, the oldest exactly one month back. A distiller that runs later than that has nothing to read, and 369 of 737 notes already have no recoverable source for exactly this reason. `tl` keeps the body, so a note can be re-extracted when the distiller improves.

## Shape

The store is SQLite on the Rasp, next to Qdrant, inside the Tailscale perimeter. SQLite is a file and not a server, so a small HTTP service sits in front of it and the file never leaves the node.

```
your machine:   cli.ts → ingest.ts → claude.ts | pi.ts   (one reader per harness)
                              ↘ transcript.ts (what the two have in common)
                              ↘ client.ts (HTTP)
                                   ↘ types.ts (schema + validation) ↙
the Rasp:       api.ts (CRUD per table, validates) → db.ts (bun:sqlite)
```

The API is CRUD over the three tables plus filters. Every rule that is not a shape lives in the CLI: parsing transcripts, grouping messages into exchanges, sums by session, day or model. Two reasons. Transcripts live on the machine you work on, so the parser belongs there. And aggregates over 6,000 rows a month cost less to compute after one download than to add endpoints for — the same reason the schema carries no indexes yet.

The API still validates what it writes, because a store is a boundary and `tl` holds the only copy: `kind` is `chat` or `subtask`, timestamps are ISO-8601 UTC at fixed width with the `Z`, required fields are present, foreign keys resolve. The validator is one function in `types.ts`, shared by both sides — the CLI checks before it sends, the API checks before it writes.

## Schema

Three tables: `sessions`, `exchanges`, `contents`. Bodies live in `contents` so that `SELECT *` on `exchanges` stays readable. Nothing is compressed. `distilled` is a timestamp, `NULL` until the row is distilled, and it is the only mutable field.

The full schema and the reasoning behind every column are in the decision page.

## Ingestion

One exchange is written as it happens, by an end-of-turn hook. The hook does no parsing: it hands the ingester a transcript and says "up to here".

```sh
tl ingest --transcript <path>     # the hook, one exchange
tl ingest --session <id>          # same, when only the id is known
tl ingest --all                   # fills the gaps, and backfills what is on disk
tl ingest --all --refresh         # sends every row again, when the parser improves
```

Both roots are walked one directory deep, which is what excludes delegated runs by construction: a Claude subagent writes under `<session>/subagents/`, `pi` writes a sub-run under `<session>/<id>/run-N/`. Neither is a row, for the reason given below.

An exchange id is derived from the transcript, not generated, so writing is idempotent: running the same ingest twice changes nothing. That makes a missed exchange late rather than lost — the hook can fail, the Rasp can be unreachable, and the next `--all` picks it up, because the transcript survives for 30 days.

**Two harnesses, one schema.** Claude Code and `pi` both write JSONL and agree on nothing else, so there is a reader each and a shared span splitter. A file says which reader it needs: `pi` opens with a `session` record.

| | Claude Code | pi |
|---|---|---|
| a question is | a `user` line carrying `origin` | a message with `role: "user"` |
| a tool answer is | a `user` line holding `tool_result` | a message with `role: "toolResult"` |
| tokens | `input_tokens`, `cache_read_input_tokens`, … | `input`, `cacheRead`, … plus a **cost in money** |
| message ids | UUIDs, used as they are | eight hex characters, so the id is derived |
| a compaction | assistant lines, counted like any answer | a record of its own, counted too |

`pi`'s ids are derived with `exchangeId(session, id)` — SHA256 shaped as a UUID, the same trick as a note id in `tb`. One shape in the archive, still deterministic, so a second write is still a no-op. The original is kept in `meta.source_id`, and every row names its `meta.harness`.

Every row a transcript yields is `kind: chat`, written by `alfredo`.

`subtask` is reserved for a `th` run. A hat makes its own model calls in its own process, so it never appears in a transcript at all: `th` has to write that row itself, which is why it arrives with Fase 6. A native subagent is not a `subtask` either — its task call and its report are already inside the output of the exchange that asked for it. What is not counted is the tokens it spent internally: measured, 2.4% of all output tokens, across 8 sessions out of 43.

## Commands

| command | what it does |
|---|---|
| `tl ingest` | reads transcripts, writes sessions, exchanges and contents |
| `tl sessions` | lists sessions, newest first |
| `tl show <exchange>` | one exchange with its full input and output |
| `tl cost` | sums tokens by session, day or model |
| `tl pending` | exchanges with `distilled IS NULL`, the distiller's queue |
| `tl serve` | runs the HTTP service (on the Rasp) |

`TL_API_PORT` defaults to 8790 (`tb` uses 8788, `ti` 8789). `TL_API_URL` tells the CLI where the service is.

## Backups

`tl` is in the Clio backups. It holds the only copy of the transcripts once they rotate.
