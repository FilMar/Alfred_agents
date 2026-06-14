# Log

## Frontmatter

tags: [log, storico]
sources: []
updated: 2026-06-14

## Log

## [2026-06-14] reconcile | Collasso del tool tw nella skill Omero

Il tool `tw` (tools/tw/) è stato cancellato: la wiki è ora gestita interamente dalla skill Omero, che opera diretto su `.wiki/` con Read/Write/Edit/Glob/Grep — niente CLI, niente registry globale. Eliminata la pagina `tw_cli` (documentava codice cancellato). Aggiornate `architettura` (tabella layer, storage, setup, cross-ref), `index`, `roadmap` (Phase 5, nota ‡, todo immediato).

## [2026-06-06] init | Prima creazione wiki

Creata la wiki da zero: pagine architettura, agenti, th_cli, tw_cli, roadmap, log.
Materiale ingestato: README.md, roadmap.md, alfred.md, tools/th/src/cli.ts, tools/th/src/runner.ts, tools/tw/src/cli.ts, tools/tw/src/wiki.ts.
