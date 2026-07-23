# Flow: Council of Experts

**When to use**: the user has a problem, decision or challenge that benefits from parallel, diverse domain perspectives. Not for Socratic exploration — use `debate` for that.

**Nature**: structured and harness-driven. The code in `council.sh` runs the phases. Quartermaster's only cognitive job is Phase 0 — choosing who sits at the table and with what problem. After that, the script handles parallelism, polling, validation, and synthesis. The model cannot skip a phase, synthesise before all experts answer, or forget an output.

---

## Phase 0 — Quartermaster chooses the roster (the only cognitive step)

Pick members that cover different angles of the problem:

- **Domain coverage**: who brings a perspective the others cannot?
- **Hat divergence**: cognitive variety, not redundancy — a black and a yellow on the same domain beat two blacks
- **Size**: 2–5 members (hard cap; override with `COUNCIL_MAX_MEMBERS` env var)
- **Synth**: default `von-neumann-blue`; swap if a domain-specific synthesiser fits better

If a needed profile does not exist, create a temporary member first:

```bash
th member create <name> --hat <hat-core> --role "<role>" --tmp
```

Propose the roster to the user before launching:

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

## Launching the script

Once the user confirms, run from the **project root**:

```bash
./skills/quartermaster/flows/council.sh \
  --task "<problem verbatim or refined>" \
  --members "knuth-black,jobs-yellow,turing-green" \
  [--rounds N]         # default 1; add rounds when first synthesis opens new tensions
  [--synth <member>]   # default von-neumann-blue
  [--run-id ID]        # omit on first run; reuse to resume a crashed run
  [--timeout SEC]      # default 600 per member
  [--dry-run]          # validate roster without spending any API calls
```

The script:
1. Validates that every member exists (fail fast — no half-started runs)
2. Launches all experts in parallel with `th run --detach`
3. Blocks on `th wait` with crash detection until every expert is terminal
4. Validates that every output is non-empty before synthesising
5. Runs the synth member sequentially with all perspectives
6. Accumulates the synthesis as context for round N+1

Final synthesis goes to stdout. Per-member logs and outputs are in `/tmp/th-flow/<run-id>/`.

---

## Resume

If a round fails or the process crashes, relaunch with the same `--run-id`. Completed steps are skipped; failed or missing ones are re-executed.

```bash
./skills/quartermaster/flows/council.sh \
  --task "<same problem>" \
  --members "<same members>" \
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

- **Do not manually implement the parallel fan-out.** The script does this. Quartermaster's job ends when it calls the script.
- **Do not synthesise before all experts have finished.** The script enforces this; the model never needs to.
- **Blue does not participate in analysis rounds.** It enters only for synthesis.
- **Rounds are the user's call.** Propose 1; let the user ask for more.
