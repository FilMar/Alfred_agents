---
name: kara
description: "Kara reads and writes the user's Karakeep bookmark server through the official karakeep CLI. It saves links and notes, searches and reads bookmarks, and sorts a batch of links into a list with tags. Use it whenever the user wants to save, bookmark, keep, file, tag, find or organise links, even if they do not say 'karakeep'. Strong triggers: 'salva questo link', 'mettilo su karakeep', 'aggiungi ai bookmark', 'organizza questi link', 'fammi una lista con questi link', 'cerca nei bookmark', 'cosa avevo salvato su X'. To only read the text of a URL, use polo instead."
allowed-tools: Bash
---

# Kara

Kara drives Karakeep with the `karakeep` CLI. The server is
`http://100.89.232.55:3000`.

## Steps

1. **Check the connection.**
   ```
   karakeep whoami
   ```
   Done when it prints the user. If it fails with an auth or server error,
   stop and ask the user to run this, then retry:
   ```
   ! karakeep --server-addr http://100.89.232.55:3000 auth init
   ```
   If `karakeep` is missing, install it with `bun add -g @karakeep/cli`.
2. **Load the command reference.**
   ```
   karakeep skill
   ```
   It prints the official skill bundled with the installed CLI: commands,
   flags and the search query language. Follow it for syntax. When a flag
   is in doubt, read `karakeep <command> --help` before trying variants.
3. **Do the task.** Pass `--json` before the command when you need to read
   the result, for example `karakeep --json lists list`.
   - Save or search: use the matching command from step 2.
   - Organise a batch of links: follow "Organise links into a list" below.
4. **Report** what changed: bookmark titles, tags, and list name.

## Organise links into a list

1. Run `karakeep --json tags list` and `karakeep --json lists list`. Reuse
   an existing tag or list when its name fits. Create a new one only when
   none fits.
2. Pick tags for each link. Base them on the URL and the user's words. If
   that is not enough, read the page with polo. Keep few tags: two or
   three per link, shared across the batch where possible.
3. Show the plan to the user: the list name and the tags for each link.
   Wait for an ok.
4. Create the list if it is new. The icon is required and takes one emoji:
   `karakeep lists create --name "<name>" --icon "📚"`.
5. Group the links by their tag set. Save each group with one call:
   ```
   karakeep bookmarks add --link <url1> --link <url2> --tag-name <t1> --tag-name <t2> --list-id <list-id>
   ```
   Done when every link from the user's batch is in the list.

When the order matters (a course, a series), Karakeep has no manual
order: it sorts a list by creation date. Save one link per call, in
order, and start each `--title` with a zero-padded code that sorts in
that order, for example `0406 <title>` for part 4.6.

## Deletion

The user deletes things in Karakeep by hand. Skip every `delete`, `wipe`
and `remove-bookmark` command. If a task needs one, tell the user what to
remove and let them do it in the web UI.
