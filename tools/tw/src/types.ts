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

// ─── Tasks ───────────────────────────────────────────────────────────────────

export interface Task {
  text: string;
  done: boolean;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  wiki: string;
  page: string;
  line: number;
  text: string;
}
