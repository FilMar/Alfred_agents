#!/usr/bin/env bash
# desc: Run a skill for real in a throwaway th member, inside the bwrap sandbox.
# usage: test_skill.sh <skill-path> <task>
set -euo pipefail

if [ $# -ne 2 ]; then
    echo "usage: test_skill.sh <skill-path> <task>" >&2
    exit 2
fi

skill_path="$1"
task="$2"
name="efesto-test-$(basename "$skill_path")"

th member create "$name" --hat white-core --role "tests skill under evaluation" --tools read,bash --tmp
trap 'th member delete "$name"' EXIT
th run --member "$name" --task "Use the skill at $skill_path to do this: $task. Note: you run inside a bwrap sandbox — only $(pwd), ~/.pi, ~/.bun and /tmp are writable; everything else is read-only by design, not a bug in the skill."
