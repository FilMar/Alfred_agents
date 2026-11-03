---
tags: [skill, external, humanlayer, idea, ritchie, indiana, efesto, linus, hook]
sources: [conversation, "https://github.com/humanlayer/skills"]
---

## Decision

No skill from `humanlayer/skills` is installed. `rpi` overlaps piano, indiana and ritchie. It also runs only when called by name, so a `ti` rule cannot route to it. The two control-loop skills and `narrow-react-prop-types` do not fit current needs.

Five ideas are kept. They are ideas, not rules. Nothing is changed yet.

- **`<important if>` as a static fallback.** `improve-claude-md` wraps rules in `<important if="condition">` blocks. `ti` does the same thing dynamically through the hook. When Qdrant is down, the hook injects nothing. The few critical rules (git, language, no simulation) could stay in CLAUDE.md as conditional blocks.
- **Research questions apart from research.** `rpi` first writes the questions about the current system. A fresh context then answers only those, with `file:line` evidence, without knowing the planned change. This avoids research that confirms a hypothesis. Section headers state a finding ("Workers restore pending jobs before new work"). Tests read are kept apart from checks run. Home: indiana, or the spec step of ritchie.
- **Use the real name.** `rpi/references/prose.md` bans made-up labels and an unclear "it". Home: the easy-English rule in efesto.
- **Structural diffs.** `show-me` shows a change as a `diff` of a component tree, call tree or file tree.
- **A PR template.** `visual-pr`: why in one sentence, one to three warnings, a structural outline. Home: linus. The skill itself commits and pushes on its own, against the user's git rules.

## Why

The repo was read on 2026-11-03. The value is in a few moves, not in the skills. Installing `rpi` next to piano and ritchie gives two research-design-build pipelines that fight.

## Cross-references

- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — the dynamic injection the fallback backs up
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — what a `ti` rule is
