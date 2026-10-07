// One-off: replace the text of a note with its translation, same id.
// A ref points by id, so rewriting the text in place keeps every edge. The English
// original stays in the translation file, under git, not in the note.
import { readFileSync } from "node:fs";
import { embedDocument } from "../tools/tb/src/infra.js";
import { getByIds, upsert } from "../tools/tb/src/qdrant.js";
import { noteToText } from "../tools/tb/src/types.js";
import type { Note } from "../tools/tb/src/types.js";

interface Row {
  id: string;
  why: string;
  what: string;
}

function translated(note: Note, row: Row, now: string): Note {
  return {
    ...note,
    why: row.why,
    what: row.what,
    updated_at: now,
  };
}

const path = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "data/translations_it.json";
const rows: Row[] = JSON.parse(readFileSync(path, "utf8")).rows;
const apply = process.argv.includes("--apply");
const now = new Date().toISOString();

let done = 0;
for (const row of rows) {
  const found = await getByIds([row.id]);
  if (found.length === 0) throw new Error(`note not found: ${row.id}`);
  const before = found[0];
  if (before.what === row.what) {
    console.log(`  already done  ${row.id}`);
    continue;
  }
  const after = translated(before, row, now);
  if (!apply) {
    console.log(`  would rewrite ${row.id}  ${before.what.slice(0, 44)} -> ${after.what.slice(0, 44)}`);
    continue;
  }
  const vector = await embedDocument(noteToText(after));
  await upsert(after, vector);
  const check = await getByIds([row.id]);
  if (check[0].what !== row.what) throw new Error(`write did not stick: ${row.id}`);
  if (check[0].refs.length !== before.refs.length) throw new Error(`refs lost: ${row.id}`);
  done++;
  console.log(`  ${done}/${rows.length}  ${row.id}  refs ${check[0].refs.length}  backrefs ${(check[0].backrefs ?? []).length}`);
}
console.log(apply ? `rewritten ${done} notes` : "dry run: nothing written. Pass --apply.");
