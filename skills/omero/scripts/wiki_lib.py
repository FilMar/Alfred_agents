# desc: Shared helpers for the Omero scripts: pages, links, index rows.
import os
import re
import sys
from pathlib import Path

SPECIAL = ("index", "roadmap")
XREF = "## Cross-references"
LINK = re.compile(r"\[([^\]]*)\]\(([^)#\s]+)\)")
ROW = re.compile(r"\| \[([^\]]+)\]\(([^)]+)\)")


def wiki_dir(arg):
    path = Path(arg or os.environ.get("WIKI_DIR", ".wiki"))
    if not path.is_dir():
        sys.exit(f"error: no wiki folder at {path}")
    return path


def page_names(wiki):
    return sorted(p.stem for p in wiki.glob("*.md") if not p.name.startswith("."))


def topic_of(name):
    return name.split("_", 1)[0]


def read_page(wiki, name):
    return (wiki / f"{name}.md").read_text(encoding="utf-8")


def write_page(wiki, name, text):
    (wiki / f"{name}.md").write_text(text, encoding="utf-8")


def split_frontmatter(text):
    lines = text.split("\n")
    if lines[0] != "---" or "---" not in lines[1:]:
        return [], lines, 0
    end = lines.index("---", 1)
    return lines[1:end], lines[end + 1:], end + 1


def index_rows(text):
    section = None
    for number, line in enumerate(text.split("\n"), 1):
        if line.startswith("## "):
            section = line[3:].strip()
            continue
        match = ROW.match(line)
        if match and section is not None:
            yield number, section, match.group(2)
