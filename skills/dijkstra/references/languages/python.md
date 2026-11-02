# Python

Answers to `references/adapting-a-language.md`.

### 1. A frozen dataclass over a hand-written class

- **Replaces:** hand-written `__init__`, `__eq__`, `__repr__`, and
  getters over plain fields.
- **Pays:** always.
- **Limit:** ritchie keeps `_field` plus a property only where a
  public field would let a caller break an invariant.

```python
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Job:
    name: str
    retries: int = 3
    tags: tuple[str, ...] = field(default_factory=tuple)
```

### 2. `replace` from a base value

- **Replaces:** N constructions that repeat the same fields, or a
  builder class.
- **Pays:** from the second variant.
- **Limit:** none beyond the owner's: `replace` returns a new value.

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Config:
    workers: int = 1
    verbose: bool = False


BASE = Config()
FAST = replace(BASE, workers=8)
DEBUG = replace(BASE, verbose=True)
```

### 3. A dict table over an if-elif ladder

- **Replaces:** a ladder that maps a key to a value or a handler.
- **Pays:** from three branches.
- **Limit:** a ladder whose branches hold logic stays control flow.

```python
def archive_name(kind: str) -> str:
    return {"zip": "data.zip", "tar": "data.tar.gz"}.get(kind, "data.bin")
```

### 4. A decorator for a repeated wrapper

- **Replaces:** the same try, retry, timing or logging code around N
  functions.
- **Pays:** from the second wrapped function.
- **Limit:** the decorator holds no assert. The wrapped function keeps
  its own contract.

```python
import functools
import time
from collections.abc import Callable


def retry[T](tries_max: int) -> Callable[[Callable[[], T]], Callable[[], T]]:
    def wrap(fn: Callable[[], T]) -> Callable[[], T]:
        @functools.wraps(fn)
        def run() -> T:
            for _ in range(tries_max - 1):
                try:
                    return fn()
                except OSError:
                    time.sleep(1)
            return fn()

        return run

    return wrap
```

### 5. Comprehensions and builtins over accumulating loops

- **Replaces:** a loop that appends, sums, or sets a flag.
- **Pays:** always, for one filter and one map.
- **Limit:** the comprehension sits in the body, never inside an
  assert. The input keeps its bound.

```python
def has_errors(lines: list[str]) -> bool:
    return any(line.startswith("ERROR") for line in lines)
```

### 6. `pytest.mark.parametrize` over copied tests

- **Replaces:** N tests that differ only in their input.
- **Pays:** from the second copy.
- **Limit:** each case keeps ritchie's shape: a bare call, or an
  expected precondition message.

```python
import pytest


def area(w: int, h: int) -> int:
    assert w > 0, "area: w above zero"
    assert h > 0, "area: h above zero"
    return w * h


@pytest.mark.parametrize(("w", "h", "msg"), [(0, 1, "w above"), (1, 0, "h above")])
def test_area_rejects_zero(w: int, h: int, msg: str) -> None:
    with pytest.raises(AssertionError, match=msg):
        area(w, h)
```
