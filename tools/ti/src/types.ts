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
}
