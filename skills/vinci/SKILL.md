---
name: vinci
description: >-
  Generates a Curriculum Vitae in Typst from a free-form conversation or from
  an existing CV/text the user provides. Produces a .typ file ready to
  compile, with a choice of three style variants (classic, modern, academic).
  ALWAYS use this skill when the user wants to create, write, redo, or
  convert a curriculum, a CV, or a résumé in Typst — even if they don't
  explicitly say "Typst", as long as they ask for a CV in that context, or
  ask to turn their experience into a typeset resume. Also trigger it for
  "fammi il CV", "curriculum in typst", "rifammi il résumé", "converti
  questo profilo LinkedIn in CV" (Italian phrasings the user may use).
allowed-tools: Bash, Read, Write, Edit
---

# Vinci — Curriculum Vitae in Typst

This task writes a one-page portrait of a person. It is meant to last, like
Vasari's *Lives*.

The job here is to collect the person's content and pour it into one of the
three self-contained Typst templates in `assets/`, delivering a `.typ` file
that compiles right away, anywhere, with no external dependencies.

## Workflow

### 1. Collect the content
Start from whatever the user gives you: an existing CV, a pasted LinkedIn
profile, free text, or nothing at all. Extract as much as you can from it —
don't make the user repeat what they already wrote.

Then ask **only for the essential gaps**, in one targeted round. The minimum
core of a CV:
- name and professional title/role
- contacts (email, phone, city; optional: website, GitHub, LinkedIn, ORCID)
- one profile/summary line
- experience (role, organization, period, 1-3 concrete results per entry)
- education (degree, institution, period)
- skills and languages

Don't turn this into an interrogation. If minor details are missing, propose
a reasonable version. Tell the user what you assumed, so they can correct
it. Results matter more than duties: prefer "cut latency by 40%" over
"responsible for maintenance".

### 2. Choose the variant
Three styles in `assets/`, all already compiling with sample data:

| variant | when | look |
|---|---|---|
| `moderno.typ` | tech, startup, product, design | sans, blue accent, compact, easy to scan |
| `classico.typ` | traditional roles, consulting, conservative sectors | plain serif, centered header, no color |
| `accademico.typ` | research, PhD, academic positions | dense serif, Publications/Teaching sections, page numbers |

Suggest the variant that fits the person's context, but let the user choose.
If they have no preference, use the sensible default for their field.

### 3. Fill in the template
Open the chosen variant's file. It's split into two blocks marked by comments:

- `// ---------- DATI ----------` — **edit only this.** Replace the sample
  data with the person's real data, keeping the same structure (dictionaries,
  arrays, field names).
- `// ---------- LAYOUT ----------` — **don't touch it** unless explicitly
  asked (e.g. a font or accent color change). This is what keeps the file
  compiling and consistent.

Copy the template into the user's working directory under a sensible name
(e.g. `cv_mario_rossi.typ`) and rewrite the DATI block. Never leave leftover
sample data.

### 4. Check that it compiles

If `typst` is available, **always compile** before handing it over. Run this
in the user's working directory, where the `.typ` file lives:

```bash
typst compile cv_mario_rossi.typ
```

If it errors, read the error and fix the `.typ` — a CV that doesn't compile
is useless. If `typst` isn't installed, review the syntax carefully using the
rules below and tell the user, suggesting how to install it
(`https://typst.app` or the binary from GitHub `typst/typst`).

### 5. Hand it over

Give the user the `.typ` path and the command to compile it:

```bash
typst compile cv_mario_rossi.typ
```

This produces the PDF next to the source file. For a live preview that
recompiles on every save, use `typst watch cv_mario_rossi.typ` instead.
Remind them that all the data lives in the DATI block, so they can tweak it
themselves.

## Typst syntax rules (so you don't break the file when editing DATI)

These are the traps that break compilation. Follow them, or the `.typ` file
will fail to compile.

- **Data goes in strings** (`"..."`), not in markup. Inside a string, the
  characters `#`, `@`, `*`, `_`, `<`, `$` are literal and harmless. Keep the
  person's content inside the DATI block's strings and you won't get
  surprises.
- **Quotes inside strings** need a backslash: `"the thesis «X»"` is fine
  (curly quotes are no problem), but `"he said "hi""` is not — use
  `"he said \"hi\""`.
- **Single-element arrays** need a trailing comma: `("Go",)` not `("Go")`.
  This applies to `punti:` with only one entry.
- **Every array/dictionary entry** ends with a comma. It's best to add one
  to the last entry too: it's allowed, and it prevents errors when you add
  more lines later.
- **To remove a section** (e.g. the person has no publications), delete both
  its data block and its `#sezione(...)` call along with the matching
  `#for`. Never leave a `#for` looping over an array that no longer exists.
- **To add an entry**, copy an existing array element and change its
  fields, keeping the field names identical (`ruolo`, `ente`, `periodo`, ...).
- **Accents and symbols** (à, è, €, «») are UTF-8 and work natively.
- **Fonts**: the templates use `DejaVu Sans` (modern) and `Libertinus Serif`
  (classic/academic) because they're available everywhere. To change them,
  edit only `font:` in `#set text(...)` in the LAYOUT block. If a font isn't
  found, Typst falls back to another one and still compiles (with a harmless
  warning).

## Going beyond the templates

The three styles may not cover everything (a photo, a sidebar with a
timeline, a QR code, a projects/certifications section). In that case, add
the new section, but stay **within the template's conventions**: define the
data as an array of dictionaries in the DATI block, and add a
`#sezione("...")` with a `#for` in the LAYOUT block. Follow the same pattern
as the existing sections. Compile to check after every addition.
