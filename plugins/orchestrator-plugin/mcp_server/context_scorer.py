"""
Simplified Context Scoring for Orchestrator V12.6

FIX #4: Instead of complex 7-factor scoring system with points,
use simple yes/no check: do we have WHAT + WHERE?

If yes -> proceed
If no -> ask clarifying question
"""

from __future__ import annotations

import logging
import re
from enum import Enum
from typing import Optional

logger = logging.getLogger("orchestrator-mcp")


class ContextStatus(Enum):
    """Context completeness status for NO-IMPROVISE protocol.

    Attributes:
        SUFFICIENT: Both WHAT (action) and WHERE (target) are clear
        NEEDS_WHAT: Action is unclear, needs clarification
        NEEDS_WHERE: Target is unclear, needs clarification
        NEEDS_BOTH: Both action and target are unclear

    Examples:
        >>> ContextStatus.SUFFICIENT.value
        'sufficient'
    """
    SUFFICIENT = "sufficient"
    NEEDS_WHAT = "needs_what"
    NEEDS_WHERE = "needs_where"
    NEEDS_BOTH = "needs_both"


# Common action keywords in Italian and English
ACTION_PATTERNS: list[str] = [
    r'\b(fix|fixare|correggere)\b',
    r'\b(add|aggiungere|aggiungi)\b',
    r'\b(create|creare|crea)\b',
    r'\b(update|aggiornare|modificare)\b',
    r'\b(remove|delete|eliminare|rimuovere)\b',
    r'\b(refactor|refactoring)\b',
    r'\b(analyze|analizz|analizzare)\b',
    r'\b(review|revisionare)\b',
    r'\b(test|testare)\b',
    r'\b(debug|debuggare)\b',
    r'\b(document|documentare)\b',
    r'\b(implement|implementare)\b',
    r'\b(build|costruire)\b',
    r'\b(deploy|distribuire)\b',
]

# Domain keywords for target extraction
DOMAIN_KEYWORDS: list[str] = [
    'auth', 'login', 'database', 'db', 'api', 'endpoint',
    'ui', 'frontend', 'backend', 'service', 'controller',
    'model', 'view', 'component', 'module', 'package',
    'gui', 'widget', 'layout', 'style', 'css',
    'test', 'spec', 'mock', 'fixture'
]


def extract_action(text: str) -> Optional[str]:
    """Extract the action (WHAT) from user request.

    Looks for common action verbs in both Italian and English.
    Returns the first matching action keyword.

    Args:
        text: The user's request string.

    Returns:
        The extracted action keyword, or None if no action found.

    Examples:
        >>> extract_action("Fix the login bug")
        'fix'
        >>> extract_action("Aggiungi nuova feature")
        'add'
        >>> extract_action("Just testing")
        None
    """
    text_lower = text.lower()
    for pattern in ACTION_PATTERNS:
        if re.search(pattern, text_lower):
            match = re.search(pattern, text_lower)
            return match.group(1) if match else None

    return None


def extract_target(text: str) -> Optional[str]:
    """Extract the target (WHERE) from user request.

    Looks for file paths, component names, or domain keywords.

    Args:
        text: The user's request string.

    Returns:
        The extracted target (file path, component name, or keyword),
        or None if no target found.

    Examples:
        >>> extract_target("Fix auth/login.py")
        'auth/login.py'
        >>> extract_target("Update UserService")
        'UserService'
        >>> extract_target("Fix database issue")
        'database'
    """
    # File paths with extensions
    file_pattern = r'\b[\w/\\-]+\.(py|ts|tsx|js|jsx|go|md|json|yaml|yml|sql)\b'
    if re.search(file_pattern, text):
        match = re.search(file_pattern, text)
        return match.group(0) if match else None

    # Component names (PascalCase, min 3 chars)
    component_pattern = r'\b[A-Z][a-zA-Z0-9]{2,}\b'
    if re.search(component_pattern, text):
        matches = re.findall(component_pattern, text)
        # re.search already verified there's at least one match
        return matches[0]

    # Domain keywords
    text_lower = text.lower()
    for keyword in DOMAIN_KEYWORDS:
        if keyword in text_lower:
            return keyword

    return None


def is_quick_response_request(text: str) -> bool:
    """Check if this is a quick response that doesn't need orchestrator.

    Quick patterns include greetings, time queries, and thanks.

    Args:
        text: The user's request string.

    Returns:
        True if this is a quick response pattern, False otherwise.

    Examples:
        >>> is_quick_response_request("Che ore sono?")
        True
        >>> is_quick_response_request("Fix the bug")
        False
    """
    quick_patterns: list[str] = [
        r"^(che ore|ora e'|what time)",
        r"^(come stai|how are you)",
        r"^(ciao|hello|hi|hey|salve)",
        r"^(grazie|thank|thanks)",
        r"^(a dopo|see you|bye|ciao ciao)",
    ]

    text_lower = text.strip().lower()
    for pattern in quick_patterns:
        if re.match(pattern, text_lower, re.IGNORECASE):
            return True

    return False


def is_context_sufficient(request: str) -> tuple[bool, str, str]:
    """Simplified context check - FIX #4.

    Checks if the request has both WHAT (action) and WHERE (target).
    This is the core of the NO-IMPROVISE protocol.

    Args:
        request: The user's request string.

    Returns:
        A tuple of (is_sufficient: bool, status: str, question: str):
        - is_sufficient: True if context is complete
        - status: One of ContextStatus values
        - question: Clarifying question to ask user if insufficient

    Examples:
        >>> is_context_sufficient("Fix the login bug")
        (False, 'needs_where', 'Su cosa vuoi lavorare? ...')

        >>> is_context_sufficient("Come stai?")
        (True, 'quick_response', '')

        >>> is_context_sufficient("Fix TypeError in auth/login.py")
        (True, 'sufficient', '')
    """
    # Check for quick response first
    if is_quick_response_request(request):
        return True, "quick_response", ""

    # Extract WHAT (action)
    has_what = extract_action(request) is not None

    # Extract WHERE (target)
    has_where = extract_target(request) is not None

    # Make decision
    if has_what and has_where:
        return True, ContextStatus.SUFFICIENT.value, ""
    elif not has_what and not has_where:
        question = "Cosa vuoi fare e su cosa? (es: 'Fix bug nel file auth.py')"
        return False, ContextStatus.NEEDS_BOTH.value, question
    elif not has_what:
        question = "Cosa vuoi fare? (es: fix, add, refactor, test, analyze)"
        return False, ContextStatus.NEEDS_WHAT.value, question
    else:  # not has_where (has_what=TRUE, has_where=FALSE already covered above, so this is unreachable)
        question = "Su cosa vuoi lavorare? (file, componente, modulo)"
        return False, ContextStatus.NEEDS_WHERE.value, question


def get_clarifying_questions(status: str) -> str:
    """Get the appropriate clarifying question based on status.

    Args:
        status: The ContextStatus value.

    Returns:
        The clarifying question to ask the user, or empty string
        if status is SUFFICIENT or quick_response.

    Examples:
        >>> get_clarifying_questions("needs_both")
        'Per procedere ho bisogno di chiarimenti:...'
        >>> get_clarifying_questions("sufficient")
        ''
    """
    questions: dict[str, str] = {
        ContextStatus.NEEDS_BOTH.value: (
            "Per procedere ho bisogno di chiarimenti:\n\n"
            "- **Cosa** vuoi fare? (fix, add, refactor, test, analyze...)\n"
            "- **Dove/ su cosa** vuoi lavorare? (file, componente, modulo)"
        ),
        ContextStatus.NEEDS_WHAT.value: (
            "Per procedere: **Cosa** vuoi fare?\n"
            "(es: fix bug, add feature, refactor code, run tests, analyze code)"
        ),
        ContextStatus.NEEDS_WHERE.value: (
            "Per procedere: **Dove/Su cosa** vuoi lavorare?\n"
            "(es: auth/login.py, UserService component, database module)"
        ),
        ContextStatus.SUFFICIENT.value: "",
        "quick_response": ""
    }
    return questions.get(status, "")


# CLI testing
if __name__ == "__main__":
    test_cases: list[str] = [
        "Fix the login bug",
        "Fix TypeError in auth/login.py",
        "Come stai?",
        "analizza il codice",
        "add validation",
        "create new component",
        "refactor UserService",
    ]

    print("Simplified Context Scoring - FIX #4")
    print("=" * 50)

    for test in test_cases:
        is_ok, status, question = is_context_sufficient(test)
        print(f"\nInput: {test}")
        print(f"  Status: {status}")
        print(f"  Sufficient: {is_ok}")
        if question:
            print(f"  Question: {question}")
