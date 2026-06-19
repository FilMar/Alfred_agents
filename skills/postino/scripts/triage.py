#!/usr/bin/env python3
"""
Triage INBOX: classifica le email, sposta nelle cartelle appropriate, stampa report.

Usage:
  himalaya envelope list --page-size 300 -o json | python3 triage.py
  himalaya envelope list --page-size 300 -o json -f <folder> | python3 triage.py --folder <folder>
"""

import json
import sys
import subprocess
from datetime import datetime, timezone
from collections import defaultdict

# ---------------------------------------------------------------------------
# Regole di classificazione
# ---------------------------------------------------------------------------

PROMO_DOMAINS = {
    "peakdesign.com", "nutribees.com", "4books.com", "sefirot.it",
    "substack.com", "mailchimp.com", "sendgrid.net", "klaviyo.com",
    "list-manage.com", "constantcontact.com", "brevo.com", "mailerlite.com",
    "campaign-archive.com", "createsend.com", "hubspot.com",
    "ticketone.it", "unobravo.com", "frontendmasters.com", "ifttt.com",
}

PROMO_SUBJECT_KEYWORDS = [
    "offerta", "sconto", "promo", "sale", "deal", "% off", "coupon",
    "newsletter", "last chance", "limited time", "shop now", "buy now",
    "order now", "black friday", "cyber monday",
]

MEETING_SUBJECT_KEYWORDS = [
    "invito", "meeting", "calendar invite", "invitation", "riunione",
    "standup", "stand-up", "sync", "call scheduled", "webinar",
    "ha invitato", "you're invited", "event:",
]

NOTIFICATION_DOMAINS = {
    "google.com", "github.com", "gitlab.com", "linkedin.com",
    "twitter.com", "instagram.com", "facebook.com", "notion.so",
    "slack.com", "trello.com", "asana.com",
}

NOTIFICATION_ADDR_PATTERNS = [
    "noreply@", "no-reply@", "notifications@", "alert@",
    "donotreply@", "do-not-reply@", "automated@", "mailer@",
]

NOTIFICATION_SUBJECT_KEYWORDS = [
    "ha commentato", "ha risposto", "mentioned you", "new comment",
    "digest", "weekly summary", "aggiornamento", "new activity",
]

FINANCIAL_DOMAINS = {
    "paypal.it", "paypal.com", "fineconews.com", "nexi.it", "n26.com",
    "revolut.com", "stripe.com",
}

FINANCIAL_SUBJECT_KEYWORDS = [
    "pagamento", "fattura", "invoice", "receipt", "ricevuta",
    "transazione", "bonifico", "accredito", "addebito", "estratto conto",
    "billing", "subscription renewed", "paga in 3",
]

EXISTING_FOLDERS = {
    "focus", "mondo", "necessita'", "pagamenti", "INBOX",
    "[Gmail]/Bozze", "[Gmail]/Cestino", "[Gmail]/Importanti",
    "[Gmail]/Posta inviata", "[Gmail]/Spam", "[Gmail]/Speciali",
    "[Gmail]/Tutti i messaggi",
}

CATEGORY_META = {
    "promo": {
        "label": "Promo / Newsletter",
        "folder": "promo",
        "warn_delete": True,
    },
    "meeting_vecchi": {
        "label": "Meeting / Inviti scaduti (>30gg)",
        "folder": "archiviare",
        "warn_delete": True,
    },
    "meeting": {
        "label": "Meeting / Inviti recenti",
        "folder": "focus",
        "warn_delete": False,
    },
    "notifiche": {
        "label": "Notifiche / Aggiornamenti siti",
        "folder": "notifiche",
        "warn_delete": True,
    },
    "pagamenti": {
        "label": "Pagamenti / Fatture",
        "folder": "pagamenti",
        "warn_delete": False,
    },
    "non_classificato": {
        "label": "Non classificato",
        "folder": None,
        "warn_delete": False,
    },
}

RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
COLORS = {
    "promo": "\033[33m",
    "meeting_vecchi": "\033[35m",
    "meeting": "\033[36m",
    "notifiche": "\033[34m",
    "pagamenti": "\033[32m",
    "non_classificato": "\033[37m",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def norm(s):
    return (s or "").lower()

def domain_of(addr):
    addr = norm(addr)
    return addr.split("@")[-1] if "@" in addr else addr

def domain_matches(dom, rules):
    return any(dom == r or dom.endswith("." + r) for r in rules)

def classify(env):
    addr = norm(env.get("from", {}).get("addr", ""))
    subj = norm(env.get("subject", ""))
    dom = domain_of(addr)
    date_str = env.get("date", "")

    if domain_matches(dom, FINANCIAL_DOMAINS) or any(k in subj for k in FINANCIAL_SUBJECT_KEYWORDS):
        return "pagamenti"
    if any(k in subj for k in MEETING_SUBJECT_KEYWORDS):
        return "meeting_vecchi" if is_old(date_str, 30) else "meeting"
    if domain_matches(dom, PROMO_DOMAINS) or any(k in subj for k in PROMO_SUBJECT_KEYWORDS):
        return "promo"
    if domain_matches(dom, NOTIFICATION_DOMAINS) or any(p in addr for p in NOTIFICATION_ADDR_PATTERNS):
        return "notifiche"
    if any(k in subj for k in NOTIFICATION_SUBJECT_KEYWORDS):
        return "notifiche"
    return "non_classificato"

def is_old(date_str, days=30):
    try:
        dt = datetime.fromisoformat(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - dt).days > days
    except Exception:
        return False

def fmt_age(date_str):
    try:
        dt = datetime.fromisoformat(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - dt).days
        return "oggi" if age == 0 else f"{age}gg fa"
    except Exception:
        return date_str[:10]

def truncate(s, n):
    s = s or ""
    return s if len(s) <= n else s[:n - 1] + "…"

def run(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.returncode, result.stdout.strip(), result.stderr.strip()

def ensure_folder(name):
    if name in EXISTING_FOLDERS:
        return True
    code, _, err = run(f"himalaya folder create '{name}'")
    if code != 0:
        print(f"  {BOLD}\033[31mErrore creando cartella '{name}': {err}{RESET}")
        return False
    return True

def move_emails(folder, ids, source="INBOX"):
    id_str = " ".join(ids)
    code, _, err = run(f"himalaya message move -f '{source}' '{folder}' {id_str}")
    return code == 0, err


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    source_folder = "INBOX"
    for i, arg in enumerate(sys.argv[1:]):
        if arg == "--folder" and i + 1 < len(sys.argv) - 1:
            source_folder = sys.argv[i + 2]

    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Errore lettura JSON: {e}", file=sys.stderr)
        sys.exit(1)

    if not data:
        print("Nessuna email trovata.")
        return

    buckets = defaultdict(list)
    for env in data:
        buckets[classify(env)].append(env)

    total = len(data)
    print(f"\n{BOLD}=== Triage '{source_folder}': {total} email ==={RESET}\n")

    order = ["promo", "meeting_vecchi", "notifiche", "pagamenti", "meeting", "non_classificato"]
    moved_total = 0
    skipped_total = 0

    for cat in order:
        envs = buckets.get(cat, [])
        if not envs:
            continue
        meta = CATEGORY_META[cat]
        color = COLORS[cat]
        target = meta["folder"]

        print(f"{BOLD}{color}[{meta['label']}]{RESET}  {len(envs)} email")

        for e in envs:
            from_name = e.get("from", {}).get("name") or e.get("from", {}).get("addr", "?")
            subj = e.get("subject", "(no subject)")
            age = fmt_age(e.get("date", ""))
            eid = e.get("id", "?")
            print(f"  {color}{eid:>6}{RESET}  {truncate(from_name, 22):<22}  {truncate(subj, 50):<50}  {DIM}{age}{RESET}")

        if target:
            ids = [e["id"] for e in envs]
            if ensure_folder(target):
                ok, err = move_emails(target, ids, source_folder)
                if ok:
                    print(f"  {DIM}→ spostate in '{target}'{RESET}")
                    moved_total += len(ids)
                else:
                    print(f"  {BOLD}\033[31m→ errore spostando in '{target}': {err}{RESET}")
                    skipped_total += len(ids)
            else:
                skipped_total += len(ids)

            if meta["warn_delete"]:
                print(f"  {BOLD}\033[31mSuggerimento: puoi eliminare queste email manualmente da '{target}'.{RESET}")
        else:
            skipped_total += len(envs)

        print()

    print(f"{BOLD}Riepilogo:{RESET} {moved_total} spostate, {skipped_total} non classificate / errori.")
    print()


if __name__ == "__main__":
    main()
