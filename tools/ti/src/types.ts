export interface IdentityEntry {
  id: string;
  vector: number[];
  if: string;
  do: string[];
  tags: string[];
  /** Id of the tl exchange this rule was distilled from — optional */
  exchange?: string;
  /** Model that produced the vector — a vector is only comparable within one model */
  embed_model?: string;
  /** ISO 8601 — when the rule was added. Absent on rules older than the counters. */
  when?: string;
  hits?: number;
  last_hit?: string;
  /** ISO 8601 — when `ti refine --apply` archived the rule. Absent while the rule is live. */
  archived_at?: string;
}

export interface SearchOptions {
  limit?: number;
  tags?: string[];
  /** Minimum score (0-1) to keep a result. No default: no filter. */
  min_score?: number;
  /** If false, the search writes no hit. Default: true. */
  record_hits?: boolean;
  /** If true, leaves out the rules that have `archived_at`. Default: false. */
  exclude_archived?: boolean;
}

