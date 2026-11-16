---
tags: [core, alfred, deploy, deck, filcloud_init, setup]
sources: [conversation, setup.sh, tools/alfred/deploy/alfred.service, filcloud_init:services/alfred/install.sh, filcloud_init:scripts/30_repos.sh]
---

## Decision

`alfred serve` runs on the Deck as a user unit from a filcloud_init module. The unit is a file in this repo, `tools/alfred/deploy/alfred.service`. `services/alfred/install.sh` in filcloud_init links it with `link_unit`, enables it, and restarts it so a new binary is loaded. The unit sets only `ALFRED_DISTILL_TRIGGER=on`: the other code defaults fit the Deck. Those are vault `~/notes`, hist `~/.tl/tl.db`, Qdrant and Ollama on localhost, and port 8791. Since 2026-11-17 `tl` is off and its module is gone: alfred holds the archive, and the backup of `tl.db` and its restore, which now stops alfred, stay as they were.

`setup.sh` installs only the client side, and it takes no role. It clones the repo if it is missing and links identity, skills and extensions. Then it runs `cargo install --git` of `alfred` with the `release-checked` profile into `~/.local/bin`. When it runs from a checkout, it uses that checkout. When it is piped through `curl`, it clones into `~/.local/share/alfred/repo`. The Deck is a client too: `scripts/30_repos.sh` runs `setup.sh` with no argument, as before.

`main` gets the alfred branch only at the switch. Until then, the module skips when the Deck checkout has no unit file.

## Why

**filcloud_init owns the server.** Its contract says that units are files in a repo, installed as symlinks, with `%h` for the home. A `setup.sh server` that wrote its own unit broke that contract. It also broke `30_repos.sh`, which calls `setup.sh` with no argument.

**`cargo install --git` over a build in the checkout.** The binary comes from a commit, not from whatever the working tree holds. A second run changes nothing, because cargo skips a commit it already installed. The Deck runs Debian 13 with rustup, so it builds there.

**Merge at the switch.** The new `setup.sh` runs no `bun install`, and `tl` still runs on bun. A fresh rebuild from `main` would then start without `tl`. One change at the switch leaves no middle state to keep alive.

## Cross-references

- [core_alfred_v2_one_binary_serve_on_the_deck](core_alfred_v2_one_binary_serve_on_the_deck) — why alfred runs on the Deck
- [memory_hist_serves_the_tl_archive_unchanged](memory_hist_serves_the_tl_archive_unchanged) — the same `tl.db` behind both servers
