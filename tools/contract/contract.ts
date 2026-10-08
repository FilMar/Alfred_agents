export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

export function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new ContractError(msg);
}

export function isNonBlank(text: string): boolean {
  return text.trim().length > 0;
}

export function isPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sameJson(a: unknown, b: unknown): boolean {
  const sorted = (_key: string, value: unknown): unknown =>
    isRecord(value) ? Object.fromEntries(Object.entries(value).sort(([p], [q]) => (p < q ? -1 : 1))) : value;
  return JSON.stringify(a, sorted) === JSON.stringify(b, sorted);
}
