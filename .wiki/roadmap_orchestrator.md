---
tags: [roadmap, raspberry, orchestrator]
sources: [raspberry-orchestrator.md]
updated: 2026-07-15
---

# Roadmap: Raspberry Orchestrator

Implementation plan for the event-driven, adversarial-guarded automation server.

## Phase 1: The Skeleton (Core & Persistence)
**Goal**: Establish the foundation where tasks can be stored and their state tracked without volatile memory.

- [ ] **Task Type Definition**: Define `RaspberryTask` interface with metadata (schedule, requiresDesktop, timeout).
- [ ] **FS-Queue Implementation**: 
    - Create directory structure: `/queue/pending`, `/queue/processing`, `/queue/completed`, `/queue/failed`.
    - Implement atomic state transitions using `fs.renameSync`.
- [ ] **Core Scheduler**: Basic Bun loop that scans `/scripts` and matches task triggers against the current time.
- [ ] **Basic HTTP Server**: Setup Bun.serve to handle incoming callbacks and health checks.

## Phase 2: The Nervous System (Hardware & Connectivity)
**Goal**: Implement the "Wake Window $\rightarrow$ Callback $\rightarrow$ Batch Dispatch" loop — bounded from the start, no indefinite wait state.

- [ ] **Wake Window Scheduler**: Compute the earliest task needing the Desktop, send a single WoL lead time (e.g. 30 min) ahead of it.
- [ ] **WoL Module**: Implementation of Magic Packet sending to the Desktop MAC.
- [ ] **Call-Home Agent**: Create a minimal systemd service for the Desktop PC that sends a POST request to the Rasp upon boot.
- [ ] **Boot-Timeout / Retry**: If no callback arrives by a task's deadline, retry the WoL once, then alert via Matrix — a single threshold check, not a polling loop. (Moved up from Phase 4 — this is part of the core loop, not hardening.)
- [ ] **Provisioning Pipeline**: 
    - On callback, batch-dispatch every task scheduled within the wake window (~30 min), not just the triggering one.
    - Logic to trigger `scp` of the `.ts` file to the target for each dispatched task.
    - SSH execution wrapper: run `th sandbox-exec bun run <path>` on the Desktop instead of a bare `bun run <path>` — same real bind profile as local execution.
- [ ] **`th sandbox-exec` subcommand** (in `th` itself, `tools/th/src/cli.ts` — prerequisite for the SSH execution wrapper above): thin CLI wrapper around the existing `spawnSandboxed` (`tools/th/src/runner.ts`) that takes an arbitrary `<bin> <args...>` and forwards stdio/exit code. Today `spawnSandboxed` is only used internally to launch the `pi` agent; no generic entrypoint exists yet.
- [ ] **Local Execution Path**: Implementation of `Bun.spawn` for tasks where `requiresDesktop: false`, calling `spawnSandboxed` directly in-process (same runtime, no CLI hop needed).
- [ ] **Desktop Idle-Shutdown Service**: `systemd` idle-timer on the Desktop itself (poweroff after N min of no activity) — decided locally, not commanded remotely by the Rasp.
- [x] **Network topology confirmed**: Rasp and Desktop are on the same physical LAN via Ethernet — WoL broadcast works with no Tailscale/WireGuard traversal needed. No implementation task remains here, just a design constraint now settled.

## Phase 3: The Brain (Intelligence & Security)
**Goal**: Integrate the adversarial guardrail and the human-in-the-loop surface.

- [ ] **Adversarial Audit Integration**: 
    - Implement the API client for the cloud agent `pi`.
    - Define the adversarial prompt (Red Team analysis) — runs at ingestion time, static analysis only (no execution).
    - Same call also generates a short summary (description + numbered steps) of what the task does; sent to Matrix for every task loaded, regardless of verdict — informational, does not gate execution.
    - Implement the `PASS/FAIL` gate before moving tasks to `/pending`.
    - *(Later, optional)* Evolve the audit from static analysis to sandboxed dynamic execution: run the script in an ephemeral, single-use Docker container with no egress network and a decoy filesystem mimicking production paths. Ship the static version first.
}
- [ ] **Matrix Bridge**:
    - Integration with `matrix-bot-sdk`.
    - Implementation of the `WARNING` state: notify user $\rightarrow$ await `SÌ/NO` $\rightarrow$ transition to `processing`.
- [ ] **Result Consolidation**: Capture stdout/stderr and move the task to `/completed` or `/failed` with an attached log.
- [ ] **Access Control Setup**: no custom auth code — configuration only.
    - Tailscale ACL: tag Desktop, laptop and phone; restrict which tags can reach the Rasp's SSH/HTTP ports.
    - `authorized_keys` on the Rasp: dedicated key per device. Desktop and laptop get full write access to `/scripts`. Phone's key gets a forced command (e.g. `command="rsync --read-only ..."`) — read/listing only, no new-task submission.

## Phase 4: Hardening & Stability
**Goal**: Ensure the system survives real-world chaos.

- [ ] **Crash Recovery Test**: Force-kill the orchestrator during a task and verify it resumes from the FS-Queue.
- [ ] **Resource Limits**: Implement the `@timeout` metadata to kill runaway scripts.
- [ ] **Log Rotation**: Prevent the `/queue/completed` directory from filling the SSD.

## Cross-references
- [architettura](architettura)
- [raspberry-orchestrator](raspberry-orchestrator)
