---
tags: [roadmap, raspberry, orchestrator]
sources: [conversation]
updated: 2026-07-15
---

# Roadmap: Raspberry Orchestrator

Implementation plan for the event-driven, adversarial-guarded automation server.

## Phase 1: The Skeleton (Core & Persistence)
**Goal**: Establish the foundation where tasks can be stored and their state tracked without volatile memory.

- [ ] **Task Type Definition**: Define `RaspberryTask` interface with metadata (schedule, requiresDesktop, timeout). Scripts carry this metadata as exported constants at the top of the file (`export const requiresDesktop = true`, `export const schedule = "..."`), read via static parsing (regex or TS compiler API/AST) — never via dynamic `import()`, to preserve the no-execution-before-audit guarantee (Pillar 1).
- [ ] **Catalog Implementation (`available_tasks`)**: one JSON file per registered script (e.g. `/scripts/registered/<name>.json`) holding verdict, `schedule`, `requiresDesktop`. Presence of the file is the registration — no separate index.
- [ ] **FS-Queue Implementation**: 
    - Create directory structure: `/queue/pending`, `/queue/processing`, `/queue/completed`, `/queue/failed`.
    - Implement atomic state transitions using `fs.renameSync`.
- [ ] **Core Scheduler**: Basic Bun loop that scans `available_tasks` and matches task triggers against the current time.
- [ ] **Basic REST API**: `Bun.serve` exposing `add_task`, `list_tasks`, `get_task_status <id>` — the entire ingestion and query surface. No other entry point (no filesystem drop, no scp-based submission). `run_task` is deliberately not part of this surface — see Phase 3, Matrix Bridge.

## Phase 2: The Nervous System (Hardware & Connectivity)
**Goal**: Implement the "Wake Window $\rightarrow$ Callback $\rightarrow$ Batch Dispatch" loop — bounded from the start, no indefinite wait state.

- [ ] **Wake Window Scheduler**: Compute the earliest task needing the Desktop, send a single WoL lead time (e.g. 30 min) ahead of it.
- [ ] **WoL Module**: Implementation of Magic Packet sending to the Desktop MAC. MAC is parametric via environment variable — value TBD at implementation time.
- [ ] **`i_wake` Endpoint + Call-Home Agent**: Create a minimal systemd service for the Desktop PC that calls the Rasp's `i_wake` REST endpoint upon boot.
- [ ] **Boot-Timeout / Retry**: If no `i_wake` call arrives by a task's deadline, retry the WoL once, then alert via Matrix — a single threshold check, not a polling loop. (Moved up from Phase 4 — this is part of the core loop, not hardening.)
- [ ] **Provisioning Pipeline**: 
    - On `i_wake`, batch-dispatch every task scheduled within the wake window (~30 min), not just the triggering one.
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
    - Implement the `PASS/FAIL` gate before moving tasks to `/pending`. `FAIL` scripts are deleted outright — no retention for audit trail.
    - *(Later, optional)* Evolve the audit from static analysis to sandboxed dynamic execution: run the script in an ephemeral, single-use Docker container with no egress network and a decoy filesystem mimicking production paths. Ship the static version first.
}
- [ ] **Matrix Bridge**:
    - Integration with `matrix-bot-sdk`.
    - Implementation of the `WARNING` state: notify user $\rightarrow$ await `SÌ/NO` $\rightarrow$ if confirmed, register in `available_tasks`; if rejected, discard like a `FAIL`. Homeserver runs on the Rasp itself, reachable only over Tailscale, single-user (the owner, from Desktop/laptop/phone) — no extra authorization layer needed beyond Pillar 5's existing perimeter.
    - Bidirectional commands: list scheduled/registered tasks (`list_tasks`, mirrors REST), wake the Desktop manually (separate, explicit trigger from the scheduler's automatic WoL in Phase 2 — don't fold the two into the same code path). `run_task` (launch a specific task ad-hoc) is the one command with **no REST counterpart** — it only exists as a Matrix command, only callable against already-registered tasks, never a bypass of the audit. Kept off the REST surface so ad-hoc execution can't be triggered by tailnet membership alone (see Pillar 5, `orchestrator_overview`).
- [ ] **pi Chat Relay**: bot-side relay forwarding Matrix room messages to a persistent `pi` session on the Desktop over SSH and replies back. One room = one session (context continuity, not one-shot prompts). Includes the `/await <duration>` command (explicit keepalive: timestamp file consulted by the idle-timer, or `systemd-inhibit` with timeout). Matrix-only like `run_task` — chatting with an agent is arbitrary execution (see Interactive pi Chat in [orchestrator_overview](orchestrator_overview)).
- [ ] **Result Consolidation**: Capture stdout/stderr and move the task to `/completed` or `/failed` with an attached log.
- [ ] **Access Control Setup**: no custom auth code — configuration only.
    - Tailscale ACL: tag Desktop, laptop and phone; restrict which tags can reach the Rasp's HTTP port at all. Access is governed by who can reach the REST API, not by filesystem permissions — there is no scp-based ingestion and no per-device SSH write access to `/scripts`.

## Phase 4: Hardening & Stability
**Goal**: Ensure the system survives real-world chaos.

- [ ] **Crash Recovery Test**: Force-kill the orchestrator during a task and verify it resumes from the FS-Queue.
- [ ] **Resource Limits**: Implement the `@timeout` metadata to kill runaway scripts.
- [ ] **Log Rotation**: Prevent the `/queue/completed` directory from filling the SSD.

## Cross-references
- [architettura](architettura)
- [orchestrator_overview](orchestrator_overview)
