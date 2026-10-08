import { assert, isNonBlank, isPositiveInt, isRecord } from "../../contract/contract.js";

export const NOTE_KINDS = ["dato", "protocollo", "attrito", "configurazione"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const CHECK_DROPS = [
  "empty",
  "kind",
  "tags",
  "contexts",
  "quote",
  "italian",
  "project_term",
  "purity",
  "rule_quote",
  "same_quote",
] as const;
export type CheckDrop = (typeof CHECK_DROPS)[number];

export const NOTE_DROPS: readonly CheckDrop[] = ["empty", "kind", "tags", "contexts", "quote", "italian", "project_term", "purity"];
export const RULE_DROPS: readonly CheckDrop[] = ["empty", "tags", "rule_quote", "italian"];

const MAX_TAGS = 3;
const NOTE_QUOTE_MIN = 10;
const RULE_QUOTE_MIN = 8;
const TERM_MIN = 4;

type ProjectTermsState = { readonly terms: ReadonlySet<string> };

export class ProjectTerms {
  readonly #s: ProjectTermsState;

  private constructor(s: ProjectTermsState) {
    this.#s = Object.freeze(s);
  }

  static of(text: string): ProjectTerms {
    const terms = new Set<string>();

    const backtickRegex = /`([^`\n]{2,60})`/g;
    let match;
    while ((match = backtickRegex.exec(text)) !== null) {
      const t = match[1];
      if (/[_\/]/.test(t) || /[a-z][A-Z]/.test(t) || /\d/.test(t)) {
        terms.add(t);
      }
    }

    const words = text.split(/\s+/);
    for (const w of words) {
      if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(w)) terms.add(w);
      if (w.includes("/")) terms.add(w);
      if (/^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(w)) terms.add(w);
    }

    const filtered = new Set([...terms].filter((t) => t.length >= TERM_MIN));
    const result = new ProjectTerms({ terms: filtered });
    assert(result.#allLongEnough(), "ProjectTerms.of: every term is at least TERM_MIN characters");
    return result;
  }

  hitsIn(text: string): readonly string[] {
    const lower = text.toLowerCase();
    const result = [...this.#s.terms]
      .filter((t) => lower.includes(t.toLowerCase()))
      .sort();
    assert(this.#allTerms(result), "ProjectTerms.hitsIn: every hit is a term");
    assert(ProjectTerms.#allIn(result, text), "ProjectTerms.hitsIn: every hit occurs in the text, case ignored");
    return result;
  }

  #allTerms(hits: readonly string[]): boolean {
    return hits.every((t) => this.#s.terms.has(t));
  }

  #allLongEnough(): boolean {
    return [...this.#s.terms].every((t) => t.length >= TERM_MIN);
  }

  static #allIn(hits: readonly string[], text: string): boolean {
    const lower = text.toLowerCase();
    return hits.every((t) => lower.includes(t.toLowerCase()));
  }
}

type TagVocabularyState = { readonly byKey: ReadonlyMap<string, string> };

export class TagVocabulary {
  readonly #s: TagVocabularyState;

  private constructor(s: TagVocabularyState) {
    this.#s = Object.freeze(s);
  }

  static of(tags: readonly string[]): TagVocabulary {
    assert(allNonBlank(tags), () => `TagVocabulary.of: every tag is not blank, tags=${JSON.stringify(tags)}`);
    const byKey = new Map<string, string>();
    for (const tag of tags) {
      const key = tagKey(tag);
      if (!byKey.has(key)) {
        byKey.set(key, tag);
      }
    }
    const result = new TagVocabulary({ byKey });
    assert(result.#s.byKey.size <= tags.length, "TagVocabulary.of: no tag is invented");
    return result;
  }

  known(tags: readonly string[]): readonly string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const tag of tags) {
      const key = tagKey(tag);
      const vocabTag = this.#s.byKey.get(key);
      if (vocabTag && !seen.has(vocabTag)) {
        result.push(vocabTag);
        seen.add(vocabTag);
      }
    }
    assert(this.#allKnown(result), () => `TagVocabulary.known: every result is a tag of the vocabulary, result=${JSON.stringify(result)}`);
    assert(isUnique(result), () => `TagVocabulary.known: no tag twice, result=${JSON.stringify(result)}`);
    return result;
  }

  proposed(tags: readonly string[]): readonly string[] {
    const result: string[] = [];
    const seenKeys = new Set<string>();
    for (const tag of tags) {
      const trimmed = tag.trim();
      if (!isNonBlank(trimmed)) continue;
      const key = tagKey(trimmed);
      if (!this.#s.byKey.has(key) && !seenKeys.has(key)) {
        result.push(trimmed);
        seenKeys.add(key);
      }
    }
    assert(this.#noneKnown(result), () => `TagVocabulary.proposed: no result matches the vocabulary, result=${JSON.stringify(result)}`);
    assert(isUnique(result), () => `TagVocabulary.proposed: no tag twice, result=${JSON.stringify(result)}`);
    assert(allNonBlank(result), () => `TagVocabulary.proposed: no blank tag, result=${JSON.stringify(result)}`);
    return result;
  }

  #allKnown(tags: readonly string[]): boolean {
    const values = new Set(this.#s.byKey.values());
    return tags.every((t) => values.has(t));
  }

  #noneKnown(tags: readonly string[]): boolean {
    return tags.every((t) => !this.#s.byKey.has(tagKey(t)));
  }
}

type EvidenceState = {
  readonly target: string;
  readonly user: string;
  readonly terms: ProjectTerms;
  readonly vocabulary: TagVocabulary;
};

export class Evidence {
  readonly #s: EvidenceState;

  private constructor(s: EvidenceState) {
    this.#s = Object.freeze(s);
  }

  static of(target: string, user: string, terms: ProjectTerms, vocabulary: TagVocabulary): Evidence {
    assert(isNonBlank(target), "Evidence.of: target is not blank");
    return new Evidence({ target, user, terms, vocabulary });
  }

  target(): string {
    return this.#s.target;
  }

  user(): string {
    return this.#s.user;
  }

  terms(): ProjectTerms {
    return this.#s.terms;
  }

  vocabulary(): TagVocabulary {
    return this.#s.vocabulary;
  }
}

type CheckedState<T> = { readonly candidate: T; readonly drop: CheckDrop | null };

export class Checked<T> {
  readonly #s: CheckedState<T>;

  private constructor(s: CheckedState<T>) {
    this.#s = Object.freeze(s);
  }

  static kept<T>(candidate: T): Checked<T> {
    const result = new Checked({ candidate, drop: null });
    assert(result.isKept(), "Checked.kept: the result is kept");
    return result;
  }

  static dropped<T>(candidate: T, drop: CheckDrop): Checked<T> {
    const result = new Checked({ candidate, drop });
    assert(result.drop() === drop, () => `Checked.dropped: the result carries the reason, drop=${drop}`);
    return result;
  }

  candidate(): T {
    return this.#s.candidate;
  }

  drop(): CheckDrop | null {
    return this.#s.drop;
  }

  isKept(): boolean {
    return this.#s.drop === null;
  }
}

type NoteCandidateState = {
  readonly what: string;
  readonly why: string;
  readonly kind: string;
  readonly tags: readonly string[];
  readonly proposedTags: readonly string[];
  readonly contexts: readonly string[];
  readonly quote: string;
};

export type NoteCandidateJson = NoteCandidateState;

export class NoteCandidate {
  readonly #s: NoteCandidateState;

  private constructor(s: NoteCandidateState) {
    this.#s = Object.freeze(s);
  }

  static fromModel(raw: unknown): NoteCandidate | null {
    if (!NoteCandidate.#isModelJson(raw)) return null;
    const r = raw as NoteCandidateJson;
    const result = new NoteCandidate({
      ...r,
      proposedTags: [],
    });
    assert(result === null || NoteCandidate.#isModelJson(raw), "NoteCandidate.fromModel: a candidate comes only from a note shape");
    assert(result === null || result.#s.proposedTags.length === 0, "NoteCandidate.fromModel: no tag is proposed before the check");
    return result;
  }

  toJson(): NoteCandidateJson {
    return this.#s;
  }

  quote(): string {
    return this.#s.quote;
  }

  check(evidence: Evidence): Checked<NoteCandidate> {
    const drop = NOTE_DROPS.find((d) => this.#fails(d, evidence)) ?? null;
    const result = drop === null ? Checked.kept(this.#withTags(evidence.vocabulary())) : Checked.dropped<NoteCandidate>(this, drop);
    assert(result.isKept() || result.candidate() === this, "NoteCandidate.check: a dropped result carries this candidate");
    assert(result.isKept() || this.#fails(result.drop(), evidence), () => `NoteCandidate.check: the drop names a check the note fails, drop=${result.drop()}, quote=${this.#s.quote}`);
    assert(!result.isKept() || result.candidate().#tagsCutFrom(this, evidence.vocabulary()), () => `NoteCandidate.check: a kept note keeps its known tags first, then proposed ones, at most MAX_TAGS, quote=${this.#s.quote}`);
    assert(!result.isKept() || result.candidate().#passesAll(evidence), () => `NoteCandidate.check: a kept note passes every check, quote=${this.#s.quote}`);
    return result;
  }

  #withTags(vocabulary: TagVocabulary): NoteCandidate {
    const tags = vocabulary.known(this.#s.tags).slice(0, MAX_TAGS);
    const proposedTags = vocabulary.proposed(this.#s.tags).slice(0, MAX_TAGS - tags.length);
    return new NoteCandidate({ ...this.#s, tags, proposedTags });
  }

  #tagsCutFrom(original: NoteCandidate, vocabulary: TagVocabulary): boolean {
    return isCutOf(this.#s.tags, this.#s.proposedTags, vocabulary.known(original.#s.tags), vocabulary.proposed(original.#s.tags));
  }

  #passesAll(evidence: Evidence): boolean {
    return NOTE_DROPS.every((d) => !this.#fails(d, evidence));
  }

  #fails(drop: CheckDrop | null, evidence: Evidence): boolean {
    const s = this.#s;
    const prose = `${s.what} ${s.why}`;
    switch (drop) {
      case "empty": return !isNonBlank(s.what) || !isNonBlank(s.why);
      case "kind": return !isNoteKind(s.kind);
      case "tags": return evidence.vocabulary().known(s.tags).length === 0;
      case "contexts": return s.contexts.length !== 2 || normText(s.contexts[0]) === normText(s.contexts[1]);
      case "quote": return !quoteIn(s.quote, evidence.target(), NOTE_QUOTE_MIN);
      case "italian": return !isItalian(prose);
      case "project_term": return evidence.terms().hitsIn(s.what).length > 0;
      case "purity": return !isPure(prose);
      default: return false;
    }
  }

  static #isModelJson(raw: unknown): boolean {
    return (
      isRecord(raw) &&
      typeof raw.what === "string" &&
      typeof raw.why === "string" &&
      typeof raw.kind === "string" &&
      isStringList(raw.tags) &&
      isStringList(raw.contexts) &&
      typeof raw.quote === "string"
    );
  }
}

type RuleCandidateState = {
  readonly if: string;
  readonly do: string;
  readonly tags: readonly string[];
  readonly proposedTags: readonly string[];
  readonly quote: string;
};

export type RuleCandidateJson = RuleCandidateState;

export class RuleCandidate {
  readonly #s: RuleCandidateState;

  private constructor(s: RuleCandidateState) {
    this.#s = Object.freeze(s);
  }

  static fromModel(raw: unknown): RuleCandidate | null {
    if (!RuleCandidate.#isModelJson(raw)) return null;
    const r = raw as RuleCandidateJson;
    const result = new RuleCandidate({
      ...r,
      proposedTags: [],
    });
    assert(result === null || RuleCandidate.#isModelJson(raw), "RuleCandidate.fromModel: a candidate comes only from a rule shape");
    assert(result === null || result.#s.proposedTags.length === 0, "RuleCandidate.fromModel: no tag is proposed before the check");
    return result;
  }

  toJson(): RuleCandidateJson {
    return this.#s;
  }

  quote(): string {
    return this.#s.quote;
  }

  check(evidence: Evidence): Checked<RuleCandidate> {
    const drop = RULE_DROPS.find((d) => this.#fails(d, evidence)) ?? null;
    const result = drop === null ? Checked.kept(this.#withTags(evidence.vocabulary())) : Checked.dropped<RuleCandidate>(this, drop);
    assert(result.isKept() || result.candidate() === this, "RuleCandidate.check: a dropped result carries this candidate");
    assert(result.isKept() || this.#fails(result.drop(), evidence), () => `RuleCandidate.check: the drop names a check the rule fails, drop=${result.drop()}, quote=${this.#s.quote}`);
    assert(!result.isKept() || result.candidate().#tagsCutFrom(this, evidence.vocabulary()), () => `RuleCandidate.check: a kept rule keeps its known tags first, then proposed ones, at most MAX_TAGS, quote=${this.#s.quote}`);
    assert(!result.isKept() || result.candidate().#passesAll(evidence), () => `RuleCandidate.check: a kept rule passes every check, quote=${this.#s.quote}`);
    return result;
  }

  static dedupe(checked: readonly Checked<RuleCandidate>[]): readonly Checked<RuleCandidate>[] {
    const result = [...checked];
    const seenQuotes = new Map<string, number>();

    for (let i = 0; i < checked.length; i++) {
      const c = checked[i];
      if (c.isKept()) {
        const q = normText(c.candidate().quote());
        if (seenQuotes.has(q)) {
          result[i] = Checked.dropped(c.candidate(), "same_quote");
        } else {
          seenQuotes.set(q, i);
        }
      }
    }
    assert(result.length === checked.length, () => `RuleCandidate.dedupe: every rule is kept or dropped, in=${checked.length}, out=${result.length}`);
    assert(RuleCandidate.#uniqueKeptQuotes(result), "RuleCandidate.dedupe: no two kept rules share a quote");
    assert(RuleCandidate.#onlyNewDrops(checked, result), "RuleCandidate.dedupe: a rule already dropped keeps its reason, a new drop is same_quote");
    return result;
  }

  #withTags(vocabulary: TagVocabulary): RuleCandidate {
    const tags = vocabulary.known(this.#s.tags).slice(0, MAX_TAGS);
    const proposedTags = vocabulary.proposed(this.#s.tags).slice(0, MAX_TAGS - tags.length);
    return new RuleCandidate({ ...this.#s, tags, proposedTags });
  }

  #tagsCutFrom(original: RuleCandidate, vocabulary: TagVocabulary): boolean {
    return isCutOf(this.#s.tags, this.#s.proposedTags, vocabulary.known(original.#s.tags), vocabulary.proposed(original.#s.tags));
  }

  #passesAll(evidence: Evidence): boolean {
    return RULE_DROPS.every((d) => !this.#fails(d, evidence));
  }

  #fails(drop: CheckDrop | null, evidence: Evidence): boolean {
    const s = this.#s;
    switch (drop) {
      case "empty": return !isNonBlank(s.if) || !isNonBlank(s.do);
      case "tags": return evidence.vocabulary().known(s.tags).length === 0;
      case "rule_quote": return !quoteIn(s.quote, evidence.user(), RULE_QUOTE_MIN);
      case "italian": return !isItalian(`${s.if} ${s.do}`);
      default: return false;
    }
  }

  static #isModelJson(raw: unknown): boolean {
    return (
      isRecord(raw) &&
      typeof raw.if === "string" &&
      typeof raw.do === "string" &&
      isStringList(raw.tags) &&
      typeof raw.quote === "string"
    );
  }

  static #uniqueKeptQuotes(checked: readonly Checked<RuleCandidate>[]): boolean {
    const quotes = checked.filter((c) => c.isKept()).map((c) => normText(c.candidate().quote()));
    return new Set(quotes).size === quotes.length;
  }

  static #onlyNewDrops(before: readonly Checked<RuleCandidate>[], after: readonly Checked<RuleCandidate>[]): boolean {
    return before.every((b, i) => (b.isKept() ? after[i].isKept() || after[i].drop() === "same_quote" : after[i].drop() === b.drop()));
  }
}

function tagKey(tag: string): string {
  const result = tag.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  assert(!/^-|-$|--/.test(result), () => `tagKey: hyphens only inside, one at a time, key=${result}`);
  assert(!/[A-Z\s_]/.test(result), () => `tagKey: no capital, space or underscore, key=${result}`);
  return result;
}

function normText(text: string): string {
  const result = text.toLowerCase()
    .replace(/["'`«»“”.,;:!?()\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  assert(result === result.trim(), "normText: no space at the ends");
  assert(!result.includes("  "), "normText: no double space");
  assert(result === result.toLowerCase(), "normText: lower case");
  return result;
}

function quoteIn(quote: string, text: string, min: number): boolean {
  assert(isPositiveInt(min), () => `quoteIn: min is a positive integer, min=${min}`);
  const nq = normText(quote);
  const nt = normText(text);
  const result = nq.length >= min && nt.includes(nq);
  assert(!result || nq.length >= min, () => `quoteIn: a quote found is at least min characters, quote=${quote}`);
  return result;
}

function isItalian(text: string): boolean {
  const words = text.toLowerCase().match(/[a-zàèéìòù]+/g) || [];
  const italian = new Set(["il", "lo", "la", "gli", "le", "che", "di", "un", "una", "per", "non", "è", "sono", "con", "del", "della", "si", "come", "più", "quando", "se"]);
  const english = new Set(["the", "and", "is", "of", "to", "that", "for", "with", "not", "are", "when", "if", "this", "it"]);
  let itCount = 0, enCount = 0;
  for (const w of words) {
    if (italian.has(w)) itCount++;
    else if (english.has(w)) enCount++;
  }
  return itCount >= enCount;
}

function isPure(text: string): boolean {
  const forbidden = ["come richiesto", "l'utente", "filippo", "alfredo", "cappello", "dibattito"];
  const lower = text.toLowerCase();
  return !forbidden.some((f) => lower.includes(f));
}

function isCutOf(tags: readonly string[], proposed: readonly string[], known: readonly string[], offered: readonly string[]): boolean {
  const isPrefix = (part: readonly string[], whole: readonly string[]) => part.every((t, i) => whole[i] === t);
  const total = Math.min(MAX_TAGS, known.length + offered.length);
  return isPrefix(tags, known) && tags.length === Math.min(known.length, MAX_TAGS) && isPrefix(proposed, offered) && tags.length + proposed.length === total;
}

function isNoteKind(kind: string): kind is NoteKind {
  return (NOTE_KINDS as readonly string[]).includes(kind);
}

function allNonBlank(items: readonly string[]): boolean {
  return items.every(isNonBlank);
}

function isUnique(items: readonly string[]): boolean {
  return new Set(items).size === items.length;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}
