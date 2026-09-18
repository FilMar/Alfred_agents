---
tags: [orchestrator, security, tailscale, matrix]
sources: [conversation, .wiki/orchestrator_overview.md]
---

## Decision

Access control is one network perimeter, no application-level auth:

- **Tailscale ACLs, tagged per device** (desktop, laptop, phone) decide which tags can reach the Rasp's HTTP port at all. Within the perimeter, all devices see the same REST surface; there is no per-device filesystem permission model, because there is no filesystem write path exposed to devices at all.
- **The control-surface bot must be self-hosted Matrix** (conduwuit on the Rasp), never Telegram. The constraint is not "Matrix" — it is that the bot lives inside the same Tailscale-only perimeter. A Telegram bot's API lives on Telegram's servers, reachable by anyone holding the token, never crossing the tailnet: a second ingress that bypasses the ACL entirely. Secondary benefit: Tailscale logs every crossing connection, so the self-hosted homeserver stays inside that visibility.
- **The tailnet-only risk is explicitly accepted** for a single-user tailnet (decided with the stateless cockpit, 2026-08-08): an account step can be added later. The original per-device SSH-key model is superseded — it described an ingestion path (scp into `/scripts`) that never existed in the real design.
- **WoL stays off the overlay**: Rasp and Desktop share the local Ethernet LAN (~10cm apart); the magic packet is a local L2 broadcast. Tailscale is for external access only.

## Why

The endpoint is never exposed publicly; an attacker must first breach the tailnet. For a single-user, four-node closed tailnet, one network ACL is sufficient defense in depth — an application-level auth model would duplicate the perimeter without adding a real boundary. A Telegram bot would void the whole perimeter rationale: the threat model assumes everything inside the overlay, and Telegram's servers are outside it.

## Cross-references

- [orchestrator_run_task_matrix_only](orchestrator_run_task_matrix_only) — the second-channel argument for ad-hoc execution
- [rasp_services_provisioning_order](rasp_services_provisioning_order) — the perimeter comes up first on the node
- [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) — the same perimeter reasoning for the TB bot