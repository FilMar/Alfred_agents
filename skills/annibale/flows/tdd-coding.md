# Flow: TDD Coding

**Quando usarlo**: implementare una funzionalità partendo da zero, con architettura esplicita, test-first e chiusura sulla wiki.

**Natura**: guidato — ogni fase produce artefatti concreti richiesti dalla fase successiva. Non è un pipeline batch.

**Prerequisiti**: test runner disponibile nel progetto. Wiki inizializzata (`tw init`).

---

## Il ciclo

```
[0. CHIARIMENTO]  → Annibale raccoglie requisiti precisi
[1. ARCHITETTURA] → white + green: strutture, firme, trade-off
[2. STUB]         → coder scrive firme + TODO — deve compilare
[3. TEST]         → black scrive test comportamentali — devono fallire
[4. IMPLEMENTA]   → loop: coder implementa finché i test passano
[5. REVIEW]       → black + white: DRY, pulizia, conformità
[6. WIKI]         → omero aggiorna la wiki del progetto
```

---

## Fase 0 — Chiarimento

Annibale chiede direttamente, senza delegare:
- Comportamento atteso? (input/output concreti)
- Vincoli di performance, compatibilità, stile?
- Dove va il codice? (file, modulo, package)
- Qual è il test runner del progetto?

Non procedere senza risposte concrete.

---

## Fase 1 — Architettura (parallelo)

```bash
P_W=$(th run --member <white> --task "Analizza i requisiti: strutture dati, tipi, dipendenze esistenti da riusare, vincoli.

Requisiti:
<fase 0>" --detach)

P_G=$(th run --member <green> --task "Proponi 2-3 architetture alternative con trade-off per:
<fase 0>

Non scegliere — genera varianti." --detach)

STATUS_W=$(echo "$P_W" | jq -r '.status')
STATUS_G=$(echo "$P_G" | jq -r '.status')
until grep -q "^done$" "$STATUS_W" 2>/dev/null && grep -q "^done$" "$STATUS_G" 2>/dev/null; do sleep 2; done

OUT_W=$(cat "$(echo "$P_W" | jq -r '.out')")
OUT_G=$(cat "$(echo "$P_G" | jq -r '.out')")
```

Presenta entrambe le prospettive all'utente. Chiedi quale architettura adottare prima di continuare.

---

## Fase 2 — Stub

Il membro coder deve avere `--tools read,write,edit,bash`.

```bash
th run --member <coder> --task "Scrivi le firme e le strutture dati per:
<architettura scelta>

Regole:
- Solo firme e tipi, nessuna implementazione
- Body di ogni funzione: TODO comment esplicito con descrizione
- Il codice deve già compilare (o passare type-check) in questo stato"
```

Verifica manualmente che compili prima di andare avanti.

---

## Fase 3 — Test

Il membro black deve avere `--tools read,write,bash`.

```bash
th run --member <black> --task "Scrivi i test comportamentali per queste firme:
<output fase 2>

Regole:
- Testa il comportamento, non l'implementazione
- Includi: caso normale, edge case, caso di errore
- I test DEVONO fallire adesso (implementazione è TODO)
- Non mockare ciò che puoi testare per davvero"
```

Esegui il test runner e verifica che tutti i test falliscano. Se qualcuno passa già, il test è sbagliato.

---

## Fase 4 — Implementa (loop)

```bash
ERRORI="<output test runner iniziale>"

while true; do
  th run --member <coder> --task "Implementa le funzioni per far passare i test.

Firme:
<output fase 2>

Test:
<output fase 3>

Errori attuali:
$ERRORI"

  # esegui il test runner
  # se tutti i test passano → break
  # altrimenti aggiorna $ERRORI e continua
done
```

Se dopo 3 iterazioni i test non passano, fermati e presenta il problema all'utente.

---

## Fase 5 — Review (parallelo)

```bash
P_B=$(th run --member <black> --task "Code review. Cerca: codice duplicato, nomi oscuri, logica nascosta, dead code.

Codice:
<implementazione>" --detach)

P_W=$(th run --member <white> --task "Verifica conformità. Confronta requisiti e implementazione riga per riga. Non fare assunzioni.

Requisiti:
<fase 0>

Codice:
<implementazione>" --detach)

STATUS_B=$(echo "$P_B" | jq -r '.status')
STATUS_W=$(echo "$P_W" | jq -r '.status')
until grep -q "^done$" "$STATUS_B" 2>/dev/null && grep -q "^done$" "$STATUS_W" 2>/dev/null; do sleep 2; done

OUT_B=$(cat "$(echo "$P_B" | jq -r '.out')")
OUT_W=$(cat "$(echo "$P_W" | jq -r '.out')")
```

Presenta i problemi trovati. Se ci sono fix non-triviali, torna alla fase 4.

---

## Fase 6 — Wiki

```bash
th run --member omero --task "Aggiorna la wiki del progetto con la nuova funzionalità.

Cosa è stato implementato:
<sommario>

Firme pubbliche:
<output fase 2>

Decisioni architetturali:
<architettura scelta e perché>"
```

---

## Regole

- **Le firme compilano prima dei test.** Non si scrivono test su codice che non type-checka.
- **I test falliscono prima di implementare.** Un test che passa senza implementazione è rotto.
- **Il loop ha un limite.** Dopo 3 iterazioni infruttuose, escalate all'utente.
- **Review separata dall'implementazione.** Non fare review durante il loop.
- **Omero chiude sempre.** La wiki è parte del deliverable, non un'opzione.
