// ─── Contract ─────────────────────────────────────────────────────────────────

/** A broken contract is a bug in tb, never bad input. Its own type keeps the two apart. */
export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

export function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new ContractError(msg);
}

// ─── Enum constants ─────────────────────────────────────────────────────

export const NOTE_TYPES = [
  "dato",
  "protocollo",
  "sintesi",
  "attrito",
  "configurazione",
  "indice",
] as const;

// ─── Derived types ────────────────────────────────────────────────────────────

export const NOTE_STATUSES = ["provvisoria", "promossa"] as const;

export type NoteType = (typeof NOTE_TYPES)[number];

export type NoteStatus = (typeof NOTE_STATUSES)[number];

/** Subject a note describes. `mondo` means it describes no one in particular. */
export const ABOUT_NOBODY = "mondo";

/**
 * Semantic kind of a note — immutable after creation.
 * - dato: raw fact, constant, technical parameter
 * - protocollo: instructions, routines, "if A then B" procedures
 * - sintesi: creative bridges, insights, non-obvious conclusions
 * - attrito: bugs, errors, tensions, frictions
 * - configurazione: taken decisions, setup, preferences
 * - indice: mother notes that condense dense clusters
 */

/** Returns true for source-backed, citable kinds. */
export function isEvidence(kind: NoteType): boolean {
  return kind === "dato";
}

/** Type guard: validates an arbitrary kind against the NOTE_TYPES enum. */
export function isValidKind(kind: string): kind is NoteType {
  return (NOTE_TYPES as readonly string[]).includes(kind);
}

/** Normalizes a tag list: split on commas, trim, drop empties. */
export function normalizeTags(tags: string[]): string[] {
  return tags.flatMap((t) => t.split(",").map((s) => s.trim())).filter(Boolean);
}

/** Extracts a readable message from an unknown error type. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Canonical text to embed for a note: context + content. */
export function noteToText(note: Pick<Note, "why" | "what">): string {
  return `${note.why}\n\n${note.what}`;
}

// ─── Link ─────────────────────────────────────────────────────────────────────

export interface Link {
  /** ID of the linked note */
  id: string;
  /** Explicit reason for the link */
  reason: string;
  /** Who drew the edge: `umano`, or the name of what proposed it */
  origin?: string;
}

// ─── Note ────────────────────────────────────────────────────────────────────

export interface Note {
  /** SHA256(what + ":" + when) formatted as UUID — deterministic, immutable */
  id: string;
  /** ISO 8601 — creation timestamp, immutable */
  when: string;
  /** Context: why this note was born — immutable */
  why: string;
  /** Content: the atomic idea — immutable */
  what: string;
  /** Tags for filtering */
  tags: string[];
  /** Semantic kind — immutable after creation. */
  kind: NoteType;
  /** URI of the original source — optional */
  source?: string;
  /** Id of the tl exchange this note was distilled from — optional */
  exchange?: string;
  /** Connection network — mutable, append-only, capped by REFS_LIMIT */
  refs: Link[];
  /** IDs of notes referencing this one — managed automatically, append-only */
  backrefs?: string[];
  /** Times this note was a direct search hit — managed automatically */
  hits?: number;
  /** ISO 8601 — last time this note was a direct search hit */
  last_hit?: string;
  /** Times this note was reached through a ref or a backref — managed automatically */
  hits_related?: number;
  /** ISO 8601 — last time this note was reached through a ref or a backref */
  last_hit_related?: string;
  /** Model that produced the dense vector — a vector is only comparable within one model */
  embed_model?: string;
  /** `promossa` passed a human, `provvisoria` was proposed and not yet read */
  status?: NoteStatus;
  /** Subject of the note: an entity name, or `mondo` */
  about?: string;
  /** ISO 8601 — last change to any mutable field */
  updated_at?: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchOptions {
  /** Filter by tags (OR). */
  tags?: string[];
  /** Filter by semantic kind (OR). */
  kind?: NoteType[];
  /** Max results from the vector search. Default: 10. */
  limit?: number;
  /**
   * Depth of edge traversal, through refs and backrefs alike.
   * 0 = vector search only.
   * 1 = vector + 1 hop (default).
   * 2 = vector + 1 hop + the hop after it.
   */
  depth?: number;
  /** If true, restricts the search to evidence kinds only (see isEvidence). */
  evidence_only?: boolean;
  /** If true, uses hybrid retrieval (dense + sparse + RRF fusion via Query API). Default: false. */
  hybrid?: boolean;
  /** Original query text. Required when hybrid=true. */
  query_text?: string;
  /** If true, includes kind:"indice" notes in the search. Default: false (excluded). */
  include_hubs?: boolean;
  /**
   * Minimum score to keep a direct hit. No default: no filter.
   * It never cuts the related block: an edge is drawn for a reason the query does
   * not carry, so its score is low by construction, not by irrelevance.
   */
  min_score?: number;
  /** Max related results kept, best score first. Default: RELATED_LIMIT. */
  related_limit?: number;
  /** If false, hits are not counted on the notes. Default: true. */
  record_hits?: boolean;
}

/** Related results kept after ranking, when the caller names no limit. */
export const RELATED_LIMIT = 25;

/** Returns the first message describing an option the search cannot honour. */
export function validateSearchOptions(options: SearchOptions): string | null {
  if (!isPositiveInt(options.limit)) return "limit must be an integer above zero";
  if (!isCountOrUndefined(options.depth)) return "depth must be an integer, zero or above";
  if (!isCountOrUndefined(options.related_limit)) return "related_limit must be an integer, zero or above";
  if (options.min_score !== undefined && !isScore(options.min_score)) return "min_score must be a number between -1 and 1";
  return null;
}

function isPositiveInt(value: number | undefined): boolean {
  return value === undefined || (Number.isInteger(value) && value > 0);
}

function isCountOrUndefined(value: number | undefined): boolean {
  return value === undefined || isCount(value);
}

function isCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isScore(value: number): boolean {
  return Number.isFinite(value) && value >= -1 && value <= 1;
}

// ─── Pure helpers on notes ───────────────────────────────────────────────────

/** Returns the note without any link (ref or backref) to `id`. */
export function withoutLink(note: Note, id: string): Note {
  return {
    ...note,
    refs: note.refs.filter((r) => r.id !== id),
    ...(note.backrefs && { backrefs: note.backrefs.filter((b) => b !== id) }),
  };
}

/** Returns the hit fields of a note after one more direct search hit. */
export function nextHit(note: Pick<Note, "hits">, now: string): { hits: number; last_hit: string } {
  return { hits: (note.hits ?? 0) + 1, last_hit: now };
}

/** Returns the hit fields of a note after one more arrival through an edge. */
export function nextRelatedHit(
  note: Pick<Note, "hits_related">,
  now: string,
): { hits_related: number; last_hit_related: string } {
  return { hits_related: (note.hits_related ?? 0) + 1, last_hit_related: now };
}

/** Returns the ids that start with `prefix`. An empty prefix matches all of them. */
export function matchPrefix(prefix: string, ids: string[]): string[] {
  const result = ids.filter((id) => id.startsWith(prefix));
  assert(allStartWith(result, prefix), "matchPrefix: every result carries the prefix");
  return result;
}

function allStartWith(ids: string[], prefix: string): boolean {
  return ids.every((id) => id.startsWith(prefix));
}

/**
 * Returns the best `limit` related results, highest score first.
 * Ties break on id so that two searches over the same data agree.
 */
export function topRelated(related: RelatedResult[], limit: number): RelatedResult[] {
  assert(isCount(limit), "topRelated: limit is a count");

  const ranked = [...related].sort(byScoreThenId);
  const result = ranked.slice(0, limit);

  assert(isRanked(result), "topRelated: highest score first");
  assert(result.length <= limit, "topRelated: limit held");
  return result;
}

function byScoreThenId(a: RelatedResult, b: RelatedResult): number {
  return b.score - a.score || a.note.id.localeCompare(b.note.id);
}

function isRanked(results: RelatedResult[]): boolean {
  return results.every((r, i) => i === 0 || results[i - 1].score >= r.score);
}

export interface PayloadWrite {
  id: string;
  payload: Record<string, unknown>;
}

interface PayloadGroup {
  ids: string[];
  payload: Record<string, unknown>;
}

/**
 * Merges writes that carry the same payload into one group.
 * A search hits many notes that never had a counter, so most writes are identical.
 */
export function groupByPayload(writes: PayloadWrite[]): PayloadGroup[] {
  const groups = new Map<string, PayloadGroup>();
  for (const write of writes) {
    const key = JSON.stringify(write.payload);
    const group = groups.get(key);
    if (group) group.ids.push(write.id);
    else groups.set(key, { ids: [write.id], payload: write.payload });
  }

  const result = [...groups.values()];
  assert(countIds(result) === writes.length, "groupByPayload: every write kept");
  return result;
}

function countIds(groups: PayloadGroup[]): number {
  return groups.reduce((sum, g) => sum + g.ids.length, 0);
}

export interface Citation {
  note_id: string;
  snippet: string;
  score: number;
  source?: string;
  timestamp: string;
}

/** A note the query matched. Carries a citation: it is quotable. */
export interface DirectResult {
  note: Note;
  score: number;
  via: "search";
  citation: Citation;
}

/** A note reached through an edge. Scored against the query, never quotable on its own. */
export interface RelatedResult {
  note: Note;
  score: number;
  via: "related";
}

export type SearchResult = DirectResult | RelatedResult;
