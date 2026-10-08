---
tags: [pi, roadmap, tasks]
sources: []
updated: 2026-10-07
---

## Tasks

One line per task. The reason and the plan live in the linked decision.

### memory

- [ ] Learn from outcomes: procedural memory for members and skills. [detail](memory_procedural_six_gaps)
- [ ] Per-hat metrics, aggregated over time. [detail](memory_procedural_six_gaps)
- [ ] Add a native relevance cutoff (`--min-score`) to `tb`/`ti` search. [detail](memory_ti_context_action_rules)
- [ ] Career coach: consult memory before each answer. No decision yet.
- [ ] Episode index over tl (`tl_episodes`, `tl search`), after the extraction pipeline is stable. [detail](memory_episode_summaries_are_a_derived_index_over_tl)
- [ ] Extractor as data in tl: `extractor` (immutable JSON config) and `extractions` (every candidate), with the real distiller. [detail](memory_extractor_is_data_immutable_config_rows_in_tl)
- [ ] Build the extractor in shadow as `tools/td` over `pi-ai`: phases 0 to 2b, writes only to `extractions`. Settle in-session repeats and the 0.95 cut. [detail](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first)
- [ ] td open point: which sessions `td distill` takes. One by hand, or every session with pending exchanges? In shadow the queue never empties.
- [ ] td open point: components 5 to 10 as small classes or as plain functions, with pure parts split from the call parts. [detail](memory_distiller_td_is_fourteen_components_behind_one_entry_point)
- [ ] td open point: search in `tb` and `ti`. Add an HTTP search to both, or call their CLI from `td`.
- [ ] td: config classes are done in `tools/td/src/config.ts`. Next are the registry (component 2) and the LLM client (component 4).
- [ ] td config gaps: `compat` and the question list are shared with the caller; `contextWindow` and `maxTokens` in `toPiModel` are fixed numbers; `compat as any`; no test for `reasoning: true` or a non-empty `compat`.
- [ ] Put `tests/` in a `tsc` project, so a type error in a test is caught. Today `tests/td_config.test.ts` imports `Think` and `Drops` as values.
- [ ] Update `phase-runs.md` of the ritchie skill to the two-run flow. [detail](skill_ritchie_step_five_runs_tests_blind_then_bodies_with_the_tests_and_a_runner)
- [ ] Decay of `provvisoria` notes: with critic F about 16 of 75 bad candidates pass. No decision yet. [detail](memory_critic_is_f_textbook_as_a_test_and_no_record_question)

### th

- [ ] Add the HTTP entry point to run agents. [detail](th_http_api_scoped_no_db)
- [x] Constrain annibale to simple processes: every check runs as a script or a controller-side step, never inside `th` itself. [detail](th_verification_outside_members)

### rasp

Paused since 2026-07-21. The memory stack came first.

- [ ] Personal server: provision the always-on node. [detail](rasp_services_provisioning_order)
- [x] Move the Third Brain and Third Identity to the Rasp — both live and confirmed working. [detail](memory_tb_ti_on_rasp)
- ~~Finish the orchestrator~~ — removed 2026-09-28. [why](orchestrator_and_cockpit_removed)

### cockpit

Paused 2026-08-09. Pivoted to a pi extension 2026-08-10, not started.

- ~~Resume the cockpit as a pi extension~~ — removed 2026-09-28. [why](orchestrator_and_cockpit_removed)

### graph

Design only, no code yet.

- [ ] Build third_os: read the graph, open a note at the centre. [detail](graph_third_os_webapp_wider_than_workbench)
- [ ] Edit and create notes from the browser. [detail](graph_third_os_webapp_wider_than_workbench)
- [ ] Add the agent: debates, notes from links, link bubbles. [detail](graph_third_os_agent_turns_stay_async)
- [ ] Retire tb graph once third_os covers reading. [detail](graph_third_os_canvas_physics_dom_text)
- [ ] Bring ti back as a separate view. [detail](graph_third_os_webapp_wider_than_workbench)
- [ ] Run curation through a th member with live streaming. [detail](graph_curation_via_th_agent)

### skills

- [ ] Router pass: shrink each multi-direction skill to a dispatch table. [detail](skill_router_pass_planned)
- [ ] Ritchie: contract messages carry the values, in all four languages, and `contract_report.py` checks the format. [detail](skill_ritchie_contract_messages_carry_values)

## Cross-references

- [index](index)
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — system overview