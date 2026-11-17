---
tags: [memory, rules, refine, archive, search, hook]
sources: [conversation, extensions/rules/claude.sh, tools/alfred/src/rules/refine.rs, tools/alfred/src/rules/store/curation.rs, tools/alfred/src/rules/store/mod.rs, tools/tb/src/refine.ts@last-typescript]
replaces: [memory_tb_refine_an_archived_note_is_left_out_of_the_hook_only_and_a_deliberate_search_still_finds_it@89f7ae3, memory_tb_refine_the_archive_is_not_a_deletion_queue_because_a_deliberate_search_revives_a_note_and_the_hook_never_does@e3c3ec1, memory_tb_refine_apply_owns_archived_at@89f7ae3]
---

## Decision

A rule with `trust` under 0.2 is archived. Archived means only that. Nothing moves and nothing is deleted. The rule keeps its content.

- **One owner.** Only `alfred rules refine --apply` writes and clears `archived_at`, an ISO instant. A rule that already has it keeps it, so the moment of the first archive stays. After a run, a rule has `archived_at` if and only if its trust is under 0.2. A hit on an archived rule does not clear it. The next run does.
- **Two requests, not one per rule:** `set_payload` for the rules to archive, and one `delete_keys` for the rules to restore. In the old `tb`, reading and computing 798 notes took about 0.55 seconds on 2026-10-13.
- **The hook leaves archived rules out.** The hook passes `--no-archived` to `alfred rules search`. It is one `is_empty` condition on `archived_at`. The distiller does not use it: a candidate equal to an archived rule is a duplicate ([memory_distill_neighbours_include_archived_rules](memory_distill_neighbours_include_archived_rules)).
- **A deliberate search still finds them.** An `alfred rules search` by the agent finds an archived rule, and the hit counts as a signal. On the next run `trust` is computed again. At 0.2 or more, `archived_at` is cleared and the hook injects the rule again. The hook never revives a rule, because it gives archived rules no hit.
- So the archive is not a deletion queue. A rule can leave it.

The threshold of 0.2 is by eye. See [memory_tb_refine_threshold_and_half_life_are_not_fixed_before_the_hit_rate_of_november_and_december_is_known](memory_tb_refine_half_life_is_30_days).

## Why

Keeping a rule costs almost nothing. The cost is noise, and the noise lives in the hook, which injects at every prompt. A deliberate search is read by an agent that reasons, and it is where a good rule on a rare topic is found.

A hit measures retrieval, not value. A good rule on a rare topic can sit at zero hits. Leaving it out of the hook loses nothing.

If the search cleared the key at the hit, there would be two writers of one fact, and they would drift. Waiting for the next run costs little.

A hook hit is a weak signal: the hook injects every match above 0.3 and the agent may ignore it. A revival that comes only from a deliberate search is closer to a real use.

Risk: in a deliberate search, archived rules compete with live ones by cosine alone, because `trust` never touches the score.

Lost: hiding archived rules from all search. It closes the way back, because nobody asks for the archive by chance. It would also need two changes, a hide by default and an option.

Limit: it is still retrieval, not value. `alfred rules refine` deletes nothing: an archived rule stays until someone deletes it by hand.
