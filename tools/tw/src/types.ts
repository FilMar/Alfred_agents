// ─── Registry ────────────────────────────────────────────────────────────────

export interface WikiEntry {
  name: string;
  path: string;
}

// ─── Pages ───────────────────────────────────────────────────────────────────

export interface Page {
  name: string;
  path: string;
  content: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  wiki: string;
  page: string;
  line: number;
  text: string;
}
