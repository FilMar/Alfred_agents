---
tags: [memory, tb, refine, trust, hits]
sources: [conversation, tools/alfred/src/rules/store/mod.rs, tools/alfred/src/rules/refine.rs, tools/alfred/src/distill/decide.rs, extensions/rules/claude.sh, tools/tb/src/notes.ts@last-typescript, tools/td/src/neighbours.ts@last-typescript]
replaces: [memory_tb_refine_hits_count_retrieval_not_use_and_start_on_2026_09_21@51a1810, memory_tb_refine_trust_measures_vitality_not_quality_so_the_archive_comes_before_any_delete@c1dbd73]
---

## Decision

`trust` measures if a rule is alive. It does not measure if the rule is true, useful or right. The signal is a hit, and a hit says the note was retrieved, not used. So a low `trust` is a reason to archive, never a proof that the rule is bad, and the archive comes before any delete. Quality is an open problem: no signal for it exists in the first pass.

What counts as a hit:

- Every rules search counts one hit on each result, in `hits` and `last_hit`. Rules have no refs, so there are no related hits.
- The hook on every prompt counts. So do the searches of the agent and of the skills, and the HTTP API, where `hits` is true by default.
- The distiller in `alfred serve` does not count (`hits: false`). `alfred rules list` does not count. `--no-hits` turns it off for one search.
- The counters of the rules exist since 2026-10-20. Zero hits before that date means no measure, not no use.

`alfred rules refine` reads the counters as they are. It adds no field for distinct hit days and none for who searched. The cap of 10 limits the damage. A distinct-day counter is the first field to add if the cap proves too weak.

## Why

On 2026-10-11, on the 793 notes of `tb`, the signal was useful and noisy. 201 notes had no hit, and about 156 of them were made between May and July. The most hit provisional note, with 14 hits, is about `td`. It separates used notes from the others well enough to start.

The noise: the hook injects every match above 0.5 and the agent may ignore it. A project that works on its own tooling inflates its own notes. The hook and a search by the agent in one turn give two hits for one use.

Two cases break the number:

- A wrong or old note that matches many queries keeps a high `trust`.
- A good note on a rare topic sits at zero hits and falls under 0.2.

The second case is why the archive comes first. Hiding a note loses nothing. Deleting it can lose the only copy.

Three signals could measure quality. None is built, and none is a decision:

- The agent names the notes it used. It costs one step per answer and relies on the agent being honest.
- The user corrects the agent after a note was injected. It is the strongest signal, and the distiller would read it from `alfred hist`.
- A periodic critic reads the notes with low `trust`. It costs model calls and it saves good rare notes.

The first dry run is the test. If the notes under 0.2 include notes the user knows are good, a second signal is needed.
