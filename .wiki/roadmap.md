---
tags: [pi, roadmap, tasks]
sources: []
updated: 2026-10-13
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
- [ ] Move the helpers copied between tools to one shared module: `errorMessage` (3 copies), `die` and `out` (all five CLIs), `normalizeTags`, `ensureCollection` and `deletePoints` (`tb` and `ti`), `allNonBlank` (3 copies in `td`), `isPositiveInt` (`tb`, while `contract` has it). [detail](style_contract_helpers_live_in_one_shared_module)
- [x] `tb refine`: add `trust`, computed from the hit counters, dry run first. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing)
- [ ] `tb refine --apply`: archive notes under trust 0.2, with `archived_at`. [detail](memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it)
- [ ] `tb refine`: delete a note archived with no signal for a year, log line first. Not before 2027-09-21. [detail](memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first)
- [ ] `tb refine`: read the hit rate in January 2027. Then fix the weights, the half-life and the 0.2 threshold. [detail](memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known)
- [ ] `tb refine`: tune the decay after 30 days of hits. [detail](memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21)
- [ ] `tb search`: add a flag to leave archived notes out of the hook, and filter on `archived_at`. Needed before `--apply`. [detail](memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it)
- [ ] Run `tb refine` on a timer. Then import the history in batches with `--max-saved`. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing)
- [ ] `tb link`: ref candidates by vector, an LLM hat judges pairs, then retire aristotele. Possible design. [detail](memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge)
- [ ] `tb refine`: decide if a `trust` field is stored, once a reader needs it. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing)
- [x] Remove the `status` field: nothing reads it and nothing promotes it. [detail](memory_tb_note_status_field_is_removed_because_nothing_reads_it_and_nothing_promotes_it)
- [ ] Decay of `provvisoria` notes: with critic F about 16 of 75 bad candidates pass. Now covered by `trust`. [detail](memory_critic_is_f_textbook_as_a_test_and_no_record_question)
- [ ] td: run two or three more sessions in shadow, then active, and tune.
- [ ] td: `append` can add a `do` that its rule's `if` does not cover. Make it prudent, or let `ti` edit a `do`.
- [ ] td: the critic lets a generic rule pass. Add a too-generic check for rules.
- [ ] td: one session saved two near-equal notes. The session list is not enough.
- [ ] td phase 3: bridges between saved notes. [detail](memory_bridges_by_shape_are_judged_by_reading)
- [ ] Run `td distill --active` on a timer, then retire platone. Erodoto is already gone. [detail](memory_distillation_stays_manual_for_now)
- [ ] Add a limit to the extractions API, then to `tl extractions`.
- [ ] Remove `Outcome.nearIdentical` and `NEAR_IDENTICAL`. Only tests call them, and 0 of 293 stored extraction rows carry `near_identical`, so the `tl` validator can drop it too.
- [x] Decide where the td spec log lives: the wiki. The ritchie close files the SPEC/REVIEW pair as decision pages.
- [ ] About 37 `sources` point to files that are gone (`ROADMAP_MEMORIA.md` in 9 pages, the spike files in 9, `.wiki/architettura.md` in 4, and more). Pick one rule for a source that left the tree, for example the commit hash. The SPEC/REVIEW pairs are in git history on purpose.

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

### cleanup

Found by an audit on 2026-10-13. Each line names the path that proves it.

- [ ] **Git:** pick the trunk. `origin/HEAD` points to `master`, last commit 2026-05-11. `main` is 316 commits ahead.
- [ ] **Git:** delete the 16 local branches already merged into `main`, and the same on origin.
- [ ] **Git:** review, then delete four old unmerged branches: `master`, `feature/alfred-pi`, `feature/cockpit-skeleton`, `refactor/no-more-agents`. Delete `origin/release` too.
- [ ] **Repo:** `package.json` has `module` pointing to a missing `index.ts`. Drop `croner`, `js-yaml`, `youtube-transcript` and `@types/js-yaml`: no file imports them.
- [ ] **Repo:** `setup.sh` links `tb`, `th` and `ti` only. Add `tl` and `td`. `td` is not on the PATH today. Keep one install path: `tb` resolves to `~/.bun/bin`, the others to `~/.local/bin`.
- [ ] **Repo:** gather the service units in one folder: `tools/tb/tb.service`, `tools/ti/ti.service`, `tools/tl/deploy/tl.service`. `tl.service` still says `WorkingDirectory=%h/Alfred_agents`.
- [ ] **Repo:** delete `tools/ti/ROADMAP.md` and `tools/tl/ROADMAP.md`: every box is open and the tools exist. The `tl` one points to a missing `ROADMAP_MEMORIA.md`. Check the two READMEs against the CLIs.
- [ ] **Repo:** `scripts/qdrant_alias_point.py`, `qdrant_clone.py` and `qdrant_backup.sh`: nothing references them. One-off migrations, or replaced by `clio`. Keep or delete.
- [ ] **Repo:** decide four loose items: `proposta-riorganizzazione-llm-wiki.md` at the repo root (untracked), `skills/synced` (4.6 MB, ignored by git, writer unknown), the root `justfile` that repeats the `package.json` scripts, and `.pi/settings.json` (tracked, holds `{}`).
- [ ] **Code:** delete `knownExchangeIds` in `tools/tl/src/db.ts`: no use anywhere.
- [ ] **Code:** remove the repeated assert in `tools/td/src/session.ts` lines 167-168.
- [ ] **Code:** the `tl` parsers `claude.ts` and `pi.ts` share 13 function names (`parse`, `sessionOf`, `modelOf`, `sumTokens`, `toExchange` and others). Find what is the same and move it.
- [ ] **Code:** confirm by hand, then delete or document `tl cost`, `th models` and `th get`. No skill, hook or page uses them.
- [ ] **Rules and skills:** `ti` rules that name removed skills: `0eb0f8db` and `4961928a` (erodoto), `8898d87e` (jobs). Rewrite or delete them with mose.
- [ ] **Rules and skills:** retire efesto `references/MIGRATION.md` and the justfile checks in `lint_skill.py`: no skill has a justfile left.
- [ ] **Wiki:** read, then replace or mark these live pages that describe removed parts: `rasp_services_provisioning_order`, `orchestrator_tailscale_perimeter_matrix_bot`, `memory_tb_ti_on_rasp`, `th_sandbox_bwrap_fixed_binds`, `skill_router_pass_planned`, `agents_named_after_famous_figures`. Proof: [orchestrator_and_cockpit_removed](orchestrator_and_cockpit_removed) and [skill_ulisse_removed_because_skill_descriptions_already_route](skill_ulisse_removed_because_skill_descriptions_already_route).
- [ ] **Wiki:** `memory_human_gate_is_the_bottleneck` and `memory_critic_is_f_textbook_as_a_test_and_no_record_question` still say a note enters as `provvisoria`. `memory_distillation_stays_manual_for_now` has premises that `td` already solved. Replace the three with the decision on the timer. The roadmap line on the decay of `provvisoria` notes goes with them.
- [ ] **Wiki:** clean this page: drop the `### cockpit` section (all struck), and drop the `[x]` lines, since git is the log.

## Cross-references

- [index](index)
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — system overview