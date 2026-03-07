---
name: testing-strategy
description: When to use this skill for comprehensive testing strategies and test implementation
disable-model-invocation: false
user-invokable: true
metadata:
  keywords: [test, testing, qa, coverage]
---

# Testing Strategy Skill

> **Detailed rules:** See `rules/common/testing.md` for comprehensive testing standards.

## Overview
Comprehensive testing strategy for unit tests, integration tests, coverage analysis, and mock strategies.

## Test Types

| Type | Scope | Speed | When |
|------|-------|-------|------|
| **Unit** | Single function/class | <10ms | Always |
| **Integration** | Multiple components | <1s | API endpoints, DB queries |
| **E2E** | Full user flow | <30s | Critical paths only |
| **Performance** | Load, memory, latency | <5m | Before release |

## Test Structure (AAA Pattern)

```python
def test_user_creation():
    # Arrange - set up test data
    user_service = UserService()
    test_data = {"name": "John", "email": "john@example.com"}

    # Act - call the function under test
    result = user_service.create_user(test_data)

    # Assert - verify the result
    assert result.success
    assert result.user.name == "John"
```

## Test Naming Convention

Format: `test_<what>_<condition>_<expected>` or `should <expected> when <condition>`

```python
# Good names
def test_login_with_invalid_password_returns_401(): ...
def test_calculate_total_with_empty_cart_returns_zero(): ...
def should_reject_expired_tokens(): ...

# Bad names
def test1(): ...
def test_login(): ...
```

## Unit Test Patterns

### Mock Pattern
```python
def test_api_integration():
    mock_client = MockClient()
    mock_client.get.return_value.status_code = 200

    service = APIService(mock_client)
    result = service.get_data()

    mock_client.get.assert_called_once()
```

### Parametrized Tests
```python
@pytest.mark.parametrize("input_val,expected", [
    ("hello", "HELLO"),
    ("world", "WORLD"),
    ("", ""),
])
def test_uppercase(input_val: str, expected: str) -> None:
    assert to_upper(input_val) == expected
```

## Integration Test Patterns

### Database Integration
```python
def test_database_operations():
    with TestDatabase() as db:
        user = db.create_user(test_data)
        retrieved = db.get_user(user.id)
        assert retrieved == user
```

### API Integration
```python
def test_api_end_to_end():
    with TestServer(app) as server:
        response = server.post("/api/users", json=test_data)
        assert response.status_code == 201
        assert response.json()["id"] is not None
```

## Mock Strategies

### Mock Types
```python
# Mock Response
class MockResponse:
    def __init__(self, json_data, status_code):
        self.json_data, self.status_code = json_data, status_code
    def json(self): return self.json_data

# Mock Database
class MockDatabase:
    def __init__(self): self.data = {}
    def get(self, key): return self.data.get(key)
    def set(self, key, value): self.data[key] = value
```

### Fixtures
```python
# conftest.py
@pytest.fixture
def mock_database(): return MockDatabase()

@pytest.fixture
def sample_user(): return User(name="Alice", email="alice@example.com")
```

## Test Structure

```
tests/
  unit/test_models.py
  integration/test_api.py
  performance/test_load.py
  conftest.py
```

## pytest Configuration

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = ["--strict-markers", "--cov=app", "--cov-fail-under=80"]
markers = ["unit", "integration", "performance", "smoke"]
```

## CI/CD Integration

```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]

jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - run: pip install -r requirements.txt pytest pytest-cov
      - run: pytest --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v1
```

## Edge Cases to Test

- **Null/None/undefined** inputs
- **Empty** collections, strings, objects
- **Boundary values**: 0, -1, MAX_INT, empty string
- **Unicode**: emojis, RTL text, very long strings
- **Error paths**: network failure, timeout, invalid format

## Test Independence Rules

- Each test runs independently
- Tests can run in any order
- No shared mutable state between tests
- Use setup/teardown for common setup
- Clean up: delete temp files, reset singletons

## Coverage Standards

| Code Type | Minimum Coverage |
|-----------|-----------------|
| New code | 80% |
| Modified legacy | 60% |
| Critical paths | 100% |

## Anti-Patterns to Avoid

- **Test interdependency**: test B passes only if test A runs first
- **Excessive mocking**: mocking everything = testing nothing
- **Testing implementation**: changing internals breaks tests
- **Slow tests nobody runs**: if >5min, developers skip it
- **Assert-free tests**: a test without assertions is useless

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Test failures | Check test data and assertions |
| Coverage gaps | Add missing test cases |
| Mock errors | Verify mock configurations |
| Performance issues | Optimize test execution |
| Flaky tests | Fix or delete - never ignore |

## Commands

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=term-missing

# Run specific test types
pytest -m unit
pytest -m integration

# Parallel execution
pytest -n 4
```
