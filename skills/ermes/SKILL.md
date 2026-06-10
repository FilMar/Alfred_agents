---
name: ermes
description: "Ermes extracts readable text from any external source: web articles (title + body, without nav/ads/footer) and YouTube videos (transcript). Use it whenever the user provides a URL and wants to read or process its content. Trigger = any external URL, requests like 'extract the article', 'read this link', 'what does this video say', 'get the text of this page', 'transcribe this video'."
---

## Task

Determine the URL type and use the correct script.

**YouTube** (URL contains `youtube.com` or `youtu.be`):
```bash
python3 /home/filippo/git_projects/pi/skills/ermes/scripts/youtube.py "<URL1>" "<URL2>" ...
```
Supports multiple URLs in a single call. If a video fails, the script reports the error and continues with the others.

**GitHub** (URL contains `github.com`):
Convert the URL to raw before downloading:
- `https://github.com/<user>/<repo>/blob/<branch>/<path>` → `https://raw.githubusercontent.com/<user>/<repo>/<branch>/<path>`
```bash
curl -s "<RAW_URL>"
```

**Web article** (any other URL):
```bash
python3 /home/filippo/git_projects/pi/skills/ermes/scripts/article.py "<URL>"
```

Print the output to stdout without modifications. If the script fails, show the error without inventing alternatives.
