import { searchNotes } from "../../../tb/src/notes.ts";
import { searchEntries } from "../../../ti/src/identity.ts";
import type { Retrieval } from "./types.ts";

/** Query tb and ti with the raw user text. Caller degrades a rejection to empty. */
export async function retrieve(query: string): Promise<Retrieval> {
  const [tb, ti] = await Promise.all([searchNotes(query), searchEntries(query, {})]);
  return {
    tb: tb.map((r) => r.note.what),
    ti: ti.map((e) => `${e.if} -> ${e.do.join("; ")}`),
  };
}
