---
tags: [skill, piano, design, omero]
sources: [conversation, skill_piano_is_rigid_and_poorly_joined_to_omero_and_its_fate_is_open.md@bbe04b6]
replaces: [skill_piano_is_rigid_and_poorly_joined_to_omero_and_its_fate_is_open@bbe04b6]
---

## Decision

`piano` stays. Its output changes: it writes use cases in `.design/`, not README, justfile and CLAUDE.md.

- `.design/main.md` is the whole project. A sub-project gets `.design/<name>.md`. Every file has the same shape: purpose, users, `Cosa NON è`, use cases. Italian, under 40 lines.
- A use case is one line: who does what, what they get. Nothing technical, no status. Order matters: the first line is the smallest complete project.
- An unknown is marked `[da chiarire]`. A line the user did not say is marked `[proposta di Piano]` until they confirm it.
- A part is a sub-project only if it has its own users or its own `Cosa NON è`. There are no sub-sub-projects. Only `main.md` lists sub-projects. A sub-project over 40 lines is cut, or split in two at the same level.
- Piano runs for new features too. It reads `main.md` first and debates how the feature fits with the existing use cases. A small change is said in chat and does not touch the files.
- Sub-projects are named like the wiki topic that holds their decisions.

## Why

The three files `piano` wrote are boilerplate. The value is the dialogue, and a use-case file is the one artifact no other tool produces: what the project does, seen by who uses it. It also lets the user keep the project in mind.

`omero` owns the wiki, so `piano` does not fold into it: debating a project and keeping a wiki are two jobs.

Taken from other tools: Superpowers `brainstorming` (size the work first, play back in chunks, mark the agent's own guesses) and Spec Kit (mark unknowns instead of guessing). Left out: entities, requirements, success criteria and Given/When/Then, because they are technical and the user must read the file in one go. 37signals warns that a pitch with every detail has become a spec.

## Cross-references

- [skill_omero_debates_design_before_decisions](skill_omero_debates_design_before_decisions) — the step after `piano`
