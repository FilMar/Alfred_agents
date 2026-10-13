---
tags: [wiki, meta, omero]
sources: [conversation, wiki_superseded_hidden_with_dot.md@c1dbd73]
replaces: [wiki_superseded_hidden_with_dot@c1dbd73]
---

## Decision

A decision changes in place while it stays the same decision: a fix, a sharper wording, a new fact. A new file with `replaces` is for a reversal only.

When a decision is reversed, the old file is deleted in the same change. The new file names it as `replaces: [file@hash]`, where the hash is the last commit that held it. `git show <hash>:.wiki/<file>` restores the text.

A decision file stays under 40 lines. The slug has three to six words. `## Cross-references` appears only when the decision depends on another one. `index.md` has one `## <topic>` section per topic.

The old dot-named files are deleted too. Their `file@hash` points to the commit where the file had a leading dot: `git show <hash>:.wiki/.<file>.md`.

## Why

The old rule made every change a new file. A small refinement left a near copy, a dead file, and links to it that nobody repointed. That is noise, and it cost more than the history it kept.

Git already holds the history. The old rule rejected deletion because a dead decision is still worth reading. It is: `git show` opens it. It costs one command, and a search of `.wiki/` returns live decisions only.

Immutability looked safe, but it did not stop drift. It only moved the drift into more files.

## Cross-references

- [wiki_decision_is_written_when_the_design_ends](wiki_decision_is_written_when_the_design_ends) — written for the old rule, trimmed to match this one
