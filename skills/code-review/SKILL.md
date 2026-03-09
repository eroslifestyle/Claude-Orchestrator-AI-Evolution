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

## TOOL USE EXAMPLES

### Example 1: Code Review con Lettura Multipla File
**Tools**: Read, Grep, Glob
**Pattern**: Analisi strutturata con ricerca pattern

```markdown
# Step 1: Trova tutti i file Python nel progetto
Use Glob with pattern: "src/**/*.py"

# Step 2: Leggi il file principale da analizzare
Use Read with file_path: "src/services/user_service.py"

# Step 3: Cerca potenziali vulnerabilita SQL injection
Use Grep with pattern: "execute\(|cursor\.|raw\(" and path: "src/"

# Step 4: Cerca anti-pattern (god class, deep nesting)
Use Grep with pattern: "class.*:.*\n(def ){5,}" and multiline: true
```

### Example 2: Security-Focused Review con Chaining
**Tools**: Read, Grep, Glob
**Pattern**: Catena di tool call per analisi sicurezza

```markdown
# Fase 1: Identifica entry points
Use Grep with pattern: "@app\.route|@router\.|def (login|auth|register)"
  -> Output: lista endpoint sensibili

# Fase 2: Analizza ogni endpoint
For each endpoint:
  Use Read with file_path: "<endpoint_file>"
  Use Grep with pattern: "password|token|secret|api_key"
    -> Output: potenziali esposizioni

# Fase 3: Verifica input validation
Use Grep with pattern: "request\.(form|json|args)\[|request\.data"
  -> Output: punti di input non validati
```

### Example 3: Metrics Collection con Report
**Tools**: Read, Glob, Write
**Pattern**: Colleziona metriche e genera report

```markdown
# Step 1: Trova tutti i file
Use Glob with pattern: "**/*.py" and path: "src/"

# Step 2: Per ogni file, calcola metriche
For each file:
  Use Read with file_path: "<file>"
  -> Analyze: line count, function count, class count

# Step 3: Genera report aggregato
Use Write with file_path: "reports/code_metrics.md" and content: """
# Code Metrics Report
- Total files: N
- Total lines: N
- Avg complexity: X
- Security issues: Y
"""
```

## BEST PRACTICES (Tool Usage)

- **Parallelismo**: Usa N Read in un messaggio per N file indipendenti
- **Filtraggio**: Usa Grep prima di Read per identificare file rilevanti
- **Caching**: Evita di rileggere lo stesso file piu volte nella sessione
- **Pattern precision**: Usa regex specifiche per ridurre falsi positivi
- **Output limit**: Imposta head_limit su Grep per output grandi

## ERROR HANDLING (Tool Calls)

| Errore | Causa | Recovery |
|--------|-------|----------|
| `File does not exist` | Path errato | Verifica con Glob prima |
| `Pattern not found` | Regex troppo specifica | Allarga pattern o usa flag -i |
| `Permission denied` | File system lock | Riprova o salta file |
| `Timeout` | File troppo grande | Leggi a chunk con offset/limit |

```markdown
# Pattern: Graceful degradation
1. Try: Read file
2. On error: Log warning, continue with next file
3. Aggregate partial results at end
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