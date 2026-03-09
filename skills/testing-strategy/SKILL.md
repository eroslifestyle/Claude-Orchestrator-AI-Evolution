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

## TOOL USE EXAMPLES

### Example 1: Test Discovery and Analysis
**Tools**: Glob, Read, Grep
**Pattern**: Scoperta e analisi test esistenti

```markdown
# Step 1: Trova tutti i file di test
Use Glob with pattern: "tests/**/test_*.py" and path: "project/"

# Step 2: Identifica test senza asserzioni
Use Grep with pattern: "def test_" and path: "tests/" and output_mode: "content"
  -> Check: ogni test ha assert/expect?

# Step 3: Leggi test file specifici per analisi
Use Read with file_path: "tests/unit/test_user_service.py"

# Step 4: Cerca mock non configurati
Use Grep with pattern: "Mock\(|Mock\.|\.return_value\s*=" and path: "tests/"
```

### Example 2: Coverage Gap Analysis
**Tools**: Bash, Read, Grep
**Pattern**: Identificazione gap di coverage

```markdown
# Step 1: Esegui test con coverage
Use Bash with command: "pytest --cov=src --cov-report=term-missing --cov-report=json:coverage.json"
  timeout: 120000

# Step 2: Analizza report coverage
Use Read with file_path: "coverage.json"
  -> Identify: file con coverage < 80%

# Step 3: Per ogni file con bassa coverage
For each low-coverage file:
  Use Grep with pattern: "def |class |async def " and path: "<file>"
    -> Output: funzioni/metodi non testati

# Step 4: Genera test mancanti
Use Read with file_path: "src/services/payment.py"
  -> Create: tests/unit/test_payment.py per funzioni mancanti
```

### Example 3: Integration Test Setup
**Tools**: Read, Write, Bash
**Pattern**: Setup ambiente test integrazione

```markdown
# Step 1: Verifica configurazione test
Use Read with file_path: "tests/conftest.py"

# Step 2: Crea database test
Use Bash with command: "python -c \"from tests.fixtures import setup_test_db; setup_test_db()\""
  timeout: 30000

# Step 3: Esegui migration test
Use Bash with command: "alembic upgrade test && alembic downgrade base"
  timeout: 60000

# Step 4: Valida fixtures
Use Grep with pattern: "@pytest.fixture" and path: "tests/"
  -> Output: lista fixtures disponibili
```

### Example 4: Test Generation Workflow
**Tools**: Read, Grep, Glob, Write
**Pattern**: Generazione automatica test da codice

```markdown
# Fase 1: Analizza modulo da testare
Use Read with file_path: "src/utils/validators.py"
  -> Extract: tutte le funzioni pubbliche

# Fase 2: Identifica edge cases
Use Grep with pattern: "def validate_|def check_|def parse_" and path: "src/utils/"
  and output_mode: "content"

# Fase 3: Genera struttura test
Use Write with file_path: "tests/unit/test_validators.py" and content: """
import pytest
from src.utils.validators import *

class TestValidateEmail:
    def test_valid_email_returns_true(self):
        assert validate_email("test@example.com") is True

    def test_invalid_email_returns_false(self):
        assert validate_email("invalid") is False

    def test_empty_string_returns_false(self):
        assert validate_email("") is False

    @pytest.mark.parametrize("email,expected", [
        ("user@domain.com", True),
        ("user.name@domain.co.uk", True),
        ("@domain.com", False),
        ("user@", False),
        (None, False),
    ])
    def test_email_variants(self, email, expected):
        assert validate_email(email) is expected
"""
```

### Example 5: Flaky Test Detection
**Tools**: Bash, Read, Grep
**Pattern**: Rilevamento test flaky

```markdown
# Step 1: Esegui test multipli volte
Use Bash with command: "for i in {1..5}; do pytest tests/ --tb=no -q; done > test_runs.log"
  timeout: 300000

# Step 2: Analizza risultati
Use Bash with command: "grep -E '(PASSED|FAILED)' test_runs.log | sort | uniq -c | sort -rn"

# Step 3: Identifica test con risultati inconsistenti
Use Grep with pattern: "test_.*::" and path: "test_runs.log" and output_mode: "content"

# Step 4: Leggi test flaky per analisi
Use Read with file_path: "tests/integration/test_api.py"
  -> Look for: time-dependent, network-dependent, shared state
```

## BEST PRACTICES (Tool Usage)

- **Parallel test discovery**: Usa N Read in un messaggio per N test file
- **Coverage-first**: Esegui coverage prima di leggere codice sorgente
- **Parametrized generation**: Genera test parametrizzati per edge cases
- **Isolated execution**: Ogni Bash call e' isolata, usa file per stato
- **Structured output**: Usa --tb=short per traceback leggibili

## ERROR HANDLING (Tool Calls)

| Errore | Causa | Recovery |
|--------|-------|----------|
| `Test timeout` | Test lento o bloccato | Aumenta timeout o skip test |
| `Import error` | Dipendenze mancanti | Installa con pip install |
| `Fixture not found` | conftest.py mancante | Crea/verifica fixtures |
| `Coverage < threshold` | Test insufficienti | Aggiungi test per codice non coperto |

```markdown
# Pattern: Robust test execution
1. Always set timeout for pytest (>60s for integration)
2. Use --tb=short for cleaner error output
3. Capture both stdout and stderr
4. Run with -x to stop on first failure during debugging
5. Use -v for verbose output during investigation
```
