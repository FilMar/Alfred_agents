# ROADMAP — `third_os` (nome provvisorio)

Documento vivo, in italiano, guidato da Filippo. Ogni sezione si cambia insieme, non da soli.

## Cos'è

Una webapp che rende il Third Brain una cosa che si guarda e si tocca, non che si interroga da terminale.

Il **grafo di `tb` è la cosa principale**: non un pannello dentro l'app, ma la pagina stessa. Ogni nota si apre e si modifica. `pi` entra tramite `th`: dibattiti in cui l'agente risponde cercando note su `tb`, note create dall'agente a partire da link web o YouTube, e proposte di collegamento che arrivano come bolle fluttuanti da afferrare o da buttare.

**Fuori scope per ora: `ti`.** Le regole `if→do` non hanno `refs`, nel grafo sarebbero nodi isolati che sporcano il layout e uccidono proprio l'effetto "connesse luminose, lontane sbiadite". Rientrano quando `tb` è finito, e come vista separata.

Riferimento visivo: **napkin.one** e `napkin_esempio_grafica.png` (nel repo).

## L'interfaccia: la più fisica possibile

Il grafo **galleggia davanti agli occhi**.

- Quando apro una nota, **si apre al centro dello schermo**.
- Le note sono **piccole**, coprono poco: attorno resta visibile il grafo che fluttua.
- Vicino alla nota aperta restano le note **connesse** (`refs`) e quelle **vicine vettorialmente**.
- Le connesse sono **luminose**; le altre, più lontane, **piccole e sbiadite**.
- Le proposte di link dell'agente arrivano come **bolle fluttuanti**: si afferrano e si buttano per rifiutarle, con la stessa fisicità del resto.

Due regole che tengono in piedi il tutto:

**1. canvas = fisica, DOM = testo.** Nodi, bolle, galleggiamento, drag e lancio vivono sul canvas. La nota aperta e la `reason` modificabile sono un overlay DOM sopra il canvas. Editare testo dentro un canvas significa reimplementare cursore, selezione, IME e accessibilità: non si fa. Una bolla è canvas finché galleggia, diventa DOM nel momento in cui la apri.

**2. Profondità finta.** Ogni nodo ha una `z` da cui derivano scala, opacità e un filo di blur. Sono poche righe sopra il canvas 2D e danno l'effetto voluto. Niente three.js: nel 3D vero il testo diventa una texture o un elemento proiettato, e qui il contenuto **è** testo. Si rivaluta solo il giorno in cui si vuole ruotare davvero la scena.

## Stack

- **Runtime** Bun, **server** Hono, **linguaggio** TypeScript. Come tutto il repo.
- **`tools/third_os/`**, dual entrypoint (`cli.ts` + `server.ts`) come `tb`, `ti`, `th`.
- Il servizio gira **sul Rasp, accanto a `tb`/`ti`/`th`**, e li usa **come librerie, non come API HTTP esterne**. Niente proxy, niente CORS, niente hop di rete fra due processi sulla stessa macchina.
- **Browser: nessun framework, nessun bundler, nessun build step.** ES modules serviti diretti, `d3-force` **vendorizzato in locale** (pinnato, funziona offline), canvas 2D.
- **CSS a mano**, un file.

```
tools/third_os/
  src/cli.ts        # third_os serve
  src/server.ts     # Hono: statici + API dell'app (importa tb)
  web/index.html
  web/graph.js      # nasce da tools/tb/src/graph/graph.js
  web/note.js
  web/style.css
  web/vendor/d3.min.js
```

### Il modello dei dati in memoria

All'avvio il server chiama `scrollAllWithVectors()` una volta sola e tiene in RAM note, vettori e coordinate PCA. Da qui:

- **Le vicine vettorialmente sono un prodotto scalare in memoria.** Niente Qdrant, niente Ollama, niente rete: per qualche migliaio di note sono pochi millisecondi.
- Le connesse arrivano da `scrollLinkedTo(id)`, che esiste già.
- L'unica chiamata lenta di tutta l'app è la **ricerca a testo libero**, che deve passare da Ollama per l'embedding della query. È l'utente a premerla: accettabile.

### Quando un framework si guadagna il posto

Il giorno in cui l'editor della nota diventa un editor vero — markdown WYSIWYG, tabelle, pannelli multipli. Il segnale è preciso: **quando ci si accorge di star scrivendo a mano del diffing del DOM**, ci si ferma e si prende Svelte. Non prima.

## Fasi MVP (progressive)

### Fase 1 — Solo lettura

Navigare e leggere il grafo di `tb`. Nient'altro.

- Vista grafo: le note fluttuano, si naviga con zoom e pan.
- Click su una nota → si apre al centro; attorno le connesse e le vicine vettorialmente, luminose; le altre piccole e sbiadite.
- **Budget di nodi: ~150 vivi con fisica**, il resto disegnato sbiadito senza simulazione. Senza un numero, "tutte le note" non è un criterio di fine fase.
- **MVP desktop-only.** Afferra-e-butta col mouse non è lo stesso gesto su un telefono: il mobile è sola lettura, o è fuori.

**Finita quando:** dal browser, navigo il grafo e apro una nota al centro con le sue vicine attorno. Zero scritture.

### Fase 2 — Prima scrittura

Ogni nota aperta è modificabile, e si creano note nuove.

- Modifica dei campi di una nota (`what`, `why`, `tags`, `refs`) e creazione di note nuove, via le funzioni di `notes.ts`.
- **Concorrenza: ultimo che scrive vince.** Rilettura prima del salvataggio, nessun lock.
- **Cache:** se una nota cambia da `tb` CLI mentre il server gira, la copia in RAM è vecchia. Ricarica su richiesta (o TTL). Utente singolo, non serve di più — ma va deciso, non subìto.

**Finita quando:** creo una nota dal browser, la modifico, e riletta da `tb search` nel terminale è identica a come la vedo nell'app.

### Fase 3 — Introduzione dell'AI

L'agente entra tramite `th`. Tre pezzi, in ordine.

**La Fase 3 è asincrona per progetto, non per pigrizia.** `runner.ts` esporta `runMember`, ma dentro fa `spawnSandboxed`/`spawnDetached`: il turno dell'agente gira in un processo figlio sotto `bwrap`, quindi paga fork + bwrap + boot di `pi`. Usare `th` come libreria dà l'API in-process, **non toglie lo spawn**: è lo stesso costo che ha fermato il cockpit (vedi `.wiki/cockpit_pivot_pi_extension_rpc.md`). Quindi si lancia, si guarda lo stream, non si aspetta un ping-pong da chat.

Trappola concreta: `runner.ts` esporta anche `ensureSandboxed()`, che **rilancia il processo corrente sotto bwrap**. Se finisse nel percorso di avvio di `third_os`, il server web si re-exec da solo. `th` si importa a mano, funzione per funzione.

- **3a — Dibattiti.** Scrivo nell'app, l'agente risponde cercando note su `tb` e citandole.
- **3b — Note dall'agente.** Do un link web o YouTube → si estrae il transcript, si elabora → nasce una nota.
- **3c — Proposta di link.** Dopo la creazione, l'agente propone collegamenti come bolle fluttuanti: le afferro e le butto per rifiutarle, oppure cerco con la barra di ricerca e propongo io nuove note da linkare. Ogni link accettato porta la sua `reason`, modificabile.

**Finita quando:** un dibattito cita note reali di `tb`; un link YouTube diventa nota; le bolle si accettano o si buttano col mouse; i link accettati si vedono nel grafo.

## Cosa si riusa (esiste già, non si riscrive)

- **`tools/tb/src/qdrant.ts` e `notes.ts`**: `search`, `getByIds`, `scrollAllWithVectors`, `scrollLinkedTo`, `createNote`, `addRefs`, `browseNotes`, `deleteNote`, `setPayload`. Non c'è backend da scrivere, ci sono `import` da fare.
- **`tools/tb/src/graph/graph.js`**: canvas 2D + `d3-force`, con zoom, pan, hover e collide già funzionanti. La vista grafo nasce da qui, non da zero.
- **`polo`**: estrae testo da articoli web e transcript da YouTube. Per 3b.
- **`th` (`runner.ts`, `members.ts`)**: esecuzione dell'agente. Per la Fase 3, con le cautele qui sopra.

Quando `third_os` copre la lettura, **`tb graph` si dismette**. Due viewer dello stesso grafo che divergono sono debito garantito.

## Vincoli che restano

- La logica sta nei moduli esistenti: `third_os` non ha un proprio database.
- Le bolle sono esattamente la decisione `graph_third_os_webapp_wider_than_workbench`: afferra-e-butta = rifiuto, drag-in = accetto, **stesso gesto per entrambi**, `ref.reason` sempre editabile.
- Il modello non genera mai HTML: le risposte dell'agente sono testo/JSON, il rendering è dell'app.
- Tailscale-only, utente singolo, niente login.

## Rapporto con le decisioni già prese in `.wiki/`

Questo documento si discostava da `graph_note_workbench_direct_manipulation.md` su tre punti su quattro. La divergenza è stata registrata: quella decisione è ora **superata** — nascosta come `.graph_note_workbench_direct_manipulation.md` — e al suo posto ci sono quattro decisioni nuove.

| Pagina | Cosa fissa |
|--------|------------|
| `graph_third_os_webapp_wider_than_workbench` | Cos'è `third_os`, le tre fasi, `ti` fuori per ora, le bolle invariate |
| `graph_third_os_imports_tb_as_library` | Gira sul Rasp, importa i moduli di `tb`, vettori in RAM |
| `graph_third_os_canvas_physics_dom_text` | canvas = fisica, DOM = testo; profondità finta, niente framework |
| `graph_third_os_agent_turns_stay_async` | La Fase 3 è asincrona: `th` fa spawn sotto bwrap anche da libreria |

Resta valida, e tenuta identica, la parte sulle bolle e sulla simmetria dei gesti: quel ragionamento non dipendeva dallo scope.

## Domande aperte

1. **Nome** dell'app. `third_os` è provvisorio.
</content>
</invoke>
