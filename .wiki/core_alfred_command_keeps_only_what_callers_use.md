---
tags: [core, alfred, command, scope, th]
sources: [conversation, spec.json@4246539, tools/alfred/src/command/cli.rs, tools/alfred/src/command/hats.rs]
---

## Decision

`alfred command` keeps only what the real callers of `th` use. Those callers are `debate.sh` (annibale), `test_skill.sh` (efesto) and `th_write.sh` (ritchie). The kept parts:

- `run`, with `--hat`, `--skill`, `--system`, `--tools`, `--thinking`, `--model`, `--timeout`. Part B adds `--detach`;
- `wait`, in part B;
- `hats list` and `hats get`.

`history`, `get`, `models`, `archive-pending` and `sandbox-exec` are dropped.

The six hats are compiled into the binary with `include_str`. A run needs a hat, a skill, or both. The label is the hat, else the skill: ASCII letters, digits, `-` and `_`, never empty. The system prompt is the role, the hat and the skill block, in this order, joined by `---`.

The port is split in two. Part A is the foreground run. Part B is the archive to hist, the spool, `--detach`, `wait` and `--no-archive`.

## Why

**No caller, no code.** The dropped commands have no caller in the skill scripts.

**Hats are fixed.** There are six, and they never change at runtime. A folder that alfred reads at runtime, plus `TH_HATS_DIR`, would be state with no use.

**The label names files in `/tmp`.** Unicode letters were allowed by the first body. They go into file names, so the rule is ASCII.

**Two parts.** The whole spec had 12 entities and 12 flows. That was too big for one review round. Part A runs with no network, and it already serves every foreground caller.

## Cross-references

- [core_alfred_command_runs_pi_as_a_child_in_bwrap](core_alfred_command_runs_pi_as_a_child_in_bwrap) — how a run executes
