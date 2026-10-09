---
tags: [pi, roadmap, tasks]
sources: []
updated: 2026-10-09
---

## Tasks

One line per task. The reason and the plan live in the linked decision.

### memory

- [ ] Learn from outcomes: procedural memory for members and skills. [detail](memory_procedural_six_gaps)
- [ ] Per-hat metrics, aggregated over time. [detail](memory_procedural_six_gaps)
- [ ] Add a native relevance cutoff (`--min-score`) to `tb`/`ti` search. [detail](memory_ti_context_action_rules)
- [ ] Career coach: consult memory before each answer. No decision yet.
- [ ] Episode index over tl (`tl_episodes`, `tl search`), after the extraction pipeline is stable. [detail](memory_episode_summaries_are_a_derived_index_over_tl)
- [x] Extractor as data in tl: `extractor` (immutable JSON config) and `extractions` (every candidate), with the real distiller. [detail](memory_extractor_is_data_immutable_config_rows_in_tl)
- [ ] Build the extractor in shadow as `tools/td` over `pi-ai`: phases 0 to 2b, writes only to `extractions`. Settle in-session repeats and the 0.95 cut. [detail](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first)
- [ ] td open point: which sessions `td distill` takes. One by hand, or every session with pending exchanges? In shadow the queue never empties.
- [ ] td open point: components 5 to 10 as small classes or as plain functions, with pure parts split from the call parts. [detail](memory_distiller_td_is_fourteen_components_behind_one_entry_point)
- [ ] td open point: search in `tb` and `ti`. Add an HTTP search to both, or call their CLI from `td`.
- [ ] td: config (1), registry (2), session reader (3), model caller (4), episodes (5), phase 1 checks (7) and recorder (12) are done. Next: 6 (extraction).
- [ ] td open point: episodes are not saved, and a split is not deterministic. A run that restarts mid-session gets a new map. Decide with Save (11) or the Distiller (13). [detail](memory_td_episodes_split_a_session_in_one_call_checked_for_full_cover_and_listed_as_json_strings)
- [ ] td: change the extraction prompt so the model may propose new tags beside known ones. [detail](memory_td_candidates_keep_known_tags_and_propose_new_ones)
- [ ] td: after the first shadow runs, read the proposed tags in `extractions` and pick a guard for semantic tag synonyms. [detail](memory_td_candidates_keep_known_tags_and_propose_new_ones)
- [ ] ritchie `check_body_diff.py` reads a `return` inside a callback (a `sort` comparator) as one that skips a postcondition. Ignore returns in nested functions.
- [ ] Put `tests/` in a `tsc` project, so a type error in a test is caught.
- [ ] Drop the `client.ts?extractions` import trick in `tests/tl_extractions.test.ts`: the client now reads its url on each call. [detail](memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store)
- [ ] `errorMessage` has three copies, in `tb`, `ti` and `th`. Pick one home for it. [detail](style_contract_helpers_live_in_one_shared_module)
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