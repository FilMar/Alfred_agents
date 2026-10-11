import { assert, isNonBlank, isPositiveInt } from "../../contract/contract.js";
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
  let result: Neighbour;
  assert(isNonBlank(note.id), "neighbourOfNote: the note has an id");
  assert(isNonBlank(note.what), "neighbourOfNote: the note has a what");
  result = { id: note.id, kind: "note", text: note.what };
  assert(result.id === note.id, "neighbourOfNote: the neighbour carries the note id");
  assert(result.kind === "note", "neighbourOfNote: the kind is note");
  assert(result.text === note.what, "neighbourOfNote: the text is the what of the note");
  return result;
}

export function neighbourOfEntry(entry: IdentityEntry): Neighbour {
  let result: Neighbour;
  assert(isNonBlank(entry.if), "neighbourOfEntry: the entry has an if");
  assert(entry.do.length > 0, "neighbourOfEntry: the entry has at least one do");
  result = { id: entry.id, kind: "rule", text: `SE ${entry.if} ALLORA ${entry.do.join("; ")}` };
  assert(result.id === entry.id, "neighbourOfEntry: the neighbour carries the entry id");
  assert(result.kind === "rule", "neighbourOfEntry: the kind is rule");
  assert(result.text.startsWith(`SE ${entry.if} ALLORA `), "neighbourOfEntry: the text reads SE if ALLORA do");
  return result;
}

export function queryOf(candidate: Candidate): string {
  let result: string;
  result = candidate instanceof NoteCandidate ? candidate.toJson().what : candidate.toJson().if;
  assert(isNonBlank(result), "queryOf: the query is not blank");
  assert(!(candidate instanceof NoteCandidate) || result === candidate.toJson().what, "queryOf: a note is searched by its what");
  assert(candidate instanceof NoteCandidate || result === candidate.toJson().if, "queryOf: a rule is searched by its if");
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
    const found = await searchEntries(query, { limit: topK });
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
