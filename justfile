# Run typecheck then tests
check:
    bun run typecheck
    bun test tests/

# Lint all skills
lint-skills:
    python3 skills/efesto/scripts/lint_skill.py

# Print the agent roster (derived from the filesystem)
roster:
    python3 skills/efesto/scripts/roster.py

hook-test:
    py /home/filippo/git_projects/pi/spikes/2026-10-21-hook-preview/server.py
