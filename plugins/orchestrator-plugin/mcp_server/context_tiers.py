"""
Tiered Context Injection - FIX #2

Instead of injecting 1500+ tokens to EVERY sub-agent,
use tiered context based on task type and model.

TIERS:
- minimal:   Mechanical tasks only (analyzer, documenter with haiku)
- standard:  Normal coding tasks (most cases)
- full:      Architecture, security, complex decisions
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

logger = logging.getLogger("orchestrator-mcp")


class ContextTier(Enum):
    """Context injection tier for sub-agent prompts.

    Attributes:
        MINIMAL: ~200 tokens - mechanical tasks only
        STANDARD: ~800 tokens - normal coding tasks
        FULL: ~1500 tokens - architecture/security with full analysis

    Examples:
        >>> ContextTier.MINIMAL.value
        'minimal'
        >>> get_tier_tokens(ContextTier.STANDARD)
        800
    """
    MINIMAL = "minimal"     # ~200 tokens
    STANDARD = "standard"   # ~800 tokens
    FULL = "full"          # ~1500 tokens


def get_tier_tokens(tier: ContextTier) -> int:
    """Get max tokens for a context tier.

    Args:
        tier: The context tier

    Returns:
        Max token budget for this tier

    Examples:
        >>> get_tier_tokens(ContextTier.MINIMAL)
        200
    """
    return CONTEXT_TIER_CONFIGS[tier]["max_tokens"]


def get_tier_name(tier: ContextTier) -> str:
    """Get human-readable name for a context tier.

    Args:
        tier: The context tier

    Returns:
        Human-readable name

    Examples:
        >>> get_tier_name(ContextTier.FULL)
        'Full'
    """
    return CONTEXT_TIER_CONFIGS[tier]["name"]


@dataclass
class ContextTierConfig:
    """Configuration for a context tier.

    Attributes:
        name: Human-readable name
        max_tokens: Maximum token budget
        description: What this tier is for
        include_rules: Whether to include rules
        include_memory: Whether to include memory
        execution_rules: Execution mode description
    """
    name: str
    max_tokens: int
    description: str
    include_rules: bool
    include_memory: bool
    execution_rules: str


# Context tier definitions
CONTEXT_TIER_CONFIGS: dict[ContextTier, dict[str, Any]] = {
    ContextTier.MINIMAL: {
        "name": "Minimal",
        "max_tokens": 200,
        "description": "Mechanical tasks only - no extra context",
        "include_rules": False,
        "include_memory": False,
        "execution_rules": "EXECUTE ONLY. NO EXTRAS. Report result.",
    },
    ContextTier.STANDARD: {
        "name": "Standard",
        "max_tokens": 800,
        "description": "Normal coding tasks with relevant context",
        "include_rules": True,
        "include_memory": True,
        "execution_rules": "Standard execution with memory and rules.",
    },
    ContextTier.FULL: {
        "name": "Full",
        "max_tokens": 1500,
        "description": "Architecture/Security with full analysis capabilities",
        "include_rules": True,
        "include_memory": True,
        "execution_rules": "Full execution with analysis, patterns, and best practices.",
    }
}


# Agent -> Tier mapping (default mappings)
AGENT_TIER_MAPPING: dict[str, dict[str, ContextTier | str]] = {
    # Mechanical/analysis tasks -> MINIMAL when using haiku
    "analyzer": {"haiku": ContextTier.MINIMAL, "opus": ContextTier.STANDARD},
    "documenter": {"haiku": ContextTier.MINIMAL, "opus": ContextTier.STANDARD},

    # Standard coding -> STANDARD
    "coder": {"default": ContextTier.STANDARD},
    "reviewer": {"default": ContextTier.STANDARD},
    "tester": {"default": ContextTier.STANDARD},

    # Architecture/Security -> FULL
    "architect": {"default": ContextTier.FULL},
    "security-unified-expert": {"default": ContextTier.FULL},
    "offensive-security-expert": {"default": ContextTier.FULL},
}


def get_context_tier(
    agent_type: str,
    model: str | None = None,
    task_type: str | None = None
) -> ContextTier:
    """Determine appropriate context tier for an agent.

    Args:
        agent_type: Type of agent (analyzer, coder, architect, etc.)
        model: Model being used (haiku, opus, sonnet)
        task_type: Optional task type hint (mechanical, standard, complex)

    Returns:
        ContextTier to use for this agent.

    Examples:
        >>> get_context_tier("analyzer", "haiku")
        <ContextTier.MINIMAL: 'minimal'>
        >>> get_context_tier("architect", "opus")
        <ContextTier.FULL: 'full'>
    """
    # Check explicit mapping
    if agent_type in AGENT_TIER_MAPPING:
        agent_config = AGENT_TIER_MAPPING[agent_type]

        # Model-specific tier
        if model and model in agent_config:
            return agent_config[model]  # type: ignore

        # Default tier for this agent
        if "default" in agent_config:
            return agent_config["default"]  # type: ignore

    # Task type override
    if task_type:
        if task_type == "mechanical":
            return ContextTier.MINIMAL
        elif task_type == "complex":
            return ContextTier.FULL
        # Other task_types fall through to default below

    # Default: STANDARD for most cases
    # Note: analyzer/documenter with haiku already handled above (lines 164-173)
    return ContextTier.STANDARD


def build_context_injection(
    tier: ContextTier,
    rules: dict[str, str] | None = None,
    memory: str | None = None
) -> str:
    """Build context injection string based on tier.

    Args:
        tier: Context tier to use
        rules: Optional rules dict (only included if tier allows)
        memory: Optional memory string (only included if tier allows)

    Returns:
        Context injection string to prepend to agent prompt.

    Examples:
        >>> build_context_injection(ContextTier.MINIMAL)
        '## EXECUTION MODE: MINIMAL\\nEXECUTE ONLY. NO EXTRAS. Report result.\\n'
    """
    config = CONTEXT_TIER_CONFIGS[tier]
    parts: list[str] = []

    # Execution rules
    parts.append(f"## EXECUTION MODE: {config['name'].upper()}")
    parts.append(config["execution_rules"])
    parts.append("")

    # Rules (if allowed by tier)
    if config["include_rules"] and rules:
        parts.append("## RELEVANT RULES")
        # Include only most critical rules to stay within token budget
        critical_rules = list(rules.values())[:5]  # Max 5 rules
        for rule in critical_rules:
            if isinstance(rule, str):
                parts.append(f"- {rule[:200]}...")  # Truncate long rules
        parts.append("")

    # Memory (if allowed by tier)
    if config["include_memory"] and memory:
        parts.append("## PROJECT MEMORY")
        # Truncate memory to fit tier budget
        max_memory_chars = 1000 if tier == ContextTier.FULL else 500
        if len(memory) > max_memory_chars:
            memory = memory[:max_memory_chars] + "..."
        parts.append(memory)
        parts.append("")

    return "\n".join(parts)


def estimate_token_count(
    tier: ContextTier,
    rules_count: int = 0,
    memory_length: int = 0
) -> int:
    """Estimate total token count for a given tier.

    Args:
        tier: Context tier
        rules_count: Number of rules being injected
        memory_length: Length of memory string in characters

    Returns:
        Estimated token count.

    Examples:
        >>> estimate_token_count(ContextTier.MINIMAL)
        200
        >>> estimate_token_count(ContextTier.STANDARD, rules_count=5, memory_length=500)
        975
    """
    base = CONTEXT_TIER_CONFIGS[tier]["max_tokens"]

    # Rough estimate: 4 chars ≈ 1 token
    memory_tokens = (
        memory_length // 4 if CONTEXT_TIER_CONFIGS[tier]["include_memory"] else 0
    )
    rules_tokens = (
        rules_count * 50 if CONTEXT_TIER_CONFIGS[tier]["include_rules"] else 0
    )

    return base + memory_tokens + rules_tokens


def get_token_savings_report(tier_assignments: dict[str, ContextTier]) -> dict[str, Any]:
    """Calculate token savings compared to using FULL tier for everyone.

    Args:
        tier_assignments: Dict of {agent_name: tier}

    Returns:
        Report with savings calculations including total_agents, tokens_saved,
        and savings_percent.

    Examples:
        >>> assignments = {"analyzer(haiku)": ContextTier.MINIMAL}
        >>> report = get_token_savings_report(assignments)
        >>> report["savings_percent"]
        86.7
    """
    full_tier_tokens = CONTEXT_TIER_CONFIGS[ContextTier.FULL]["max_tokens"]

    total_actual = 0
    total_full = 0
    breakdown: list[dict[str, Any]] = []

    for agent, tier in tier_assignments.items():
        actual_tokens = CONTEXT_TIER_CONFIGS[tier]["max_tokens"]
        total_actual += actual_tokens
        total_full += full_tier_tokens

        breakdown.append({
            "agent": agent,
            "tier": tier.value,
            "tokens": actual_tokens,
            "saved": full_tier_tokens - actual_tokens
        })

    return {
        "total_agents": len(tier_assignments),
        "total_actual_tokens": total_actual,
        "total_full_tokens": total_full,
        "tokens_saved": total_full - total_actual,
        "savings_percent": round((1 - total_actual / total_full) * 100, 1),
        "breakdown": breakdown
    }


# CLI testing
if __name__ == "__main__":
    print("Tiered Context Injection - FIX #2")
    print("=" * 60)

    # Test scenario: 10 agents
    test_agents: list[tuple[str, str]] = [
        ("analyzer", "haiku"),
        ("documenter", "haiku"),
        ("coder", "opus"),
        ("reviewer", "opus"),
        ("tester", "haiku"),
        ("architect", "opus"),
        ("security-unified-expert", "opus"),
        ("database-expert", "opus"),
        ("gui-super-expert", "opus"),
        ("documenter", "opus"),
    ]

    tier_assignments: dict[str, ContextTier] = {}
    for agent_type, model in test_agents:
        tier = get_context_tier(agent_type, model)
        tier_assignments[f"{agent_type}({model})"] = tier
        print(
            f"{agent_type:30} + {model:8} -> "
            f"{tier.value:8} ({get_tier_tokens(tier)} tokens)"
        )

    print("\n" + "=" * 60)
    report = get_token_savings_report(tier_assignments)
    print(f"\nToken Savings Report:")
    print(f"  Agents: {report['total_agents']}")
    print(f"  Actual tokens: {report['total_actual_tokens']}")
    print(f"  Full tier tokens: {report['total_full_tokens']}")
    print(f"  Tokens saved: {report['tokens_saved']}")
    print(f"  Savings: {report['savings_percent']}%")
