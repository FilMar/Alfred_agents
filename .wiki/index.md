# Wiki — pi

## Pages

| Page | Content |
|------|---------|
| [architettura](architettura) | The layers: tb, th, the `.wiki/` (Omero) — roles, boundaries, cooperation |
| [agenti](agenti) | Available agents, roles, triggers |
| [th_cli](th_cli) | CLI reference for `th` — commands, flags, examples |
| [orchestrator_overview](orchestrator_overview) | General system design and the five core pillars |
| [roadmap](roadmap) | Future task list — grouped by area, one line per task, detail in linked pages |
| [roadmap_orchestrator](roadmap_orchestrator) | Implementation plan for the Raspberry Orchestrator service — paused 2026-07-21 |
| [ti_module](ti_module) | Third Identity: dedicated Qdrant collection for context→behavior rules |
| [tl_module](tl_module) | Third Log: unified REST event log replacing `th.db`, shared by `th`/`tb`/`ti` |
| [procedural_memory_gaps](procedural_memory_gaps) | What's missing for `th` members and skills to learn from outcomes |
| [tb_on_rasp](tb_on_rasp) | Third Brain hosted on the Rasp, Matrix bot for agent-free queries |
| [rasp_node](rasp_node) | The Rasp as a node: all services it hosts and provisioning order |
| [skill_pattern](skill_pattern) | Conventions for skills: `SKILL.md` calls the CLI directly + `scripts/` + `references/` (justfile layer retired 2026-08-18) |
| [skill_migration](skill_migration) | Ordered tasklist of the skills still to migrate off their justfiles |
| [stateless_cockpit](stateless_cockpit) | Founded 2026-08-08, pivoted 2026-08-10 to a pi extension in RPC mode (web UI dropped): episodic stateless execution, `/mem` banks — replaces Matrix chat and pi-web |
| [style_dual_entrypoint](style_dual_entrypoint) | CLI+HTTP API pattern (Hono) shared by `tb serve`/`ti serve` |
| [style_tb_ti_layering](style_tb_ti_layering) | Layered architecture and coding standards shared by `tb`/`ti` |
| [log](log) | Wiki update history |

```yaml
tags: [pi, index, architecture]
sources: [README.md, alfred.md]
updated: 2026-08-26
```
