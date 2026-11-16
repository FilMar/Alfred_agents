---
tags: [core, alfred, rust, server, libraries]
sources: [conversation, tools/alfred/Cargo.toml]
---

## Decision

`alfred serve` runs on axum and tokio. The client uses reqwest. The vault headings come from pulldown-cmark.

## Why

A blocking server (`tiny_http` plus `ureq`) was proposed first, as the simpler stack for one user. The user rejected it. With axum, routes, query parsing and JSON replies are declared, not written by hand. That means less code to maintain. Speed was not the reason.

pulldown-cmark reads the markdown structure. An early body found headings line by line. It took a `#` inside a code block for a heading, and it missed headings underlined with `===`.

## Cross-references

- [core_alfred_v2_written_in_rust](core_alfred_v2_written_in_rust) — the language
- [core_alfred_api_speaks_json_cli_prints_text](core_alfred_api_speaks_json_cli_prints_text) — what the routes return
