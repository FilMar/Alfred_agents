import type { SessionState } from "../router/types.ts";

export type CockpitConfig = {
  banksDir: string; // where bank .md files live
  hatsDir: string; // tools/th/hats
  port: number; // COCKPIT_PORT, default 8790
};

/** Single user, in-memory. Lost on restart by design (v1). */
export type Session = SessionState;

/** Boot state: bank "main", no hat armed. */
export function defaultSession(): Session {
  return { bank: "main", hat: null };
}
