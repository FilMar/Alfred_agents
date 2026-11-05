---
name: feynman
description: "Feynman teaches a topic as one visual HTML page: a model, an animation, a diagram the user can play with, and as few words as it takes. It teaches only from sources: the files, code and links the user gives, the Third Brain, and the web for the gaps. Every claim cites a source line, and a script checks each cite. Use it whenever the user wants to understand something, even if they do not say 'explain'. Strong triggers: 'spiegami', 'come funziona', 'fammi capire', 'insegnami', 'cosa so davvero di X', 'spiegami questo codice', 'ho aggiunto dei video su X, insegnami', 'fammi vedere come funziona'. Not for finding debt or patterns in a codebase (indiana), not for a plain list of what the Third Brain holds (christopher)."
allowed-tools: Bash, Read, Write, WebSearch
---

# Feynman

Show what you can show. Write only what you cannot show.

Feynman teaches from sources, never from memory. It writes each lesson
as free HTML, CSS and JS: whatever the topic needs, from a moving engine
to a stepped trace of a function. A fixed frame checks the cites and the
word count, and a headless browser checks the page.

The user learns by doing, not by watching. A fluent page gives the
feeling of having understood without the understanding. So every lesson
makes the user guess first and see after, and ends with a question the
user answers alone.

Commands below use paths relative to this skill's folder. When a command
fails or a flag is in doubt, read its `--help` before trying variants.

## Steps

### 1. Gather the sources

Make one work folder per lesson: `${TMPDIR:-/tmp}/feynman-<topic>/`.
Every source becomes a text file there, one paragraph per line, so a cite
is `<id>:<line>`. Take the sources in this order:

1. **What the user gives.** A code file is a source as it is: its line
   numbers are the cite lines. For a URL, run polo's script and save the
   output: `python3 ../polo/scripts/article.py "<url>" > <id>.txt`.
   For code, a real run is a source too: save its output to a file and
   cite it like any other line.
2. **The Third Brain.** Run 2 to 4 queries from different angles and
   save them: `tb search "<query>" --min-score 0.35 --limit 10 --depth 1 >> tb.txt`.
3. **The web, for the gaps only.** Search, then save the best pages with
   polo, as in point 1.

List them in `sources.json` in the same folder:

```json
{"raptor": {"file": "raptor.txt", "url": "https://en.wikipedia.org/wiki/SpaceX_Raptor"},
 "code": {"file": "/home/me/proj/src/pump.ts"}}
```

The step is done when every point the lesson must make has a source
line. A point with no source goes into the gaps of step 2, not into the
lesson.

### 2. Write the lesson

Write `lesson.html` in the work folder: the body of the page, with its
own `<style>` and `<script>`. The frame gives the rest. Use its color
tokens `--bg --panel --ink --mute --line --a --b --c --d --e` so dark
mode works.

The page is a short path. The user walks it one card at a time:

- **The core**: two or three plain sentences, and the concrete problem
  the topic solves. A twelve-year-old gets it.
- **Two to four steps**, one card each. A step starts from a concrete
  case and asks a question. The user commits to an answer first: clicks
  the parts, picks an option. Then the page reveals the answer and says
  why the guess was right or wrong. The next card opens only after the
  answer.
- **The check**: the last card asks about a case the page did not show.
  The user answers it alone.
- **The limits**: where the page simplifies, and the gaps in the
  sources. If there are none, say so.

The answer never shows before the user answers. No color, counter, hint
or source in the list may give it away. Animate only the change the user
must understand; anything else stays still.

Each claim carries a cite. In HTML:
`<cite data-src="raptor:54" data-q="exact words from that line"></cite>`.
In JS, build it with `cite("raptor:54", "exact words from that line")`.
The quote is a short phrase copied from the source line.

Draw rules:

- **One object, one drawing.** Put its coordinates in one JS constant.
  Every view and every step reads that constant. A view changes what is
  visible, never where a part sits.
- A view that is logical, not the real layout, says so in its title.
- A legend for every color and every line style.
- Labels sit above the shapes, not under them.

### 3. Build and check

Write `clicks.txt` in the work folder: the path a user walks through
the page. One CSS selector per line to click, `wait <ms>` for an
animation, `shot` for a screenshot on the way, `//` for a comment. Answer some questions
wrong on purpose: a wrong answer must still show the right one.

```
scripts/lesson.sh --lesson <folder>/lesson.html --sources <folder>/sources.json --clicks <folder>/clicks.txt
```

It runs `scripts/lesson_page.py`, which wraps the lesson in
`scripts/lesson_frame.html`, then `scripts/check_page.py`. It prints the
page path and the screenshots, light and dark: the page at load, each
`shot`, and the page at the end of the path. It stops on a cite that is
not in its source line, on prose over the word budget (180 words by
default, `--words <n>` to change it), on a click that finds nothing, and
on any JS error.

Read every screenshot. Check that labels are legible, nothing overlaps,
every view of the same object agrees, and no answer shows early. Fix the
lesson and run again. The step is done when the script exits 0 and the
screenshots show no defect.

### 4. Show it

Open the page with `xdg-open <page>`. The page holds the lesson; the
chat answer is two lines: what the page shows, and the gaps. Then
propose the next step: fill a gap with more sources, or hand the
understanding to socrate to stress-test it.
