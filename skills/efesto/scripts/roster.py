"""Print the skill roster from the filesystem.

Scans every <skills_root>/*/SKILL.md, parses the frontmatter (name,
description) and prints one line per skill: name — first sentence of the
description. Nothing is pre-saved: rename a skill and the roster follows.
"""

import re
import sys
from pathlib import Path


def parse_frontmatter(text: str) -> dict:
    m = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return {}
    fields = {}
    key, buf = None, []
    for line in m.group(1).splitlines():
        kv = re.match(r"^(\w[\w-]*):\s*(.*)$", line)
        if kv:
            if key:
                fields[key] = " ".join(buf).strip()
            key, rest = kv.group(1), kv.group(2)
            buf = [] if rest in (">", "|", ">-", "|-") else [rest]
        elif key and line.startswith((" ", "\t")):
            buf.append(line.strip())
    if key:
        fields[key] = " ".join(buf).strip()
    return fields


def first_sentence(text: str, limit: int = 110) -> str:
    text = text.strip().strip('"').strip()
    m = re.search(r"(?<=[.!?])\s", text)
    sentence = text[: m.start()] if m else text
    if len(sentence) > limit:
        sentence = sentence[: limit - 1].rstrip() + "…"
    return sentence


def main() -> int:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    rows = []
    for skill_md in sorted(root.glob("*/SKILL.md")):
        fm = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
        name = fm.get("name", skill_md.parent.name)
        rows.append((name, first_sentence(fm.get("description", ""))))
    if not rows:
        print(f"no SKILL.md found under {root}", file=sys.stderr)
        return 1
    width = max(len(name) for name, _ in rows)
    for name, desc in rows:
        print(f"{name:<{width}}  {desc}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
