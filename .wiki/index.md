---
tags: [pi, index]
sources: []
updated: 2026-10-13
---

## Pages

| Page | Content |
|------|---------|
| [roadmap](roadmap) | Future task list |
| [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) | The five layers and the no-overlap boundary |
| [core_mcp_not_adopted_cli_json_schemas_first](core_mcp_not_adopted_cli_json_schemas_first) | No MCP migration; contract layer with JSON Schemas first, MCP shim behind a trigger |
| [core_tb_stateless_single_source](core_tb_stateless_single_source) | CLIs hold no state; Qdrant + Ollama over HTTP |
| [core_td_mvr_removed](core_td_mvr_removed) | Ghost tools removed; git holds the history |
| [th_sandbox_bwrap_fixed_binds](th_sandbox_bwrap_fixed_binds) | bwrap profile; run warns, sandbox-exec refuses |
| [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) | Detached runs keep state in /tmp files |
| [th_http_api_scoped_no_db](th_http_api_scoped_no_db) | Planned th HTTP API; glob over /tmp, no DB |
| [th_verification_outside_members](th_verification_outside_members) | Verification never inside a member's run |
| [th_timeout_timer_is_cleared_so_a_run_exits_when_its_prompt_ends](th_timeout_timer_is_cleared_so_a_run_exits_when_its_prompt_ends) | A run with --timeout exits when its prompt ends; the old timer kept it up |
| [agents_hats_replace_members](agents_hats_replace_members) | A delegated run is a hat plus instructions; skills stay inline |
| [agents_skill_forced_not_offered](agents_skill_forced_not_offered) | --skill puts a skill's whole text in a run, as a constraint |
| [agents_roster_lives_on_filesystem](agents_roster_lives_on_filesystem) | Roster derived from the filesystem, never tabled |
| [agents_named_after_famous_figures](agents_named_after_famous_figures) | Naming rule: famous figure with matching trait |
| [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) | tb/ti search injected on every prompt |
| [memory_procedural_six_gaps](memory_procedural_six_gaps) | The six gaps to procedural memory |
| [memory_log_first_three_moves](memory_log_first_three_moves) | Grow on data, not hypotheses; log first |
| [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) | tl: an archive of work; chat and subtask, three tables |
| [memory_wiki_is_the_project_notebook](memory_wiki_is_the_project_notebook) | The wiki is not a memory tier; the extraction test |
| [memory_identity_splits_descriptive_prescriptive](memory_identity_splits_descriptive_prescriptive) | about on tb notes; ti holds the executable half |
| [memory_ti_context_action_rules](memory_ti_context_action_rules) | ti: dedicated if/do collection, dumb client |
| [memory_tb_and_ti_run_against_qdrant_and_ollama_on_the_rasp_and_every_client_points_there](memory_tb_and_ti_run_against_qdrant_and_ollama_on_the_rasp_and_every_client_points_there) | tb, ti and tl live on the Rasp, every client points there; td runs locally and calls the Rasp APIs |
| [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi) | CoALA's four types mapped to pi; episodic is the hole |
| [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) | The human OK limits growth; use judges, not reading |
| [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) | 74% of refs are not redundant with the vectors |
| [memory_related_notes_ranked_not_cut](memory_related_notes_ranked_not_cut) | Related notes are scored and ranked, never cut by min-score |
| [memory_score_is_always_the_engine_cosine](memory_score_is_always_the_engine_cosine) | One score field, one quantity: the engine's cosine |
| [memory_graph_engine_deferred_not_needed](memory_graph_engine_deferred_not_needed) | No graph DB; the threshold to revisit, written down |
| [memory_alias_makes_migration_reversible](memory_alias_makes_migration_reversible) | Collection per model behind an alias; atomic swap |
| [memory_embedding_model_follows_the_corpus_language](memory_embedding_model_follows_the_corpus_language) | An Italian corpus needs a multilingual model, with the task prefixes |
| [memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model) | min-score is measured per model, and the hook was silent without it |
| [memory_absence_is_how_qdrant_stores_null](memory_absence_is_how_qdrant_stores_null) | No field whose only value is null: Qdrant drops the key |
| [memory_raw_text_lives_in_the_archive_not_the_note](memory_raw_text_lives_in_the_archive_not_the_note) | No source_raw on a note: the archive holds the text, the note holds a pointer |
| [memory_session_names_its_harness](memory_session_names_its_harness) | A session says which tool ran it, once, in a column |
| [memory_delegated_run_is_a_pi_subtask](memory_delegated_run_is_a_pi_subtask) | A th run archives itself: a pi session that kind marks as a subtask |
| [memory_run_spool_survives_reboot](memory_run_spool_survives_reboot) | A run the archive cannot take is spooled outside /tmp and drained by every run and wait |
| [memory_hook_query_not_rewritten](memory_hook_query_not_rewritten) | The hook sends the prompt as it is: a 9B rewrite lowered recall in the spike |
| [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) | Manual distillation with platone; the automatic service waits on five open problems |
| [memory_episode_summaries_are_a_derived_index_over_tl](memory_episode_summaries_are_a_derived_index_over_tl) | Phase 0 episode summaries become a derived, rebuildable search index over tl |
| [memory_hindsight_not_adopted_its_shape_is_copied](memory_hindsight_not_adopted_its_shape_is_copied) | No Hindsight; copy its shape: one structured call, code for the rest |
| [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) | The extractor is the v7 pipeline with critic F, no tools, built in shadow first; in-session repeats still open, the 0.95 cut is dropped and `distilled` is a run time (see the td rows below) |
| [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) | The critic F: guard role, probabilities, textbook as a test at 0.6, no record question; cost counts a lost good note 3 times |
| [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) | The extractor is an immutable JSON config row in tl; every candidate, kept or dropped, goes to extractions |
| [memory_distiller_is_its_own_tool_td_and_tl_stays_the_register](memory_distiller_is_its_own_tool_td_and_tl_stays_the_register) | The distiller is tools/td, a library with a thin CLI; tl keeps the tables and the API, td checks the config |
| [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) | The 14 components of td, what each does and what it touches |
| [memory_td_critic_check_drops_at_least_at_the_threshold_and_under_below_it](memory_td_critic_check_drops_at_least_at_the_threshold_and_under_below_it) | A critic check drops at p >= threshold for atLeast and p < threshold for under |
| [memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy](memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy) | fromJson is the only way in; constructors keep a frozen copy, extra fields are refused |
| [memory_td_candidates_keep_known_tags_and_propose_new_ones](memory_td_candidates_keep_known_tags_and_propose_new_ones) | A candidate needs one known tag and may propose new ones; synonyms matched by a lexical key |
| [memory_td_config_json_is_checked_on_both_sides_and_must_round_trip](memory_td_config_json_is_checked_on_both_sides_and_must_round_trip) | Config classes check the JSON shape on read; fromJson must write back the same JSON |
| [memory_td_recorder_follows_one_candidate_through_the_phases_and_writes_once_per_exchange](memory_td_recorder_follows_one_candidate_through_the_phases_and_writes_once_per_exchange) | Outcome follows a candidate through the phases; Recorder builds rows and writes once per exchange |
| [memory_td_registry_reads_a_tl_row_into_a_version_and_a_missing_row_is_null](memory_td_registry_reads_a_tl_row_into_a_version_and_a_missing_row_is_null) | Version is one tl extractor row with its checked config; a missing row is null |
| [memory_td_session_reader_drops_only_task_notifications_and_api_errors_under_a_cap_of_1000](memory_td_session_reader_drops_only_task_notifications_and_api_errors_under_a_cap_of_1000) | Phase 0: noise is a task notification or an API error; a consent is not; cap of 1000 |
| [memory_td_model_caller_asks_once_fixes_json_once_and_returns_failures_as_values](memory_td_model_caller_asks_once_fixes_json_once_and_returns_failures_as_values) | One pi-ai call, one JSON fix, failure as a value, four token counts |
| [memory_td_episodes_split_a_session_in_one_call_checked_for_full_cover_and_listed_as_json_strings](memory_td_episodes_split_a_session_in_one_call_checked_for_full_cover_and_listed_as_json_strings) | Phase 0b: one call splits a session; the check wants full cover in order; listing as JSON strings |
| [memory_td_extraction_checks_each_candidate_shape_in_the_json_check_and_runs_the_code_checks_inside_phase_one](memory_td_extraction_checks_each_candidate_shape_in_the_json_check_and_runs_the_code_checks_inside_phase_one) | Phase 1: plain style; the JSON check wants each candidate's shape; code checks run inside; tb imported as a module |
| [memory_tb_clients_read_their_url_per_call_and_ti_tests_restore_their_spies](memory_tb_clients_read_their_url_per_call_and_ti_tests_restore_their_spies) | tb clients read the url per call; ti tests restore their spies, since Bun shares modules |
| [memory_td_extractor_one_is_the_spike_v7_with_critic_f_and_the_critic_system_is_the_guard_hat_only](memory_td_extractor_one_is_the_spike_v7_with_critic_f_and_the_critic_system_is_the_guard_hat_only) | Extractor row 1 = spike v7 + critic F; critic system is the guard hat, task block from the checks |
| [memory_td_text_cuts_are_config_sizes_and_extractor_two_replaces_row_one](memory_td_text_cuts_are_config_sizes_and_extractor_two_replaces_row_one) | Four text cuts become config sizes; extractor row 2 is active, row 1 is dead |
| [memory_td_phase_2a_only_searches_neighbours_and_leaves_no_hit_so_the_cosine_cut_is_gone](memory_td_phase_2a_only_searches_neighbours_and_leaves_no_hit_so_the_cosine_cut_is_gone) | Phase 2a is a read-only neighbour search with record_hits off; the 0.95 cut never fired, so it is gone |
| [memory_td_distilled_is_set_for_a_whole_session_at_the_end_to_the_run_time](memory_td_distilled_is_set_for_a_whole_session_at_the_end_to_the_run_time) | A session is the unit of distilled: closed once, with the run time, only when nothing failed; redone whole otherwise |
| [memory_td_ref_only_saves_nothing_because_a_ref_needs_two_notes](memory_td_ref_only_saves_nothing_because_a_ref_needs_two_notes) | ref_only writes nothing: a ref links two notes and the candidate makes none |
| [memory_td_world_errors_return_as_values_and_programmer_errors_are_rethrown](memory_td_world_errors_return_as_values_and_programmer_errors_are_rethrown) | Store errors become a failure value; ContractError, TypeError and ReferenceError are rethrown |
| [memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending](memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending) | --max-saved caps the writes of a run; a capped session stays pending and is redone |
| [memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores](memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores) | td tests use in-memory stubs; an end-to-end test checks the stores, since bare calls cannot tell a save from a failure |
| [memory_tl_extraction_quote_may_be_blank_only_when_a_check_dropped_it](memory_tl_extraction_quote_may_be_blank_only_when_a_check_dropped_it) | A blank quote is allowed only on a check drop, so those drops can be logged |
| [memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store](memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store) | apiUrl() is read per call; a test server always wins over the real store |
| [skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role](skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role) | Step 6 is two th runs through th_write.sh: black hat for tests, white for bodies, GLM-5.3 fixed |
| [skill_ritchie_typescript_values_are_readonly_types_with_contracted_functions_not_classes](skill_ritchie_typescript_values_are_readonly_types_with_contracted_functions_not_classes) | TS values are Readonly types with contracted functions; brand only for an invariant; class only for a resource |
| [memory_extractor_calls_go_through_pi_ai_with_reasoning_low](memory_extractor_calls_go_through_pi_ai_with_reasoning_low) | Calls go through pi-ai: reasoning low and the system role for Ollama, or the prompt is lost or glm thinks 15x |
| [memory_bridges_by_shape_are_judged_by_reading](memory_bridges_by_shape_are_judged_by_reading) | Phase 3 bridges by shape; 0/20 ref recovery, so judge by reading the yes answers |
| [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) | tb refine: trust 0..1 derived from the hit counters, start 0.5, floor at 2026-09-21; the first pass computes it and stores nothing |
| [memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it](memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it) | trust under 0.2 sets archived_at; the note is left out of the hook only, a deliberate search still finds it |
| [memory_tb_refine_apply_owns_archived_at](memory_tb_refine_apply_owns_archived_at) | Only --apply writes archived_at; a hit does not clear it, the next run does; two requests |
| [memory_tb_refine_apply_runs_at_session_start](memory_tb_refine_apply_runs_at_session_start) | --apply runs at the start of every session, no interval check; the switch is the settings.json entry |
| [memory_tb_refine_apply_has_no_write_cap](memory_tb_refine_apply_has_no_write_cap) | --apply has no cap on writes per run |
| [memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first](memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first) | Delete when archived and no signal for 365 days, after an append-only log line; not before 2027-09-21 |
| [memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21](memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21) | What counts as a hit, what a hit means, and why no new field yet |
| [memory_tb_refine_browse_notes_reads_one_page_so_refine_passes_a_limit_of_10000_and_asserts_the_read_is_not_cut](memory_tb_refine_browse_notes_reads_one_page_so_refine_passes_a_limit_of_10000_and_asserts_the_read_is_not_cut) | browseNotes reads one page of 20; refine passes limit 10000 and asserts the read is not cut |
| [memory_tb_refine_the_list_of_low_notes_is_sorted_by_trust_ascending_then_by_id](memory_tb_refine_the_list_of_low_notes_is_sorted_by_trust_ascending_then_by_id) | The list under 0.2 is sorted by trust, lowest first, then by id |
| [memory_tb_refine_trust_measures_vitality_not_quality_so_the_archive_comes_before_any_delete](memory_tb_refine_trust_measures_vitality_not_quality_so_the_archive_comes_before_any_delete) | trust says a note is alive, not that it is good: archive before delete, quality is open |
| [memory_tb_refine_the_cap_of_10_on_hits_stays_although_the_outer_min_of_1_makes_it_redundant](memory_tb_refine_the_cap_of_10_on_hits_stays_although_the_outer_min_of_1_makes_it_redundant) | The cap of 10 on hits is redundant with min(1, ...) today; it stays because the weights may change |
| [memory_tb_refine_the_archive_is_not_a_deletion_queue_because_a_deliberate_search_revives_a_note_and_the_hook_never_does](memory_tb_refine_the_archive_is_not_a_deletion_queue_because_a_deliberate_search_revives_a_note_and_the_hook_never_does) | The archive is not a deletion queue: a deliberate search revives a note, the hook never does |
| [memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known](memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known) | Threshold 0.2 and half-life 90 wait for the hit rate of Nov-Dec 2026: with no new hit, 164 notes fall together on 2027-01-18 |
| [memory_tb_note_status_field_is_removed_because_nothing_reads_it_and_nothing_promotes_it](memory_tb_note_status_field_is_removed_because_nothing_reads_it_and_nothing_promotes_it) | The note status field is removed: nobody reads it and nobody promotes it; old notes keep it |
| [memory_tb_note_payload_is_pinned_by_an_exact_test_so_a_key_cannot_appear_or_vanish_unseen](memory_tb_note_payload_is_pinned_by_an_exact_test_so_a_key_cannot_appear_or_vanish_unseen) | A test pins the exact payload of a note; fields arrive from precise writes |
| [memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge](memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge) | Possible design, no code: `tb link` finds ref candidates by vector, one LLM hat judges pairs, refs carry an origin; hubs later |
| [skill_jobs_removed_because_taskwarrior_is_no_longer_used](skill_jobs_removed_because_taskwarrior_is_no_longer_used) | Removed 2026-10-12: Taskwarrior is no longer used |
| [skill_ulisse_removed_because_skill_descriptions_already_route](skill_ulisse_removed_because_skill_descriptions_already_route) | Removed 2026-10-12: skill descriptions already route a task |
| [skill_erodoto_removed_because_td_replaces_it_and_it_only_batched_platone_and_mose](skill_erodoto_removed_because_td_replaces_it_and_it_only_batched_platone_and_mose) | Removed 2026-10-12: td replaces it; it only batched platone and mose |
| [skill_quality_references_moved_into_platone_and_mose](skill_quality_references_moved_into_platone_and_mose) | The shared references folder is gone; each file sits in its skill |
| [skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood](skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood) | Idea: socrate becomes a ti rule, then the skill is removed |
| [skill_vinci_may_become_a_typst_documents_skill_with_templates](skill_vinci_may_become_a_typst_documents_skill_with_templates) | Idea: vinci becomes Typst documents with templates; the CV is one |
| [skill_piano_is_rigid_and_poorly_joined_to_omero_and_its_fate_is_open](skill_piano_is_rigid_and_poorly_joined_to_omero_and_its_fate_is_open) | Open question: fix piano, fold it into omero, or remove it |
| [skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it](skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it) | Idea: retire platone with the timer; keep the note quality rules |
| [skill_quality_guides_may_be_printed_by_tb_and_ti_instead_of_kept_in_skills](skill_quality_guides_may_be_printed_by_tb_and_ti_instead_of_kept_in_skills) | Idea: tb guide and ti guide print the quality rules; skills keep none |
| [memory_glm_json_comes_from_the_prompt_not_format](memory_glm_json_comes_from_the_prompt_not_format) | GLM ignores format schemas; JSON from the prompt, checked by code, one retry |
| [memory_jev_like_decision_models_are_candidates_for_classification](memory_jev_like_decision_models_are_candidates_for_classification) | tev1 and nimble: local decision models for the classification steps; not adopted until tested |
| [orchestrator_and_cockpit_removed](orchestrator_and_cockpit_removed) | Both tools removed; unused code was breaking the test suite |
| [graph_third_os_webapp_wider_than_workbench](graph_third_os_webapp_wider_than_workbench) | third_os: read, write and AI over tb's graph; ti out for now |
| [graph_third_os_imports_tb_as_library](graph_third_os_imports_tb_as_library) | Runs on the Rasp, imports tb's modules, keeps vectors in RAM |
| [graph_third_os_canvas_physics_dom_text](graph_third_os_canvas_physics_dom_text) | canvas = physics, DOM = text; fake depth, no framework |
| [graph_third_os_agent_turns_stay_async](graph_third_os_agent_turns_stay_async) | Phase 3 is async: th spawns under bwrap even as a library |
| [graph_curation_via_th_agent](graph_curation_via_th_agent) | Curation via a th member, live-streamed, kill-switch not a gate |
| [skill_convention_direct_cli](skill_convention_direct_cli) | Skills: router + scripts + references |
| [skill_ritchie_contract_messages_carry_values](skill_ritchie_contract_messages_carry_values) | Contract messages: stable prefix, then the values the assert reads |
| [skill_ritchie_classifiers_get_an_outcome_table](skill_ritchie_classifiers_get_an_outcome_table) | A classifier gets an outcome table: the one test with an assert of its own |
| [skill_router_pass_planned](skill_router_pass_planned) | Router pass design, deliberately deferred |
| [skill_ritchie_spec_is_a_minimal_italian_document](skill_ritchie_spec_is_a_minimal_italian_document) | The spec: a minimal Italian document — entities, flows, invariants; the code is not the spec |
| [skill_ritchie_review_is_the_verdict_packet](skill_ritchie_review_is_the_verdict_packet) | The review: six sections from Esito to Scostamenti, self-contained |
| [skill_ritchie_spec_review_pair_is_ephemeral_scaffolding](skill_ritchie_spec_review_pair_is_ephemeral_scaffolding) | The pair is scaffolding: removed at approval, the wiki page is the record |
| [style_shared_modules_live_in_tools_common_one_folder_for_contract_cli_and_tags](style_shared_modules_live_in_tools_common_one_folder_for_contract_cli_and_tags) | tools/common holds every shared module: contract, cli helpers, tags |
| [style_a_source_that_left_the_tree_is_written_as_path_at_commit_hash_or_marked_deleted](style_a_source_that_left_the_tree_is_written_as_path_at_commit_hash_or_marked_deleted) | A source that left the tree is written path@hash, or (deleted) if git never held it |
| [style_dual_entrypoint](style_dual_entrypoint) | CLI + HTTP API pattern for tb/ti |
| [style_type_checks_are_private_static_methods_of_their_class](style_type_checks_are_private_static_methods_of_their_class) | A check that knows one type is a private static method; getters have no contract |
| [style_tb_ti_layering](style_tb_ti_layering) | Layered architecture and coding standards |
| [wiki_superseded_hidden_with_dot](wiki_superseded_hidden_with_dot) | The wiki itself: immutable chains; dead decisions hidden with a dot |
| [wiki_decision_is_written_when_the_design_ends](wiki_decision_is_written_when_the_design_ends) | A page is written after the design settles, never during it |

Only live decisions are listed. A decision superseded by a newer one (see `replaces` in its frontmatter) is renamed with a leading dot and drops out of this table. It is never deleted.