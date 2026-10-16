---
tags: [memory, episodic, hook, refine]
sources: [.design/memory.md@0e0a366, conversation]
---

## Decision

`tb refine` never touches the episode collection. There is no trust, no archive and no delete for episodes.

The hook never injects episodes. The agent finds them when it needs them, with `tl search`.

## Why

The episode memory is small: one summary and one embedding per episode. It is the only record of what was done and when. A user asks about it months later, so forgetting by disuse would delete what the user asks for.

A judge read 39 turns and found no link to the answer in 85% of the injected notes. Episodes would add the same noise. A search the agent starts itself costs nothing when it is not needed.

## Cross-references

- [memory_hook_injects_only_the_text_the_agent_uses](memory_hook_injects_only_the_text_the_agent_uses) — the measurement
- [memory_refine_archive_hides_from_hook_only](memory_refine_archive_hides_from_hook_only) — how the archive of `tb` works
- [memory_episode_index_belongs_to_tl](memory_episode_index_belongs_to_tl) — who owns the collection
