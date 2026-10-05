# spike: extractor-f
# question: On the 6 v7 sessions, with critic F in place of the v7 council, how many candidates does the
#   full pipeline (phases 0, 0b, 1 + checks, 1b, 2a, 2b, no saves) keep and judge new, and are those notes
#   good to read? Answer shape: a table per session, v7 against F (counts by stage and by reason), plus
#   new_<mode>.md with every note and rule judged new, to read by hand.
#   Two modes. frozen: the episodes and LLM1 candidates of v7 are reused, so only the critic and phase 2
#   change. fresh: everything runs again, as the real distiller would.
# opened: 2026-10-02   timebox: 2h
# run: python spikes/2026-10-02-extractor-f/main.py run frozen|fresh  ;  ... main.py report frozen|fresh
# status: answered
# answer: same 6 sessions, glm-5.3-flash, run in sequence, no 429.
#                          v7 (council)   frozen F   fresh F
#   candidates (n/r)          255/36       255/36     251/33
#   dropped by checks             63           63         69
#   dropped by critic             36           91         95
#     textbook                    17           48         51
#     unconfirmed claim            5           18          5
#     project detail               0           15         22
#     about the agent              2           13         11
#     rule not a rejection        12           11         15
#   near identical (>= 0.95)       0            0          0
#   saved (new/extends/contr.)   138          103         90
#   ref_only + duplicate          50           31         28
#   tokens in                   2.7M    1.1M (no LLM1)  2.1M
#   F drops 2.5x what the council dropped, on the same candidates. Saved notes fall 25-35%.
#   Read by hand, new_fresh.md (90 items): most are general and carry a mechanism. About 10 are weak:
#   textbook practice that passed (paginate in a loop, generic error to the client, test on a small
#   batch), project conventions (write audit results to a page), one wrong generalisation ("in JSON the
#   default of a field is null": a library behaviour, not JSON). The same idea saved twice inside one
#   session happens 2 times (the config default-and-cap note, the "reread the code" rule): the session
#   list given to LLM2 does not stop it. No invented or denied claim found.
#   The near-identical cut at cosine 0.95 never fired in any run: LLM2 does all the duplicate work.
#   unconfirmed claim 18 vs 5 with the same critic: LLM1 variance still moves the critic counts.
# verdict: the pipeline with F is good enough to build. About 1 in 9 saved items is weak, which decay
#   must handle. Two open points for the real distiller: in-session repeats, and the 0.95 cut (lower it
#   or drop it).
#
# Rules are off in here: no contracts, no tests, no abstraction.
# Delete this folder when it stops compiling. Never promote this code.

# --- parameters: edit these, then run again ---
SESSIONS = ["684fbf7a-286e-4476-be90-d03c14e2d7f5", "ea46e800-6f8d-4352-85c5-53a0e112e81d",
            "019ee613-84a2-7d48-b2e7-5342564d6049", "3f4c3b52-b287-40d1-b79d-03deba1314c7",
            "e5fee742-39fb-46b7-b2f4-ce3320a60f3d", "cbee09fe-4b69-40f5-9415-373abf0191a1"]
NOTE_THRESHOLDS = {                      # a note drops when p >= threshold
    "is_textbook_definition": 0.6,
    "is_agent_unconfirmed_claim": 0.4,
    "is_project_detail": 0.4,
    "is_about_the_agent": 0.4,
}
RULE_THRESHOLD = 0.4                     # a rule drops when p(is_user_rejection) < this
CRITIC_TEMP = 0.1                        # critic temperature
CALLS_IN_FLIGHT = 3                      # critic calls in flight, one per candidate; Ollama cloud answers 429 above that
TOP_K = 5                                # neighbours per candidate in tb / ti
NEAR_IDENTICAL = 0.95                    # cosine at or above: a sure duplicate, no LLM call
# --- end parameters ---

import importlib.util, json, sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).parent
SPIKES = HERE.parent


def load(name, folder):
    spec = importlib.util.spec_from_file_location(name, SPIKES / folder / "main.py")
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


x = load("x", "2026-10-01-extraction-hats")
cb = load("cb", "2026-10-01-critic-bench")

NOTE_QS = {k: v for k, v in cb.NOTE_QS_F.items() if k in NOTE_THRESHOLDS}
SYS_NOTE = cb.HATS["guard"] + cb.task_prob("note", NOTE_QS)
SYS_RULE = cb.HATS["guard"] + cb.task_prob("rule")


def judge(kind, user):
    qs = NOTE_QS if kind == "note" else cb.RULE_QS

    def v(d):
        miss = [q for q in qs if not isinstance(d.get(q), (int, float)) or not 0 <= d.get(q) <= 1]
        return f"need a number from 0.0 to 1.0 for {miss}" if miss else None
    d, log = x.llm(SYS_NOTE if kind == "note" else SYS_RULE, user, v, temperature=CRITIC_TEMP)
    return ({q: float(d[q]) for q in qs} if d else None), log


def critic_drop(kind, probs):
    if probs is None: return "critic:failed"
    if kind == "note":
        bad = [q for q, t in NOTE_THRESHOLDS.items() if probs[q] >= t]
        return f"critic:{','.join(bad)}" if bad else None
    return "critic:not_rejection" if probs["is_user_rejection"] < RULE_THRESHOLD else None


def v7_file(session):
    return SPIKES / "2026-10-01-extraction-hats" / f"v7_{session[:8]}.jsonl"


def out_file(mode, session):
    return HERE / f"{mode}_{session[:8]}.jsonl"


def phase0(live):
    listing = "\n".join(f"{k}: USER: {ex['input'][:300]!r}\n   AGENT: {(ex['output'] or '')[:300]!r}" for k, (_, ex) in enumerate(live))

    def v0(d):
        eps = d.get("episodes")
        if not isinstance(eps, list) or not eps: return "need list `episodes`"
        want = 0
        for e in eps:
            if e.get("from") != want or not isinstance(e.get("to"), int) or e["to"] < e["from"]:
                return f"episodes must cover 0..{len(live)-1} in order with no gap: expected from={want}"
            if not e.get("summary"): return "every episode needs a summary"
            want = e["to"] + 1
        if want != len(live): return f"the last episode must end at {len(live)-1}"
    return x.llm(x.SYS0, listing, v0)


def run_session(mode, session):
    x.SESSION = session
    vocab = [t["value"] for t in x.sh("tb", "tags")][:80]
    vset = set(vocab)
    exs = x.exchanges()
    live = [(n, ex) for n, ex in enumerate(exs) if not x.noise(ex)]
    out = out_file(mode, session).open("w")
    out.write(json.dumps({"skipped": {exs[n]["id"]: x.noise(exs[n]) for n in range(len(exs)) if x.noise(exs[n])}}) + "\n")

    frozen = {}
    if mode == "frozen":
        lines = [json.loads(l) for l in v7_file(session).open()]
        eps, log0 = {"episodes": lines[1]["episodes"]}, []
        frozen = {r["exchange"]: r.get("raw") for r in lines[2:] if "exchange" in r}
    else:
        eps, log0 = phase0(live)
        if eps is None:
            print("phase 0 failed", log0); return
    out.write(json.dumps({"episodes": eps["episodes"], "llm0": log0}, ensure_ascii=False) + "\n"); out.flush()
    print(f"{session[:8]} {mode}: {len(live)} exchanges -> {len(eps['episodes'])} episodes")

    session_map = "## The whole session, episode by episode (later episodes can deny claims made earlier)\n" + \
        "\n".join(f"- [{e['from']}-{e['to']}] {e['summary']}" for e in eps["episodes"])
    saved = []
    units = []
    for e in eps["episodes"]:
        part = [ex for _, ex in live[e["from"]:e["to"] + 1]]
        units += [(e, part, k) for k in range(len(part))]
    for e, part, t in units:
        tgt = part[t]
        rec = {"episode": [e["from"], e["to"]], "summary": e["summary"], "exchange": tgt["id"], "input": tgt["input"][:200]}
        ep_text = "\n\n".join(f"[{k}]{' <<< TARGET' if k == t else ''} USER: {xx['input'][:x.EP_CHARS]}\nAGENT: {(xx['output'] or '')[:x.EP_CHARS]}" for k, xx in enumerate(part))
        tgt_text = f"USER: {tgt['input'][:x.IN_CHARS]}\n\nAGENT: {(tgt['output'] or '')[:x.OUT_CHARS]}"

        # phase 1: extraction
        if mode == "frozen":
            cands = frozen.get(tgt["id"])
            rec["llm1"] = []
        else:
            user1 = (f"Tag vocabulary: {', '.join(vocab)}\n\n{session_map}\n\n## How this episode ended\n{e['summary']}"
                     f"\n\n## The episode (context)\n{ep_text}\n\n## >>> TARGET: extract only from this exchange <<<\n{tgt_text}")
            cands, rec["llm1"] = x.llm(x.SYS1_V5, user1, lambda d: None if isinstance(d.get("notes"), list) and isinstance(d.get("rules"), list) else "need lists `notes` and `rules`")
        if cands is None:
            rec["error"] = "llm1"; out.write(json.dumps(rec, ensure_ascii=False) + "\n"); continue
        cands = json.loads(json.dumps(cands))           # check_note edits tags in place
        rec["raw"] = cands
        terms = x.project_terms("\n".join(xx["input"] + "\n" + (xx["output"] or "") for xx in part))
        kept, dropped = [], []
        for c in cands["notes"]:
            err = x.check_note(c, tgt_text, terms, vset)
            (dropped if err else kept).append({**c, "type": "note", **({"drop": err} if err else {})})
        for c in cands["rules"]:
            err = x.check_rule(c, tgt["input"])
            (dropped if err else kept).append({**c, "type": "rule", **({"drop": err} if err else {})})
        seen = set()
        for c in [c for c in kept if c["type"] == "rule"]:
            q = x.norm(c["quote"])
            if q in seen:
                kept.remove(c); dropped.append({**c, "drop": "same_quote_rule"})
            seen.add(q)

        # phase 1b: critic F, one call per candidate
        def ask(c):
            text = c["what"] if c["type"] == "note" else f"SE {c['if']} ALLORA {c['do']}"
            cand = f"Candidate {c['type']}: {text}" + (f"\nPerché: {c['why']}" if c.get("why") else "") + f"\nQuote: {c['quote']}"
            return judge(c["type"], f"{session_map}\n\n## The episode\n{ep_text}\n\n## The target exchange\n{tgt_text}\n\n## The candidate\n{cand}")
        with ThreadPoolExecutor(CALLS_IN_FLIGHT) as pool:
            answers = list(pool.map(ask, kept))
        rec["critic"] = [c for _, log in answers for c in log]
        survivors = []
        for c, (probs, _) in zip(kept, answers):
            c = {**c, "probs": probs}
            why = critic_drop(c["type"], probs)
            (dropped if why else survivors).append({**c, **({"drop": why} if why else {})})

        # phase 2a: neighbours
        neigh, cand2 = [], []
        for c in survivors:
            if c["type"] == "note":
                hits = [(h["note"]["id"], h["note"]["what"], h["score"]) for h in x.sh("tb", "search", c["what"], "--depth", "0", "--limit", str(TOP_K), "--no-hits")]
            else:
                hits = [(h["id"], f"SE {h['if']} ALLORA {'; '.join(h['do'])}", h["score"]) for h in x.sh("ti", "search", c["if"], "--limit", str(TOP_K))]
            if hits and hits[0][2] >= NEAR_IDENTICAL:
                dropped.append({**c, "drop": f"near_identical:{hits[0][0][:8]}:{hits[0][2]:.3f}"}); continue
            cand2.append(c)
            for i, text, s in hits:
                if i not in [n[0] for n in neigh]: neigh.append((i, text, c["type"]))
        for s in saved:
            neigh.append((f"session:{len(neigh)}", s["text"], s["type"]))
        rec["dropped"] = dropped

        # phase 2b: novelty, no saves
        rec["verdicts"] = []
        if cand2:
            lines = ["## Candidates"] + [
                f"C{k} ({c['type']}): " + (f"{c['what']} | perché: {c['why']}" if c["type"] == "note" else f"SE {c['if']} ALLORA {c['do']}")
                for k, c in enumerate(cand2)]
            lines += ["", "## Neighbours"] + [f"N{k} ({tt}): {text[:400]}" for k, (_, text, tt) in enumerate(neigh)]
            user2 = "\n".join(lines) + "\n\nUse the integer after C as `cand` and the integer after N as `of`."

            def v2(d):
                vs = d.get("verdicts")
                if not isinstance(vs, list): return "need list `verdicts`"
                if sorted(v.get("cand") for v in vs) != list(range(len(cand2))): return f"need exactly one verdict per cand 0..{len(cand2)-1}"
                for v in vs:
                    c = cand2[v["cand"]]
                    ok = {"new", "duplicate", "extends", "contradicts"} if c["type"] == "note" else {"new", "duplicate", "append"}
                    if v.get("verdict") not in ok: return f"cand {v['cand']}: verdict must be one of {sorted(ok)}"
                    if v["verdict"] != "new" and not (isinstance(v.get("of"), int) and 0 <= v["of"] < len(neigh)):
                        return f"cand {v['cand']}: `of` must be a neighbour id 0..{len(neigh)-1}"
            verd, rec["llm2"] = x.llm(x.SYS2, user2, v2)
            for v in (verd or {}).get("verdicts", []):
                c = cand2[v["cand"]]
                if v["verdict"] == "extends":
                    if not (v.get("adds") or "").strip(): v["verdict"] = "duplicate"
                    elif str(v.get("adds_is_new_idea")).lower() != "true": v["verdict"] = "ref_only"
                of = neigh[v["of"]] if v.get("of") is not None and v["verdict"] != "new" else None
                rec["verdicts"].append({"cand": c, "verdict": v["verdict"], "of": of and of[0], "of_text": of and of[1][:200],
                                        "reason": v.get("reason"), "do": v.get("do"), "adds": v.get("adds")})
                if v["verdict"] in ("new", "extends", "contradicts"):
                    saved.append({"type": c["type"], "text": c.get("what") or f"SE {c['if']} ALLORA {c['do']}"})
        out.write(json.dumps(rec, ensure_ascii=False) + "\n"); out.flush()
        print(f"  ep {e['from']}-{e['to']} t{t}  cands {len(cands['notes'])}n/{len(cands['rules'])}r  dropped {len(dropped)}  judged {len(cand2)}")


def run(mode="frozen"):
    for s in SESSIONS:
        run_session(mode, s)
    (HERE / f"{mode}.done").write_text("done\n")


def tally(path):
    t = Counter()
    for line in path.open():
        r = json.loads(line)
        if "exchange" not in r: continue
        raw = r.get("raw") or {"notes": [], "rules": []}
        t["notes"] += len(raw["notes"]); t["rules"] += len(raw["rules"])
        for d in r.get("dropped", []):
            why = d["drop"]
            if why.startswith("critic:"):
                for q in why[7:].split(","): t[f"critic {q}"] += 1
                t["critic total"] += 1
            elif why.startswith("near_identical"): t["near identical"] += 1
            else: t["checks"] += 1
        for v in r.get("verdicts", []): t[f"verdict {v['verdict']}"] += 1
        t["calls"] += len(r.get("llm1", [])) + len(r.get("critic", [])) + len(r.get("llm2", []) or [])
        t["tokens in"] += sum(c.get("in") or 0 for k in ("llm1", "critic", "llm2") for c in (r.get(k) or []))
    return t


def report(mode="frozen"):
    keys = ["notes", "rules", "checks", "critic total", "critic is_textbook_definition", "critic is_agent_unconfirmed_claim",
            "critic is_project_detail", "critic is_about_the_agent", "critic is_agent_self_assessment",
            "critic not_rejection", "critic failed", "near identical", "verdict new", "verdict extends",
            "verdict contradicts", "verdict ref_only", "verdict duplicate", "verdict append", "calls", "tokens in"]
    total = {"v7": Counter(), mode: Counter()}
    for s in SESSIONS:
        if not out_file(mode, s).exists(): continue
        total["v7"] += tally(v7_file(s)); total[mode] += tally(out_file(mode, s))
    print(f"{'':34} {'v7':>8} {mode:>8}")
    for k in keys:
        print(f"{k:34} {total['v7'][k]:>8} {total[mode][k]:>8}")

    md = [f"# Judged new, {mode}\n"]
    for s in SESSIONS:
        if not out_file(mode, s).exists(): continue
        md.append(f"\n## {s[:8]}\n")
        for line in out_file(mode, s).open():
            r = json.loads(line)
            for v in r.get("verdicts", []):
                if v["verdict"] not in ("new", "extends", "contradicts"): continue
                c = v["cand"]
                text = f"{c['what']}\n  perché: {c['why']}" if c["type"] == "note" else f"SE {c['if']} ALLORA {c['do']}"
                p = " ".join(f"{q[3:9]}={pv:.2f}" for q, pv in (c.get("probs") or {}).items())
                md.append(f"- [{c['type']}, {v['verdict']}] {text}\n  ({p})" + (f"\n  vs: {v['of_text']}" if v.get("of_text") else ""))
    (HERE / f"new_{mode}.md").write_text("\n".join(md) + "\n")
    print(f"wrote new_{mode}.md")


if __name__ == "__main__":
    {"run": run, "report": report}[sys.argv[1]](*sys.argv[2:])
