---
tags: [architecture, raspberry, orchestrator]
sources: [raspberry-orchestrator.md]
updated: 2026-07-15
---

# Raspberry Orchestrator: System Overview

The Raspberry Orchestrator is an intelligent bridge designed to decouple high-level reasoning and heavy compute (Desktop PC) from a persistent, low-power control plane (Raspberry Pi).

## Core Concept: The Intelligent Bridge
Instead of a simple remote-control tool, the Orchestrator acts as a **Deterministic Guardrail**. It manages the lifecycle of automation tasks, ensuring they are secure, scheduled correctly, and executed on the most efficient node without blocking the system.

## The 5 Pillars of the Architecture

### 1. Adversarial Audit (The Guardrail)
To eliminate the ambiguity of LLM "safety" checks, the system employs an **Adversarial Approach**:
- **Mechanism**: Before a script is queued, the Cloud AI agent `pi` is tasked not to find "safety," but to act as a Red Teamer.
- **Timing**: Runs at ingestion time — when the script is loaded into the system — not at Desktop wake time. This decouples the audit from cloud availability at wake/dispatch time; the Rasp only ever reads scripts already carrying a verdict.
- **Current implementation — static analysis**: The agent reads the script's code and reasons adversarially about it (no execution). It must actively attempt to find, by inspection, ways it could break the system, escalate privileges, or delete data.
- **Planned evolution — sandboxed dynamic execution** (not yet implemented): run the script for real inside an ephemeral, single-use Docker container to turn hypothesis into evidence — no egress network (blocked outbound calls double as an exfiltration signal), and a decoy filesystem mimicking production paths so a destructive action hits fake data instead of real. Ship the static-analysis version first; add the sandbox later.
- **Goal**: The AI must actively attempt to find ways to break the system, escalate privileges, or delete data using the provided code.
- **Human-readable summary**: The same call also produces a short summary (2-3 line description + numbered steps) of what the task does, derived from the same static reading — no second LLM round-trip. Sent to Matrix for every task loaded, regardless of verdict. Informational only: it does not gate execution — only `WARNING` still requires human approval to proceed.
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
To eliminate the "Happy Path" fragility of synchronous polling (Ping loops), the system uses an asynchronous handshake bounded by a wake window, not an indefinite wait:
- **The Wake Window**: The Rasp computes the earliest scheduled task needing the Desktop and sends a single Wake-on-LAN (WoL) packet ahead of it (e.g. 30 min lead time), then returns to its main loop.
- **The Call-Home**: The Desktop PC, via a `systemd` service at boot, sends an HTTP POST request to the Rasp: *"I am awake and ready"*.
- **The Dispatch**: Upon receiving this callback, the Rasp dispatches every task scheduled within the following wake window (~30 min), not just the one that triggered the wake — batching avoids repeated wake cycles for nearby tasks.
- **Failure bound**: If no callback arrives by the task's deadline, the Rasp retries the WoL once, then alerts via Matrix. A single threshold check, not a polling/retry loop.
- **Shutdown**: Decided locally on the Desktop by a `systemd` idle-timer service (poweroff after N minutes of no activity) — not commanded remotely by the Rasp, since the Desktop is the one that can see its own real idle state.
- **Network topology (confirmed)**: Rasp and Desktop are connected via Ethernet on the same physical LAN, ~10cm apart. The WoL magic packet travels as a local L2 broadcast — it never crosses the Tailscale/WireGuard overlay. Tailscale is used exclusively for *external* access to the orchestrator (from laptop and phone), not for Rasp↔Desktop communication.

### 4. Deterministic TS Execution (The Muscle)
The system avoids the ambiguity of natural language for execution.
- **Language**: Everything is written in **TypeScript/Bun**.
- **Execution**:
    - **Local**: `Bun.spawn` on the Raspberry for light tasks.
    - **Remote**: `ssh` + `bun run` on the Desktop for heavy tasks.
- **Execution sandbox**: Both paths run wrapped in `th`'s existing bwrap sandbox (`spawnSandboxed`, `tools/th/src/runner.ts`), reusing its real bind profile as-is (`cwd`, `~/.pi`, `~/.bun`, `/tmp`) — no decoy paths, no network isolation, since these are already-audited (`PASS`-verdict) tasks that need to write real data. This is a separate sandbox from the audit sandbox in Pillar 1 (Docker, ephemeral, decoy filesystem, no egress, used *before* queueing): Docker for adversarial testing, bwrap for the actual trusted execution after.
    - **Missing CLI entrypoint**: `spawnSandboxed` is exported but today used only internally by `th run` to launch the `pi` agent — `th`'s CLI (`tools/th/src/cli.ts`) exposes no subcommand for wrapping an arbitrary binary. A new `th sandbox-exec -- <bin> <args...>` subcommand is needed: a thin wrapper that calls the existing `spawnSandboxed` and forwards stdio/exit code.
    - **Nothing extra ships to the Desktop for this**: the Rasp and the Desktop run the identical `pi`/`th` TypeScript stack, so `th sandbox-exec` is present on both nodes once built — no separate wrapper file needs to be transferred.
    - **Full remote sequence**: (1) `scp` the task script to the Desktop — unchanged from the original design, needed because the script is authored/audited on the Rasp and doesn't exist locally on the Desktop; (2) `ssh` into the Desktop and run `th sandbox-exec bun run <path-to-script>` instead of a bare `bun run <path-to-script>`. The two steps are orthogonal: `scp` moves the file, `sandbox-exec` decides how it's launched once it arrives. Locally on the Rasp, no CLI hop is needed — `spawnSandboxed` is called directly in-process.
- **Metadata**: Scripts include JSDoc tags (`@requiresDesktop`, `@schedule`) to define their operational constraints.

### 5. Access Control (The Perimeter)
No custom user/role system in the app — two layers, both already existing infrastructure, no new code:
- **Network layer**: Tailscale ACLs, tagged per device (Desktop, laptop, phone), restrict which tags can reach the Rasp's SSH/HTTP ports.
- **Key layer**: a dedicated SSH key per device in the Rasp's `authorized_keys`. Desktop and laptop hold keys with full write access (can drop new task scripts into `/scripts`). The phone is deliberately excluded from writing new tasks: its key carries a forced command in `authorized_keys` (e.g. `command="rsync --read-only ..."`) that permits read/listing only.
- **Threat model rationale**: hostile input risk is already low because the orchestrator's endpoint is never exposed publicly — it only exists on the Tailscale overlay, so an attacker would first have to breach the Tailscale network itself. The two layers (network ACL + key-scoped forced command) are sufficient defense-in-depth without reinventing application-level authentication.

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
- **Communication**: Tailscale (WireGuard, external access only) + local Ethernet LAN (Rasp↔Desktop, WoL broadcast) + SSH + HTTP (for callbacks).
- **Control Surface**: Matrix (conduwuit homeserver + bot).
- **Hardware**: Raspberry Pi (Always-on) $\rightarrow$ Desktop (On-demand).

## Cross-references
- [roadmap_orchestrator](roadmap_orchestrator)
- [architettura](architettura)
