# Spec: hit e refine in ti, uguali a tb

## Entità

- **Regola** (`pi_identity`)
  - stato: `if`, `do`, `tags`, `exchange?`, `embed_model?`; nuovi: `when?`, `hits?`, `last_hit?`, `archived_at?`
  - fa: nasce con `when` = adesso; conta un hit ogni volta che `ti search` la restituisce
  - non fa: niente `hits_related`, `ti` non ha grafo
  - serve a: hook, agente, `td` (novità), Aristotele
  - comanda: `identity.ts` è l'unico che scrive il payload

- **Fiducia** (`tb/src/refine.ts`, condiviso)
  - stato: nessuno; costanti uguali per tb e ti (base 0.5, peso hit 0.05, tetto 10, dimezzamento 90 giorni, soglia 0.2)
  - fa: da un record contato calcola trust, distribuzione, piano archivia/ripristina
  - non fa: non legge né scrive Qdrant
  - cambia solo il tipo d'ingresso: da `Note` alla forma minima che usa (id, what, when, hits, hits_related, last_hit, last_hit_related, archived_at). tb passa le note come oggi
  - serve a: `tb refine` e `ti refine`

- **COUNTERS_START di ti**
  - stato: costante in `ti`, il giorno del merge di questo branch
  - fa: è il pavimento della data per le regole senza `when` e senza hit

- **ti refine**
  - fa: legge tutte le regole, mappa ognuna sulla forma minima (`what` = `if`, `when` = `when` o COUNTERS_START), chiama lo stesso `refineReport`
  - senza `--apply`: stampa il rapporto e non scrive. Con `--apply`: scrive `archived_at` e lo toglie ai ripristinati
  - l'uscita ha la stessa forma di `tb refine`
- **Riga sotto soglia** (uscita di `tb refine` e `ti refine`)
  - stato: `id`, `trust`, `text`, `when`, `hits`, `hits_related`
  - `text` sostituisce `what`: il testo della nota in tb, l'`if` della regola in ti, tagliato a 80 caratteri (`LOW_TEXT_CHARS`)
  - cambia l'uscita di `tb refine`: i suoi test si aggiornano

## Flussi

- `ti search` → regole → un hit su ciascuna (`hits`+1, `last_hit` = adesso); un errore di scrittura dà un avviso su stderr e non fa fallire la ricerca
- `ti search --no-hits` → nessuna scrittura
- `ti search --no-archived` → esclude le regole con `archived_at`
- API `/search`: `record_hits` (default true) ed `exclude_archived`, come tb
- `td` (neighbours) → `searchEntries` con `record_hits: false`
- hook prompt (`tb_ti/claude.sh`, `tb_ti/pi.ts`) → `ti search ... --no-archived`
- avvio sessione (`tb_refine/claude.sh`, `tb_refine/pi.ts`) → `ti refine --apply` accanto a `tb refine --apply`, staccato e muto

## Invarianti

- un hit è una scrittura parziale del payload: non tocca `if`, `do`, `tags`, vettore
- `append-do` scrive solo `do`: `when`, `hits`, `last_hit`, `archived_at` sopravvivono
- trust di una regola = trust di una nota con gli stessi contatori e `hits_related` = 0
- una regola senza `when` e senza hit ha come ultima data COUNTERS_START
- una regola archiviata non è mai cancellata; torna viva quando trust risale a 0.2
- `ti list` e `ti meta` mostrano i campi nuovi; nessuna migrazione delle regole esistenti

## Conseguenza da sapere

Con il pavimento al giorno del merge, una regola mai restituita scende sotto 0.2 dopo circa 119 giorni. Il primo archivio vero arriva verso metà febbraio 2027. Fino ad allora `ti refine` mostra la distribuzione e non archivia nulla.
