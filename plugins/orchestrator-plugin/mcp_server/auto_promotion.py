"""
Auto-Promotion with Guardrails - FIX #5

Automatically promote learned patterns to skills when criteria met,
with safety checks to prevent harmful patterns from becoming skills.

PROMOTION CRITERIA:
- Confidence >= 0.8
- 5+ confirmations
- 7+ days since first seen
- Has "tested" and "documented" tags
- Safety check passed
"""

import json
import logging
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger("orchestrator-mcp")


class PromotionStatus(Enum):
    """Status of pattern promotion."""
    PENDING = "pending"           # Not yet ready
    READY = "ready"               # Ready for promotion
    PROMOTED = "promoted"         # Successfully promoted
    REJECTED = "rejected"         # Failed safety check
    FAILED = "failed"             # Promotion failed


@dataclass
class Pattern:
    """A learned pattern that can be promoted to a skill."""
    id: str
    name: str
    description: str
    pattern: str
    confidence: float
    confirmations: int
    first_seen: str
    last_seen: str
    tags: List[str]
    code_examples: List[str]


@dataclass
class PromotionResult:
    """Result of promotion attempt."""
    pattern_id: str
    status: PromotionStatus
    reason: str
    promoted_at: Optional[str] = None
    skill_path: Optional[str] = None


class AutoPromoter:
    """
    Handles automatic promotion of patterns to skills.

    Usage:
        promoter = AutoPromoter()
        results = promoter.check_and_promote_all()

        for result in results:
            if result.status == PromotionStatus.PROMOTED:
                print(f"Promoted {result.pattern_id} to skill")
    """

    # Configuration
    INSTINCTS_FILE = Path.home() / ".claude/learnings/instincts.json"
    SKILLS_DIR = Path.home() / ".claude/skills/learned"

    # Auto-promotion criteria
    MIN_CONFIDENCE = 0.8
    MIN_CONFIRMATIONS = 5
    MIN_AGE_DAYS = 7
    REQUIRED_TAGS = ["tested", "documented"]

    # Safety patterns to reject
    FORBIDDEN_PATTERNS = [
        r"eval\s*\(",           # No eval()
        r"exec\s*\(",           # No exec()
        r"__import__\s*\(",     # No dynamic imports
        r"subprocess\.call\s*\(.+\|",  # No shell injection
        r"os\.system\s*\(",     # No os.system
        r"sql.*\+.*sql",        # No SQL concat
        r"password.*=.*['\"]",  # No hardcoded passwords
        r"api[_-]?key.*=.*['\"]",  # No hardcoded API keys
    ]

    def __init__(self):
        """Initialize auto-promoter."""
        self.SKILLS_DIR.mkdir(parents=True, exist_ok=True)
        logger.info("AutoPromoter initialized")

    def load_patterns(self) -> List[Pattern]:
        """Load patterns from instincts.json."""
        if not self.INSTINCTS_FILE.exists():
            logger.warning(f"Instincts file not found: {self.INSTINCTS_FILE}")
            return []

        try:
            with open(self.INSTINCTS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)

            patterns = []
            for pattern_id, pattern_data in data.items():
                patterns.append(Pattern(
                    id=pattern_id,
                    name=pattern_data.get("name", pattern_id),
                    description=pattern_data.get("description", ""),
                    pattern=pattern_data.get("pattern", ""),
                    confidence=pattern_data.get("confidence", 0.0),
                    confirmations=pattern_data.get("confirmations", 0),
                    first_seen=pattern_data.get("first_seen", datetime.now().isoformat()),
                    last_seen=pattern_data.get("last_seen", datetime.now().isoformat()),
                    tags=pattern_data.get("tags", []),
                    code_examples=pattern_data.get("code_examples", [])
                ))

            logger.info(f"Loaded {len(patterns)} patterns from instincts.json")
            return patterns

        except Exception as e:
            logger.error(f"Failed to load patterns: {e}")
            return []

    def check_promotion_ready(self, pattern: Pattern) -> tuple[bool, str]:
        """
        Check if pattern is ready for promotion.

        Returns:
            (is_ready, reason)
        """
        checks = []

        # Check confidence
        if pattern.confidence < self.MIN_CONFIDENCE:
            checks.append(f"Confidence too low ({pattern.confidence} < {self.MIN_CONFIDENCE})")

        # Check confirmations
        if pattern.confirmations < self.MIN_CONFIRMATIONS:
            checks.append(f"Too few confirmations ({pattern.confirmations} < {self.MIN_CONFIRMATIONS})")

        # Check age
        try:
            first_seen = datetime.fromisoformat(pattern.first_seen)
            age_days = (datetime.now() - first_seen).days
            if age_days < self.MIN_AGE_DAYS:
                checks.append(f"Too new ({age_days} days < {self.MIN_AGE_DAYS})")
        except:
            checks.append("Invalid first_seen date")

        # Check required tags
        missing_tags = [tag for tag in self.REQUIRED_TAGS if tag not in pattern.tags]
        if missing_tags:
            checks.append(f"Missing tags: {missing_tags}")

        if checks:
            return False, "; ".join(checks)

        return True, "Ready for promotion"

    def safety_check(self, pattern: Pattern) -> tuple[bool, str]:
        """
        Perform safety check on pattern.

        Rejects patterns that:
        - Use dangerous functions (eval, exec, etc.)
        - Have potential security vulnerabilities
        - Contain hardcoded secrets
        """
        code_to_check = pattern.pattern + "\n" + "\n".join(pattern.code_examples)

        for forbidden_pattern in self.FORBIDDEN_PATTERNS:
            if re.search(forbidden_pattern, code_to_check, re.IGNORECASE | re.DOTALL):
                return False, f"Forbidden pattern detected: {forbidden_pattern}"

        # Check for potential secrets
        secret_patterns = [
            (r"(password|passwd|pwd)\s*=\s*['\"][^'\"]{8,}", "Potential hardcoded password"),
            (r"(api[_-]?key|token|secret)\s*=\s*['\"][^'\"]{20,}", "Potential hardcoded secret"),
        ]

        for pattern_desc, desc in secret_patterns:
            if re.search(pattern_desc, code_to_check, re.IGNORECASE):
                return False, desc

        return True, "Safety check passed"

    def promote_to_skill(self, pattern: Pattern) -> PromotionResult:
        """Promote pattern to a skill file."""
        # Check if ready
        ready, reason = self.check_promotion_ready(pattern)
        if not ready:
            return PromotionResult(
                pattern_id=pattern.id,
                status=PromotionStatus.PENDING,
                reason=reason
            )

        # Safety check
        safe, safety_reason = self.safety_check(pattern)
        if not safe:
            return PromotionResult(
                pattern_id=pattern.id,
                status=PromotionStatus.REJECTED,
                reason=f"Safety check failed: {safety_reason}"
            )

        # Create skill
        try:
            skill_dir = self.SKILLS_DIR / pattern.id
            skill_dir.mkdir(parents=True, exist_ok=True)

            skill_file = skill_dir / "SKILL.md"

            skill_content = f"""---
name: {pattern.name}
description: {pattern.description}
confidence: {pattern.confidence}
confirmations: {pattern.confirmations}
promoted_from: instincts.json
promoted_at: {datetime.now().isoformat()}
---

# {pattern.name}

{pattern.description}

## Pattern

```python
{pattern.pattern}
```

## Code Examples

{chr(10).join(f"### Example {i+1}" + chr(10) + "```" + chr(10) + ex + chr(10) + "```" for i, ex in enumerate(pattern.code_examples))}

## Tags

{", ".join(pattern.tags)}

## Learned From

This pattern was automatically promoted from instincts.json after:
- {pattern.confirmations} confirmations
- {pattern.confidence:.1%} confidence
- {(datetime.now() - datetime.fromisoformat(pattern.first_seen)).days} days of usage

---

*Auto-promoted by Orchestrator V12.6 - FIX #5*
"""

            skill_file.write_text(skill_content, encoding='utf-8')

            logger.info(f"Promoted pattern {pattern.id} to skill: {skill_file}")

            return PromotionResult(
                pattern_id=pattern.id,
                status=PromotionStatus.PROMOTED,
                reason="Successfully promoted",
                promoted_at=datetime.now().isoformat(),
                skill_path=str(skill_file)
            )

        except Exception as e:
            logger.error(f"Failed to promote pattern {pattern.id}: {e}")
            return PromotionResult(
                pattern_id=pattern.id,
                status=PromotionStatus.FAILED,
                reason=f"Promotion failed: {e}"
            )

    def check_and_promote_all(self) -> List[PromotionResult]:
        """Check all patterns and promote ready ones."""
        patterns = self.load_patterns()
        results = []

        logger.info(f"Checking {len(patterns)} patterns for auto-promotion...")

        for pattern in patterns:
            result = self.promote_to_skill(pattern)
            results.append(result)

            if result.status == PromotionStatus.PROMOTED:
                logger.info(f"[PROMOTED] {pattern.id} -> {result.skill_path}")
            elif result.status == PromotionStatus.REJECTED:
                logger.warning(f"[REJECTED] {pattern.id} - {result.reason}")
            elif result.status == PromotionStatus.PENDING:
                logger.debug(f"[PENDING] {pattern.id} - {result.reason}")

        # Summary
        promoted = sum(1 for r in results if r.status == PromotionStatus.PROMOTED)
        rejected = sum(1 for r in results if r.status == PromotionStatus.REJECTED)
        pending = sum(1 for r in results if r.status == PromotionStatus.PENDING)

        logger.info(f"Auto-promotion summary: {promoted} promoted, {rejected} rejected, {pending} pending")

        return results


# Singleton
_auto_promoter: Optional[AutoPromoter] = None


def get_auto_promoter() -> AutoPromoter:
    """Get global auto-promoter instance."""
    global _auto_promoter
    if _auto_promoter is None:
        _auto_promoter = AutoPromoter()
    return _auto_promoter


# CLI testing
if __name__ == "__main__":
    print("Auto-Promotion with Guardrails - FIX #5")
    print("=" * 60)

    # Create test patterns
    test_patterns = [
        Pattern(
            id="test-safe-pattern",
            name="Safe Pattern",
            description="A safe coding pattern",
            pattern="def safe_function(x): return x * 2",
            confidence=0.9,
            confirmations=6,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented", "safe"],
            code_examples=["result = safe_function(5)"]
        ),
        Pattern(
            id="test-dangerous-pattern",
            name="Dangerous Pattern",
            description="Uses eval - should be rejected",
            pattern="def dangerous(x): return eval(x)",
            confidence=0.9,
            confirmations=6,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented"],
            code_examples=[]
        ),
        Pattern(
            id="test-not-ready",
            name="Not Ready",
            description="Not enough confirmations",
            pattern="def not_ready(): pass",
            confidence=0.5,
            confirmations=2,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested"],
            code_examples=[]
        ),
    ]

    # Test promoter
    promoter = AutoPromoter()

    for pattern in test_patterns:
        print(f"\nPattern: {pattern.id}")
        ready, reason = promoter.check_promotion_ready(pattern)
        print(f"  Ready: {ready} ({reason})")

        if ready:
            safe, safety_reason = promoter.safety_check(pattern)
            print(f"  Safe: {safe} ({safety_reason})")

            if safe:
                result = promoter.promote_to_skill(pattern)
                print(f"  Result: {result.status.value} - {result.reason}")
