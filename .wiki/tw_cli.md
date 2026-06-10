# tw CLI

## Frontmatter

tags: [tw, cli, reference, wiki]
sources: [tools/tw/src/cli.ts, tools/tw/src/wiki.ts, tools/tw/src/registry.ts]
updated: 2026-06-06

## Overview

`tw` (Third Wiki) — local project wiki. Walks the filesystem up from cwd like `git` to find `.wiki/`. Pages are `.md` files with H2 sections. Style pages have the `style_` prefix.

**Note**: `tw` is not yet linked in `setup.sh`. For now run with:
```bash
bun run /path/to/pi/tools/tw/src/cli.ts <command>
```

## init / register / wikis

```bash
tw init [--name <name>]       # creates .wiki/ and registers globally. Default name: directory name.
tw register [--name <name>]   # registers an existing wiki in the global registry
tw wikis                      # list all wikis registered in ~/.pi/tw_registry.json
```

`tw init` creates `index.md` with an empty `## Pages` section.

## page

```bash
tw page list                             # list pages (excludes . prefix)
tw page get <name>                       # reads raw markdown
tw page create <name> [--content <c>]    # creates name.md with ## Overview section
tw page update <name> --section "<S>" --content "<md>"   # updates/adds section
```

**create command**:
- Creates `<name>.md` in the wiki with a `## Overview` section always present
- `--content` optional: content injected into Overview (auto-trimmed)
- Error if page already exists

**Function signature** (wiki.ts):
```ts
createPage(wikiDir: string, name: string, content = ""): void
```

The section is found by exact H2 header (`## <S>`). If not found, it is appended at the bottom. Writing is atomic (write → rename).

## style

```bash
tw style add <name> [--desc "<desc>"]    # creates style page with standard template
tw style list                            # list style entries
tw style get <name>                      # reads style entry
tw style update <name> --section "<S>" --content "<md>"
```

Style pages are named `style_<name>.md` internally. The template includes: Description, How it is written, How to extend, Example, Cross-references.

## search

```bash
tw search "<query>"              # case-insensitive regex in the local wiki
tw search "<query>" --global     # search across all registered wikis
tw search "<query>" --wiki <n>   # search in a specific wiki from the registry
```

Returns: `{wiki, page, line, text}` for each match.

## Page conventions

- Name: `category_subject` (lowercase, underscore, without `.md`)
- Structure: H2 sections (`## Section Name`)
- First section: `## Frontmatter` with tags, sources, updated
- Last section: `## Cross-references`
- Internal links: `[Text](page_name)` — without extension
- Special pages: `index` (catalogue with `## Pages`), `log` (history with `## Log`)
- Style pages: `style_` prefix — managed via `tw style`

## Cross-references

- [architettura](architettura) — where `.wiki/` lives and the registry
- [agenti](agenti) — omero manages this wiki
