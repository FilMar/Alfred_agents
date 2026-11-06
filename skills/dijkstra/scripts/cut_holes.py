#!/usr/bin/env -S uv run --script
# desc: fill cuts.json with stamp holes, code to read and dead-code proof; print it
# usage: cut_holes.py --cuts <file>
# /// script
# requires-python = ">=3.12"
# dependencies = ["tree-sitter-language-pack==1.23.1"]
# ///
import argparse
import json
import os
import shutil
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any, NoReturn

import tree_sitter_language_pack as tsl
from tree_sitter import Node

CUT_KEYS = {"id", "tipo", "cosa", "dove", "delta"}
VIEWS = {"stampo", "codice", "matrice"}
SKELETON_MIN = 0.5
HOLES_MAX = 20
COPIES_MAX = 50
COPY_LINES_MAX = 400
HITS_MAX = 20
GRAPH = Path(".graph")
STRING_DEPTH = 3
STRINGS = {"string", "template_string", "string_literal", "raw_string_literal"}
STRINGS |= {"char_literal"}
CSS = dict.fromkeys(["number", "integer_literal", "float_literal"], "num")
CSS |= dict.fromkeys(["type_identifier", "primitive_type", "predefined_type"], "type")
CSS |= dict.fromkeys(["property_identifier", "field_identifier"], "prop")
CSS |= dict.fromkeys(["true", "false", "null", "undefined", "this", "self"], "kw")
CSS |= {"identifier": "id", "shorthand_property_identifier": "prop"}

Json = dict[str, Any]
Spans = list[tuple[int, int]]


def die(message: str, code: int = 1) -> NoReturn:
    print(f"cut_holes: {message}", file=sys.stderr)
    sys.exit(code)


def css(node: Node) -> str:
    up: Node | None = node
    for _ in range(STRING_DEPTH):
        if up is not None and up.type in STRINGS:
            return "str"
        up = up.parent if up else None
    if "comment" in node.type:
        return "com"
    if not node.is_named and (node.text or b"").decode().isalpha():
        return "kw"
    return CSS.get(node.type, "pun")


def leaves(root: Node) -> list[Node]:
    found, stack = [], [root]
    while stack:
        node = stack.pop()
        if node.child_count:
            stack.extend(reversed(node.children))
        else:
            found.append(node)
    return found


def tree_diff(roots: list[Node]) -> tuple[list[Spans], list[bool], int]:
    spans: list[Spans] = [[] for _ in roots]
    strings, skeleton, stack = [], 0, [roots]
    while stack:
        first = (nodes := stack.pop())[0]
        if first.child_count and len({(n.type, n.child_count) for n in nodes}) == 1:
            kids = [[n.children[i] for n in nodes] for i in range(first.child_count)]
            stack.extend(reversed(kids))
        elif not first.child_count and all(n.text == first.text for n in nodes):
            skeleton += 1
        else:
            strings.append(css(first) == "str")
            for span, node in zip(spans, nodes, strict=True):
                span.append((node.start_byte, node.end_byte))
    return spans, strings, skeleton


def hole_at(spans: Spans, at: int) -> int:
    return next((i + 1 for i, (a, b) in enumerate(spans) if a <= at < b), 0)


def paint(src: bytes, root: Node, spans: Spans, area: range) -> list[Json]:
    segs, pos = [], area.start
    for leaf in leaves(root):
        if leaf.start_byte not in area:
            continue
        if leaf.start_byte > pos:
            gap = hole_at(spans, pos - 1)
            gap = gap if gap == hole_at(spans, leaf.start_byte) else 0
            segs.append({"t": src[pos : leaf.start_byte].decode(), "c": "", "h": gap})
        text = src[leaf.start_byte : leaf.end_byte].decode()
        segs.append({"t": text, "c": css(leaf), "h": hole_at(spans, leaf.start_byte)})
        pos = leaf.end_byte
    return segs


def derived(values: list[dict[int, str]], strings: list[bool]) -> dict[int, Json]:
    kind: dict[int, Json] = {}
    for h in range(1, len(strings) + 1):
        for j in (j for j in range(1, h) if j not in kind):
            same = all(v.get(h) == v.get(j) for v in values)
            quoted = all(v.get(h) == f'"{v.get(j)}"' for v in values)
            if same or quoted:
                text = quoted or (strings[h - 1] and not strings[j - 1])
                kind[h] = {"of": j, "how": "stringify" if text else "uguale"}
                break
    return kind


def read_copy(copy: Json) -> str:
    path, (start, end) = Path(copy["file"]), copy["righe"]
    if not path.is_file():
        die(f"no such file: {path}")
    lines = path.read_text().splitlines()
    if not 1 <= start <= end <= len(lines) or end - start >= COPY_LINES_MAX:
        die(f"{path}: lines {start}-{end} are not a range under {COPY_LINES_MAX}")
    return "\n".join(lines[start - 1 : end])


def grammar(lang: str) -> Any:
    try:
        return tsl.get_parser(lang)
    except tsl.Error as error:
        die(f"no tree-sitter grammar for {lang}: {error}")


def stamp(spec: Json) -> Json:
    parser = grammar(spec["lingua"])
    if not 1 < len(spec["copie"]) <= COPIES_MAX:
        die(f"a stamp needs 2 to {COPIES_MAX} copies")
    wrap = spec.get("involucro")
    head, tail = (f"{wrap[0]}\n", f"\n{wrap[1]}") if wrap else ("", "")
    blocks = [read_copy(c) for c in spec["copie"]]
    srcs = [f"{head}{b}{tail}".encode() for b in blocks]
    roots = [parser.parse(s).root_node for s in srcs]
    spans, strings, skeleton = tree_diff(roots)
    areas = [range(len(head.encode()), len(s) - len(tail.encode())) for s in srcs]
    rows = [paint(*args) for args in zip(srcs, roots, spans, areas, strict=True)]
    holes = range(1, len(strings) + 1)
    values = [
        {h: "".join(s["t"] for s in r if s["h"] == h).strip() for h in holes}
        for r in rows
    ]
    kind = derived(values, strings)
    free = [h for h in holes if h not in kind]
    share = skeleton / max(1, skeleton + len(strings))
    after = spec["dopo"].encode()
    return spec | {
        "rows": rows,
        "kind": {str(h): k for h, k in kind.items()},
        "free": free,
        "table": [[v.get(h, "") for h in free] for v in values],
        "share": round(share, 2),
        "low": share < SKELETON_MIN or len(strings) > HOLES_MAX,
        "after": paint(after, parser.parse(after).root_node, [], range(len(after))),
        "prima": sum(len(b.splitlines()) for b in blocks),
    }


def by_line(segs: list[Json]) -> list[list[Json]]:
    rows: list[list[Json]] = [[]]
    for seg in segs:
        for i, part in enumerate(seg["t"].split("\n")):
            if i:
                rows.append([])
            rows[-1].append(seg | {"t": part})
    return rows


def run(cmd: list[str], **opts: Any) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, check=False, **opts)


def mentions(symbol: str, pieces: list[Json]) -> list[str]:
    if not shutil.which("rg"):
        die("rg not found: it proves dead code")
    found = run(["rg", "-n", "-w", "-F", "--no-heading", "--", symbol, "."])
    if found.returncode > 1:
        die(f"rg failed: {found.stderr.strip()}")
    spans = [(Path(p["file"]).resolve(), *p["righe"]) for p in pieces]
    hits = []
    for line in found.stdout.splitlines():
        path, num, text = line.split(":", 2)
        here = Path(path).resolve()
        if not any(here == f and a <= int(num) <= b for f, a, b in spans):
            hits.append(f"{path.removeprefix('./')}:{num} {text.strip()}")
    return hits


def callers(symbol: str, file: str) -> Json | None:
    if not (GRAPH.is_dir() and shutil.which("graphify")):
        return None
    env, target = os.environ | {"GRAPHIFY_OUT": str(GRAPH)}, f"{file}::{symbol}"
    told = run(["graphify", "explain", target, "--all"], env=env, timeout=60)
    if "No node matching" in told.stdout + told.stderr:
        return {"node": None, "in": []}
    if told.returncode:
        die(f"graphify explain {symbol}: {(told.stderr or told.stdout).strip()}")
    lines = [line.strip() for line in told.stdout.splitlines()]
    node = next((x[5:].strip() for x in lines if x.startswith("Node:")), symbol)
    edges = [x[4:] for x in lines if x.startswith("<--") and "[contains]" not in x]
    return {"node": node, "in": edges}


def code(spec: Json) -> Json:
    parser, pieces = grammar(spec["lingua"]), spec["pezzi"]
    for piece in pieces:
        block = read_copy(piece).encode()
        start, end = piece["righe"]
        gone = set(piece.get("via") or range(start, end + 1))
        segs = paint(block, parser.parse(block).root_node, [], range(len(block)))
        rows = enumerate(by_line(segs), start)
        piece["lines"] = [{"n": n, "gone": n in gone, "segs": r} for n, r in rows]
        if symbol := piece.get("simbolo"):
            hits, graph = mentions(symbol, pieces), callers(symbol, piece["file"])
            piece |= {"grafo": graph, "quante": len(hits)}
            piece["occorrenze"] = hits[:HITS_MAX]
            piece["vivo"] = bool(hits or (graph and graph["in"]))
    return spec


def matrix(spec: Json) -> Json:
    fields, rows = spec["campi"], spec["righe"]
    if any(len(r) != len(fields) for r in rows):
        die(f"every row of the matrix needs {len(fields)} values")
    texts = [[json.dumps(v, ensure_ascii=False) for v in r] for r in rows]
    tops = [Counter(c).most_common(1)[0] for c in zip(*texts, strict=True)]
    defaults = [v if n > len(rows) // 2 else None for v, n in tops]
    pairs = [zip(r, defaults, strict=True) for r in texts]
    cells = [[{"v": v, "def": v == d} for v, d in p] for p in pairs]
    named = [{"f": f, "v": d} for f, d in zip(fields, defaults, strict=True) if d]
    return spec | {"cells": cells, "defaults": named}


def main() -> None:
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--cuts", type=Path, required=True)
    args = parser.parse_args()

    try:
        data = json.loads(args.cuts.read_text())
    except (OSError, json.JSONDecodeError) as error:
        die(f"cannot read {args.cuts}: {error}", 2)
    ids = [c.get("id") for c in data.get("tagli", [])]
    if not ids or len(set(ids)) != len(ids):
        die(f"{args.cuts} needs a tagli list with unique ids", 2)
    for cut in data["tagli"]:
        if missing := CUT_KEYS - cut.keys():
            die(f"{cut['id']} has no {', '.join(sorted(missing))}", 2)
        if len(VIEWS & cut.keys()) > 1:
            die(f"{cut['id']} has more than one view: {', '.join(sorted(VIEWS))}", 2)
        if "stampo" in cut:
            cut["stampo"] = stamp(cut["stampo"])
        if "codice" in cut:
            cut["codice"] = code(cut["codice"])
        if "matrice" in cut:
            cut["matrice"] = matrix(cut["matrice"])
    json.dump(data, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
