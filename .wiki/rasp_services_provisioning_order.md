---
tags: [rasp, infrastructure, provisioning]
sources: [conversation, tools/orchestrator/deploy/orchestrator.service]
---

## Decision

The Raspberry Pi is the always-on control plane: persistent, low-power, never exposed publicly. Heavy compute lives on the Desktop, woken on demand. Services on the node, each described by its own decision:

| Service | Purpose | Decision |
|---------|---------|----------|
| Orchestrator (Bun/TS) | REST API, scheduler, FS-queue, WoL | [orchestrator_minimal_rest_surface](orchestrator_minimal_rest_surface) |
| conduwuit (Rust) | Self-hosted Matrix homeserver | [orchestrator_tailscale_perimeter_matrix_bot](orchestrator_tailscale_perimeter_matrix_bot) |
| Qdrant | TB + `pi_identity` storage (live 2026-09-11) | [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) |
| Ollama | Query embeddings (`nomic-embed-text`, ARM64) | [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) |
| Tailscale | The only network entry point | [orchestrator_tailscale_perimeter_matrix_bot](orchestrator_tailscale_perimeter_matrix_bot) |

**Provisioning order (target)**: 1. Tailscale + ACL tags (perimeter first — nothing else comes up before it); 2. conduwuit; 3. Qdrant + Ollama (done); 4. Orchestrator service; 5. Matrix bot.

The orchestrator runs as a **native systemd unit** (`tools/orchestrator/deploy/orchestrator.service`, `Restart=always`), not a container — unlike conduwuit/Qdrant/Ollama. Placeholders in the unit (`User`, `WorkingDirectory`, bun path, env) must be filled for the real deploy.

Network position: tailnet for external access (laptop, phone); local Ethernet LAN for Rasp↔Desktop (WoL broadcast, SSH + scp for deployment) — the two paths never cross.

## Why

Perimeter-first provisioning means nothing ever runs reachable-by-default. The orchestrator stays out of a container deliberately: its filesystem-as-truth state and its `bwrap` sandboxing both want the host disk and kernel directly — nested sandboxing inside a container adds privilege friction for no benefit on a single always-on machine.

## Cross-references

- [orchestrator_filesystem_state_no_db](orchestrator_filesystem_state_no_db) — why the orchestrator wants the host disk
- [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) — the containers already live here
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — the layers this node hosts