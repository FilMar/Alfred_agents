#!/usr/bin/env python3
"""Build the paraphrase test set for the embedding benchmark. Written once, committed.

A retrieval index earns its keep when a note comes back from a question that does
not repeat its words. So each sampled note gets one Italian paraphrase of its
`what`, and any word that is rare in the corpus is banned from it: with the rare
words in place the test would measure lexical overlap, not meaning.

    ./tb_paraphrase_set.py [sample_size]
"""
import json
import os
import random
import re
import sys
import urllib.request
from collections import Counter
from pathlib import Path

from tb_corpus_report import read_all

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
MODEL = "gemma4:12b"
OUT = Path(__file__).parent / "data" / "paraphrases.json"
SEED = 20260928
SAMPLE = 120
RARE_AT_MOST = 3
MIN_WORD_LEN = 5
RETRIES = 1


def words(text):
    return [w for w in re.findall(r"[a-zàèéìòù]{%d,}" % MIN_WORD_LEN, text.lower())]


def rare_words(notes):
    seen = Counter()
    for note in notes:
        for word in set(words(note["what"])):
            seen[word] += 1
    return {word for word, count in seen.items() if count <= RARE_AT_MOST}


SYSTEM = (
    "Riformuli concetti. Rispondi SOLO con una singola frase in italiano. "
    "Vietato: elenchi, alternative, preamboli, virgolette, grassetto, spiegazioni."
)


def ask(prompt):
    body = {
        "model": MODEL, "think": False, "stream": False,
        "options": {"temperature": 0.3, "num_predict": 200},
        "messages": [{"role": "system", "content": SYSTEM},
                     {"role": "user", "content": prompt}],
    }
    req = urllib.request.Request(
        f"{OLLAMA_HOST}/api/chat", data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=900) as res:
        return json.load(res)["message"]["content"].strip().strip('"')


def prompt_for(what, banned):
    ban = ""
    if banned:
        ban = "Non usare nessuna di queste parole: " + ", ".join(sorted(banned)) + ".\n"
    return (
        "Riformula il concetto qui sotto come lo chiederebbe qualcuno che lo ha "
        "capito ma non ricorda come era scritto.\n"
        f"{ban}"
        f"Concetto: {what}"
    )


def leaked(paraphrase, what, rare):
    return sorted(set(words(paraphrase)) & set(words(what)) & rare)


def generate(note, rare):
    banned = sorted(set(words(note["what"])) & rare)
    for attempt in range(RETRIES + 1):
        text = ask(prompt_for(note["what"], banned if attempt else []))
        left = leaked(text, note["what"], rare)
        if not left:
            return text, [], attempt
        banned = sorted(set(banned) | set(left))
    return text, left, RETRIES


def main(size):
    notes = [p["payload"] for p in read_all("third-brain")]
    rare = rare_words(notes)
    print(f"{len(notes)} notes, {len(rare)} rare words (in at most {RARE_AT_MOST} notes)")

    random.seed(SEED)
    chosen = random.sample(sorted(notes, key=lambda n: n["id"]), size)

    rows, leaks = [], 0
    for i, note in enumerate(chosen, 1):
        text, left, retried = generate(note, rare)
        leaks += 1 if left else 0
        rows.append({"id": note["id"], "what": note["what"], "paraphrase": text,
                     "leaked": left, "retried": bool(retried)})
        if i % 10 == 0:
            print(f"  {i} / {size}, {leaks} still leaking a rare word")

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(
        {"model": MODEL, "seed": SEED, "rare_at_most": RARE_AT_MOST, "rows": rows},
        indent=1, ensure_ascii=False))
    print(f"written {len(rows)} paraphrases to {OUT}, {leaks} with a rare word left")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else SAMPLE)
