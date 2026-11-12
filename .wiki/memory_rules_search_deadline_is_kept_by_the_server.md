---
tags: [memory, ti, rules, alfred, hook, timeout]
sources: [conversation, review.json@9d28de2, tools/alfred/src/rules/store/mod.rs]
---

## Decision

`alfred rules search --timeout <ms>` sends the limit to the server. The server applies it to the search itself: the embedding and the Qdrant query. When the limit runs out, the server stops the search, counts no hit and answers 504. Hits are written only after a search that ended in time.

The client waits for the limit plus 500 ms for the network. On a 504, or when the time runs out, it prints nothing and exits with 0. Without the flag there is no limit.

## Why

The prompt hook must never block the prompt. So it uses a short limit, about 1 s.

The first version kept the limit in the client only. The client stopped waiting, but the server went on and counted hits for rules the agent never saw. Those hits raise the trust that `refine` computes. Only the server knows when the search is done, so the limit belongs there. The client margin covers a server it cannot reach, such as a laptop off the tailnet.

One case is left: the server ends in time, but the network loses the answer. The hits are still right there, because the search did happen.

## Cross-references

- [memory_rules_served_on_the_same_qdrant_data](memory_rules_served_on_the_same_qdrant_data) — the rules service
