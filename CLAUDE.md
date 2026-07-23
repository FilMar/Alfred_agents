# Project: pi

## Hard Constraints (Governance)
- **Strict Delegation**: Implementation of complex logic, architectural changes, or research tasks MUST be delegated via `th run`. Doing these inline is a violation of project governance.
- **Skill Primacy**: If a task fits an existing skill (e.g., Architect for new projects, Gardener for memory), the skill must be used. No "simulated" skill behavior.
- **Wiki First**: Project conventions and tool patterns must be documented and queried via `.wiki/` using Scribe.
- **Memory Discipline**: No valuable insight or decision is to be left in chat history; it must be consolidated in the Third Brain via Gardener.

## Workflow Triggers
- **New Project/Module/Research** $\rightarrow$ `th run --member architect`
- **Complex Task/Multi-perspective Problem** $\rightarrow$ `th run --member quartermaster`
- **Project Documentation/Conventions** $\rightarrow$ `th run --member scribe`
- **Knowledge Retrieval** $\rightarrow$ `th run --member oracle`
- **Code Archeology/Technical Debt Analysis** $\rightarrow$ `th run --member prospector`
- **Memory Consolidation** $\rightarrow$ `th run --member gardener`

## Error Handling
- If the agent performs a task inline that should have been delegated:
  - User Command: `Violation: Rule [X] in CLAUDE.md. Restart via th.`
  - Action: Agent must immediately stop, acknowledge the mistake, and re-initiate the task using the correct `th` member.

docs of PI agent: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/index.md
