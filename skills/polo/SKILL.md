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
| studies: what the evidence says | OpenAlex | `scripts/openalex.py "<query>"`; add `--reviews` when the question has many studies; `scripts/openalex.py --doi <doi>` reads a known work |
| data: how much, a trend, a comparison | Our World in Data | `scripts/owid.py search "<query>"`, then `scripts/owid.py data <slug> --countries ITA~FRA --since 2000` |
| news: what happened recently | Google News | `scripts/news.py "<query>" --lang it --days 7` |
| anything else | the general web | search the web; read the best pages as web articles |

For Wikipedia, use `--lang en` by default: it is the most complete. Use `--lang it` for an Italian topic. A claim that matters gets checked in its cited link: read that link as a web article.

For studies, one study is not "the evidence": lead with the reviews. A citation count measures attention, not quality, and a recent study always has few. `openalex.py` needs `OPENALEX_API_KEY`. A search costs about $0.001 of a free $1 a day; a read by `--doi` is free, so use it for a DOI you already have. Read a study through its `free` link as a web article.

For news, each article carries the WP:RSP verdict of its outlet: generally reliable, no consensus, generally unreliable, deprecated, or not rated. WP:RSP rates mostly English-language outlets. The link is a Google News redirect: to read the article, find its title on the outlet's own site. Google News answers 429 to calls in quick succession: wait a minute, then retry once.

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
