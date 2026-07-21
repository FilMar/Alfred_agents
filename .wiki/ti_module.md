# Third Identity (ti)

```yaml
tags: [architecture, memory, ti, qdrant]
sources: [conversation, tools/ti/src/types.ts, tools/ti/src/identity.ts, tools/ti/src/qdrant.ts, tools/ti/src/cli.ts, tests/ti.test.ts]
updated: 2026-07-21
```

## Overview

`ti` (Third Identity) is a module implemented on 2026-07-21: a thin CLI over a dedicated Qdrant collection `pi_identity`, storing context→action rules — distinct from `tb`'s semantic/declarative memory. It provides a lightweight mechanism for encoding behavioral, dispatch, and lookup associations tied to specific contexts.

## Implementation

The module is implemented following a layered architecture to maintain consistency with the `tb` module (`tools/tb/CLAUDE.md`), deviating from the initial single-file design:

- `cli.ts`: Commander-based CLI surface (`add`, `search`, `list`, `delete`, `append-do`). No direct infrastructure calls.
- `identity.ts`: Core business logic. Each function includes a `CONTRACT` comment defining pre/postconditions and side effects.
- `qdrant.ts`: Low-level Qdrant HTTP wrappers for the `pi_identity` collection.
- `types.ts`: Shared types including `IdentityEntry` (id, vector, if, do, tags) and `SearchOptions`.
- `tests/ti.test.ts`: Behavioral test suite (7 tests, mocked HTTP), all passing.

**Key refinements during implementation:**
- **ID Generation**: `addEntry` generates point IDs client-side via `crypto.randomUUID()` to ensure tracking before upsert, as Qdrant's response does not return generated IDs in the expected shape.
- **Error Handling**: `appendDo` was hardened to throw an explicit "No entry found with id: \<id>" error instead of a `TypeError` when operating on non-existent entries.

**Live smoke test (2026-07-21), against the real Qdrant/Ollama instance on the Rasp** — found and fixed three real response-shape bugs the mocked test suite could not catch, since the mocks had been written to match the code's assumptions rather than the actual API:
- `query`/`scroll` responses wrap results in `result.points`, not a bare `result` array — `queryPoints`/`scrollPoints` callers (`searchEntries`, `listEntries`) read the wrong path and always saw an empty/broken list.
- The `query` endpoint does not include `payload` in its results unless `with_payload: true` is set explicitly — added to the request.
- The single-point GET (`getPointById`) returns an object at `result`, not an array — `appendDo` read `result?.[0]`, which is always `undefined` on a real response. This was a genuine blocking bug: `appendDo` would have thrown "No entry found" on **any** existing id in production, never just on missing ones.

All three fixed in `qdrant.ts`/`identity.ts`; unit test mocks in `tests/ti.test.ts` updated to match the real shapes; full add → search → list → append-do → delete cycle re-verified against the live instance after the fix.

**Packaging (done 2026-07-21)**: `ti` registered in root `package.json`'s `bin.ti`, symlinked at `~/.local/bin/ti` (matching `tb`/`th`), and added to `setup.sh` alongside them — verified idempotent on a second run.

## Why a separate collection

`tb` answers "what do I know about X" (semantic retrieval over concepts/notes, including the existing `kind: protocollo`). It does not cleanly answer "how have I behaved, given a context like X" — mixing the two retrieval patterns into one collection degrades both: behavioral queries get diluted by semantic noise, semantic queries get cluttered with situational one-offs. `ti` extends the analysis already in [procedural_memory_gaps](procedural_memory_gaps): gap 3 (no trigger-indexed procedure store) and gap 4 (no dedup/versioning loop) are what `ti`'s schema and workflow concretely resolve — see below.

## Schema

```
if:   string    # context/trigger — the only embedded field, searched semantically
do:   string[]  # actions for that context — plain payload
tags: string[]  # free-form scoping (project, domain, agent) — payload filter
```

No note-linking (no `refs`/`backrefs` like `tb`): entries are atomic condition→action rules, not a knowledge graph. Only `if` is vectorized; `do` and `tags` are plain payload.

### `do` is a general action, not just behavior (settled 2026-07-21)

`do` entries are not restricted to one kind. Three concrete forms settled in conversation:
- **behavior/attitude** — "keep commits surgical, no unrelated cleanup";
- **dispatch** to a skill or `th` member — "use skill Platone", "run member knuth-black for audit";
- **lookup hint** into `tb` — a topic/search term worth checking for this context, never a frozen note id: an id goes stale as `tb` accumulates new relevant notes on the same topic over time, a search term stays valid.

This makes `ti` a general **context router**, not just a behavior log. Its value is encoding non-obvious associations — a context that wouldn't semantically surface a related skill, member, or `tb` note on its own. If the association were obvious, plain `tb search` would already find it and `ti` would add nothing.

## Key design decision: dumb client, intelligence at call time

`ti` does not judge similarity, does not auto-merge, does not call an LLM internally. The merge/dedup judgment happens at call time by whoever uses the CLI (human or agent): `search` on the candidate `if`, evaluate the returned matches (including checking for near-duplicate strings already inside an existing entry's `do` array), show a summary table (new / merge / skip), act only after confirmation — appending to `do` when a match is close enough, otherwise creating a new entry.

This is deliberately the same discipline already used with `tb search` $\rightarrow$ `tb add`, not delegated to an in-tool LLM call: keeping the judgment outside the CLI avoids making `ti` depend on `th` (per project governance, delegating specialized judgment means going through `th run`, not inlining a prompt in a tool) and avoids adding latency/cost to every `add`. It also matches the "log first, intelligence after" principle already adopted for procedural memory: `ti` builds the store now, but the merge intelligence stays external and human/agent-in-the-loop until there is a concrete reason to automate it.

## Reuse of tb's infra

Reuses `tools/tb/src/infra.ts` as a library (`HttpClient`, `QDRANT_URL`, `OLLAMA_URL`, `EMBED_MODEL`) without modifying `tb` — same Qdrant/Ollama instance (remote, on the Rasp — see [tb_on_rasp](tb_on_rasp)), different collection (`pi_identity` vs `third-brain`).

## Implemented Commands

- `add`: Embeds context (`if`) and associates it with an action (`do`) and optional tags.
- `search <query>`: Performs semantic search on the `if` field with optional tag filtering.
- `list`: Returns all entries, optionally filtered by tags.
- `delete <id>`: Removes a rule by ID.
- `append-do <id>`: Appends a new action to an existing rule without modifying the trigger.

## Pending Work

- None outstanding on `ti` itself — collection provisioning (`ensureCollection`, idempotent create-if-missing), packaging (bin registration, `setup.sh`), and the response-shape bugs above are all done and verified live.

## Open — governance gap

`ti` is a new procedural-memory system standing alongside `tb` (semantic memory), but this is **not yet reflected upstream** — flagged here as a follow-up, not yet actioned:

- **Skills** (`~/.claude/skills`): Platone (memory consolidation) currently only knows how to write to `tb`. It has no notion of `ti`'s if/do rules, so procedural decisions surfaced in a session are not routed there.
- **`alfred.md`** (the user's global identity/instructions file): documents Third Brain (`tb`) and Third Hand (`th`) as the two memory/orchestration systems, but does not mention Third Identity (`ti`) at all.

Both need updating to actually teach the system to use `ti` for procedural if/do rules — otherwise `ti` remains a working tool nobody is instructed to call.

## Cross-references

- [procedural_memory_gaps](procedural_memory_gaps) — the gap analysis `ti` extends (gaps 3 and 4)
- [architettura](architettura) — the layer table `ti` adds to
- [tb_on_rasp](tb_on_rasp) — the Qdrant/Ollama instance `ti` shares with `tb`
- [roadmap_orchestrator](roadmap_orchestrator) — the orchestrator work `ti` took priority over
- [agenti](agenti) — skills and `th` members `ti` can dispatch to
