---
tags: [pi, roadmap, tasks]
sources: []
updated: 2026-10-12
---

## Tasks

One line per task. The reason and the plan live in the linked decision.

### tools

- [ ] P0: JSON Schema contract layer for tb/ti/th/tl CLI output, CI-checked. [detail](core_mcp_not_adopted_cli_json_schemas_first)
- [ ] P1: scoped command whitelist and audit logging for shell invocations (prompt injection mitigation). [detail](core_mcp_not_adopted_cli_json_schemas_first)
- [ ] P1: fix SQLite race conditions and zombie process cleanup in th. [detail](core_mcp_not_adopted_cli_json_schemas_first)
- [ ] P2: write the binary trigger rule in ti (second independent client mounts tools → build MCP stdio shim). [detail](core_mcp_not_adopted_cli_json_schemas_first)

### memory

- [ ] Learn from outcomes: procedural memory for members and skills. [detail](memory_procedural_six_gaps)
- [ ] Per-hat metrics, aggregated over time. [detail](memory_procedural_six_gaps)
- [ ] Add a native relevance cutoff (`--min-score`) to `tb`/`ti` search. [detail](memory_ti_context_action_rules)
- [ ] Career coach: consult memory before each answer. No decision yet.
- [ ] Episode index over tl (`tl_episodes`, `tl search`), after the extraction pipeline is stable. [detail](memory_episode_summaries_are_a_derived_index_over_tl)
- [x] Extractor as data in tl: `extractor` (immutable JSON config) and `extractions` (every candidate), with the real distiller. [detail](memory_extractor_is_data_immutable_config_rows_in_tl)
- [x] Build the extractor as `tools/td` over `pi-ai`, in shadow and in active mode. [detail](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first)
- [x] td open point: which sessions `td distill` takes. Every session with pending exchanges, or one. [detail](memory_td_distilled_is_set_for_a_whole_session_at_the_end_to_the_run_time)
- [x] td open point: components 5 to 10 as small classes or as plain functions. Plain functions from 6 on. [detail](skill_ritchie_typescript_values_are_readonly_types_with_contracted_functions_not_classes)
- [x] td open point: search in `tb` and `ti`. Imported as modules, no hit recorded. [detail](memory_td_phase_2a_only_searches_neighbours_and_leaves_no_hit_so_the_cosine_cut_is_gone)
- [x] td: all 14 components are built. First live run on the Rasp done 2026-10-11. [detail](memory_distiller_td_is_fourteen_components_behind_one_entry_point)
- [x] td: the 0.95 cut is dropped. [detail](memory_td_phase_2a_only_searches_neighbours_and_leaves_no_hit_so_the_cosine_cut_is_gone)
- [x] td: `ref_only` saves nothing. [detail](memory_td_ref_only_saves_nothing_because_a_ref_needs_two_notes)
- [x] td: `--max-saved` caps the writes of a run. [detail](memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending)
- [x] `tl extractions` command: list the candidates by extractor, run or exchange.
- [x] td open point: a split is not deterministic, so a session is redone whole. [detail](memory_td_distilled_is_set_for_a_whole_session_at_the_end_to_the_run_time)
- [ ] td: change the extraction prompt so the model may propose new tags beside known ones. [detail](memory_td_candidates_keep_known_tags_and_propose_new_ones)
- [ ] td: after the first shadow runs, read the proposed tags in `extractions` and pick a guard for semantic tag synonyms. [detail](memory_td_candidates_keep_known_tags_and_propose_new_ones)
- [ ] ritchie `check_body_diff.py` reads a `return` inside a callback (a `sort` comparator) as one that skips a postcondition. Ignore returns in nested functions.
- [ ] Put `tests/` in a `tsc` project, so a type error in a test is caught.
- [ ] Drop the `client.ts?extractions` import trick in `tests/tl_extractions.test.ts`: the client now reads its url on each call. [detail](memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store)
- [ ] `errorMessage` has three copies, in `tb`, `ti` and `th`. Pick one home for it. [detail](style_contract_helpers_live_in_one_shared_module)
- [ ] `tb refine`: add `trust`, computed from the hit counters, dry run first. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_last_signal_floors_at_the_counter_start)
- [ ] `tb refine --apply`: archive notes under trust 0.2, with `archived_at`. [detail](memory_tb_refine_trust_under_point_two_archives_the_note_and_hides_it_from_search)
- [ ] `tb refine`: delete after six months in the archive, log line first. [detail](memory_tb_refine_a_note_is_deleted_after_six_months_in_the_archive_with_a_log_line_first)
- [ ] `tb refine`: fix the weights and the 0.2 threshold after the first dry run. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_last_signal_floors_at_the_counter_start)
- [ ] `tb refine`: tune the decay after 30 days of hits. [detail](memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21)
- [ ] `tb search`: option to include archived notes, counted as a signal. [detail](memory_tb_refine_trust_under_point_two_archives_the_note_and_hides_it_from_search)
- [ ] Run `tb refine` on a timer. Then import the history in batches with `--max-saved`. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_last_signal_floors_at_the_counter_start)
- [ ] `tb link`: ref candidates by vector, an LLM hat judges pairs, then retire aristotele. Possible design. [detail](memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge)
- [ ] Decide the fate of `status` once `trust` has proved itself. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_last_signal_floors_at_the_counter_start)
- [ ] Decay of `provvisoria` notes: with critic F about 16 of 75 bad candidates pass. Now covered by `trust`. [detail](memory_critic_is_f_textbook_as_a_test_and_no_record_question)
- [ ] td: run two or three more sessions in shadow, then active, and tune.
- [ ] td: `append` can add a `do` that its rule's `if` does not cover. Make it prudent, or let `ti` edit a `do`.
- [ ] td: the critic lets a generic rule pass. Add a too-generic check for rules.
- [ ] td: one session saved two near-equal notes. The session list is not enough.
- [ ] td phase 3: bridges between saved notes. [detail](memory_bridges_by_shape_are_judged_by_reading)
- [ ] Run `td distill --active` on a timer, then retire platone. Erodoto is already gone. [detail](memory_distillation_stays_manual_for_now)
- [ ] Add a limit to the extractions API, then to `tl extractions`.
- [ ] Remove `Outcome.nearIdentical` and `NEAR_IDENTICAL`. No caller is left.
- [ ] Decide where the td spec log lives: `tools/td` or the wiki.
- [ ] Spike files are deleted. Old decisions still list them as sources. Decide how to mark them.

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
- [ ] Ritchie: add an integration net for code that turns errors into values. [detail](memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores)
- [ ] Ritchie: make the mutant run a script, not a hand step.
- [ ] Ritchie: test runs time out on files with heavy fixtures. Give the run a fixture helper.
- [ ] Ritchie: the first real run with the SPEC/REVIEW pair checks both templates in practice. [detail](skill_ritchie_spec_review_pair_is_ephemeral_scaffolding)
- [ ] Census: judge the 16 skills not yet judged, one by one.
- [ ] socrate: write the ti principle, then remove the skill. [detail](skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood)
- [ ] vinci: rework as Typst documents with templates. [detail](skill_vinci_may_become_a_typst_documents_skill_with_templates)
- [ ] piano: read it, then fix, fold into omero, or remove. [detail](skill_piano_is_rigid_and_poorly_joined_to_omero_and_its_fate_is_open)
- [ ] Quality guides: print from tb and ti, or keep in skills. [detail](skill_quality_guides_may_be_printed_by_tb_and_ti_instead_of_kept_in_skills)
- [ ] platone: before retiring it, give the note quality rules a home. [detail](skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it)

## Cross-references

- [index](index)
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — system overview