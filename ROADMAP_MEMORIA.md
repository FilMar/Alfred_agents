# ROADMAP — Memoria adattiva (`tb`, `ti`, `th`, `tl`)

Documento vivo, in italiano, guidato da Filippo. Affiancato a `ROADMAP.md`, che resta la roadmap di `third_os`.

## Il problema in una frase

La memoria funziona solo se Filippo approva ogni nota e conferma ogni regola. Il gate umano è il collo di bottiglia, ed è scritto nelle regole di governo (Platone propone e l'utente legge; Mosè "never without explicit user confirmation"), non nel codice. L'obiettivo è togliere il gate senza trasformare la memoria in una discarica.

## Diagnosi misurata (2026-09-28)

Corpus: **737 note** in `third-brain`, **54 regole** in `pi_identity`.

| Misura | Valore | Cosa dice |
|---|---|---|
| Note per mese | mag 309, giu 223, lug 81, ago 85, set 39 | il rito si sta spegnendo: **-8x in quattro mesi**. Il fardello è già nei dati |
| `hits` / `last_hit` | 199 note con almeno un hit, 73% a zero, max 4, **6 giorni distinti di storia** | il segnale d'uso è scritto da `recordHits` e **letto da nessuno**. Gli unici consumatori (Platone, Aristotele) passano `--no-hits` per non sporcarlo |
| `kind` | protocollo 272, dato 165, sintesi 157, attrito 122, indice 17, configurazione 4 | il corpus è al 37% procedurale; le decisioni stanno in `.wiki/`, non in `tb` |
| `refs` | 1.56 medi, 109 note isolate, max 6 | grafo sottile per uno Zettelkasten |
| Duplicati semantici | coppie ≥0.9: **2**; ≥0.85: **32** (54 note, 7%) | duplicazione mite, e **18 delle 32 coppie non sono collegate da un ref** (inclusa quella a 0.93) |
| Campo `why` | 39% del testo embeddato, ma solo **1%** cita altre note o gap del TB | il `why` è contesto vero, non meta-commento |
| Contaminazione di progetto | **0** note con code fence, **1** che cita path del repo | la separazione con `.wiki/` tiene |
| Provenienza | `source` presente su **368/737 (50%)**, di cui **192 con URL** risolvibile | per 369 note la nota è l'unico artefatto esistente |
| `ti` | campi `if`, `do`, `tags`. 51 regole su 54 hanno un solo `do`. Nessun campo d'uso | `ti` non può decadere né imparare: non sa se una regola è mai stata applicata |
| `th` | `Member = { name, hat, tools }`. `~/.th/members/` contiene **solo fixture di test**; `th history` mostra membri inventati al volo (`carmack-white`, `purho-black`) | il file membro è cerimonia: l'effimero è già la prassi |

### Conclusione della diagnosi

Lo Zettelkasten **non è la fonte del rumore**: duplicazione mite, `why` legittimo, zero contaminazione, tag sani. I duplicati che esistono sono **la stessa fonte ingerita due volte** — un buco nella pipeline di scrittura, non nello schema.

Quello che lo Zettelkasten costa davvero è due cose, ed è esattamente ciò che serve cambiare:

1. **L'immutabilità** di `what`/`why`/`kind`, che litiga con supersede, critico e credenze che evolvono.
2. **I link a mano**: i candidati sono gratis (vicini vettoriali già in Qdrant) e nessuno li genera.

## Cosa non si fa

- **Non si sostituisce `tb` con Hindsight.** Costo reale = il layer skill (Christopher, Platone, Aristotele, Feynman, Socrate) più `third_os` che importa i moduli di `tb` come libreria. Hindsight resta candidato come motore di `tl`, non di `tb`.
- **Non si svuota per "reinserire con più cognizione".** Per 369 note su 737 il grezzo non esiste più: sarebbe parafrasi, non ri-estrazione. Vale invece il re-embed della Fase 0, che non tocca il contenuto.
- **Non si fanno riscrivere le skill da sole** (gap 6). Resta mossa 3 di `.wiki/memory_log_first_three_moves`: solo quando i dati esistono.
- **Da adesso si conserva il grezzo** per ogni fonte nuova. È la nota `99e6a68e` (`protocollo`), registrata e non applicata: il materiale grezzo resta immutato così che un re-ingest futuro sia possibile.

## Decisioni prese

| Domanda | Scelta |
|---|---|
| Cosa sostituisce l'OK in scrittura | **Critico automatico + decadimento.** Due filtri indipendenti: nessuno dei due deve essere perfetto |
| Cosa succede a una nota superata | **Supersede tracciabile.** Resta, esclusa dalla ricerca di default, con link a chi la sostituisce. È il rename con il punto di `.wiki/`, ma in codice |
| Da dove entra il materiale | **Hook automatico su ogni sessione**, **fonti esterne su richiesta**, **regole `ti` dalle sessioni** |
| Cosa cambia nel tempo | **Cosa la memoria mostra** (ranking), **come l'agente si comporta** (`ti`), **cosa l'agente sa di te** (modello utente). Non le skill |
| Membri `th` | **Si toglono.** `th run --hat <cappello> --task ... --prompt "<system prompt extra>" --tools ...`, prompt appeso sotto il cappello |

Due vincoli di onestà, da non dimenticare in implementazione:

- **Il critico v1 è una rubrica scritta, non appresa.** Le correzioni passate ("snellisci") vivono nelle chat, non in un log: non esistono come dati. La rubrica si scrive dalle fonti che esistono (`skills/platone/SKILL.md`, i vincoli di stile in `CLAUDE.md`, le regole `ti` pertinenti) e impara solo quando `tl` registra le bocciature.
- **Il ranking per uso parte come spinta debole, non come filtro.** `last_hit` ha 6 giorni di storia: filtrare oggi vuol dire seppellire note buone mai ancora cercate.

## Le fasi

### Fase 0 — Modello nuovo, prefissi giusti, alias, campi nuovi

Quattro cose in una sola ricostruzione, perché ricostruire l'indice si paga una volta e va fatto una volta.

**Il modello.** Si passa a `nomic-embed-text-v2-moe` (768 dimensioni, Matryoshka fino a 256, ~100 lingue). Il corpus è interamente in italiano e l'attuale `nomic-embed-text:latest` (137M, v1.5) è addestrato in inglese: questa è la ragione del cambio. Il limite di 512 token non morde — misurato su `why+what`: mediana 505 caratteri, p99 1007, massimo 1312.

**I prefissi.** `search_document:` in scrittura, `search_query:` in ricerca, in `tb` e in `ti` (che riusa `infra.ts`). Sono obbligatori per entrambi i modelli Nomic: senza, confronti vettori prodotti in un modo per cui il modello non è stato addestrato.

**L'alias.** `COLLECTION` diventa un alias; la collection reale porta modello e dimensione nel nome. Verificato sul server: l'alias è trasparente per upsert, query e info, e lo swap è atomico in una sola chiamata.

Vincolo verificato: **un alias non può avere il nome di una collection esistente** (HTTP 409). Quindi per avere l'alias `third-brain` la collection con quel nome deve smettere di esistere. Ricetta di rinomina, provata end-to-end, senza re-embed:

1. Snapshot con Clio.
2. Crea `third-brain__nomic-v1.5-768` con la stessa configurazione (dense + sparse).
3. Copia i 737 punti con `scroll(with_vector=true)` -> `upsert`: dense e sparse sopravvivono identici, payload compreso.
4. Verifica: stesso conteggio, cinque note a campione con vettore e payload identici all'originale.
5. Cancella `third-brain`.
6. Crea l'alias `third-brain` -> `third-brain__nomic-v1.5-768`.

Da qui la v1.5 resta viva come riferimento e come rollback: `third-brain__v2moe-768` si costruisce a parte e il passaggio è uno spostamento di alias. Se v2 delude si torna indietro in una chiamata, senza restore e senza re-embed.

**I campi nuovi**, scritti durante la ricostruzione. Chiavi in inglese come le esistenti, valori in italiano come `kind`:

| Campo | Valore alla migrazione |
|---|---|
| `embed_model` | il modello che ha prodotto il vettore — chiude il rischio di vettori incomparabili nella stessa collection |
| `status` | `promossa` per tutte le 737 esistenti (sono già passate da te); `provvisoria` sarà il default delle nuove |
| `superseded_by` | `null` |
| `refs[].origin` | `umano` per tutti i ref esistenti: sono stati scritti a mano, ed è vero |
| `source_raw` | vuoto sulle vecchie, obbligatorio sulle nuove — la lezione della nota `99e6a68e` |

Nella stessa passata si normalizza il debito: 24 note con `refs` duplicati, 1 self-ref, 1 payload senza campo `id`. È riparazione, non cancellazione: nessuna nota e nessun collegamento distinto va perso.

`pi_identity` segue la stessa meccanica (alias, prefissi, `embed_model`). I campi di uso ed esito delle regole restano Fase 3: qui nascono solo quelli che si popolano con un default.

**La misura, senza giudizi umani.** Tutto in italiano: il cross-lingua non si misura perché non lo usi, non cerchi in inglese.

- **Auto-recupero da parafrasi** — il discriminante. 120 note a campione; per ognuna una riformulazione italiana del `what`, generata una volta e committata, con divieto di riusare i nomi distintivi (altrimenti il compito è banale per tutti e non discrimina). La nota originale deve tornare prima. Metriche `recall@1` e `MRR@10`: posizioni, non punteggi — gli score di due modelli diversi non sono confrontabili.
- **Ref-recall@10** — gratis. I `refs` scritti a mano sono giudizi di pertinenza già pagati. Il test è sbilanciato a favore di v1.5, perché quel grafo è nato cercando con v1.5: se v2 vince comunque, il risultato è solido.
- **Controllo** — una query volutamente irrilevante deve restare visibilmente sotto (regola `ti` esistente).
- Il confronto gira in **dense-only** sulle due collection: lo sparse è indipendente dal modello e includerlo annacqua il segnale.

**Finita quando:** l'alias `third-brain` punta alla collection v2, la v1.5 esiste ancora, il confronto è committato con i numeri di entrambe, e `tb search` dal terminale risponde come prima o meglio.

**Fuori da questa fase:** altri modelli candidati (`bge-m3`, `qwen3-embedding`) — l'armatura di misura resta e li accoglie quando vorrai. E nessun comportamento nuovo: i campi nascono, la logica che li legge è Fase 1.

### Fase 1 — Supersede, oblio e candidati automatici in `tb`

La rete di sicurezza: senza oblio non si può togliere il gate.

- `superseded_by` nel payload; la ricerca esclude le superate per default, con flag per vederle.
- Ranking pesato su `hits`/`last_hit` come **boost**, non come filtro.
- Generazione automatica di candidati-ref dai vicini vettoriali, con `ref.origin` (`auto` | `umano`) e `reason` sempre presente.
- Sanità su `addRefs`: dedup dei `refs`, blocco dell'auto-riferimento.

**Finita quando:** una nota superata smette di comparire nelle ricerche senza essere cancellata, e un `tb` nuovo propone da sé il collegamento della coppia a 0.93 oggi scollegata.

### Fase 2 — Critico automatico: via il gate

- Platone scrive senza chiedere. Un critico separato valuta con la rubrica: boccia, snellisce o passa.
- Controllo di duplicazione **in scrittura** (è il buco che ha prodotto i duplicati attuali): se la nuova nota è sopra soglia con una esistente, si fonde o si scarta, non si aggiunge.
- Ogni bocciatura è un evento: va registrata (Fase 4) perché la rubrica possa migliorare.

**Finita quando:** una sessione produce note in `tb` senza che Filippo le legga, e i duplicati ≥0.9 non aumentano.

### Fase 3 — Schema nuovo di `ti`

`ti` è l'unico store il cui schema è davvero insufficiente, ed è anche il più economico da rifare: 54 righe.

- Aggiungere esito e uso: quante volte la regola è stata applicata, con quale risultato, ultima applicazione, ambito, eventuale scadenza.
- Decadimento: una regola mai applicata sbiadisce; una correzione ripetuta diventa regola.
- Migrazione delle 54 regole esistenti nel nuovo schema.

**Finita quando:** `ti` sa dire quali regole non ha mai usato, e le 54 regole vivono nel nuovo schema.

### Fase 4 — `th` senza membri, poi `tl`

L'ordine conta: i membri si tolgono **prima** di `tl`, così `tl` nasce con `actor = cappello` e non si riscrive dopo.

- `th`: fuori `member create/list/get/delete/promote` e `--from`; `run` prende cappello, task, prompt extra, tools. `fury` perde il mestiere, `annibale` smette di passare nomi di membri.
- Il gap 6 di `.wiki/memory_procedural_six_gaps` (promozione membro↔skill) si **chiude come obsoleto**, non si risolve: con nomi inventati a ogni run non esiste storico da promuovere. L'unità su cui il sistema accumula esperienza diventa il cappello — 6, stabili, matrice densa.
- `tl` come già fondato in `tools/tl/README.md`: log append-only, fire-and-forget, SQLite sul Rasp.

**Finita quando:** un run parte con cappello e prompt inline senza creare file, e ogni run lascia un evento in `tl`.

### Fase 5 — Hook di ingestione, regole automatiche, modello utente

Ultima per costruzione, non per importanza: prima serve il critico (Fase 2) e serve `tl` (Fase 4). L'hook senza critico è una discarica; le regole automatiche senza log sono speculazione.

- Hook di Claude Code che ingerisce a fine sessione senza chiedere — chiude anche il gap 1 (telemetria skill).
- Regole `ti` che nascono dalle sessioni, senza conferma esplicita.
- Modello utente: preferenze, tolleranze, pattern ricorrenti. **Regola di ammissione obbligatoria:** ogni affermazione su Filippo cita gli eventi `tl` che la sostengono, o non entra. È il layer più facile da riempire di fuffa non falsificabile.

**Finita quando:** una sessione lascia note, regole e aggiornamenti al modello utente senza una singola conferma, e ogni voce del modello utente è risalibile a eventi.

## Per un agente che parte da zero

**Precondizioni.** Se una fallisce, fermati: non sei nell'ambiente giusto.

- `tb status` deve dare `{"qdrant":true,"ollama":true,"model":true}`. Qdrant è remoto su `filrasp` via Tailscale (`QDRANT_URL`); Ollama è **locale** su `localhost:11434` (`OLLAMA_URL`). L'`OLLAMA_HOST` presente in env serve ad altro e `tb` non lo usa.
- `bun test tests/tb.test.ts tests/ti.test.ts` verde **prima** di toccare qualsiasi cosa. Se è rosso all'inizio non è colpa tua, e non si procede.
- Il modello che stai per usare deve comparire in `ollama list`; altrimenti `ollama pull`.

**Prima di ogni passo che scrive.**

- `skills/clio/scripts/backup_qdrant.sh third-brain` per lo snapshot. Rollback: `skills/clio/scripts/restore_qdrant.sh`.
- Nessun passo scrive sulla collection viva: si costruisce a parte e si sposta l'alias. Se ti trovi a fare `upsert` sulla collection che l'alias sta servendo, ti sei perso.

**Fermati e chiedi.** Non decidere da solo su:

- soglia di duplicazione in scrittura e forma del campo di stato — dichiarate aperte qui sotto, non si improvvisano;
- qualsiasi modifica al `CLAUDE.md` globale (la conferma di Mosè);
- cancellare o riscrivere una skill (`fury`) o una pagina `.wiki/`;
- cancellare note, regole o collection **non** create da te in questa sessione;
- `git push`, force-push, riscrittura di storia.

**Governance.** Codice che resta -> **Ritchie**. Prova usa-e-getta per rispondere a una domanda -> **Edison**. Pagine `.wiki/` -> **Omero**. Regole `ti` -> **Mosè**, che non scrive senza conferma. Design con più prospettive -> **Annibale**. Prima di un'azione ricorrente o non ovvia: `ti search "<contesto>"`.

**Dove sta cosa.**

- Embedding e costanti: `tools/tb/src/infra.ts` — `embed()` alla riga 66, `EMBED_MODEL`, `VECTOR_SIZE`, `COLLECTION`.
- Collection, ricerca, scroll: `tools/tb/src/qdrant.ts`. **Attenzione**: `ensureCollection()` (righe 70-92) *cancella* la collection se manca `sparse_vectors`. Prima di qualsiasi migrazione va trasformato in un errore rumoroso: non si distruggono dati per riallineare uno schema.
- Note e API pubblica: `tools/tb/src/notes.ts`, `types.ts`, `cli.ts`, `api.ts`.
- `ti`: `tools/ti/src/{identity,qdrant,types,cli}.ts`, riusa `infra.ts` di `tb`.
- Test: `tests/tb.test.ts`, `tests/ti.test.ts`, `tests/th.test.ts`.
- Misura del corpus e benchmark: `scripts/` (da scrivere in Fase 0, via Ritchie).

**Quando un passo è finito.** Vale il "Finita quando" della fase, verificato da un comando che lascia un output — non da un'impressione.

## Dipendenze

```
0 (modello v2 + prefissi + alias + campi)  →  1 (supersede, oblio, candidati)  →  2 (critico)
3 (schema ti)            indipendente, prima che il volume cresca
4a (th senza membri)     →  4b (tl)  →  5 (hook, regole auto, modello utente)
                                   2  →  5
```

## Rapporto con `ROADMAP.md` (`third_os`)

`third_os` importa `tools/tb/src/{qdrant,notes}.ts` come libreria e tiene note e vettori in RAM. Due conseguenze:

- Le Fasi 0 e 1 cambiano i vettori e la semantica della ricerca: `third_os` deve leggere `superseded_by` e non disegnare le note superate, o le disegna sbiadite come scelta esplicita.
- Il budget di **~150 nodi vivi** della Fase 1 di `third_os` è un vincolo sulla Fase 5: l'ingestione automatica alza il volume, e senza oblio effettivo il grafo diventa illeggibile. L'oblio non è un lusso, è un prerequisito della webapp.

## Decisioni aperte

1. **Togliere la conferma a Mosè è una modifica al `CLAUDE.md` globale**, non al codice. Il gate è scritto lì. Decisione di Filippo.
2. Soglia di duplicazione in scrittura (Fase 2): 0.9 è conservativo, 0.85 toccherebbe 54 note su 737. Da tarare su dati, non a priori.
3. Nome e forma del campo di stato in `tb`: `status` (provvisoria/promossa/superata) separato da `superseded_by`, oppure un unico campo di ciclo di vita. La Fase 0 scrive entrambi i campi con i default: la forma definitiva si decide quando la Fase 1 li legge.
4. Se Hindsight diventi il motore di `tl` invece di scriverlo: decidibile solo con uno spike che misuri latenza e qualità di estrazione con modello locale.

## Debito segnalato, non toccato

- 24 note con `refs` duplicati, 1 con self-ref, 1 payload senza campo `id`.
- Il frontmatter dei membri `th` ha un campo `skills` che il tipo `Member` non contempla.\n- `ensureCollection()` cancella la collection quando la configurazione non combacia: comodo come migrazione silenziosa, pistola puntata sul corpus vivo appena ci sono più collection e un alias.
- `tb graph` si dismette quando `third_os` copre la lettura (già in `ROADMAP.md`).

## Pagine `.wiki/` da aggiornare

| Pagina | Cosa cambia |
|---|---|
| `memory_procedural_six_gaps` | gap 6 chiuso come obsoleto (via i membri) |
| `memory_log_first_three_moves` | l'ordine resta valido; si aggiunge che il loop della nota non dipende da `tl`, quello procedurale sì |
| `core_tb_stateless_single_source` | da verificare contro supersede e stato della nota |
| `agents_roster_lives_on_filesystem` | superata se i membri spariscono |
| `memory_ti_context_action_rules` | schema nuovo di `ti` |
