---
tags: [memory, tl, hist, alfred, ingest, transcripts]
sources: [conversation, spec.json@7fc206d, review.json@7fc206d, tools/alfred/src/hist/ingest]
---

## Decision

`alfred hist ingest` runs on the laptop, where the transcripts are. It reads each harness through one `Format` table: `CLAUDE` and `PI` in `ingest/formats.rs`. A single `parse(format, lines, host)` in `ingest/transcript.rs` builds the session, the exchanges and their contents.

A `Format` holds what differs between harnesses. That is the line that opens an exchange, the token fields, how a text or tool part reads, how the id is made and what goes in `meta`. It is a struct of functions, not a trait. A new harness is one more table.

The rows must be the ones `tl` writes, byte for byte. A different id or text would put duplicates in the archive. `serde_json` keeps the key order (`preserve_order`), so tool arguments print as `JSON.stringify` prints them.

`prompts` and `cost` are computed by the server (`GET /hist/prompts`, `GET /hist/cost`). `tl prompts` made one HTTP call per exchange to read each prompt.

## Why

The two harnesses differ only in details, while the flow is the same. Two readers would repeat the same skeleton twice.

The proof: `tl ingest --all` and `alfred hist ingest --all` read the 266 transcripts of the laptop into two empty archives. They gave the same 266 sessions, 3373 exchanges and contents, row by row. They also gave the same 640 sessions and 5489 exchanges on top of a copy of the real archive. A second pass sends the same 82 exchanges with both, because resumed sessions repeat them across files.

Two differences from `tl` are kept: errors print `alfred:` instead of `Error:`, and `cost --by model` sorts keys by bytes instead of `localeCompare`.

## Cross-references

- [memory_hist_serves_the_tl_archive_unchanged](memory_hist_serves_the_tl_archive_unchanged) — the server side
- [memory_session_names_its_harness](memory_session_names_its_harness) — the harness column
