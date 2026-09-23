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

export type NoteType = (typeof NOTE_TYPES)[number];

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
  /** Connection network — mutable, append-only, capped by REFS_LIMIT */
  refs: Link[];
  /** IDs of notes referencing this one — managed automatically, append-only */
  backrefs?: string[];
  /** Times this note was a direct search hit — managed automatically */
  hits?: number;
  /** ISO 8601 — last time this note was a direct search hit */
  last_hit?: string;
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
   * Depth of refs traversal.
   * 0 = vector search only.
   * 1 = vector + 1 hop of refs (default).
   * 2 = vector + refs + refs of refs.
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
  /** Minimum score (0-1) to include a result. No default: no filter. */
  min_score?: number;
  /** If false, direct hits are not counted on the notes. Default: true. */
  record_hits?: boolean;
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

export interface Citation {
  note_id: string;
  snippet: string;
  score: number;
  source?: string;
  timestamp: string;
}

export type SearchResult =
  | { note: Note; score: number; via: "search"; citation?: Citation }
  | { note: Note; score: null; via: "related" };
