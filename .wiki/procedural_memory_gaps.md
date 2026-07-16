# Procedural Memory Gaps

## Frontmatter

```yaml
tags: [architecture, memory, th, roadmap]
sources: [conversation]
updated: 2026-07-16
```

## Context

`tb` (Third Brain) covers **declarative/semantic memory**: facts, concepts, connections, retrieved by content similarity. It does not cover **procedural memory**: how to do things, refined through repetition and outcome feedback.

The existing roadmap has two pieces that look like procedural memory but are not:
- **Phase 2C (done)**: `th.db` (SQLite) tracks every `th run` — id, member, task, status, timestamps. Per-member/hat execution history.
- **Phase 7 (planned)**: `th stats` — aggregate metrics per hat over time (output quality, tokens, duration).

Both are **evaluative/scoring layers only**. They measure how well a member/hat performs; they do not extract, store, or revise reusable procedures. They also do not touch the skills system (`.claude/skills/*.md`) at all — skills are a separate, disconnected mechanism, authored manually (e.g. via the Prometeo skill).

## The six gaps

In dependency order — each presupposes the data or mechanism from the one above it.

1. **No telemetry on skills.** `th.db` tracks execution + score per `th` member/hat (Phase 2C/7). Skills (omero, platone, ermes, prometeo, etc.) have no equivalent: no log of invocation frequency, context, or outcome. The measurement side is only half-covered — `th` members yes, skills no.

2. **No extraction of the procedure from the outcome.** Even with Phase 7 complete, what you get is a score ("this member performs well"), not *which specific action/tool-call sequence* produced that result. A step is needed that, given a successful run, isolates the action pattern itself — not just a judgment about it.

3. **No trigger-indexed procedure store.** `tb` indexes by semantic similarity of content; skills are triggered by hand-written descriptions. Missing: a store of procedures indexed by "what situational context should invoke this", derived from data, not declared upfront by an author.

4. **No revision/versioning loop.** `tb` is purely additive (notes + refs); skills only update when someone (Prometeo) manually rewrites them. No mechanism exists that, given accumulated evidence, automatically updates or deprecates an existing procedure.

5. **No bridge between the three systems.** `th.db` (members), `skills/` (manual procedures), `tb` (semantics) today share no schema or identifiers — there is no single event "X happened, in this context, with this outcome, from this member/skill" traversing all three.

6. **No member↔skill promotion pipeline.** If a `th` member discovers an effective pattern by repeating a task, there is no path (analogous to `th member promote`) to crystallize it into a reusable skill — and conversely, a skill's success doesn't feed back to members that could benefit from it.

## Dependency note

Gap 1 is the hard prerequisite: without skill telemetry, gaps 2-6 lack data to operate on for half the system (skills). Gap 5 is likely the architectural bottleneck: as long as the three stores (`th.db`, `skills/`, `tb`) stay isolated, any fix to gaps 2, 4, or 6 risks being built three times — once per system.

## Adopted approach

**Principle: grow new components on top of data, not hypotheses.** The only missing infrastructure is the unified event log — everything else (member tracking in `th.db`, `tb` kind `protocollo`, Prometeo for authoring skills) already exists. Every further component must be justified by concrete evidence from accumulated data, not speculative design. Same principle already applied to the Raspberry Orchestrator (static analysis first, Docker sandbox only if needed — see [orchestrator_overview](orchestrator_overview)): log first, intelligence after.

Three moves, cheapest first:

1. **Unify the event log first** (fixes gap 5, then gap 1). Do not build three telemetries. Extend `th.db` with a generic `events` table: who (member *or* skill), context/task, outcome, pointers to out/log files. Member data already exists (Phase 2C); for skills, a Claude Code hook logging every Skill invocation into the same table. Solving gap 5 first makes gap 1 a one-line hook instead of a new system, and gives gaps 2/4/6 a single store to operate on.

2. **Human-in-the-loop procedure extraction, not automatic** (gaps 2-3). A "procedural Platone": after a successful task, read the run log and distill the *action sequence* (not the concept), proposing it to the user for confirmation. Minimal version of the trigger-indexed store: save procedures in `tb` with kind `protocollo`, trigger context explicit in the `what` field. Build a dedicated store only when there is evidence semantic retrieval is insufficient.

3. **Revision loop and member↔skill promotion only when data exists** (gaps 4, 6). These make sense only after months of accumulated events — any deprecation heuristic written today would be speculation. Keep them on the roadmap, build later.

**Anti-pattern to avoid**: starting from moves 2 or 3 because they are the most interesting — without move 1 you build intelligence on data that doesn't exist.

**Next concrete step** when work starts: schema of the `events` table + the skill-invocation hook, to be founded as a new module via Archimede (project governance).

## Cross-references

- [roadmap](roadmap) — Phase 2C, Phase 7, Phase 8 planning this extends
- [agenti](agenti) — skills vs. `th` members distinction
- [architettura](architettura) — the three layers (`tb`, `th`, `.wiki/`) and why they don't overlap
- [th_cli](th_cli) — `th.db` schema and `th history`/`th stats` commands
