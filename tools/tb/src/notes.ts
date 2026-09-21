import { embed } from "./infra.js";
import { ensureCollection, upsert, setPayload, getByIds, search, scroll, scrollLinkedTo, deletePoints, randomNoteId, noteId, listTags } from "./qdrant.js";
import type { ScrollOptions, TagFacet } from "./qdrant.js";
import { REFS_LIMIT } from "./infra.js";
import { noteToText, withoutLink, nextHit } from "./types.js";
import type { Note, NoteType, Link, SearchOptions, SearchResult } from "./types.js";

// ─── Serendipity ──────────────────────────────────────────────────────────────

export async function randomNote(): Promise<Note | null> {
  const id = await randomNoteId();
  if (!id) return null;
  const found = await getByIds([id]);
  return found.length > 0 ? found[0] : null;
}

// ─── Backref (graph invariant) ──────────────────────────────────────────────

async function appendBackref(targetId: string, sourceId: string): Promise<void> {
  const found = await getByIds([targetId]);
  if (found.length === 0) return;

  const existing = found[0].backrefs ?? [];
  if (existing.includes(sourceId)) return;

  await setPayload(targetId, { backrefs: [...existing, sourceId] });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface CreateNoteParams {
  what: string;
  why: string;
  kind?: NoteType;
  tags?: string[];
  source?: string;
}

export async function createNote(params: CreateNoteParams): Promise<Note> {
  await ensureCollection();

  const when = new Date().toISOString();
  const id = noteId(params.what, when);

  const note: Note = {
    id,
    when,
    why: params.why,
    what: params.what,
    tags: params.tags ?? [],
    kind: params.kind ?? "dato",
    ...(params.source && { source: params.source }),
    refs: [],
  };

  const vector = await embed(noteToText(note));
  await upsert(note, vector);

  return note;
}

export async function addRefs(id: string, newRefs: Link[]): Promise<Note> {
  const found = await getByIds([id]);
  if (found.length === 0) throw new Error(`Note not found: ${id}`);

  const current = found[0];
  const new_ids = [...new Set(newRefs.map(nr => nr.id))];
  const notes = await getByIds(new_ids);
  if (new_ids.length != notes.length) {
    // If there is a mismatch, find which ID is missing to give a precise error message
    const foundIds = new Set(notes.map(r => r.id));
    const missingId = new_ids.find(id => !foundIds.has(id));
    throw new Error(`Linked note ${missingId} not found for note ${id}`);
  }
  const merged = [...current.refs, ...newRefs];

  if (merged.length > REFS_LIMIT) {
    throw new Error(
      `Refs limit reached (${merged.length}/${REFS_LIMIT}). ` +
      `Consolidate related notes into a Hub (kind: "indice") and then add the Hub as a ref.`,
    );
  }
  await setPayload(id, { refs: merged });

  for (const ref of newRefs) {
    await appendBackref(ref.id, id);
  }
  return { ...current, refs: merged };
}

export async function changeKind(id: string, kind: NoteType): Promise<void> {
  const found = await getByIds([id]);
  if (found.length === 0) throw new Error(`Note not found: ${id}`);
  await setPayload(id, { kind });
}

export async function changeTags(id: string, tags: string[]): Promise<void> {
  const found = await getByIds([id]);
  if (found.length === 0) throw new Error(`Note not found: ${id}`);
  await setPayload(id, { tags });
}

export async function searchNotes(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  await ensureCollection();
  const vector = await embed(query);
  const results = await search(vector, { ...options, query_text: query });
  if (options.record_hits !== false) await recordHits(results);
  return results;
}

/** Counts one hit on every direct search result. A failed write never fails the search. */
async function recordHits(results: SearchResult[]): Promise<void> {
  const now = new Date().toISOString();
  const direct = results.filter((r) => r.via === "search");
  const writes = direct.map((r) => {
    const hit = nextHit(r.note, now);
    Object.assign(r.note, hit);
    return setPayload(r.note.id, hit);
  });
  const settled = await Promise.allSettled(writes);
  const failed = settled.filter((s) => s.status === "rejected").length;
  if (failed > 0) process.stderr.write(`Warning: ${failed} hit counter update(s) failed.\n`);
}

export interface DeleteSummary {
  id: string;
  deleted: true;
  /** Notes that lost a ref or a backref to the deleted note. */
  unlinked: number;
}

/** Deletes a note and removes every ref and backref pointing to it. */
export async function deleteNote(id: string): Promise<DeleteSummary> {
  const found = await getByIds([id]);
  if (found.length === 0) throw new Error(`Note not found: ${id}`);

  const linked = await scrollLinkedTo(id);
  for (const note of linked) {
    const cleaned = withoutLink(note, id);
    await setPayload(note.id, { refs: cleaned.refs, backrefs: cleaned.backrefs ?? [] });
  }

  await deletePoints([id]);
  return { id, deleted: true, unlinked: linked.length };
}

export async function browseNotes(options: ScrollOptions = {}): Promise<Note[]> {
  await ensureCollection();
  return scroll(options);
}

export async function listNoteTags(): Promise<TagFacet[]> {
  await ensureCollection();
  return listTags();
}
