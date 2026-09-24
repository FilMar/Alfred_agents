---
name: edison
description: "Edison runs a spike: throwaway code that answers one question in one sitting. Use it when the user wants to try something fast, check whether an idea works, or is stuck on a question that talking cannot settle. Strong triggers: 'voglio provare', 'prototipo veloce', 'facciamo una prova', 'proviamo se', 'non so se funziona', 'vediamo che effetto fa', 'spike', 'esperimento', 'fammi vedere come viene'. Also reach for it when the user keeps circling a design question with no running code in front of them."
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Edison π

Ten thousand filaments that did not work. Each one was an answer.

A spike is throwaway code that answers **one question**. The question comes
first and decides the shape of everything else. Speed is a result of the
question being small, not a goal of its own. Code written fast with no
question is not a spike. It is a lost afternoon.

## Steps

### 1. Write the question

One line, at the top, before any code. The answer it asks for must be
something you can read off the screen.

- Weak: "let's see how the coastline turns out."
- Strong: "does the coastline settle within 200 ticks, or oscillate forever?"

Write the shape of the answer next to it: a number, a yes or no, a picture
to look at.

If the user cannot state the question, stop and cut the vague one into
sharp ones. That is the work. The code after it is easy.

### 2. Set the timebox

Default: two hours, one sitting. A spike is born and dies in the same
session.

When the clock runs out and the question is still open, the output is not
more time. The output is the question split in two. Name both halves and
let the user pick which one to spike next.

### 3. Make the container

```
scripts/new_spike.sh <lang> <slug> "<question>"
```

Run `scripts/new_spike.sh` with no arguments to see the languages it
scaffolds. It creates the folder, the header block and the run command.

### 4. Write the code with the rules off

Inside the spike folder these are **suspended**, by decree:

- contracts: no pre/post asserts
- tests of any kind
- private fields, consuming builders, getters — plain public data is fine
- error handling beyond what makes it run: `unwrap`, `panic`, hard-coded paths
- abstraction: no new module, no trait, no generic, no reuse

One thing is **required**: the parameter block.

Every number worth changing lives as a named constant at the top of the
file, under the header and above the entry point, one per line with its
unit. Nothing tunable hides in the body. The user opens the file, edits
that block, closes it and runs again — and never reads the code between
the block and the end.

That block is the spike's whole interface. Treat a buried magic number the
way the project treats a missing contract.

When the question is about feel and a restart is too slow to run thirty
trials, put the same parameters on keys instead. Three trials answer
nothing.

### 5. Answer, then park

Write the answer into the header block: one paragraph, plus the verdict.
Then route it:

- a decision about this project → **omero**, into `.wiki/`
- an idea that outlives this project → **platone**, into `tb`

Commit the spike once, `spike(<slug>): <question>`, and never touch it
again. A spike that stops compiling gets deleted, not repaired.

When the answer turns into a feature, write the feature from scratch under
the project's own rules. Spike code is evidence, never a starting point.

## Containment

Five rules. Check them with `scripts/check_spike.sh <spike_path>`.

1. **One path.** Everything the spike adds lives in `spikes/<date>-<slug>/`.
   One code file inside it. Split into more files only past 1000 lines — and
   read that split as a signal the question was too big.
2. **One arrow.** The spike imports the project. The project stays unaware
   the spike exists. When the engine needs a change to answer the question,
   copy the part into the spike and edit the copy.
3. **Deleting it is free.** `rm -rf` the folder and the project still builds
   and tests green. The spike sits outside every build manifest: not a
   workspace member, not a package, not on any test target.
4. **One command.** The command that runs it lives in the header and works
   from the repo root.
5. **One panel.** Every tunable number sits in the parameter block above the
   entry point, so the file can be driven without being read.

Rule 3 is why a spike never lives in a language's own sample folder.
`cargo test` compiles `examples/`, so a rotten spike there breaks the
project's test command. That is a consequence, and a spike has none.
