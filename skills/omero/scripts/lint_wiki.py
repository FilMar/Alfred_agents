#!/usr/bin/env python3
# desc: Check the wiki for what a script can see: links, index, frontmatter, 40 lines, long sentences.
# usage: lint_wiki.py [--wiki DIR] [--full]
import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wiki_lib import (LINK, SPECIAL, index_rows, page_names, read_page,
                      split_frontmatter, topic_of, wiki_dir)

LINE_LIMIT = 40
SENTENCE_LIMIT = 30
BULLET = re.compile(r"^\s*([-*]|\d+\.)\s+")
SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'`(\[*\x00])")


def clean(text):
    text = re.sub(r"`[^`]*`", "X", text)
    text = LINK.sub(lambda m: m.group(1), text)
    return re.sub(r"[*_]{1,2}", "", text)


def paragraphs(lines, first_number):
    current, start, fenced = [], 0, False
    for number, raw in enumerate(lines, first_number):
        line = raw.rstrip()
        if line.startswith("```"):
            fenced = not fenced
            line = ""
        if fenced or not line or line.startswith(("#", "|")):
            if current:
                yield start, " ".join(current)
            current = []
            continue
        if BULLET.match(line) or not current:
            if current:
                yield start, " ".join(current)
            current, start = [BULLET.sub("", line).strip()], number
        else:
            current.append(line.strip().lstrip("> "))
    if current:
        yield start, " ".join(current)


def sentences_of(paragraph):
    spans = []

    def mask(match):
        spans.append(match.group(0))
        return f"\x00{len(spans) - 1}\x00"

    masked = re.sub(r"`[^`]*`", mask, paragraph)
    for part in SENTENCE_END.split(masked):
        yield re.sub(r"\x00(\d+)\x00", lambda m: spans[int(m.group(1))], part)


def long_sentences(name, body_lines, first_number, full):
    for number, paragraph in paragraphs(body_lines, first_number):
        for raw in sentences_of(paragraph):
            words = len(clean(raw).split())
            if words > SENTENCE_LIMIT:
                shown = raw if full else " ".join(raw.split()[:7]) + " ..."
                yield (name, number, "LONG_SENTENCE", f"{words} words: {shown}")


def check_page(wiki, name, names, full):
    text = read_page(wiki, name)
    front, body, offset = split_frontmatter(text)
    total = len(text.rstrip("\n").split("\n"))
    if name not in SPECIAL:
        if total > LINE_LIMIT:
            yield (name, 1, "LINES", f"{total} lines, the limit is {LINE_LIMIT}")
        if not front or not any(l.startswith("tags:") for l in front) or not any(l.startswith("sources:") for l in front):
            yield (name, 1, "FRONTMATTER", "needs frontmatter with tags and sources")
        for line in front:
            if line.startswith("replaces:"):
                for item in re.findall(r"([^\s,\[\]@]+)@", line):
                    if item in names:
                        yield (name, 1, "REPLACES_LEFT", f"{item} is replaced but still exists")
    for number, line in enumerate(text.split("\n"), 1):
        for _, target in LINK.findall(line):
            if target not in names and not target.startswith(("http", "mailto")):
                yield (name, number, "BROKEN_LINK", f"links to {target}, which does not exist")
    if name not in SPECIAL:
        yield from long_sentences(name, body, offset + 1, full)


def check_index(wiki, names):
    rows = list(index_rows(read_page(wiki, "index")))
    listed = {target for _, _, target in rows}
    for number, section, target in rows:
        if target not in names:
            yield ("index", number, "INDEX_NO_FILE", f"row for {target} has no file")
        elif target not in SPECIAL and topic_of(target) != section:
            yield ("index", number, "INDEX_SECTION", f"{target} sits under {section}")
    for name in names:
        if name not in SPECIAL and name not in listed:
            yield ("index", 1, "INDEX_MISSING", f"{name} is not in the index")


def check_dot_files(wiki):
    for path in sorted(wiki.glob(".*.md")):
        yield (path.stem, 1, "DOT_FILE", "leftover dot-named page")


def main():
    parser = argparse.ArgumentParser(description="Check the wiki for what a script can see.")
    parser.add_argument("--wiki", help="wiki folder (default .wiki, or $WIKI_DIR)")
    parser.add_argument("--full", action="store_true", help="print each long sentence whole")
    args = parser.parse_args()
    wiki = wiki_dir(args.wiki)
    names = set(page_names(wiki))
    findings = list(check_dot_files(wiki)) + list(check_index(wiki, names))
    for name in sorted(names):
        findings.extend(check_page(wiki, name, names, args.full))
    for name, number, code, message in findings:
        print(f"{name}.md:{number}: {code} {message}")
    print(f"{len(names)} pages, {len(findings)} findings")
    sys.exit(1 if findings else 0)


if __name__ == "__main__":
    main()
