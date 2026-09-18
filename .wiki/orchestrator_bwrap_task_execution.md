---
tags: [orchestrator, sandbox, execution, bwrap]
sources: [tools/th/src/runner.ts, tools/orchestrator/src/executor.ts, .wiki/orchestrator_overview.md]
---

## Decision

Audited (`PASS`) tasks execute wrapped in `th`'s existing bwrap sandbox, reusing its real bind profile as-is (`cwd`, `~/.pi`, `~/.bun`, `/tmp`) — no decoy paths, no network isolation: these are already-audited tasks that need to write real data.

- Remote path: `scp` the script to the Desktop (it does not exist there yet), then `ssh ... th sandbox-exec bun run <path>`. Two orthogonal steps — one moves the file, one decides how it is launched. `th sandbox-exec` refuses to run without bwrap.
- Local path (Rasp): `spawnSandboxed` called directly in-process, no CLI hop.
- Nothing extra ships to the nodes: Rasp and Desktop run the identical `pi`/`th` TypeScript stack.
- No per-task log yet — `executeLocal` spawns with `stdio: "inherit"`; capture lands with Phase 3 Result Consolidation.

Two sandboxes, two jobs, never confused: the Docker audit sandbox (ephemeral, decoy filesystem, no egress, used *before* queueing, not yet implemented) tests a script adversarially; bwrap (real binds, network allowed) executes a trusted script after the audit.

## Why

The script stack is identical on both nodes, so the wrapper needs no distribution — only the entrypoint. Reusing `th`'s sandbox avoids a second sandbox implementation whose only difference would be worse. Keeping the decoy filesystem out of the execution path is deliberate: audited tasks must write real data.

## Cross-references

- [th_sandbox_bwrap_fixed_binds](th_sandbox_bwrap_fixed_binds) — the sandbox profile and the refusal rule
- [orchestrator_adversarial_audit_static](orchestrator_adversarial_audit_static) — the gate that must pass before any of this runs
- [orchestrator_boot_callback_wake_window](orchestrator_boot_callback_wake_window) — how the execution gets triggered