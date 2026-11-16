---
tags: [core, alfred, api, json, cli]
sources: [spec.json@3611e27, review.json@3611e27, tools/alfred/src/api.rs]
---

## Decision

Every answer of the `alfred serve` API is JSON, errors included. An error is `{error, paths}`. `paths` is empty except for a name that matches more than one page.

The reply types are serde types in the crate, shared by the server and the client. Examples are `TocReply`, `ReadReply` and `ErrorReply`.

The client never prints JSON. `alfred vault` prints plain text for the agent: the `toc` table, the markdown of a section, or the error message.

## Why

serde checks every reply on both sides. The server and the client cannot drift, because they build and read the same types.

The API stays usable by other programs. A dashboard or a TUI can read it as it is. Only the CLI decides how a reply looks to the agent.

The first skeleton returned markdown and plain-text errors from `/vault/read`. The user changed it before review. A list of ambiguous paths is a field in JSON, not lines to split.

## Cross-references

- [core_alfred_v2_one_binary_serve_on_the_deck](core_alfred_v2_one_binary_serve_on_the_deck) — the server and its clients
- [memory_vault_read_by_name_from_the_indexes](memory_vault_read_by_name_from_the_indexes) — the vault commands
