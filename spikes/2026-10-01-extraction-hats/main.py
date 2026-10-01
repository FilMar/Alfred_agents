# spike: extraction-hats
# question: Can small calls with no tools (LLM1 extracts, code checks and searches, LLM2 judges novelty,
#   LLM3 finds bridges by shape) with glm-5.3-flash and de Bono hats beat today's one-agent erodoto run?
#   (a) phases 1-2 on session 684fbf7a: candidates, drops by reason, verdicts, rules that keep their quote.
#   (b) phase 3 on hand-written refs: does a search by "shape" find refs that a search by topic misses?
# opened: 2026-10-01   timebox: 2h
# run: python spikes/2026-10-01-extraction-hats/main.py extract | bridges | report
# v7: is_project_detail after a generic rewrite; is_agent_self_assessment; extends needs `adds`
#   (empty -> duplicate, an angle -> ref only); one quote gives one rule. Sessions run one after another.
#   Results: v7_<id>.jsonl
#   v7 answer, same 6 sessions, in sequence, no 429: notes 73 -> 125 (+71%), rules 12 -> 17, 52 cents.
#   ref_only works: 22 notes became a ref only. But the rewrite made is_project_detail toothless: it
#   dropped 42 notes in v6 and 0 in v7. The model can always write a generic version, so the test never
#   fires, and project records pass ("il distillatore è stato deciso come servizio ogni 10 minuti").
#   is_agent_self_assessment dropped 2; notes on the agent's own tools still pass (wait for the
#   notification instead of polling). is_agent_unconfirmed_claim fell 22 -> 5 with no change to it, so
#   part of every v5-v7 gap is LLM1 and critic variance, not the change under test.
#   Lesson: compare critic changes on a frozen set of candidates, not on a fresh run.
# v6: v5 with a council of 3 critics (glm, temperature 0.7, majority of valid votes). Results: v6_<id>.jsonl
#   v6 answer, same 6 sessions: the 3 critics split on 119 of 501 questions (24%): is_project_detail 52,
#   is_agent_unconfirmed_claim 36, is_textbook_definition 28, is_user_rejection 3. So one critic is a coin
#   flip on about a quarter of its answers. The majority fixes the flips ("try one page first" now kept
#   0/3; cascade dropped 3/3). It does not fix a bias: "never edit an applied migration" is dropped as a
#   project detail 3/3. Totals v5 -> v6: notes 76 -> 73, rules 15 -> 12, critic drops 105 -> 100, cost
#   30 -> 45 cents (+50%). Part of the gap is LLM1 itself, which also varies between runs. Running 6
#   sessions in parallel with 3 critics each hit HTTP 429 on Ollama cloud: run sessions one after another.
# v5: extract per exchange (the target); the whole episode and the session map are context. The
#   quote must be in the target. Results: extract_v5.jsonl
#   v5 answer: 4 episodes again, summaries right. 59 calls, 133 s, 248k tokens in, 14k out (about 4.5
#   cents). Kept 8 notes and 3 rules: about 7 good, 3 weak, 0 wrong. LLM2 caught 2 repeats of the same
#   lesson across exchanges. Recall is back near v1 with the precision of v4. Left: the critic is noisy.
#   It calls general ideas a project detail ("try one page first", "never edit an applied migration"),
#   and it judges the same candidate differently across runs. 12 retries in 59 calls.
#   v5 on 5 more sessions (v5_<id>.jsonl): 152 exchanges, 306 calls, 1.29M tokens in, 116k out (about
#   25 cents), 8.5 min wall time in parallel. Kept 68 notes and 12 rules. By hand, roughly: 60% good,
#   25% weak, 10% bad. The bad ones are the agent judging itself ("errore ricorrente", "tendenza a") and
#   notes copied from a document being edited in the session (the quality bar). 30 of 68 notes are
#   `extends`: LLM2 uses it for near repeats. One quote gave a new rule and an append. The "useless"
#   session (cbee09fe) gave 6 notes and 2 rules, some good. Volume: about 1 note per 2 exchanges.
# v4: LLM1 and the critic see the summaries of the whole session; project terms are only real
#   identifiers; bad tags are dropped, not the note. Results: extract_v4.jsonl
#   v4 answer: phase 0 split the same session into 4 episodes this time, not 9 (not deterministic). 13
#   calls, 43 s, about 1 cent. Kept 4 notes and 1 rule: 0 wrong, 1 weak (RAM cache, the agent's
#   reasoning). The pagination lesson is now a note and a rule, and its note was linked as
#   `contradicts` to an older tb note that uses one number for two roles (a real tension). But recall
#   fell: v1 had about 10 good notes, v4 has 4. A long episode still gives 1 or 2 candidates per call.
#   The critic also dropped a true rejection ("ma che a mano, va scriptata") as not_rejection.
#   Next: extract per exchange (recall), with the episode and the session map as context (precision).
# v3: episodes (phase 0, with a 20-30 word summary that says how it ended) + a critic with closed
#   questions. Results: extract_v3.jsonl
# v2: LLM1 also sees the next exchange, and treats agent claims as hypotheses. v1 results: extract_v1.jsonl
# status: answered
# answer: (a) 38 exchanges, 9 skipped as noise, 46 calls, 115 s in total, 88k tokens in and 12k out
#   (about 2 cents). 26 notes and 5 rules proposed; code dropped 8 (tags 4, quote not in text 3, rule quote
#   not from user 1). LLM2: 15 new, 4 extends, 2 new rules, 2 appends; it caught 2 repeats of its own
#   session saves. By hand: about 10 of 19 notes are good, 5 are weak, 4 are wrong: 2 save the agent's
#   hypothesis that the user then denied (stale DB), 1 is a textbook definition (cascade), 1 is a project
#   detail with invented contexts. Rules: 3 of 4 hold; "direi di avviare per solo 1 pagina" became a rule
#   but it is an instruction, not a correction.
#   (b) 20 far human refs: shape search found the target 0 of 20. LLM3b said yes to 30 of 241 candidates,
#   and the ones read look sound (A6 page limit and WIP limit). Many far human refs are loose themselves,
#   so recovery is a weak benchmark.
# verdict: no tools and small calls work: 7x faster than one th run per exchange, the format holds, and
#   the self-repeat problem is gone. The open problem is what LLM1 takes as fact: it reads agent claims as
#   evidence. Show it the NEXT exchange too (the correction comes after), and tell it that an agent claim
#   is a hypothesis until the user or a result confirms it. Bridges: keep phase 3, but judge it by reading
#   the yes links, not by ref recovery.
#
# Hats: phase 1 white (facts, evidence, no filling), phase 2 black (why it is NOT new),
#   phase 3a green (decompose, reconnect in another domain), phase 3b black (reject forced bridges).
#   Blue is the code: it orders the steps.
#
# Dry run. Nothing is written to tb, ti or tl. "Saved" items live in memory and are shown to
# LLM2 as neighbours, as if they had been saved.
# Rules are off in here: no contracts, no tests, no abstraction. Never promote this code.

import json, re, subprocess, sys, time, random, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# --- parameters ---
SESSION = "684fbf7a-286e-4476-be90-d03c14e2d7f5"
MODEL = "glm-5.3-flash:cloud"
THINK = "low"                 # glm ignores format schemas; JSON comes from the prompt
OLLAMA = "http://localhost:11434"
IN_CHARS, OUT_CHARS, CTX_CHARS = 6000, 8000, 1200
NEAR_IDENTICAL = 0.95
BRIDGE_EDGES = 20             # far edges to test
FAR_RANK = 50                 # an edge is "far" when the target is past this rank in topic search
PARALLEL = 4

HERE = Path(__file__).parent
HATS = HERE.parent.parent / "tools/th/hats"
OUT_EXTRACT = HERE / "extract.jsonl"
OUT_BRIDGES = HERE / "bridges.jsonl"


def sh(*cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"{cmd}: {r.stderr[:300]}")
    return json.loads(r.stdout)


def hat(name):
    text = (HATS / f"{name}-core.md").read_text()
    return text.split("## Output Structure")[0].strip()


def llm(system, user, validate, temperature=0.1):
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    log = []
    for attempt in range(2):
        body = json.dumps({"model": MODEL, "stream": False, "think": THINK, "format": "json",
                           "messages": msgs, "options": {"temperature": temperature}}).encode()
        t = time.time()
        req = urllib.request.Request(f"{OLLAMA}/api/chat", body, {"content-type": "application/json"})
        for wait in (5, 15, 45, 90, None):          # back off on 429 from Ollama cloud
            try:
                o = json.load(urllib.request.urlopen(req, timeout=300)); break
            except urllib.error.HTTPError as e:
                if e.code != 429 or wait is None: raise
                time.sleep(wait)
        content = o["message"]["content"]
        log.append({"s": round(time.time() - t, 1), "in": o.get("prompt_eval_count"), "out": o.get("eval_count")})
        try:
            data = json.loads(content[content.find("{"):content.rfind("}") + 1])
            err = validate(data)
        except Exception as e:
            data, err = None, f"not valid JSON: {e}"
        if not err:
            return data, log
        msgs += [{"role": "assistant", "content": content},
                 {"role": "user", "content": f"Your JSON is wrong: {err}. Answer again with only the corrected JSON."}]
    return None, log + [{"error": err}]


# ---------------------------------------------------------------- phase 1-2

NOISE = re.compile(r"^\s*(s[iì]|ok+|perfetto|procedi|committa|commit|vai|fatto)[\s,.!]*(procedi|committa|commit)?[\s.!]*$", re.I)
KINDS = {"dato", "protocollo", "attrito", "configurazione"}
IT = set("il lo la gli le che di un una per non è sono con del della si come più quando se".split())
EN = set("the and is of to that for with not are when if this it".split())
PURITY = re.compile(r"come richiesto|l'utente|filippo|alfredo|cappello|dibattito", re.I)

SYS1 = hat("white") + """

## Task
You read one exchange between a user and a coding agent. You extract candidate notes (lasting knowledge)
and candidate rules (corrections). You never save anything: you only answer with JSON.
Write every text field in Italian.

Three rules:
1. Simple words. Say the mechanism and why it works, as you would to a 12-year-old. Not what was done.
   No project names: no table, file, variable, endpoint, product or person names. At most one technical
   term, inside the mechanism.
2. Two contexts. For every note, fill `contexts` with two unrelated real situations where the note helps.
   If you find only one, it is a project detail: do not output the note.
3. Rules only from a correction. A rule exists only if the user rejected what the agent did and said
   what to do instead. `quote` is that user sentence, copied exactly. No correction, no rule. A
   correction that only makes sense in this project is not a rule.

`kind` is one of: dato (a finding or measurement), protocollo (if A then do B), attrito (a tension or a
limit of a model), configurazione (a chosen setup). For a note, `quote` is the exact sentence of the
exchange that supports it. `tags`: 1 to 3, only from the given vocabulary.

The agent can be wrong. What the agent says is a hypothesis, not a fact, until the user confirms it or a
result shows it. Read the next exchange: if the user denies a claim there, or a later result proves it
wrong, do not extract it.

Most exchanges give nothing. Empty lists are a normal answer.

Answer only with this JSON:
{"notes": [{"what": "", "why": "", "kind": "", "tags": [""], "contexts": ["", ""], "quote": ""}],
 "rules": [{"if": "", "do": "", "tags": [""], "quote": ""}]}"""

SYS2 = hat("black") + """

## Task
You get candidate notes and rules, and existing items (neighbours) from the memory. For each candidate
decide only whether it is new compared with the neighbours. Do not judge whether it is worth keeping.

Note verdicts:
- new: no neighbour says the same idea.
- duplicate: a neighbour says the same idea, maybe in other words. `of` = that neighbour.
- extends: a neighbour has the same idea and the candidate adds something. `of` + `reason` (one sentence,
  Italian) + `adds`: what the candidate says that the neighbour does not, in one sentence, Italian; empty if
  nothing + `adds_is_new_idea`: true only if `adds` is an idea that stands alone, false if it is just an
  angle, an example or a detail of the neighbour's idea.
- contradicts: a neighbour claims the opposite on the same topic. Never call this a duplicate. `of` + `reason`.
Rule verdicts:
- new, duplicate (`of`), append (`of` + `do`: the new action to add to that rule).

Use only the integer ids given. Answer only with this JSON:
{"verdicts": [{"cand": 0, "verdict": "", "of": null, "reason": "", "do": "", "adds": "", "adds_is_new_idea": false}]}"""


def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"[\"'`«»“”‘’.,;:!?()\[\]]", " ", s.lower())).strip()


def project_terms(text):
    # v4: only real identifiers. A plain word in backticks (`limit`) is not a project term.
    ident = re.compile(r"[_/]|[a-z][A-Z]|\d")
    terms = {t for t in re.findall(r"`([^`\n]{2,60})`", text) if ident.search(t)}
    terms |= set(re.findall(r"\b[a-z0-9]+(?:_[a-z0-9]+)+\b", text))
    terms |= set(re.findall(r"\b[\w.-]+/[\w./-]+\b", text))
    terms |= set(re.findall(r"\b[a-z]+[A-Z][A-Za-z]+\b", text))
    return {t for t in terms if len(t) > 3}


def is_italian(s):
    w = re.findall(r"[a-zàèéìòù]+", s.lower())
    return sum(x in IT for x in w) >= sum(x in EN for x in w)


def check_note(c, ex_text, terms, vocab):
    if not c.get("what") or not c.get("why"): return "empty"
    if c.get("kind") not in KINDS: return f"kind:{c.get('kind')}"
    c["tags"] = [t for t in (c.get("tags") or []) if t in vocab][:3]   # v4: drop bad tags, keep the note
    if not c["tags"]: return "tags:none_valid"
    ctx = c.get("contexts") or []
    if len(ctx) != 2 or norm(ctx[0]) == norm(ctx[1]): return "contexts"
    q = norm(c.get("quote") or "")
    if len(q) < 10 or q not in norm(ex_text): return "quote_not_in_text"
    if not is_italian(c["what"] + " " + c["why"]): return "not_italian"
    hit = [t for t in terms if t.lower() in c["what"].lower()]
    if hit: return f"project_term:{hit[:3]}"
    if PURITY.search(c["what"] + c["why"]): return "purity"
    return None


def check_rule(c, user_text):
    if not c.get("if") or not c.get("do"): return "empty"
    q = norm(c.get("quote") or "")
    if len(q) < 8 or q not in norm(user_text): return "quote_not_from_user"
    if not is_italian(c["if"] + " " + c["do"]): return "not_italian"
    return None


def exchanges():
    rows = [r for r in sh("tl", "pending", "--limit", "5000") if r["session"] == SESSION]
    return [sh("tl", "show", r["id"]) for r in sorted(rows, key=lambda r: r["timestamp"])]


def noise(ex):
    i = ex["input"] or ""
    if i.startswith("<task-notification"): return "task_notification"
    if NOISE.match(i): return "ack"
    if "API Error:" in (ex["output"] or "") and len(ex["output"]) < 2000: return "harness_error"
    return None


def extract():
    vocab = [t["value"] for t in sh("tb", "tags")][:80]
    vset = set(vocab)
    exs = exchanges()
    saved = []          # {"type", "text", "exchange"} as if written
    out = OUT_EXTRACT.open("w")
    for n, ex in enumerate(exs):
        rec = {"exchange": ex["id"], "input": ex["input"][:200]}
        why = noise(ex)
        if why:
            rec["skipped"] = why
            out.write(json.dumps(rec, ensure_ascii=False) + "\n"); out.flush()
            print(f"{n:2} skip {why}"); continue
        prev = [e for e in exs[max(0, n - 2):n]]
        ctx = "\n\n".join(f"[earlier] USER: {e['input'][:CTX_CHARS]}\nAGENT: {(e['output'] or '')[:CTX_CHARS]}" for e in prev)
        ex_text = f"USER: {ex['input'][:IN_CHARS]}\n\nAGENT: {(ex['output'] or '')[:OUT_CHARS]}"
        nxt = exs[n + 1] if n + 1 < len(exs) else None
        after = f"[next] USER: {nxt['input'][:CTX_CHARS]}\nAGENT: {(nxt['output'] or '')[:CTX_CHARS]}" if nxt else "(none)"
        user1 = (f"Tag vocabulary: {', '.join(vocab)}\n\n## Before (do not extract from it)\n{ctx}\n\n## The exchange\n{ex_text}"
                 f"\n\n## Next exchange (do not extract from it; use it to check the claims above)\n{after}")

        def v1(d):
            if not isinstance(d.get("notes"), list) or not isinstance(d.get("rules"), list):
                return "need lists `notes` and `rules`"
        cands, log1 = llm(SYS1, user1, v1)
        rec["llm1"] = log1
        if cands is None:
            rec["error"] = "llm1"; out.write(json.dumps(rec, ensure_ascii=False) + "\n"); continue
        rec["raw"] = cands
        terms = project_terms(ex["input"] + "\n" + (ex["output"] or ""))
        kept, dropped = [], []
        for c in cands["notes"]:
            err = check_note(c, ex_text, terms, vset)
            (dropped if err else kept).append({**c, "type": "note", **({"drop": err} if err else {})})
        for c in cands["rules"]:
            err = check_rule(c, ex["input"])
            (dropped if err else kept).append({**c, "type": "rule", **({"drop": err} if err else {})})
        # neighbours, by code
        neigh, cand2 = [], []
        for c in kept:
            if c["type"] == "note":
                hits = [(h["note"]["id"], h["note"]["what"], h["score"]) for h in sh("tb", "search", c["what"], "--depth", "0", "--limit", "5", "--no-hits")]
            else:
                hits = [(h["id"], f"SE {h['if']} ALLORA {'; '.join(h['do'])}", h["score"]) for h in sh("ti", "search", c["if"], "--limit", "5")]
            if hits and hits[0][2] >= NEAR_IDENTICAL:
                dropped.append({**c, "drop": f"near_identical:{hits[0][0][:8]}:{hits[0][2]:.3f}"}); continue
            c["neigh"] = [(i, round(s, 3)) for i, _, s in hits]
            cand2.append(c)
            for i, text, s in hits:
                if i not in [x[0] for x in neigh]: neigh.append((i, text, c["type"]))
        for s in saved:
            neigh.append((f"session:{len(neigh)}", s["text"], s["type"]))
        rec["dropped"] = dropped
        if cand2:
            lines = ["## Candidates"] + [
                f"C{k} ({c['type']}): " + (f"{c['what']} | perché: {c['why']}" if c["type"] == "note" else f"SE {c['if']} ALLORA {c['do']}")
                for k, c in enumerate(cand2)]
            lines += ["", "## Neighbours"] + [f"N{k} ({t}): {text[:400]}" for k, (_, text, t) in enumerate(neigh)]
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
            verd, log2 = llm(SYS2, user2, v2)
            rec["llm2"] = log2
            rec["verdicts"] = []
            for v in (verd or {}).get("verdicts", []):
                c = cand2[v["cand"]]
                if v["verdict"] == "extends":          # v7: extends must add something, and an angle is only a ref
                    if not (v.get("adds") or "").strip(): v["verdict"] = "duplicate"
                    elif str(v.get("adds_is_new_idea")).lower() != "true": v["verdict"] = "ref_only"
                of = neigh[v["of"]] if v.get("of") is not None and v["verdict"] != "new" else None
                rec["verdicts"].append({"cand": c, "verdict": v["verdict"], "of": of and of[0], "of_text": of and of[1][:200],
                                        "reason": v.get("reason"), "do": v.get("do"), "adds": v.get("adds")})
                if v["verdict"] in ("new", "extends", "contradicts"):
                    saved.append({"type": c["type"], "text": c.get("what") or f"SE {c['if']} ALLORA {c['do']}", "exchange": ex["id"]})
        out.write(json.dumps(rec, ensure_ascii=False) + "\n"); out.flush()
        print(f"{n:2} cands {len(cands['notes'])}n/{len(cands['rules'])}r  dropped {len(dropped)}  judged {len(cand2)}")


# ---------------------------------------------------------------- v3: episodes + critic

OUT_V3 = HERE / "extract_v5.jsonl"   # v3, v4 results kept in extract_v3.jsonl, extract_v4.jsonl
COUNCIL, COUNCIL_TEMP = 3, 0.7
EP_CHARS = 2500               # per exchange, input and output each, inside an episode

SYS0 = hat("blue") + """

## Task
You get the list of exchanges of one work session, numbered. Split it into episodes: a run of consecutive
exchanges about one problem or one task, from the first question to the point where it ends or the
topic changes. Every listed number belongs to exactly one episode, in order.
For each episode write `summary`: 20 to 30 words, in Italian, that say what the problem was and HOW IT
ENDED: what turned out true, what was decided, which hypothesis fell.
Answer only with this JSON: {"episodes": [{"from": 0, "to": 0, "summary": ""}]}"""

SYS1_EP = SYS1.replace("You read one exchange between a user and a coding agent.",
                       "You read one episode (a few consecutive exchanges) between a user and a coding agent, with a summary of how it ended.")
SYS1_EP = SYS1_EP.replace("Read the next exchange: if the user denies a claim there, or a later result proves it\nwrong, do not extract it.",
                          "If the user denies a claim later in the episode, or a later result proves it wrong, do not extract it.")

SYS1_V5 = SYS1.replace("You read one exchange between a user and a coding agent.",
                       "You read one target exchange between a user and a coding agent. Around it you get the whole episode it\n"
                       "belongs to and a map of the session. Extract ONLY from the target exchange; the rest is context.")
SYS1_V5 = SYS1_V5.replace("Read the next exchange: if the user denies a claim there, or a later result proves it\nwrong, do not extract it.",
                          "If the user denies a claim later in the episode or the session, or a later result proves it wrong, do\nnot extract it.")

SYS_CRIT = hat("black") + """

## Task
You get an episode of work and candidate notes and rules extracted from it. Answer closed questions only.
Do not judge whether a candidate is useful. Answer true only when the text clearly shows it.

For each note, first write `generic_rewrite`: the note rewritten with every project name removed (tables,
files, variables, products, people). Then answer:
- is_textbook_definition: it only explains what a well known term means (any manual says it).
- is_agent_unconfirmed_claim: it rests on something the agent said that the user never confirmed and no
  result showed, or that was later denied.
- is_project_detail: true ONLY if `generic_rewrite` loses its meaning or stops being true. If the rewrite
  still says something true and useful, this is false, even when the quote names project things.
- is_agent_self_assessment: the note describes a mistake or a habit of the agent ("errore mio", "ho
  sbagliato", "tendenza a") instead of how something works.
For each rule:
- is_user_rejection: the quote shows the user rejecting what the agent did or proposed. A plain request
  or instruction ("fai X", "direi di fare Y") is not a rejection.

`why`: one short sentence, Italian.
Answer only with this JSON:
{"notes": [{"cand": 0, "generic_rewrite": "", "is_textbook_definition": false, "is_agent_unconfirmed_claim": false, "is_project_detail": false, "is_agent_self_assessment": false, "why": ""}],
 "rules": [{"cand": 0, "is_user_rejection": true, "why": ""}]}"""


def extract3(session=None):
    global SESSION, OUT_V3
    if session:
        SESSION, OUT_V3 = session, HERE / f"v7_{session[:8]}.jsonl"
    vocab = [t["value"] for t in sh("tb", "tags")][:80]
    vset = set(vocab)
    exs = exchanges()
    live = [(n, ex) for n, ex in enumerate(exs) if not noise(ex)]
    out = OUT_V3.open("w")
    out.write(json.dumps({"skipped": {exs[n]["id"]: noise(exs[n]) for n in range(len(exs)) if noise(exs[n])}}) + "\n")

    # phase 0: episodes
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
    eps, log0 = llm(SYS0, listing, v0)
    if eps is None:
        print("phase 0 failed", log0); return
    out.write(json.dumps({"episodes": eps["episodes"], "llm0": log0}, ensure_ascii=False) + "\n"); out.flush()
    print(f"{len(live)} exchanges -> {len(eps['episodes'])} episodes")

    session_map = "## The whole session, episode by episode (later episodes can deny claims made earlier)\n" + \
        "\n".join(f"- [{x['from']}-{x['to']}] {x['summary']}" for x in eps["episodes"])
    saved = []
    # v5: one unit per exchange; the episode and the session map are context only
    units = []
    for e in eps["episodes"]:
        part = [ex for _, ex in live[e["from"]:e["to"] + 1]]
        units += [(e, part, k) for k in range(len(part))]
    for e, part, t in units:
        rec = {"episode": [e["from"], e["to"]], "summary": e["summary"], "exchange": part[t]["id"], "input": part[t]["input"][:200]}
        ep_text = "\n\n".join(f"[{k}]{' <<< TARGET' if k == t else ''} USER: {x['input'][:EP_CHARS]}\nAGENT: {(x['output'] or '')[:EP_CHARS]}" for k, x in enumerate(part))
        tgt = part[t]
        tgt_text = f"USER: {tgt['input'][:IN_CHARS]}\n\nAGENT: {(tgt['output'] or '')[:OUT_CHARS]}"
        user_text = tgt["input"]
        user1 = (f"Tag vocabulary: {', '.join(vocab)}\n\n{session_map}\n\n## How this episode ended\n{e['summary']}"
                 f"\n\n## The episode (context)\n{ep_text}\n\n## >>> TARGET: extract only from this exchange <<<\n{tgt_text}")
        cands, log1 = llm(SYS1_V5, user1, lambda d: None if isinstance(d.get("notes"), list) and isinstance(d.get("rules"), list) else "need lists `notes` and `rules`")
        rec["llm1"] = log1
        if cands is None:
            rec["error"] = "llm1"; out.write(json.dumps(rec, ensure_ascii=False) + "\n"); continue
        rec["raw"] = cands
        terms = project_terms("\n".join(x["input"] + "\n" + (x["output"] or "") for x in part))
        kept, dropped = [], []
        for c in cands["notes"]:
            err = check_note(c, tgt_text, terms, vset)
            (dropped if err else kept).append({**c, "type": "note", **({"drop": err} if err else {})})
        for c in cands["rules"]:
            err = check_rule(c, user_text)
            (dropped if err else kept).append({**c, "type": "rule", **({"drop": err} if err else {})})

        # v7: one quote, one rule
        seen = set()
        for c in [c for c in kept if c["type"] == "rule"]:
            q = norm(c["quote"])
            if q in seen:
                kept.remove(c); dropped.append({**c, "drop": "same_quote_rule"})
            seen.add(q)

        # phase 1b: critic with closed questions
        notes = [c for c in kept if c["type"] == "note"]
        rules = [c for c in kept if c["type"] == "rule"]
        if kept:
            lines = ["## Notes"] + [f"C{k}: {c['what']} | quote: {c['quote']}" for k, c in enumerate(notes)]
            lines += ["", "## Rules"] + [f"C{k}: SE {c['if']} ALLORA {c['do']} | quote: {c['quote']}" for k, c in enumerate(rules)]
            user_c = f"{session_map}\n\n## The episode\n{ep_text}\n\n## The target exchange the candidates come from\n{tgt_text}\n\n" + "\n".join(lines)

            def vc(d):
                if sorted(x.get("cand") for x in d.get("notes", [])) != list(range(len(notes))): return f"need one entry per note 0..{len(notes)-1}"
                if sorted(x.get("cand") for x in d.get("rules", [])) != list(range(len(rules))): return f"need one entry per rule 0..{len(rules)-1}"
            # v6: a council of 3 critics, temperature 0.7; a question is true when at least 2 of the valid votes say so
            with ThreadPoolExecutor(COUNCIL) as pool:
                runs = list(pool.map(lambda _: llm(SYS_CRIT, user_c, vc, temperature=COUNCIL_TEMP), range(COUNCIL)))
            votes = [r for r, _ in runs if r]
            rec["critic"] = [c for _, log in runs for c in log]
            rec["council_valid"] = len(votes)

            def majority(kind, k, q):
                vs = [str(next(x for x in v[kind] if x["cand"] == k).get(q)).lower() == "true" for v in votes]
                return sum(vs) * 2 > len(vs), vs
            kept = []
            for k, c in enumerate(notes):
                res = {q: majority("notes", k, q) for q in ("is_textbook_definition", "is_agent_unconfirmed_claim", "is_project_detail", "is_agent_self_assessment")} if votes else {}
                bad = [q for q, (yes, _) in res.items() if yes]
                c = {**c, "council": {q: vs for q, (_, vs) in res.items()},
                     "rewrites": [next(x for x in v["notes"] if x["cand"] == k).get("generic_rewrite") for v in votes]}
                (dropped if bad else kept).append({**c, **({"drop": f"critic:{','.join(bad)}"} if bad else {})})
            for k, c in enumerate(rules):
                yes, vs = majority("rules", k, "is_user_rejection") if votes else (True, [])
                c = {**c, "council": {"is_user_rejection": vs}}
                (kept if yes else dropped).append({**c, **({} if yes else {"drop": "critic:not_rejection"})})

        # phase 2: neighbours + novelty, same as v1
        neigh, cand2 = [], []
        for c in kept:
            if c["type"] == "note":
                hits = [(h["note"]["id"], h["note"]["what"], h["score"]) for h in sh("tb", "search", c["what"], "--depth", "0", "--limit", "5", "--no-hits")]
            else:
                hits = [(h["id"], f"SE {h['if']} ALLORA {'; '.join(h['do'])}", h["score"]) for h in sh("ti", "search", c["if"], "--limit", "5")]
            if hits and hits[0][2] >= NEAR_IDENTICAL:
                dropped.append({**c, "drop": f"near_identical:{hits[0][0][:8]}:{hits[0][2]:.3f}"}); continue
            cand2.append(c)
            for i, text, s in hits:
                if i not in [x[0] for x in neigh]: neigh.append((i, text, c["type"]))
        for s in saved:
            neigh.append((f"session:{len(neigh)}", s["text"], s["type"]))
        rec["dropped"] = dropped
        if cand2:
            lines = ["## Candidates"] + [
                f"C{k} ({c['type']}): " + (f"{c['what']} | perché: {c['why']}" if c["type"] == "note" else f"SE {c['if']} ALLORA {c['do']}")
                for k, c in enumerate(cand2)]
            lines += ["", "## Neighbours"] + [f"N{k} ({t}): {text[:400]}" for k, (_, text, t) in enumerate(neigh)]
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
            verd, log2 = llm(SYS2, user2, v2)
            rec["llm2"] = log2
            rec["verdicts"] = []
            for v in (verd or {}).get("verdicts", []):
                c = cand2[v["cand"]]
                if v["verdict"] == "extends":          # v7: extends must add something, and an angle is only a ref
                    if not (v.get("adds") or "").strip(): v["verdict"] = "duplicate"
                    elif str(v.get("adds_is_new_idea")).lower() != "true": v["verdict"] = "ref_only"
                of = neigh[v["of"]] if v.get("of") is not None and v["verdict"] != "new" else None
                rec["verdicts"].append({"cand": c, "verdict": v["verdict"], "of": of and of[0], "of_text": of and of[1][:200],
                                        "reason": v.get("reason"), "do": v.get("do"), "adds": v.get("adds")})
                if v["verdict"] in ("new", "extends", "contradicts"):
                    saved.append({"type": c["type"], "text": c.get("what") or f"SE {c['if']} ALLORA {c['do']}"})
        out.write(json.dumps(rec, ensure_ascii=False) + "\n"); out.flush()
        print(f"ep {e['from']}-{e['to']} t{t}  cands {len(cands['notes'])}n/{len(cands['rules'])}r  dropped {len(dropped)}  judged {len(cand2)}")


# ---------------------------------------------------------------- phase 3

SYS3A = hat("green") + """

## Task
You get one note. Decompose it into its atoms and write its SHAPE: the same mechanism with every domain
word removed, so that it could describe a situation in a completely different field. Example: "Kanban
against Scrum" has the shape "buying flexibility costs predictability". Stay faithful: the shape must
still be true of the note. Write 2 or 3 shapes, each one short sentence, in Italian.
Answer only with this JSON: {"shapes": ["", ""]}"""

SYS3B = hat("black") + """

## Task
You get one note and candidate notes from other fields. For each candidate say whether a REAL bridge
exists: the two notes share the same mechanism, so knowing one helps to understand the other. A shared
word or a loose association is not a bridge. When in doubt, it is not connected.
`reason`: one precise sentence in Italian, only when connected.
Answer only with this JSON: {"links": [{"cand": 0, "connected": false, "reason": ""}]}"""


def bridges():
    notes = sh("tb", "browse", "--limit", "5000")
    by_id = {n["id"]: n for n in notes}
    edges = [(n["id"], r["id"], r.get("reason", "")) for n in notes for r in n.get("refs", [])
             if r.get("origin") == "umano" and r["id"] in by_id and n["kind"] != "indice"]
    random.Random(7).shuffle(edges)
    print(f"{len(notes)} notes, {len(edges)} human edges")

    def topic_rank(src, tgt):
        hits = sh("tb", "search", by_id[src]["what"], "--depth", "0", "--limit", "200", "--no-hits")
        ids = [h["note"]["id"] for h in hits]
        return (ids.index(tgt) + 1 if tgt in ids else 999), ids[:11]

    far = []
    for src, tgt, reason in edges:
        if len(far) >= BRIDGE_EDGES: break
        rank, top = topic_rank(src, tgt)
        if rank > FAR_RANK: far.append((src, tgt, reason, rank, top))
    print(f"{len(far)} far edges")

    def one(e):
        src, tgt, reason, rank, top = e
        s = by_id[src]
        shapes, log_a = llm(SYS3A, f"Note: {s['what']}\nWhy: {s['why']}",
                            lambda d: None if isinstance(d.get("shapes"), list) and 1 <= len(d["shapes"]) <= 3 else "need 2-3 `shapes`")
        cands = []
        for sh_ in (shapes or {}).get("shapes", []):
            for h in sh("tb", "search", sh_, "--depth", "0", "--limit", "5", "--no-hits"):
                i = h["note"]["id"]
                if i != src and i not in top and i not in cands: cands.append(i)
        found = tgt in cands
        links, log_b = None, []
        if cands:
            user = f"Note: {s['what']}\n\n" + "\n".join(f"C{k}: {by_id[i]['what'][:400]}" for k, i in enumerate(cands) if i in by_id)
            links, log_b = llm(SYS3B, user, lambda d: None if isinstance(d.get("links"), list) else "need list `links`")
        yes = [cands[l["cand"]] for l in (links or {}).get("links", []) if l.get("connected") and isinstance(l.get("cand"), int) and l["cand"] < len(cands)]
        return {"src": src, "tgt": tgt, "human_reason": reason, "topic_rank": rank, "shapes": shapes,
                "cands": len(cands), "found": found, "judged_yes": len(yes), "target_yes": tgt in yes,
                "links": links, "llm": log_a + log_b}

    with OUT_BRIDGES.open("w") as out, ThreadPoolExecutor(PARALLEL) as pool:
        for r in pool.map(one, far):
            out.write(json.dumps(r, ensure_ascii=False) + "\n"); out.flush()
            print(f"rank {r['topic_rank']:>3}  cands {r['cands']:>2}  found {r['found']}  yes {r['judged_yes']}  target_yes {r['target_yes']}")


# ---------------------------------------------------------------- report

def report(path=None):
    from collections import Counter
    src = HERE / path if path else OUT_EXTRACT
    if src.exists():
        rs = [json.loads(l) for l in src.open()]
        for r in rs:
            for e in r.get("episodes", []): print(f"  episode {e['from']}-{e['to']}: {e['summary']}")
        rs = [r for r in rs if "episodes" not in r and not isinstance(r.get("skipped"), dict)]
        for k in ("critic",):
            for r in rs:
                r.setdefault("llm2", []); r["llm2"] = r["llm2"] + r.get(k, [])
        calls = [c for r in rs for k in ("llm1", "llm2") for c in r.get(k, []) if "s" in c]
        print(f"EXTRACT  exchanges {len(rs)}  skipped {Counter(r.get('skipped') for r in rs if r.get('skipped'))}")
        print(f"  llm calls {len(calls)}  retries/errors {sum(len(r.get(k, [])) > 1 for r in rs for k in ('llm1','llm2'))}"
              f"  time {sum(c['s'] for c in calls):.0f}s  tokens in {sum(c['in'] or 0 for c in calls)} out {sum(c['out'] or 0 for c in calls)}")
        raw = [(c, t) for r in rs for t in ("notes", "rules") for c in (r.get("raw") or {}).get(t, [])]
        print(f"  candidates: {sum(t=='notes' for _,t in raw)} notes, {sum(t=='rules' for _,t in raw)} rules")
        print(f"  dropped by code: {Counter(d['drop'].split(':')[0] for r in rs for d in r.get('dropped', []))}")
        print(f"  verdicts: {Counter((v['cand']['type'], v['verdict']) for r in rs for v in r.get('verdicts', []))}")
        for r in rs:
            for v in r.get("verdicts", []):
                c = v["cand"]
                print(f"\n  [{v['verdict']}] {c['type']} {str(r.get('exchange') or r.get('episode'))[:8]}  " + (c.get("what") or f"SE {c['if']} ALLORA {c['do']}"))
                if c["type"] == "note": print(f"     contexts: {c.get('contexts')}")
                print(f"     quote: {c.get('quote')}")
                if v["of"]: print(f"     of {v['of'][:14]}: {v['of_text']}  | {v.get('reason') or v.get('do')}")
    if not path and OUT_BRIDGES.exists():
        rs = [json.loads(l) for l in OUT_BRIDGES.open()]
        n = len(rs)
        print(f"\nBRIDGES  far edges {n}  target found by shape search {sum(r['found'] for r in rs)}/{n}"
              f"  judged yes {sum(r['judged_yes'] for r in rs)}/{sum(r['cands'] for r in rs)} candidates"
              f"  target judged yes {sum(r['target_yes'] for r in rs)}/{sum(r['found'] for r in rs)}")


if __name__ == "__main__":
    {"extract": extract, "extract3": extract3, "bridges": bridges, "report": report}[sys.argv[1]](*sys.argv[2:])
