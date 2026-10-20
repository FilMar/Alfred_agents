---
tags: [pi, roadmap, tasks]
sources: []
updated: 2026-10-19
---

A block is one run of ritchie (code) or efesto (skill). [A] is architecture: small, read it closely in review. [M] is mechanical: big, the first piece shows the rest.

Only the next goals have blocks. When a goal is done, pick the next one from Ideas and cut it into blocks then.

## Goal 1: memory curates itself

Order: the design first, then the rest.

- [ ] [A] Design of Aristotele as curator of `tb` and `ti`, with Piano. It replaces the idea of `tb link`. [detail](memory_tb_link_is_a_possible_architecture_that_replaces_aristotele_with_vector_candidates_and_one_llm_judge)
- [ ] [A] `tb merge`: one note absorbs another and keeps its refs.
- [ ] [A] Several triggers for one `ti` rule.
- [ ] Measure which rules the real prompts in `tl` cannot reach.
- [ ] [M] The HTML report of a curation run.
- [ ] Rewrite the Aristotele skill with efesto. [detail](skill_census_platone_and_mose_removed_td_writes)

## Goal 2: td can be trusted

- [ ] A timeout on the model calls of `td`. [detail](memory_td_distills_by_itself_at_session_start)
- [ ] [A] The critic drops a rule that is too generic.
- [ ] [A] An `append` must fit the `if` of its rule.
- [ ] `td` reads `tb guide` and `ti guide`. [detail](skill_quality_guides_are_printed_by_tb_guide_and_ti_guide)

## Goal 3: clean-up

- [ ] [M] Put `tests/` in a `tsc` project. Drop the `client.ts?extractions` import trick. [detail](memory_clients_read_their_url_per_call)
- [ ] [A] Ritchie `check_body_diff.py` ignores a `return` inside a nested function.

## Ideas

One line each. An idea becomes blocks only when it is the next goal.

- Scale the session cap with its exchanges, and record the skipped ones. [detail](memory_td_session_cap_limits_one_session)
- A guard for tag synonyms in `td`, after reading the proposed tags. [detail](memory_td_candidates_keep_known_tags_and_propose_new_ones)
- `td` phase 3: bridges between saved notes. [detail](memory_bridges_by_shape_are_judged_by_reading)
- A rebuild mode for the episode index. [detail](memory_episodes_fill_from_the_normal_distill_run)
- `browse` and `random` print text, as `search` does. [detail](memory_search_prints_text_blocks_by_default)
- A limit on the extractions API and on `tl extractions`.
- One home for `requireServices`, or leave it. [detail](style_shared_modules_live_in_tools_common_one_folder_for_contract_cli_and_tags)
- The distiller runs on the Rasp. It needs Ollama there. [detail](memory_td_distills_by_itself_at_session_start)
- A test for the hook script of the distiller. [detail](memory_td_distills_by_itself_at_session_start)
- `th` cleans up zombie processes.
- Ritchie: the mutant run as a script; a fixture helper; contract messages carry values; an integration net. [detail](skill_ritchie_contract_messages_carry_values)
- Annibale: named experts in `.expert/`. [detail](skill_annibale_runs_a_debate_of_made_up_viewpoints)
- Router pass: multi-direction skills become dispatch tables. [detail](skill_router_pass_planned)
- Socrate becomes a `ti` principle. [detail](skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood)
- The piano rule in `ti` covers new features too. [detail](skill_piano_writes_design_main_md)
- Census of the skills not yet judged: feynman, indiana, polo and the rest.

## Design

To discuss with Piano before any block.

- analisi: `.design/analisi.md`. `polo` reads sources. Missing: official and independent sources, the chart (`atlante` is in git), the stop when there are none. The expense CSV (`.bank.csv` in `essays`, read with `xan`) is a case too. On request only, or a monthly summary.
- memory: discuss `.design/memory.md`.
- Procedural memory: learn from outcomes of hats and skills, metrics per hat. [detail](memory_procedural_memory_grows_on_data)
- From the MCP audit: a JSON Schema layer for CLI output, a command whitelist with audit log, the binary trigger rule and an MCP shim for `ti`. [detail](core_mcp_not_adopted_cli_json_schemas_first)

## Watch

Measures, trials and work gated by a date or a size.

- `tb refine`: read the hit rate, then fix weights, half-life and the 0.2 threshold before 2027-01-18. [detail](memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known)
- `tb refine`: delete a note archived with no signal for a year. Not before 2027-09-21. [detail](memory_tb_refine_a_note_is_deleted_when_it_is_archived_and_has_had_no_signal_for_a_year_with_a_log_line_first)
- `tb refine`: store a `trust` field only once a reader needs it. [detail](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing)
- `ti refine`: read the archived rules of the first runs, from mid-February 2027. [detail](memory_ti_gets_hits_and_refine_exactly_like_tb)
- Count the twins with the cutoff 0.75. Lower to 0.72 if twins pass, raise it if different ideas drop. [detail](memory_td_same_session_cutoff_drops_twins)
- Find clusters of near notes in one session, for example siblings above 0.55. [detail](memory_td_session_cap_limits_one_session)
- Check the minimum score 0.30 of `tl search` on more episodes. [detail](memory_episode_search_filters_the_period_in_qdrant)
- Run the judge and decay spikes again with the new hook text. Compare with the 4.4% of clear dependence. [detail](memory_hook_injects_only_the_text_the_agent_uses)
- Try in a real session: the `tb_refine` hooks, the pi extension of the distiller, `extensions/tb_ti/pi.ts`.
- A `datetime` payload index on `tl_episodes`, if the search gets slow. [detail](memory_episode_search_filters_the_period_in_qdrant)
- A short id of 12 characters when the notes pass 10 000. [detail](memory_search_prints_text_blocks_by_default)

## Cross-references

- [index](index)
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — system overview
