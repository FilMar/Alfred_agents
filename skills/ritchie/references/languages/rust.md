# Rust

Answers to `references/adapting-a-language.md`, with code shapes.

## 1. Immutability

Private field + getter. `pub` fields only when no invariant protects the
write (P3: a plain data struct keeps fields public — privacy that
defends nothing is ceremony).

```rust
pub struct Camera { zoom: f32, pan: Vec2 }

impl Camera {
    pub fn zoom(&self) -> f32 { self.zoom }
}
```

## 2. Contract

`debug_assert!(cond, "msg")`, one per invariant. A check that computes
calls a helper.

```rust
fn all_in_bounds(&self, cells: &[Cell]) -> bool { ... }
debug_assert!(self.all_in_bounds(cells), "Map.insert: cells in bounds");
```

An `Option` a precondition says is present: one
`.expect("Type.fn: msg")`, no assert before, no unwrap after.

Checked profile in the root `Cargo.toml`:

```toml
[profile.release-checked]
inherits = "release"
debug-assertions = true
```

Day-to-day: `--profile release-checked`. Plain `--release` ships.
`cargo test` is a debug build, contracts fire there too.

## 3. Construction

Common case (P4): derive `Default`, set required fields, spread the
rest. A consuming `with_x(self) -> Self` builder only when there are
enough optional fields to make the spread noisy, or an invariant to
check per step.

```rust
#[derive(Default)]
pub struct Camera { pub zoom: f32, pub pan: Vec2 }

// common case: Camera { zoom: 2.0, ..Default::default() }

impl Camera {
    pub fn with_zoom(self, zoom: f32) -> Self {
        debug_assert!(zoom > 0.0, "Camera.with_zoom: zoom above zero");
        let result = Self { zoom, ..self };
        debug_assert!(result.zoom == zoom, "Camera.with_zoom: zoom stored");
        result
    }
}
```

## 4. Stub

```rust
let result = todo!("fn_name"); // between the pre and the post asserts
```

`todo!()` diverges, so the postconditions are unreachable until the
placeholder becomes the computation.

## 5. Panic test

```rust
#[test]
fn with_zoom_keeps_zoom() {
    Camera::default().with_zoom(2.0);
}

#[test]
#[should_panic(expected = "Camera.with_zoom: zoom above zero")]
fn with_zoom_rejects_zero() {
    Camera::default().with_zoom(0.0);
}
```

## 6. World error

`Result<T, E>`. One enum per phase deriving `thiserror::Error`, a root
enum with `#[error(transparent)]` and `#[from]` on each variant. Source
span and help text attach where the error meets the user, not in the
depths.

## 7. Error types

A world error becomes its own type when the caller must act on it. If
every call site unwraps or always propagates, it was a contract in
disguise: replace it with an assert (P5).

## 8. Inheritance

None. Composition: the outer struct holds the inner one and calls its
methods (P1).

## Layout and newtypes

One struct, many files: each file holds one `impl` block for one
responsibility with a shared name prefix (`vm_run.rs`, `vm_stack.rs`).
`mod.rs` keeps only the struct, its constructor and the helpers every
file needs.

A newtype only when the name cannot carry the meaning or a threshold
must become a state (`TickNum(usize)` with `.value()`, never `.0` at a
call site). No newtype by habit (P3).
