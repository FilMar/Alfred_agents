# spike: critic-bench
# question: Which closed questions, and which pool of critics, judge distiller candidates well? The
#   candidates are frozen (taken from extraction-hats v6 and v7), so every difference between two runs
#   comes from the critic, not from the extractor.
# opened: 2026-10-01   timebox: 2h
# run: python spikes/2026-10-01-critic-bench/main.py build | run <variant> | score
# status: answered
# answer: 75 frozen candidates (60 notes, 15 rules), labelled by a separate agent (35 low confidence).
#   A, B, C, D score 41-44/75: hats and models change nothing. All are lenient: of 16 textbook notes
#   they catch 1-2, of 15 "what was done" 0-1, of 5 project details 0-2. Keeping everything scores 32,
#   dropping everything 43. One judge at t=0.1 flips 6 of 375 answers, so the 24% split of v6 came from
#   temperature 0.7, not from the judge.
#   E (a guard role, probabilities, t=0.1): 53/75 at threshold 0.4, drop on any signal; 21 bad kept, 1
#   good dropped. On the 40 high-confidence labels: 33/40, 0 good dropped. It catches all 5 project
#   details and all 4 notes about the agent. It still misses 11 of 16 textbook and 13 of 15 "what was
#   done". explains_mechanism says yes to almost everything (17 false alarms): useless as a filter.
#   Dropping at 1/3 of the signals is worse (42/75): a bad note usually has one defect, not several.
# round 2 (2026-10-02), cost = bad kept + 3 * good dropped (decay removes bad notes later; a lost good
#   note is gone), on stored probabilities with `tune`:
#   E with one threshold per question: 53/75, the same as E. The knob is the wording, not the threshold.
#   F (textbook and record as a test with one example each way, explains_mechanism out): textbook caught
#   14/16 (E: 5). Record caught 0/15: the extractor already rewrites every note in general words, so no
#   note looks like a log. The notes labelled "record" are a definition, a project detail, or generic advice.
#   F, textbook at 0.6, the rest at 0.4: 57/75, 16 bad kept, 2 good dropped (both low confidence), 0 good
#   dropped among high confidence. E was 53/75, 21 bad kept, 1 good dropped.
#   F2 (record out, textbook widened to "common practice"): every note looks common. 9 to 18 good dropped.
# verdict 2: F, textbook at 0.6, the rest at 0.4, record question removed (it never fires).
# verdict: one judge, a role, probabilities, threshold about 0.4, drop on one signal. Diversity of hats
#   or models does not help when every judge leans the same way. Next: sharpen the two questions that
#   still miss (textbook, what was done), and drop explains_mechanism.
#
# Variants (each judge answers every question; a question is true when most valid judges say true):
#   A_black3    glm x3, black hat, temperature 0.7          (the v6 council, with the new questions)
#   B_hats      glm, black + white + yellow, temperature 0.7 (different framings)
#   C_models    black hat, glm + gemma4 + nemotron, 0.7      (different models)
#   D_single    glm, black, temperature 0.1, run twice       (one judge; flip rate between the two runs)
#   E_guard     glm, one judge, a role instead of a hat, probabilities, drop at 1/3 of the signals
#   F_guard     E with NOTE_QS_F: textbook and record rewritten as a test, explains_mechanism out
#   F2_guard    F without record, textbook widened to common practice
# Labels: labels.jsonl, one line per candidate, written by hand (see LABEL_RUBRIC). They are the truth.
#
# Rules are off in here: no contracts, no tests, no abstraction. Never promote this code.

import importlib.util, json, random, re, sys
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE.parent / "2026-10-01-extraction-hats"
spec = importlib.util.spec_from_file_location("x", SRC / "main.py")
x = importlib.util.module_from_spec(spec); spec.loader.exec_module(x)

SESSIONS = ["684fbf7a-286e-4476-be90-d03c14e2d7f5", "ea46e800-6f8d-4352-85c5-53a0e112e81d",
            "019ee613-84a2-7d48-b2e7-5342564d6049", "3f4c3b52-b287-40d1-b79d-03deba1314c7",
            "e5fee742-39fb-46b7-b2f4-ce3320a60f3d", "cbee09fe-4b69-40f5-9415-373abf0191a1"]
BENCH_NOTES, BENCH_RULES = 60, 15
PARALLEL = 3                  # calls in flight; Ollama cloud answers 429 above that
BENCH = HERE / "bench.jsonl"

NOTE_QS = {
    "is_textbook_definition": "it only explains what a well known term or feature means (any manual says it).",
    "is_agent_unconfirmed_claim": "it rests on something the agent said that the user never confirmed and no result showed, or that was denied later in the episode or the session.",
    "is_project_detail": "it holds only for this project: its data, its states, its choices.",
    "is_record_of_what_was_done": "it records what was done or decided in this work (a choice, a step, a status), not why something works.",
    "is_about_the_agent": "it describes the agent itself: its mistakes, its habits, or how it uses its own tools (polling, notifications, chat, commits).",
    "explains_mechanism": "it says how something works and why, in a way that would help in a different situation.",
}
RULE_QS = {
    "is_user_rejection": "the quote shows the user rejecting what the agent did or proposed. A plain request or instruction (\"fai X\", \"direi di fare Y\") is not a rejection.",
}
# F: the two blind questions become a test the judge can run, with one example each way.
# explains_mechanism is out (it said yes to almost everything).
NOTE_QS_F = {k: v for k, v in NOTE_QS.items() if k != "explains_mechanism"}
NOTE_QS_F["is_textbook_definition"] = (
    "a good manual or Wikipedia page on the topic already says this. Test: would someone who knows the topic "
    "learn nothing new? Yes if the note only defines or describes a known term, tool, method or feature. No if it "
    "adds a limit, a failure, a trade-off or a surprise seen in practice. Yes: \"La cosine similarity misura "
    "l'angolo tra due vettori.\" No: \"Con soglia cosine 0.95, due note che dicono il contrario sembrano duplicate.\"")
NOTE_QS_F["is_record_of_what_was_done"] = (
    "it is a log or a status of this work. Test: remove the past tense and every fact of this session (what was "
    "built, changed or chosen, which file, which number). Yes if no idea usable elsewhere is left. No if a reusable "
    "idea is left. Yes: \"Abbiamo spostato la validazione JSON dal format al prompt e ora funziona.\" No: \"Se un "
    "modello ignora lo schema in format, si chiede il JSON nel prompt e lo si valida nel codice.\"")
# F2: the extractor already rewrites every note in general words, so a "record of what was done" never looks
# like a log and F caught 0 of 15. Those notes are a definition, a project detail, or common practice.
# So record is out, and textbook widens to common practice.
NOTE_QS_F2 = {k: v for k, v in NOTE_QS_F.items() if k != "is_record_of_what_was_done"}
NOTE_QS_F2["is_textbook_definition"] = (
    "a good manual, Wikipedia page or senior colleague already says this. Test: would someone experienced in "
    "the topic learn nothing new? Yes if the note only defines a known term, tool, method or feature, or gives "
    "advice any experienced person already follows (measure before you change, test small, keep logic in one "
    "place, clean up after a failed test). No if it adds a limit, a failure, a trade-off or a surprise seen in "
    "practice. Yes: \"La cosine similarity misura l'angolo tra due vettori.\" Yes: \"Prima di cambiare strumento "
    "conviene fare una prova piccola.\" No: \"Con soglia cosine 0.95, due note che dicono il contrario sembrano "
    "duplicate.\"")
QSETS = {"E_guard": NOTE_QS, "F_guard": NOTE_QS_F, "F2_guard": NOTE_QS_F2}

DROP_IF_TRUE = ["is_textbook_definition", "is_agent_unconfirmed_claim", "is_project_detail", "is_record_of_what_was_done", "is_about_the_agent"]
DROP_IF_FALSE = ["explains_mechanism", "is_user_rejection"]

HATS = {"black": x.hat("black"), "white": x.hat("white"), "yellow": x.hat("yellow"),
        "guard": """# The Guard

You are the last guard of a knowledge base against chaos. If nothing passes you, nothing evolves: the
base stays frozen and useless. If too much passes, everything changes at once and the base turns into
noise: pure chaos. Your job is the balance. Let in what will still be worth reading in a year, in a
different project. Stop the rest. You are not a pessimist and not an optimist: you are calibrated."""}
MODELS = {"glm": "glm-5.3-flash:cloud", "gemma": "gemma4:31b-cloud", "nemotron": "nemotron-3-nano:30b-cloud"}
VARIANTS = {
    "A_black3": [("glm", "black", 0.7)] * 3,
    "B_hats":   [("glm", "black", 0.7), ("glm", "white", 0.7), ("glm", "yellow", 0.7)],
    "C_models": [("glm", "black", 0.7), ("gemma", "black", 0.7), ("nemotron", "black", 0.7)],
    "D_single": [("glm", "black", 0.1), ("glm", "black", 0.1)],   # scored per judge, not by majority
    "E_guard":  [("glm", "guard", 0.1)],                         # probabilities; drop at 1/3 of the signals
    "F_guard":  [("glm", "guard", 0.1)],                         # E with NOTE_QS_F
    "F2_guard": [("glm", "guard", 0.1)],                         # E with NOTE_QS_F2
}


def task_prob(kind, note_qs=NOTE_QS):
    qs = note_qs if kind == "note" else RULE_QS
    lines = "\n".join(f"- {k}: {v}" for k, v in qs.items())
    shape = ", ".join(f'"{k}": 0.0' for k in qs)
    return f"""

## Task
You get a piece of work (a session map, an episode, the target exchange) and ONE candidate {kind} extracted
from the target exchange. For each question give the probability, from 0.0 to 1.0, that the answer is
yes. Say what is most likely, not only what is certain.

{lines}

`why`: one short sentence, Italian.
Answer only with this JSON: {{{shape}, "why": ""}}"""


def task(kind):
    qs = NOTE_QS if kind == "note" else RULE_QS
    lines = "\n".join(f"- {k}: {v}" for k, v in qs.items())
    shape = ", ".join(f'"{k}": false' for k in qs)
    return f"""

## Task
You get a piece of work (a session map, an episode, the target exchange) and ONE candidate {kind} extracted
from the target exchange. Answer closed questions only. Do not judge whether it is useful.
Answer true only when the text clearly shows it.

{lines}

`why`: one short sentence, Italian.
Answer only with this JSON: {{{shape}, "why": ""}}"""


# ---------------------------------------------------------------- build

def build():
    rnd = random.Random(11)
    pool, seen = [], set()
    for s in SESSIONS:
        for ver in ("v6", "v7"):
            rows = [json.loads(l) for l in (SRC / f"{ver}_{s[:8]}.jsonl").open()]
            eps = next(r["episodes"] for r in rows if "episodes" in r)
            for r in rows:
                if "exchange" not in r: continue
                cands = [d for d in r.get("dropped", []) if "council" in d] + [v["cand"] for v in r.get("verdicts", []) if "council" in v["cand"]]
                for c in cands:
                    text = c.get("what") or f"SE {c['if']} ALLORA {c['do']}"
                    key = x.norm(text)[:120]
                    if key in seen: continue
                    seen.add(key)
                    pool.append({"session": s, "from_run": ver, "exchange": r["exchange"], "episode": r["episode"],
                                 "episodes": eps, "type": c["type"], "text": text, "why": c.get("why"),
                                 "quote": c.get("quote"), "old_council": c.get("council"),
                                 "old_drop": c.get("drop", "")})
    notes = [c for c in pool if c["type"] == "note"]
    rules = [c for c in pool if c["type"] == "rule"]
    # stratify notes: half the old critic dropped, half it kept; split votes first
    split = [c for c in notes if any(len(set(v)) > 1 for v in (c["old_council"] or {}).values())]
    dropped = [c for c in notes if c["old_drop"] and c not in split]
    kept = [c for c in notes if not c["old_drop"] and c not in split]
    for l in (split, dropped, kept): rnd.shuffle(l)
    pick = split[:20] + dropped[:20] + kept[:BENCH_NOTES - 20 - min(20, len(dropped[:20]))]
    rnd.shuffle(rules)
    pick += rules[:BENCH_RULES]
    with BENCH.open("w") as f:
        for i, c in enumerate(pick):
            f.write(json.dumps({"id": i, **c}, ensure_ascii=False) + "\n")
    print(f"pool {len(notes)} notes, {len(rules)} rules -> bench {len(pick)} ({len(split[:20])} split, {len(dropped[:20])} dropped)")


# ---------------------------------------------------------------- context

_live = {}


def live(session):
    if session not in _live:
        x.SESSION = session
        exs = x.exchanges()
        _live[session] = [ex for ex in exs if not x.noise(ex)]
    return _live[session]


def context(c):
    lv = live(c["session"])
    f, t = c["episode"]
    part = lv[f:t + 1]
    smap = "## The whole session, episode by episode (later episodes can deny claims made earlier)\n" + \
        "\n".join(f"- [{e['from']}-{e['to']}] {e['summary']}" for e in c["episodes"])
    ep = "\n\n".join(f"[{k}]{' <<< TARGET' if ex['id'] == c['exchange'] else ''} USER: {ex['input'][:x.EP_CHARS]}\nAGENT: {(ex['output'] or '')[:x.EP_CHARS]}"
                     for k, ex in enumerate(part))
    tgt = next(ex for ex in part if ex["id"] == c["exchange"])
    tgt_text = f"USER: {tgt['input'][:x.IN_CHARS]}\n\nAGENT: {(tgt['output'] or '')[:x.OUT_CHARS]}"
    cand = f"Candidate {c['type']}: {c['text']}" + (f"\nPerché: {c['why']}" if c.get("why") else "") + f"\nQuote: {c['quote']}"
    return f"{smap}\n\n## The episode\n{ep}\n\n## The target exchange\n{tgt_text}\n\n## The candidate\n{cand}"


# ---------------------------------------------------------------- run

def run(variant):
    bench = [json.loads(l) for l in BENCH.open()]
    for c in bench: live(c["session"])          # load tl once, before threads
    jobs = [(c, j, spec_) for c in bench for j, spec_ in enumerate(VARIANTS[variant])]

    def one(job):
        c, j, (model, hatname, temp) = job
        ans, log = llm_with_judge(c, model, hatname, temp, QSETS.get(variant, NOTE_QS))
        return {"id": c["id"], "judge": j, "model": model, "hat": hatname, "answers": ans, "llm": log}
    out = (HERE / f"run_{variant}.jsonl").open("w")
    with ThreadPoolExecutor(PARALLEL) as pool:
        for k, r in enumerate(pool.map(one, jobs)):
            out.write(json.dumps(r, ensure_ascii=False) + "\n"); out.flush()
            if k % 20 == 0: print(f"{variant} {k}/{len(jobs)}")
    print(f"{variant} done")


def llm_with_judge(c, model, hatname, temp, note_qs=NOTE_QS):
    qs = note_qs if c["type"] == "note" else RULE_QS

    def v(d):
        if prob:
            miss = [q for q in qs if not isinstance(d.get(q), (int, float)) or not 0 <= d.get(q) <= 1]
            return f"need a number from 0.0 to 1.0 for {miss}" if miss else None
        miss = [q for q in qs if str(d.get(q)).lower() not in ("true", "false")]
        return f"need true or false for {miss}" if miss else None
    # x.llm reads x.MODEL; threads share it, so pass the model through the request instead
    import urllib.request, time
    prob = hatname == "guard"
    msgs = [{"role": "system", "content": HATS[hatname] + (task_prob(c["type"], note_qs) if prob else task(c["type"]))}, {"role": "user", "content": context(c)}]
    log = []
    for attempt in range(2):
        body = json.dumps({"model": MODELS[model], "stream": False, "think": "low", "format": "json",
                           "messages": msgs, "options": {"temperature": temp}}).encode()
        t = time.time()
        req = urllib.request.Request(f"{x.OLLAMA}/api/chat", body, {"content-type": "application/json"})
        for wait in (5, 15, 45, 90, None):
            try:
                o = json.load(urllib.request.urlopen(req, timeout=300)); break
            except urllib.error.HTTPError as e:
                if e.code != 429 or wait is None: raise
                time.sleep(wait)
        content = o["message"]["content"]
        log.append({"s": round(time.time() - t, 1), "in": o.get("prompt_eval_count"), "out": o.get("eval_count")})
        try:
            d = json.loads(content[content.find("{"):content.rfind("}") + 1]); err = v(d)
        except Exception as e:
            d, err = None, f"not valid JSON: {e}"
        if not err:
            return ({q: float(d[q]) for q in qs} if prob else {q: str(d.get(q)).lower() == "true" for q in qs}), log
        msgs += [{"role": "assistant", "content": content},
                 {"role": "user", "content": f"Your JSON is wrong: {err}. Answer again with only the corrected JSON."}]
    return None, log + [{"error": err}]


# ---------------------------------------------------------------- score

def score(subset="all"):
    bench = {c["id"]: c for c in map(json.loads, BENCH.open())}
    labels = {l["id"]: l for l in map(json.loads, (HERE / "labels.jsonl").open())
              if subset == "all" or l.get("confidence") == "high"}
    print(f"labels used: {len(labels)} ({subset})")
    for v in QSETS: score_prob(labels, v)
    for variant in [v for v in VARIANTS if v not in QSETS]:
        f = HERE / f"run_{variant}.jsonl"
        if not f.exists(): continue
        rows = [json.loads(l) for l in f.open()]
        by = defaultdict(list)
        for r in rows:
            if r["answers"]: by[r["id"]].append(r)
        cost = sum((c.get("in") or 0) * 0.15e-6 + (c.get("out") or 0) * 0.5e-6 for r in rows for c in r["llm"] if "s" in c)
        print(f"\n=== {variant}  ({len(rows)} calls, about ${cost:.2f})")
        judges = [None] if variant != "D_single" else [0, 1]
        for jsel in judges:
            per_q = defaultdict(Counter)
            decision = Counter()
            for i, rs in by.items():
                if i not in labels: continue
                lab = labels[i]
                rs_ = rs if jsel is None else [r for r in rs if r["judge"] == jsel]
                if not rs_: continue
                qs = rs_[0]["answers"].keys()
                maj = {q: sum(r["answers"][q] for r in rs_) * 2 > len(rs_) for q in qs}
                for q in qs:
                    if q in lab:
                        per_q[q]["agree" if maj[q] == lab[q] else "disagree"] += 1
                        per_q[q][("TP" if maj[q] else "FN") if lab[q] else ("FP" if maj[q] else "TN")] += 1
                drop = any(maj.get(q) for q in DROP_IF_TRUE) or any(maj.get(q) is False for q in DROP_IF_FALSE)
                decision[("drop" if drop else "keep", "keep" if lab["keep"] else "drop")] += 1
            tag = "" if jsel is None else f" judge {jsel}"
            n = sum(decision.values())
            right = decision[("keep", "keep")] + decision[("drop", "drop")]
            print(f"  decision{tag}: {right}/{n} right  | kept bad {decision[('keep', 'drop')]}  dropped good {decision[('drop', 'keep')]}")
            for q, cnt in per_q.items():
                t = cnt["agree"] + cnt["disagree"]
                print(f"    {q:30} {cnt['agree']:>3}/{t:<3} {100 * cnt['agree'] // max(t, 1):>3}%   label-true {cnt['TP'] + cnt['FN']:>2}: caught {cnt['TP']:>2}, missed {cnt['FN']:>2}; false alarms {cnt['FP']:>2}")
        if variant == "D_single":
            flips = Counter()
            for i, rs in by.items():
                a = {r["judge"]: r["answers"] for r in rs}
                if 0 in a and 1 in a:
                    for q in a[0]: flips["flip" if a[0][q] != a[1][q] else "same"] += 1
            print(f"  flips between two runs at t=0.1: {flips['flip']}/{flips['flip'] + flips['same']}")


def score_prob(labels, variant="E_guard"):
    f = HERE / f"run_{variant}.jsonl"
    if not f.exists(): return
    rows = [r for r in map(json.loads, f.open()) if r["answers"]]
    print(f"\n=== {variant}  ({len(rows)} answers)")
    for th in (0.3, 0.4, 0.5, 0.6, 0.7):
        for need in ("any", "third"):
            dec, perq = Counter(), defaultdict(Counter)
            for r in rows:
                lab = labels.get(r["id"])
                if not lab: continue
                a = r["answers"]
                sig = [q for q in a if (q in DROP_IF_TRUE and a[q] >= th) or (q in DROP_IF_FALSE and a[q] < th)]
                for q in a:
                    if q in lab:
                        yes = a[q] >= th
                        perq[q][("TP" if yes else "FN") if lab[q] else ("FP" if yes else "TN")] += 1
                k = 1 if (need == "any" or len(a) < 3) else max(1, round(len(a) / 3))
                drop = len(sig) >= k
                dec[("drop" if drop else "keep", "keep" if lab["keep"] else "drop")] += 1
            n = sum(dec.values()); right = dec[("keep", "keep")] + dec[("drop", "drop")]
            print(f"  threshold {th} drop on {need:5}: {right}/{n} right | kept bad {dec[('keep', 'drop')]:>2}  dropped good {dec[('drop', 'keep')]:>2}")
        if th == 0.5:
            for q, c in perq.items():
                print(f"      {q:30} label-true {c['TP'] + c['FN']:>2}: caught {c['TP']:>2}, missed {c['FN']:>2}; false alarms {c['FP']:>2}")


# ---------------------------------------------------------------- tune

GOOD_DROPPED_COST = 3     # losing a good note costs 3 bad notes kept: decay removes the bad ones later
GRID = (0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6)


def tune(variant="E_guard"):
    """One threshold per question, chosen by code on stored probabilities. No new calls.
    Cost = bad kept + 3 * good dropped. Hard limit: no good note with a high-confidence label dropped.
    explains_mechanism is ignored. 75 items and 6 knobs: read it as a direction, not as a number."""
    labels = {l["id"]: l for l in map(json.loads, (HERE / "labels.jsonl").open())}
    rows = [r for r in map(json.loads, (HERE / f"run_{variant}.jsonl").open()) if r["answers"]]
    qs = [q for q in DROP_IF_TRUE] + ["is_user_rejection"]

    def evaluate(th):
        dec, hi_good_dropped = Counter(), 0
        for r in rows:
            lab, a = labels[r["id"]], r["answers"]
            drop = any(a.get(q, 0) >= th[q] for q in DROP_IF_TRUE if q in a) or \
                ("is_user_rejection" in a and a["is_user_rejection"] < th["is_user_rejection"])
            dec[("drop" if drop else "keep", "keep" if lab["keep"] else "drop")] += 1
            hi_good_dropped += drop and lab["keep"] and lab.get("confidence") == "high"
        cost = dec[("keep", "drop")] + GOOD_DROPPED_COST * dec[("drop", "keep")]
        return cost, dec, hi_good_dropped

    def show(name, th):
        cost, dec, hi = evaluate(th)
        right = dec[("keep", "keep")] + dec[("drop", "drop")]
        print(f"  {name:16} {right}/{sum(dec.values())} right | kept bad {dec[('keep', 'drop')]:>2}  dropped good "
              f"{dec[('drop', 'keep')]:>2} (high-conf {hi})  cost {cost}")

    print(f"=== tune {variant}")
    for g in (0.3, 0.4, 0.5):
        show(f"all at {g}", {q: g for q in qs})
    th = {q: 0.4 for q in qs}
    for _ in range(5):                               # coordinate descent over the grid
        changed = False
        for q in qs:
            best = min(GRID, key=lambda v: (evaluate({**th, q: v})[2] > 0, evaluate({**th, q: v})[0], abs(v - th[q])))
            if best != th[q]: th[q], changed = best, True
        if not changed: break
    show("per question", th)
    for q in qs: print(f"      {q:30} {th[q]}")


if __name__ == "__main__":
    {"build": build, "run": run, "score": score, "tune": tune}[sys.argv[1]](*sys.argv[2:])
