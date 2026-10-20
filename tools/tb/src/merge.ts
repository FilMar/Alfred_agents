import { assert, isPositiveInt, sameJson } from "../../common/contract.js";
import type { Link, Note } from "./types.js";

export type Links = Readonly<{ refs: readonly Link[]; backrefs: readonly string[] }>;
export type Counters = Readonly<Pick<Note, "hits" | "hits_related" | "last_hit" | "last_hit_related" | "archived_at">>;
export type Relink = Readonly<{ id: string; refs: readonly Link[]; backrefs: readonly string[] }>;
export type MergePlan = Readonly<{ into: Note; relinked: readonly Relink[]; dropped: readonly string[] }>;
export type MergeOutcome = Readonly<{ ok: true; plan: MergePlan }> | Readonly<{ ok: false; error: string }>;

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

function distinct(ids: readonly string[]): boolean {
  return new Set(ids).size === ids.length;
}

function noDuplicateRefs(refs: readonly Link[]): boolean {
  return distinct(refs.map((ref) => ref.id));
}

function linksAvoid(links: Links, ids: ReadonlySet<string>): boolean {
  return links.refs.every((ref) => !ids.has(ref.id)) && links.backrefs.every((id) => !ids.has(id));
}

function selfAndDrops(into: Note, drops: readonly Note[]): ReadonlySet<string> {
  return new Set([into.id, ...drops.map((drop) => drop.id)]);
}

function ownRefsKept(links: Links, into: Note, drops: readonly Note[]): boolean {
  const gone = selfAndDrops(into, drops);
  return into.refs.filter((ref) => !gone.has(ref.id)).every((ref) => links.refs.includes(ref));
}

function nothingLost(links: Links, into: Note, drops: readonly Note[]): boolean {
  const gone = selfAndDrops(into, drops);
  const all = [into, ...drops];
  const refIds = new Set(links.refs.map((ref) => ref.id));
  const refsReached = all.flatMap((note) => note.refs).every((ref) => gone.has(ref.id) || refIds.has(ref.id));
  const backrefsReached = all.flatMap((note) => note.backrefs ?? []).every((id) => gone.has(id) || links.backrefs.includes(id));
  return refsReached && backrefsReached;
}

function movedToInto(relink: Relink, note: Note, intoId: string, gone: ReadonlySet<string>): boolean {
  const own = note.refs.find((ref) => ref.id === intoId);
  const moved = note.refs.find((ref) => gone.has(ref.id));
  const expected = own ?? (moved && { ...moved, id: intoId });
  const refHolds = expected === undefined || sameJson(relink.refs.find((ref) => ref.id === intoId), expected);
  const hadBackref = (note.backrefs ?? []).some((id) => gone.has(id));
  return refHolds && (!hadBackref || relink.backrefs.includes(intoId));
}

function sumOf(notes: readonly Note[], field: "hits" | "hits_related"): number {
  return notes.reduce((total, note) => total + (note[field] ?? 0), 0);
}

function countersSummed(counters: Counters, notes: readonly Note[]): boolean {
  return counters.hits === sumOf(notes, "hits") && counters.hits_related === sumOf(notes, "hits_related");
}

function noLaterThan(date: string | undefined, notes: readonly Note[], field: "last_hit" | "last_hit_related"): boolean {
  const dates = notes.map((note) => note[field]).filter((value): value is string => value !== undefined);
  return dates.length === 0 ? date === undefined : dates.includes(date ?? "") && dates.every((value) => Date.parse(value) <= Date.parse(date ?? ""));
}

function lastsLatest(counters: Counters, notes: readonly Note[]): boolean {
  return noLaterThan(counters.last_hit, notes, "last_hit") && noLaterThan(counters.last_hit_related, notes, "last_hit_related");
}

function archivedOnlyIfAll(counters: Counters, notes: readonly Note[]): boolean {
  const all = notes.every((note) => note.archived_at !== undefined);
  return counters.archived_at === (all ? notes[0].archived_at : undefined);
}

function textKept(merged: Note, into: Note): boolean {
  return (
    merged.id === into.id &&
    merged.what === into.what &&
    merged.why === into.why &&
    merged.kind === into.kind &&
    merged.when === into.when
  );
}

function tagsUnited(merged: Note, notes: readonly Note[]): boolean {
  const all = new Set(notes.flatMap((note) => note.tags));
  return distinct(merged.tags) && merged.tags.length === all.size && merged.tags.every((tag) => all.has(tag));
}

function partsCarried(merged: Note, into: Note, drops: readonly Note[]): boolean {
  const links = mergedLinks(into, drops);
  const counters = mergedCounters([into, ...drops]);
  return (
    sameJson(merged.refs, links.refs) &&
    sameJson(merged.backrefs, links.backrefs) &&
    sameJson(pickCounters(merged), counters)
  );
}

function pickCounters(note: Note): Counters {
  const { hits, hits_related, last_hit, last_hit_related, archived_at } = note;
  return { hits, hits_related, last_hit, last_hit_related, archived_at };
}

function allDifferent(into: Note, drops: readonly Note[]): boolean {
  return distinct([into.id, ...drops.map((drop) => drop.id)]);
}

function withinLimit(outcome: MergeOutcome, refsLimit: number): boolean {
  return !outcome.ok || outcome.plan.into.refs.length <= refsLimit;
}

function planAvoidsDrops(outcome: MergeOutcome): boolean {
  if (!outcome.ok) return true;
  const gone = new Set(outcome.plan.dropped);
  return (
    linksAvoid({ refs: outcome.plan.into.refs, backrefs: outcome.plan.into.backrefs ?? [] }, gone) &&
    outcome.plan.relinked.every((relink) => linksAvoid(relink, gone))
  );
}

export function mergedLinks(into: Note, drops: readonly Note[]): Links {
  let result: Links;
  const gone = selfAndDrops(into, drops);
  const refs: Link[] = [];
  const seenRefs = new Set<string>();
  const backrefs: string[] = [];
  const seenBackrefs = new Set<string>();
  for (const each of [into, ...drops]) {
    for (const ref of each.refs) {
      if (gone.has(ref.id) || seenRefs.has(ref.id)) continue;
      seenRefs.add(ref.id);
      refs.push(ref);
    }
    for (const id of each.backrefs ?? []) {
      if (gone.has(id) || seenBackrefs.has(id)) continue;
      seenBackrefs.add(id);
      backrefs.push(id);
    }
  }
  result = { refs, backrefs };
  assert(linksAvoid(result, selfAndDrops(into, drops)), "mergedLinks: no link to itself or to a drop");
  assert(noDuplicateRefs(result.refs), "mergedLinks: no two refs to the same note");
  assert(distinct(result.backrefs), "mergedLinks: no backref twice");
  assert(ownRefsKept(result, into, drops), "mergedLinks: the refs of into win over the moved ones");
  assert(nothingLost(result, into, drops), "mergedLinks: every other link of into and the drops is kept");
  return result;
}

export function mergedCounters(notes: readonly Note[]): Counters {
  assert(notes.length > 0, "mergedCounters: at least one note");
  let result: Counters;
  const hits = notes.reduce((total, each) => total + (each.hits ?? 0), 0);
  const hits_related = notes.reduce((total, each) => total + (each.hits_related ?? 0), 0);
  const latest = (field: "last_hit" | "last_hit_related"): string | undefined =>
    notes
      .map((each) => each[field])
      .reduce<string | undefined>(
        (winner, value) => (value !== undefined && (winner === undefined || Date.parse(value) > Date.parse(winner)) ? value : winner),
        undefined,
      );
  const last_hit = latest("last_hit");
  const last_hit_related = latest("last_hit_related");
  const all_archived = notes.every((each) => each.archived_at !== undefined);
  result = {
    hits,
    hits_related,
    ...(last_hit !== undefined ? { last_hit } : {}),
    ...(last_hit_related !== undefined ? { last_hit_related } : {}),
    ...(all_archived ? { archived_at: notes[0].archived_at } : {}),
  };
  assert(countersSummed(result, notes), "mergedCounters: hits and related hits are the sums");
  assert(lastsLatest(result, notes), "mergedCounters: last hits are the latest ones");
  assert(archivedOnlyIfAll(result, notes), "mergedCounters: archived only if every note is");
  return result;
}

export function mergedInto(into: Note, drops: readonly Note[], now: Date): Note {
  assert(isValidDate(now), "mergedInto: now is a valid date");
  let result: Note;
  const links = mergedLinks(into, drops);
  const counters = mergedCounters([into, ...drops]);
  const tags: string[] = [];
  const seenTags = new Set<string>();
  for (const each of [into, ...drops]) {
    for (const tag of each.tags) {
      if (seenTags.has(tag)) continue;
      seenTags.add(tag);
      tags.push(tag);
    }
  }
  const { hits, hits_related, last_hit, last_hit_related, archived_at, ...rest } = into;
  result = {
    ...rest,
    refs: [...links.refs],
    backrefs: [...links.backrefs],
    tags,
    ...counters,
    updated_at: now.toISOString(),
  };
  assert(textKept(result, into), "mergedInto: id, text, why, kind and when are the into ones");
  assert(tagsUnited(result, [into, ...drops]), "mergedInto: tags are the union");
  assert(partsCarried(result, into, drops), "mergedInto: links and counters are the merged ones");
  assert(result.updated_at === now.toISOString(), "mergedInto: updated_at is now");
  return result;
}

export function relinkOf(note: Note, intoId: string, gone: ReadonlySet<string>): Relink {
  assert(!gone.has(intoId), "relinkOf: into is not a drop");
  let result: Relink;
  const hasOwn = note.refs.some((ref) => ref.id === intoId);
  const refs: Link[] = [];
  let moved = false;
  for (const ref of note.refs) {
    if (!gone.has(ref.id)) {
      refs.push(ref);
      continue;
    }
    if (hasOwn || moved) continue;
    moved = true;
    refs.push({ ...ref, id: intoId });
  }
  const backrefs: string[] = [];
  for (const id of note.backrefs ?? []) {
    const target = gone.has(id) ? intoId : id;
    if (!backrefs.includes(target)) backrefs.push(target);
  }
  result = { id: note.id, refs, backrefs };
  assert(result.id === note.id, "relinkOf: the id is the note id");
  assert(linksAvoid(result, gone), "relinkOf: no link to a drop");
  assert(noDuplicateRefs(result.refs), "relinkOf: no two refs to the same note");
  assert(movedToInto(result, note, intoId, gone), "relinkOf: a link to a drop points at into, an own ref to into wins");
  return result;
}

export function mergePlan(
  into: Note,
  drops: readonly Note[],
  linked: readonly Note[],
  now: Date,
  refsLimit: number,
): MergeOutcome {
  assert(drops.length > 0, "mergePlan: at least one drop");
  assert(allDifferent(into, drops), "mergePlan: into and the drops are all different notes");
  assert(isPositiveInt(refsLimit), "mergePlan: refsLimit is a positive integer");
  let result: MergeOutcome;
  const gone = new Set(drops.map((drop) => drop.id));
  const relinked: Relink[] = [];
  const seen = new Set<string>();
  for (const each of linked) {
    if (each.id === into.id || gone.has(each.id) || seen.has(each.id)) continue;
    seen.add(each.id);
    relinked.push(relinkOf(each, into.id, gone));
  }
  const dropped = drops.map((drop) => drop.id);
  const merged = mergedInto(into, drops, now);
  if (merged.refs.length > refsLimit) {
    result = {
      ok: false,
      error: `refs limit: ${merged.refs.length} refs, limit ${refsLimit}; drop some refs or make a hub first`,
    };
  } else {
    result = { ok: true, plan: { into: merged, relinked, dropped } };
  }
  assert(withinLimit(result, refsLimit), "mergePlan: the refs of into fit the limit");
  assert(planAvoidsDrops(result), "mergePlan: no note in the plan links to a drop");
  return result;
}
