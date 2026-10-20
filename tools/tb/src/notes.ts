import { embedDocument, embedQuery, EMBED_MODEL } from "./infra.js";
import { ensureCollection, upsert, setPayload, setPayloadMany, deletePayloadKeys, getByIds, search, scroll, scrollLinkedTo, scrollAllIds, deletePoints, randomNoteId, noteId, listTags, NOTE_ID_SHAPE } from "./qdrant.js";
import type { ScrollOptions, TagFacet } from "./qdrant.js";
import { REFS_LIMIT } from "./infra.js";
import { assert } from "../../common/contract.js";
import { mergePlan } from "./merge.js";
import { noteToText, withoutLink, nextHit, nextRelatedHit, matchPrefix, groupByPayload, validateSearchOptions, ABOUT_NOBODY } from "./types.js";
import type { Note, NoteType, Link, SearchOptions, SearchResult, DirectResult, RelatedResult, PayloadWrite } from "./types.js";

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
  exchange?: string;
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
    ...(params.exchange && { exchange: params.exchange }),
    refs: [],
    embed_model: EMBED_MODEL,
    about: ABOUT_NOBODY,
    updated_at: when,
  };

  const vector = await embedDocument(noteToText(note));
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

export async function markArchived(ids: string[], at: Date): Promise<void> {
  await ensureCollection();
  await setPayloadMany(ids, { archived_at: at.toISOString() });
}

export async function clearArchived(ids: string[]): Promise<void> {
  await ensureCollection();
  await deletePayloadKeys(ids, ["archived_at"]);
}

export async function searchNotes(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  const invalid = validateSearchOptions(options);
  if (invalid) throw new Error(invalid);

  await ensureCollection();
  const vector = await embedQuery(query);
  const results = await search(vector, { ...options, query_text: query });
  if (options.record_hits !== false) await recordHits(results);
  return results;
}

/**
 * Counts one hit on every result, direct and related in separate fields.
 * A failed write never fails the search.
 */
async function recordHits(results: SearchResult[]): Promise<void> {
  const now = new Date().toISOString();
  const writes = [
    ...directHitWrites(results.filter(isDirect), now),
    ...relatedHitWrites(results.filter(isRelated), now),
  ];

  const settled = await Promise.allSettled(
    groupByPayload(writes).map((group) => setPayloadMany(group.ids, group.payload)),
  );
  const failed = settled.filter((s) => s.status === "rejected").length;
  if (failed > 0) process.stderr.write(`Warning: ${failed} hit counter update(s) failed.\n`);
}

function directHitWrites(direct: DirectResult[], now: string): PayloadWrite[] {
  return direct.map((r) => {
    const hit = nextHit(r.note, now);
    Object.assign(r.note, hit);
    return { id: r.note.id, payload: hit };
  });
}

function relatedHitWrites(related: RelatedResult[], now: string): PayloadWrite[] {
  return related.map((r) => {
    const hit = nextRelatedHit(r.note, now);
    Object.assign(r.note, hit);
    return { id: r.note.id, payload: hit };
  });
}

function isDirect(result: SearchResult): result is DirectResult {
  return result.via === "search";
}

function isRelated(result: SearchResult): result is RelatedResult {
  return result.via === "related";
}

// ─── Id resolution ────────────────────────────────────────────────────────────

const ID_CANDIDATES_SHOWN = 5;

/** Resolves a full id, or the one id that starts with `prefix`. */
export async function resolveNoteId(idOrPrefix: string): Promise<string> {
  if (NOTE_ID_SHAPE.test(idOrPrefix)) return idOrPrefix;

  const matches = matchPrefix(idOrPrefix, await scrollAllIds());
  if (matches.length === 0) throw new Error(`No note id starts with "${idOrPrefix}"`);
  if (matches.length > 1) {
    const shown = matches.slice(0, ID_CANDIDATES_SHOWN).join(", ");
    throw new Error(`Ambiguous id "${idOrPrefix}": ${matches.length} notes match (${shown})`);
  }

  assert(NOTE_ID_SHAPE.test(matches[0]), "resolveNoteId: a resolved id is a full id");
  return matches[0];
}

/** Returns the whole note for a full id or the one prefix that matches it. */
export async function noteById(idOrPrefix: string): Promise<Note> {
  assert(idOrPrefix.trim().length > 0, "noteById: the id is not blank");
  const id = await resolveNoteId(idOrPrefix);
  const found = await getByIds([id]);
  if (found.length === 0) throw new Error(`Note not found: ${id}`);
  assert(found[0].id === id, "noteById: the note found carries the id asked");
  return found[0];
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

export interface MergeSummary {
  into: string;
  dropped: readonly string[];
  /** Notes whose links moved from a dropped note to `into`. */
  relinked: number;
}

/** Moves the links and counters of the drops onto `into`, then deletes the drops. */
export async function mergeNotes(intoId: string, dropIds: string[]): Promise<MergeSummary> {
  const found = await getByIds([intoId, ...dropIds]);
  const byId = new Map(found.map((note) => [note.id, note]));
  const missing = [intoId, ...dropIds].find((id) => !byId.has(id));
  if (missing) throw new Error(`Note not found: ${missing}`);

  const linked = (await Promise.all(dropIds.map(scrollLinkedTo))).flat();
  const drops = dropIds.map((id) => byId.get(id)!);
  const outcome = mergePlan(byId.get(intoId)!, drops, linked, new Date(), REFS_LIMIT);
  if (!outcome.ok) throw new Error(outcome.error);

  const { into, relinked, dropped } = outcome.plan;
  for (const relink of relinked) {
    await setPayload(relink.id, { refs: relink.refs, backrefs: relink.backrefs });
  }
  const { hits, hits_related, last_hit, last_hit_related, archived_at } = into;
  await setPayload(into.id, { refs: into.refs, backrefs: into.backrefs, tags: into.tags, hits, hits_related, last_hit, last_hit_related, archived_at, updated_at: into.updated_at });
  if (archived_at === undefined) await deletePayloadKeys([into.id], ["archived_at"]);
  await deletePoints([...dropped]);

  return { into: into.id, dropped, relinked: relinked.length };
}

export async function browseNotes(options: ScrollOptions = {}): Promise<Note[]> {
  await ensureCollection();
  return scroll(options);
}

export async function listNoteTags(): Promise<TagFacet[]> {
  await ensureCollection();
  return listTags();
}
