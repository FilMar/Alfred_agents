# TypeScript

Answers to `references/adapting-a-language.md`.

### 1. A `Record` table with `satisfies` over a switch

- **Replaces:** a switch that maps a key to a value or a handler.
- **Pays:** from three cases. `satisfies` checks that every key is
  covered.
- **Limit:** a switch whose cases hold logic stays control flow.

```ts
type Level = "debug" | "info" | "warn";

export const tag = {
  debug: "DBG",
  info: "INF",
  warn: "WRN",
} as const satisfies Record<Level, string>;
```

### 2. One `as const` list for the type and the values

- **Replaces:** a union type and a runtime array that repeat the same
  names.
- **Pays:** always.
- **Limit:** none beyond the shared ones.

```ts
export const KINDS = ["zip", "tar", "raw"] as const;
export type Kind = (typeof KINDS)[number];
```

### 3. Derived types over parallel interfaces

- **Replaces:** a second interface that copies fields of the first.
- **Pays:** from the second interface.
- **Limit:** a derived type that a reader must expand in their head to
  use is not shorter. Stop at one step: `Pick`, `Omit`, `Partial`.

```ts
export type User = Readonly<{ id: string; name: string; email: string }>;
export type UserDraft = Omit<User, "id">;
export type UserPatch = Partial<UserDraft>;
```

### 4. Spread over a builder

- **Replaces:** a builder class or a `withX` chain.
- **Pays:** always, for plain values.
- **Limit:** ritchie keeps a function that checks a contract per step.

```ts
type Camera = Readonly<{ zoom: number; pan: number; locked: boolean }>;
const base: Camera = { zoom: 1, pan: 0, locked: false };
export const zoomed: Camera = { ...base, zoom: 2 };
```

### 5. Generics over copies per type

- **Replaces:** N functions that differ only in the type they handle.
- **Pays:** from the second copy.
- **Limit:** a generic with one caller, or a type parameter used once,
  is ceremony.

```ts
export function byKey<T, K extends PropertyKey>(
  items: readonly T[],
  key: (item: T) => K,
): Record<K, T> {
  return Object.fromEntries(items.map((i) => [key(i), i])) as Record<K, T>;
}
```

### 6. Array methods over accumulating loops

- **Replaces:** a `for` loop that pushes, sums or sets a flag.
- **Pays:** always, for three steps or fewer.
- **Limit:** the chain sits in the body, never inside an assert.

```ts
export const totalEven = (values: readonly number[]): number =>
  values.filter((v) => v % 2 === 0).reduce((a, b) => a + b, 0);
```

### 7. A loop over a table of cases for copied tests

- **Replaces:** N tests that differ only in their input.
- **Pays:** from the second copy.
- **Limit:** each case keeps ritchie's shape: a bare call, or an
  expected precondition message.

```ts
const area = (w: number, h: number): number => {
  if (w <= 0) throw new Error("area: w above zero");
  if (h <= 0) throw new Error("area: h above zero");
  return w * h;
};

for (const [w, h, msg] of [[0, 1, "w above"], [1, 0, "h above"]] as const) {
  Deno.test(`area rejects ${w}x${h}`, () => {
    try {
      area(w, h);
    } catch (e) {
      if (String(e).includes(msg)) return;
    }
    throw new Error(`area: no "${msg}" error`);
  });
}
```
