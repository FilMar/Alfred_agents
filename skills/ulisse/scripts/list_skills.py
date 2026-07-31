"""Print the skill roster with full descriptions, read live from disk.

Scans every <skills_root>/*/SKILL.md and prints one block per skill: name,
then the full `description` field. Nothing is pre-saved — add or rename a
skill and this list follows.
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


def main() -> int:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    rows = []
    for skill_md in sorted(root.glob("*/SKILL.md")):
        fm = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
        name = fm.get("name", skill_md.parent.name)
        desc = fm.get("description", "").strip().strip('"').strip()
        rows.append((name, desc))
    if not rows:
        print(f"no SKILL.md found under {root}", file=sys.stderr)
        return 1
    for name, desc in rows:
        print(f"## {name}\n{desc}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
