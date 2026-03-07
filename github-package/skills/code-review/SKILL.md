---
name: code-review
description: When to use this skill for automated code quality analysis and review
disable-model-invocation: false
user-invokable: true
allowed-tools: Read, Grep, Glob, Write
metadata:
  keywords: [review, quality, lint, best-practices]
---

# Code Review Skill

## Overview
Automated code review skill that analyzes code quality, detects anti-patterns, provides improvement suggestions, and performs basic security checks.

## Features
- Code quality analysis
- Anti-pattern detection
- Improvement suggestions
- Basic security checks
- Code metrics calculation
- Best practices validation

## Usage Examples

### Basic Code Review
```bash
/code-review path/to/file.py
```

### Review with Focus Areas
```bash
/code-review --focus security path/to/code/
```

### Generate Report
```bash
/code-review --format markdown --output report.md path/to/project/
```

## Implementation

### Core Components

#### CodeQualityAnalyzer
```python
class CodeQualityAnalyzer:
    """Analyzes code quality metrics and patterns"""

    def __init__(self):
        self.metrics = {
            'complexity': {},
            'maintainability': {},
            'coverage': {}
        }

    def analyze_file(self, filepath):
        """Analyze a single file for code quality"""
        # Implementation
        pass

    def generate_report(self, results):
        """Generate comprehensive quality report"""
        # Implementation
        pass
```

#### AntiPatternDetector
```python
class AntiPatternDetector:
    """Detects common code anti-patterns"""

    PATTERNS = {
        'god_class': r'class\s+\w+\s*{[^}]*\n[^}]*\n[^}]*}',
        'long_method': r'def\s+\w+\([^)]*\):\s*[^:]*\n(?:[^:\n]*\n){10,}',
        'deep_nesting': r'if.*:\s*if.*:\s*if.*:',
    }

    def detect_patterns(self, code):
        """Scan code for anti-patterns"""
        # Implementation
        pass
```

### Security Checker
```python
class SecurityChecker:
    """Performs basic security analysis"""

    def check_injection_vulnerabilities(self, code):
        """Detect potential injection vulnerabilities"""
        # SQL injection, XSS, command injection checks
        pass

    def validate_input_validation(self, code):
        """Check input validation patterns"""
        # Implementation
        pass
```

## Best Practices

### Code Metrics to Track
- **Cyclomatic Complexity**: Keep below 10
- **Lines per Method**: Max 20-30 lines
- **File Size**: Max 500 lines
- **Coupling Score**: Aim for low coupling
- **Cohesion Score**: Aim for high cohesion

### Security Checklist
- [ ] Input validation present
- [ ] SQL parameterized queries
- [ ] Output encoding for HTML
- [ ] Authentication checks
- [ ] Authorization enforcement
- [ ] Error messages sanitized

### Performance Patterns
- Use generators for large datasets
- Implement proper caching strategies
- Avoid premature optimization
- Profile before optimizing

## Integration

### with CI/CD Pipeline
```yaml
- name: Code Quality Check
  run: |
    /code-review --focus complexity --fail-on-warning .
```

### with IDE Plugins
```json
{
  "code-review": {
    "trigger": "onSave",
    "focus": ["maintainability", "security"],
    "failOnError": true
  }
}
```

## Configuration

### .code-review.yml
```yaml
rules:
  complexity:
    max_score: 10
    fail_on_warning: true

  security:
    level: "strict"
    checks:
      - sql_injection
      - xss
      - auth_check

  style:
    enforce_pep8: true
    max_line_length: 88

output:
  format: "json"
  include_metrics: true
  report_path: "./reports/"
```

## Command Line Interface

### Options
- `--focus`: Specify focus areas (complexity, security, style, performance)
- `--format`: Output format (text, json, html, markdown)
- `--output`: Output file path
- `--config`: Custom configuration file
- `--fail-on-warning`: Treat warnings as errors
- `--verbose`: Detailed output

### Examples
```bash
# Quick review
/code-review src/

# Security focused
/code-review --focus security --fail-on-warning .

# Generate HTML report
/code-review --format html --output report.html app/
```

## Troubleshooting

### Common Issues
- **Large files**: Split analysis into chunks
- **False positives**: Customize rules in config
- **Performance issues**: Enable caching
- **Missing dependencies**: Install required packages

### Error Messages
- `Analysis failed`: Check file permissions
- `Pattern not found`: Verify regex patterns
- **Configuration error**: Validate YAML syntax