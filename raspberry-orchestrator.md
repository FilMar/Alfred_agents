# Raspberry Orchestrator

Lightweight automation server running on Raspberry Pi. Always-on node for remote
work: manages local script execution, Wake-on-LAN for the desktop machine, and
exposes control through a self-hosted Matrix room over a private VPN.

> **Scope — v0.** This document describes the *infrastructure* only: the always-on
> node, remote access, WoL, and a control surface. There is no persistent agent yet.
> The agent is deferred on purpose — see **Later — when the agent has a job**. Build
> the infra whose value is independent of any agent; add agent pieces only once a
> concrete, repeated task names the need.

## Context

| Machine | Role | Always on |
|---|---|---|
| Raspberry Pi | Orchestrator, Matrix homeserver + bot, script runner | Yes |
| Desktop (NVIDIA 5060 Ti) | Heavy compute, GPU, cloud tasks | No — WoL on demand |
| Cloud | Additional capacity | On demand |

The Raspberry is the single always-available node. Everything else wakes up when needed.

## Architecture

A single Matrix room is the shared surface. The homeserver (always-on) routes and
queues messages; the user and one bot meet in the same room.

```
[User / Phone · Element]-----+
                             +--> [Matrix homeserver (conduwuit) · Rasp, always-on]
[Orchestrator bot · Rasp]----+         |  store-and-forward: queues while desktop sleeps
                                       v
                               [Script runner] --> [Scripts / WoL]
```

Two participants, one room:
- **User** — Element client on the phone. Issues system commands, reads notifications.
- **Orchestrator bot** — always-on on the Rasp (`matrix-bot-sdk`). Watches the room,
  handles system commands, triggers WoL when asked, runs registered scripts, and
  sends autonomous notifications (desktop woken, script completed, errors).

Because Matrix is store-and-forward, commands sent while the desktop sleeps are queued
by the homeserver; the orchestrator wakes the desktop, runs what was asked, and reports
back on the next sync.

## Components

### 1. Script runner (Bun + TypeScript)

Single process, no database — scripts stored as files. Not a public HTTP surface:
it runs inside the orchestrator-bot process and is driven by room commands.

Actions:
```
run <script>     Execute a registered script (triggers WoL if tagged requires-desktop)
logs <script>    Output of the last execution
list             List registered scripts
status           Desktop reachable, running scripts, uptime
```

### 2. Wake-on-LAN

Triggered by the `!wake` command, or automatically when a script tagged
`requires-desktop` is run.

Flow:
1. Send magic packet (`etherwake` or raw UDP broadcast)
2. Poll desktop reachability (ping loop, ~30s timeout)
3. Notify the Matrix room when the desktop is up (or on failure)

### 3. Matrix (conduwuit homeserver + matrix-bot-sdk)

The control surface. Self-hosted, so no third party ever sees message content — this
is the whole reason Matrix is chosen over a cloud bot (e.g. Telegram): a private VPN
plus a cloud bot would leak the surface the VPN exists to protect.

**Homeserver** — `conduwuit` (Rust, single binary) runs on the Rasp, always-on.
Not federated: one private room, one bot, one user. This is infrastructure, not
application code — run the binary and point clients at it. Its data directory lives
on a **USB SSD, not the microSD** — RocksDB compaction would wear the card out; the
DB itself stays small since there is no federation.

**Bot** — one `matrix-bot-sdk` (TypeScript) process, the orchestrator. Shape is a
plain `on(room.message)` + a command switch:

```
!status          System overview (desktop on/off, running scripts, uptime)
!wake            Wake the desktop
!run <script>    Execute a registered script
!scripts         List available scripts
!logs <script>   Last execution output
```

Identity: the bot logs in once as its own Matrix user; access token and room ID are
pinned in config.

## Security model

- **Transport** — the homeserver binds to the **Tailscale interface only**: no public
  exposure, no open inbound port, no webhook. The phone runs Tailscale alongside Element
  and reaches conduwuit over WireGuard from anywhere. No relay in the middle.
- **HTTPS on top** — components are served over HTTPS with a valid cert on `*.ts.net`
  (Tailscale MagicDNS + Let's Encrypt). Against an *external* attacker this is redundant —
  WireGuard already covers the wire. Its real value is defense-in-depth on the one
  load-bearing assumption, "the tailnet is trusted": if that seam ever cracks (a
  compromised subnet-router or exit-node relaying traffic in-mesh), TLS keeps the content
  unreadable where WireGuard no longer would. It protects the *link*, not the *endpoints* —
  a compromised endpoint terminates TLS anyway, but nothing defends the endpoints, not even
  E2E. Bonus: a valid cert also gives Element a proper secure context, no self-signed warnings.
- **No Matrix E2E** — deliberate. WireGuard already encrypts transport, so room-level
  E2E would be redundant. This also sidesteps `matrix-bot-sdk`'s native crypto bindings
  (unverified on Bun) entirely — the bot runs without them.
- **At rest** — message content sits in cleartext in conduwuit's RocksDB on the SSD.
  Accepted: the only threat is physical theft of the disk, and for a home node that is
  not defended against (E2E would not help much either — keys live on-device).
- **Trust boundary** — the tailnet is a **fixed, closed set of 4 nodes** (desktop, laptop,
  rasp, phone). Single-user, fully trusted by design; membership is static, so the
  "untrusted device joins" scenario is not mitigated — it is eliminated. The whole security
  posture rests on this closed set.
- **External exposure is separate** — anything that ever needs to face the public internet
  goes through a **dedicated domain via Cloudflare (tunnel)**, never by opening the tailnet.
  A Cloudflare tunnel is outbound-only, so it preserves the same zero-inbound-ports property;
  the private mesh and the public surface stay disjoint, each with its own threat model.

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Bun | Single binary, fast startup, native HTTP, runs on ARM |
| Language | TypeScript | Ecosystem, iteration speed, readable |
| Chat / homeserver | conduwuit (Matrix) | Self-hosted, Rust single binary, no third-party relay, store-and-forward |
| Chat bot | matrix-bot-sdk | TS-native, same shape as a Telegram bot; no E2E, so no native bindings |
| Transport | Tailscale (WireGuard) | Private mesh, zero open ports, reachable from anywhere |
| Storage | Filesystem | Scripts are files; logs are files; no DB needed |

## Project Structure

```
rasp-orchestrator/
├── src/
│   ├── main.ts          Entry point — starts the Matrix orchestrator bot
│   ├── matrix/
│   │   ├── orchestrator-bot.ts  Command switch, WoL, notifications
│   │   └── client.ts            matrix-bot-sdk setup (login, sync)
│   ├── wol.ts           Wake-on-LAN logic
│   └── runner.ts        Script execution and log capture
├── scripts/             Registered scripts (stored as files)
├── logs/                Execution logs
└── config.ts            MAC address, Matrix room ID + access token, ports
```

## Later — when the agent has a job

Deferred on purpose. None of this gets built until a concrete, repeated task makes the
need explicit. Building it now would be infrastructure for a use case that does not yet
exist.

- **Persistent agent (pi)** — the desktop-side reasoning agent. The pi ecosystem already
  packages most of it as composable extensions (goal/autonomy loop, observational memory,
  self-evolution, multi-agent orchestration, chat gateway). Add **one** package for **one**
  named task, check it does not fight the others, and only fork to custom if it does. The
  packages are a probe to discover requirements, not the foundation.
- **MCP interface** — expose the script runner as MCP tools so an agent can call scripts
  directly. Only useful once there is an agent.
- **Multimodal I/O** — STT / vision on the desktop GPU. Incoming audio/images arrive as
  Matrix events carrying an `mxc://` URI (`downloadContent` → blob → model); replies go
  back via `uploadContent` + `m.audio` / `m.image`. This is the one capability no pi
  package covers, and the main reason a separate desktop component might still earn its place.
- **Web UI** — minimal read-only status dashboard (static HTML + SSE from the Bun process).
  Nice to have; control stays in Matrix regardless.

## Open Questions

- Should scripts be arbitrary shell or sandboxed (only predefined actions)?
- Is the script list static, or registered at runtime?
