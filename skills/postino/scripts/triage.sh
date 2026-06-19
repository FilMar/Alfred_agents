#!/usr/bin/env bash
# Triage INBOX via LLM: classifica, sposta, riporta.
# Usage: triage.sh [--folder <name>] [--page-size <n>]
set -euo pipefail

FOLDER="INBOX"
PAGE_SIZE=100

while [[ $# -gt 0 ]]; do
  case "$1" in
    --folder) FOLDER="$2"; shift 2 ;;
    --page-size) PAGE_SIZE="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

BOLD="\033[1m"
DIM="\033[2m"
RED="\033[31m"
RESET="\033[0m"

th member create classificatore --hat white-core \
  --role "Classifica email in categorie. Ricevi JSON di email, rispondi SOLO con JSON array di classificazioni." \
  --tmp 2>/dev/null || true

echo -e "\n${BOLD}=== Triage '${FOLDER}' ===${RESET}"
echo "Recupero email..."

ENVELOPES=$(himalaya envelope list --page-size "$PAGE_SIZE" -o json -f "$FOLDER" 2>/dev/null)
COUNT=$(echo "$ENVELOPES" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)

if [[ "$COUNT" -eq 0 ]]; then
  echo "Nessuna email trovata."
  exit 0
fi

echo "${COUNT} email trovate. Classifico con LLM..."

# Preparo input compatto per il classificatore: solo i campi utili
COMPACT=$(echo "$ENVELOPES" | python3 -c "
import json, sys
data = json.load(sys.stdin)
out = []
for e in data:
    out.append({
        'id': e['id'],
        'from': e.get('from', {}).get('addr', ''),
        'name': e.get('from', {}).get('name', ''),
        'subject': e.get('subject', ''),
        'date': e.get('date', '')[:10],
    })
print(json.dumps(out))
")

PROMPT="Classifica queste email in categorie. Per ognuna restituisci SOLO un JSON array con oggetti {\"id\": \"...\", \"cat\": \"...\"}.\n\nCategorie disponibili:\n- promo: newsletter, marketing, offerte, promozioni\n- notifiche: aggiornamenti automatici da siti, noreply, digest, notifiche social\n- pagamenti: fatture, ricevute, transazioni, estratti conto\n- meeting: inviti a riunioni o eventi\n- focus: email importanti che richiedono attenzione\n- non_classificato: tutto il resto\n\nEmail:\n${COMPACT}\n\nRispondi SOLO con il JSON array, zero testo aggiuntivo."

RESULT=$(th run --member classificatore --task "$PROMPT" 2>/dev/null)

# Estrai JSON anche se c'è testo attorno
CLASSIFICATIONS=$(echo "$RESULT" | python3 -c "
import json, sys, re
text = sys.stdin.read()
match = re.search(r'\[.*\]', text, re.DOTALL)
if not match:
    print('[]')
    sys.exit(0)
try:
    data = json.loads(match.group())
    print(json.dumps(data))
except Exception as e:
    print('[]', file=sys.stderr)
    print('[]')
" 2>/dev/null)

if [[ "$CLASSIFICATIONS" == "[]" ]]; then
  echo -e "${RED}Errore: il classificatore non ha restituito JSON valido.${RESET}" >&2
  exit 1
fi

# Raggruppa per categoria e stampa + sposta
python3 - <<PYEOF
import json, subprocess, sys
from collections import defaultdict

envelopes   = json.loads('''$ENVELOPES''')
classified  = json.loads('''$CLASSIFICATIONS''')
source      = "$FOLDER"

id_map = {e['id']: e for e in envelopes}
cat_map = {c['id']: c['cat'] for c in classified}

BOLD  = "\033[1m"
DIM   = "\033[2m"
RED   = "\033[31m"
GREEN = "\033[32m"
RESET = "\033[0m"

COLORS = {
    "promo":           "\033[33m",
    "notifiche":       "\033[34m",
    "pagamenti":       "\033[32m",
    "meeting":         "\033[36m",
    "focus":           "\033[35m",
    "non_classificato":"\033[37m",
}

FOLDER_MAP = {
    "promo":    "promo",
    "notifiche":"notifiche",
    "pagamenti":"pagamenti",
    "meeting":  "focus",
    "focus":    "focus",
}

WARN_DELETE = {"promo", "notifiche"}

EXISTING = {"focus","mondo","necessita'","pagamenti","INBOX",
            "[Gmail]/Bozze","[Gmail]/Cestino","[Gmail]/Importanti",
            "[Gmail]/Posta inviata","[Gmail]/Spam","[Gmail]/Speciali",
            "[Gmail]/Tutti i messaggi"}

def truncate(s, n):
    s = s or ""
    return s if len(s) <= n else s[:n-1] + "…"

def ensure_folder(name):
    if name in EXISTING:
        return True
    # create is idempotent: ignore failure if folder already exists
    subprocess.run(f"himalaya folder create '{name}'", shell=True, capture_output=True)
    return True

def move(folder, ids):
    id_str = " ".join(ids)
    r = subprocess.run(f"himalaya message move -f '{source}' '{folder}' {id_str}",
                       shell=True, capture_output=True, text=True)
    return r.returncode == 0, r.stderr.strip()

buckets = defaultdict(list)
for env in envelopes:
    cat = cat_map.get(env['id'], 'non_classificato')
    buckets[cat].append(env)

order = ["promo","notifiche","pagamenti","meeting","focus","non_classificato"]
moved_total = 0

for cat in order:
    envs = buckets.get(cat, [])
    if not envs:
        continue
    color = COLORS.get(cat, "")
    target = FOLDER_MAP.get(cat)
    label = cat.replace("_", " ").upper()

    print(f"\n{BOLD}{color}[{label}]{RESET}  {len(envs)} email")
    for e in envs:
        from_name = e.get('from', {}).get('name') or e.get('from', {}).get('addr', '?')
        subj  = e.get('subject', '(no subject)')
        eid   = e.get('id', '?')
        print(f"  {color}{eid:>6}{RESET}  {truncate(from_name,22):<22}  {truncate(subj,52)}")

    if target:
        ids = [e['id'] for e in envs]
        if ensure_folder(target):
            ok, err = move(target, ids)
            if ok:
                print(f"  {DIM}→ spostate in '{target}'{RESET}")
                moved_total += len(ids)
            else:
                print(f"  {RED}→ errore: {err}{RESET}")
        if cat in WARN_DELETE:
            print(f"  {RED}Puoi eliminare queste email manualmente da '{target}'.{RESET}")

print(f"\n{BOLD}Riepilogo:{RESET} {moved_total} email spostate.\n")
PYEOF
