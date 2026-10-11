# Python

Answers to `references/adapting-a-language.md`, with code shapes.
Privacy is a convention here: no code outside the class reads or writes
`_field`, tests included. The discipline holds the rule.

## 1. Immutability

`@dataclass(frozen=True)` with `_field` and a `@property` for the read.
The property reads; it does not gatekeep. If the field could be public
without anyone breaking an invariant, make it public (P3).

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Camera:
    _zoom: float = 1.0
    _pan: float = 0.0

    @property
    def zoom(self) -> float:
        return self._zoom
```

## 2. Contract

The bare `assert cond, "msg"` statement. The checked profile is the
absence of `-O`: the production command never passes `-O` and never sets
`PYTHONOPTIMIZE`, because either strips every assert. Write that in the
project's run command, not in a comment.

## 3. Construction

Common case (P4): `Camera()` or `Camera(zoom=2.0)` — plain dataclass
defaults. A consuming `with_zoom` when it carries a per-step contract;
`dataclasses.replace` is the consuming builder, the instance cannot
change.

```python
    def with_zoom(self, zoom: float) -> "Camera":
        assert zoom > 0, "Camera.with_zoom: zoom above zero"
        result = replace(self, _zoom=zoom)
        assert result.zoom == zoom, "Camera.with_zoom: zoom stored"
        return result
```

## 4. Stub

```python
raise NotImplementedError("fn_name")  # between pre and post
```

## 5. Panic test

```python
def test_with_zoom_keeps_zoom():
    Camera().with_zoom(2.0)


def test_with_zoom_rejects_zero():
    with pytest.raises(AssertionError, match="Camera.with_zoom: zoom above zero"):
        Camera().with_zoom(0.0)
```

`match` is a regex search: keep messages free of regex metacharacters,
or escape them with `re.escape`.

## 6. World error

An exception with context. Domain failures inside a system (a bad
division in a scripted language, a type mismatch in user input) are
values the normal flow returns, unless the language idiom says
exception. The interrupting error is reserved for a broken invariant
(P5).

## 7. Error types

One exception class per phase when the caller must catch it
specifically. A generic exception with a message is the default.

## 8. Inheritance

Composition. A class is right only when the value owns mutable state or
a resource. Plain data is a frozen dataclass, not a class with
`__init__` (P3).
