import { assert, isNonBlank, isPositiveInt } from "../../common/contract.js";
import { searchNotes } from "../../tb/src/notes.js";
import type { Note } from "../../tb/src/types.js";
import { searchEntries } from "../../ti/src/identity.js";
import type { IdentityEntry } from "../../ti/src/types.js";
import type { CandidateKind } from "../../tl/src/types.js";
import { NoteCandidate } from "./candidate.js";
import { kindOf } from "./critic.js";
import type { Candidate } from "./critic.js";

export type Neighbour = Readonly<{ id: string; kind: CandidateKind; text: string }>;

export function neighbourOfNote(note: Note): Neighbour {
  assert(isNonBlank(note.id), "neighbourOfNote: the note has an id");
  assert(isNonBlank(note.what), "neighbourOfNote: the note has a what");
  return { id: note.id, kind: "note", text: note.what };
}

export function neighbourOfEntry(entry: IdentityEntry): Neighbour {
  assert(isNonBlank(entry.if), "neighbourOfEntry: the entry has an if");
  assert(entry.do.length > 0, "neighbourOfEntry: the entry has at least one do");
  return { id: entry.id, kind: "rule", text: `SE ${entry.if} ALLORA ${entry.do.join("; ")}` };
}

export function queryOf(candidate: Candidate): string {
  const result = candidate instanceof NoteCandidate ? candidate.toJson().what : candidate.toJson().if;
  assert(isNonBlank(result), "queryOf: the query is not blank");
  return result;
}

export async function neighboursOf(candidate: Candidate, topK: number): Promise<readonly Neighbour[]> {
  let result: readonly Neighbour[];
  assert(isPositiveInt(topK), () => `neighboursOf: topK is a positive integer, got=${topK}`);
  const query = queryOf(candidate);
  if (candidate instanceof NoteCandidate) {
    const found = await searchNotes(query, { depth: 0, limit: topK, record_hits: false });
    result = found.map((hit) => neighbourOfNote(hit.note));
  } else {
    const found = await searchEntries(query, { limit: topK, record_hits: false });
    result = found.map((entry) => neighbourOfEntry(entry));
  }
  assert(result.length <= topK, () => `neighboursOf: at most topK neighbours, got=${result.length}`);
  assert(allOfKind(result, kindOf(candidate)), "neighboursOf: every neighbour has the kind of the candidate");
  assert(hasUniqueIds(result), "neighboursOf: no neighbour twice");
  return result;
}

function allOfKind(neighbours: readonly Neighbour[], kind: CandidateKind): boolean {
  return neighbours.every((n) => n.kind === kind);
}

function hasUniqueIds(neighbours: readonly Neighbour[]): boolean {
  return new Set(neighbours.map((n) => n.id)).size === neighbours.length;
}
