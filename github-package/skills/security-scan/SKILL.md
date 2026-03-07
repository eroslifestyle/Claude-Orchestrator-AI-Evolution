---
name: security-scan
description: Run a security audit on the codebase checking for common vulnerabilities. Use /security-scan for OWASP-style review.
user-invokable: true
allowed-tools: Read, Grep, Glob, Task
metadata:
  keywords: [security, scan, audit, vulnerability]
---

# Security Scan Skill - OWASP-Style Vulnerability Audit

## Purpose

Scan a codebase for common security vulnerabilities based on OWASP guidelines
and produce a prioritized findings report with actionable remediation steps.

## Trigger

User invokes `/security-scan [path]` or orchestrator delegates security review tasks.
Optional `[path]` limits scan to a subdirectory. Default: entire project.

## Algorithm

1. **LOAD** security rules from `~/.claude/rules/common/security.md` via Read (if exists)
2. **DETECT** project type and languages via Glob:
   - Python: `**/*.py`, `requirements.txt`, `pyproject.toml`
   - JavaScript/TypeScript: `**/*.{js,ts,jsx,tsx}`, `package.json`
   - Go: `**/*.go`, `go.mod`
   - Other: adapt patterns to detected languages
3. **SCAN** for each vulnerability category (all Grep calls in parallel):
   - See Scan Patterns below
4. **DELEGATE** deep analysis to Security Unified Expert via Task tool:
   - Validate findings (eliminate false positives)
   - Assess severity based on context
   - Generate remediation recommendations
5. **PRODUCE** findings report (see Output Format)

## Scan Patterns

Run ALL pattern scans in parallel using Grep:

### Hardcoded Secrets
```
Pattern: (api[_-]?key|password|secret|token|credential)\s*[=:]\s*["\'][^"\']{8,}
Files: **/*.{py,js,ts,go,java,rb,yaml,yml,json,env,cfg,ini,conf}
Severity: CRITICAL
```

### SQL Injection
```
Pattern: (execute|query|raw)\s*\(.*(%s|%d|\+|\.format|f["\'])
Pattern: (SELECT|INSERT|UPDATE|DELETE).*\+\s*(req\.|request\.|params\.|input)
Files: **/*.{py,js,ts,go,java,rb,php}
Severity: CRITICAL
```

### XSS (Cross-Site Scripting)
```
Pattern: (innerHTML|outerHTML|document\.write|v-html|dangerouslySetInnerHTML|\|safe|\|raw)
Pattern: (\.html\(|\.append\().*\$
Files: **/*.{js,ts,jsx,tsx,html,vue,svelte,php}
Severity: HIGH
```

### Insecure Dependencies
```
Check: package.json for known vulnerable patterns
Check: requirements.txt for unpinned versions (no ==)
Check: go.sum for known issues
Severity: MEDIUM-HIGH
```

### Missing Input Validation
```
Pattern: (req\.body|req\.params|req\.query|request\.form|request\.args|request\.json)\b
Context: Check if validation/sanitization follows within 5 lines
Files: **/*.{py,js,ts,go,java}
Severity: MEDIUM
```

### Exposed Stack Traces
```
Pattern: (traceback|stack_trace|printStackTrace|DEBUG\s*=\s*True|NODE_ENV.*development)
Files: **/*.{py,js,ts,go,java,yaml,yml,json,env}
Severity: MEDIUM
```

### Insecure Cryptography
```
Pattern: (md5|sha1|DES|RC4)\s*\(
Pattern: (hashlib\.md5|hashlib\.sha1|crypto\.createHash\(["\']md5)
Files: **/*.{py,js,ts,go,java}
Severity: HIGH (if used for passwords/auth)
```

### Path Traversal
```
Pattern: (\.\.\/|\.\.\\|path\.join\(.*req\.|os\.path\.join\(.*request)
Files: **/*.{py,js,ts,go,java,php}
Severity: HIGH
```

## Output Format

```markdown
# Security Scan Report

**Scanned:** <N files> across <M directories>
**Date:** <current date>
**Scope:** <path or "full project">

## Summary
| Severity | Count |
|----------|-------|
| CRITICAL | X |
| HIGH | X |
| MEDIUM | X |
| LOW | X |

## Findings

### [CRITICAL] <Finding Title>
- **File:** `path/to/file.py` line <N>
- **Category:** <e.g., Hardcoded Secret>
- **Code:** `<offending code snippet>`
- **Risk:** <what an attacker could do>
- **Fix:** <specific remediation with code example>

### [HIGH] <Finding Title>
...

## Recommendations
1. <Priority ordered list of actions>
2. ...
```

## Rules

- Run ALL grep scans in PARALLEL (never sequential)
- Report file paths as absolute paths
- Show actual code snippets for each finding
- Eliminate obvious false positives (e.g., test files with dummy passwords)
- If security.md rules file exists, merge those patterns with built-in patterns
- NEVER modify code during scan - this is read-only analysis
- Group findings by severity, then by category
- Include a "clean" note if no findings in a category
