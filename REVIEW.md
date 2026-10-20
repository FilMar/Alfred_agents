# Review: tb near, ti near, tl prompts, ti reach

## Esito

- Stato: approvato
- giro 1: approvato senza commenti

## Copertura della spec

- coppie vicine → `tools/tb/src/near.ts`: `vectorSetOf` (tetto 3000, id unici, stessa lunghezza, niente vettori nulli), `cosine`, `nearPairs`, `topPairs`
- `tb near --min [--tags] [--limit]` → `nearNotes` in `tools/tb/src/notes.ts`; solo note vive; sopra 3000 note errore del mondo che suggerisce `--tags`
- `ti near --min [--limit]` → `nearRules` in `tools/ti/src/identity.ts`; solo regole vive; il testo è l'`if`
- prompt reali → `tools/tl/src/prompts.ts`: `isHumanPrompt` (chat, `trigger` assente o `human`), `promptsOf`; comando `tl prompts [--since] [--until]` in `tools/tl/src/cli.ts`, contenuti letti a gruppi di 20
- raggiungibilità → `tools/ti/src/reach.ts`: `reachOf`, `promptTextsOf` (stdin sbagliato = errore del mondo); comando `ti reach` con `--limit 2 --min-score 0.5` come l'hook, `--no-hits`, senza archiviate, 8 ricerche in parallelo

## Contratti derive?

Nessuno.

## Metriche

```
tools/tb/src/near.ts      13 functions  median=1    mean=3.4  max=12  over40=0  flagged=0
tools/tl/src/prompts.ts    8 functions  median=1.5  mean=3.8  max=18  over40=0  flagged=0
tools/ti/src/reach.ts      7 functions  median=2    mean=4.0  max=12  over40=0  flagged=0
```

## Test

- 1311 passati, 0 falliti (94 nuovi: tre file scritti dalle run th, più `tests/near_reach_store.test.ts` sugli stub con i quattro comandi come processi)
- 18 mutanti, tutti uccisi. Tre erano sopravvissuti al primo giro (ordine a parità di score, ordine a parità di tempo, `trim` del prompt): ho rafforzato i contratti e aggiunto tre test.
- Prova sui dati veri, sola lettura:
  - `tb near --min 0.9`: 1 coppia (0.985, due note quasi identiche sul kernel di influenza), 4 secondi
  - `ti near --min 0.85`: 5 coppie tra 0.86 e 0.88, meno di un secondo
  - `tl prompts --since 2026-10-01`: 1040 prompt, 5 secondi
  - `ti reach` su quei 1040: 3 minuti; 198 regole vive, 53 non escono mai, 35 escono una volta sola

## Scostamenti

- `check_body_diff.py` ha rifiutato due corpi per i `return` dentro i comparatori di `sort`: è lo stesso falso positivo di prima. Ho riscritto i comparatori come espressioni.
- Lo stub di Qdrant restituisce i vettori nello scroll quando li si chiede.
- 35 prompt su 1040 sono invocazioni di skill o testo incollato (`<command-message>`, `<skill ...>`, `<pasted_content>`). Li ho lasciati: l'hook li vede comunque, quindi la misura resta quella vera.
- `ti reach` conta anche le regole nate dopo il prompt: misura cosa uscirebbe oggi, non cosa è uscito allora.
