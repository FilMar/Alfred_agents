# The Rasp Node

```yaml
tags: [raspberry, infrastructure, provisioning]
sources: [conversation]
updated: 2026-08-18
```

## Role

The Raspberry Pi is the always-on control plane of the whole system: persistent, low-power, never exposed publicly. Heavy compute lives on the Desktop, woken on demand ([orchestrator_overview](orchestrator_overview), Pillar 3). This page is the single view of everything that runs on the Rasp — each service is described in depth on its own page.

## Services

| Service | Purpose | Detailed in |
|---------|---------|-------------|
| Orchestrator (Bun/TS) | REST API (`add_task`, `i_wake`, `list_tasks`, `get_task_status`), scheduler loop, FS-queue, WoL | [orchestrator_overview](orchestrator_overview) |
| conduwuit (Rust) | Self-hosted Matrix homeserver: notifications, `run_task`, manual wake, `!tb search`, interactive `pi` chat relay (`/wake` + `/await`) | [orchestrator_overview](orchestrator_overview) Pillar 5 and Interactive pi Chat, [tb_on_rasp](tb_on_rasp) |
| Qdrant | Third Brain storage: vectors + full note payloads | [tb_on_rasp](tb_on_rasp) |
| Ollama | Query embeddings for `tb` (`nomic-embed-text`, ARM64) | [tb_on_rasp](tb_on_rasp) |
| Tailscale | The only network entry point — ACLs per device tag govern all access | [orchestrator_overview](orchestrator_overview) Pillar 5 |

## Network position

- **Tailscale overlay**: external access only (laptop, phone) — every service above is reachable exclusively inside the tailnet, nothing is exposed publicly.
- **Local Ethernet LAN**: Rasp↔Desktop (~10cm apart) — WoL magic packet as L2 broadcast, SSH + scp for task deployment. Never crosses the overlay.

## Provisioning (target)

Not yet built — the target stack, in dependency order:

1. Tailscale + ACL tags (perimeter first — nothing else should come up before it)
2. conduwuit container (Matrix homeserver)
3. Qdrant + Ollama containers (TB migration, [tb_on_rasp](tb_on_rasp))
4. Orchestrator service (Bun/TS, [roadmap_orchestrator](roadmap_orchestrator) Phase 1) — kept alive via a native systemd unit (`tools/orchestrator/deploy/orchestrator.service`, `Restart=always`), **not** a container, unlike conduwuit/Qdrant/Ollama above: the orchestrator's own filesystem-as-truth state and its use of `bwrap` for task sandboxing ([orchestrator_overview](orchestrator_overview) Pillar 2 and Pillar 4) both want the host disk directly — nested sandboxing inside a container adds privilege friction for no benefit on a single always-on machine. Placeholders in the unit file (`User`, `WorkingDirectory`, `bun` path, `Environment=`) must be filled in for the actual Rasp deploy.
5. Matrix bot (shared plumbing for orchestrator commands and `!tb search` — see [roadmap](roadmap) Phase 8)

## Cross-references

- [orchestrator_overview](orchestrator_overview) — the orchestrator running here
- [tb_on_rasp](tb_on_rasp) — Third Brain services running here
- [roadmap](roadmap) — Phase 8 (Personal Server) provisioning order
- [architettura](architettura) — the software layers this node hosts
