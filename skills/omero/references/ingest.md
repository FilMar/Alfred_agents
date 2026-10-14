# Omero — Ingest

Turn a source into wiki decisions and roadmap blocks.

The source is what the user points to: files, directories, `.design/`, or the conversation. A decision records what the source says or what the user chose. If the source does not decide, ask. Never fill the gap.

1. Take the source.
   - `.design/`: at the init of a wiki, all of it. Later, the lines changed since the last commit that touched `roadmap.md` (`git diff`). Show them and ask the user to confirm the list. `.design/` is read only.
2. Read it with `Read`. Find the topic: pick the `category_subject` prefix the material belongs to (e.g. `core_ca_chunk`). `Glob .wiki/<topic>_*.md`, then `Read` every match to see which decisions already exist and which are live (see `GLOSSARY.md`). If the source describes needs, `Grep` the code for what already exists.
3. Discuss with the user. How much depends on the source:
   - It already decides (a design note, a conversation): discuss only what is dense or ambiguous.
   - It does not decide (use cases): one point at a time. Say what exists, give the options and a recommendation, and let the user choose. `[da chiarire]` marks become questions here. `[proposta di Piano]` marks are not yours to settle: report them.
4. If there is more than one thing to write, show one table before writing: the decisions (name, one line, in place / new / reversal) and the roadmap blocks, sized by complexity (see Roadmap in `GLOSSARY.md`). With one decision, write it. Otherwise write only after the user agrees.
5. Decide how to record each decision:
   - The decision is still the same (a fix, a sharper wording, a new fact) → `Edit` that file in place.
   - A new decision → copy `templates/page.md`, fill it, `Write` it to `.wiki/<topic>_<slug>.md`. Put the design file in `sources`.
   - A reversal of a live decision → write the new file with `replaces: [old@hash]`, fold the reason for the change and any rejected alternative into `## Why`, then `rm` the old file. Get the hash with `git log -1 --format=%h -- .wiki/<old>.md`.
   - One file per decision. If the material holds three decisions, write three files, each with a short slug (three to six words). Keep each file under 40 lines.
6. Update links: `Grep` for the old filename and repoint every link to the new decision. Edit `## Cross-references` of decisions that depend on what changed.
7. Update `.wiki/index.md`: add the new decision under its `## <topic>` section, remove any row it reversed.
8. Update `.wiki/roadmap.md`: add only the new blocks. Do not rewrite blocks that exist.

## English style

Write decision text in easy English. See `GLOSSARY.md` — the rule lives there once.
