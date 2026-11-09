#!/usr/bin/env -S uv run --script
# desc: module for code_view.py: paint a source text line by line with tree-sitter
# /// script
# requires-python = ">=3.12"
# dependencies = ["tree-sitter-language-pack==1.23.1"]
# ///
from pathlib import Path
from typing import Any

import tree_sitter_language_pack as tsl
from tree_sitter import Node

LANGS = {
    ".rs": "rust",
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
}
LANGS |= {".mjs": "javascript", ".sh": "bash", ".bash": "bash", ".go": "go"}
STRING_DEPTH = 3
STRINGS = {
    "string",
    "template_string",
    "string_literal",
    "raw_string_literal",
    "char_literal",
}
CSS = dict.fromkeys(["number", "integer_literal", "float_literal"], "num")
CSS |= dict.fromkeys(["type_identifier", "primitive_type", "predefined_type"], "type")
CSS |= dict.fromkeys(
    ["property_identifier", "field_identifier", "shorthand_property_identifier"],
    "prop",
)
CSS |= dict.fromkeys(["true", "false", "null", "undefined", "this", "self"], "kw")
CSS |= {"identifier": "id"}

Json = dict[str, Any]


def lines_of(text: str) -> list[str]:
    return text.removesuffix("\n").split("\n") if text else []


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


def painted(text: str, path: str) -> list[list[Json]]:
    lines = lines_of(text)
    lang = LANGS.get(Path(path).suffix)
    if not lang:
        return [[{"t": line, "c": ""}] for line in lines]
    src, pos, rows = text.encode(), 0, [[]]
    parsed = tsl.get_parser(lang).parse(src).root_node
    for leaf in leaves(parsed):
        gap = src[pos : leaf.start_byte].decode()
        word = src[leaf.start_byte : leaf.end_byte].decode()
        for part, kind in ((gap, ""), (word, css(leaf))):
            for i, piece in enumerate(part.split("\n")):
                if i:
                    rows.append([])
                rows[-1].append({"t": piece, "c": kind})
        pos = leaf.end_byte
    return (rows + [[] for _ in lines])[: len(lines)]
