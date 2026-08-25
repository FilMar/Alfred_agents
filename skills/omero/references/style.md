# Omero — Style

Document patterns, conventions and code structure. Style pages record how the code writes things and how to extend it. Style pages are named `style_<name>.md`.

1. When a significant pattern or non-obvious convention emerges, create `.wiki/style_<name>.md` from `templates/style.md`.
2. Fill the sections:
   - **How it is written** — explain the pattern with context (why that choice).
   - **How to extend** — concrete steps for adding new similar cases.
   - **Example** — representative code snippet.
3. List existing style pages with `Glob .wiki/style_*.md`; `Read` to inspect.

Update style pages when the code evolves and the pattern changes — `Edit` the affected section. An outdated style page is worse than no style page.

## English style

Follow the English style in `GLOSSARY.md`.
