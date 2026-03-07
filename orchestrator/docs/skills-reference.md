# Skills Reference V14.0.3

> **Version:** 14.0.2 AI-Native | **Last Updated:** 2026-03-07
> Orchestrator V14.0.3 - Skills Reference Guide

Source: https://code.claude.com/docs/en/skills

Skills extend what Claude can do. Create a `SKILL.md` file with instructions, and Claude adds it to its toolkit. Claude uses skills when relevant, or you can invoke one directly with `/skill-name`.

## Skill Locations

| Location | Path | Applies to |
|----------|------|------------|
| Enterprise | See managed settings | All users in your organization |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<skill-name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Where plugin is enabled |

Priority: enterprise > personal > project. Plugin skills use `plugin-name:skill-name` namespace.

## Skill Structure

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── template.md        # Template for Claude to fill in
├── examples.md        # Example output showing expected format
├── reference.md       # Detailed reference docs
└── scripts/
    └── helper.py      # Script Claude can execute
```

## Frontmatter Reference

```yaml
---
name: my-skill                    # Display name (lowercase, numbers, hyphens)
description: What this skill does # Claude uses this to decide when to apply
argument-hint: [issue-number]     # Hint shown during autocomplete
disable-model-invocation: false   # Set true to prevent Claude auto-loading
user-invocable: true              # Set false to hide from / menu
allowed-tools: Read, Grep, Glob   # Tools Claude can use without asking
model: haiku                      # Model to use when skill is active
context: fork                     # Run in forked subagent context
agent: Explore                    # Which subagent type to use with context: fork
hooks: {}                         # Hooks scoped to skill lifecycle
---
```

### Invocation Control

| Frontmatter | You can invoke | Claude can invoke | When loaded into context |
|-------------|----------------|-------------------|--------------------------|
| (default) | Yes | Yes | Description always in context, full skill loads when invoked |
| `disable-model-invocation: true` | Yes | No | Description not in context, full skill loads when you invoke |
| `user-invocable: false` | No | Yes | Description always in context, full skill loads when invoked |

## String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking the skill |
| `$ARGUMENTS[N]` | Access specific argument by 0-based index (e.g., `$ARGUMENTS[0]`) |
| `$N` | Shorthand for `$ARGUMENTS[N]` (e.g., `$0`, `$1`, `$2`) |
| `${CLAUDE_SESSION_ID}` | Current session ID for logging/correlation |

**Example:**
```yaml
---
name: fix-issue
description: Fix a GitHub issue
disable-model-invocation: true
---

Fix GitHub issue $ARGUMENTS following our coding standards.
```

Running `/fix-issue 123` → "Fix GitHub issue 123 following our coding standards."

## Dynamic Context Injection

The `!`command`` syntax runs shell commands BEFORE the skill content is sent to Claude. The output replaces the placeholder.

**Example:**
```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

This is PREPROCESSING - commands execute before Claude sees anything. Claude only sees the final result.

## Run Skills in Subagent

Add `context: fork` to run a skill in an isolated subagent context. The skill content becomes the prompt.

**Example:**
```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

The `agent` field specifies which subagent configuration to use:
- Built-in: `Explore`, `Plan`, `general-purpose`
- Custom: Any agent from `.claude/agents/`
- Default: `general-purpose`

## Tool Restrictions

Use `allowed-tools` to limit which tools Claude can use:

```yaml
---
name: safe-reader
description: Read files without making changes
allowed-tools: Read, Grep, Glob
---
```

## Types of Skill Content

### Reference Content
Adds knowledge Claude applies to current work (conventions, patterns, style guides).

```yaml
---
name: api-conventions
description: API design patterns for this codebase
---

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
- Include request validation
```

### Task Content
Step-by-step instructions for specific actions. Add `disable-model-invocation: true` for manual-only invocation.

```yaml
---
name: deploy
description: Deploy the application to production
context: fork
disable-model-invocation: true
---

Deploy the application:
1. Run the test suite
2. Build the application
3. Push to the deployment target
```

## Supporting Files

Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files.

Reference from SKILL.md:
```markdown
## Additional resources
- For complete API details, see `reference.md`
- For usage examples, see `examples.md`
```

## Permission Control

### Disable all skills
```
# Add to deny rules in /permissions:
Skill
```

### Allow/deny specific skills
```
# Allow only specific skills
Skill(commit)
Skill(review-pr *)

# Deny specific skills
Skill(deploy *)
```

Permission syntax: `Skill(name)` for exact match, `Skill(name *)` for prefix match.

## V14 AI-NATIVE Skills

### Predictive Cache Skill

**Purpose:** Preload agents based on task prediction

**Usage:**
```python
from lib.predictive_cache import get_predictive_cache

cache = get_predictive_cache()

# Predict agents for task
predictions = cache.predict_next_agents("refactor auth with JWT", {})
for pred in predictions:
    print(f"{pred.agent_name}: {pred.confidence:.2%}")

# Cold start handling (automatic)
# Falls back to keyword-based prediction when AgentUsageTracker unavailable
```

**V14.0.3 Features:**
- Cold start handling with keyword fallback
- Tiered storage protects high-value patterns
- Optional distributed lock for multi-process

---

### Adaptive Budget Skill

**Purpose:** Calculate dynamic token budget

**Usage:**
```python
from lib.adaptive_budget import get_budget_calculator, ComplexityThresholds

# Default thresholds (auto-adjust)
budget_calc = get_budget_calculator()

# Custom thresholds
thresholds = ComplexityThresholds(
    simple=0.25,
    medium=0.50,
    complex=0.75,
    auto_adjust=True
)
budget_calc = AdaptiveTokenBudget(thresholds=thresholds)

# Calculate budget
budget = budget_calc.calculate_budget("complex security refactor", {"files": ["auth.py"]})
print(f"Budget: {budget.final_budget} tokens (tier: {budget_calc.get_complexity_tier(budget.factors['complexity_raw'])})")
```

**V14.0.3 Features:**
- Adaptive thresholds from distribution
- Dynamic rule budget (20-60%)
- Auto-adjust with 100+ samples

---

### A/B Testing Skill

**Purpose:** Test routing strategies with statistical significance

**Usage:**
```python
from lib.ab_testing import ABTestingFramework, RoutingStrategy

ab = ABTestingFramework()

# Multi-variant experiment (V14.0.3)
control = RoutingStrategy("control", {"mode": "haiku"})
treatment_b = RoutingStrategy("fast", {"mode": "haiku", "cache": True})
treatment_c = RoutingStrategy("opus", {"mode": "opus"})

# Create with custom weights
exp = ab.create_multi_variant_experiment(
    name="routing_test",
    variants=[control, treatment_b, treatment_c],
    weights=[0.5, 0.3, 0.2]  # 50/30/20 split
)

# Assign variant
variant = ab.assign_variant("routing_test", "user_123")

# Record result
ab.record_multi_variant_result("routing_test", variant, success=True)

# Get result
result = ab.get_multi_variant_result("routing_test")
if result and result.is_significant:
    print(f"Winner: {result.winner}")
```

**V14.0.3 Features:**
- Multi-variant support (A/B/C/D)
- Chi-square test for N variants
- Configurable weights

---

### Auto-Tuner Skill

**Purpose:** Optimize parameters with Bayesian optimization

**Usage:**
```python
from lib.auto_tuner import AutoTuner, AutoTunerConfig

config = AutoTunerConfig(
    max_history=100,
    kappa=2.0  # Exploration parameter
)
tuner = AutoTuner(config=config)

# Get suggested parameters
params = tuner.suggest_parameters()
print(f"cache_ttl: {params['cache_ttl']}")
print(f"batch_size: {params['batch_size']}")

# Record outcome
tuner.record_outcome(params, {
    "success_rate": 0.95,
    "latency_ms": 120,
    "token_efficiency": 0.8
})

# GP predictions available
# tuner._gp.predict() returns mean + variance
```

**V14.0.3 Features:**
- Real Gaussian Process with RBF kernel
- Adaptive n_candidates (5-100)
- Latin Hypercube Sampling
- Uncertainty quantification

---

## Troubleshooting

### Skill not triggering
1. Check description includes keywords users would naturally say
2. Verify skill appears in "What skills are available?"
3. Rephrase request to match description more closely
4. Invoke directly with `/skill-name` if user-invocable

### Skill triggers too often
1. Make description more specific
2. Add `disable-model-invocation: true` for manual-only invocation

### Claude doesn't see all skills
Skill descriptions load into context (2% of context window, ~16K char fallback).
Run `/context` to check for excluded skills warning.
Override limit with `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable.
