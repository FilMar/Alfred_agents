#!/usr/bin/env python3
# desc: Retire wiki pages: delete them, drop their index rows, repoint or remove every link to them.
# usage: retire_page.py <page>... [--into <page>] [--wiki DIR] [--dry-run]
import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from index_row import drop_row
from wiki_lib import (LINK, XREF, index_rows, page_names, read_page,
                      wiki_dir, write_page)


def last_hash(wiki, name):
    result = subprocess.run(["git", "log", "-1", "--format=%h", "--", str(wiki / f"{name}.md")],
                            capture_output=True, text=True)
    return result.stdout.strip() or "?"


def first_target(line):
    found = LINK.search(line)
    return found.group(2) if found else None


def rewrite_links(text, olds, into):
    def replace(match):
        label, target = match.group(1), match.group(2)
        if target not in olds:
            return match.group(0)
        if into:
            return f"[{label}]({into})"
        return "" if label == "detail" else label
    return LINK.sub(replace, text).replace(" \n", "\n")


def tidy_crossrefs(name, text, olds, into):
    if XREF not in text:
        return text
    head, tail = text.split(XREF, 1)
    seen, out = set(), []
    for line in tail.split("\n"):
        target = first_target(line) if line.startswith("- ") else None
        if target in olds and not into:
            continue
        target = into if target in olds else target
        if target and (target == name or target in seen):
            continue
        if target:
            seen.add(target)
        out.append(line)
    if not any(l.startswith("- ") for l in out):
        return head.rstrip("\n") + "\n"
    return head + XREF + "\n".join(out)


def update_pages(wiki, olds, into, dry):
    changed = []
    for name in page_names(wiki):
        if name in olds:
            continue
        text = read_page(wiki, name)
        new = rewrite_links(tidy_crossrefs(name, text, olds, into), olds, into)
        if name == "index":
            for old in olds:
                new = drop_row(new, old)
        if new != text:
            changed.append(name)
            if not dry:
                write_page(wiki, name, new)
    return changed


def main():
    parser = argparse.ArgumentParser(description="Retire wiki pages and clean every link to them.")
    parser.add_argument("pages", nargs="+")
    parser.add_argument("--into", help="the page that replaces them: links point there")
    parser.add_argument("--wiki", help="wiki folder (default .wiki, or $WIKI_DIR)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    wiki = wiki_dir(args.wiki)
    names = set(page_names(wiki))
    olds = set(args.pages)
    missing = sorted(olds - names)
    if missing or (args.into and args.into not in names) or args.into in olds:
        sys.exit(f"error: unknown or conflicting pages: {missing or args.into}")
    hashes = [f"{old}@{last_hash(wiki, old)}" for old in sorted(olds)]
    changed = update_pages(wiki, olds, args.into, args.dry_run)
    if not args.dry_run:
        for old in olds:
            (wiki / f"{old}.md").unlink()
    verb = "would retire" if args.dry_run else "retired"
    print(f"{verb} {len(olds)} pages, changed {len(changed)} pages: {', '.join(changed) or 'none'}")
    print(f"replaces: [{', '.join(hashes)}]")
    if args.into and not any(t == args.into for _, _, t in index_rows(read_page(wiki, "index"))):
        print(f"index: add a row for {args.into} with index_row.py")


if __name__ == "__main__":
    main()
