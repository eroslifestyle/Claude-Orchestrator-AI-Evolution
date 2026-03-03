---
name: plan
description: Decompose a feature request into a detailed implementation plan with task breakdown, dependencies, and risk assessment. Use /plan for structured planning.
user-invokable: true
allowed-tools: Read, Grep, Glob, Task
metadata:
  keywords: [plan, design, architecture, implementation]
---

# Plan Skill - Structured Implementation Planning

## Purpose

Decompose any feature request or task into a detailed, actionable implementation plan
before writing any code. This ensures clarity, reduces rework, and enables parallel execution.

## Trigger

User invokes `/plan <feature description>` or orchestrator delegates planning tasks.

## Algorithm

1. **CAPTURE** the feature description from user input
2. **EXPLORE** the codebase to understand current architecture:
   - Use Glob to find relevant files by pattern
   - Use Grep to find related functions, classes, imports
   - Use Read to understand key files in detail
3. **DELEGATE** deep analysis to Analyzer agent via Task tool:
   - Identify affected modules and their relationships
   - Map existing patterns and conventions in use
   - Find integration points for the new feature
4. **PRODUCE** the structured plan (see Output Format below)
5. **PRESENT** the plan to the user for review/approval

## Output Format

The plan MUST follow this exact structure:

```markdown
# Implementation Plan: <Feature Name>

## 1. Requirements Summary
- <Bullet list of what the feature must do>
- <Include non-functional requirements: performance, security, etc.>

## 2. Task Breakdown

| # | Task | Dependencies | Parallel Group |
|---|------|--------------|----------------|
| 1 | <task description> | None | A |
| 2 | <task description> | T1 | B |
| 3 | <task description> | None | A |

## 3. Files to Create/Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| CREATE | path/to/new.py | <what it contains> |
| MODIFY | path/to/existing.py | <what changes> |

## 4. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| <risk> | HIGH/MED/LOW | HIGH/MED/LOW | <action> |

## 5. Testing Strategy
- Unit tests: <what to test>
- Integration tests: <what to test>
- Edge cases: <list>

## 6. Estimated Complexity
**Rating:** S / M / L / XL
**Rationale:** <why this rating>
```

## Complexity Scale

| Size | Meaning | Tasks | Files | Time Estimate |
|------|---------|-------|-------|---------------|
| S | Simple | 1-3 | 1-2 | < 30 min |
| M | Medium | 4-8 | 3-6 | 30 min - 2 hr |
| L | Large | 9-15 | 7-15 | 2 - 8 hr |
| XL | Extra Large | 16+ | 16+ | 8+ hr |

## Rules

- NEVER write code during planning - only analyze and plan
- ALWAYS identify dependencies between tasks explicitly
- ALWAYS group independent tasks for parallel execution
- If the codebase is unfamiliar, spend more time on exploration (step 2)
- Flag any ambiguities back to the user before finalizing the plan
- Include rollback strategy for risky changes
