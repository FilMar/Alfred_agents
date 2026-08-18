---
name: polo
description: "Polo extracts readable text from any external source: web articles (title + body, without nav/ads/footer) and YouTube videos (transcript). Use it whenever the user provides a URL and wants to read or process its content. Trigger = any external URL, requests like 'extract the article', 'read this link', 'what does this video say', 'get the text of this page', 'transcribe this video'."
allowed-tools: Bash
---

## Task

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
Do not invent a replacement result.
