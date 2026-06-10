# Flow: Council of Experts

**When to use**: the user has a problem, decision or challenge that benefits from parallel, diverse domain perspectives. This is not a Socratic cycle — it is a council that convenes, reasons in parallel, then synthesises.

**Nature**: structured — each round produces concrete outputs that feed the next. The number of rounds is adjustable: one is often enough; more rounds are needed when the problem is complex or the first round opens new tensions.

---

## The cycle

```
[0. SETUP]        → Annibale picks the experts based on the problem's domain
[1. FIRST ROUND]  → each expert analyses the problem in parallel, independently
[2. SYNTHESIS]    → blue synthesises perspectives into a concrete recommendation
→ if more rounds needed: back to [1] with accumulated context
[N. CLOSURE]      → blue closes with a final decision
```

---

## Phase 0 — Setup

Annibale picks experts from the available roster. Criteria:
- **Domain**: who has the most relevant expertise for this problem?
- **Divergence**: profiles must cover different angles, not overlapping ones
- **Hat**: each expert brings their cognitive colour — a black engineer sees risks, a yellow one sees opportunities

Do not convene more than 5 experts per round. Three focused beats six generic.

Propose the council to the user before proceeding:

```
Problem: <description>

Proposed council:
- steve-white  — <domain> — <what they will analyse>
- knuth-black  — <domain> — <what they will analyse>
- tesla-green  — <domain> — <what they will analyse>

Planned rounds: 1 (expandable)

Proceed?
```

---

## Phase 1 — First round (parallel)

Each expert receives the problem without seeing the others. Total independence.

```bash
P1=$(th run --member <name-hat1> --task "You are summoned as an expert in a council.

Problem:
<problem>

Analyse from your point of view. Be specific, not generic. Bring what only you can bring." --detach)

P2=$(th run --member <name-hat2> --task "You are summoned as an expert in a council.

Problem:
<problem>

Analyse from your point of view. Be specific, not generic. Bring what only you can bring." --detach)

P3=$(th run --member <name-hat3> --task "You are summoned as an expert in a council.

Problem:
<problem>

Analyse from your point of view. Be specific, not generic. Bring what only you can bring." --detach)

STATUS1=$(echo "$P1" | jq -r '.status')
STATUS2=$(echo "$P2" | jq -r '.status')
STATUS3=$(echo "$P3" | jq -r '.status')

until grep -q "^done$" "$STATUS1" 2>/dev/null \
   && grep -q "^done$" "$STATUS2" 2>/dev/null \
   && grep -q "^done$" "$STATUS3" 2>/dev/null; do
  sleep 2
done

OUT1=$(cat "$(echo "$P1" | jq -r '.out')")
OUT2=$(cat "$(echo "$P2" | jq -r '.out')")
OUT3=$(cat "$(echo "$P3" | jq -r '.out')")
```

---

## Phase 2 — Synthesis

```bash
SYNTHESIS=$(th run --member <name-blue> --task "You have before you the analyses of a council of experts on the same problem.

Problem:
<problem>

Expert analyses:

<name-hat1>:
$OUT1

<name-hat2>:
$OUT2

<name-hat3>:
$OUT3

Synthesise: what tensions emerge, where they converge, what is the most solid recommendation. Do not average — decide.")
```

Present the synthesis to the user. Then ask:

```
Do you want another round? (experts will react to the synthesis and each other's positions)
```

---

## Additional round (optional, repeatable)

If the user wants to go deeper, each expert receives the previous round's synthesis and the others' positions. They can now confirm, correct, or push further.

```bash
P1=$(th run --member <name-hat1> --task "You are in a council of experts. You have read the previous round's synthesis and the others' analyses.

Original problem:
<problem>

Previous round synthesis:
$SYNTHESIS

Other experts' analyses:
<name-hat2>: $OUT2
<name-hat3>: $OUT3

React: confirm, correct, or go deeper. Where did the synthesis get it wrong or miss something crucial?" --detach)

# repeat for each expert, then update OUT1, OUT2, OUT3 and re-run synthesis
```

Repeat for as many rounds as needed. Each round accumulates context — experts become more precise, tensions sharpen.

---

## Closure

After the final round, blue closes with a final decision:

```bash
th run --member <name-blue> --task "Council concluded. You have all the material from previous rounds.

Problem:
<problem>

Final synthesis from previous round:
$SYNTHESIS

Final expert analyses:
<name-hat1>: $OUT1
<name-hat2>: $OUT2
<name-hat3>: $OUT3

Close: one decision, its conditions, the residual risks. No open threads — the council is closed."
```

---

## Rules

- **Independence in the first round.** Experts do not see each other's analyses until they have finished their own.
- **Blue does not participate in analysis rounds.** It enters only for synthesis and closure.
- **One round is often enough.** Add rounds only if the synthesis opens new tensions worth exploring.
- **The number of rounds is decided by the user**, not Annibale.
- **Closure is final.** No open flows at the end.
