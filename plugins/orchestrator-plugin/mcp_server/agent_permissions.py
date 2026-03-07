"""
Agent Permissions System - FIX #9

Manages MCP tool permissions for sub-agents.

FEATURES:
- Define which agents can use which MCP tools
- Permission levels: NONE, READ, WRITE, FULL
- Per-agent and per-tool configuration
- Safe delegation of MCP capabilities

PERMISSION LEVELS:
- NONE: Agent cannot use MCP tools
- READ: Agent can use read-only MCP tools (web-reader, list resources)
- WRITE: Agent can use read + write MCP tools (read resources, some write)
- FULL: Agent can use all MCP tools (same as orchestrator)
"""

from __future__ import annotations

import json
import logging
from enum import Enum
from pathlib import Path
from typing import Any

logger = logging.getLogger("orchestrator-mcp")


class PermissionLevel(Enum):
    """Permission levels for MCP tool access.

    Each level grants progressively more tool access.

    Attributes:
        NONE: No MCP tool access
        READ: Read-only tools (web-reader, image analysis, list resources)
        WRITE: Read + Write tools (all above plus read resources)
        FULL: All MCP tools (same as orchestrator level)

    Examples:
        >>> PermissionLevel.READ.value
        'read'
        >>> PermissionLevel.FULL == PermissionLevel.FULL
        True
    """
    NONE = "none"
    READ = "read"
    WRITE = "write"
    FULL = "full"


# Default permissions for agent types
DEFAULT_PERMISSIONS: dict[str, PermissionLevel] = {
    # Core agents - limited permissions
    "analyzer": PermissionLevel.READ,
    "coder": PermissionLevel.WRITE,
    "reviewer": PermissionLevel.READ,
    "documenter": PermissionLevel.READ,
    "system_coordinator": PermissionLevel.FULL,

    # L1 Experts - varied based on domain
    "gui-super-expert": PermissionLevel.WRITE,
    "database_expert": PermissionLevel.WRITE,
    "tester_expert": PermissionLevel.WRITE,
    "integration_expert": PermissionLevel.FULL,  # Needs API access
    "devops_expert": PermissionLevel.WRITE,
    "languages_expert": PermissionLevel.WRITE,
    "ai_integration_expert": PermissionLevel.FULL,  # Needs AI API access
    "claude_systems_expert": PermissionLevel.READ,
    "mobile_expert": PermissionLevel.WRITE,
    "n8n_expert": PermissionLevel.WRITE,
    "social_identity_expert": PermissionLevel.WRITE,
    "mql_expert": PermissionLevel.WRITE,
    "trading_strategy_expert": PermissionLevel.READ,
    "security_unified_expert": PermissionLevel.READ,  # Security - read only
    "architect_expert": PermissionLevel.READ,
    "notification_expert": PermissionLevel.WRITE,
    "browser_automation_expert": PermissionLevel.WRITE,
    "mcp_integration_expert": PermissionLevel.FULL,
    "payment_integration_expert": PermissionLevel.WRITE,
    "offensive_security_expert": PermissionLevel.READ,  # Pentesting - read only
    "reverse_engineering_expert": PermissionLevel.READ,
}

# MCP tools by permission level
MCP_TOOLS_BY_LEVEL: dict[PermissionLevel, list[str]] = {
    PermissionLevel.NONE: [],
    PermissionLevel.READ: [
        "mcp__web_reader__webReader",  # Read web pages
        "mcp__4_5v_mcp__analyze_image",  # Analyze images
        "ListMcpResourcesTool",  # List available resources
    ],
    PermissionLevel.WRITE: [
        # All READ tools plus:
        "ReadMcpResourceTool",  # Read MCP resources
    ],
    PermissionLevel.FULL: [
        # All tools - orchestrator level access
        # Empty list means "all tools" are available
    ]
}


class AgentPermissionManager:
    """Manages MCP tool permissions for agents.

    This class handles permission checking and tool delegation for sub-agents,
    ensuring that agents only have access to appropriate MCP tools based on
    their domain and security requirements.

    Attributes:
        permissions: Dict mapping agent types to permission levels
        custom_tool_permissions: Dict mapping agent types to custom tool sets

    Examples:
        >>> manager = AgentPermissionManager()
        >>> manager.can_agent_use_tool("integration_expert", "mcp__web_reader__webReader")
        True
        >>> tools = manager.get_allowed_tools("analyzer")
        ['mcp__web_reader__webReader', ...]
    """

    def __init__(self, config_file: Path | None = None) -> None:
        """Initialize permission manager.

        Args:
            config_file: Optional path to custom permissions config JSON
        """
        self.permissions: dict[str, PermissionLevel] = DEFAULT_PERMISSIONS.copy()
        self.custom_tool_permissions: dict[str, set[str]] = {}

        # Load custom config if provided
        if config_file and config_file.exists():
            self._load_config(config_file)

        logger.info(
            f"AgentPermissionManager initialized with "
            f"{len(self.permissions)} agent permissions"
        )

    def _load_config(self, config_file: Path) -> None:
        """Load custom permissions from config file.

        Args:
            config_file: Path to JSON config file
        """
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Load custom permissions
            for agent, level in data.get('agent_permissions', {}).items():
                self.permissions[agent] = PermissionLevel(level)

            # Load custom tool permissions
            for agent, tools in data.get('tool_permissions', {}).items():
                self.custom_tool_permissions[agent] = set(tools)

            logger.info(f"Loaded custom permissions from {config_file}")

        except Exception as e:
            logger.warning(f"Failed to load permission config: {e}")

    def get_permission_level(self, agent_type: str) -> PermissionLevel:
        """Get permission level for an agent type.

        Args:
            agent_type: Type of agent (e.g., "integration_expert")

        Returns:
            The PermissionLevel for this agent

        Examples:
            >>> manager = AgentPermissionManager()
            >>> manager.get_permission_level("analyzer")
            <PermissionLevel.READ: 'read'>
        """
        # Handle L2 subagents by mapping to L1 parent
        if "-specialist" in agent_type or "-optimizer" in agent_type or "-calculator" in agent_type:
            # Map L2 to L1 equivalent
            l1_mapping: dict[str, str] = {
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

        return self.permissions.get(agent_type, PermissionLevel.READ)

    def can_agent_use_tool(self, agent_type: str, tool_name: str) -> bool:
        """Check if an agent can use a specific MCP tool.

        Args:
            agent_type: Type of agent (e.g., "integration_expert")
            tool_name: Name of the MCP tool

        Returns:
            True if agent has permission to use the tool

        Examples:
            >>> manager = AgentPermissionManager()
            >>> manager.can_agent_use_tool("analyzer", "mcp__web_reader__webReader")
            True
            >>> manager.can_agent_use_tool("analyzer", "ReadMcpResourceTool")
            False
        """
        level = self.get_permission_level(agent_type)

        # NONE level - no tools
        if level == PermissionLevel.NONE:
            return False

        # FULL level - all tools
        if level == PermissionLevel.FULL:
            return True

        # Check level-specific tools
        allowed_tools = MCP_TOOLS_BY_LEVEL.get(level, [])

        # Check if tool is in allowed list for this level
        if tool_name in allowed_tools:
            return True

        # Check custom tool permissions
        custom_allowed = self.custom_tool_permissions.get(agent_type, set())
        if tool_name in custom_allowed:
            return True

        return False

    def get_allowed_tools(self, agent_type: str) -> list[str]:
        """Get list of MCP tools an agent is allowed to use.

        Args:
            agent_type: Type of agent

        Returns:
            List of tool names, or ["ALL"] for full access

        Examples:
            >>> manager = AgentPermissionManager()
            >>> tools = manager.get_allowed_tools("analyzer")
            >>> 'mcp__web_reader__webReader' in tools
            True
        """
        level = self.get_permission_level(agent_type)

        if level == PermissionLevel.NONE:
            return []

        if level == PermissionLevel.FULL:
            return ["ALL"]  # Special marker for all tools

        # Combine level tools with custom tools
        allowed = set(MCP_TOOLS_BY_LEVEL.get(level, []))
        custom = self.custom_tool_permissions.get(agent_type, set())
        allowed.update(custom)

        return list(allowed)

    def get_permission_summary(self) -> dict[str, str]:
        """Get summary of all agent permissions.

        Returns:
            Dict mapping agent types to permission level values

        Examples:
            >>> manager = AgentPermissionManager()
            >>> summary = manager.get_permission_summary()
            >>> summary["analyzer"]
            'read'
        """
        return {
            agent: level.value
            for agent, level in self.permissions.items()
        }


# Singleton instance
_permission_manager: AgentPermissionManager | None = None


def get_permission_manager() -> AgentPermissionManager:
    """Get global permission manager instance.

    Returns:
        The singleton AgentPermissionManager instance

    Examples:
        >>> manager = get_permission_manager()
        >>> isinstance(manager, AgentPermissionManager)
        True
    """
    global _permission_manager
    if _permission_manager is None:
        # Check for custom config
        config_dir = Path(__file__).parent.parent / "config"
        config_file = config_dir / "agent-permissions.json"
        _permission_manager = AgentPermissionManager(
            config_file if config_file.exists() else None
        )
    return _permission_manager


def inject_tool_permissions_into_agent_prompt(
    agent_type: str,
    base_prompt: str
) -> str:
    """Inject tool permission instructions into agent prompt.

    Args:
        agent_type: Type of agent
        base_prompt: Base agent prompt

    Returns:
        Enhanced prompt with permission instructions

    Examples:
        >>> prompt = "You are a coder."
        >>> enhanced = inject_tool_permissions_into_agent_prompt("analyzer", prompt)
        >>> "MCP TOOL PERMISSIONS" in enhanced
        True
    """
    manager = get_permission_manager()
    allowed_tools = manager.get_allowed_tools(agent_type)

    if not allowed_tools:
        # No permissions - add restriction
        return base_prompt + """

IMPORTANT: You do NOT have access to MCP tools.
Any MCP tool calls in your response will be blocked.
Use only standard tools (Read, Write, Edit, Bash, Grep, Glob).
"""

    if allowed_tools == ["ALL"]:
        # Full permissions - no restriction needed
        return base_prompt

    # Specific permissions - list allowed tools
    tools_list = "\n".join(f"  - {tool}" for tool in allowed_tools)

    return base_prompt + f"""

MCP TOOL PERMISSIONS:
You have access to the following MCP tools:
{tools_list}

Any attempt to use other MCP tools will be blocked.
"""


# CLI testing
if __name__ == "__main__":
    print("Agent Permissions System - FIX #9")
    print("=" * 70)

    manager = AgentPermissionManager()

    # Show permission summary
    print("\nAgent Permissions Summary:")
    print("-" * 70)

    permissions = manager.get_permission_summary()
    for agent, level in sorted(permissions.items())[:10]:
        print(f"  {agent:35} -> {level}")
    print(f"  ... and {len(permissions) - 10} more")

    # Test tool access
    print("\n" + "=" * 70)
    print("Tool Access Tests:")
    print("-" * 70)

    test_cases: list[tuple[str, str, bool]] = [
        ("integration_expert", "mcp__web_reader__webReader", True),
        ("integration_expert", "ReadMcpResourceTool", True),
        ("analyzer", "mcp__web_reader__webReader", True),
        ("analyzer", "ReadMcpResourceTool", False),
        ("security_unified_expert", "mcp__web_reader__webReader", True),
        ("security_unified_expert", "SomeRandomTool", False),
    ]

    for agent, tool, expected in test_cases:
        result = manager.can_agent_use_tool(agent, tool)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"\n{status} {agent} -> {tool}")
        print(f"   Allowed: {result} (expected: {expected})")

    # Show allowed tools for specific agent
    print("\n" + "=" * 70)
    print("Allowed Tools for integration_expert:")
    print("-" * 70)
    tools = manager.get_allowed_tools("integration_expert")
    if tools == ["ALL"]:
        print("  FULL ACCESS - All MCP tools available")
    else:
        for tool in tools:
            print(f"  - {tool}")
