---
tags: [architecture, raspberry, orchestrator]
sources: [conversation, tools/th/src/cli.ts, tools/th/src/runner.ts, tools/orchestrator/src]
updated: 2026-07-20
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
- **Claim-race error handling (fixed 2026-07-20)**: claiming an instance (`transition("pending", "processing", ...)`) can legitimately fail when another tick already claimed it first — the source file is simply gone. This expected race is now a distinct `InstanceNotFoundError` (`queue.ts`). Any *other* failure (permissions, missing directory, disk I/O) is a real fault and is logged via `console.error` in `executor.ts` instead of being swallowed — previously a bare empty `catch {}` treated every error as the benign race, so a genuine failure left an instance stuck in `pending` forever with no trace in any log. Applies to both `executeLocal` and `executeRemote`.
- **Recovery**: Upon startup, the orchestrator scans the directories to resume any interrupted tasks.
- **Parse resilience (settled at implementation, Phase 1)**: filesystem-as-truth guarantees a crash mid-write will eventually leave a truncated JSON file — so every catalog/queue read skips and logs corrupt files instead of throwing. Without this, the design's own expected failure mode would brick the orchestrator on every restart.

### 3. Boot-Callback Pattern (The Connectivity)
To eliminate the "Happy Path" fragility of synchronous polling (Ping loops), the system uses an asynchronous handshake bounded by a wake window, not an indefinite wait. What is rejected is the ping as a *wait mechanism* — a one-shot ping as a *level check* ("is the machine reachable right now?") is part of the design since Phase 2, see Ping Reconciliation below:
- **The Wake Window**: The Rasp computes the earliest scheduled task needing the Desktop and sends a single Wake-on-LAN (WoL) packet ahead of it (e.g. 30 min lead time), then returns to its main loop. **Settled at implementation (Phase 2)**: the window is computed from the *catalog's* upcoming cron runs (`nextRun` within `ORCH_WAKE_LEAD_MIN`), not from the pending queue — run instances only materialize once due, so only the catalog can see ahead. Wake bookkeeping lives in a single `<ORCH_DIR>/wake.json` (`{sentAt, attempts, alerted}`), deleted on `i_wake` or when the window empties; it is the only persistent state Phase 2 added.
- **The Call-Home**: The Desktop PC, via a `systemd` service at boot, calls the Rasp's `i_wake` REST endpoint: *"I am awake and ready"*.
- **The Dispatch**: Upon receiving the `i_wake` call, the Rasp dispatches every task scheduled within the following wake window (~30 min), not just the one that triggered the wake — batching avoids repeated wake cycles for nearby tasks.
- **Ping Reconciliation (settled 2026-07-17)**: every scheduler tick, when desktop work is relevant (pending desktop instances, or an upcoming run within the lead window), the Rasp sends **one** ping to `DESKTOP_HOST` (`ping -c 1 -W 2`, injectable as `ExecutorDeps.pingHost`). If the Desktop answers, pending desktop instances are dispatched directly and `wake.json` is cleared — no WoL, no callback wait. This is a level check, not a loop: it reads the current state once per tick instead of waiting for it to change. It closes two holes of the pure event-driven design: (a) a task becoming due while the Desktop is already awake was never dispatched, because dispatch was coupled exclusively to the `i_wake` boot event — WoL went out to an awake machine whose boot callback would never fire again; (b) a Desktop woken ahead of schedule found an empty `pending/` at `i_wake` (instances only materialize once due) and idled back to shutdown — now the tick dispatches the instance the moment it materializes, as long as the machine is still up.
- **Failure bound**: runs only when the ping reports the Desktop down. If it stays unreachable, the Rasp retries the WoL once, then alerts via Matrix. A single threshold check, not a polling/retry loop. **Settled (2026-07-17, supersedes the Phase 2 due-time deadline)**: the deadline is `sentAt + ORCH_BOOT_TIMEOUT_MIN` (default 5 min) — the time granted to the machine to boot after a WoL. The previous semantics (earliest desktop task's due time) was tautological: an instance materializes only once its due time has passed, so the deadline was already expired at the first check and the alert fired ~30 s after the first WoL. The alert still fires exactly once per wake attempt (`alerted` flag); the alert hook is injectable, `console.error` until the Matrix bridge (Phase 3) exists.
- **Shutdown**: Decided locally on the Desktop by a `systemd` idle-timer service (poweroff after N minutes of no activity) — not commanded remotely by the Rasp, since the Desktop is the one that can see its own real idle state.
- **Network topology (confirmed)**: Rasp and Desktop are connected via Ethernet on the same physical LAN, ~10cm apart. The WoL magic packet travels as a local L2 broadcast — it never crosses the Tailscale/WireGuard overlay. Tailscale is used exclusively for *external* access to the orchestrator (from laptop and phone), not for Rasp↔Desktop communication.

### 4. Deterministic TS Execution (The Muscle)
The system avoids the ambiguity of natural language for execution.
- **Language**: Everything is written in **TypeScript/Bun**.
- **Execution**:
    - **Local**: `Bun.spawn` on the Raspberry for light tasks.
    - **Remote**: `ssh` + `bun run` on the Desktop for heavy tasks.
- **Execution sandbox**: Both paths run wrapped in `th`'s existing bwrap sandbox (`spawnSandboxed`, `tools/th/src/runner.ts`), reusing its real bind profile as-is (`cwd`, `~/.pi`, `~/.bun`, `/tmp`) — no decoy paths, no network isolation, since these are already-audited (`PASS`-verdict) tasks that need to write real data. This is a separate sandbox from the audit sandbox in Pillar 1 (Docker, ephemeral, decoy filesystem, no egress, used *before* queueing): Docker for adversarial testing, bwrap for the actual trusted execution after.
    - **CLI entrypoint (built)**: `th sandbox-exec -- <bin> <args...>` (`tools/th/src/cli.ts`) wraps an arbitrary binary in the bwrap sandbox, forwarding stdio and exit code via `sandboxExec` (`tools/th/src/runner.ts`). It **refuses with an explicit error if bwrap is missing** — an audited task must never silently run unsandboxed; the internal `ensureSandboxed`/`spawnSandboxed` fallbacks now warn on stderr too. See [th_cli](th_cli).
    - **Nothing extra ships to the Desktop for this**: the Rasp and the Desktop run the identical `pi`/`th` TypeScript stack, so `th sandbox-exec` is present on both nodes once built — no separate wrapper file needs to be transferred.
    - **Full remote sequence**: (1) `scp` the task script to the Desktop — unchanged from the original design, needed because the script is authored/audited on the Rasp and doesn't exist locally on the Desktop; (2) `ssh` into the Desktop and run `th sandbox-exec bun run <path-to-script>` instead of a bare `bun run <path-to-script>`. The two steps are orthogonal: `scp` moves the file, `sandbox-exec` decides how it's launched once it arrives. Locally on the Rasp, no CLI hop is needed — `spawnSandboxed` is called directly in-process.
- **No per-task log yet**: `executeLocal` currently spawns with `stdio: "inherit"` — a task's stdout/stderr goes wherever the orchestrator process's own stdio goes (the terminal if `main.ts` runs in the foreground, or wherever it's redirected if backgrounded/under a service manager). There is no dedicated per-task log file today; "Result Consolidation" in [roadmap_orchestrator](roadmap_orchestrator) Phase 3 is where that gets captured properly.
- **Metadata**: Scripts define their operational constraints as exported constants at the top of the file (`export const requiresDesktop = true`, `export const schedule = "..."`) — not JSDoc tags. These are read via **static parsing** (regex or the TS compiler API/AST), never via dynamic `import()` — see the no-execution-before-verdict principle in Pillar 1. Same reasoning as the audit itself: read the code, don't run it. **Settled at implementation (Phase 1)**: `schedule` is a cron expression, parsed with the `croner` package and validated at ingestion — an invalid cron string is rejected with a 400 and never reaches the catalog. **Settled (2026-07-16)**: `schedule` is optional (a task without one is on-demand only, invocable via `run_task`), and after registration it is owned by the **catalog entry**, not the script — the exported constant is only the initial value, mutable via the Matrix commands `set_schedule`/`pause` without re-audit (the audit judges code, not timing); see [roadmap_orchestrator](roadmap_orchestrator), Phase 3.

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
    - If `requiresDesktop: true` (read from the catalog entry) $\rightarrow$ one-shot ping: if the Desktop is up, dispatch directly; if down, send WoL $\rightarrow$ wait for the Desktop's `i_wake` callback (or the next tick's ping to find it up).
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
- [stateless_cockpit](stateless_cockpit) — proposed web UI that overlaps with Interactive pi Chat and challenges the Matrix-only rule of Pillar 5
