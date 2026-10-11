# TypeScript

Answers to `references/adapting-a-language.md`, with code shapes.

## 1. Immutability

A `Readonly` type plus the functions that build it or derive a new one
from it. `readonly` stops the write at compile time, so fields are read
directly: no class, no getter, no `Object.freeze` (P3 — the ceremony
protects nothing the type does not already protect).

```ts
export type Camera = Readonly<{ zoom: number; pan: number }>;

export function defaultCamera(): Camera {
  return { zoom: 1, pan: 0 };
}
```

A class is right only when the value owns a resource or a connection
that methods share. Then `#field` keeps it private at runtime.

## 2. Contract

One small module, `contract.ts`:

```ts
export function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
```

`asserts cond` narrows types after the call. The checked profile is the
build that keeps the call. A shipping build may strip it through the
bundler's dead-code flag; that build is named and separate, like
`--release` in Rust.

```ts
export function withZoom(camera: Camera, zoom: number): Camera {
  assert(zoom > 0, "withZoom: zoom above zero");
  const result = { ...camera, zoom };
  assert(result.zoom === zoom, "withZoom: zoom stored");
  return result;
}
```

## 3. Construction

Common case (P4): object literal, or a spread copy. No builder class, no
`withX` chain for two fields.

```ts
// common case: { ...defaultCamera(), zoom: 2 }
```

When an invariant must hold for every value, a literal must not skip
the constructor. A brand makes the type opaque: only the function that
casts can make one.

```ts
declare const sessionMapBrand: unique symbol;
export type SessionMap = Readonly<{ episodes: readonly Episode[] }> & {
  readonly [sessionMapBrand]: true;
};

export function sessionMapOf(episodes: readonly Episode[], turnCount: number): SessionMap {
  assert(covers(episodes, turnCount), "sessionMapOf: the episodes cover every turn");
  return { episodes } as SessionMap;
}
```

Function names carry the type when the module holds more than one:
`withZoom` in `camera.ts`, `episodeOf` in `episodes.ts`.

## 4. Stub

```ts
throw new Error("todo: fn_name"); // between pre and post
```

## 5. Panic test

Vitest or jest:

```ts
test("withZoom keeps zoom", () => {
  withZoom(defaultCamera(), 2);
});

test("withZoom rejects zero", () => {
  expect(() => withZoom(defaultCamera(), 0)).toThrow("withZoom: zoom above zero");
});
```

`toThrow(string)` matches by substring.

## 6. World error

A `Result`-like union (`{ ok: true, value } | { ok: false, error }`) or
a thrown typed error when the caller cannot ignore it. Pick one per
module and hold it (P7).

## 7. Error types

One error class per phase when the caller must discriminate. A plain
`Error` with a stable message is the default.

## 8. Inheritance

`extends` is used only for the language's own error types when a
library demands it. Everything else composes (P1).
