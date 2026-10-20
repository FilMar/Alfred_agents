#!/usr/bin/env python3
# desc: Close a curation run: save the trust spread and close pairs after, write report.html with charts, and open it.
# usage: report.py <run_dir>
"""The report is temporary: it lives in the run folder under /tmp."""

import html
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

BAR_W = 22
CHART_H = 140


def cli(args: list[str], out: Path) -> object:
    text = subprocess.run(args, check=True, capture_output=True, text=True).stdout
    out.write_text(text)
    return json.loads(text)


def load(path: Path) -> object:
    return json.loads(path.read_text())


def bars(groups: list[tuple[str, list[int]]], labels: list[str], colors: list[str]) -> str:
    peak = max([1] + [v for _, values in groups for v in values])
    per_label = len(groups) * BAR_W + 10
    width = len(labels) * per_label + 20
    parts = [f'<svg viewBox="0 0 {width} {CHART_H + 30}" class="chart" role="img">']
    for i, label in enumerate(labels):
        x0 = 10 + i * per_label
        for g, (_, values) in enumerate(groups):
            h = round(values[i] / peak * CHART_H)
            x = x0 + g * BAR_W
            parts.append(f'<rect x="{x}" y="{CHART_H - h}" width="{BAR_W - 3}" height="{h}" fill="{colors[g]}">'
                         f"<title>{html.escape(groups[g][0])} {label}: {values[i]}</title></rect>")
            parts.append(f'<text x="{x + BAR_W / 2 - 1.5}" y="{CHART_H - h - 3}" class="v">{values[i]}</text>')
        parts.append(f'<text x="{x0 + per_label / 2 - 5}" y="{CHART_H + 18}" class="l">{html.escape(label)}</text>')
    parts.append("</svg>")
    legend = "".join(f'<span><i style="background:{colors[g]}"></i>{html.escape(name)}</span>' for g, (name, _) in enumerate(groups))
    return f'<div class="legend">{legend}</div>' + "".join(parts)


def spread_chart(before: dict, after: dict) -> str:
    labels = [f"{i / 10:.1f}" for i in range(len(before["spread"]["bins"]))]
    groups = [("before", before["spread"]["bins"]), ("after", after["spread"]["bins"])]
    return bars(groups, labels, ["var(--muted)", "var(--accent)"])


def reach_chart(reach: dict) -> str:
    buckets = [("0", 0, 0), ("1", 1, 1), ("2", 2, 2), ("3-5", 3, 5), ("6-10", 6, 10), ("11+", 11, 10**9)]
    counts = [sum(1 for r in reach["rules"] if lo <= r["reached"] <= hi) for _, lo, hi in buckets]
    return bars([("rules", counts)], [b[0] for b in buckets], ["var(--accent)"])


def actions_table(actions: list[dict]) -> str:
    if not actions:
        return "<p>No action.</p>"
    rows = "".join(
        f"<tr><td>{a['op']}</td><td>{a['store']}</td><td>{html.escape(a['why'])}</td>"
        f"<td class='ids'>{' '.join(i[:8] for i in a['ids'])}</td></tr>"
        for a in actions
    )
    return f"<table><tr><th>op</th><th>store</th><th>why</th><th>ids</th></tr>{rows}</table>"


def page(run: Path, data: dict) -> str:
    counts = Counter(f"{a['store']} {a['op']}" for a in data["actions"])
    tiles = "".join(f"<div class='tile'><b>{n}</b><span>{html.escape(k)}</span></div>" for k, n in sorted(counts.items()))
    unreached = "".join(f"<li>{html.escape(r['if'])}</li>" for r in data["reach_after"]["unreached"])
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Aristotele run</title><style>
:root {{ --bg:#fafaf7; --fg:#1d1d1b; --muted:#b9b6ab; --accent:#3b6ea5; --line:#e2dfd6; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#16171a; --fg:#e8e6e1; --muted:#55524b; --accent:#7aa7d9; --line:#2c2d31; }} }}
body {{ background:var(--bg); color:var(--fg); font:15px/1.5 system-ui,sans-serif; max-width:960px; margin:0 auto; padding:16px; }}
h1 {{ font-size:22px; }} h2 {{ font-size:17px; margin-top:32px; border-bottom:1px solid var(--line); }}
.tiles {{ display:flex; flex-wrap:wrap; gap:8px; }} .tile {{ border:1px solid var(--line); padding:8px 12px; border-radius:6px; }}
.tile b {{ display:block; font-size:22px; }} .chart {{ width:100%; max-width:640px; }} .chart text {{ fill:var(--fg); font-size:10px; text-anchor:middle; }}
.legend span {{ margin-right:12px; font-size:13px; }} .legend i {{ display:inline-block; width:10px; height:10px; margin-right:4px; }}
table {{ border-collapse:collapse; width:100%; font-size:14px; }} td,th {{ border-bottom:1px solid var(--line); padding:4px 6px; text-align:left; vertical-align:top; }}
.ids {{ font-family:monospace; font-size:12px; }}
</style></head><body>
<h1>Aristotele run {html.escape(run.name)}</h1>
<div class="tiles">{tiles or "<p>No action.</p>"}</div>
<h2>Close pairs</h2><p>tb: {len(data["near_tb"])} before, {len(data["near_tb_after"])} after. ti: {len(data["near_ti"])} before, {len(data["near_ti_after"])} after.</p>
<h2>Trust of the notes (tb)</h2>{spread_chart(data["before_tb"], data["after_tb"])}
<h2>Trust of the rules (ti)</h2>{spread_chart(data["before_ti"], data["after_ti"])}
<h2>How often each rule comes up, after the run</h2><p>{data["reach_after"]["prompts"]} real prompts.</p>{reach_chart(data["reach_after"])}
<h2>Actions</h2>{actions_table(data["actions"])}
<h2>Rules that still never come up</h2><ul>{unreached}</ul>
</body></html>"""


def main() -> int:
    if len(sys.argv) != 2 or not (Path(sys.argv[1]) / "actions.jsonl").is_file():
        print("usage: report.py <run_dir>  (a folder made by gather.sh)", file=sys.stderr)
        return 2
    run = Path(sys.argv[1])
    data = {name: load(run / f"{name}.json") for name in ["before_tb", "before_ti", "near_tb", "near_ti"]}
    data["after_tb"] = cli(["tb", "refine"], run / "after_tb.json")
    data["after_ti"] = cli(["ti", "refine"], run / "after_ti.json")
    data["near_tb_after"] = cli(["tb", "near", "--min", "0.9", "--limit", "50"], run / "near_tb_after.json")
    data["near_ti_after"] = cli(["ti", "near", "--min", "0.85", "--limit", "50"], run / "near_ti_after.json")
    with (run / "prompts.json").open() as prompts:
        text = subprocess.run(["ti", "reach"], stdin=prompts, check=True, capture_output=True, text=True).stdout
    (run / "reach_after.json").write_text(text)
    data["reach_after"] = json.loads(text)
    data["actions"] = [json.loads(line) for line in (run / "actions.jsonl").read_text().splitlines() if line.strip()]

    out = run / "report.html"
    out.write_text(page(run, data))
    subprocess.run(["xdg-open", str(out)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
