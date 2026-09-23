---
tags: [graph, third-os, th, agent, sandbox]
sources: [ROADMAP.md, tools/th/src/runner.ts, conversation]
---

## Decision

Phase 3 of `third_os` — debates, notes drafted by the agent, link proposals — is **asynchronous by design**. The user launches a run and watches the stream. There is no chat ping-pong that waits for a turn to come back.

The reason is mechanical. `third_os` imports `th` as a library, but that does not remove the spawn: `runner.ts` exposes `runMember`, and inside it goes through `spawnSandboxed` / `spawnDetached`. Every agent turn is a child process under `bwrap`, so it pays fork, plus `bwrap`, plus a `pi` boot, before the model says anything. Importing `th` changes the calling interface, not the execution model.

One trap to avoid: `runner.ts` also exports `ensureSandboxed()`, which **re-execs the current process under `bwrap`**. If it ever lands on the start path of `third_os`, the web server re-execs itself. `th` is imported function by function, never wholesale.

## Why

The cockpit died of exactly this cost. Its first end-to-end test was slow because `runAgent` spawned a fresh `bun` process every turn, and the fix was to stop spawning at all by becoming a `pi` extension in RPC mode ([cockpit_pivot_pi_extension_rpc](cockpit_pivot_pi_extension_rpc)).

`third_os` cannot take that route: it is a web app for the graph, not a chat client for `pi`, and it needs a browser. So it does not fight the spawn — it designs around it. A synchronous chat would make the cost feel like a bug. A launched run with a live stream makes the same seconds read as work happening.

This also matches how the whole-graph curation already treats `th`: as a subprocess with its stdout piped to the browser, with a kill switch ([graph_curation_via_th_agent](graph_curation_via_th_agent)). Two features, one execution shape.

The known silent-death failure carries over: a run can end with a short `.out` and a `.log` that stops mid-reasoning ([th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp)). A stream that goes quiet is suspect, not done.

## Cross-references

- [cockpit_pivot_pi_extension_rpc](cockpit_pivot_pi_extension_rpc) — the project this cost already stopped once
- [graph_curation_via_th_agent](graph_curation_via_th_agent) — the same subprocess-plus-stream shape
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — the silent-death risk to handle
- [graph_third_os_webapp_wider_than_workbench](graph_third_os_webapp_wider_than_workbench) — the phase 3 this governs
</content>
