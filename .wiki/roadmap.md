---
tags: [pi, roadmap, tasks]
sources: []
updated: 2026-11-17
---

A block is one run of ritchie (code) or efesto (skill). [A] is architecture: small, read it closely in review. [M] is mechanical: big, the first piece shows the rest.

Only the next goals have blocks. When a goal is done, pick the next one from Ideas and cut it into blocks then.

## alfred v2: distill, command, deploy and switch

The distiller and `th` move into alfred. Then the server goes on the Deck, and every caller moves in one pass. [detail](core_alfred_v2_one_binary_serve_on_the_deck)

- [M] `alfred command` tests that close two gaps: pi dies after the timeout, read through the `.pid` file [detail](core_alfred_command_runs_pi_as_a_child_in_bwrap); a sent spool file leaves, with a `Client::at(url)` for tests [detail](core_alfred_command_files_each_run_in_hist_with_a_spool). Parts A and B are done.

## Ideas

One line each. An idea becomes blocks only when it is the next goal.

- Start and follow chats and `alfred command` runs from the phone, through the `alfred serve` API: the Deck is a client too.
- The session failure `split failed` carries the reason of the answer: an Ollama quota error looks like a bad model answer today.
- Scale the session cap with its exchanges, and record the skipped ones. [detail](memory_distill_has_no_session_cap)
- A guard for tag synonyms in the distiller, after reading the proposed tags. [detail](memory_td_candidates_keep_known_tags_and_propose_new_ones)
- A rebuild mode for the episode index. [detail](memory_episodes_fill_from_the_normal_distill_run)
- `browse` and `random` print text, as `search` does. [detail](memory_search_prints_text_blocks_by_default)
- A limit on the extractions API and on `alfred hist extractions`.
- One home for `requireServices`, or leave it.
- A generic runner of scheduled jobs inside `alfred serve`, agentic or not: sort the mail, check the state of the Deck. It may meet the `tp` design below.
- Fix the generic rules that score 0.5-0.6 on every prompt. To find them, run the search on 50 real prompts from `alfred hist prompts`: a rule that matches more than half of them has an `if` that is too wide. [detail](memory_tb_dropped_vault_holds_shared_knowledge)
- A quality signal for the rules, from the user's corrections. The distiller reads the rules of a turn from `injections` and the correction in the next turn. It gives each injected rule one verdict: `ignored`, `partial` (the skill started, its steps were skipped), `harmful` or `unrelated`. The count sits next to `hits`. To Piano first. [detail](memory_refine_hits_measure_retrieval)
- The hook prints the `if` of each rule, so the agent can drop a rule that is out of context. [detail](memory_hook_injects_only_the_text_the_agent_uses)
- `setup.sh` is executable in git, so `./setup.sh` runs on a fresh checkout.
- `injections` for pi: read how a pi transcript stores the hidden rules message, then file it the same way. [detail](memory_hist_keeps_the_rules_injected_in_each_exchange)
- Trigger evals for the skills: a file of real prompts per skill with the skill expected, and prompts where no skill starts. A script runs each prompt and prints `PASS` or `FAIL`.
- Protocol evals for the skills: the required steps of a skill appear among the commands of the run. First case: polo calls `openalex.py` when the question asks for studies.
- Drop empty episodes from `alfred hist search`. [detail](memory_tb_dropped_vault_holds_shared_knowledge)
- A test for the hook script of the distiller. [detail](memory_distill_starts_on_ingest_by_threshold)
- `alfred command` cleans up zombie processes.
- Ritchie: the mutant run as a script; a fixture helper; contract messages carry values; an integration net. [detail](skill_ritchie_contract_messages_carry_values)
- Annibale: named experts in `.expert/`. [detail](skill_annibale_runs_a_debate_of_made_up_viewpoints)
- Router pass: multi-direction skills become dispatch tables. [detail](skill_router_pass_planned)
- Socrate becomes a rule principle. [detail](skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood)
- The piano rule covers new features too. [detail](skill_piano_writes_design_main_md)
- Spec view: a layout that stays readable with 15 entities and 20 flows. [detail](skill_ritchie_spec_is_shown_not_written)
- Spec view: find CLI calls without a regex per tool, so a call like `bun <path> distill` is not missed. [detail](skill_ritchie_review_shows_plan_against_built)
- Census of the skills not yet judged: feynman, indiana, polo and the rest.
- Skill text in ASD-STE100: instructions in the imperative, 20 words for steps, 25 for prose, a project word list. Check it with the STE term checker on LanguageTool, if it runs locally. Draft: `git show 3ba89be:STANDARDS.md`.
- A checklist system: lists made from real failures, `PASS` or `FAIL` with a proof, a log for pruning. Draft: `git show 3ba89be:STANDARDS.md`.
- Critical rules stay in CLAUDE.md as `<important if>` blocks, for when the hook is down. [detail](skill_humanlayer_skills_not_adopted_ideas_kept)
- Ritchie: external data is parsed once at the boundary. [detail](skill_ritchie_may_parse_external_data_at_boundary)
- Ritchie: a cast only right after an assert that proves it. [detail](skill_ritchie_may_allow_casts_only_after_assert)
- A TypeScript linter in `pi`, with a few anti-slop rules. [detail](style_pi_may_lint_typescript_with_oxlint)

## Design

To discuss with Piano before any block.

- analisi: `.design/analisi.md`. `polo` reads sources. Missing: official and independent sources, the chart (`atlante` is in git), the stop when there are none. The expense CSV (`.bank.csv` in `essays`, read with `xan`) is a case too. On request only, or a monthly summary.
- memory: discuss `.design/memory.md`. It says "Io non la curo", "Non è ciò che so io" and "Non è un wiki che leggo io". The v2 memory contradicts these lines: the vault is written with the user. [detail](memory_tb_dropped_vault_holds_shared_knowledge)
- Procedural memory: `tp`, a runner of procedures (decided 2026-10-20, shape still moving, so no decision page yet). A procedure is a script in a folder; the folder is the registry, there is no register command. The script does the deterministic steps and asks `alfred command run` one structured question where judgment is needed: one branch per verdict, no loop. Every run writes a row in `alfred hist` with its outcome, so skill telemetry comes from the runner. Two sources of procedures: a flow over `alfred hist` that finds the operations done often and proposes the script; the agent itself, when it sees that a script it just wrote is generic, saves it in `tp`. The trigger is a rule whose `do` says `tp run <name>`. Use is the judge: a procedure never run again is archived like a note. Runs under the `alfred command` bwrap profile. Replaces the "tb note of kind protocollo" step in [detail](memory_procedural_memory_grows_on_data); that page is rewritten when the design ends. To Piano first.
- From the MCP audit: a JSON Schema layer for CLI output, a command whitelist with audit log, the binary trigger rule and an MCP shim for `alfred rules`. [detail](core_mcp_not_adopted_cli_json_schemas_first)

## Watch

Measures, trials and work gated by a date or a size.

- `alfred rules refine`: read the archived rules of the first runs, from 2026-11-29. [detail](memory_ti_gets_hits_and_refine_exactly_like_tb)
- Count the twins with the cutoff 0.75. Lower to 0.72 if twins pass, raise it if different ideas drop. [detail](memory_td_same_session_cutoff_drops_twins)
- Find clusters of near rule candidates in one session, for example siblings above 0.55. [detail](memory_distill_has_no_session_cap)
- Check the minimum score 0.30 of `alfred hist search` on more episodes. [detail](memory_episode_search_filters_the_period_in_qdrant)
- Run the judge and decay spikes again with the new hook text. Compare with the 4.4% of clear dependence. [detail](memory_hook_injects_only_the_text_the_agent_uses)
- A `datetime` payload index on `tl_episodes`, if the search gets slow. [detail](memory_episode_search_filters_the_period_in_qdrant)
- A short id of 12 characters when the rules pass 10 000. [detail](memory_search_prints_text_blocks_by_default)

## Cross-references

- [index](index)
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — system overview
