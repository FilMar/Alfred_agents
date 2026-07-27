---
name: courier
description: "Courier extracts readable text from any external source: web articles (title + body, without nav/ads/footer) and YouTube videos (transcript). Use it whenever the user provides a URL and wants to read or process its content. Trigger = any external URL, requests like 'extract the article', 'read this link', 'what does this video say', 'get the text of this page', 'transcribe this video'."
compatibility: Requires this skill's justfile and the underlying Python scripts available.
allowed-tools: Bash
---

## Task

Determine the URL type and use the correct recipe. All recipes are in this skill's justfile.

**YouTube** (URL contains `youtube.com` or `youtu.be`):
```bash
just youtube "<URL1>" ["<URL2>" ...]
```
Supports multiple URLs in a single call. If a video fails, the script reports the error and continues with the others.

**GitHub** (URL contains `github.com`):
```bash
just raw-github "<URL>"
```
The recipe converts `github.com/.../blob/...` to `raw.githubusercontent.com` automatically.

**Web article** (any other URL):
```bash
just article "<URL>"
```

Print the output to stdout without modifications. If the recipe fails, show the error without inventing alternatives.
