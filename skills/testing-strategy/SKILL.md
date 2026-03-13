---
name: testing-strategy
description: When to use this skill for comprehensive testing strategies and test implementation
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob, Write, Bash
context: fork
agent: Tester Expert
---

# Testing Strategy Skill

## Overview
Comprehensive testing strategy skill for unit test generation, integration test patterns, coverage analysis, and mock strategies implementation.

## Features
- Unit test generation
- Integration test patterns
- Coverage analysis
- Mock strategies
- Test pyramid optimization
- Test automation setup

## Usage Examples

### Generate Unit Tests
```bash
/testing-strategy generate --type unit --source app/models.py
```

### Run Coverage Analysis
```bash
/testing-strategy coverage --source app/ --threshold 80
```

### Create Integration Tests
```bash
/testing-strategy create --type integration --framework pytest
```

## Implementation

### Test Generator
```python
class TestGenerator:
    """Automated test case generation"""

    def generate_unit_test(self, source_file):
        """Generate unit tests from source code"""
        # Parse source code
        # Generate test cases
        # Setup test framework
        pass

    def generate_integration_test(self, api_endpoint):
        """Generate integration tests for APIs"""
        # Test various scenarios
        # Test data setup
        # Assertion strategies
        pass

    def generate_performance_test(self, component):
        """Generate performance test cases"""
        # Load testing scenarios
        # Performance metrics
        # Baseline establishment
        pass
```

### Coverage Analyzer
```python
class CoverageAnalyzer:
    """Analyzes test coverage metrics"""

    def calculate_coverage(self, source_dir, test_dir):
        """Calculate code coverage percentage"""
        # Coverage calculation
        # Missing lines detection
        # Report generation
        pass

    def generate_coverage_report(self, results):
        """Generate detailed coverage report"""
        # HTML report generation
        # Missing code visualization
        # Improvement suggestions
        pass

    def set_coverage_threshold(self, threshold):
        """Configure coverage thresholds"""
        # Threshold validation
        # Fail on low coverage
        pass
```

### Mock Strategy
```python
class MockStrategy:
    """Implements various mocking strategies"""

    def create_unit_mocks(self, dependencies):
        """Create unit-level mocks"""
        # Isolation strategies
        # Mock object creation
        # Verification setup
        pass

    def create_integration_mocks(self, external_services):
        """Create integration-level mocks"""
        # Service simulation
        # Response mocking
        # Error simulation
        pass

    def create_performance_mocks(self, load_conditions):
        """Create performance test mocks"""
        # Load simulation
        # Response time variation
        # Concurrent user simulation
        pass
```

## Test Patterns

### Unit Test Patterns
```python
# Arrange-Act-Assert Pattern
def test_user_creation():
    # Arrange
    user_service = UserService()
    test_data = {"name": "John", "email": "john@example.com"}

    # Act
    result = user_service.create_user(test_data)

    # Assert
    assert result.success
    assert result.user.name == "John"

# Mock Pattern
def test_api_integration():
    # Setup mock
    mock_client = MockClient()
    mock_client.get.return_value.status_code = 200

    # Test with mock
    service = APIService(mock_client)
    result = service.get_data()

    # Verify
    mock_client.get.assert_called_once()
```

### Integration Test Patterns
```python
# Database Integration Test
def test_database_operations():
    # Setup test database
    with TestDatabase() as db:
        # Test operations
        user = db.create_user(test_data)
        retrieved = db.get_user(user.id)

        # Verify
        assert retrieved == user

# API Integration Test
def test_api_end_to_end():
    # Start test server
    with TestServer(app) as server:
        # Make API calls
        response = server.post("/api/users", json=test_data)

        # Verify response
        assert response.status_code == 201
        assert response.json()["id"] is not None
```

### Performance Test Patterns
```python
# Load Testing
def test_api_under_load():
    # Setup load test
    load_test = LoadTest(
        users=1000,
        duration=300,
        endpoint="/api/users"
    )

    # Execute test
    results = load_test.run()

    # Analyze results
    assert results.response_time < 500
    assert results.error_rate < 0.01

# Memory Usage Test
def test_memory_usage():
    # Monitor memory
    with MemoryMonitor() as monitor:
        # Execute operation
        process_large_dataset()

        # Check memory
        assert monitor.max_memory < 100_000_000  # 100MB
```

## Test Framework Setup

### pytest Configuration
```python
# pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*

addopts =
    --strict-markers
    --strict-config
    --cov=app
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=80

markers =
    unit: Unit tests
    integration: Integration tests
    performance: Performance tests
    smoke: Smoke tests
```

### Test Structure
```
tests/
├── unit/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_services.py
│   └── test_utils.py
├── integration/
│   ├── __init__.py
│   ├── test_api.py
│   ├── test_database.py
│   └── test_external_services.py
├── performance/
│   ├── __init__.py
│   ├── test_load.py
│   └── test_memory.py
└── conftest.py
```

## Test Automation

### CI/CD Integration
```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]

jobs:
  tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.8, 3.9, 3.10, 3.11]

    steps:
      - uses: actions/checkout@v2

      - name: Setup Python
        uses: actions/setup-python@v2

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run tests
        run: |
          pytest --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

### Test Automation Commands
```bash
# Run all tests
/testing-strategy run --all

# Run with coverage
/testing-strategy run --coverage --threshold 80

# Run specific test types
/testing-strategy run --type unit
/testing-strategy run --type integration
/testing-strategy run --type performance

# Parallel test execution
/testing-strategy run --parallel --workers 4
```

## Mock Strategies

### Mock Types
```python
# Mock Response
class MockResponse:
    def __init__(self, json_data, status_code):
        self.json_data = json_data
        self.status_code = status_code

    def json(self):
        return self.json_data

# Mock Database
class MockDatabase:
    def __init__(self):
        self.data = {}

    def get(self, key):
        return self.data.get(key)

    def set(self, key, value):
        self.data[key] = value

# Mock API Client
class MockAPIClient:
    def __init__(self):
        self.responses = {}

    def register_response(self, endpoint, response):
        self.responses[endpoint] = response

    def get(self, endpoint):
        return self.responses.get(endpoint)
```

### Mock Configuration
```python
# conftest.py
@pytest.fixture
def mock_database():
    return MockDatabase()

@pytest.fixture
def mock_api_client():
    client = MockAPIClient()
    client.register_response("/users", MockResponse({"users": []}, 200))
    return client
```

## Configuration

### .testing-strategy.yml
```yaml
test_framework: "pytest"
coverage:
  threshold: 80
  fail_under: true
  report_format: "html"

patterns:
  unit:
    directory: "tests/unit"
    file_pattern: "test_*.py"
    coverage: true

  integration:
    directory: "tests/integration"
    file_pattern: "test_*.py"
    coverage: false
    timeout: 30

  performance:
    directory: "tests/performance"
    file_pattern: "test_*.py"
    iterations: 10

mocking:
  strategy: "auto"
  external_services: true
  response_simulation: true
```

## Command Line Interface

### Options
- `--type`: Test type (unit, integration, performance, all)
- `--source`: Source directory or file
- `--framework`: Test framework (pytest, unittest, jest)
- `--coverage`: Enable coverage analysis
- `--threshold`: Coverage threshold percentage
- `--parallel`: Enable parallel execution
- `--verbose`: Detailed output

### Commands
- `testing-strategy generate`: Generate test files
- `testing-strategy run`: Execute tests
- `testing-strategy coverage`: Analyze coverage
- `testing-strategy mock`: Generate mock objects
- `testing-strategy report`: Generate test reports

### Examples
```bash
# Generate unit tests
/testing-strategy generate --type unit --source app/models.py

# Run with coverage
/testing-strategy run --coverage --threshold 80

# Generate integration tests
/testing-strategy create --type integration --framework pytest

# Run performance tests
/testing-strategy run --type performance --iterations 100

# Generate test report
/testing-strategy report --format html --output test-report.html
```

## Troubleshooting

### Common Issues
- **Test failures**: Check test data and assertions
- **Coverage gaps**: Add missing test cases
- **Mock errors**: Verify mock configurations
- **Performance issues**: Optimize test execution

### Error Messages
- `Test not found`: Check test file naming conventions
- `Coverage below threshold`: Increase test coverage
- **Mock setup failed**: Review mock configurations
- **Test timeout**: Increase timeout values