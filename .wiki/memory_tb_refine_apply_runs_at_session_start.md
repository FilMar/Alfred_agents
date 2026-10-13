---
tags: [memory, tb, refine, hook]
sources: [tools/tb/SPEC.md@78af67d, tools/tb/REVIEW.md@78af67d, conversation]
---

## Decision

`tb refine --apply` runs detached at the start of every Claude Code session (hook `SessionStart`, source `startup`) and every pi session (event `session_start`). It is silent and exits with 0. The files are in `extensions/tb_refine`.

There is no check on the time since the last run.

The switch is not set. For Claude Code it is a `SessionStart` entry in `~/.claude/settings.json`, which the user adds after the January 2027 reading of the hit rate. For pi it is the extension link that `setup.sh` makes.

## Why

The run costs half a second and is idempotent, so a check on the interval would add a second state (the time of the last run) for no gain.

The Curator of Hermes Agent has the same shape: use counters, thresholds in days, a reversible archive, no automatic delete. It checks 168 hours since the last run and 2 hours idle, because its run can be an LLM review. Hindsight has no forgetting at all. See [the Curator docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/curator) and [the Hindsight paper](https://arxiv.org/html/2512.12818v1).

The first wave is 164 notes on 2027-01-18. With the entry in `settings.json` they would be archived at the first session start after that day. So the entry goes in after the parameters are fixed.

Known limit: two sessions opened together can run two rounds. The `archived_at` of a note may then be the second instant.

Rejected: a counter of 50 exchanges in the hook, which would be a second copy of the pending count that `tl` already owns; and a timer, which the user chose not to use.
