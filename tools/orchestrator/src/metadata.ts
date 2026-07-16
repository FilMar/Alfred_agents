// ─── Static Metadata Extraction ───────────────────────────────────────────────
// Reads exported constants from script source via regex — never via import() or
// eval. This preserves the no-execution-before-verdict guarantee (Pillar 1/4).

export interface TaskMetadata {
  schedule: string;
  requiresDesktop: boolean;
  timeoutSec?: number;
}

// ─── Regex Patterns ───────────────────────────────────────────────────────────

const SCHEDULE_RE = /export\s+const\s+schedule\s*=\s*["']([^"']+)["']/;
const REQUIRES_DESKTOP_RE = /export\s+const\s+requiresDesktop\s*=\s*(true|false)\b/;
const TIMEOUT_RE = /export\s+const\s+timeoutSec\s*=\s*(\d+)\s*;?/;

// ─── API ──────────────────────────────────────────────────────────────────────

export function extractMetadata(source: string): TaskMetadata {
  const scheduleMatch = source.match(SCHEDULE_RE);
  if (!scheduleMatch) {
    throw new Error("Metadata mancante: export const schedule non trovato nel sorgente.");
  }

  const desktopMatch = source.match(REQUIRES_DESKTOP_RE);
  if (!desktopMatch) {
    throw new Error("Metadata mancante: export const requiresDesktop non trovato nel sorgente.");
  }

  const timeoutMatch = source.match(TIMEOUT_RE);

  return {
    schedule: scheduleMatch[1],
    requiresDesktop: desktopMatch[1] === "true",
    timeoutSec: timeoutMatch ? parseInt(timeoutMatch[1], 10) : undefined,
  };
}