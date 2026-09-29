# spike: query-rewrite
# question: Su prompt lunghi (40+ parole) dove un tema sta sepolto in chiacchiera, una riscrittura con un modello locale da 9B alza il recall@10 di almeno 0.10 assoluto sul prompt grezzo, con meno di 3s di latenza mediana?
# opened: 2026-09-29   timebox: 2h
# run: python spikes/2026-09-29-query-rewrite/main.py
# status: closed 2026-09-29
# answer: NO. 60 paraphrases buried in real 40-150 word prompts from tl (167 available). recall@10:
#   raw 0.283, rewritten 0.233 (gain -0.050, needed +0.10), oracle 0.883. Rewrite latency 0.7s median
#   on the 9B at bazzite. The rewriter keeps the dominant topic of the message, which is the noise.
#   Limit: the test hides an unrelated topic, so it cannot show a rewrite that narrows a coherent prompt
#   (no labelled real prompts exist). Only 18% of real prompts have 40+ words; 55% have 15 or fewer.
# verdict: discard
#
# Rules are off in here: no contracts, no tests, no abstraction.
# Delete this folder when it stops compiling. Never promote this code.

# --- parameters: edit these, then run again ---
SAMPLE = 60              # paraphrases to test, out of 120
MIN_WORDS = 40           # noise prompts must be at least this long (words)
MAX_WORDS = 150          # and at most this long (words)
REWRITER = "ornith-1.5:9b"   # model that rewrites, served by OLLAMA_HOST (bazzite)
REWRITE_MAX_WORDS = 25   # words asked of the rewrite
GAIN_NEEDED = 0.10       # recall@10 gain to call it worth it (absolute)
LATENCY_MAX_S = 3.0      # median rewrite latency allowed (seconds)
TOP_K = 10               # recall window
SEED = 7
COLLECTION = "third-brain__v2moe-768"
EMBED_MODEL = "nomic-embed-text-v2-moe"
# --- end parameters ---

import sys, pathlib, json, os, random, statistics, time, urllib.request
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "scripts"))
from qdrant_clone import call

OLLAMA = os.environ.get("OLLAMA_URL", "http://localhost:11434")
REWRITE_HOST = os.environ["OLLAMA_HOST"]
TL = os.environ.get("TL_API_URL", "http://localhost:8790")
ROOT = pathlib.Path(__file__).resolve().parents[2]


def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=300))


def get(path):
    return json.load(urllib.request.urlopen(TL + path, timeout=30))


def embed(text):
    return post(f"{OLLAMA}/api/embed", {"model": EMBED_MODEL, "input": "search_query: " + text})["embeddings"][0]


def top_ids(text):
    status, res = call("POST", f"/collections/{COLLECTION}/points/query",
                       {"query": embed(text), "using": "dense", "limit": TOP_K, "with_payload": False})
    assert status == 200, res
    return [p["id"] for p in res["result"]["points"]]


def rewrite(prompt):
    ask = (f"Riscrivi il messaggio in una sola query di ricerca in italiano, al massimo {REWRITE_MAX_WORDS} parole, "
           f"che nomini il concetto tecnico o la decisione di cui si parla davvero. Rispondi solo con la query.\n\n"
           f"Messaggio:\n{prompt}")
    t = time.time()
    out = post(f"{REWRITE_HOST}/api/generate", {"model": REWRITER, "prompt": ask, "stream": False, "think": False,
                                          "options": {"temperature": 0}})["response"].strip()
    return out, time.time() - t


def noise_prompts():
    rows = [e for e in get("/exchanges?limit=2000") if e["kind"] == "chat"]
    found = []
    for e in rows:
        text = get(f"/contents/{e['id']}")["input"]
        if MIN_WORDS <= len(text.split()) <= MAX_WORDS:
            found.append(text)
    return found


def bury(noise, paraphrase):
    words = noise.split()
    mid = len(words) // 2
    return " ".join(words[:mid]) + " " + paraphrase + " " + " ".join(words[mid:])


def main():
    rnd = random.Random(SEED)
    rows = json.loads((ROOT / "scripts/data/paraphrases.json").read_text())["rows"]
    rows = rnd.sample(rows, SAMPLE)
    noise = noise_prompts()
    print(f"noise prompts available: {len(noise)}")
    hit = {"raw": 0, "rewritten": 0, "oracle": 0}
    at1 = {"raw": 0, "rewritten": 0, "oracle": 0}
    lat, samples = [], []
    for row in rows:
        buried = bury(rnd.choice(noise), row["paraphrase"])
        rewritten, seconds = rewrite(buried)
        lat.append(seconds)
        for name, text in (("raw", buried), ("rewritten", rewritten), ("oracle", row["paraphrase"])):
            ids = top_ids(text) if text else []
            hit[name] += row["id"] in ids
            at1[name] += ids[:1] == [row["id"]]
        if len(samples) < 3:
            samples.append({"buried": buried[:200], "rewritten": rewritten, "paraphrase": row["paraphrase"]})
    n = len(rows)
    for name in hit:
        print(f"{name:10s} recall@{TOP_K} {hit[name]/n:.3f}   recall@1 {at1[name]/n:.3f}")
    gain = (hit["rewritten"] - hit["raw"]) / n
    median = statistics.median(lat)
    print(f"gain {gain:+.3f} (needed {GAIN_NEEDED})   latency median {median:.1f}s p90 {sorted(lat)[int(n*0.9)]:.1f}s (max {LATENCY_MAX_S})")
    print("VERDICT:", "worth it" if gain >= GAIN_NEEDED and median <= LATENCY_MAX_S else "discard")
    for x in samples:
        print(json.dumps(x, ensure_ascii=False, indent=1))


main()
