---
name: git-workflow
description: When to use this skill for advanced Git operations and workflow management
disable-model-invocation: false
user-invokable: true
allowed-tools: Read, Grep, Glob, Write, Bash
context: fork
agent: DevOps Expert
metadata:
  keywords: [git, commit, branch, merge, PR, workflow]
---

# Git Workflow Skill

## Overview
Advanced Git workflow skill for semantic commits, branch management, merge conflict resolution, and pull request creation with best practices.

## Features
- Semantic commit generation
- Branch management strategies
- Merge conflict resolution
- Pull request automation
- Release management
- Pre-commit hooks

## Usage Examples

### Semantic Commit
```bash
/git-workflow commit --type feat --message "Add user authentication"
```

### Create Feature Branch
```bash
/git-workflow branch create --name feature/user-auth --from main
```

### Resolve Conflicts
```bash
/git-workflow conflict resolve --branch feature/new-feature
```

### Create Pull Request
```bash
/git-workflow pr create --title "Implement user login" --body "Adds OAuth integration"
```

## Implementation

### Semantic Commit Manager
```python
class SemanticCommitManager:
    """Handles semantic commit messages and validation"""

    COMMIT_TYPES = {
        'feat': 'New feature',
        'fix': 'Bug fix',
        'docs': 'Documentation',
        'style': 'Code style',
        'refactor': 'Code refactoring',
        'perf': 'Performance improvement',
        'test': 'Test',
        'chore': 'Build process or auxiliary tooling changes'
    }

    def generate_commit_message(self, type, scope, message, body=None):
        """Generate standardized commit message"""
        commit = f"{type}"
        if scope:
            commit += f"({scope})"
        commit += f": {message}"

        if body:
            commit += f"\n\n{body}"

        return commit

    def validate_commit_message(self, message):
        """Validate commit message format"""
        import re
        pattern = r'^(\w+)(?:\(([\w-]+)\))?: .+$'
        return bool(re.match(pattern, message))
```

### Branch Management
```python
class BranchManager:
    """Manages Git branch lifecycle"""

    BRANCH_PATTERNS = {
        'feature': r'feature/\w+',
        'bugfix': r'bugfix/\w+',
        'hotfix': r'hotfix/\w+',
        'release': r'release/\d+\.\d+\.\d+'
    }

    def create_branch(self, name, from_branch='main'):
        """Create new branch with proper naming"""
        # Branch creation logic
        pass

    def cleanup_branches(self, pattern, keep_days=30):
        """Clean up old branches"""
        # Branch cleanup logic
        pass

    def protect_branch(self, branch_name, rules):
        """Configure branch protection rules"""
        # Protection rules setup
        pass
```

### Merge Conflict Resolver
```python
class MergeConflictResolver:
    """Handles merge conflict resolution strategies"""

    def analyze_conflicts(self, conflicted_files):
        """Analyze merge conflicts and categorize"""
        # Conflict analysis
        pass

    def resolve_conflicts(self, strategy='theirs'):
        """Resolve conflicts using specified strategy"""
        # Resolution logic
        pass

    def create_conflict_report(self):
        """Generate report of resolved conflicts"""
        # Report generation
        pass
```

## Workflows

### Feature Branch Workflow
```bash
# 1. Create feature branch
/git-workflow branch create --name feature/user-auth

# 2. Develop features
git add .
git commit -m "feat(auth): add login page"

# 3. Push branch
/git-workflow push --branch feature/user-auth

# 4. Create PR
/git-workflow pr create \
  --title "Implement User Authentication" \
  --body "Adds OAuth integration with Google and GitHub"

# 5. Merge after review
/git-workflow pr merge --pr-id 123
```

### Hotfix Workflow
```bash
# 1. Create hotfix from production
/git-workflow branch create --name hotfix/security-fix --from main

# 2. Apply fix
git add security_patch.py
git commit -m "fix(security): patch XSS vulnerability"

# 3. Release hotfix
/git-workflow release create --version 1.0.1 --hotfix
```

## Pull Request Automation

### PR Template Generator
```python
class PRTemplateGenerator:
    """Generates pull request templates"""

    def generate_template(self, pr_type='feature'):
        """Generate PR template based on type"""
        templates = {
            'feature': self._feature_template(),
            'bugfix': self._bugfix_template(),
            'documentation': self._docs_template()
        }
        return templates.get(pr_type, templates['feature'])
```

### PR Automation Rules
```yaml
# .github/pr-automation.yml
automations:
  - name: "assign-reviewers"
    when: "pr.opened"
    actions:
      - type: "assign"
        reviewers:
          - "team-lead"
          - "tech-lead"
        count: 2

  - name: "check-labels"
    when: "pr.opened"
    actions:
      - type: "add-label"
        labels: ["needs-review", "type:feature"]

  - name: "auto-close"
    when: "pr.stale"
    days: 14
    action: "close"
```

## Configuration

### .git-workflow.yml
```yaml
branches:
  main:
    protected: true
    required_reviews: 2
    status_checks: ["ci/build", "security/scan"]

  develop:
    protected: true
    merge_strategy: "squash"

commits:
  type: "conventional"
  scope_required: false
  body_max_length: 72

pr:
  template: "feature"
  auto_assign: true
  minimum_reviews: 1
  required_labels: ["needs-review"]

release:
  pattern: "release/*"
  auto_tag: true
  changelog_path: "CHANGELOG.md"
```

## Pre-commit Hooks

### Setup
```bash
# Install pre-commit hooks
/git-workflow hooks install

# Configure hooks
/git-workflow hooks configure \
  --hook "pre-commit" \
  --script "lint-staged" \
  --staged "*.js,*.ts"

/git-workflow hooks configure \
  --hook "commit-msg" \
  --script "validate-commit-message"
```

### Available Hooks
- `pre-commit`: Run before commit
- `commit-msg`: Validate commit message
- `pre-push`: Run before push
- `post-merge`: Run after merge

## Command Line Interface

### Options
- `--config`: Custom configuration file
- `--dry-run`: Preview without executing
- `--verbose`: Detailed output
- `--force`: Bypass safety checks

### Commands
- `git-workflow branch`: Branch management
- `git-workflow commit`: Semantic commit handling
- `git-workflow pr`: Pull request operations
- `git-workflow release`: Release management
- `git-workflow hooks`: Pre-commit hooks
- `git-workflow status`: Workflow status

### Examples
```bash
# Semantic commit with scope
/git-workflow commit --type feat --scope auth --message "Add user authentication"

# Create PR with template
/git-workflow pr create \
  --title "Update dependencies" \
  --template maintenance

# Clean old branches
/git-workflow cleanup --pattern "feature/*" --keep 30

# Setup branch protection
/git-workflow branch protect --main --rules "2 reviews, status checks"
```

## Troubleshooting

### Common Issues
- **Commit validation fails**: Check commit message format
- **Branch protection conflicts**: Review protection rules
- **PR automation not working**: Check webhook configuration
- **Merge conflicts**: Use conflict resolution commands

### Error Messages
- `Invalid branch name`: Follow naming conventions
- `Commit message rejected`: Format according to semantic commits
- `PR merge failed**: Check merge requirements
- **Hooks failed**: Review pre-commit configuration