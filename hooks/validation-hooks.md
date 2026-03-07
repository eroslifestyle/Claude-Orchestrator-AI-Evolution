# Validation Hooks Specification

> **Version:** 1.0.0
> **Created:** 2026-02-26
> **Status:** Specification Ready

---

## Purpose

Automated validation at key orchestrator steps to ensure system integrity, prevent errors, and enable graceful degradation.

---

## Hooks Overview

| Hook | Trigger | Purpose | Priority |
|------|---------|---------|----------|
| PreAgentSpawn | Before Task agent creation | Validate agent availability | Critical |
| PreSkillInvoke | Before Skill execution | Validate skill integrity | Critical |
| PostTaskComplete | After subagent returns | Validate output quality | High |
| PreCompact | Before context compaction | Preserve critical state | Critical |
| PreCommitLinkCheck | Before git commit | Validate markdown links | Medium |

---

## Hooks

### PreAgentSpawn

**Trigger:** Before invoking Task tool to spawn a subagent

**Validations:**
1. Agent exists in registry (`agent-registry.json`)
2. Agent has valid `.md` definition file in `agents/` directory
3. Agent routing is not blocked (no circuit breaker open)

**On Fail Actions:**
- `FALLBACK`: Route to fallback agent (e.g., Expert -> General Coder)
- `ESCALATE`: Notify orchestrator for manual routing decision
- `ABORT`: Cancel operation with error message

**Implementation:**
```
ALGORITHM PreAgentSpawn(agent_name):
  IF agent_name NOT IN agent_registry.agents:
    LOG ERROR "Agent not found: {agent_name}"
    RETURN FALLBACK("coder")  # Default to coder agent

  agent = agent_registry.agents[agent_name]

  IF NOT file_exists("agents/{agent_name}.md"):
    LOG WARNING "Agent definition missing: {agent_name}.md"
    # Continue with registry info only

  IF circuit_breaker.is_open(agent_name):
    LOG WARNING "Circuit breaker open for: {agent_name}"
    RETURN FALLBACK(agent.fallback_agent)

  RETURN SUCCESS
```

---

### PreSkillInvoke

**Trigger:** Before invoking Skill tool

**Validations:**
1. Skill file exists in `skills/{skill}/SKILL.md`
2. Frontmatter is valid (has required fields)
3. Skill is not deprecated

**On Fail Actions:**
- `DEFAULT`: Use default behavior without skill
- `ESCALATE`: Notify user skill unavailable
- `RETRY`: Attempt with fallback skill

**Implementation:**
```
ALGORITHM PreSkillInvoke(skill_name):
  skill_path = "skills/{skill_name}/SKILL.md"

  IF NOT file_exists(skill_path):
    LOG ERROR "Skill not found: {skill_name}"
    RETURN DEFAULT()

  frontmatter = parse_frontmatter(skill_path)

  IF frontmatter.version < MIN_SUPPORTED_VERSION:
    LOG WARNING "Skill version deprecated: {skill_name}"
    RETURN ESCALATE("Skill requires update: {skill_name}")

  required_fields = ["name", "description", "user-invokable"]
  FOR field IN required_fields:
    IF field NOT IN frontmatter:
      LOG ERROR "Invalid frontmatter: missing {field}"
      RETURN DEFAULT()

  RETURN SUCCESS
```

---

### PostTaskComplete

**Trigger:** After subagent returns result

**Validations:**
1. Output is not empty
2. Output does not contain ERROR markers
3. Output follows PROTOCOL.md format (if applicable)
4. Files claimed to be created actually exist

**On Fail Actions:**
- `RETRY`: Re-invoke subagent with additional context
- `ESCALATE`: Request orchestrator intervention
- `PARTIAL`: Accept partial result with warning

**Implementation:**
```
ALGORITHM PostTaskComplete(result, task_id):
  IF result IS EMPTY:
    LOG ERROR "Empty result from task: {task_id}"
    RETURN RETRY(max_attempts=2)

  error_patterns = ["ERROR:", "FAILED:", "Exception:", "Traceback:"]
  FOR pattern IN error_patterns:
    IF pattern IN result:
      LOG WARNING "Error marker in result: {pattern}"
      IF retry_count < MAX_RETRIES:
        RETURN RETRY()
      ELSE:
        RETURN ESCALATE("Persistent errors in task: {task_id}")

  # Validate files claimed to exist
  FOR file_path IN extract_claimed_files(result):
    IF NOT file_exists(file_path):
      LOG WARNING "Claimed file not found: {file_path}"
      result = append_warning(result, "File not verified: {file_path}")

  RETURN SUCCESS(result)
```

---

### PreCompact

**Trigger:** Before context compaction (Step X in orchestrator)

**Validations:**
1. Checkpoint has been saved
2. Critical state preserved (active tasks, pending decisions)
3. No active subagent operations in progress

**On Fail Actions:**
- `ABORT`: Cancel compaction, continue with current context
- `FORCE`: Proceed with compaction despite warnings (emergency only)
- `DEFER`: Delay compaction until conditions met

**Implementation:**
```
ALGORITHM PreCompact(context):
  checkpoint = load_latest_checkpoint()

  IF checkpoint IS NONE:
    LOG ERROR "No checkpoint saved before compact"
    RETURN ABORT()

  IF checkpoint.timestamp < (now - MAX_CHECKPOINT_AGE):
    LOG WARNING "Checkpoint stale: {checkpoint.timestamp}"
    # Create fresh checkpoint before proceeding
    save_checkpoint(context)

  IF has_active_subagents(context):
    LOG WARNING "Active subagents detected"
    RETURN DEFER(until="subagents_complete")

  critical_keys = ["active_task", "files_modified", "decisions"]
  FOR key IN critical_keys:
    IF key NOT IN checkpoint:
      LOG ERROR "Critical state missing: {key}"
      RETURN ABORT()

  RETURN SUCCESS(checkpoint)
```

---

### PreCommitLinkCheck

**Trigger:** Before git commit (via pre-commit hook or CI)

**Validations:**
1. Scan all changed markdown files
2. Extract internal markdown links
3. Verify linked files/directories exist
4. Report broken links with file:line references

**On Fail Actions:**
- `WARN`: Report broken links but allow commit
- `BLOCK`: Prevent commit until links are fixed
- `FIX`: Auto-remove broken link lines (creates backup)

**Implementation:**
```
ALGORITHM PreCommitLinkCheck(changed_files):
  md_files = FILTER(changed_files, ends_with=".md")

  IF md_files IS EMPTY:
    RETURN SUCCESS("No markdown files changed")

  broken_links = []

  FOR file IN md_files:
    links = EXTRACT_MARKDOWN_LINKS(file)

    FOR link IN links:
      IF IS_EXTERNAL_LINK(link) OR IS_ANCHOR_ONLY(link):
        CONTINUE  # Skip external/anchor links

      resolved = RESOLVE_PATH(file, link)

      IF NOT file_exists(resolved):
        broken_links.APPEND({
          file: file,
          link: link,
          resolved: resolved
        })

  IF broken_links IS NOT EMPTY:
    REPORT broken_links
    IF mode == "BLOCK":
      RETURN ABORT("Fix broken links or use --no-verify")
    ELSE IF mode == "FIX":
      FOR entry IN broken_links:
        REMOVE_LINE(entry.file, entry.link)

  RETURN SUCCESS()
```

**Script Location:** `scripts/validate-links.sh`

**Integration Options:**
1. Git native hook: `.git/hooks/pre-commit`
2. pre-commit framework: `.pre-commit-config.yaml`
3. GitHub Actions: `.github/workflows/link-check.yml`

See: `hooks/pre-commit-link-check.md` for full integration guide.

---

## Error Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| `VH001` | Agent not found | Use fallback |
| `VH002` | Agent definition missing | Continue with registry |
| `VH003` | Circuit breaker open | Use fallback |
| `VH004` | Skill not found | Use default behavior |
| `VH005` | Skill frontmatter invalid | Use default behavior |
| `VH006` | Empty task result | Retry with context |
| `VH007` | Error in task result | Retry or escalate |
| `VH008` | No checkpoint for compact | Abort compaction |
| `VH009` | Stale checkpoint | Create fresh checkpoint |
| `VH010` | Active subagents | Defer compaction |
| `VH011` | Broken markdown link | Fix or remove link |
| `VH012` | Link validation failed | Check file paths |

---

## Configuration

```json
{
  "validation_hooks": {
    "enabled": true,
    "mode": "algorithm",
    "retry": {
      "max_attempts": 2,
      "backoff_ms": 1000
    },
    "fallback": {
      "default_agent": "coder",
      "default_behavior": "direct_response"
    },
    "checkpoint": {
      "max_age_minutes": 30,
      "required_keys": ["active_task", "files_modified", "decisions"]
    }
  }
}
```

---

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Define hook spec | COMPLETE (this file) |
| 2 | Add algorithm-based hooks to orchestrator | PENDING |
| 3 | Test with mock validators | PENDING |
| 4 | Integrate with Claude Code native hooks | PENDING |

---

## Migration Path

### Phase 1: Algorithm-Based (Current)
- Hooks implemented as validation steps in orchestrator algorithm
- Called explicitly at appropriate points
- Logging-based error tracking

### Phase 2: Native Hook Integration
- When Claude Code supports custom hooks natively
- Register hooks via configuration
- Automatic invocation without explicit calls

### Phase 3: Event-Driven
- Hooks emit events for observability
- Integration with monitoring/alerting
- Metrics collection for hook performance

---

## Testing Checklist

- [ ] PreAgentSpawn: Test with invalid agent name
- [ ] PreAgentSpawn: Test with missing .md file
- [ ] PreAgentSpawn: Test with circuit breaker open
- [ ] PreSkillInvoke: Test with missing skill
- [ ] PreSkillInvoke: Test with invalid frontmatter
- [ ] PostTaskComplete: Test with empty result
- [ ] PostTaskComplete: Test with error markers
- [ ] PostTaskComplete: Test with missing claimed files
- [ ] PreCompact: Test without checkpoint
- [ ] PreCompact: Test with stale checkpoint
- [ ] PreCompact: Test with active subagents
- [ ] PreCommitLinkCheck: Test with broken internal link
- [ ] PreCommitLinkCheck: Test with valid internal link
- [ ] PreCommitLinkCheck: Test with external link (should skip)
- [ ] PreCommitLinkCheck: Test fix mode

---

## References

- `orchestrator.md` - Step definitions where hooks are triggered
- `system/PROTOCOL.md` - Output format validation
- `agent-registry.json` - Agent availability checking
- `VERSION.json` - System version tracking
- `scripts/validate-links.sh` - Markdown link validator script
- `hooks/pre-commit-link-check.md` - Link check integration guide
