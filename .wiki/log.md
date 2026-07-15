## [2026-07-14] ingest | orchestrator_overview
## [2026-07-14] ingest | roadmap_orchestrator
# Log

## Frontmatter

tags: [log, storico]
sources: []
updated: 2026-07-02

## Log

## [2026-07-15] reconcile | Topologia di rete WoL confermata e modello di access control per l'ingestion dei task

Confermata dall'utente la topologia fisica: Rasp e Desktop collegati via Ethernet sulla stessa LAN, ~10cm di distanza — il magic packet WoL viaggia su broadcast L2 locale, nessun attraversamento di Tailscale/WireGuard. Tailscale resta riservato all'accesso esterno all'orchestratore (portatile, cellulare), non alla comunicazione Rasp↔Desktop. Aggiunto un quinto pilastro architetturale, Access Control (The Perimeter): nessun sistema di utenti/ruoli custom nell'app, due livelli entrambi già esistenti — ACL Tailscale per tag device (limitano quali dispositivi raggiungono le porte SSH/HTTP del Rasp) e chiave SSH dedicata per dispositivo in `authorized_keys` (fisso e portatile con scrittura piena su `/scripts`, cellulare con forced command in sola lettura, escluso dalla registrazione di nuovi task). Motivazione: l'endpoint non è mai esposto pubblicamente, solo su Tailscale — un attaccante dovrebbe prima violare la rete Tailscale stessa, quindi i due livelli sono difesa in profondità sufficiente. Aggiornate: `orchestrator_overview` (nuovo pilastro 5, nota di topologia nel pilastro 3, stack tecnico), `roadmap_orchestrator` (Fase 2 — nota di topologia risolta, Fase 3 — task Access Control Setup), `index` (conteggio pilastri).

## [2026-07-15] reconcile | th sandbox-exec: entrypoint CLI mancante per il sandboxing remoto

Precisato il pilastro 4: `spawnSandboxed` (in `tools/th/src/runner.ts`) è già esportato ma oggi usato solo internamente da `th run` per lanciare l'agente `pi` — la CLI di `th` (`tools/th/src/cli.ts`: `member`, `hats`, `run`, `wait`, `models`, `history`, `get`) non espone nessun sottocomando per avvolgere un binario arbitrario. Serve costruire `th sandbox-exec -- <bin> <args...>`, wrapper sottile che richiama `spawnSandboxed` e inoltra stdio/exit code — nessun nuovo file da spedire al fisso, perché Rasp e Desktop montano già lo stesso stack `pi`/`th`, manca solo l'entrypoint. Chiarita anche la sequenza completa lato remoto: `scp` dello script (già prevista, perché lo script nasce e viene auditato sul Rasp e non esiste in locale sul fisso) seguito da `ssh ... th sandbox-exec bun run <path>` al posto del `bun run` nudo — due passi ortogonali, uno sposta il file, l'altro decide come viene lanciato. In locale sul Rasp nessun hop CLI: `spawnSandboxed` chiamato direttamente in-process. Aggiunto il sottocomando come task esplicito in Fase 2 della roadmap, prerequisito dello SSH execution wrapper. Aggiornate: `orchestrator_overview` (pilastro 4), `roadmap_orchestrator` (Fase 2).

## [2026-07-15] reconcile | Riuso del bwrap sandbox di th per l'esecuzione dei task

Pilastro 4 (Deterministic TS Execution): l'esecuzione dei task, sia locale (Rasp, `Bun.spawn`) che remota (Desktop, `ssh` + `bun run`), viene incapsulata nel sandbox bwrap già esistente di `th` (`spawnSandboxed`, `tools/th/src/runner.ts`), riusando il profilo di bind reale così com'è (`cwd`, `~/.pi`, `~/.bun`, `/tmp`) — nessun path-esca, nessun isolamento di rete, perché questi task hanno già passato l'audit (`PASS`) e devono scrivere dati veri. Sandbox distinto da quello Docker dell'audit (pilastro 1): Docker testa in modo adversariale prima della coda, bwrap esegue in modo fidato dopo. Funziona senza wrapper aggiuntivi perché Rasp e Desktop montano lo stesso stack `pi`/`th`. Aggiornate: `orchestrator_overview` (pilastro 4), `roadmap_orchestrator` (Fase 2, Local Execution Path e Provisioning Pipeline).

## [2026-07-15] reconcile | Riassunto human-readable per ogni task caricato

Aggiunto al pilastro 1 (Adversarial Audit): la stessa chiamata che produce il verdetto PASS/FAIL/WARNING genera anche un riassunto breve (descrizione + passi numerati) di cosa fa il task, letto dal codice in modo statico — nessuna seconda chiamata LLM. Il riassunto viene mandato su Matrix per ogni task caricato, a prescindere dal verdetto: è solo informativo, non blocca l'esecuzione (resta solo `WARNING` a richiedere approvazione umana). Aggiornate: `orchestrator_overview` (pilastro 1), `roadmap_orchestrator` (Fase 3).

## [2026-07-15] reconcile | Wake-window scheduling e audit graduale per il Raspberry Orchestrator

Semplificato il Boot-Callback Pattern: niente più attesa indefinita (`AWAITING_BOOT`). Il Rasp calcola l'orario di sveglia dal task programmato più vicino, manda un solo WoL con anticipo (~30 min), il Desktop chiama casa al boot, il Rasp dispaccia in batch tutti i task entro la finestra di sveglia. Se la callback non arriva entro la deadline del task: un solo retry del WoL, poi alert Matrix — controllo a soglia singola, non loop di polling. Lo spegnimento è deciso localmente da un servizio idle-timer systemd sul Desktop, non comandato da remoto. Il boot-timeout è stato spostato dalla Fase 4 (hardening) alla Fase 2 (core loop) della roadmap — non è un caso limite, è il primo scenario che si verifica in produzione.

Chiarito l'Adversarial Audit (pilastro 1): l'implementazione attuale è analisi statica (l'agente cloud `pi` legge il codice e ragiona in modo adversariale, nessuna esecuzione). Documentata come evoluzione futura opzionale l'esecuzione dinamica in sandbox Docker effimera (nessuna rete in uscita, filesystem-esca che imita i path di produzione) — da implementare dopo la versione statica, non al suo posto.

Aggiornate: `orchestrator_overview` (pilastri 1 e 3), `roadmap_orchestrator` (Fasi 2, 3, 4).

## [2026-07-02] reconcile | Pulizia bin fantasma e allineamento inventario

Rimossi i tool fantasma `td` (Third Done) e `mvr` (multiversal rules game): sorgenti assenti dal repo, voce `bin` di package.json e symlink `~/.local/bin/{td,mvr}` cancellati, `setup.sh` ripulito. `td` archiviato — sopravvive solo il DB legacy `~/.pi/td.db`; la skill `taiichi` non esiste più. Aggiornate: `architettura` (tabella a 3 layer vivi + nota archiviazione, storage), `agenti` (aggiunti `archimede` e `postino` → 13, allineati a `skills/`), `roadmap` (Phase 2 → Done, Phase 4 → Archived, metriche per-hat spostate a Phase 7, numerazione dettaglio fasi riallineata alla tabella). Le voci storiche su `tw` restano invariate. Fonti nel repo allineate in parallelo (README, roadmap, setup.sh, package.json).

## [2026-06-14] reconcile | Collasso del tool tw nella skill Omero

Il tool `tw` (tools/tw/) è stato cancellato: la wiki è ora gestita interamente dalla skill Omero, che opera diretto su `.wiki/` con Read/Write/Edit/Glob/Grep — niente CLI, niente registry globale. Eliminata la pagina `tw_cli` (documentava codice cancellato). Aggiornate `architettura` (tabella layer, storage, setup, cross-ref), `index`, `roadmap` (Phase 5, nota ‡, todo immediato).

## [2026-06-06] init | Prima creazione wiki

Creata la wiki da zero: pagine architettura, agenti, th_cli, tw_cli, roadmap, log.
Materiale ingestato: README.md, roadmap.md, alfred.md, tools/th/src/cli.ts, tools/th/src/runner.ts, tools/tw/src/cli.ts, tools/tw/src/wiki.ts.
