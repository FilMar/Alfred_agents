---
tags: [pi, index]
sources: []
updated: 2026-09-28
---

## Pages

| Page | Content |
|------|---------|
| [roadmap](roadmap) | Future task list |
| [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) | The five layers and the no-overlap boundary |
| [core_tb_stateless_single_source](core_tb_stateless_single_source) | CLIs hold no state; Qdrant + Ollama over HTTP |
| [core_td_mvr_removed](core_td_mvr_removed) | Ghost tools removed; git holds the history |
| [th_sandbox_bwrap_fixed_binds](th_sandbox_bwrap_fixed_binds) | bwrap profile; run warns, sandbox-exec refuses |
| [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) | Detached runs keep state in /tmp files |
| [th_http_api_scoped_no_db](th_http_api_scoped_no_db) | Planned th HTTP API; glob over /tmp, no DB |
| [th_verification_outside_members](th_verification_outside_members) | Verification never inside a member's run |
| [agents_skills_inline_members_via_th](agents_skills_inline_members_via_th) | Skills run inline; members only via th |
| [agents_roster_lives_on_filesystem](agents_roster_lives_on_filesystem) | Roster derived from the filesystem, never tabled |
| [agents_named_after_famous_figures](agents_named_after_famous_figures) | Naming rule: famous figure with matching trait |
| [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) | tb/ti search injected on every prompt |
| [memory_procedural_six_gaps](memory_procedural_six_gaps) | The six gaps to procedural memory |
| [memory_log_first_three_moves](memory_log_first_three_moves) | Grow on data, not hypotheses; log first |
| [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) | tl: an archive of work; chat and subtask, three tables |
| [memory_wiki_is_the_project_notebook](memory_wiki_is_the_project_notebook) | The wiki is not a memory tier; the extraction test |
| [memory_identity_splits_descriptive_prescriptive](memory_identity_splits_descriptive_prescriptive) | about on tb notes; ti holds the executable half |
| [memory_ti_context_action_rules](memory_ti_context_action_rules) | ti: dedicated if/do collection, dumb client |
| [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) | tb + ti live on the Rasp, confirmed in use |
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
| [orchestrator_minimal_rest_surface](orchestrator_minimal_rest_surface) | Four REST endpoints, one entry point |
| [orchestrator_run_task_matrix_only](orchestrator_run_task_matrix_only) | Ad-hoc execution only via Matrix |
| [orchestrator_adversarial_audit_static](orchestrator_adversarial_audit_static) | Audit at ingestion; static parsing everywhere |
| [orchestrator_filesystem_state_no_db](orchestrator_filesystem_state_no_db) | Catalog + queue as filesystem; directory is state |
| [orchestrator_boot_callback_wake_window](orchestrator_boot_callback_wake_window) | WoL + i_wake + batching + ping reconciliation |
| [orchestrator_bwrap_task_execution](orchestrator_bwrap_task_execution) | Audited tasks run under th's sandbox |
| [orchestrator_tailscale_perimeter_matrix_bot](orchestrator_tailscale_perimeter_matrix_bot) | One network perimeter; Matrix bot, not Telegram |
| [orchestrator_metadata_exported_constants](orchestrator_metadata_exported_constants) | Script metadata as exported constants |
| [orchestrator_remaining_work](orchestrator_remaining_work) | Phases 3-4, known bugs, future ideas |
| [rasp_services_provisioning_order](rasp_services_provisioning_order) | What runs on the Rasp and in which order |
| [cockpit_pivot_pi_extension_rpc](cockpit_pivot_pi_extension_rpc) | Cockpit as a pi extension in RPC mode |
| [graph_third_os_webapp_wider_than_workbench](graph_third_os_webapp_wider_than_workbench) | third_os: read, write and AI over tb's graph; ti out for now |
| [graph_third_os_imports_tb_as_library](graph_third_os_imports_tb_as_library) | Runs on the Rasp, imports tb's modules, keeps vectors in RAM |
| [graph_third_os_canvas_physics_dom_text](graph_third_os_canvas_physics_dom_text) | canvas = physics, DOM = text; fake depth, no framework |
| [graph_third_os_agent_turns_stay_async](graph_third_os_agent_turns_stay_async) | Phase 3 is async: th spawns under bwrap even as a library |
| [graph_curation_via_th_agent](graph_curation_via_th_agent) | Curation via a th member, live-streamed, kill-switch not a gate |
| [skill_convention_direct_cli](skill_convention_direct_cli) | Skills: router + scripts + references |
| [skill_router_pass_planned](skill_router_pass_planned) | Router pass design, deliberately deferred |
| [style_dual_entrypoint](style_dual_entrypoint) | CLI + HTTP API pattern for tb/ti |
| [style_tb_ti_layering](style_tb_ti_layering) | Layered architecture and coding standards |
| [wiki_superseded_hidden_with_dot](wiki_superseded_hidden_with_dot) | The wiki itself: immutable chains; dead decisions hidden with a dot |
| [wiki_decision_is_written_when_the_design_ends](wiki_decision_is_written_when_the_design_ends) | A page is written after the design settles, never during it |

Only live decisions are listed. A decision superseded by a newer one (see `replaces` in its frontmatter) is renamed with a leading dot and drops out of this table. It is never deleted.