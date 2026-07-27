# Flow: TDD Coding

**When to use**: implement a feature from scratch, with explicit architecture, test-first, and wiki closure.

**Nature**: guided — each phase produces concrete artefacts required by the next phase. Not a batch pipeline.

**Prerequisites**: test runner available in the project. Wiki (`.wiki/`) present, or Omero initialises it on first write.

---

## The cycle

```
[0. CLARIFICATION] → Annibale collects precise requirements
[1. ARCHITECTURE]  → white + green: structures, signatures, trade-offs
[2. STUB]          → coder writes signatures + TODOs — must compile
[3. TESTS]         → black writes behavioural tests — must fail
[4. IMPLEMENT]     → loop: coder implements until tests pass
[5. REVIEW]        → black + white: DRY, cleanup, conformity
[6. WIKI]          → omero updates the project wiki
```

---

## Phase 0 — Clarification

Annibale asks directly, without delegating:
- Expected behaviour? (concrete inputs/outputs)
- Performance, compatibility, style constraints?
- Where does the code go? (file, module, package)
- What is the project's test runner?

Do not proceed without concrete answers.

---

## Phase 1 — Architecture (parallel)

```bash
P_W=$(just run-detached <name-white> "Analyse the requirements: data structures, types, existing dependencies to reuse, constraints.

Requirements:
<phase 0>")

P_G=$(just run-detached <name-green> "Propose 2-3 alternative architectures with trade-offs for:
<phase 0>

Do not choose — generate variants.")

just wait "$(echo "$P_W" | jq -r '.status')" "$(echo "$P_G" | jq -r '.status')" \
  || echo "A member failed — inspect its .status/.log before continuing." >&2

OUT_W=$(cat "$(echo "$P_W" | jq -r '.out')")
OUT_G=$(cat "$(echo "$P_G" | jq -r '.out')")
```

Present both perspectives to the user. Ask which architecture to adopt before continuing.

---

## Phase 2 — Stub

The coder member must have `--tools read,write,edit,bash`.

```bash
just run <name-white> "Write the signatures and data structures for:
<chosen architecture>

Rules:
- Signatures and types only, no implementation
- Each function body: explicit TODO comment with description
- The code must already compile (or pass type-check) in this state"
```

Manually verify it compiles before moving on.

---

## Phase 3 — Tests

The black member must have `--tools read,write,bash`.

```bash
just run <name-black> "Write behavioural tests for these signatures:
<phase 2 output>

Rules:
- Test behaviour, not implementation
- Include: normal case, edge case, error case
- Tests MUST fail now (implementation is TODO)
- Do not mock what you can test for real"
```

Run the test runner and verify all tests fail. If any already pass, the test is wrong.

---

## Phase 4 — Implement (loop)

```bash
ERRORS="<initial test runner output>"

while true; do
  just run <name-white> "Implement the functions to make the tests pass.

Signatures:
<phase 2 output>

Tests:
<phase 3 output>

Current errors:
$ERRORS"

  # run the test runner
  # if all tests pass → break
  # otherwise update $ERRORS and continue
done
```

If after 3 iterations the tests still don't pass, stop and present the problem to the user.

---

## Phase 5 — Review (parallel)

```bash
P_B=$(just run-detached <name-black> "Code review. Look for: duplicated code, obscure names, hidden logic, dead code.

Code:
<implementation>")

P_W=$(just run-detached <name-white> "Verify conformity. Compare requirements and implementation line by line. Do not make assumptions.

Requirements:
<phase 0>

Code:
<implementation>")

just wait "$(echo "$P_B" | jq -r '.status')" "$(echo "$P_W" | jq -r '.status')" \
  || echo "A member failed — inspect its .status/.log before continuing." >&2

OUT_B=$(cat "$(echo "$P_B" | jq -r '.out')")
OUT_W=$(cat "$(echo "$P_W" | jq -r '.out')")
```

Present issues found. If there are non-trivial fixes, go back to phase 4.

---

## Phase 6 — Wiki

```bash
just run <member> "Use the omero skill to update the project wiki with the new feature.

What was implemented:
<summary>

Public signatures:
<phase 2 output>

Architectural decisions:
<chosen architecture and why>"
```

---

## Rules

- **Signatures compile before tests.** Do not write tests on code that does not type-check.
- **Tests fail before implementing.** A test that passes without implementation is broken.
- **The loop has a limit.** After 3 fruitless iterations, escalate to the user.
- **Review is separate from implementation.** Do not review during the loop.
- **Omero always closes.** The wiki is part of the deliverable, not an option.
