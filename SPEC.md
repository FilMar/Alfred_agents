# Spec: tb near, ti near, tl prompts, ti reach

Principi: P2 (il contratto è il confine), P4 (corto nel caso comune: la parte pura è piccola, l'I/O resta ai bordi), P5 (dati troppo grandi o input illeggibile = errore del mondo, non panic).

## Entità

- **Coppie vicine** (puro, `tools/tb/src/near.ts`, usato da tb e ti)
  - stato: elementi `{ id, vector }`, una soglia di coseno, un limite di coppie
  - fa: tutte le coppie con coseno ≥ soglia, la più vicina prima
  - non fa: I/O; non decide se due note sono doppioni (lo decide Aristotele leggendo)
  - serve a: Aristotele, per trovare i candidati da unire
  - comanda: `tb near --min <coseno> [--tags t] [--limit n]`, `ti near --min <coseno> [--limit n]`

- **Prompt reali** (puro, `tools/tl/src/prompts.ts`)
  - stato: exchange di chat e il loro testo
  - fa: tiene solo i prompt scritti da me, senza duplicati, dal più vecchio
  - non fa: notifiche di task, messaggi tra agenti (`trigger` presente e diverso da `human`), subtask
  - serve a: `ti reach`
  - comanda: `tl prompts [--since d] [--until d]`

- **Raggiungibilità** (puro, `tools/ti/src/reach.ts`)
  - stato: le regole vive e, per ogni prompt, gli id delle regole che la ricerca ha restituito
  - fa: quante volte esce ogni regola; quali non escono mai
  - non fa: conta hit (la ricerca è `--no-hits`); non scrive niente
  - serve a: Aristotele, per sapere dove servono regole fantasma
  - comanda: `tl prompts ... | ti reach [--limit 2] [--min-score 0.5]`, gli stessi valori dell'hook

## Flussi

- `tb near` → note vive con vettore (filtro tag opzionale) → coppie → `[{ a, b, score, a_text, b_text }]`
- `ti near` → regole vive con vettore → coppie → `[{ a, b, score, a_text, b_text }]`, il testo è l'`if`
- `tl prompts` → exchange `chat` nel periodo → testi → `[{ exchange, timestamp, text }]`
- `ti reach` ← JSON di `tl prompts` su stdin → `ti search` di ogni testo senza hit e senza archiviate → `{ prompts, rules: [{ id, if, reached }], unreached }`

## Invarianti

- coppie: ogni coppia ha due id diversi, ogni coppia compare una volta sola, score ≥ soglia, ordinate per score decrescente, al massimo `limit`
- coppie: la soglia è tra -1 e 1; tutti i vettori hanno la stessa lunghezza
- coppie: più di 3000 elementi è un errore del mondo (il calcolo è quadratico)
- prompt: nessun testo vuoto, nessun testo ripetuto, ordine per tempo crescente
- reach: ogni regola viva compare una volta; `reached` è il numero di prompt che l'hanno restituita; `unreached` sono quelle con `reached` = 0
- reach: stdin che non è un array di `{ text }` è un errore del mondo

## Dettagli per i run (test e corpo)

- `vectorSetOf`: restituisce `{ items }` con lo stesso array, castato a `VectorSet`.
- `cosine`: prodotto scalare diviso il prodotto delle norme; il risultato è tagliato in [-1, 1] contro l'errore di arrotondamento.
- `nearPairs`: per ogni coppia `i < j` degli item, nell'ordine dato, `a` = id di `i`, `b` = id di `j`, `score` = `cosine`. Tiene le coppie con score ≥ `min`. Ordine: score decrescente, a parità `a` poi `b` in ordine di stringa.
- `topPairs`: le prime `limit` coppie, nello stesso ordine.
- `isHumanPrompt`: vero se `kind === "chat"` e `meta?.trigger` è assente oppure `"human"`. Falso per `kind === "subtask"`, per `trigger` `"task-notification"`, `"peer"` o qualsiasi altro valore.
- `promptsOf`: tiene le sorgenti con `isHumanPrompt` vero; il testo è `text.trim()`; scarta il testo vuoto; ordina per `exchange.timestamp` crescente (stringhe ISO, si confrontano come stringhe), a parità per id; tra testi uguali tiene il primo in quest'ordine. Un `Prompt` è `{ exchange: exchange.id, timestamp: exchange.timestamp, text }`.
- `reachOf`: `found[k]` sono gli id restituiti dalla ricerca del prompt `k`; un id ripetuto nella stessa ricerca conta una volta; un id che non è tra `rules` si ignora. `rules` del risultato: ogni regola con `reached`, ordinate per `reached` crescente, a parità per id. `unreached`: quelle con `reached === 0`, nello stesso ordine.
- `promptTextsOf`: `input` è il JSON già letto da stdin. Valido se è un array e ogni elemento è un oggetto con `text` stringa. Altrimenti `{ ok: false, error: "stdin must be a JSON array of { text }, as tl prompts prints" }`. Se valido, `texts` = i `text` con `trim()`, senza quelli vuoti, nell'ordine dato.
- Una `Exchange` di test: `{ id, session: "s", timestamp, kind: "chat", actor: "alfredo" }` più `meta` quando serve.
- Test con `bun:test`; import da `../tools/tb/src/near.ts`, `../tools/tl/src/prompts.ts`, `../tools/ti/src/reach.ts`.
