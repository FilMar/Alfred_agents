import type { Retrieval } from "./types.ts";

/** Query tb and ti with the raw user text. Failures degrade to empty, never block the turn. */
export async function retrieve(query: string): Promise<Retrieval> {
  throw new Error("TODO");
}
