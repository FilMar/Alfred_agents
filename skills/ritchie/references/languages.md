# Mechanisms per language

One section per language. Each shows the code shape behind every cell of
the mechanism map in `SKILL.md`: private field and getter, consuming
builder, contract, stub, the two test shapes, and how the checked
production profile is obtained.

## Rust

Private field and getter, consuming builder, wrapped constructor:

```rust
pub type RValue = Rc<Value>;

pub struct Camera { zoom: f32, pan: Vec2 }

impl Camera {
    pub fn with_zoom(self, zoom: f32) -> Self {
        debug_assert!(zoom > 0.0, "Camera.with_zoom: zoom above zero");
        let result = Self { zoom, ..self };
        debug_assert!(result.zoom == zoom, "Camera.with_zoom: zoom stored");
        result
    }
    pub fn zoom(&self) -> f32 { self.zoom }
}

impl Value {
    pub fn int(x: i64) -> RValue { Rc::new(Value::Int(x)) }
}
```

Contract: `debug_assert!(cond, "msg")`, one per invariant. A helper for a
check that computes:

```rust
fn all_in_bounds(&self, cells: &[Cell]) -> bool { ... }
debug_assert!(self.all_in_bounds(cells), "Map.insert: cells in bounds");
```

An optional a precondition says is present: one
`.expect("Type.fn: msg")`, no assert before, no unwrap after.

Stub: `let result = todo!("fn_name");` between the pre and the post
asserts. `todo!()` diverges, so the postconditions are unreachable until
the placeholder becomes the computation.

Tests:

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

Checked profile, in the root `Cargo.toml`:

```toml
[profile.release-checked]
inherits = "release"
debug-assertions = true
```

Day-to-day runs use `--profile release-checked`. Plain `--release` is the
shipping build. `cargo test` is a debug build, so contracts fire there
too.

Layout of a type that grows: one struct, many files. Each file holds
one `impl` block for one responsibility, with a shared name prefix
(`vm_run.rs`, `vm_stack.rs`). The `mod.rs` keeps only the struct, its
constructor and the helpers every file needs. Submodules that only add
`impl` blocks stay private.

World errors: one enum per phase deriving `thiserror::Error`, a root
enum with `#[error(transparent)]` and `#[from]` on each variant, source
span and help text attached where the error meets the user.

Newtype with a consuming accessor, never `.0` at a call site:

```rust
pub struct TickNum(usize);
impl TickNum { pub fn value(self) -> usize { self.0 } }
```

## Python

Privacy is a convention here. The rule holds by discipline: no code
outside the class reads or writes `_field`, tests included.

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Camera:
    _zoom: float = 1.0
    _pan: float = 0.0

    def with_zoom(self, zoom: float) -> "Camera":
        assert zoom > 0, "Camera.with_zoom: zoom above zero"
        result = replace(self, _zoom=zoom)
        assert result.zoom == zoom, "Camera.with_zoom: zoom stored"
        return result

    @property
    def zoom(self) -> float:
        return self._zoom
```

`frozen=True` makes the builder consuming in effect: the instance cannot
change, `replace` returns a new one.

Contract: the bare `assert cond, "msg"` statement. The checked profile is
the absence of `-O`: the production command never passes `-O` or sets
`PYTHONOPTIMIZE`, because either strips every assert. Write that in the
project's run command, not in a comment.

Stub: `raise NotImplementedError("fn_name")` between pre and post.

Tests, with pytest:

```python
def test_with_zoom_keeps_zoom():
    Camera().with_zoom(2.0)


def test_with_zoom_rejects_zero():
    with pytest.raises(AssertionError, match="Camera.with_zoom: zoom above zero"):
        Camera().with_zoom(0.0)
```

`match` is a regular-expression search, so keep messages free of regex
metacharacters, or escape them with `re.escape`.

## TypeScript

`#field` is private at runtime, not only in the type checker. The builder
keeps the state in one `readonly` object and spreads it into a new
instance.

```ts
import { assert } from "./contract";

type CameraState = { readonly zoom: number; readonly pan: number };

export class Camera {
  readonly #s: CameraState;
  private constructor(s: CameraState) {
    this.#s = s;
  }
  static default(): Camera {
    return new Camera({ zoom: 1, pan: 0 });
  }
  withZoom(zoom: number): Camera {
    assert(zoom > 0, "Camera.withZoom: zoom above zero");
    const result = new Camera({ ...this.#s, zoom });
    assert(result.zoom() === zoom, "Camera.withZoom: zoom stored");
    return result;
  }
  zoom(): number {
    return this.#s.zoom;
  }
}
```

Contract: one small module, `contract.ts`, exporting
`assert(cond: boolean, msg: string): asserts cond`, which throws
`new Error(msg)`. The `asserts cond` return type narrows types after the
call. The checked profile is the build that keeps the call. A shipping
build may strip it through the bundler's dead-code flag; that build is
named and separate, like `--release` in Rust.

Stub: `throw new Error("todo: fn_name")` between pre and post.

Tests, with vitest or jest:

```ts
test("withZoom keeps zoom", () => {
  Camera.default().withZoom(2);
});

test("withZoom rejects zero", () => {
  expect(() => Camera.default().withZoom(0)).toThrow("Camera.withZoom: zoom above zero");
});
```

`toThrow(string)` matches by substring.

Classes use `extends` only for the language's own error types when a
library demands it. Everything else composes.

## Go

Go has no assert, no exception and no private-to-the-struct field: an
unexported field is private to the package, not to the type. The
decisions:

**Contract.** One tiny package per module, `contract`, holds the assert.
Every contract in the module is one call to it, one per invariant, with a
condition that is one expression:

```go
package contract

func Assert(ok bool, msg string) {
	if !ok {
		panic(msg)
	}
}
```

Contracts are always live: Go has no build profile that strips them. The
checked production profile is therefore the default, and there is no
separate shipping build. If a hot path measures the cost, the answer is
to move the check to the caller once, not to add a build tag.

**Privacy across the package.** The rule "no struct touches another's
internals, same package included" holds by discipline. The compiler will
not enforce it inside one package, and the report script cannot see it.
Review for it.

**Builder.** A value receiver receives a copy and returns it. That is the
consuming builder:

```go
type Camera struct {
	zoom float64
	pan  float64
}

func Default() Camera {
	return Camera{zoom: 1, pan: 0}
}

func (c Camera) WithZoom(zoom float64) Camera {
	contract.Assert(zoom > 0, "Camera.WithZoom: zoom above zero")
	c.zoom = zoom
	contract.Assert(c.zoom == zoom, "Camera.WithZoom: zoom stored")
	return c
}

func (c Camera) Zoom() float64 { return c.zoom }
```

**Stub.** `panic("todo: FnName")` between pre and post.

**Tests.** A valid input is a bare call. An invalid input goes through
one helper in the same `contract` package, the only place where a Go test
checks anything:

```go
func ExpectPanic(t *testing.T, want string, fn func()) {
	t.Helper()
	defer func() {
		got := recover()
		if got == nil {
			t.Fatalf("expected panic with %q, got none", want)
		}
		if !strings.Contains(fmt.Sprint(got), want) {
			t.Fatalf("expected panic with %q, got %v", want, got)
		}
	}()
	fn()
}
```

```go
func TestWithZoomKeepsZoom(t *testing.T) {
	Default().WithZoom(2)
}

func TestWithZoomRejectsZero(t *testing.T) {
	contract.ExpectPanic(t, "Camera.WithZoom: zoom above zero", func() {
		Default().WithZoom(0)
	})
}
```

**Errors.** A world error is the second return value, as the language
expects. A contract violation is the panic from `Assert`. A `recover` in
production code is never used to turn the second into the first.

**Inheritance.** Go has none. Embedding promotes methods, and from
another package it grants no access to the embedded struct's unexported
fields, so it keeps the principle. Inside one package it does grant that
access. So inside a package, hold the inner struct as a named field and
call its methods. Embed only across a package boundary.
