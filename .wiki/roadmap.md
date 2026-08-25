# Roadmap

```yaml
tags: [roadmap, tasks]
sources: []
updated: 2026-08-18
```

## Tasks

- [ ] **Phase 6 — Career Coach** — consult TB before each response, calibrated on real history.
- [ ] **Phase 7 — Per-hat metrics** — `th stats [--member]`, aggregate member performance over time.
- [ ] **Phase 8 — Personal Server** — `pi-core` container (Qdrant + SQLite), Matrix bot, nightly Mega backup. Detail: [rasp_node](rasp_node)
- [ ] **Orchestrator Phase 2** — WoL, `i_wake`, provisioning pipeline. Detail: [roadmap_orchestrator](roadmap_orchestrator)
- [ ] **TB-on-Rasp migration** — needs the Rasp provisioned (Qdrant + Ollama). Detail: [tb_on_rasp](tb_on_rasp)
- [ ] **Events table / procedural memory** — independent, value accrues slowly. Detail: [procedural_memory_gaps](procedural_memory_gaps)
- [ ] **Stateless Cockpit resume** — paused 2026-08-09, branch `feature/cockpit-skeleton`. Detail: [stateless_cockpit](stateless_cockpit)
- [ ] **`th` HTTP API entrypoint** — `POST /run` detached + `GET /runs`. Detail: [th_cli](th_cli)

## Cross-references

- [architettura](architettura) — system overview
- [agenti](agenti) — completed operative skills
- [procedural_memory_gaps](procedural_memory_gaps) — what Phase 7 still leaves uncovered
- [tb_on_rasp](tb_on_rasp) — TB hosted on the Rasp, Matrix bot for agent-free reads
