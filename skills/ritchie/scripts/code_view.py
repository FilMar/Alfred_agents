#!/usr/bin/env -S uv run --script
# desc: add the code view to spec.json: skeleton, or final code against the agreed one
# usage: code_view.py --spec <file> [--agreed <file> | --freeze <file>]
# /// script
# requires-python = ">=3.12"
# dependencies = ["tree-sitter-language-pack==1.23.1"]
# ///
import argparse
import json
import re
import shutil
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, NoReturn

from check_body_diff import TODO
from code_paint import lines_of, painted

# assert_eq! and console.assert count too: an added contract is never a body.
ASSERT = re.compile(r"^\s*(?:debug_)?(?:\w+\.)?[Aa]ssert")
# Tests come after the agreement by design, so they are no difference from it.
TEST_PATH = re.compile(r"(^|[/_.-])tests?([/_.-]|$)")
CONTEXT_LINES = 3
FILES_MAX = 100
GIT_TIMEOUT_S = 60
GIT = shutil.which("git") or "git"
Json = dict[str, Any]


def die(message: str, code: int = 1) -> NoReturn:
    print(f"code_view: {message}", file=sys.stderr)
    sys.exit(code)


def load(path: Path) -> Json:
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as error:
        die(f"cannot read {path}: {error}", 2)


def git(*args: str) -> str | None:
    done = subprocess.run(  # noqa: S603
        [GIT, *args],
        capture_output=True,
        text=True,
        errors="replace",
        timeout=GIT_TIMEOUT_S,
        check=False,
    )
    return done.stdout if done.returncode == 0 else None


def changed(paths: list[str], base: str) -> list[str]:
    if not paths:
        return []
    diff = git("diff", "--name-only", "--relative", "-z", base, "--", *paths)
    new = git("ls-files", "--others", "--exclude-standard", "-z", "--", *paths)
    if diff is None or new is None:
        die(f"git cannot list the changes under {' '.join(paths)}")
    return sorted(
        {p for p in (diff + new).split("\0") if p and not TEST_PATH.search(p)},
    )


def read(path: str) -> str:
    try:
        return Path(path).read_text()
    except (OSError, UnicodeDecodeError):
        return ""


def unchanged(old: list[str], new: list[str]) -> set[int]:
    blocks = SequenceMatcher(None, old, new, autojunk=False).get_matching_blocks()
    return {j for b in blocks for j in range(b.b, b.b + b.size)}


def skeleton_rows(old: str, new: str, path: str) -> list[Json]:
    same = unchanged(lines_of(old), lines_of(new))
    return [
        {"n": j + 1, "k": "ctx" if j in same else "", "segs": r}
        for j, r in enumerate(painted(new, path))
    ]


def final_rows(old: str, agreed: str, final: str, path: str) -> list[Json]:
    a, b = lines_of(agreed), lines_of(final)
    same, a_rows, b_rows = (
        unchanged(lines_of(old), b),
        painted(agreed, path),
        painted(final, path),
    )
    rows: list[Json] = []
    for tag, i1, i2, j1, j2 in SequenceMatcher(
        None,
        a,
        b,
        autojunk=False,
    ).get_opcodes():
        if tag == "equal":
            rows += [
                {"n": j + 1, "k": "ctx" if j in same else "", "segs": b_rows[j]}
                for j in range(j1, j2)
            ]
            continue
        # Only a chunk that replaces nothing but todo lines is a body.
        body = i2 > i1 and all(TODO.match(line) for line in a[i1:i2])
        rows += [
            {"n": i + 1, "k": "tolta", "segs": a_rows[i]}
            for i in range(i1, i2)
            if not TODO.match(a[i])
        ]
        for j in range(j1, j2):
            kind = "corpo" if body and not ASSERT.match(b[j]) else "extra"
            rows.append({"n": j + 1, "k": kind, "segs": b_rows[j]})
    return rows


def trimmed(rows: list[Json]) -> list[Json]:
    keep = {
        i + d
        for i, r in enumerate(rows)
        if r["k"] != "ctx"
        for d in range(-CONTEXT_LINES, CONTEXT_LINES + 1)
    }
    out: list[Json] = []
    for i, row in enumerate(rows):
        if i in keep:
            if i and i - 1 not in keep and out:
                out.append({"gap": True})
            out.append(row)
    return out


def freeze(paths: list[str], target: Path) -> None:
    if target.exists():
        die(f"{target} already holds the agreement: delete it to agree again")
    base = git("rev-parse", "HEAD")
    if base is None:
        die("no commit to compare with")
    names = changed(paths, base.strip())
    if not names:
        die("no changed file under the codice paths: write the skeleton first")
    data = {"base": base.strip(), "file": {name: read(name) for name in names}}
    tmp = target.with_name(f".{target.name}.tmp")
    try:
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1))
        tmp.replace(target)
    finally:
        tmp.unlink(missing_ok=True)
    print(target)


def main() -> None:
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--spec", type=Path, required=True)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--agreed", type=Path)
    mode.add_argument("--freeze", type=Path)
    args = parser.parse_args()

    spec = load(args.spec)
    paths = [p for e in spec.get("entita", []) for p in e.get("codice") or []]
    if args.freeze:
        freeze(paths, args.freeze)
        return

    agreed = load(args.agreed) if args.agreed else None
    head = git("rev-parse", "HEAD")
    base = agreed["base"] if agreed else (head or "").strip()
    if not base:
        die("no commit to compare with")
    pact = agreed["file"] if agreed else {}
    names = sorted({*changed(paths, base), *pact})
    if len(names) > FILES_MAX:
        die(f"{len(names)} changed files, over the limit of {FILES_MAX}")

    files = []
    for name in names:
        old, new = git("show", f"{base}:./{name}") or "", read(name)
        rows = (
            final_rows(old, pact.get(name, ""), new, name)
            if agreed
            else skeleton_rows(old, new, name)
        )
        if shown := trimmed(rows):
            files.append({"path": name, "rows": shown})
    spec["vista"] = {"modo": "finale" if agreed else "proposta", "file": files}
    print(json.dumps(spec, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
