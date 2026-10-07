#!/usr/bin/env python3
"""Measure where to put `--min-score` on the collection an alias points at now.

A cutoff is not a preference, it is a property of the model in use: change the
model and the same number means something else. So it is measured, on the notes
the paraphrase set already knows the right answer for, against an off-topic query
that must fall below every one of them.

    ./tb_threshold.py [alias]
"""
import json
import sys
from pathlib import Path
from statistics import quantiles

from tb_benchmark import CONTROL_QUERY, PARAPHRASES, TOP_K, embed, query
from tb_corpus_report import read_all

OUT = Path(__file__).parent / "reports" / "fase0_threshold.json"
OFF_TOPIC = [
    CONTROL_QUERY,
    "orari dei treni per Bologna nel fine settimana",
    "come si potano le rose in autunno",
]


def model_of(alias):
    notes = [p["payload"] for p in read_all(alias)]
    models = {n.get("embed_model") for n in notes}
    assert len(models) == 1, f"model_of: {models} — the collection mixes models"
    return models.pop()


def prefix_for(model):
    return "search_query: " if "v2" in model else ""


def scores(alias, model, texts):
    out = []
    for text in texts:
        ids, points = query(alias, embed(model, prefix_for(model) + text), TOP_K)
        out.append({"top": points[0]["score"], "ids": ids,
                    "by_id": {p["id"]: p["score"] for p in points}})
    return out


CURVE = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]


def curve(hits, rows):
    out = []
    for cut in CURVE:
        kept = [(h, r) for h, r in zip(hits, rows) if h["top"] >= cut]
        right = sum(1 for h, r in kept if h["ids"] and h["ids"][0] == r["id"])
        out.append({"min_score": cut, "queries_with_a_hit": len(kept) / len(rows),
                    "top1_is_the_right_note": right / len(kept) if kept else None})
    return out


def main(alias):
    rows = json.loads(PARAPHRASES.read_text())["rows"]
    model = model_of(alias)
    print(f"{alias} -> {model}")

    hits = scores(alias, model, [r["paraphrase"] for r in rows])
    correct = [h["by_id"][r["id"]] for h, r in zip(hits, rows) if r["id"] in h["by_id"]]
    tops = [h["top"] for h in hits]
    noise = [h["top"] for h in scores(alias, model, OFF_TOPIC)]

    deciles = quantiles(correct, n=10)
    report = {
        "alias": alias, "model": model, "queries": len(rows),
        "correct_found": len(correct),
        "correct_min": min(correct), "correct_p10": deciles[0],
        "correct_p50": deciles[4], "correct_max": max(correct),
        "top1_min": min(tops), "top1_p50": quantiles(tops, n=10)[4],
        "off_topic_top": noise, "off_topic_max": max(noise),
        "curve": curve(hits, rows),
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(report, indent=1, ensure_ascii=False))

    print(f"correct note found in top {TOP_K}: {len(correct)}/{len(rows)}")
    print(f"  its score: min {report['correct_min']:.3f}  p10 {report['correct_p10']:.3f}  "
          f"median {report['correct_p50']:.3f}  max {report['correct_max']:.3f}")
    print(f"off-topic top-1: {[round(n, 3) for n in noise]}, worst {report['off_topic_max']:.3f}")
    print("  min_score   queries with a hit   top-1 is the right note")
    for row in report["curve"]:
        right = "n/a" if row["top1_is_the_right_note"] is None else f"{row['top1_is_the_right_note']:.3f}"
        print(f"  {row['min_score']:.2f}        {row['queries_with_a_hit']:.3f}                {right}")
    print(f"report {OUT}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "third-brain")
