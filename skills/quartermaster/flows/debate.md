# Flow: Dialectic Debate

**When to use**: the user wants to explore an idea, a tension or a decision through a Socratic cycle that sediments into the Third Brain.

**Nature**: interactive — waits for the user's response between phases. Not a batch pipeline.

**Prerequisites**: Qdrant and Ollama active (`tb status`). If not, ask the user to start them with `tb start`.

---

## The cycle

```
[1. ORACLE]    → retrieves context on the topic from the TB
[2. INQUISITOR]    → finds the tension, asks the uncomfortable question
[3. USER]       → responds, reflects, pushes
[4. CARTOGRAPHER] → integrates what is new into the Third Brain
[5. ORACLE]    → verifies the updated connections
→ back to [2] or close
```

---

## Phase 1 — Oracle: context

```bash
just run <member> "Use the oracle skill to retrieve everything the Third Brain knows about: <topic>"
```

Present the result. If the TB has nothing on the topic, say so — the void is information.

## Phase 2 — Inquisitor: tension

```bash
just run <member> "Use the inquisitor skill.

Topic: <topic>

Context from the Third Brain:
<phase 1 output>

Previous user response (if any):
<user response>

Find the most uncomfortable tension and ask a single question."
```

Present the question. Wait. Do not interrupt.

## Phase 3 — User

When the user is done, go to phase 4.

## Phase 4 — Cartographer: integrate

```bash
just run <member> "Use the cartographer skill.

Topic: <topic>

Inquisitor's question:
<phase 2 question>

User's response:
<user response>

Integrate what is new into the Third Brain. If nothing is new, say so."
```

## Phase 5 — Oracle: re-verify

```bash
just run <member> "Use the oracle skill to re-verify the Third Brain graph on: <topic> — show what has changed since the start of the cycle."
```

Then ask: **Do you want to continue the cycle on this tension, or bring a different idea?**

---

## Rules

- Do not do the agents' work: do not search the TB yourself, do not generate tensions, do not save notes. Always delegate via `just run`.
- Pass explicit context: every `just run` must receive the task containing everything the agent cannot know on its own.
- The cycle ends when the user says so.
