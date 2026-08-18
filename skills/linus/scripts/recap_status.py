#!/usr/bin/env python3
# desc: Print SVILUPPO status breakdown with visual bars and in-progress items, reading gh JSON from stdin.
"""Print SVILUPPO status breakdown with visual bars and in-progress items."""
import sys, json

data = json.load(sys.stdin)
items = data.get("items", [])
counts = {}
in_progress = []
for item in items:
    s = item.get("status") or "No status"
    counts[s] = counts.get(s, 0) + 1
    if s == "In progress":
        repo = item.get("content", {}).get("repository", "")
        num = item.get("content", {}).get("number", "")
        title = item.get("title", "")
        assignees = ", ".join(item.get("assignees", [])) or "unassigned"
        in_progress.append(f"  {repo}#{num}  {title}  (@{assignees})")

order = ["Backlog", "Ready", "In progress", "Testing", "Done", "No status"]
for s in order:
    if s in counts:
        bar = "\u2588" * counts[s]
        print(f"  {s:12s} ({counts[s]:2d}) {bar}")
print(f"  Total: {len(items)}")
if in_progress:
    print()
    print("--- IN PROGRESS ---")
    for i in in_progress:
        print(i)