---
tags: [pi, roadmap, tasks]
sources: []
updated: 2026-10-14
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
- [ ] Career coach: consult memory before each answer. No decision yet.
- [ ] Episode index over tl (`tl_episodes`, `tl search`), after the extraction pipeline is stable. [detail](memory_episode_summaries_are_a_derived_index_over_tl)
- [ ] td: read the proposed tags in `extractions` (24 of 293 rows have some) and pick a guard for semantic tag synonyms. [detail](memory_td_candidates_keep_known_tags_and_propose_new_ones)
- [ ] ritchie `check_body_diff.py` reads a `return` inside a callback (a `sort` comparator) as one that skips a postcondition. Ignore returns in nested functions.
- [ ] Put `tests/` in a `tsc` project, so a type error in a test is caught.
- [ ] Drop the `client.ts?extractions` import trick in `tests/tl_extractions.test.ts`: the client now reads its url on each call. [detail](memory_tl_client_reads_its_url_on_each_call_so_a_test_never_reaches_the_real_store)
- [ ] Pick a home for `requireServices`, still copied in the `tb` and `ti` CLIs. It needs `checkHealth` from `tb`, so it cannot go to `common`. Or leave it. [detail](style_shared_modules_live_in_tools_common_one_folder_for_contract_cli_and_tags)
- [ ] `tb refine`: delete a note archived with no signal for a year, log line first. Not before 2027-09-21. [detail](memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first)
- [ ] `tb refine`: read the hit rate, then fix the weights, the half-life and the 0.2 threshold before 2027-01-18. The hook now archives the first wave on its own. [detail](memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known)
- [ ] `tb refine`: tune the decay after 30 days of hits. [detail](memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21)
- [ ] Import the history in batches with `--max-saved`. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing)
- [ ] Try the Claude Code `SessionStart` hook and the pi `session_start` event of `tb_refine` in a real session. They are only syntax-checked.
- [ ] `tb link`: ref candidates by vector, an LLM hat judges pairs, then retire aristotele. Possible design. [detail](memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge)
- [ ] `tb refine`: decide if a `trust` field is stored, once a reader needs it. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing)
- [ ] td: run two or three more sessions in shadow, then active, and tune.
- [ ] td: `append` can add a `do` that its rule's `if` does not cover. Make it prudent, or let `ti` edit a `do`.
- [ ] td: the critic lets a generic rule pass. Add a too-generic check for rules.
- [ ] td: one session saved two near-equal notes. The session list is not enough.
- [ ] td phase 3: bridges between saved notes. [detail](memory_bridges_by_shape_are_judged_by_reading)
- [ ] Run `td distill --active` on its own, with no timer (the trigger is open), then retire platone. [detail](memory_distillation_stays_manual_for_now)
- [ ] Add a limit to the extractions API, then to `tl extractions`.

### th

- [ ] Add the HTTP entry point to run agents. [detail](th_http_api_scoped_no_db)

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
- [ ] Census: judge the 16 skills not yet judged, one by one.
- [ ] socrate: write the ti principle, then remove the skill. [detail](skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood)
- [ ] vinci: rework as Typst documents with templates. [detail](skill_vinci_may_become_a_typst_documents_skill_with_templates)
- [ ] omero: add the design debate operation (reads `.design/`, writes decisions and blocks after the user agrees). [detail](skill_omero_debates_design_before_decisions)
- [ ] ti: extend the piano rule to new features, with mose. [detail](skill_piano_writes_design_main_md)
- [ ] Agree how the roadmap blocks are produced. [detail](skill_omero_debates_design_before_decisions)
- [ ] Quality guides: print from tb and ti, or keep in skills. [detail](skill_quality_guides_may_be_printed_by_tb_and_ti_instead_of_kept_in_skills)
- [ ] platone: before retiring it, give the note quality rules a home. [detail](skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it)

### cleanup

Found by an audit on 2026-10-13. Each line names the path that proves it.

- [ ] **Git:** pick the trunk. `origin/HEAD` points to `master`, last commit 2026-05-11. `main` is 316 commits ahead.
- [ ] **Git:** delete the 16 local branches already merged into `main`, and the same on origin.
- [ ] **Git:** review, then delete four old unmerged branches: `master`, `feature/alfred-pi`, `feature/cockpit-skeleton`, `refactor/no-more-agents`. Delete `origin/release` too.
- [ ] **Wiki:** `memory_human_gate_is_the_bottleneck` and `memory_critic_is_f_textbook_as_a_test_and_no_record_question` still say a note enters as `provvisoria`. `memory_distillation_stays_manual_for_now` has premises that `td` already solved. Replace the three with the decision on the timer. The roadmap line on the decay of `provvisoria` notes goes with them.

## Cross-references

- [index](index)
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — system overview