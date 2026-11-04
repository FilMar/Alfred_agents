#!/usr/bin/env -S uv run --script
# desc: lay spec.json over the graphify graph and git diff; print the spec with states
# usage: overlay.py --spec <file> --graph <file>
# /// script
# requires-python = ">=3.12"
# ///
import argparse
import json
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from collections.abc import Callable
from pathlib import Path
from typing import Any, NoReturn

CODE_RELATIONS = {"imports", "imports_from", "calls", "dynamic_import", "indirect_call"}
CODE_SUFFIXES = {".ts", ".js", ".py", ".sh", ".md", ".rs", ".go"}
SKIP_DIRS = {"node_modules", ".git", ".graph", "spikes", "target"}
FILES_MAX = 20_000
EXAMPLES_MAX = 3
GIT_TIMEOUT_S = 30
STATE = {"grafo": "fatto", "cli": "fatto", "non visto": "manca"}
STATE |= {"da costruire": "manca", "esterno": "esterno"}

Json = dict[str, Any]
Links = dict[tuple[str, str], Json]
GIT = shutil.which("git") or ""


def die(message: str, code: int = 1) -> NoReturn:
    print(f"overlay: {message}", file=sys.stderr)
    sys.exit(code)


def load(path: Path) -> Json:
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as error:
        die(f"cannot read {path}: {error}")


def git(root: Path, *args: str) -> str:
    command = [GIT, "-C", str(root), *args]
    try:
        # Fixed git flags only, never user text.
        done = subprocess.run(  # noqa: S603
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=GIT_TIMEOUT_S,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        die(f"git {' '.join(args)} failed: {error}")
    return done.stdout


def files_of(root: Path, path: str) -> list[str]:
    base = root / path
    found = [base] if base.is_file() else list(base.rglob("*"))[: FILES_MAX + 1]
    if len(found) > FILES_MAX:
        die(f"more than {FILES_MAX} files under {path}")
    keep = (p for p in found if p.is_file() and p.suffix in CODE_SUFFIXES)
    return [str(p.relative_to(root)) for p in keep if not SKIP_DIRS & set(p.parts)]


def changed_lines(root: Path) -> dict[str, set[int]]:
    changed: dict[str, set[int]] = defaultdict(set)
    current = None
    for line in git(root, "diff", "--unified=0", "HEAD").splitlines():
        if line.startswith("+++ "):
            current = line[6:] if line.startswith("+++ b/") else None
        hunk = re.match(r"@@ -\S+ \+(\d+)(?:,(\d+))? @@", line)
        if hunk and current:
            start = int(hunk.group(1))
            changed[current].update(range(start, start + int(hunk.group(2) or 1)))
    for path in git(root, "ls-files", "--others", "--exclude-standard").split():
        changed[path] = set(range(1, 1_000_000))
    return changed


def owner_of(spec: Json, graph: Json) -> Callable[[str], str | None]:
    pairs = ((p, e["id"]) for e in spec["entita"] for p in e.get("codice") or [])
    paths = sorted(pairs, key=lambda x: -len(x[0]))
    source = {n["id"]: n.get("source_file") or "" for n in graph["nodes"]}
    label = {n["id"]: n.get("label", "") for n in graph["nodes"]}
    for link in graph["links"]:
        if link["relation"] == "method":
            label[link["target"]] = label.get(link["source"], "")

    def owner(node: str) -> str | None:
        hits = [(p, eid) for p, eid in paths if source.get(node, "").startswith(p)]
        best = [eid for p, eid in hits if len(p) == len(hits[0][0])] if hits else []
        if len(best) == 1:
            return best[0]
        return label.get(node) if label.get(node) in best else None

    return owner


def new_link() -> Json:
    return {"graph": 0, "cli": 0, "touched": False, "ex": []}


def graph_links(spec: Json, graph: Json, root: Path) -> Links:
    owner, changed = owner_of(spec, graph), changed_lines(root)
    seen: Links = defaultdict(new_link)
    for link in (x for x in graph["links"] if x["relation"] in CODE_RELATIONS):
        a, b = owner(link["source"]), owner(link["target"])
        if a and b and a != b:
            s, where = seen[(a, b)], link.get("source_file") or ""
            line = re.match(r"L(\d+)", link.get("source_location") or "")
            s["graph"] += 1
            s["touched"] |= bool(line) and int(line.group(1)) in changed[where]
            s["ex"] = [*s["ex"], f"{where}:{link.get('source_location', '')}"]
    return seen


def cli_links(spec: Json, root: Path, seen: Links) -> None:
    for b in (e for e in spec["entita"] if e.get("cli")):
        words = "|".join(b["comandi"])
        call = re.compile(rf"(?<![\w./-]){re.escape(b['cli'])}\s+({words})\b")
        for a in (e for e in spec["entita"] if e is not b):
            for f in a["files"]:
                for m in call.finditer((root / f).read_text(errors="replace")):
                    s = seen[(a["id"], b["id"])]
                    s["cli"] += 1
                    s["ex"] = [*s["ex"], f"{f}: `{m.group(0)}`"]


def proof(ends: set[str], s: Json | None) -> str:
    if "mancante" in ends:
        return "da costruire"
    if "esterno" in ends:
        return "esterno"
    return "grafo" if s and s["graph"] else "cli" if s and s["cli"] else "non visto"


def overlay(spec: Json, graph: Json, root: Path) -> Json:
    for e in spec["entita"]:
        codice = e.get("codice")
        e["files"] = [f for p in codice or [] for f in files_of(root, p)]
        built = "costruito" if e["files"] else "mancante"
        e["status"] = "esterno" if codice is None else built
    seen = graph_links(spec, graph, root)
    cli_links(spec, root, seen)
    for s in seen.values():
        s["ex"] = s["ex"][:EXAMPLES_MAX]
    status = {e["id"]: e["status"] for e in spec["entita"]}
    for f in spec["flussi"]:
        s = seen.get((f["da"], f["a"]))
        f["prova"] = proof({status[f["da"]], status[f["a"]]}, s)
        f["st"], f["ev"] = STATE[f["prova"]], s
    for e in spec["entita"]:
        e["nfile"] = len(e.pop("files"))
    planned = {(f["da"], f["a"]) for f in spec["flussi"]}
    extra = [{"da": a, "a": b, **s} for (a, b), s in seen.items() if s["touched"]]
    spec["extra"] = [x for x in extra if (x["da"], x["a"]) not in planned]
    spec["commit"] = str(graph.get("built_at_commit", "?"))[:7]
    return spec


def main() -> None:
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--spec", type=Path, required=True)
    parser.add_argument("--graph", type=Path, required=True)
    args = parser.parse_args()

    if not GIT:
        die("git is not installed")
    for path in (args.spec, args.graph):
        if not path.is_file():
            die(f"no such file: {path}", 2)
    spec, graph = load(args.spec), load(args.graph)
    names = {e["id"] for e in spec.get("entita", [])}
    flows = {n for f in spec.get("flussi", []) for n in (f["da"], f["a"])}
    if not names or flows - names:
        die(f"{args.spec}: no entities, or flows name unknown ones: {flows - names}")
    root = Path(git(Path.cwd(), "rev-parse", "--show-toplevel").strip())
    print(json.dumps(overlay(spec, graph, root), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
