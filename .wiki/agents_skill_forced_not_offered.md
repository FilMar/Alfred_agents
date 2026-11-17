---
tags: [agents, th, skills, delegation]
sources: [conversation, tools/alfred/src/command/cli.rs, tools/alfred/src/command/skill.rs, tools/alfred/src/command/spec.rs, tools/alfred/src/command/archive.rs, skills/annibale/SKILL.md]
---

## Decision

`alfred command run --skill <name>` puts a skill's whole text in the run's system prompt. The skill is then a constraint, not a request.

- `--hat` and `--skill` are both optional and at least one is required. A run can be a way of thinking, a procedure, or both.
- The block carries the skill's base directory, so its own relative references resolve: `<skill name="..." location="...">`, then where to resolve from, then the file.
- A skill goes **last** in the prompt, after the role and the hat: it is the procedure, and a procedure outranks a way of thinking.
- The run is named after the hat, or after the skill when it wears none. That name is the `actor` of the archived row, and the forced skill is recorded in `meta.skill`.
- A skill is still never a value for `--hat`, and the old route — naming the skill in the task text — still works. It is now the weaker of the two.

## Why

Before this, a delegated run used a skill by being asked to: *"use the christopher skill to retrieve…"*. That is a sentence in the task, and a model can read the file partially, skip it, or improvise the protocol — and nothing downstream would show it. An unobservable failure mode is the worst kind, because the output still looks like an answer.

Measured on a real run: forcing `efesto` cost **6,380 input tokens**, the skill's actual text. `formatSkillsForPrompt`, the function pi uses for discovery, would have added about one line: name, description, and an invitation to read the file. The run may not even have the tool to read it. That gap between a catalogue entry and the protocol itself is the whole difference between offering and forcing. Asked which skill it had been given, the run answered with its name and nothing else.

There is a second gain, in the shape of a rule. The old rule was a prohibition: *never pass a skill name as `--member`*. A prohibition has to be remembered every time, and the thing it forbids is the obvious thing to try. Now there is a flag with the skill's name on it, so the rule becomes *where a skill goes*, which needs no remembering.

alfred looks for `<name>/SKILL.md` in two folders, in this order: `.pi/skills` of the project, then `~/.pi/agent/skills`. These are the folders pi reads skills from. A wrong name is answered with `Skill "<name>" not found`.

One hazard stays, and code does not solve it. A skill that writes becomes unattended when forced into a detached run. `omero`, for example, writes wiki pages. The gate those skills describe lives in their text, not in `alfred command`.

## Cross-references

- [agents_hats_replace_members](agents_hats_replace_members) — the run this flag is added to, and why a skill is not a hat
- [skill_convention_direct_cli](skill_convention_direct_cli) — the router shape that makes a skill's text worth injecting whole
- [memory_delegated_run_is_a_pi_subtask](memory_delegated_run_is_a_pi_subtask) — where `meta.skill` ends up
