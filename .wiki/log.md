## [2026-07-14] ingest | orchestrator_overview
## [2026-07-14] ingest | roadmap_orchestrator
# Log

## Frontmatter

tags: [log, storico]
sources: []
updated: 2026-07-02

## Log

## [2026-07-02] reconcile | Pulizia bin fantasma e allineamento inventario

Rimossi i tool fantasma `td` (Third Done) e `mvr` (multiversal rules game): sorgenti assenti dal repo, voce `bin` di package.json e symlink `~/.local/bin/{td,mvr}` cancellati, `setup.sh` ripulito. `td` archiviato — sopravvive solo il DB legacy `~/.pi/td.db`; la skill `taiichi` non esiste più. Aggiornate: `architettura` (tabella a 3 layer vivi + nota archiviazione, storage), `agenti` (aggiunti `archimede` e `postino` → 13, allineati a `skills/`), `roadmap` (Phase 2 → Done, Phase 4 → Archived, metriche per-hat spostate a Phase 7, numerazione dettaglio fasi riallineata alla tabella). Le voci storiche su `tw` restano invariate. Fonti nel repo allineate in parallelo (README, roadmap, setup.sh, package.json).

## [2026-06-14] reconcile | Collasso del tool tw nella skill Omero

Il tool `tw` (tools/tw/) è stato cancellato: la wiki è ora gestita interamente dalla skill Omero, che opera diretto su `.wiki/` con Read/Write/Edit/Glob/Grep — niente CLI, niente registry globale. Eliminata la pagina `tw_cli` (documentava codice cancellato). Aggiornate `architettura` (tabella layer, storage, setup, cross-ref), `index`, `roadmap` (Phase 5, nota ‡, todo immediato).

## [2026-06-06] init | Prima creazione wiki

Creata la wiki da zero: pagine architettura, agenti, th_cli, tw_cli, roadmap, log.
Materiale ingestato: README.md, roadmap.md, alfred.md, tools/th/src/cli.ts, tools/th/src/runner.ts, tools/tw/src/cli.ts, tools/tw/src/wiki.ts.
