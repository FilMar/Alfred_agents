# Migrate a skill off its justfile

Goal: `SKILL.md` calls the real CLI directly, deterministic sequences
live in `scripts/`, and the `justfile` is gone.

Paths like `scripts/lint_skill.py` below are efesto's own scripts.
Resolve them against efesto's folder, not the skill under migration.

## Steps

1. **Read everything.** The skill's `SKILL.md` and `justfile`, in full.
   List every recipe.
2. **Sort each recipe into one of three piles:**
   - *Wraps a single command* → inline it. Replace the recipe call in
     `SKILL.md` with the real CLI call.
   - *Multi-step deterministic sequence* → port it. Move the body to
     `scripts/<recipe>.sh` (or `.py`), named after the recipe. Apply the
     script contract from Rule 3: shebang, `# desc:`, `# usage:`,
     `set -euo pipefail`, argument checks.
   - *Called by nobody* — not in `SKILL.md`, not in `CLAUDE.md`, not in
     `alfred.md` → delete it. Migration is the audit moment: port what
     is used, drop what is not (the Sediment rule).
3. **Delete `scripts/guard.sh` if present.** It guarded justfile argument
   passing. Scripts validate their own arguments now.
4. **Delete the `justfile`.**
5. **Clean the frontmatter.** Remove the `compatibility` field if it
   talks about the justfile.
6. **Update outside callers.** Search the repo for stale references and
   point them at the direct CLI call or the new script:
   ```
   grep -rn "pi-just <skill>\|<skill>/justfile" --include='*.md' .
   ```
   Usual suspects: `CLAUDE.md` quick lookups, `alfred.md`, `.wiki/`
   pages, and `ti` rules (propose the `ti` fix via mose — the user
   confirms rule changes).
7. **Lint and test:**
   ```
   python3 scripts/lint_skill.py <skill_path>
   scripts/test_skill.sh <skill_path> "<realistic task>"
   ```
8. **Ask the user to review the result** before moving to the next skill.
