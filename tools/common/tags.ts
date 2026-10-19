export function normalizeTags(tags: string[]): string[] {
  return tags.flatMap((t) => t.split(",").map((s) => s.trim())).filter(Boolean);
}
