# Project: pi

## Hard Constraints (Governance)
- **Rule Retrieval First**: Before any non-obvious or recurring action (starting a module, delegating, documenting, consolidating memory), run `ti search "<context>"` and follow the matching rule. Routing rules live in `ti`, not in this file.
- **No Simulation**: Specialized roles are never performed inline — always via the matching skill, or by proposing annibale for a `th` member.
- **Memory Discipline**: No valuable insight or decision is to be left in chat history; consolidate in the Third Brain via Platone at session end.

## Error Handling
- If the agent performs a task inline that should have been delegated:
  - User Command: `Violation: Rule [X] in CLAUDE.md. Restart via the matching skill.`
  - Action: Agent must immediately stop, acknowledge the mistake, and re-initiate the task using the correct skill, or by proposing annibale.

docs of PI agent: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/index.md
