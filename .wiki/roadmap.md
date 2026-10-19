---
tags: [pi, roadmap, tasks]
sources: []
updated: 2026-10-16
---

## Tasks

One line per task. The reason and the plan live in the linked decision.

### tools

- [ ] P0: JSON Schema contract layer for tb/ti/th/tl CLI output, CI-checked. [detail](core_mcp_not_adopted_cli_json_schemas_first)
- [ ] P1: scoped command whitelist and audit logging for shell invocations (prompt injection mitigation). [detail](core_mcp_not_adopted_cli_json_schemas_first)
- [ ] P1: fix SQLite race conditions and zombie process cleanup in th. [detail](core_mcp_not_adopted_cli_json_schemas_first)
- [ ] P2: write the binary trigger rule in ti (second independent client mounts tools → build MCP stdio shim). [detail](core_mcp_not_adopted_cli_json_schemas_first)

### memory

- [ ] Learn from outcomes: procedural memory for hats and skills. [detail](memory_procedural_memory_grows_on_data)
- [ ] Per-hat metrics, aggregated over time. [detail](memory_procedural_memory_grows_on_data)
- [ ] Distil the rest of the queue in batches of about 50 items, and read each batch. About 2 000 exchanges are left after the batches of 17 October, at 3 to 6 seconds per exchange, so 2 to 3.5 hours. [detail](memory_distiller_has_no_personal_data_filter)
- [ ] Count the `twins` of the next batches with the cutoff of 0.75. Lower it to 0.72 if twins pass, raise it if different ideas are dropped. [detail](memory_td_same_session_cutoff_drops_twins)
- [ ] Find the clusters of near notes in one session, for example by counting the siblings above 0.55. [detail](memory_td_session_cap_limits_one_session)
- [ ] Scale the cap of a session with its number of exchanges. [detail](memory_td_session_cap_limits_one_session)
- [ ] Record the exchanges that a full session skips. [detail](memory_td_session_cap_limits_one_session)
- [ ] Check the minimum score 0.30 of `tl search` on more real episodes. [detail](memory_episode_search_filters_the_period_in_qdrant)
- [ ] Add a `datetime` payload index on `from` and `to` of `tl_episodes`, if the search gets slow. [detail](memory_episode_search_filters_the_period_in_qdrant)
- [ ] Rediscuss `alfred.md` as a whole: what each system is, what the agent needs in context, what the rules already say. [detail](memory_agent_finds_episodes_through_a_ti_rule_and_alfred)
- [ ] A rebuild mode for the episode index, when the prompt of phase 0 changes. [detail](memory_episodes_fill_from_the_normal_distill_run)
- [ ] td: read the proposed tags in `extractions` (24 of 293 rows have some) and pick a guard for semantic tag synonyms. [detail](memory_td_candidates_keep_known_tags_and_propose_new_ones)
- [ ] ritchie `check_body_diff.py` reads a `return` inside a callback (a `sort` comparator) as one that skips a postcondition. Ignore returns in nested functions.
- [ ] Put `tests/` in a `tsc` project, so a type error in a test is caught.
- [ ] Drop the `client.ts?extractions` import trick in `tests/tl_extractions.test.ts`: the client now reads its url on each call. [detail](memory_clients_read_their_url_per_call)
- [ ] Pick a home for `requireServices`, still copied in the `tb` and `ti` CLIs. It needs `checkHealth` from `tb`, so it cannot go to `common`. Or leave it. [detail](style_shared_modules_live_in_tools_common_one_folder_for_contract_cli_and_tags)
- [ ] `tb refine`: delete a note archived with no signal for a year, log line first. Not before 2027-09-21. [detail](memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first)
- [ ] `tb refine`: read the hit rate, then fix the weights, the half-life and the 0.2 threshold before 2027-01-18. The hook now archives the first wave on its own. [detail](memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known)
- [ ] `tb refine`: tune the decay after 30 days of hits. [detail](memory_refine_hits_measure_retrieval)
- [ ] Import the history in batches with `--max-saved`. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing)
- [ ] Try the Claude Code `SessionStart` hook and the pi `session_start` event of `tb_refine` in a real session. They are only syntax-checked.
- [ ] `tb link`: ref candidates by vector, an LLM hat judges pairs, then retire aristotele. Possible design. [detail](memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge)
- [ ] `tb refine`: decide if a `trust` field is stored, once a reader needs it. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing)
- [ ] td: run two or three more sessions in shadow, then active, and tune.
- [ ] td: `append` can add a `do` that its rule's `if` does not cover. Make it prudent, or let `ti` edit a `do`.
- [ ] td: the critic lets a generic rule pass. Add a too-generic check for rules.
- [ ] td: one session saved two near-equal notes. The session list is not enough.
- [ ] td phase 3: bridges between saved notes. [detail](memory_bridges_by_shape_are_judged_by_reading)
- [ ] Retire platone, once the automatic run is trusted and its quality rules have a home. [detail](memory_td_distills_by_itself_at_session_start)
- [ ] Try the pi extension of the distiller in a real pi session. [detail](memory_td_distills_by_itself_at_session_start)
- [ ] Add a timeout to the model calls of `td`. [detail](memory_td_distills_by_itself_at_session_start)
- [ ] Run the distiller on the Rasp, so a long job survives a switched-off PC. It needs Ollama for the embeddings there. [detail](memory_td_distills_by_itself_at_session_start)
- [ ] Test the hook script of the distiller in the repo. [detail](memory_td_distills_by_itself_at_session_start)
- [ ] Add a limit to the extractions API, then to `tl extractions`.
- [ ] Run the judge and the decay spikes again after a week of use with the new hook text. Compare the 4.4% of clear dependence with the old format. [detail](memory_hook_injects_only_the_text_the_agent_uses)
- [ ] Give `browse` and `random` the text output and `--json` of `search`, if agents read them by eye. [detail](memory_search_prints_text_blocks_by_default)
- [ ] Use a short id of 12 characters when the notes pass 10 000. [detail](memory_search_prints_text_blocks_by_default)
- [ ] Try `extensions/tb_ti/pi.ts` in a real pi session. It is only type-checked.

### design

Each line is one sub-project of `.design/main.md`, to be discussed with Piano.

- [ ] analisi: discuss `.design/analisi.md`. `polo` reads sources. Missing: the search for official and independent sources, the chart (`atlante` is in git), and the stop when there are none. The expense CSV (`.bank.csv` in the `essays` repo, read with `xan`) is a case too, and the old `draghi` is in git. Decide if it runs on request only or with a monthly summary.
- [ ] memory: discuss `.design/memory.md` and finish the memory. The open work is in the `memory` section above.

### skills

- [ ] Router pass: shrink each multi-direction skill to a dispatch table. [detail](skill_router_pass_planned)
- [ ] Ritchie: contract messages carry the values, in all four languages, and `contract_report.py` checks the format. [detail](skill_ritchie_contract_messages_carry_values)
- [ ] Ritchie: add an integration net for code that turns errors into values. [detail](memory_td_edges_are_tested_on_in_memory_stubs_and_an_end_to_end_test_checks_the_stores)
- [ ] Annibale: save a viewpoint as a named expert in `.expert/` once it was reused, and call it by `:name`. [detail](skill_annibale_runs_a_debate_of_made_up_viewpoints)
- [ ] Ritchie: make the mutant run a script, not a hand step.
- [ ] Ritchie: test runs time out on files with heavy fixtures. Give the run a fixture helper.
- [ ] Census: judge the skills not yet judged, one by one.
- [ ] socrate: write the ti principle, then remove the skill. [detail](skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood)
- [ ] ti: extend the piano rule to new features, with mose. [detail](skill_piano_writes_design_main_md)
- [ ] Agree how the roadmap blocks are produced. [detail](skill_omero_debates_design_before_decisions)
- [ ] Quality guides: print from tb and ti, or keep in skills. [detail](skill_quality_guides_may_be_printed_by_tb_and_ti_instead_of_kept_in_skills)
- [ ] platone: before retiring it, give the note quality rules a home. [detail](skill_platone_may_retire_when_td_distill_runs_on_a_timer_and_its_quality_rules_must_outlive_it)

### cleanup

Found by an audit on 2026-10-13. Each line names the path that proves it.

- [ ] **Git:** pick the trunk. `origin/HEAD` points to `master`, last commit 2026-05-11. `main` is 316 commits ahead.
- [ ] **Git:** delete the 16 local branches already merged into `main`, and the same on origin.
- [ ] **Git:** review, then delete four old unmerged branches: `master`, `feature/alfred-pi`, `feature/cockpit-skeleton`, `refactor/no-more-agents`. Delete `origin/release` too.

## Cross-references

- [index](index)
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — system overview