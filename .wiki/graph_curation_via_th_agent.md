---
tags: [graph, th, curation, agent]
sources: [conversation]
---

## Decision

Whole-graph curation (`aristotele`'s job: dense clusters, hub notes, bridges between old isolated notes) is a global action in the dashboard, not a per-note button — it works on the whole graph, not the open note. It runs through `th` as an agentic library under the web service.

- A dedicated `th` member gets its own identity and hat and a task that follows `aristotele`'s procedure. The harness never dispatches to a skill by name via `th run --member` — a skill and a member stay two different things ([agents_skills_inline_members_via_th](agents_skills_inline_members_via_th)); the member's task text may instruct it to follow a skill's protocol, which is not the same as naming the skill as the member.
- `th run` without `--detach` streams its stdout live — every tool call, so every `tb search` / `tb save` / `tb update` as it happens. The dashboard backend pipes that stream to the browser (SSE or websocket) so the user watches writes land in real time, with a kill-switch to stop the run mid-flight.
- This is visibility-with-kill-switch, not pre-commit approval. Accepted for curation specifically because `tb` refs are append-only and `tb delete` exists — an in-flight mistake is cleaned up after, not corrupting.
- `th`'s own HTTP API is planned, not built ([th_http_api_scoped_no_db](th_http_api_scoped_no_db)). The dashboard backend shells out to the `th` CLI as a subprocess; it does not assume an HTTP layer.
- For a paused, step-by-step variant (stop for approval before each write): `th run` is single-shot with no session continuation, so each step is a fresh `th run --task` call. The injected memory between calls stays small: the exact decision log (note id, accept/reject, reason) kept verbatim, plus a one-line traversal cursor — built from the previous run's own tracked output (`th get`), not a new store.

## Why

The per-note review built for grafting ([graph_note_workbench_direct_manipulation](graph_note_workbench_direct_manipulation)) does not fit curation: curation reasons over the whole graph in one pass, and gating every one of its writes behind a click would turn a batch job back into a manual one. Live streaming plus a kill-switch keeps the same spirit — you see what changes before you'd notice it any other way — at a cost curation can actually pay.

`th run` already streams when attached and already tracks per-run state; no new mechanism needed for visibility. The stateless fresh-call pattern for the paused variant follows from how `th` is built, not around it: fighting for a long-lived session would fight the tool.

One known risk carries over unchanged: attached and detached runs have a silent-death failure mode — a short `.out` with a `.log` that stops mid-reasoning ([th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp)). The live-stream view must treat a stream gone quiet as suspect, not as "done".

## Cross-references

- [agents_skills_inline_members_via_th](agents_skills_inline_members_via_th) — the skill-vs-member boundary this follows
- [th_http_api_scoped_no_db](th_http_api_scoped_no_db) — why the backend shells out instead of calling HTTP
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — the silent-death risk the stream view must handle
- [graph_note_workbench_direct_manipulation](graph_note_workbench_direct_manipulation) — the per-note companion decision
