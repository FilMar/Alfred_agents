# Review: td affidabile (obiettivo 2)

## Esito

- Stato: approvato
- Giro 1: tutti e quattro i blocchi sono fatti; più l'emivita della fiducia da 90 a 30 giorni

## Copertura della spec

- timeout → `ModelCaller.ask(..., timeoutMs = CALL_TIMEOUT_MS)`, `CALL_TIMEOUT_MS = 300_000`; `#send` passa `AbortSignal.timeout` a `completeSimple`; pi-ai risponde con `stopReason: "aborted"`, che `ask` trasforma già in risposta rifiutata
- guide → `tools/td/src/guides.ts`: `qualityBar` (puro) e `QUALITY_BAR` (letto una volta all'import da `tools/tb/guide.md` e `tools/ti/guide.md`)
- `extractionPrompt` e `noveltyPrompt` iniziano con `QUALITY_BAR`; il postcondition lo controlla
- critico e append → riga 3 dell'estrattore in `tl`, figlia della 2, attiva: check `is_generic_rule` (regola, atLeast 0.5) e tre righe nel prompt di novità (append solo per la stessa situazione dell'`if`; il `do` è un ordine, mai una nota sulla regola)
- emivita → `HALF_LIFE_DAYS = 30` in `tools/tb/src/refine.ts`; vale anche per `ti`, che usa la stessa formula

## Contratti derive?

| Contratto | Derivato da | Principio |
|---|---|---|
| Nessuno | | |

## Metriche

```
2 functions  median=2.5  mean=2.5  max=3  over40=0  flagged=0
```

## Test

- 1322 passati, 0 falliti; typecheck pulito
- mutanti uccisi: senza `signal` il test del timeout fallisce; con le guide in ordine inverso fallisce `td_guides`

## Scostamenti

- I test e il corpo sono passati da th solo per `qualityBar`. Il timeout e le due righe nei prompt sono modifiche a corpi esistenti: le ho scritte io, con i loro test.
- `QUALITY_BAR` si costruisce all'import: contro lo stub `todo` tutto il file di test falliva all'import, non solo i test bare-call.
- Costo: le due guide sono circa 2000 parole, quindi circa 3000 token in più a ogni chiamata di estrazione e di novità.
- La guida resta viva: un cambio di `guide.md` cambia il prompt senza una nuova riga dell'estrattore. Il confronto tra run della stessa riga non è più esatto.
- Emivita a 30 giorni: una nota senza hit scende sotto 0.2 dopo circa 40 giorni dall'ultimo segnale. Le note senza hit dal 2026-09-21 vengono archiviate dal 2026-10-31; le regole di `ti` (contatori dal 2026-10-20) dal 2026-11-29.
