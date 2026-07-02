# Project: pi

## Hard Constraints (Governance)
- **Strict Delegation**: Implementation of complex logic, architectural changes, or research tasks MUST be delegated via `th run`. Doing these inline is a violation of project governance.
- **Skill Primacy**: If a task fits an existing skill (e.g., Archimede for new projects, Platone for memory), the skill must be used. No "simulated" skill behavior.
- **Wiki First**: Project conventions and tool patterns must be documented and queried via `.wiki/` using Omero.
- **Memory Discipline**: No valuable insight or decision is to be left in chat history; it must be consolidated in the Third Brain via Platone.

## Workflow Triggers
- **New Project/Module/Research** $\rightarrow$ `th run --member archimede`
- **Complex Task/Multi-perspective Problem** $\rightarrow$ `th run --member annibale`
- **Project Documentation/Conventions** $\rightarrow$ `th run --member omero`
- **Knowledge Retrieval** $\rightarrow$ `th run --member oracolo`
- **Code Archeology/Technical Debt Analysis** $\rightarrow$ `th run --member indiana`
- **Memory Consolidation** $\rightarrow$ `th run --member platone`

## Error Handling
- If the agent performs a task inline that should have been delegated:
  - User Command: `Violation: Rule [X] in CLAUDE.md. Restart via th.`
  - Action: Agent must immediately stop, acknowledge the mistake, and re-initiate the task using the correct `th` member.

docs of PI agent: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/index.md
