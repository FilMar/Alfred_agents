#!/usr/bin/env python3
# desc: Lint a skill: frontmatter shape plus the direct-CLI scripts convention (rule 3).
"""Lint a skill against the structure rules.

Checks:
  ERROR  SKILL.md missing, or frontmatter invalid (see validate.py)
  ERROR  legacy justfile present in the skill folder
  ERROR  `just` or `pi-just` call inside a SKILL.md code block
  ERROR  a script lacks a `# desc:` header in its first 5 lines
  ERROR  SKILL.md references a script that is not in scripts/
  WARN   a script is never mentioned in SKILL.md (dead script?)
  WARN   a script is not executable
         (both warnings skip library files: no shebang on line 1)
  WARN   scripts/guard.sh present (justfile-era leftover)
  WARN   SKILL.md is over 200 lines (move detail to references/)

Usage: lint_skill.py [<skill-dir> ...]
No args: lint every skill under this repo's skills root.
Exit: 0 clean, 1 errors found.
"""
import os
import re
import shlex
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate import validate_skill

SKILLS_ROOT = Path(__file__).resolve().parents[2]
MAX_SKILL_MD_LINES = 200
DESC_HEADER_LINES = 5
SKIP_SCRIPT_FILES = {"__init__.py"}


def iter_command_lines(skill_md: str):
    """Yield (lineno, command) for lines inside fenced code blocks."""
    in_fence = False
    for i, raw in enumerate(skill_md.split("\n"), 1):
        line = raw.strip()
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence and line:
            yield i, line


def script_files(skill_dir: Path):
    scripts_dir = skill_dir / "scripts"
    if not scripts_dir.is_dir():
        return []
    return [
        f for f in sorted(scripts_dir.iterdir())
        if f.is_file() and f.name not in SKIP_SCRIPT_FILES
    ]


def has_desc_header(f: Path) -> bool:
    try:
        head = f.read_text(errors="replace").splitlines()[:DESC_HEADER_LINES]
    except OSError:
        return False
    return any(line.startswith(("# desc: ", "// desc: ")) for line in head)


def lint(skill_dir: Path):
    errors, warnings = [], []
    skill_md_path = skill_dir / "SKILL.md"
    if not skill_md_path.exists():
        return [f"{skill_dir}: no SKILL.md"], []

    ok, msg = validate_skill(skill_dir)
    if not ok:
        errors.append(f"frontmatter: {msg}")

    if (skill_dir / "justfile").exists():
        errors.append("legacy justfile present — migrate it (efesto references/MIGRATION.md)")

    text = skill_md_path.read_text(encoding="utf-8")
    if len(text.splitlines()) > MAX_SKILL_MD_LINES:
        warnings.append(
            f"SKILL.md is over {MAX_SKILL_MD_LINES} lines — move detail to references/"
        )

    for lineno, cmd in iter_command_lines(text):
        cmd = cmd.lstrip("$ ").split("#", 1)[0].strip()
        try:
            toks = shlex.split(cmd)
        except ValueError:
            continue
        if toks and toks[0] in ("just", "pi-just"):
            errors.append(
                f"SKILL.md:{lineno}: `{toks[0]}` call — call the CLI directly or a script"
            )

    referenced = set(re.findall(r"scripts/([A-Za-z0-9_.-]+)", text))
    scripts = script_files(skill_dir)
    names = {f.name for f in scripts}
    for name in sorted(referenced - names):
        errors.append(f"SKILL.md references scripts/{name} but the file does not exist")

    for f in scripts:
        if f.name == "guard.sh":
            warnings.append("scripts/guard.sh is a justfile-era leftover — delete it")
            continue
        if not has_desc_header(f):
            errors.append(
                f"scripts/{f.name}: no `# desc:` header in the first {DESC_HEADER_LINES} lines"
            )
        try:
            first_line = f.read_text(errors="replace").splitlines()[0]
        except (OSError, IndexError):
            first_line = ""
        if not first_line.startswith("#!"):
            continue  # library file (no shebang): only the desc header applies
        if not os.access(f, os.X_OK):
            warnings.append(f"scripts/{f.name}: not executable (chmod +x)")
        if f.name not in text:
            warnings.append(f"scripts/{f.name}: never mentioned in SKILL.md (dead script?)")

    return errors, warnings


def main():
    if len(sys.argv) > 1:
        dirs = [Path(a).resolve() for a in sys.argv[1:]]
    else:
        dirs = [d for d in sorted(SKILLS_ROOT.iterdir()) if (d / "SKILL.md").exists()]
    if not dirs:
        print(f"no skills found under {SKILLS_ROOT}", file=sys.stderr)
        sys.exit(2)
    total_err = 0
    for d in dirs:
        errors, warnings = lint(d)
        if errors or warnings:
            print(f"== {d.name}")
            for e in errors:
                print(f"  ERROR {e}")
            for w in warnings:
                print(f"  WARN  {w}")
        else:
            print(f"== {d.name}: OK")
        total_err += len(errors)
    sys.exit(1 if total_err else 0)


main()
