---
tags: [memory, ti, rules, alfred, qdrant, ollama]
sources: [spec.json@9d28de2, review.json@9d28de2, tools/alfred/src/rules]
---

## Decision

`alfred serve` serves the `ti` rules on the data `ti` already has. That means the Qdrant collection `pi_identity`, the same payload keys, the model `nomic-embed-text-v2-moe` and the prefixes `search_document: ` and `search_query: `. A date is written the way JavaScript writes it, with milliseconds and `Z`.

The server computes the embeddings with the Ollama on the Deck. At start it loads the model and asks Ollama to keep it in memory (`keep_alive: -1`).

`alfred rules` has every `ti` command, with the same flags: `search`, `add`, `list`, `meta`, `delete`, `append-do`, `refine`, `near`, `reach`, `guide`. `guide` is built into the binary.

## Why

`td` still runs in TypeScript and writes rules through the `ti` code. Both must read and write the same points, so nothing is migrated. A live check gave the same ids and scores as `ti` on real searches. It also gave the same 255 rules, the same `refine` spread, the same `near` pairs and the same `reach` counts on 210 real prompts. A rule added by `alfred` reads the same through `ti meta`.

The same flags make the final pass over the callers a plain rename.

An embedding on the Deck takes about 50 ms with the model loaded, and 2.1 s when Ollama must load it again. Ollama unloads a model after 5 idle minutes. With the hook limit near 1 s, the first prompt after a pause would get nothing.

## Cross-references

- [memory_rules_search_deadline_is_kept_by_the_server](memory_rules_search_deadline_is_kept_by_the_server) — the hook limit
- [core_alfred_v2_one_binary_serve_on_the_deck](core_alfred_v2_one_binary_serve_on_the_deck) — the server
