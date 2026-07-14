---
tags: [architecture, raspberry, orchestrator]
sources: [raspberry-orchestrator.md]
updated: 2026-07-14
---

# Raspberry Orchestrator: System Overview

The Raspberry Orchestrator is an intelligent bridge designed to decouple high-level reasoning and heavy compute (Desktop PC) from a persistent, low-power control plane (Raspberry Pi).

## Core Concept: The Intelligent Bridge
Instead of a simple remote-control tool, the Orchestrator acts as a **Deterministic Guardrail**. It manages the lifecycle of automation tasks, ensuring they are secure, scheduled correctly, and executed on the most efficient node without blocking the system.

## The 4 Pillars of the Architecture

### 1. Adversarial Audit (The Guardrail)
To eliminate the ambiguity of LLM "safety" checks, the system employs an **Adversarial Approach**:
- **Mechanism**: Before a script is queued, the Cloud AI agent `pi` is tasked not to find "safety," but to act as a Red Teamer.
- **Goal**: The AI must actively attempt to find ways to break the system, escalate privileges, or delete data using the provided code.
- **Verdict**: 
    - `PASS`: No viable attack vector found.
    - `FAIL`: Vulnerability identified $\rightarrow$ task discarded.
    - `WARNING`: Suspicious but potentially valid $\rightarrow$ triggers a **Matrix Bot** notification for human approval.

### 2. Stateless FS-Queue (The Memory)
To prevent state loss during reboots or crashes, the system treats the filesystem as the source of truth.
- **Structure**: Tasks are physical `.json` files moved between directories:
  `pending/` $\rightarrow$ `processing/` $\rightarrow$ `completed/` (or `failed/`).
- **Atomicity**: Transitions use `fs.renameSync`, ensuring that a task is never in two states at once.
- **Recovery**: Upon startup, the orchestrator scans the directories to resume any interrupted tasks.

### 3. Boot-Callback Pattern (The Connectivity)
To eliminate the "Happy Path" fragility of synchronous polling (Ping loops), the system uses an asynchronous handshake:
- **The Wake**: The Rasp sends a Wake-on-LAN (WoL) packet and immediately returns to its main loop.
- **The Call-Home**: The Desktop PC, via a `systemd` service at boot, sends an HTTP POST request to the Rasp: *"I am awake and ready"*.
- **The Dispatch**: Only upon receiving this callback does the Rasp initiate the `scp` and `ssh` sequence to execute the task.

### 4. Deterministic TS Execution (The Muscle)
The system avoids the ambiguity of natural language for execution.
- **Language**: Everything is written in **TypeScript/Bun**.
- **Execution**:
    - **Local**: `Bun.spawn` on the Raspberry for light tasks.
    - **Remote**: `ssh` + `bun run` on the Desktop for heavy tasks.
- **Metadata**: Scripts include JSDoc tags (`@requiresDesktop`, `@schedule`) to define their operational constraints.

## Task Lifecycle Flow

1. **Trigger**: Scheduler identifies a task due for execution.
2. **Audit**: Code is sent to Cloud AI $\rightarrow$ `Adversarial Analysis` $\rightarrow$ `Verdict`.
3. **Queue**: If `PASS`, task is written to `/queue/pending`. If `WARNING`, await Matrix approval.
4. **Activation**: 
    - If `@requiresDesktop: true` $\rightarrow$ send WoL $\rightarrow$ wait for **Boot-Callback**.
    - If `false` $\rightarrow$ proceed to execution.
5. **Deployment**: `scp` the `.ts` file to the target node.
6. **Run**: Execute via `bun run` $\rightarrow$ capture stdout/stderr.
7. **Consolidation**: Move task to `/completed` and notify the user via Matrix.

## Technical Stack Summary
- **Runtime**: Bun (Raspberry Pi & Desktop).
- **Language**: TypeScript.
- **Communication**: Tailscale (WireGuard) + SSH + HTTP (for callbacks).
- **Control Surface**: Matrix (conduwuit homeserver + bot).
- **Hardware**: Raspberry Pi (Always-on) $\rightarrow$ Desktop (On-demand).

## Cross-references
- [roadmap_orchestrator](roadmap_orchestrator)
- [architettura](architettura)
