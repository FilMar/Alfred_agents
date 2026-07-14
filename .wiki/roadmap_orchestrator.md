---
tags: [roadmap, raspberry, orchestrator]
sources: [raspberry-orchestrator.md]
updated: 2026-07-14
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
**Goal**: Implement the "Wake $\rightarrow$ Callback $\rightarrow$ Dispatch" loop.

- [ ] **WoL Module**: Implementation of Magic Packet sending to the Desktop MAC.
- [ ] **Call-Home Agent**: Create a minimal systemd service for the Desktop PC that sends a POST request to the Rasp upon boot.
- [ ] **Provisioning Pipeline**: 
    - Implement the `AWAITING_BOOT` state.
    - Logic to trigger `scp` of the `.ts` file to the target once the callback is received.
    - SSH execution wrapper for `bun run`.
- [ ] **Local Execution Path**: Implementation of `Bun.spawn` for tasks where `requiresDesktop: false`.

## Phase 3: The Brain (Intelligence & Security)
**Goal**: Integrate the adversarial guardrail and the human-in-the-loop surface.

- [ ] **Adversarial Audit Integration**: 
    - Implement the API client for the cloud agent `pi`.
    - Define the adversarial prompt (Red Team analysis).
    - Implement the `PASS/FAIL` gate before moving tasks to `/pending`.
}
- [ ] **Matrix Bridge**:
    - Integration with `matrix-bot-sdk`.
    - Implementation of the `WARNING` state: notify user $\rightarrow$ await `SÌ/NO` $\rightarrow$ transition to `processing`.
- [ ] **Result Consolidation**: Capture stdout/stderr and move the task to `/completed` or `/failed` with an attached log.

## Phase 4: Hardening & Stability
**Goal**: Ensure the system survives real-world chaos.

- [ ] **Crash Recovery Test**: Force-kill the orchestrator during a task and verify it resumes from the FS-Queue.
- [ ] **Boot-Timeout Logic**: Implement a maximum wait time for the callback before marking a task as `FAILED` (Desktop dead).
- [ ] **Resource Limits**: Implement the `@timeout` metadata to kill runaway scripts.
- [ ] **Log Rotation**: Prevent the `/queue/completed` directory from filling the SSD.

## Cross-references
- [architettura](architettura)
- [raspberry-orchestrator](raspberry-orchestrator)
