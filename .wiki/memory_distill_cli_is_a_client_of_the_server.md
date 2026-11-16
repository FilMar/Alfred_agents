---
tags: [memory, distiller, alfred, cli]
sources: [conversation, spec.json@2dcf7a9, tools/alfred/src/distill/cli.rs]
---

## Decision

`alfred distill` runs no pipeline. It is a client of `alfred serve`, like the other `alfred` commands. It sends `POST /distill`, reads `GET /distill/status` every 5 seconds, and prints the report when `last` is its run. It stops waiting after 24 hours and points to `--status`. `alfred distill --status` prints the status and stops.

`alfred extractor add <file> --why --parent` checks the file as a `Config` before it posts it, then reads the row back. `show` and `activate` call the `/hist/extractors` routes.

## Why

The rule of one run at a time lives in the `Runner` of the server. A CLI that runs the pipeline itself would open the database, Qdrant and Ollama on its own, and two runs could go at once.

## Cross-references

- [memory_distill_run_starts_async_with_status](memory_distill_run_starts_async_with_status) — the routes the CLI calls
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — a change is a new row
