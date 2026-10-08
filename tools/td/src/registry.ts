import { assert, sameJson } from "../../contract/contract.js";
import { HttpError } from "../../tb/src/infra.js";
import { activateExtractor, fetchExtractor, putExtractor } from "../../tl/src/client.js";
import type { Extractor as ExtractorRow } from "../../tl/src/types.js";
import { Extractor } from "./config.js";

type VersionState = {
  readonly id: number;
  readonly parent: number | null;
  readonly why: string;
  readonly active: boolean;
  readonly created: string;
  readonly extractor: Extractor;
};

export class Version {
  readonly #s: VersionState;

  private constructor(s: VersionState) {
    this.#s = Object.freeze(s);
  }

  static async add(extractor: Extractor, parent: number | null, why: string, now: Date): Promise<Version> {
    assert(!Number.isNaN(now.getTime()), "Version.add: now is a valid date");
    const id = await putExtractor({ parent, why, config: JSON.stringify(extractor.toJson()), created: now.toISOString() });
    const result = await Version.read(id);
    assert(result !== null, () => `Version.add: the new version is read back, id=${id}`);
    assert(!result.isActive(), "Version.add: a new version is inactive");
    assert(result.#records(parent, why, now), () => `Version.add: the row holds parent, why and now, parent=${result.parent()}, created=${result.created()}`);
    assert(sameJson(result.extractor().toJson(), extractor.toJson()), "Version.add: the stored extractor is the one given");
    return result;
  }

  // tl's client checks the id and the row.
  static async read(id: number | "active"): Promise<Version | null> {
    try {
      const row = await fetchExtractor(id);
      return Version.#fromRow(row);
    } catch (error) {
      if (Version.#isNotFound(error)) return null;
      throw error;
    }
  }

  async activate(): Promise<Version> {
    await activateExtractor(this.id());
    const result = await Version.read(this.id());
    assert(result !== null, () => `Version.activate: the version is read back, id=${this.#s.id}`);
    assert(result.isActive(), "Version.activate: the version is active");
    assert(result.id() === this.#s.id, () => `Version.activate: the same version, id=${this.#s.id}, got=${result.id()}`);
    assert(sameJson(result.extractor().toJson(), this.#s.extractor.toJson()), "Version.activate: the extractor is unchanged");
    return result;
  }

  id(): number {
    return this.#s.id;
  }

  parent(): number | null {
    return this.#s.parent;
  }

  why(): string {
    return this.#s.why;
  }

  isActive(): boolean {
    return this.#s.active;
  }

  created(): string {
    return this.#s.created;
  }

  extractor(): Extractor {
    return this.#s.extractor;
  }

  static #fromRow(row: ExtractorRow): Version {
    const result = new Version({
      id: row.id,
      parent: row.parent,
      why: row.why,
      active: row.active,
      created: row.created,
      extractor: Extractor.fromJson(JSON.parse(row.config)),
    });
    assert(Version.#carries(result, row), () => `Version.#fromRow: the version carries the row, id=${row.id}`);
    return result;
  }

  static #carries(version: Version, row: ExtractorRow): boolean {
    return version.id() === row.id
      && version.parent() === row.parent
      && version.why() === row.why
      && version.isActive() === row.active
      && version.created() === row.created;
  }

  #records(parent: number | null, why: string, now: Date): boolean {
    return this.#s.parent === parent && this.#s.why === why && this.#s.created === now.toISOString();
  }

  static #isNotFound(error: unknown): boolean {
    return error instanceof HttpError && error.status === 404;
  }
}
