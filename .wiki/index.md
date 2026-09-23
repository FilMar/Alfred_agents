---
tags: [pi, index]
sources: []
updated: 2026-09-23
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
| [memory_tl_unified_event_log](memory_tl_unified_event_log) | tl: one REST event log, founded not built |
| [memory_ti_context_action_rules](memory_ti_context_action_rules) | ti: dedicated if/do collection, dumb client |
| [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) | tb + ti live on the Rasp, confirmed in use |
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

Only live decisions are listed. A decision superseded by a newer one (see `replaces` in its frontmatter) is renamed with a leading dot and drops out of this table. It is never deleted.