---
tags: [memory, tl, sqlite, schema]
sources: [conversation, tools/tl/README.md, ~/.claude/projects]
replaces: [memory_tl_unified_event_log]
---

## Decision

`tl` is an archive of work done, not a log of events. A row is one thing that was asked and everything that came of it.

There are two ways something gets asked, so `kind` has two values: `chat` (Filippo asks) and `subtask` (an agent delegates). Nothing else. A scheduled job is a `subtask` with a different trigger, which is a field in `meta`. Note and rule writes get no row: they happen inside an exchange, so they are already in its output, and a note carries its own `source_event` field instead.

Three tables.

```sql
CREATE TABLE sessions (
  id        TEXT PRIMARY KEY,
  started   TEXT NOT NULL,
  host      TEXT,              -- desktop | laptop | rasp
  path      TEXT               -- the working directory
);

CREATE TABLE exchanges (
  id        TEXT PRIMARY KEY,
  session   TEXT REFERENCES sessions(id),
  parent    TEXT REFERENCES exchanges(id),
  timestamp TEXT NOT NULL,
  kind      TEXT NOT NULL,     -- chat | subtask
  actor     TEXT NOT NULL,     -- alfredo | <hat>
  model     TEXT,
  tokens_in          INTEGER,
  tokens_out         INTEGER,
  tokens_cache_read  INTEGER,
  tokens_cache_write INTEGER,
  distilled TEXT,              -- when it was distilled, NULL if never
  meta      TEXT               -- json: trigger, subtask outcome, the rest
);

CREATE TABLE contents (
  exchange_id TEXT PRIMARY KEY REFERENCES exchanges(id),
  input       TEXT NOT NULL,   -- the prompt, or the subtask's task
  output      TEXT NOT NULL    -- the full answer, tool calls included
);
```

`sessions` holds what stays constant for a whole session. `model` does not: it changes mid-session, and a subtask runs on its own.

One row per **exchange**, not per model call. Measured: 4.5 assistant messages per exchange, because each tool round is its own message. The exchange is the unit with a start, an end and a cost.

The four token counters are columns because their shape is fixed and always present. `meta` is JSON because its contents vary. `contents` is a table of its own because `SELECT *` on the main table has to stay usable. Nothing is compressed: reading `output` straight out of `sqlite3` is worth more than the disk it would save.

Timestamps are TEXT holding ISO-8601 in UTC. SQLite has no datetime type — it has five storage classes, and a column declared `DATETIME` gets NUMERIC affinity, which stores an ISO string as TEXT anyway plus a lie in the schema. ISO-8601 at fixed width sorts lexicographically the way it sorts in time, every SQLite date function reads it directly, and it is already the format the transcripts and `tb`'s own `when` field use. SQLite enforces none of this, and nothing else does either: the format is a rule the writer holds. Always UTC, always the `Z`, always fixed width. A row written any other way sorts in the wrong place and breaks every query without ever raising an error.

No indexes to start. 6,000 rows a month means SQLite scans the whole table faster than anyone notices. Indexes get added when a query is slow.

`tl` is a self-sufficient copy and never an authority. Git stays authoritative for the wiki, Qdrant for the notes. Nothing rewrites history; `distilled` is the one mutable field, and it is bookkeeping about our own pipeline, not a record of what happened.

`tl` enters the Clio backups. It holds the only copy of transcripts that would otherwise be deleted.

## Why

The July envelope — `source`, `actor`, `context`, `outcome`, `tags`, `metadata` — was built for `th` runs and fits them. It does not fit a chat exchange, because it describes an action and an exchange is a question with its answer. Carrying those fields onto exchanges is what pushed an earlier draft of this schema to nineteen columns: an old label on a new thing.

Bodies go in whole because transcripts rotate after 30 days (measured: 95 MB, 76 sessions, the oldest exactly one month back). A periodic distiller runs once the session is gone, so a pointer to it is a dangling reference. The price of not keeping them is already known: 369 of 737 notes have no recoverable source, which is that rotation and not a schema problem. The body travels with the sibling `tool-results/` directory, where 5-7% of output — always the largest — is externalised.

This reverses a founding decision, "storing raw dialogues: out of scope". The reversal follows from another decision taken since: distillation moved from a human at the end of a session to an automatic periodic job. A human has the session in front of them and needs no archive; a periodic job does not.

`distilled` as a timestamp, not a flag, gives two things a time watermark cannot: retry for the one row that failed, and selective re-distillation when the distiller improves. A watermark forces redoing everything after a date.

`input` is split from `output` because the set of prompts is a corpus in itself — it is where `ti` rules and `about: filippo` notes come from — and reading 6,000 prompts should not drag 95 MB of tool output along.

Rejected: a fourth table for token costs (a 1:1 join on four always-present integers buys nothing), embeddings in `tl` (semantic search is `tb`'s job), and any judgement field (`tl` does not judge).

## Cross-references

- [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi) — why this is the episodic layer
- [memory_wiki_is_the_project_notebook](memory_wiki_is_the_project_notebook) — why the wiki needs no producer of its own
- [memory_keep_raw_source_for_reingest](memory_keep_raw_source_for_reingest) — the same lesson at the note level
- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — the links `parent` would generate for free
- [th_http_api_scoped_no_db](th_http_api_scoped_no_db) — the durable history `th` does not serve
