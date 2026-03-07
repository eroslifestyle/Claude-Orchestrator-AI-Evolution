---
name: python-patterns
description: Python best practices, idioms, and patterns. Auto-activated when working with .py files. Covers PEP 8, type hints, async, testing, packaging.
user-invokable: false
metadata:
  keywords: [python, patterns, pep8, best-practices]
---

# Python Patterns & Best Practices

> **Detailed patterns:** See `rules/python/patterns.md` for comprehensive examples.

## Style & Formatting

- **PEP 8** as baseline, **Black** for auto-formatting (88 char line length)
- **isort** for import ordering: stdlib > third-party > local
- Use f-strings over .format() or % formatting
- Trailing commas in multi-line structures

## Type Hints

- **All** function signatures must have type hints (params + return)
- Prefer `X | None` over `Optional[X]` (Python 3.10+)
- Use `Protocol` for structural subtyping, `TypeVar` for generics
- Use `TypeAlias` for complex type expressions

```python
from collections.abc import Sequence
from typing import TypeVar

T = TypeVar("T")

def find_min(items: Sequence[T]) -> T: ...
def fetch_user(user_id: int) -> User | None: ...
```

## Data Classes

| Use Case | Tool |
|----------|------|
| Simple data containers | `@dataclass` (stdlib) |
| Validation, serialization | `pydantic.BaseModel` |
| Advanced (validators, slots) | `attrs` |

```python
@dataclass(frozen=True, slots=True)
class Point:
    x: float
    y: float

class CreateUserRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str
```

## Error Handling

- Define **custom exception hierarchy** per module/package
- **Never** bare `except:` or `except Exception:` without re-raise
- Use `contextlib.suppress` for expected, ignorable errors
- Wrap with context: `raise AppError("context") from original`

```python
class AppError(Exception): ...
class NotFoundError(AppError): ...

def get_config(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError as exc:
        raise NotFoundError(f"Config not found: {path}") from exc
```

## Async Patterns

- **asyncio** for I/O-bound work (HTTP, DB, file I/O)
- Use `async with` for resource management
- **Never** mix sync blocking calls in async code (use `run_in_executor`)
- Use `asyncio.TaskGroup` (3.11+) for structured concurrency

```python
async def fetch_all(urls: list[str]) -> list[str]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(client.get(url)) for url in urls]
    return [t.result().text for t in tasks]
```

## Testing

- **pytest** as framework (not unittest)
- Fixtures over setUp/tearDown -- composable, explicit
- `@pytest.mark.parametrize` for variant testing
- `conftest.py` for shared fixtures
- Use `tmp_path` fixture for file tests, `monkeypatch` for env

```python
@pytest.mark.parametrize("input_val,expected", [
    ("hello", "HELLO"), ("", ""),
])
def test_uppercase(input_val: str, expected: str) -> None:
    assert to_upper(input_val) == expected
```

## Packaging

- **pyproject.toml** as single config file (PEP 621)
- **uv** (fast) or **poetry** for dependency management
- `src/` layout to prevent accidental imports

```
myproject/
    src/myproject/__init__.py
    tests/conftest.py
    pyproject.toml
```

## Performance

| Technique | When |
|-----------|------|
| Generators | Iterating large datasets (lazy evaluation) |
| `__slots__` | Many instances (reduces memory ~40%) |
| `functools.lru_cache` | Pure functions with repeated calls |
| `collections.deque` | Fast append/pop from both ends |

## Security

- **`secrets`** module for tokens and keys (not `random`)
- **Never** `eval()` or `exec()` on user input
- Parameterized queries always (never f-string SQL)
- Use `defusedxml` for XML parsing (prevents XXE)

## Design Patterns

### Factory Pattern
```python
_NOTIFIERS: dict[str, type[Notifier]] = {"email": EmailNotifier, "slack": SlackNotifier}

def create_notifier(channel: str) -> Notifier:
    if cls := _NOTIFIERS.get(channel):
        return cls()
    raise ValueError(f"Unknown channel: {channel}")
```

### Dependency Injection
```python
class OrderService:
    def __init__(self, repo: OrderRepository, notifier: Notifier) -> None:
        self._repo, self._notifier = repo, notifier
```

### Repository Pattern
```python
class UserRepository(Protocol):
    def get(self, user_id: int) -> User | None: ...
    def save(self, user: User) -> None: ...
```

## Common Mistakes to Avoid

```python
# WRONG - mutable default argument
def append_to(item, target=[]): ...

# CORRECT
def append_to(item, target: list | None = None) -> list:
    if target is None: target = []
    target.append(item)
    return target

# WRONG - late binding closure
funcs = [lambda: i for i in range(5)]

# CORRECT - bind i at creation
funcs = [lambda i=i: i for i in range(5)]

# WRONG - modify list while iterating
for item in items:
    if should_remove(item): items.remove(item)

# CORRECT - build new list
items = [item for item in items if not should_remove(item)]
```
