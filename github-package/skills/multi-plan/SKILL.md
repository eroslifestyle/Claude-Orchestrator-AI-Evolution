---
name: multi-plan
description: Create a multi-agent execution plan for complex tasks. Use /multi-plan for parallel agent coordination planning.
user-invokable: true
allowed-tools: Read, Grep, Glob, Task
metadata:
  keywords: [multi-plan, parallel, comparison, approaches]
---

# Multi-Plan Skill - Parallel Agent Execution Planning

## Purpose

Decompose a complex task into subtasks optimized for parallel multi-agent execution.
Produces an execution plan that the orchestrator can run with maximum concurrency.

## Trigger

User invokes `/multi-plan <complex task description>` or orchestrator delegates planning.

## Algorithm

1. **ANALYZE** the complex task:
   - Use Grep/Glob to understand the codebase scope
   - Use Read to examine key files and architecture
   - Identify all discrete units of work

2. **DECOMPOSE** into subtasks:
   - Each subtask must be independently executable by one agent
   - Each subtask must have clear inputs and outputs
   - Minimize dependencies between subtasks
   - Maximize parallel execution opportunities

3. **ASSIGN** agents to subtasks:
   - Match task type to specialist agent capabilities
   - Select appropriate model tier per task complexity
   - See Agent Selection Guide below

4. **BUILD** dependency graph:
   - Identify which tasks depend on outputs of other tasks
   - Group independent tasks into parallel groups
   - Calculate critical path (longest dependency chain)

5. **ESTIMATE** costs:
   - Token estimate per task based on complexity
   - Total estimated tokens for full plan

6. **PRODUCE** execution plan (see Output Format)

## Agent Selection Guide

| Task Type | Agent | Model |
|-----------|-------|-------|
| Code implementation | Coder | haiku |
| Test writing | Tester Expert | haiku |
| Code review | Reviewer | haiku |
| Architecture analysis | Analyzer | haiku |
| Security review | Security Unified Expert | haiku |
| Refactoring | Languages Refactor Specialist L2 | haiku |
| Documentation | Documenter | haiku |
| API design | Integration Expert | haiku |
| Database work | Database Expert | haiku |
| Code review (perf) | Reviewer | haiku |
| Complex/critical tasks | Any specialist | opus |

## Output Format

```markdown
# Multi-Agent Execution Plan

## Task: <task description>
## Generated: <date>

## Execution Table

| # | Subtask | Agent | Model | Group | Depends On | Est. Tokens |
|---|---------|-------|-------|-------|------------|-------------|
| T1 | Set up data models | Coder | haiku | A | - | ~2K |
| T2 | Write API endpoints | Coder | haiku | A | - | ~3K |
| T3 | Write unit tests for models | Tester | haiku | A | - | ~2K |
| T4 | Integration tests for API | Tester | haiku | B | T2 | ~2K |
| T5 | Security review | Security | haiku | B | T1, T2 | ~1K |
| T6 | Code review | Reviewer | haiku | C | T1, T2, T4 | ~2K |

## Parallel Groups

| Group | Tasks | Can Start After |
|-------|-------|-----------------|
| A | T1, T2, T3 | Immediately |
| B | T4, T5 | Group A completes |
| C | T6 | Group B completes |

## Critical Path
`T2 -> T4 -> T6` (3 sequential steps, ~7K tokens)

## Cost Estimate
- Total tasks: 6
- Parallel groups: 3
- Estimated total tokens: ~12K
- Estimated wall-clock steps: 3 (due to parallelism)
- Speedup vs sequential: 2x

## Execution Command
Ready for orchestrator: pass this plan to `/orchestrator` for execution.
```

## Dependency Rules

- A task can depend on 0 or more other tasks
- Tasks with no dependencies go in the earliest parallel group
- Tasks with dependencies go in the group AFTER all dependencies complete
- Group letters (A, B, C...) indicate execution order
- Within a group, ALL tasks run in parallel

## Token Estimation Guide

| Task Complexity | Estimated Tokens |
|----------------|-----------------|
| Simple edit (1-2 files) | ~1K |
| Moderate implementation (3-5 files) | ~2-3K |
| Complex feature (5-10 files) | ~4-6K |
| Large refactor (10+ files) | ~6-10K |
| Analysis/review (read-only) | ~1-2K |

## Rules

- NEVER create circular dependencies
- ALWAYS maximize parallelism - if two tasks CAN run in parallel, they MUST be in the same group
- Minimum granularity: each task should take at least ~1K tokens (don't over-split)
- Maximum granularity: each task should take at most ~10K tokens (split large tasks)
- ALWAYS include a cost estimate
- ALWAYS show the critical path
- If the plan has only 1 parallel group, reconsider - can it be split further?
- The plan is READ-ONLY output - it does not execute anything
- Include rollback notes for risky subtasks
- Agent names must match those in AGENT_REGISTRY.md
