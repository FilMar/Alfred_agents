---
tags: [pi, index]
sources: []
updated: 2026-10-16
---

## roadmap

| Page | Content |
|------|---------|
| [roadmap](roadmap) | Future task list |

## core

| Page | Content |
|------|---------|
| [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) | The five layers and the no-overlap boundary |
| [core_mcp_not_adopted_cli_json_schemas_first](core_mcp_not_adopted_cli_json_schemas_first) | No MCP migration; contract layer with JSON Schemas first, MCP shim behind a trigger |
| [core_tb_and_ti_are_stateless_clients_of_one_store_on_the_rasp](core_tb_and_ti_are_stateless_clients_of_one_store_on_the_rasp) | tb and ti keep no local state; every client points to the Qdrant and Ollama on the Rasp |

## th

| Page | Content |
|------|---------|
| [th_sandbox_bwrap_fixed_binds](th_sandbox_bwrap_fixed_binds) | bwrap profile; run warns, sandbox-exec refuses |
| [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) | Detached runs keep state in /tmp files |
| [th_verification_outside_members](th_verification_outside_members) | Verification never inside a member's run |
| [th_timeout_timer_is_cleared_so_a_run_exits_when_its_prompt_ends](th_timeout_timer_is_cleared_so_a_run_exits_when_its_prompt_ends) | A run with --timeout exits when its prompt ends; the old timer kept it up |

## agents

| Page | Content |
|------|---------|
| [agents_hats_replace_members](agents_hats_replace_members) | A delegated run is a hat plus instructions; skills stay inline |
| [agents_skill_forced_not_offered](agents_skill_forced_not_offered) | --skill puts a skill's whole text in a run, as a constraint |
| [agents_roster_lives_on_filesystem](agents_roster_lives_on_filesystem) | Roster derived from the filesystem, never tabled |
| [agents_named_after_famous_figures](agents_named_after_famous_figures) | Naming rule: famous figure with matching trait |

## hook

| Page | Content |
|------|---------|
| [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) | tb/ti search injected on every prompt |

## memory

| Page | Content |
|------|---------|
| [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) | tl: an archive of work; chat and subtask, three tables |
| [memory_wiki_is_the_project_notebook](memory_wiki_is_the_project_notebook) | The wiki is not a memory tier; the extraction test |
| [memory_identity_splits_descriptive_prescriptive](memory_identity_splits_descriptive_prescriptive) | about on tb notes; ti holds the executable half |
| [memory_ti_context_action_rules](memory_ti_context_action_rules) | ti: dedicated if/do collection, dumb client |
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
| [memory_td_distills_by_itself_at_session_start](memory_td_distills_by_itself_at_session_start) | The start of a session runs the distiller; replaces the manual-only decision |
| [memory_episode_summaries_are_a_derived_index_over_tl](memory_episode_summaries_are_a_derived_index_over_tl) | Phase 0 episode summaries become a derived, rebuildable search index over tl |
| [memory_hindsight_not_adopted_its_shape_is_copied](memory_hindsight_not_adopted_its_shape_is_copied) | No Hindsight; copy its shape: one structured call, code for the rest |
| [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) | The extractor is the v7 pipeline with critic F, no tools, built in shadow first; in-session repeats still open, the 0.95 cut is dropped and `distilled` is a run time (see the td rows below) |
| [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) | The critic F: guard role, probabilities, textbook as a test at 0.6, no record question; cost counts a lost good note 3 times |
| [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) | The extractor is an immutable JSON config row in tl; every candidate, kept or dropped, goes to extractions |
| [memory_td_critic_check_drops_at_least_at_the_threshold_and_under_below_it](memory_td_critic_check_drops_at_least_at_the_threshold_and_under_below_it) | A critic check drops at p >= threshold for atLeast and p < threshold for under |
| [memory_td_candidates_keep_known_tags_and_propose_new_ones](memory_td_candidates_keep_known_tags_and_propose_new_ones) | A candidate needs one known tag and may propose new ones; synonyms matched by a lexical key |
| [memory_td_session_reader_drops_only_task_notifications_and_api_errors_under_a_cap_of_1000](memory_td_session_reader_drops_only_task_notifications_and_api_errors_under_a_cap_of_1000) | Phase 0: noise is a task notification or an API error; a consent is not; cap of 1000 |
| [memory_td_phase_2a_only_searches_neighbours_and_leaves_no_hit_so_the_cosine_cut_is_gone](memory_td_phase_2a_only_searches_neighbours_and_leaves_no_hit_so_the_cosine_cut_is_gone) | Phase 2a is a read-only neighbour search with record_hits off; the 0.95 cut never fired, so it is gone |
| [memory_td_distilled_is_set_for_a_whole_session_at_the_end_to_the_run_time](memory_td_distilled_is_set_for_a_whole_session_at_the_end_to_the_run_time) | A session is the unit of distilled: closed once, with the run time, only when nothing failed; redone whole otherwise |
| [memory_td_ref_only_saves_nothing_because_a_ref_needs_two_notes](memory_td_ref_only_saves_nothing_because_a_ref_needs_two_notes) | ref_only writes nothing: a ref links two notes and the candidate makes none |
| [memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending](memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending) | --max-saved caps the writes of a run; a capped session stays pending and is redone |
| [memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores](memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores) | td tests use in-memory stubs; an end-to-end test checks the stores, since bare calls cannot tell a save from a failure |
| [memory_extractor_calls_go_through_pi_ai_with_reasoning_low](memory_extractor_calls_go_through_pi_ai_with_reasoning_low) | Calls go through pi-ai: reasoning low and the system role for Ollama, or the prompt is lost or glm thinks 15x |
| [memory_bridges_by_shape_are_judged_by_reading](memory_bridges_by_shape_are_judged_by_reading) | Phase 3 bridges by shape; 0/20 ref recovery, so judge by reading the yes answers |
| [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) | tb refine: trust 0..1 derived from the hit counters, start 0.5, floor at 2026-09-21; the first pass computes it and stores nothing |
| [memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first](memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first) | Delete when archived and no signal for 365 days, after an append-only log line; not before 2027-09-21 |
| [memory_tb_refine_browse_notes_reads_one_page_so_refine_passes_a_limit_of_10000_and_asserts_the_read_is_not_cut](memory_tb_refine_browse_notes_reads_one_page_so_refine_passes_a_limit_of_10000_and_asserts_the_read_is_not_cut) | browseNotes reads one page of 20; refine passes limit 10000 and asserts the read is not cut |
| [memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known](memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known) | Threshold 0.2 and half-life 90 wait for the hit rate of Nov-Dec 2026: with no new hit, 164 notes fall together on 2027-01-18 |
| [memory_tb_note_status_field_is_removed_because_nothing_reads_it_and_nothing_promotes_it](memory_tb_note_status_field_is_removed_because_nothing_reads_it_and_nothing_promotes_it) | The note status field is removed: nobody reads it and nobody promotes it; old notes keep it |
| [memory_tb_note_payload_is_pinned_by_an_exact_test_so_a_key_cannot_appear_or_vanish_unseen](memory_tb_note_payload_is_pinned_by_an_exact_test_so_a_key_cannot_appear_or_vanish_unseen) | A test pins the exact payload of a note; fields arrive from precise writes |
| [memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge](memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge) | Possible design, no code: `tb link` finds ref candidates by vector, one LLM hat judges pairs, refs carry an origin; hubs later |
| [memory_glm_json_comes_from_the_prompt_not_format](memory_glm_json_comes_from_the_prompt_not_format) | GLM ignores format schemas; JSON from the prompt, checked by code, one retry |
| [memory_procedural_memory_grows_on_data](memory_procedural_memory_grows_on_data) | Procedural memory grows on data: skill telemetry first, then extraction and a revision loop |
| [memory_clients_read_their_url_per_call](memory_clients_read_their_url_per_call) | tb and tl clients read their URL per call, so a test never reaches the real store |
| [memory_td_config_enters_as_checked_json](memory_td_config_enters_as_checked_json) | td config enters only as JSON, checked on both sides, and must round trip |
| [memory_td_config_holds_every_input](memory_td_config_holds_every_input) | An extractor row holds every input that shapes a result, cuts included |
| [memory_td_errors_are_values_or_thrown](memory_td_errors_are_values_or_thrown) | td: world errors are values, programmer errors are thrown |
| [memory_td_is_its_own_tool](memory_td_is_its_own_tool) | td is its own tool with one entry point; tl stays the register |
| [memory_refine_archive_hides_from_hook_only](memory_refine_archive_hides_from_hook_only) | Archived notes leave the hook only; a deliberate search revives them; refine owns archived_at |
| [memory_refine_apply_runs_at_session_start](memory_refine_apply_runs_at_session_start) | tb refine --apply runs at session start, with no write cap |
| [memory_refine_hits_measure_retrieval](memory_refine_hits_measure_retrieval) | A hit is retrieval, not use; trust measures vitality, so archive comes before delete |
| [memory_tl_timestamps_are_iso_8601_utc_text](memory_tl_timestamps_are_iso_8601_utc_text) | Times in tl are ISO-8601 UTC text, fixed width, with the Z |
| [memory_search_prints_text_blocks_by_default](memory_search_prints_text_blocks_by_default) | search prints text blocks; --json and meta give the rest |
| [memory_hook_injects_only_the_text_the_agent_uses](memory_hook_injects_only_the_text_the_agent_uses) | The hook injects id, what and why; ti injects only the actions |
| [memory_ti_ids_accept_a_unique_prefix](memory_ti_ids_accept_a_unique_prefix) | ti meta, delete and append-do take a unique id prefix |
| [memory_episode_index_belongs_to_tl](memory_episode_index_belongs_to_tl) | The episode collection belongs to tl; td passes the text |
| [memory_episodes_are_neither_pruned_nor_injected](memory_episodes_are_neither_pruned_nor_injected) | Episodes are never pruned and never injected |
| [memory_agent_finds_episodes_through_a_ti_rule_and_alfred](memory_agent_finds_episodes_through_a_ti_rule_and_alfred) | A line in alfred.md and a ti rule send the agent to tl search |
| [memory_episodes_fill_from_the_normal_distill_run](memory_episodes_fill_from_the_normal_distill_run) | Phase 0 of distill fills the episode index |
| [memory_episode_search_filters_the_period_in_qdrant](memory_episode_search_filters_the_period_in_qdrant) | tl search filters the period in Qdrant; the default score is 0.35 |
| [memory_episode_reads_check_every_payload](memory_episode_reads_check_every_payload) | Every episode payload is checked on read; a bad one names the field |
| [memory_td_session_cap_limits_one_session](memory_td_session_cap_limits_one_session) | td distill --max-per-session: a maximum of items one session decides, default 10 |
| [memory_novelty_stays_with_the_judge_not_a_vector_cutoff](memory_novelty_stays_with_the_judge_not_a_vector_cutoff) | Novelty stays with the model judge; a 0.9 cosine cutoff finds no duplicate |
| [memory_distiller_has_no_personal_data_filter](memory_distiller_has_no_personal_data_filter) | The distiller has no personal-data filter; the memory is private to one user |
| [memory_td_same_session_cutoff_drops_twins](memory_td_same_session_cutoff_drops_twins) | td drops a candidate that repeats an item of the session, cosine 0.8 by default |
| [memory_td_verdicts_keep_their_kind](memory_td_verdicts_keep_their_kind) | A verdict links only items of the kind of the candidate, else it is new |
| [memory_td_episodes_are_built_from_the_whole_session](memory_td_episodes_are_built_from_the_whole_session) | Phase 0 reads the whole session so a returning session keeps its episodes |

## skill

| Page | Content |
|------|---------|
| [skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role](skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role) | Step 6 is two th runs through th_write.sh: black hat for tests, white for bodies, GLM-5.3 fixed |
| [skill_ritchie_typescript_values_are_readonly_types_with_contracted_functions_not_classes](skill_ritchie_typescript_values_are_readonly_types_with_contracted_functions_not_classes) | TS values are Readonly types with contracted functions; brand only for an invariant; class only for a resource |
| [skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood](skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood) | Idea: socrate becomes a ti rule, then the skill is removed |
| [skill_annibale_runs_a_debate_of_made_up_viewpoints](skill_annibale_runs_a_debate_of_made_up_viewpoints) | annibale runs one agentic debate on a problem, with viewpoints made on the fly |
| [skill_piano_writes_design_main_md](skill_piano_writes_design_main_md) | piano writes use cases in `.design/`; main.md is the project, one level of sub-projects |
| [skill_omero_debates_design_before_decisions](skill_omero_debates_design_before_decisions) | Piano, then omero Ingest on `.design/` that writes decisions and roadmap blocks, then edison and ritchie |
| [skill_census_platone_and_mose_removed_td_writes](skill_census_platone_and_mose_removed_td_writes) | platone and mose removed; td is the only path that writes tb and ti from sessions |
| [skill_quality_guides_are_printed_by_tb_guide_and_ti_guide](skill_quality_guides_are_printed_by_tb_guide_and_ti_guide) | tb guide and ti guide print the quality rules; skills call the command, not the file |
| [skill_convention_direct_cli](skill_convention_direct_cli) | Skills: router + scripts + references |
| [skill_ritchie_contract_messages_carry_values](skill_ritchie_contract_messages_carry_values) | Contract messages: stable prefix, then the values the assert reads |
| [skill_ritchie_classifiers_get_an_outcome_table](skill_ritchie_classifiers_get_an_outcome_table) | A classifier gets an outcome table: the one test with an assert of its own |
| [skill_router_pass_planned](skill_router_pass_planned) | Router pass design, deliberately deferred |
| [skill_ritchie_spec_is_a_minimal_italian_document](skill_ritchie_spec_is_a_minimal_italian_document) | The spec: a minimal Italian document — entities, flows, invariants; the code is not the spec |
| [skill_ritchie_review_is_the_verdict_packet](skill_ritchie_review_is_the_verdict_packet) | The review: six sections from Esito to Scostamenti, self-contained |
| [skill_ritchie_spec_review_pair_is_ephemeral_scaffolding](skill_ritchie_spec_review_pair_is_ephemeral_scaffolding) | The pair is scaffolding: removed at approval, the wiki page is the record |
| [skill_census_removed_erodoto_jobs_ulisse](skill_census_removed_erodoto_jobs_ulisse) | Removed 2026-10-12: erodoto, jobs and ulisse |
| [skill_census_four_unused_skills_removed](skill_census_four_unused_skills_removed) | Removed 2026-10-14: ermes, draghi, vinci and atlante; linus stays |

## orchestrator

| Page | Content |
|------|---------|
| [orchestrator_and_cockpit_removed](orchestrator_and_cockpit_removed) | Both tools removed; unused code was breaking the test suite |

## style

| Page | Content |
|------|---------|
| [style_shared_modules_live_in_tools_common_one_folder_for_contract_cli_and_tags](style_shared_modules_live_in_tools_common_one_folder_for_contract_cli_and_tags) | tools/common holds every shared module: contract, cli helpers, tags |
| [style_a_source_that_left_the_tree_is_written_as_path_at_commit_hash_or_marked_deleted](style_a_source_that_left_the_tree_is_written_as_path_at_commit_hash_or_marked_deleted) | A source that left the tree is written path@hash, or (deleted) if git never held it |
| [style_dual_entrypoint](style_dual_entrypoint) | CLI + HTTP API pattern for tb/ti |
| [style_type_checks_are_private_static_methods_of_their_class](style_type_checks_are_private_static_methods_of_their_class) | A check that knows one type is a private static method; getters have no contract |
| [style_tb_ti_layering](style_tb_ti_layering) | Layered architecture and coding standards |

## wiki

| Page | Content |
|------|---------|
| [wiki_edit_in_place_delete_superseded](wiki_edit_in_place_delete_superseded) | Edit in place; a reversal deletes the old file; git keeps it |
| [wiki_decision_is_written_when_the_design_ends](wiki_decision_is_written_when_the_design_ends) | A page is written after the design settles, never during it |
| [wiki_is_read_by_agents_not_the_user](wiki_is_read_by_agents_not_the_user) | Design for the user, spec and review read once, wiki for the agents; plain English is a brake on the writer |
