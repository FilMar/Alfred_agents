#!/usr/bin/env python3
"""Lint a skill: every `just` invocation in SKILL.md must match the justfile.

Checks:
  ERROR  unknown recipe
  ERROR  flag-style arg (--x) passed to a recipe without a variadic parameter
  ERROR  too many args for a fixed-arity recipe / too few required args
  WARN   direct CLI call (tb, ti, th, himalaya, gh, ...) inside a code block
  WARN   recipe uses fixed-arity positional params but has no guard.sh line

Doc-style lines (containing <placeholders> or [optional] tokens) are checked
for recipe existence and the flag rule only — argument counting is skipped.

Usage: lint_skill.py <skill-dir> [<skill-dir> ...]
Exit: 0 clean, 1 errors found.
"""
import json
import re
import shlex
import subprocess
import sys
from pathlib import Path

WRAPPED_CLIS = {"tb", "ti", "th", "himalaya", "task", "go-task", "gh", "typst"}


def load_recipes(justfile: Path):
    out = subprocess.run(
        ["just", "-f", str(justfile), "--dump", "--dump-format", "json"],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        return None, f"justfile does not parse: {out.stderr.strip()}"
    data = json.loads(out.stdout)
    recipes = {}
    for name, r in data.get("recipes", {}).items():
        params = r.get("parameters", [])
        recipes[name] = {
            "min": sum(1 for p in params if p.get("default") is None
                       and p.get("kind") == "singular")
                 + sum(1 for p in params if p.get("kind") == "plus"),
            "max": None if any(p.get("kind") in ("star", "plus") for p in params)
                   else len(params),
            "variadic": any(p.get("kind") in ("star", "plus") for p in params),
            "params": params,
            "body": r.get("body", []),
        }
    return recipes, None


def iter_command_lines(skill_md: str):
    """Yield (lineno, command) for lines inside fenced code blocks."""
    in_fence = False
    buf, buf_start = "", 0
    for i, raw in enumerate(skill_md.split("\n"), 1):
        line = raw.rstrip()
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            continue
        stripped = line.strip()
        if buf:
            buf += " " + stripped.rstrip("\\").strip()
            if not stripped.endswith("\\"):
                yield buf_start, buf
                buf = ""
            continue
        if stripped.endswith("\\"):
            buf, buf_start = stripped.rstrip("\\").strip(), i
            continue
        if stripped:
            yield i, stripped


def lint(skill_dir: Path):
    errors, warnings = [], []
    justfile = skill_dir / "justfile"
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return [f"{skill_dir}: no SKILL.md"], []
    if not justfile.exists():
        # Only a problem if SKILL.md references just recipes.
        if re.search(r"^\s*just\s", skill_md.read_text(), re.M):
            return [f"{skill_dir}: SKILL.md references `just` but there is no justfile"], []
        return [], []

    recipes, err = load_recipes(justfile)
    if err:
        return [f"{skill_dir}: {err}"], []

    # guard.sh presence check for fixed-arity multi-param recipes
    guard_expected = (skill_dir / "scripts" / "guard.sh").exists()
    for name, r in recipes.items():
        n_singular = sum(1 for p in r["params"] if p.get("kind") == "singular")
        if n_singular >= 1 and not r["variadic"] and name != "default":
            body_text = " ".join(str(x) for x in r["body"])
            if guard_expected and "guard" not in body_text:
                warnings.append(f"{justfile.name}: recipe `{name}` has positional params but no guard line")

    for lineno, cmd in iter_command_lines(skill_md.read_text()):
        cmd = cmd.lstrip("$ ").split("#", 1)[0].strip()
        if not cmd:
            continue
        try:
            toks = shlex.split(cmd)
        except ValueError:
            continue
        if not toks:
            continue
        head = toks[0]
        if head in WRAPPED_CLIS:
            warnings.append(f"SKILL.md:{lineno}: direct CLI call `{cmd[:60]}` — should go through a recipe")
            continue
        if head != "just":
            continue
        args = toks[1:]
        # strip -f/--justfile <path> (resolving cross-skill targets) and other options
        target = recipes
        while args and args[0].startswith("-"):
            if args[0] in ("-f", "--justfile") and len(args) > 1:
                jf = Path(args[1].replace("~", str(Path.home())))
                candidates = [jf, skill_dir.parent / jf.name if jf.name == "justfile" else jf,
                              skill_dir.parent.parent / jf]
                # also try interpreting `skills/<name>/justfile` relative to the skills dir
                if len(jf.parts) >= 2:
                    candidates.append(skill_dir.parent / jf.parts[-2] / jf.parts[-1])
                resolved = next((c for c in candidates if c.exists()), None)
                if resolved and resolved != justfile:
                    target, ferr = load_recipes(resolved)
                    if ferr:
                        target = None
                args = args[2:]
            else:
                args = args[1:]
        if not args or target is None:
            continue
        recipe, rargs = args[0], args[1:]
        if re.search(r"[<>]", recipe):  # doc placeholder like `just <recipe> ...`
            continue
        if recipe not in target:
            errors.append(f"SKILL.md:{lineno}: unknown recipe `{recipe}`")
            continue
        r = target[recipe]
        flags = [a for a in rargs if a.startswith("--")]
        if flags and not r["variadic"]:
            errors.append(f"SKILL.md:{lineno}: flag-style arg {flags[0]} to fixed-arity recipe `{recipe}`")
            continue
        doc_style = any(re.search(r"[<\[\]>]", a) for a in rargs)
        if doc_style or r["variadic"]:
            continue
        if r["max"] is not None and len(rargs) > r["max"]:
            errors.append(f"SKILL.md:{lineno}: `{recipe}` takes at most {r['max']} args, got {len(rargs)}")
        elif len(rargs) < r["min"]:
            errors.append(f"SKILL.md:{lineno}: `{recipe}` needs at least {r['min']} args, got {len(rargs)}")
    return errors, warnings


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    total_err = 0
    for arg in sys.argv[1:]:
        d = Path(arg)
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
