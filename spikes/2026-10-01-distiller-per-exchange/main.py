# spike: distiller-per-exchange
# question: Una chiamata th (erodoto, gemma4:31b-cloud, --no-archive) per exchange su testo pulito costa e rende in modo accettabile? Tempo, note e regole prodotte, exchange/source presenti, fonti inventate.
# opened: 2026-10-01   timebox: 2h
# run: python spikes/2026-10-01-distiller-per-exchange/main.py        (then: ... report | ... undo)
# status: answered
# answer: 60 exchanges, 3 sessions, one th run each (gemma4:31b-cloud, erodoto, no tl row). Time: median
#   12.7 s, total 13.4 min. Read per run: median 62k chars (about 15k tokens, mostly the two quality files),
#   so 1953 runs would read about 30M tokens and take about 7 hours. Output: 24 notes in 24 runs (40%) and 5
#   rules. Process held: --exchange on 100% of saves, 24 of 24 sources empty (right for session work), no invented
#   source, 51% of runs searched tb. Judgment did not: 12 of 24 notes hold project terms (fail the two-context
#   test), 16 of 24 are kind sintesi (the bar allows it only for a bridge the source did not make), 2 are in
#   English, at least 4 repeat an idea saved seconds before, and 2 of 5 rules say the same thing as each other.
#   th --timeout keeps the process alive until the timeout ends, even after the answer (not fixed here).
# verdict: one call per exchange is cheap to start and fast, but this skill with this model saves too much and
#   cannot see its own earlier saves. Split it: a proposing call (no writes), then code searches the neighbours,
#   then a judging call sees the proposal and the five nearest notes. Windows of 50 cost 40 runs, not 1953.
#
# Rules are off in here: no contracts, no tests, no abstraction.
# Delete this folder when it stops compiling. Never promote this code.
#
# Writes REAL notes and rules (tb, ti). Every id is logged in results.jsonl.
# `undo` deletes them all. tl is never written: th runs with --no-archive and
# `tl distilled` is called only when MARK_DISTILLED is True.
# Tokens are not measured: --no-archive leaves no usage row. `read_chars` is the
# proxy: the characters the run read back from its tools.

# --- parameters: edit these, then run again ---
SESSIONS = [
    "e88f54b1-9360-4bcb-8bfe-076021cb5e8a",  # core_render: corrections on code
    "65b4a759-d15d-462d-b1f2-6eac2449a61f",  # the sun: a work flow
    "fd14f119-20cd-417a-ab82-4b2043d8c0d6",  # db migration: checks on real data
]
SKIP_FIRST = 5               # exchanges skipped at the start of each session
EXCHANGES_PER_SESSION = 20   # 0 = every exchange after the skip
MODEL = "ollama/gemma4:31b-cloud"
SKILL = "erodoto"
THINKING = "off"
TIMEOUT_S = 240              # hard limit per run, kept by this script: th --timeout keeps the process alive to the end
PARALLEL = 1                 # runs at the same time
MIN_CHARS = 0                # skip an exchange whose clean input+output is shorter
MARK_DISTILLED = False       # True: tl distilled after each run
RESUME = True                # skip ids already in results.jsonl
TASK = ("Elabora solo questo exchange: {id}. L'id e' gia' dato: salta il passo 1 (tl pending) "
        "e il passo 5 (tl distilled). Leggilo con tl show {id}, senza --tools.")
# --- end parameters ---

import json, os, pathlib, re, statistics, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = pathlib.Path(__file__).resolve().parent
RESULTS = HERE / "results.jsonl"
API = os.environ.get("TL_API_URL", "http://localhost:8790")
WRITES = ("tb save", "ti add", "ti append-do", "ti delete", "tb update", "tb delete")


def get(path):
    with urllib.request.urlopen(API + path, timeout=30) as r:
        return json.load(r)


def pick_exchanges():
    ids = []
    for s in SESSIONS:
        rows = [e for e in get(f"/exchanges?session={s}&limit=2000") if e["kind"] == "chat"]
        rows.sort(key=lambda e: e["timestamp"])
        rows = rows[SKIP_FIRST:]
        if EXCHANGES_PER_SESSION:
            rows = rows[:EXCHANGES_PER_SESSION]
        ids += [(s, e["id"]) for e in rows]
    return ids


def parse_log(path):
    calls, results = [], []
    for line in pathlib.Path(path).read_text(errors="replace").splitlines():
        m = re.match(r"^\[tool:(\w+)\] (\{.*\})$", line)
        if m:
            calls.append((m.group(1), json.loads(m.group(2))))
            continue
        m = re.match(r"^\[tool:(\w+)\]  (.*)$", line)
        if m:
            raw = m.group(2)
            cut = re.search(r"\[\+(\d+) chars\]$", raw)
            try:
                d = json.loads(raw)
                text = "".join(c.get("text", "") for c in d.get("content", []))
            except Exception:
                text = raw
            results.append((m.group(1), text + " " * (int(cut.group(1)) if cut else 0)))
    bash_calls = [a.get("command", "") for t, a in calls if t == "bash"]
    bash_results = [x for t, x in results if t == "bash"]
    read_chars = sum(len(x) for _, x in results)
    return bash_calls, bash_results, read_chars


def flag(cmd, name):
    m = re.search(rf'--{name}\s+(?:"((?:[^"\\]|\\.)*)"|\'([^\']*)\'|(\S+))', cmd)
    return next((g for g in m.groups() if g is not None), None) if m else None


def saved_items(bash_calls, bash_results, text, tools):
    notes, rules, deleted = [], [], []
    ids = [m.group(1) for m in (re.match(r'^\s*\{\s*"id":\s*"([0-9a-f-]{36})"', r) for r in bash_results) if m]
    for cmd in bash_calls:
        if "tb save" in cmd:
            ident = ids.pop(0) if ids else None
            src = flag(cmd, "source")
            where = "none"
            if src:
                where = "text" if src in text else "tools-only" if src in tools else "not-found"
            notes.append({"id": ident, "kind": flag(cmd, "kind"), "what": (flag(cmd, "what") or "")[:160],
                          "exchange": flag(cmd, "exchange"), "source": src, "source_where": where,
                          "failed": ident is None})
        elif "ti add" in cmd:
            ident = ids.pop(0) if ids else None
            rules.append({"id": ident, "if": (flag(cmd, "if") or "")[:160], "do": (flag(cmd, "do") or "")[:200],
                          "exchange": flag(cmd, "exchange"), "failed": ident is None})
        elif "ti delete" in cmd or "tb delete" in cmd:
            deleted.append(cmd[:120])
    return notes, rules, deleted


def run_one(item):
    session, xid = item
    body = get(f"/contents/{xid}?tools=true")
    text = body["input"] + "\n" + body["output"]
    if len(text) < MIN_CHARS:
        return None
    cmd = ["th", "run", "--skill", SKILL, "--model", MODEL, "--thinking", THINKING, "--no-archive",
           "--task", TASK.format(id=xid)]
    t0 = time.time()
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT_S + 30)
        code, out, err = p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        code, out, err = -1, "", ""
    secs = round(time.time() - t0, 1)
    m = re.search(r"log: (\S+\.log)", err)
    bash_calls, bash_results, read_chars = parse_log(m.group(1)) if m else ([], [], 0)
    notes, rules, deleted = saved_items(bash_calls, bash_results, text, body.get("tools", ""))
    if MARK_DISTILLED and code == 0:
        subprocess.run(["tl", "distilled", xid], capture_output=True)
    row = {"session": session, "id": xid, "secs": secs, "exit": code, "text_chars": len(text),
           "tools_chars": len(body.get("tools", "")), "read_chars": read_chars, "bash_calls": len(bash_calls),
           "tb_search": sum("tb search" in c for c in bash_calls), "ti_search": sum("ti search" in c for c in bash_calls),
           "notes": notes, "rules": rules, "deleted": deleted, "answer": out[:600]}
    with RESULTS.open("a") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"{xid[:8]} {secs:>5}s exit={code} notes={len(notes)} rules={len(rules)} search={row['tb_search']}/{row['ti_search']}", flush=True)
    return row


def rows():
    return [json.loads(l) for l in RESULTS.read_text().splitlines()] if RESULTS.exists() else []


def report():
    rs = rows()
    if not rs:
        raise SystemExit("no results yet")
    def pct(a, b):
        return f"{100 * a // b}%" if b else "-"
    for label, sub in [("ALL", rs)] + [(s[:8], [r for r in rs if r["session"] == s]) for s in SESSIONS]:
        if not sub:
            continue
        secs = [r["secs"] for r in sub]
        notes = [n for r in sub for n in r["notes"]]
        rules = [x for r in sub for x in r["rules"]]
        reads = sorted(r["read_chars"] for r in sub)
        print(f"== {label}: {len(sub)} runs, exit!=0: {sum(r['exit'] != 0 for r in sub)}")
        print(f"   time: median {statistics.median(secs)}s, total {round(sum(secs) / 60, 1)} min")
        print(f"   read_chars: median {int(statistics.median(reads)):,}, p90 {reads[int(len(reads) * .9)]:,}")
        print(f"   notes {len(notes)} (runs with a note: {sum(bool(r['notes']) for r in sub)}), rules {len(rules)}")
        print(f"   runs with tb search: {pct(sum(r['tb_search'] > 0 for r in sub), len(sub))}, with ti search: {pct(sum(r['ti_search'] > 0 for r in sub), len(sub))}")
        print(f"   --exchange right: notes {pct(sum(bool(n['exchange']) for n in notes), len(notes))}, rules {pct(sum(bool(x['exchange']) for x in rules), len(rules))}")
        where = {}
        for n in notes:
            where[n["source_where"]] = where.get(n["source_where"], 0) + 1
        print(f"   source: {where}   kinds: { {k: sum(n['kind'] == k for n in notes) for k in set(n['kind'] for n in notes)} }")
    print("\n== NOTES")
    for r in rs:
        for n in r["notes"]:
            print(f"- [{n['kind']}] {n['what']}  (src: {n['source_where']}, ex: {r['id'][:8]})")
    print("\n== RULES")
    for r in rs:
        for x in r["rules"]:
            print(f"- if {x['if']} => {x['do']}  (ex: {r['id'][:8]})")


def undo():
    for r in rows():
        for n in r["notes"]:
            if n["id"]:
                print("tb delete", n["id"], subprocess.run(["tb", "delete", n["id"], "--yes"], capture_output=True, text=True).returncode)
        for x in r["rules"]:
            if x["id"]:
                print("ti delete", x["id"], subprocess.run(["ti", "delete", x["id"]], capture_output=True, text=True).returncode)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "run"
    if mode == "report":
        return report()
    if mode == "undo":
        return undo()
    done = {r["id"] for r in rows()} if RESUME else set()
    todo = [it for it in pick_exchanges() if it[1] not in done]
    print(f"{len(todo)} runs to do ({len(done)} already done)", flush=True)
    with ThreadPoolExecutor(PARALLEL) as ex:
        list(ex.map(run_one, todo))
    report()


main()
