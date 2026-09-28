# Flow: Council of Experts

**When to use**: the user has a problem, decision or challenge that benefits from parallel, diverse domain perspectives. Not for Socratic exploration — use `debate` for that.

**Nature**: structured and harness-driven. The code in `council.sh` runs the phases. Annibale's only cognitive job is Phase 0 — choosing who sits at the table and with what problem. After that, the script handles parallelism, polling, validation, and synthesis. The model cannot skip a phase, synthesise before all experts answer, or forget an output.

---

## Phase 0 — Annibale chooses the roster (the only cognitive step)

Pick hats that cover different angles of the problem:

- **Domain coverage**: who brings a perspective the others cannot?
- **Hat divergence**: cognitive variety, not redundancy — a black and a yellow on the same domain beat two blacks
- **Size**: 2–5 hats (hard cap; override with `COUNCIL_MAX_HATS` env var)
- **Synth**: default `blue-core`; swap only if another hat closes better

A role that no hat carries by itself is not a missing file: pass it as `--system` on that run, in front of the hat.

Propose the table to the user before launching:

```
Problem: <description>

Proposed council:
- knuth-black   — <domain> — <what they will bring>
- jobs-yellow   — <domain> — <what they will bring>
- turing-green  — <domain> — <what they will bring>

Synth: von-neumann-blue
Rounds: 1

Proceed?
```

---

## Launching the flow

Once the user confirms, run from the **project root**:

```bash
skills/annibale/scripts/council.sh \
  --task "<problem verbatim or refined>" \
  --hats "black-core,yellow-core,green-core" \
  [--rounds N]       # default 1; add rounds when first synthesis opens new tensions
  [--synth <hat>]    # default blue-core
  [--run-id ID]      # omit on first run; reuse to resume a crashed run
  [--timeout SEC]    # default 600 per run
  [--dry-run]        # validate roster without spending any API calls
```

The harness:
1. Validates that every hat exists (fail fast — no half-started runs)
2. Launches all experts in parallel with `th run --detach`
3. Blocks on `th wait` with crash detection until every expert is terminal
4. Validates that every output is non-empty before synthesising
5. Runs the synth hat sequentially with all perspectives
6. Accumulates the synthesis as context for round N+1

Final synthesis goes to stdout. Per-run logs and outputs are in `/tmp/th-flow/<run-id>/`.

---

## Resume

If a round fails or the process crashes, relaunch with the same `--run-id`. Completed steps are skipped; failed or missing ones are re-executed.

```bash
skills/annibale/scripts/council.sh \
  --task "<same problem>" \
  --hats "<same hats>" \
  --run-id council-20260702-143021   # printed by the first run
```

---

## When to add rounds

One round is usually enough. Add `--rounds 2` (or more) when:
- The first synthesis surfaces a real tension worth exploring further
- Perspectives are so divergent that a second pass narrows the decision
- The user explicitly wants deeper exploration

Each round feeds the previous synthesis into every expert's prompt — positions sharpen over rounds.

---

## Rules

- **Do not manually implement the parallel fan-out.** The script does this. Annibale's job ends when it calls the script.
- **Do not synthesise before all experts have finished.** The script enforces this; the model never needs to.
- **Blue does not participate in analysis rounds.** It enters only for synthesis.
- **Rounds are the user's call.** Propose 1; let the user ask for more.
