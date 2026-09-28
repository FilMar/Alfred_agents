---
tags: [agents, th, skills, delegation]
sources: [conversation, tools/th/src/prompt.ts, tools/th/src/cli.ts, skills/annibale/SKILL.md]
---

## Decision

`th run --skill <name>` puts a skill's whole text in the run's system prompt. The skill is then a constraint, not a request.

- `--hat` and `--skill` are both optional and at least one is required. A run can be a way of thinking, a procedure, or both.
- The block carries the skill's base directory, so its own relative references resolve: `<skill name="..." location="...">`, then where to resolve from, then the file.
- A skill goes **last** in the prompt, after the role and the hat: it is the procedure, and a procedure outranks a way of thinking.
- The run is named after the hat, or after the skill when it wears none. That name is the `actor` of the archived row, and the forced skill is recorded in `meta.skill`.
- A skill is still never a value for `--hat`, and the old route — naming the skill in the task text — still works. It is now the weaker of the two.

## Why

Before this, a delegated run used a skill by being asked to: *"use the christopher skill to retrieve…"*. That is a sentence in the task, and a model can read the file partially, skip it, or improvise the protocol — and nothing downstream would show it. An unobservable failure mode is the worst kind, because the output still looks like an answer.

Measured on a real run: forcing `efesto` cost **6,380 input tokens**, the skill's actual text. `formatSkillsForPrompt`, the function pi uses for discovery, would have added about one line — name, description, and an invitation to read the file with a tool the run may not even have. That gap between a catalogue entry and the protocol itself is the whole difference between offering and forcing. Asked which skill it had been given, the run answered with its name and nothing else.

There is a second gain, in the shape of a rule. The old rule was a prohibition: *never pass a skill name as `--member`*. A prohibition has to be remembered every time, and the thing it forbids is the obvious thing to try. Now there is a flag with the skill's name on it, so the rule becomes *where a skill goes*, which needs no remembering.

The mechanism is pi's own: `loadSkills` finds every skill this machine and this project offer, the same way the interactive agent does, so the names accepted here are exactly the names that work elsewhere and a wrong one is answered with the full list.

One hazard stays, and is not solved by code: a skill that writes — `mose` needs explicit confirmation, `platone` consolidates, `clio` moves backups — becomes unattended when forced into a detached run. The gate those skills describe lives in their text, not in `th`.

## Cross-references

- [agents_hats_replace_members](agents_hats_replace_members) — the run this flag is added to, and why a skill is not a hat
- [skill_convention_direct_cli](skill_convention_direct_cli) — the router shape that makes a skill's text worth injecting whole
- [memory_th_run_files_its_own_row](memory_th_run_files_its_own_row) — where `meta.skill` ends up
