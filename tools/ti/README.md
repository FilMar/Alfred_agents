# Third Identity (ti)

A CLI managing a dedicated Qdrant collection for context → action rules — distinct from the Third Brain's semantic/declarative memory.

## Problem

`tb` (Third Brain) stores semantic knowledge: concepts, facts, notes linked by meaning. It answers "what do I know about X." It does not answer "given a context like X, what should happen" — mixing the two degrades both: contextual retrieval gets diluted by semantic noise, and semantic search gets cluttered with one-off situational rules.

## Solution

A separate Qdrant collection (`pi_identity`) storing atomic condition→action rules:

```
if:   string    # context/trigger — the only embedded field, searched semantically
do:   string[]  # actions for that context — plain payload
tags: string[]  # free-form scoping (project, domain, agent) — payload filter
```

`do` entries are action strings, not restricted to one kind — a `do` can be:
- an observed **behavior/attitude** ("keep commits surgical, no unrelated cleanup"),
- a **dispatch** to a skill or `th` member ("use skill Platone", "run member knuth-black for audit"),
- a **lookup hint** into `tb` — a topic/search term worth checking for this context, not a frozen note id (ids go stale as `tb` accumulates new relevant notes over time; a search term stays valid).

This makes `ti` a general context router, not just a behavior log — the value is encoding non-obvious associations (a context that wouldn't semantically surface a related skill, member, or `tb` note on its own). If the association is obvious, plain `tb search` already finds it and `ti` adds nothing.

`ti` is a thin client, not a decision-maker: it does not judge similarity or auto-merge. The caller (typically an agent, at session end or on demand) runs `ti search` against a candidate `if`, evaluates the returned matches, decides whether to append to an existing entry's `do` array or create a new one, and confirms before writing — same division of responsibility already used with `tb search` → `tb add`.

Reuses `tools/tb/src/infra.ts` as a library (`HttpClient`, `QDRANT_URL`, `OLLAMA_URL`, `EMBED_MODEL`) — no duplication, no changes to `tb`.

## Stack

- Bun + TypeScript, same as `tb`/`th`.
- Qdrant (vector storage, collection `pi_identity`) — reuses the same instance as `tb`, remote on the Rasp.
- Ollama (`nomic-embed-text` embedding) — same instance as `tb`.
- `commander` for the CLI, same as `tb`/`th`.

## Development

- Entry point: `tools/ti/src/cli.ts`, registered as `ti` in root `package.json` `bin`.
- Run locally: `bun tools/ti/src/cli.ts <command>`.
- Tests: `bun test tests/ti.test.ts` (to be added alongside implementation, following `tests/tb.test.ts` conventions).
