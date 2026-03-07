"""
Intelligent Model Selection - FIX Model Assignment

FIX #7: Now uses keyword-mappings.json as PRIMARY SOURCE

Instead of using OPUS (25x cost) for almost everything,
use smart selection based on task type, complexity, and domain.

COST MULTIPLIERS:
- haiku:  1x   (mechanical, analysis, simple tasks) -> glm-4.5-air
- sonnet: 5x   (coding, debugging, most expert tasks) -> glm-4.7
- opus:   25x  (architecture, security, complex decisions) -> glm-5

SELECTION LOGIC (UPDATED):
1. Check if explicit model requested
2. Check keyword-mappings.json for domain default (PRIMARY SOURCE) ⭐ NEW
3. Check task complexity
4. Fall back to smart defaults (AGENT_MODEL_DEFAULTS)
"""

import json
import logging
import re
from pathlib import Path
from typing import Optional, Dict, Any, List
from enum import Enum

logger = logging.getLogger("orchestrator-mcp")

# FIX #7: Import synchronization module
from .model_selector_sync import load_keyword_model_mappings, create_unified_agent_model_map
from typing import Tuple, Dict, List, Any


class ModelType(Enum):
    """Available model types."""
    HAIKU = "haiku"
    SONNET = "sonnet"
    OPUS = "opus"


# Cost multipliers
COST_MULTIPLIERS = {
    ModelType.HAIKU: 1,
    ModelType.SONNET: 5,
    ModelType.OPUS: 25,
}


# Model capabilities
MODEL_CAPABILITIES = {
    ModelType.HAIKU: {
        "best_for": ["mechanical", "analysis", "documentation", "simple_search"],
        "token_limit": 200000,
        "speed": "fastest",
        "cost": "lowest",
        "actual_model": "glm-4.5-air"  # GLM Air for fastest responses
    },
    ModelType.SONNET: {
        "best_for": ["coding", "debugging", "expert_knowledge", "refactoring"],
        "token_limit": 200000,
        "speed": "fast",
        "cost": "medium",
        "actual_model": "glm-4.7"  # GLM-4.7 for balanced performance
    },
    ModelType.OPUS: {
        "best_for": ["architecture", "security", "complex_reasoning", "creative"],
        "token_limit": 200000,
        "speed": "medium",
        "cost": "highest",
        "actual_model": "glm-5"  # GLM-5 for maximum capability
    }
}


# Smart defaults by agent type
AGENT_MODEL_DEFAULTS = {
    # Core agents - optimized
    "analyzer": ModelType.HAIKU,
    "documenter": ModelType.HAIKU,
    "system_coordinator": ModelType.HAIKU,

    # Core agents - need power
    "coder": ModelType.SONNET,  # Was opus, sonnet is enough for most coding
    "reviewer": ModelType.SONNET,  # Was opus, sonnet enough for review
    "debugger": ModelType.SONNET,

    # Experts - most don't need opus
    "gui-super-expert": ModelType.SONNET,
    "database_expert": ModelType.SONNET,
    "tester_expert": ModelType.SONNET,
    "integration_expert": ModelType.SONNET,
    "languages_expert": ModelType.SONNET,
    "mobile_expert": ModelType.SONNET,
    "ai_integration_expert": ModelType.SONNET,
    "claude_systems_expert": ModelType.SONNET,
    "notification_expert": ModelType.SONNET,
    "browser_automation_expert": ModelType.SONNET,
    "mcp_integration_expert": ModelType.SONNET,
    "payment_integration_expert": ModelType.SONNET,
    "social_identity_expert": ModelType.SONNET,
    "n8n_expert": ModelType.SONNET,

    # MQL & Trading - need opus for complex strategies
    "mql_expert": ModelType.SONNET,
    "trading_strategy_expert": ModelType.SONNET,

    # Security & Architecture - NEED OPUS
    "security_unified_expert": ModelType.OPUS,  # Security needs best reasoning
    "offensive_security_expert": ModelType.OPUS,  # Pentesting needs creativity
    "reverse_engineering_expert": ModelType.OPUS,  # Complex analysis
    "architect_expert": ModelType.OPUS,  # Architecture decisions

    # DevOps - mechanical
    "devops_expert": ModelType.HAIKU,  # Deploy is mostly mechanical
}


class IntelligentModelSelector:
    """
    Selects the appropriate model based on:
    1. Explicit user request
    2. Domain keyword mappings
    3. Agent type defaults
    4. Task complexity
    """

    def __init__(self, keyword_mappings_file: Optional[Path] = None):
        """Initialize model selector with FIX #7: keyword-mappings integration."""
        self.keyword_mappings = {}
        self.domain_model_map = {}
        self.domain_keywords_map = {}  # FIX #7b: Store keywords for each domain

        # FIX #7: Load keyword-mappings.json as PRIMARY SOURCE
        if keyword_mappings_file is None:
            keyword_mappings_file = Path(__file__).parent.parent / "config" / "keyword-mappings.json"

        if keyword_mappings_file.exists():
            self.domain_model_map, self.domain_keywords_map = load_keyword_model_mappings(keyword_mappings_file)
            logger.info(f"Loaded {len(self.domain_model_map)} domain models from keyword-mappings.json")
            logger.info(f"Loaded {len(self.domain_keywords_map)} domain keyword lists from keyword-mappings.json")
        else:
            logger.warning(f"keyword-mappings.json not found at {keyword_mappings_file}, using defaults only")

    def _load_keyword_mappings(self, mappings_file: Path) -> None:
        """Load domain->model mappings from keyword-mappings.json."""
        try:
            with open(mappings_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Extract model from domain_mappings
            for domain_name, domain_config in data.get('domain_mappings', {}).items():
                model = domain_config.get('model', 'sonnet')
                self.domain_model_map[domain_name] = model

            logger.info(f"Loaded domain model mappings: {len(self.domain_model_map)} domains")

        except Exception as e:
            logger.warning(f"Failed to load keyword mappings: {e}")

    def select_model(
        self,
        agent_type: str,
        user_request: str = "",
        explicit_model: Optional[str] = None,
        task_complexity: Optional[str] = None
    ) -> str:
        """
        Select appropriate model for a task.

        FIX #7: Now uses keyword-mappings.json as PRIMARY SOURCE.

        Args:
            agent_type: Type of agent (coder, architect, etc.)
            user_request: The user's request text
            explicit_model: Explicitly requested model
            task_complexity: Task complexity (trivial, simple, moderate, complex)

        Returns:
            Model name (haiku, sonnet, opus)
        """
        # 1. Explicit request overrides everything
        if explicit_model and explicit_model in ["haiku", "sonnet", "opus"]:
            logger.debug(f"Using explicit model: {explicit_model}")
            return explicit_model

        # 2. FIX #7: Check domain keywords using keyword-mappings.json (PRIMARY SOURCE)
        domain_model = self._check_domain_keywords_from_mappings(user_request)
        if domain_model:
            logger.debug(f"Using keyword-mappings domain model: {domain_model}")
            return domain_model

        # 3. Use agent type defaults (FALLBACK)
        agent_model = AGENT_MODEL_DEFAULTS.get(agent_type)
        if agent_model:
            # Adjust based on complexity
            if task_complexity == "trivial":
                return ModelType.HAIKU.value
            elif task_complexity == "complex" and agent_model == ModelType.SONNET:
                return ModelType.OPUS.value
            return agent_model.value

        # 4. Default to sonnet (good balance)
        logger.debug(f"Using default model: sonnet")
        return ModelType.SONNET.value

    def _check_domain_keywords_from_mappings(self, request: Optional[str]) -> Optional[str]:
        """
        FIX #7: Check domain keywords using loaded keyword-mappings.json.

        This replaces the hardcoded domain checks with the authoritative
        mappings from keyword-mappings.json. Now uses actual keyword matching.

        Each domain has a list of keywords. If ANY keyword matches, use that domain's model.
        Priority: domains with CRITICAL priority > ALTA > MEDIA
        """
        if not request:
            return None
        request_lower = request.lower()

        # Priority levels for tiebreaking
        priority_order = ["CRITICA", "ALTA", "MEDIA", "BASSA"]

        # Find all matching domains with their priority
        matches = []

        # Check all domains in keyword-mappings.json
        for domain, model in self.domain_model_map.items():
            keywords = self.domain_keywords_map.get(domain, [])

            # Check if any keyword matches
            for keyword in keywords:
                if keyword in request_lower:
                    # Get priority from keyword-mappings (need to load it)
                    priority = self._get_domain_priority(domain)
                    matches.append((priority, domain, model))
                    logger.debug(f"Keyword '{keyword}' matched domain '{domain}', using model: {model}")
                    break  # One keyword match is enough per domain

        if not matches:
            return None

        # Sort by priority (highest first) and return best match
        matches.sort(key=lambda x: priority_order.index(x[0]) if x[0] in priority_order else 99)
        best_match = matches[0]
        logger.debug(f"Best match: domain '{best_match[1]}' with priority {best_match[0]}, using model: {best_match[2]}")
        return best_match[2]

    def _get_domain_priority(self, domain: str) -> str:
        """Get priority level for a domain from keyword-mappings.json."""
        # This is a simplified version - in production, cache the priorities
        mappings_file = Path(__file__).parent.parent / "config" / "keyword-mappings.json"
        if mappings_file.exists():
            try:
                with open(mappings_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                # Check domain_mappings
                if domain in data.get('domain_mappings', {}):
                    return data['domain_mappings'][domain].get('priority', 'MEDIA')
                # Check core_functions
                if domain in data.get('core_functions', {}):
                    return data['core_functions'][domain].get('priority', 'MEDIA')
            except Exception:
                pass
        return 'MEDIA'  # Default priority

    # Legacy method - now uses keyword-mappings.json via _check_domain_keywords_from_mappings
    def _check_domain_keywords(self, request: str) -> Optional[str]:
        """
        Check if request contains domain keywords with specific model preference.

        DEPRECATED: Use _check_domain_keywords_from_mappings instead.
        This method is kept for backward compatibility.
        """
        # First try the new method
        result = self._check_domain_keywords_from_mappings(request)
        if result:
            return result

        # Fallback to legacy logic for domains not in keyword-mappings.json
        return self._legacy_check_domain_keywords(request)

    def _legacy_check_domain_keywords(self, request: str) -> Optional[str]:
        """Legacy domain keyword checking for backward compatibility."""
        request_lower = request.lower()

        # Domains that prefer opus
        opus_domains = {
            "architecture": ["architecture", "architettura", "design pattern", "system design", "microservices"],
            "security": ["security", "pentesting", "exploit", "vulnerability", "owasp", "reverse engineer"],
        }

        # Domains that prefer sonnet
        sonnet_domains = {
            "gui": ["gui", "pyqt", "qt", "widget", "layout", "ui"],
            "database": ["database", "sql", "query", "schema", "migration"],
            "testing": ["test", "debug", "qa", "bug"],
            "mql": ["mql", "mql5", "expert advisor", "metatrader", "forex"],
            "trading": ["trading", "strategy", "risk", "position"],
            "integration": ["api", "webhook", "rest", "integration"],
            "languages": ["python", "javascript", "coding", "refactor"],
            "ai": ["ai", "llm", "gpt", "embedding", "rag"],
        }

        # Check opus domains first
        for domain, keywords in opus_domains.items():
            if any(kw in request_lower for kw in keywords):
                return ModelType.OPUS.value

        # Check sonnet domains
        for domain, keywords in sonnet_domains.items():
            if any(kw in request_lower for kw in keywords):
                return ModelType.SONNET.value

        return None

    def get_model_for_agent_file(self, agent_file: str, user_request: str = "") -> str:
        """
        Get model for agent file path.

        Args:
            agent_file: Agent file path (e.g., 'experts/database_expert.md')
            user_request: Optional user request for context

        Returns:
            Model name (haiku, sonnet, opus)
        """
        # Extract agent type from file path
        if "core/" in agent_file:
            agent_type = agent_file.split("/")[-1].replace(".md", "")
        elif "experts/L2/" in agent_file:
            agent_type = agent_file.split("/")[-1].replace(".md", "")
            # L2 agents inherit from parent L1 defaults
            # Map L2 to L1 equivalent
            l1_mapping = {
                "gui-layout-specialist": "gui-super-expert",
                "db-query-optimizer": "database_expert",
                "security-auth-specialist": "security_unified_expert",
                "mql-optimization": "mql_expert",
                "trading-risk-calculator": "trading_strategy_expert",
                "test-unit-specialist": "tester_expert",
                "architect-design-specialist": "architect_expert",
                "api-endpoint-builder": "integration_expert",
                "devops-pipeline-specialist": "devops_expert",
                "languages-refactor-specialist": "languages_expert",
                "ai-model-specialist": "ai_integration_expert",
                "claude-prompt-optimizer": "claude_systems_expert",
                "mobile-ui-specialist": "mobile_expert",
                "n8n-workflow-builder": "n8n_expert",
                "social-oauth-specialist": "social_identity_expert",
            }
            agent_type = l1_mapping.get(agent_type, agent_type)
        elif "experts/" in agent_file:
            agent_type = agent_file.split("/")[-1].replace(".md", "")
        else:
            agent_type = "coder"  # Default

        return self.select_model(agent_type, user_request)

    def calculate_cost_savings(self, agent_assignments: Dict[str, str]) -> Dict[str, Any]:
        """
        Calculate cost savings compared to using opus for everything.

        Args:
            agent_assignments: Dict of {agent_file: model}

        Returns:
            Cost savings report
        """
        total_cost = 0
        opus_cost = 0
        breakdown = []

        for agent_file, model in agent_assignments.items():
            cost = COST_MULTIPLIERS[ModelType(model)]
            total_cost += cost
            opus_cost += COST_MULTIPLIERS[ModelType.OPUS]

            breakdown.append({
                "agent": agent_file,
                "model": model,
                "cost": cost,
                "saved": COST_MULTIPLIERS[ModelType.OPUS] - cost
            })

        savings = opus_cost - total_cost
        savings_percent = round((1 - total_cost / opus_cost) * 100, 1) if opus_cost > 0 else 0

        return {
            "total_agents": len(agent_assignments),
            "total_cost": total_cost,
            "opus_cost": opus_cost,
            "savings": savings,
            "savings_percent": savings_percent,
            "breakdown": breakdown
        }


# Singleton instance
_model_selector: Optional[IntelligentModelSelector] = None


def get_model_selector() -> IntelligentModelSelector:
    """Get global model selector instance."""
    global _model_selector
    if _model_selector is None:
        config_dir = Path(__file__).parent.parent / "config"
        mappings_file = config_dir / "keyword-mappings.json"
        _model_selector = IntelligentModelSelector(mappings_file)
    return _model_selector


# CLI testing
if __name__ == "__main__":
    print("Intelligent Model Selection - FIX Model Assignment")
    print("=" * 70)

    selector = IntelligentModelSelector(
        Path(__file__).parent.parent / "config" / "keyword-mappings.json"
    )

    # Show loaded mappings
    print(f"\nLoaded {len(selector.domain_model_map)} domain models")
    print(f"Loaded {len(selector.domain_keywords_map)} domain keyword lists")

    # Test keyword matching
    print("\n" + "=" * 70)
    print("Keyword Matching Test:")
    print("=" * 70)

    test_requests = [
        ("Fix PyQt5 layout issue", "gui domain -> sonnet"),
        ("Optimize SQL query performance", "database domain -> sonnet"),
        ("Deploy to production", "devops domain -> haiku"),
        ("Design system architecture", "architecture domain -> opus"),
        ("Write unit tests", "testing domain -> sonnet"),
        ("Update documentation", "documentation -> haiku"),
    ]

    for request, expected in test_requests:
        model = selector._check_domain_keywords_from_mappings(request)
        print(f"\nRequest: '{request}'")
        print(f"  -> Model: {model or 'None'}")
        print(f"  Expected: {expected}")

    # Test cases
    test_cases = [
        # (agent_type, user_request, expected_reasoning)
        ("analyzer", "Analyze the codebase", "haiku - mechanical analysis"),
        ("coder", "Fix login bug", "sonnet - normal coding"),
        ("architect", "Design system architecture", "opus - architecture"),
        ("security_unified_expert", "Review security", "opus - security critical"),
        ("devops_expert", "Deploy to production", "haiku - mechanical"),
        ("gui-super-expert", "Fix PyQt5 layout", "sonnet - GUI expert"),
        ("database_expert", "Optimize SQL query", "sonnet - database expert"),
        ("tester_expert", "Write unit tests", "sonnet - testing"),
    ]

    print("\nTest Cases:")
    for agent_type, request, reasoning in test_cases:
        model = selector.select_model(agent_type, request)
        cost = COST_MULTIPLIERS[ModelType(model)]
        print(f"\n{agent_type:30} + '{request}'")
        print(f"  -> Model: {model:8} (cost: {cost}x)")
        print(f"  Reasoning: {reasoning}")

    # Cost comparison for typical workflow
    print("\n" + "=" * 70)
    print("Cost Comparison: Typical 10-Agent Workflow")

    typical_workflow = {
        "core/analyzer.md": "Analyze codebase",
        "core/coder.md": "Fix bugs",
        "core/reviewer.md": "Review changes",
        "core/documenter.md": "Update docs",
        "experts/gui-super-expert.md": "Fix UI",
        "experts/database_expert.md": "Update schema",
        "experts/security_unified_expert.md": "Security review",
        "experts/tester_expert.md": "Add tests",
        "experts/integration_expert.md": "API changes",
        "experts/architect_expert.md": "Design decision",
    }

    # Old system (all opus except 3)
    old_assignments = {
        "core/analyzer.md": "haiku",
        "core/coder.md": "opus",
        "core/reviewer.md": "opus",
        "core/documenter.md": "haiku",
        "experts/gui-super-expert.md": "opus",
        "experts/database_expert.md": "opus",
        "experts/security_unified_expert.md": "opus",
        "experts/tester_expert.md": "opus",
        "experts/integration_expert.md": "opus",
        "experts/architect_expert.md": "opus",
    }

    # New system (intelligent)
    new_assignments = {}
    for agent_file, request in typical_workflow.items():
        new_assignments[agent_file] = selector.get_model_for_agent_file(agent_file, request)

    old_cost = sum(COST_MULTIPLIERS[ModelType(m)] for m in old_assignments.values())
    new_cost = sum(COST_MULTIPLIERS[ModelType(m)] for m in new_assignments.values())

    print(f"\nOld System (mostly opus):")
    print(f"  Total cost: {old_cost}x")
    print(f"  Distribution: {sum(1 for m in old_assignments.values() if m == 'opus')} opus, "
          f"{sum(1 for m in old_assignments.values() if m == 'haiku')} haiku")

    print(f"\nNew System (intelligent):")
    print(f"  Total cost: {new_cost}x")
    print(f"  Distribution: {sum(1 for m in new_assignments.values() if m == 'opus')} opus, "
          f"{sum(1 for m in new_assignments.values() if m == 'sonnet')} sonnet, "
          f"{sum(1 for m in new_assignments.values() if m == 'haiku')} haiku")

    savings = old_cost - new_cost
    savings_percent = round((1 - new_cost / old_cost) * 100, 1)
    print(f"\n[$] Savings: {savings}x ({savings_percent}% reduction)")
