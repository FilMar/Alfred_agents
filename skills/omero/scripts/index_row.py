#!/usr/bin/env python3
# desc: Add or drop one row of the wiki index, under the section of the page topic.
# usage: index_row.py add <page> --summary "<one line>" | drop <page> [--wiki DIR]
import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wiki_lib import (ROW, index_rows, page_names, read_page, topic_of,
                      wiki_dir, write_page)

HEADER = "| Page | Content |\n|------|---------|"


def add_row(text, name, summary):
    row = f"| [{name}]({name}) | {summary} |"
    lines = text.rstrip("\n").split("\n")
    heading = f"## {topic_of(name)}"
    if heading not in lines:
        return "\n".join(lines + ["", heading, "", HEADER, row]) + "\n"
    end = lines.index(heading) + 1
    while end < len(lines) and not lines[end].startswith("## "):
        end += 1
    while not lines[end - 1].startswith("|"):
        end -= 1
    lines.insert(end, row)
    return "\n".join(lines) + "\n"


def drop_row(text, name):
    kept = [l for l in text.split("\n") if not (ROW.match(l) and ROW.match(l).group(2) == name)]
    return "\n".join(kept)


def main():
    parser = argparse.ArgumentParser(description="Add or drop one row of the wiki index.")
    parser.add_argument("action", choices=["add", "drop"])
    parser.add_argument("page")
    parser.add_argument("--summary", help="one line for the row (add only)")
    parser.add_argument("--wiki", help="wiki folder (default .wiki, or $WIKI_DIR)")
    args = parser.parse_args()
    wiki = wiki_dir(args.wiki)
    text = read_page(wiki, "index")
    listed = any(target == args.page for _, _, target in index_rows(text))
    if args.action == "add":
        if args.page not in page_names(wiki):
            sys.exit(f"error: {args.page} is not a page of the wiki")
        if listed:
            sys.exit(f"error: {args.page} is already in the index")
        if not args.summary or "|" in args.summary:
            sys.exit("error: --summary is needed, in one line, with no |")
        write_page(wiki, "index", add_row(text, args.page, args.summary))
    else:
        if not listed:
            sys.exit(f"error: {args.page} is not in the index")
        write_page(wiki, "index", drop_row(text, args.page))
    print(f"{args.action}: {args.page}")


if __name__ == "__main__":
    main()
