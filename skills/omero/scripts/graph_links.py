#!/usr/bin/env python3
# desc: Check the wiki against the project graph: pages with no code link,
# stale symbol citations, code hubs with no decision.
# usage: graph_links.py [--wiki DIR] [--graph FILE] [--top N]
import argparse
import json
import re
import sys
from collections import Counter
from collections.abc import Iterator
from pathlib import Path
from typing import NoReturn

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wiki_lib import SPECIAL, page_names, read_page, wiki_dir

GRAPH = Path(".graph/graph.json")
SKIP = (*SPECIAL, "GLOSSARY")
TICK = re.compile(r"`([^`\s/]+)`")
# A citation is a symbol only when it reads like one: a call, or a mixed-case name.
# File names, ALL_CAPS env vars and snake_case fields are left out: they are not code.
CALL = re.compile(r"^\.?[A-Za-z_][\w.]*\(\)$")
MIXED = re.compile(r"^\.?[A-Za-z]\w*$")

Node = dict[str, object]


def die(message: str, code: int = 1) -> NoReturn:
    print(f"graph_links: {message}", file=sys.stderr)
    sys.exit(code)


def bare(name: str) -> str:
    return name.removesuffix("()").lstrip(".")


def looks_like_symbol(text: str) -> bool:
    if CALL.match(text):
        return True
    return bool(MIXED.match(text)) and text.lower() != text != text.upper()


def load(path: Path) -> tuple[dict[str, Node], list[Node]]:
    if not path.is_file():
        die(f"no graph at {path}: run 'GRAPHIFY_OUT=.graph graphify update .'", 2)
    graph = json.loads(path.read_text(encoding="utf-8"))
    return {n["id"]: n for n in graph["nodes"]}, graph["links"]


def in_wiki(node: Node) -> bool:
    return str(node.get("source_file") or "").startswith(".wiki/")


def is_code(node: Node) -> bool:
    return node.get("file_type") == "code" and not in_wiki(node)


def is_symbol(node: Node) -> bool:
    suffix = Path(str(node.get("source_file") or "")).suffix
    return is_code(node) and not str(node.get("label", "")).endswith(suffix)


def stale_citations(wiki: Path, names: list[str], labels: set[str]) -> Iterator[str]:
    for name in names:
        for number, line in enumerate(read_page(wiki, name).split("\n"), 1):
            for text in TICK.findall(line):
                if looks_like_symbol(text) and bare(text) not in labels:
                    yield f"{name}:{number}\t{text}"


def main() -> None:
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--wiki")
    parser.add_argument("--graph", type=Path, default=GRAPH)
    parser.add_argument("--top", type=int, default=15)
    args = parser.parse_args()
    if args.top < 1:
        die("--top must be at least 1", 2)

    wiki = wiki_dir(args.wiki)
    nodes, links = load(args.graph)
    names = [n for n in page_names(wiki) if n not in SKIP]

    linked_pages, linked_code, degree = set(), set(), Counter()
    for link in links:
        ends = (link["source"], link["target"])
        degree.update(ends)
        for page_id, code_id in (ends, ends[::-1]):
            page, code = nodes.get(page_id, {}), nodes.get(code_id, {})
            if in_wiki(page) and is_code(code):
                linked_pages.add(Path(str(page["source_file"])).stem)
                linked_code.add(code_id)

    print("## Pages with no link to code")
    for name in names:
        if name not in linked_pages:
            print(name)

    print("\n## Cited symbols not in the graph")
    labels = {bare(str(n.get("label", ""))) for n in nodes.values() if is_code(n)}
    for row in stale_citations(wiki, names, labels):
        print(row)

    print(f"\n## Top {args.top} code hubs with no decision")
    hubs = [
        i
        for i, _ in degree.most_common()
        if is_symbol(nodes.get(i, {})) and i not in linked_code
    ]
    for node_id in hubs[: args.top]:
        node = nodes[node_id]
        print(f"{node['label']}\t{degree[node_id]}\t{node['source_file']}")


if __name__ == "__main__":
    main()
