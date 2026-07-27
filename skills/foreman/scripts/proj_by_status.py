#!/usr/bin/env python3
"""Filter SVILUPPO items by status. Takes status as argv[1]."""
import sys, json

target = sys.argv[1].lower() if len(sys.argv) > 1 else ""
data = json.load(sys.stdin)
items = data.get("items", [])
filtered = [i for i in items if (i.get("status") or "No status").lower() == target]
if not filtered:
    print(f"(no items with status: {sys.argv[1] if len(sys.argv) > 1 else '?'})")
for item in filtered:
    title = item.get("title", "Unknown")
    repo = item.get("content", {}).get("repository", "")
    num = item.get("content", {}).get("number", "")
    assignees = ", ".join(item.get("assignees", [])) or "-"
    print(f"  {repo}#{num}  {title}  (@{assignees})")