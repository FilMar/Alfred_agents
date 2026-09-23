---
tags: [wiki, meta, structure, omero]
sources: [.wiki/wiki_decision_chain_structure.md, conversation]
replaces: [.wiki_decision_chain_structure]
---

## Decision

A superseded decision is **renamed with a leading dot**: `.<topic>_<slug>.md`. It is never deleted and never edited. Links that point at it keep the dot in the target: `[Text](.old_decision)`, and so does the `replaces` field of the decision that killed it.

The rest of the decision-chain model stands as it was set on 2026-09-18, restated here so this page is the whole rule and not a patch:

- One decision per file, named `<topic>_<slug>.md` (lowercase, underscore). The topic is the shared prefix; `Glob .wiki/<topic>_*.md` lists every live decision on it.
- A decision file is never edited once written. A change of course is a new file with `replaces:` naming the old one. A decision is **live** when no other decision names it in `replaces`.
- Structure: real YAML frontmatter (`tags`, `sources`, `replaces`), then `## Decision`, `## Why`, `## Cross-references`.
- The wiki records the **why**; the code is the **what**. A design target with no code yet is the one case where the decision is also the state.
- Special pages, mutable: `index` (catalogue of live decisions) and `roadmap` (task list). **There is no log: git history is the log.**
- Rejected alternatives fold into `## Why`. They do not get their own file.

## Why

Dropping a dead page out of `index.md` hides it from a reader who starts at the index. It hides it from nobody else. The evidence was in this wiki: `.graph_note_workbench_direct_manipulation` sat superseded with no mark on it at all, reading as current to anyone who met it by search. Three older dead pages carried a `superseded` tag and a line in the body instead — a second, informal convention, and one that was added by editing a file this wiki calls immutable. Two conventions, neither enforced.

A leading dot fixes it at the layer that actually reads these files. `ls` skips it, `Glob` skips it, and **ripgrep skips hidden files by default** — so a grep of `.wiki/` returns live decisions only, with nobody having to remember a rule.

A subdirectory, `.wiki/archive/`, was the first proposal and lost on that exact point: ripgrep walks into a normal subdirectory. It would have hidden dead decisions from the eye and left them in the path of every search. Its one advantage — a directory name says *why* the files are there — is worth less than that, and a line in the frontmatter says the same thing.

Deleting them was also considered. Git history would keep them, and this wiki already says git is the log. Rejected because a superseded decision stays useful to read: the cockpit's founding page explained a cost that shaped a later design months on. In `archive` or behind a dot you open it. In git history you excavate it.

Known cost, accepted: hidden files are skipped silently by tools that were never told about this rule — `cp *.md`, a static site generator, an export script. Git handles them fine.

## Cross-references

- [wiki_decision_chain_structure](.wiki_decision_chain_structure) — the chain model this restates and amends
- [agents_roster_lives_on_filesystem](agents_roster_lives_on_filesystem) — the same instinct: let the filesystem carry the state
