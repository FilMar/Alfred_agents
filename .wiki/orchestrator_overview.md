---
tags: [architecture, raspberry, orchestrator]
sources: [conversation]
updated: 2026-07-16
---

# Raspberry Orchestrator: System Overview

The Raspberry Orchestrator is an intelligent bridge designed to decouple high-level reasoning and heavy compute (Desktop PC) from a persistent, low-power control plane (Raspberry Pi).

## Core Concept: The Intelligent Bridge
Instead of a simple remote-control tool, the Orchestrator acts as a **Deterministic Guardrail**. It manages the lifecycle of automation tasks, ensuring they are secure, scheduled correctly, and executed on the most efficient node without blocking the system.

## API Surface
The Rasp exposes a minimal REST service — this is the entire network entry point, there is no other ingestion path (no direct filesystem drop, no scp-based submission):
- **`add_task`** — submits a script for audit. On `PASS` (or `WARNING` confirmed by the user) it is registered in the `available_tasks` catalog. On `FAIL` (or `WARNING` rejected) it is discarded and never enters the catalog.
- **`i_wake`** — called by the Desktop's `systemd` service on boot. Triggers the batch dispatch of every task due within the wake window (see Pillar 3).
- **`list_tasks`** — read-only, returns the `available_tasks` catalog.
- **`get_task_status <id>`** — read-only, locates a run instance across `pending/processing/completed/failed` and returns it. The directory the file is in *is* the status.

**Ad-hoc execution is Matrix-only, not REST.** There is no `run_task` HTTP endpoint. Starting a task outside its schedule is a Matrix bot command, callable only against catalog entries — there is no path to execute a script that hasn't cleared the audit. Programmatic ad-hoc triggers (e.g. from a script) send a Matrix message instead of an HTTP call — same single channel, no parallel path.

The internal scheduler loop (Pillar 2) is not an endpoint: it periodically scans `available_tasks` and creates run instances in `pending` when a schedule is due.

## The 5 Pillars of the Architecture

### 1. Adversarial Audit (The Guardrail)
To eliminate the ambiguity of LLM "safety" checks, the system employs an **Adversarial Approach**:
- **Mechanism**: Before a script is queued, the Cloud AI agent `pi` is tasked not to find "safety," but to act as a Red Teamer.
- **Timing**: Runs at ingestion time — when the script is loaded into the system — not at Desktop wake time. This decouples the audit from cloud availability at wake/dispatch time; the Rasp only ever reads scripts already carrying a verdict.
- **Current implementation — static analysis**: The agent reads the script's code and reasons adversarially about it (no execution). It must actively attempt to find, by inspection, ways it could break the system, escalate privileges, or delete data.
- **No-execution-before-verdict is systemic, not just for the audit call**: every stage that touches an unaudited script — including reading its own operational metadata (see Pillar 4) — must use static parsing, never `import()` or any form of module evaluation. A dynamic import runs top-level module code as a side effect of merely "reading" it, which would let unaudited code execute before the `PASS/FAIL/WARNING` verdict exists.
- **Planned evolution — sandboxed dynamic execution** (not yet implemented): run the script for real inside an ephemeral, single-use Docker container to turn hypothesis into evidence — no egress network (blocked outbound calls double as an exfiltration signal), and a decoy filesystem mimicking production paths so a destructive action hits fake data instead of real. Ship the static-analysis version first; add the sandbox later.
- **Goal**: The AI must actively attempt to find ways to break the system, escalate privileges, or delete data using the provided code.
- **Human-readable summary**: The same call also produces a short summary (2-3 line description + numbered steps) of what the task does, derived from the same static reading — no second LLM round-trip. Sent to Matrix for every task loaded, regardless of verdict. Informational only: it does not gate execution — only `WARNING` still requires human approval to proceed.
- **Verdict**: 
    - `PASS`: No viable attack vector found $\rightarrow$ registered in `available_tasks`.
    - `FAIL`: Vulnerability identified $\rightarrow$ task discarded, never registered.
    - `WARNING`: Suspicious but potentially valid $\rightarrow$ triggers a **Matrix Bot** notification for human approval; registered in `available_tasks` only if confirmed, discarded otherwise.

### 2. Two-Layer Filesystem State (The Memory)
No database — filesystem as the source of truth for both the task catalog and its running instances, at this scale (single-user, a few dozen tasks) a query layer would add complexity without buying anything. Chosen so state can be inspected with `cat`/`ls`, no separate reconciliation step to keep a DB record in sync with reality.
- **Catalog — `available_tasks`**: one JSON file per registered script (e.g. `/scripts/registered/<name>.json`), holding the audit verdict, `schedule`, `requiresDesktop`. The file's presence *is* the registration — no separate index to fall out of sync.
- **Run instances — the queue**: physical `.json` files moved between directories: `pending/` $\rightarrow$ `processing/` $\rightarrow$ `completed/` (or `failed/`). The directory a file sits in *is* its state, not a field inside it — a crash mid-run can't leave a record saying "running" for a process that's actually dead, because the state isn't an assertion, it's a physical location.
- **Atomicity**: Transitions use `fs.renameSync`, ensuring that a task is never in two states at once.
- **Recovery**: Upon startup, the orchestrator scans the directories to resume any interrupted tasks.

### 3. Boot-Callback Pattern (The Connectivity)
To eliminate the "Happy Path" fragility of synchronous polling (Ping loops), the system uses an asynchronous handshake bounded by a wake window, not an indefinite wait:
- **The Wake Window**: The Rasp computes the earliest scheduled task needing the Desktop and sends a single Wake-on-LAN (WoL) packet ahead of it (e.g. 30 min lead time), then returns to its main loop.
- **The Call-Home**: The Desktop PC, via a `systemd` service at boot, calls the Rasp's `i_wake` REST endpoint: *"I am awake and ready"*.
- **The Dispatch**: Upon receiving the `i_wake` call, the Rasp dispatches every task scheduled within the following wake window (~30 min), not just the one that triggered the wake — batching avoids repeated wake cycles for nearby tasks.
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
- **Metadata**: Scripts define their operational constraints as exported constants at the top of the file (`export const requiresDesktop = true`, `export const schedule = "..."`) — not JSDoc tags. These are read via **static parsing** (regex or the TS compiler API/AST), never via dynamic `import()` — see the no-execution-before-verdict principle in Pillar 1. Same reasoning as the audit itself: read the code, don't run it.

### 5. Access Control (The Perimeter)
No custom user/role system in the app — access is governed by who can reach the REST API, not by filesystem permissions:
- **Network layer**: Tailscale ACLs, tagged per device (Desktop, laptop, phone), restrict which tags can reach the Rasp's HTTP port at all.
- **Endpoint layer**: within that perimeter, all devices can call the same REST surface (`add_task`, `list_tasks`, `get_task_status`); `i_wake` is meant to be called by the Desktop only, but is not separately locked down beyond the Tailscale ACL — there is no per-device write-permission model on the filesystem, because there is no filesystem write path exposed to devices in the first place.
- **Why `run_task` is not on the REST surface**: the Tailscale ACL perimeter is network-only — it does not distinguish roles between authorized devices (Desktop, laptop, phone all see the same REST surface). If ad-hoc execution were an HTTP endpoint, a single compromised device on the tailnet could trigger any registered task at any time. Keeping `run_task` Matrix-only routes ad-hoc execution through a second, independent channel (the homeserver's own authentication), instead of relying on tailnet membership alone.
- **Threat model rationale**: hostile input risk is already low because the orchestrator's endpoint is never exposed publicly — it only exists on the Tailscale overlay, so an attacker would first have to breach the Tailscale network itself. A single network-layer ACL is sufficient defense-in-depth for a single-user, four-node closed tailnet, without reinventing application-level authentication.
- **Why the control-surface bot must be Matrix, not Telegram**: the constraint isn't "Matrix specifically" — it's that the bot has to live inside the same Tailscale-only perimeter as everything else. The Matrix homeserver (conduwuit, Rust) is self-hosted on the Rasp itself and reachable only over Tailscale — same perimeter, different protocol on top, not a parallel channel. A Telegram bot would violate this: Telegram Bot API is hosted on Telegram's own servers, reachable from any network by anyone holding the bot token — it never transits the Tailscale overlay. That would open a second, parallel ingress path bypassing the ACL perimeter entirely, undermining the whole rationale above. Secondary benefit: Tailscale logs every connection crossing the tailnet, so a self-hosted Matrix homeserver stays inside that visibility; a Telegram bot's traffic would never appear in it, since it never crosses the tailnet at all.

## Task Lifecycle Flow

**Registration (once per script)**
1. **Submit**: A script is submitted via `add_task`.
2. **Audit**: Code is sent to Cloud AI $\rightarrow$ `Adversarial Analysis` $\rightarrow$ `Verdict`.
3. **Register**: If `PASS` (or `WARNING` confirmed via Matrix), the script is written into the `available_tasks` catalog. If `FAIL` (or `WARNING` rejected), it is discarded — it never becomes callable.

**Execution (every run instance)**
4. **Trigger**: Either the internal scheduler matches a catalog entry's `schedule` against the current time, or a `run_task` Matrix command is issued ad-hoc against an already-registered task — there is no REST path for this.
5. **Activation**:
    - If `requiresDesktop: true` (read from the catalog entry) $\rightarrow$ send WoL $\rightarrow$ wait for the Desktop's `i_wake` callback.
    - If `false` $\rightarrow$ proceed to execution directly.
6. **Deployment**: `scp` the `.ts` file to the target node (only needed for the Desktop path — the script doesn't exist there yet).
7. **Run**: Execute via `bun run` (wrapped in the bwrap sandbox, Pillar 4) $\rightarrow$ capture stdout/stderr.
8. **Consolidation**: Move the run instance to `/completed` (or `/failed`) and notify the user via Matrix. `get_task_status` can be polled at any point during 4-8.

## Interactive pi Chat (Matrix Relay)

Beyond deterministic commands, the Matrix bot supports an interactive session with the `pi` agent on the Desktop — the last function an openclaw-style agent would have provided, now covered by pieces already in the design:

- **Flow**: `/wake` on Matrix → Rasp sends WoL → Desktop boots → `i_wake` callback → the user chats with `pi` through the Matrix room. The only *new* component is the **relay**: the bot on the Rasp forwards room messages to a `pi` session on the Desktop over SSH and relays replies back. Everything else (`/wake` manual trigger, `i_wake`, the bot) is already planned.
- **Matrix-only by construction**: chatting with an agent is arbitrary code execution by definition — so it lives only on Matrix, never on REST, exactly like `run_task` and for the same Pillar 5 reason (second auth channel via the homeserver, not tailnet membership alone).
- **Room↔session mapping**: one Matrix conversation = one persistent `pi` session with context continuity — not a bare one-shot prompt per message.
- **Idle-shutdown handling**: the Desktop's systemd idle-timer (~30 min) makes a mid-conversation shutdown acceptable as-is. Explicit override: the `/await <duration>` Matrix command (e.g. `/await 1h`) keeps the Desktop awake for the declared duration. Chosen over an automatic heartbeat because it is explicit and deterministic — same design style as keeping `/wake` manual separate from the scheduler's automatic WoL. Implementation: a timestamp file the idle-timer consults, or `systemd-inhibit` with a timeout.

## Technical Stack Summary
- **Runtime**: Bun (Raspberry Pi & Desktop).
- **Language**: TypeScript.
- **Communication**: Tailscale (WireGuard, external access only) + local Ethernet LAN (Rasp↔Desktop, WoL broadcast) + SSH (deployment only) + HTTP (REST API, `i_wake` callback).
- **Control Surface**: the REST API is the source of truth for registration and read access; Matrix (conduwuit homeserver + bot) is a bidirectional client on top of the same catalog/queue, not a parallel system — notifications (`WARNING`, completion), read commands (`list_tasks`), and wake-the-desktop all mirror REST capabilities. `run_task` is the exception: it is exclusive to Matrix, with no REST equivalent — ad-hoc execution is never reachable over the network layer alone. "Wake the desktop" via Matrix is an explicit user trigger, kept separate from the scheduler's automatic WoL logic.
- **Hardware**: Raspberry Pi (Always-on) $\rightarrow$ Desktop (On-demand).

## Cross-references
- [roadmap_orchestrator](roadmap_orchestrator)
- [architettura](architettura)
- [tb_on_rasp](tb_on_rasp) — Third Brain hosted on the Rasp inside the same perimeter; mass re-embedding as a `requiresDesktop` task
- [rasp_node](rasp_node) — full view of services on the Rasp and provisioning order
