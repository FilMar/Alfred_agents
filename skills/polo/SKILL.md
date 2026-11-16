---
name: polo
description: "Polo is the entry point for research and for reading external sources. It routes a question to the source that fits it: Wikipedia for knowledge, studies for scientific evidence, data for numbers and trends, news for recent events, and the general web for the rest. It also extracts readable text from any URL: web articles (title + body, without nav/ads/footer), YouTube transcripts, GitHub files. Use it whenever the user asks to search, research or look something up, or gives a URL to read. Strong triggers: 'fai una ricerca', 'cerca sul web', 'cerca su wikipedia', 'trovami dati su', 'cosa dicono gli studi', 'ultime notizie su', 'leggi questo link', 'cosa dice questo video', 'estrai l'articolo'."
allowed-tools: Bash
---

# Polo

Read `--help` of a script when a flag is in doubt, before you try variants.

## Research

Pick the row that fits the question. A question with two parts takes two rows.

| The question asks for | Source | How |
|---|---|---|
| knowledge: what it is, how it works, its history | Wikipedia | `scripts/wikipedia.py search "<query>"`, then `scripts/wikipedia.py read "<title>"` |
| studies: what the evidence says | OpenAlex | search the web for reviews and meta-analyses first, then single studies; read them as a web article |
| data: how much, a trend, a comparison | Our World in Data | search the web with `site:ourworldindata.org`; read the chart page as a web article |
| news: what happened recently | the news | search the web; name the outlet of each article you use |
| anything else | the general web | search the web; read the best pages as web articles |

For Wikipedia, use `--lang en` by default: it is the most complete. Use `--lang it` for an Italian topic. A claim that matters gets checked in its cited link: read that link as a web article.

Done when every part of the question has an answer with its source URL, or a plain "no source found".

## Read a URL

Look at the URL type and pick the matching step below.

**YouTube** (URL contains `youtube.com` or `youtu.be`): run `scripts/youtube.py`.
```bash
python3 scripts/youtube.py "<URL1>" ["<URL2>" ...]
```
Prints the transcript. Takes more than one URL in a single call. If one video
fails, it reports the error and still prints the transcripts for the others.

**GitHub** (URL contains `github.com`): convert the URL to raw form, then
fetch it with `curl`.
```bash
raw=$(echo "<URL>" | sed -E 's|github\.com/([^/]+)/([^/]+)/blob/|raw.githubusercontent.com/\1/\2/|')
curl -s "$raw"
```

**Web article** (any other URL): run `scripts/article.py`.
```bash
python3 scripts/article.py "<URL>"
```
Prints the article's title and body text, with navigation, ads, and footer
stripped out.

Print the output to stdout without changes. If a step fails, show the error.
Report the failure as it is, with no replacement result.
