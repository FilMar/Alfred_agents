import type { Exchange } from "../bank/types.ts";

/** Previous summary + last exchange only -> new delta-merged summary. */
export async function condense(summary: string, ex: Exchange): Promise<string> {
  throw new Error("TODO");
}
