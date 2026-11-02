# Rust

Answers to `references/adapting-a-language.md`.

### 1. `macro_rules!` for repeated items

- **Replaces:** N impl blocks, N tests or N table entries that differ
  only in a name, a type or a value.
- **Pays:** from the second copy, when a generic cannot do it: items,
  not expressions.
- **Limit:** the macro expands to calls and data. A body with a
  contract stays a plain function the macro calls.

```rust
pub struct Meters(pub f64);
pub struct Seconds(pub f64);

macro_rules! unit {
    ($($ty:ident => $suffix:literal),* $(,)?) => {$(
        impl std::fmt::Display for $ty {
            fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
                write!(f, "{}{}", self.0, $suffix)
            }
        }
    )*};
}

unit!(Meters => "m", Seconds => "s");
```

### 2. `derive` over hand-written impls

- **Replaces:** hand-written `Debug`, `Clone`, `PartialEq`, `Default`,
  `Ord` that do what the derive does.
- **Pays:** always.
- **Limit:** a manual impl that differs from the derive is behaviour,
  and it stays.

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Default)]
pub struct Version { pub major: u16, pub minor: u16 }
```

### 3. Generics over a standard trait

- **Replaces:** N functions that differ only in the argument type.
- **Pays:** from the second copy.
- **Limit:** bound on a std trait (`AsRef`, `Into`, `Display`,
  `FromStr`). A new trait with one implementor is ceremony.

```rust
pub fn label(name: impl AsRef<str>, count: u32) -> String {
    format!("{}: {count}", name.as_ref())
}
```

### 4. `Default` plus struct update

- **Replaces:** a constructor with many arguments, or a builder for a
  few optional fields.
- **Pays:** from three optional fields.
- **Limit:** ritchie keeps a consuming builder that checks a contract
  per step.

```rust
#[derive(Default)]
pub struct Camera { pub zoom: f32, pub pan: (f32, f32), pub locked: bool }

pub fn zoomed() -> Camera {
    Camera { zoom: 2.0, ..Default::default() }
}
```

### 5. A match on an enum over a lookup ladder

- **Replaces:** an if-else ladder or a string match that maps keys to
  values.
- **Pays:** from three arms. The compiler checks that every case is
  covered.
- **Limit:** a match with logic in its arms stays control flow in
  the parent.

```rust
#[derive(Clone, Copy)]
pub enum Level { Debug, Info, Warn }

impl Level {
    pub const fn tag(self) -> &'static str {
        match self { Self::Debug => "DBG", Self::Info => "INF", Self::Warn => "WRN" }
    }
}
```

### 6. `?` and combinators over match ladders

- **Replaces:** nested `match` on `Result` or `Option` that only
  forwards the error.
- **Pays:** from the second nested match.
- **Limit:** `?` is an early return. Use it only in a function with no
  postcondition. With a postcondition, chain `and_then` into `result`.

```rust
pub fn port(text: &str) -> Result<u16, std::num::ParseIntError> {
    text.trim().strip_prefix(':').unwrap_or(text).parse()
}
```

### 7. Iterator chains over index loops

- **Replaces:** an index loop that filters, maps and sums.
- **Pays:** always, for three steps or fewer. Past that, name the
  steps.
- **Limit:** the chain sits in the body, never inside an assert.

```rust
pub fn total_even(values: &[u32]) -> u32 {
    values.iter().filter(|v| *v % 2 == 0).sum()
}
```
