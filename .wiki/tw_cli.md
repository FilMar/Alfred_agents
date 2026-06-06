# tw CLI

## Frontmatter

tags: [tw, cli, riferimento, wiki]
sources: [tools/tw/src/cli.ts, tools/tw/src/wiki.ts, tools/tw/src/registry.ts]
updated: 2026-06-06

## Panoramica

`tw` (Third Wiki) — wiki locale di progetto. Risale il filesystem dal cwd come `git` per trovare `.wiki/`. Le pagine sono file `.md` con sezioni H2. Le style page hanno prefisso `style_`.

**Nota**: `tw` non è ancora linkato in `setup.sh`. Per ora eseguire con:
```bash
bun run /path/to/pi/tools/tw/src/cli.ts <comando>
```

## init / register / wikis

```bash
tw init [--name <nome>]   # crea .wiki/ e registra globalmente. Default name: nome directory.
tw register [--name <nome>]   # registra una wiki già esistente nel registro globale
tw wikis   # lista tutte le wiki registrate in ~/.pi/tw_registry.json
```

`tw init` crea `index.md` con sezione `## Pagine` vuota.

## page

```bash
tw page list                             # lista pagine (esclude prefix .)
tw page get <nome>                       # legge raw markdown
tw page create <name> [--content <c>]    # crea name.md con sezione ## Panoramica
tw page update <nome> --section "<S>" --content "<md>"   # aggiorna/aggiunge sezione
```

**Comando create**:
- Crea `<name>.md` nella wiki con sezione `## Panoramica` sempre presente
- `--content` opzionale: contenuto iniettato nella Panoramica (trim automatico)
- Errore se la pagina esiste già

**Firma funzione** (wiki.ts):
```ts
createPage(wikiDir: string, name: string, content = ""): void
```

La sezione viene cercata per header H2 esatto (`## <S>`). Se non trovata, viene aggiunta in fondo. La scrittura è atomica (write → rename).

## style

```bash
tw style add <nome> [--desc "<desc>"]    # crea style page con template standard
tw style list                            # lista entry di stile
tw style get <nome>                      # legge entry di stile
tw style update <nome> --section "<S>" --content "<md>"
```

Le style page hanno nome `style_<nome>.md` internamente. Il template include: Descrizione, Come è scritto, Come estendere, Esempio, Riferimenti incrociati.

## search

```bash
tw search "<query>"              # regex case-insensitive nella wiki locale
tw search "<query>" --global     # cerca in tutte le wiki registrate
tw search "<query>" --wiki <n>   # cerca in una wiki specifica del registro
```

Ritorna: `{wiki, page, line, text}` per ogni match.

## Convenzioni pagine

- Nome: `categoria_soggetto` (minuscole, underscore, senza `.md`)
- Struttura: sezioni H2 (`## Nome Sezione`)
- Prima sezione: `## Frontmatter` con tags, sources, updated
- Ultima sezione: `## Riferimenti incrociati`
- Link interni: `[Testo](nome_pagina)` — senza estensione
- Pagine speciali: `index` (catalogo con `## Pagine`), `log` (storico con `## Log`)
- Pagine stile: prefisso `style_` — gestite via `tw style`

## Riferimenti incrociati

- [architettura](architettura) — dove vive `.wiki/` e il registro
- [agenti](agenti) — omero gestisce questa wiki
