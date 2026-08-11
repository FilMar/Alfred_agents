export interface IdentityEntry {
  id: string;
  vector: number[];
  if: string;
  do: string[];
  tags: string[];
}

export interface SearchOptions {
  limit?: number;
  tags?: string[];
  /** Minimum score (0-1) to keep a result. No default: no filter. */
  min_score?: number;
}

/** Normalizza una lista di tag: split su virgola, trim, rimuove vuoti. */
export function normalizeTags(tags: string[]): string[] {
  return tags.flatMap((t) => t.split(",").map((s) => s.trim())).filter(Boolean);
}

/** Estrae un messaggio leggibile da un errore di tipo sconosciuto. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
