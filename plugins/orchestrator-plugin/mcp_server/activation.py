"""
Conditional Orchestrator Activation - FIX #1

Instead of ALWAYS activating orchestrator (even for trivial tasks),
use smart decision logic to avoid unnecessary overhead.

RULES:
- Quick responses (time, greetings, thanks) -> NO orchestrator
- Single simple tasks -> NO orchestrator
- Multi-file/multi-domain/complex tasks -> YES orchestrator
"""

from __future__ import annotations

import logging
import re
from enum import Enum
from typing import Tuple

logger = logging.getLogger("orchestrator-mcp")


class TaskComplexity(Enum):
    """Task complexity level for orchestrator activation decision.

    Attributes:
        TRIVIAL: Quick responses like greetings, time queries
        SIMPLE: Single file, single action tasks
        MODERATE: 2-3 files or single domain with specific actions
        COMPLEX: Multi-file, multi-domain, or planning required

    Examples:
        >>> TaskComplexity.TRIVIAL.value
        'trivial'
        >>> TaskComplexity.COMPLEX == TaskComplexity.COMPLEX
        True
    """
    TRIVIAL = "trivial"        # Quick responses, greetings
    SIMPLE = "simple"          # Single file, single action
    MODERATE = "moderate"      # 2-3 files, single domain
    COMPLEX = "complex"        # Multi-file, multi-domain, or requires planning


def detect_task_complexity(request: str) -> TaskComplexity:
    """Detect task complexity from user request.

    Analyzes the request string to determine complexity level based on
    patterns like number of files mentioned, domains involved, and
    action keywords.

    Args:
        request: The user's request string.

    Returns:
        TaskComplexity level that determines if orchestrator is needed.

    Examples:
        >>> detect_task_complexity("Che ore sono?")
        <TaskComplexity.TRIVIAL: 'trivial'>
        >>> detect_task_complexity("Fix typo in README.md")
        <TaskComplexity.SIMPLE: 'simple'>
        >>> detect_task_complexity("Refactor auth system")
        <TaskComplexity.COMPLEX: 'complex'>
    """
    request_lower = request.lower()

    # === TRIVIAL: Quick responses ===
    trivial_patterns = [
        r"^(che ore|ora e'|what time|what's the time)",
        r"^(come stai|how are you|how do you do)",
        r"^(ciao|hello|hi|hey|salve|good morning|good evening)",
        r"^(grazie|thanks|thank you|thx)",
        r"^(a dopo|see you|bye|goodbye|arrivederci)",
    ]
    for pattern in trivial_patterns:
        if re.match(pattern, request.strip(), re.IGNORECASE):
            return TaskComplexity.TRIVIAL

    # === COMPLEX: Multi-domain indicators ===
    complex_indicators = [
        # Multiple domains mentioned
        r"\b(auth|login|security).*(database|db|api)\b",
        r"\b(gui|ui|frontend).*(backend|service|api)\b",
        r"\b(test|testing).*(deploy|ci|cd)\b",
        # Planning keywords
        r"\b(plan|design|architect|strategy)\b",
        r"\b(multi|cross|full.*stack|end.*to.*end)\b",
        # Many files mentioned (3+ patterns)
        r".*\..{2,4}.*\..{2,4}.*\..{2,4}",
        # Fuzzy/vague requests
        r"^(improve|optimize|refactor|clean up)(?!.*(specific|file|function))",
    ]
    for indicator in complex_indicators:
        if re.search(indicator, request_lower):
            return TaskComplexity.COMPLEX

    # === MODERATE: 2-3 files or specific domain ===
    moderate_indicators = [
        # 2-3 file patterns
        r".*\..{2,4}.*\..{2,4}",
        # Specific domain + action
        r"\b(auth|security|database|api|ui|gui|test|deploy)\b.*\b(fix|add|update|create|delete)\b",
        # Feature implementation
        r"\b(add|create|implement).*(feature|function|method|class)\b",
    ]
    for indicator in moderate_indicators:
        if re.search(indicator, request_lower):
            return TaskComplexity.MODERATE

    # === SIMPLE: Single file, single action ===
    simple_indicators = [
        # Single file pattern
        r"\b[\w/\\-]+\.(py|ts|tsx|js|jsx|go|md|json|sql)\b",
        # Single action + target
        r"\b(fix|add|update|delete|create|test|analyze).*(\w+)\b",
    ]
    for indicator in simple_indicators:
        if re.search(indicator, request_lower):
            # Note: moderate/complex already checked above, so this is safe
            return TaskComplexity.SIMPLE

    # Default: SIMPLE if unclear
    return TaskComplexity.SIMPLE


def should_use_orchestrator(
    request: str,
    complexity: TaskComplexity | None = None
) -> Tuple[bool, str]:
    """Decide if orchestrator is worth the overhead.

    Evaluates whether the task complexity justifies the orchestrator's
    startup and coordination overhead.

    Args:
        request: The user's request string.
        complexity: Pre-detected complexity, or None to auto-detect.

    Returns:
        A tuple of (use_orchestrator: bool, reason: str).

    Examples:
        >>> should_use_orchestrator("Che ore sono?")
        (False, "Quick response - no orchestrator needed")
        >>> should_use_orchestrator("Fix typo in README.md")
        (False, "Simple single-file task - direct execution faster")
        >>> should_use_orchestrator("Refactor auth system with database and API")
        (True, "Complex multi-domain task - orchestrator required")
    """
    if complexity is None:
        complexity = detect_task_complexity(request)

    decisions: dict[TaskComplexity, Tuple[bool, str]] = {
        TaskComplexity.TRIVIAL: (False, "Quick response - no orchestrator needed"),
        TaskComplexity.SIMPLE: (False, "Simple single-file task - direct execution faster"),
        TaskComplexity.MODERATE: (True, "Moderate complexity - orchestrator beneficial"),
        TaskComplexity.COMPLEX: (True, "Complex multi-domain task - orchestrator required"),
    }

    use_orchestrator, reason = decisions.get(complexity, (True, "Default to orchestrator"))
    logger.info(
        f"Orchestration decision: {use_orchestrator} "
        f"(complexity={complexity.value}, reason={reason})"
    )

    return use_orchestrator, reason


def get_execution_mode(complexity: TaskComplexity) -> str:
    """Get recommended execution mode based on complexity.

    Args:
        complexity: The detected task complexity level.

    Returns:
        Execution mode string: "direct", "orchestrator_parallel", or
        "orchestrator_full".

    Examples:
        >>> get_execution_mode(TaskComplexity.TRIVIAL)
        'direct'
        >>> get_execution_mode(TaskComplexity.COMPLEX)
        'orchestrator_full'
    """
    modes: dict[TaskComplexity, str] = {
        TaskComplexity.TRIVIAL: "direct",
        TaskComplexity.SIMPLE: "direct",
        TaskComplexity.MODERATE: "orchestrator_parallel",
        TaskComplexity.COMPLEX: "orchestrator_full",
    }
    return modes.get(complexity, "orchestrator_full")


# CLI testing
if __name__ == "__main__":
    test_cases: list[tuple[str, TaskComplexity]] = [
        ("Che ore sono?", TaskComplexity.TRIVIAL),
        ("Come stai?", TaskComplexity.TRIVIAL),
        ("Fix typo in README.md", TaskComplexity.SIMPLE),
        ("Analyze login.py file", TaskComplexity.SIMPLE),
        ("Fix auth bug and update database schema", TaskComplexity.MODERATE),
        ("Refactor auth system with database and API integration", TaskComplexity.COMPLEX),
        ("Plan full-stack feature with UI, backend, and tests", TaskComplexity.COMPLEX),
    ]

    print("Conditional Orchestrator Activation - FIX #1")
    print("=" * 60)

    for request, expected_complexity in test_cases:
        detected_complexity = detect_task_complexity(request)
        use_orch, reason = should_use_orchestrator(request, detected_complexity)
        mode = get_execution_mode(detected_complexity)

        match_symbol = "[OK]" if detected_complexity == expected_complexity else "[FAIL]"

        print(f"\n{match_symbol} Request: {request}")
        print(f"  Complexity: {detected_complexity.value} (expected: {expected_complexity.value})")
        print(f"  Use Orchestrator: {use_orch} ({reason})")
        print(f"  Execution Mode: {mode}")
