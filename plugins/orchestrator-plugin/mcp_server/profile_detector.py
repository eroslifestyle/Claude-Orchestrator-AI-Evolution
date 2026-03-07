"""
Mode-Aware Profile Detection - Tool Switching

Detects active Claude Code profile (cca/ccg) and filters available tools
based on profile capabilities. Enables mode-aware tool switching.

PROFILES:
- cca: Anthropic Claude Opus 4.6 (full MCP + native tools)
- ccg: GLM-5 via Z.AI (MCP tools only, some native tools restricted)

FEATURES:
- Detect active profile from settings.json
- Filter available tools based on profile
- Logging for debug and troubleshooting
"""

from __future__ import annotations

import json
import logging
from enum import Enum
from pathlib import Path
from typing import Literal, Optional

logger = logging.getLogger("orchestrator-mcp")


class ProfileType(Enum):
    """Claude Code profile types.

    Each profile has different tool capabilities.

    Attributes:
        CCA: Anthropic Claude Opus 4.6 - full access
        CCG: GLM-5 via Z.AI - MCP only, limited native

    Examples:
        >>> ProfileType.CCA.value
        'cca'
        >>> ProfileType.CCG == ProfileType.CCG
        True
    """
    CCA = "cca"  # Anthropic Claude Opus 4.6
    CCG = "ccg"  # GLM-5 via Z.AI


# Native tools available per profile
# Format: tool_name -> profiles where it's available
NATIVE_TOOL_AVAILABILITY: dict[str, set[str]] = {
    # Canva tools - available in both profiles
    "mcp__claude_ai_Canva__generate-design": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__create-design-from-candidate": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__get-design": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__export-design": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__start-editing-transaction": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__perform-editing-operations": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__commit-editing-transaction": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__cancel-editing-transaction": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__search-designs": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__list-folder-items": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__get-design-pages": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__get-design-content": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__get-design-thumbnail": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__resize-design": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__merge-designs": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__request-outline-review": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__generate-design-structured": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__list-brand-kits": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__comment-on-design": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__list-comments": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__reply-to-comment": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__list-replies": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__resolve-shortlink": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__import-design-from-url": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__move-item-to-folder": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__create-folder": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__get-export-formats": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__get-presenter-notes": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__get-assets": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__claude_ai_Canva__upload-asset-from-url": {ProfileType.CCA.value, ProfileType.CCG.value},

    # Web reader - available in both profiles
    "mcp__web_reader__webReader": {ProfileType.CCA.value, ProfileType.CCG.value},

    # Web search - available in both profiles
    "mcp__web-search-prime__search": {ProfileType.CCA.value, ProfileType.CCG.value},

    # Image analysis - available in both profiles
    "mcp__4_5v_mcp__analyze_image": {ProfileType.CCA.value, ProfileType.CCG.value},

    # Orchestrator MCP - available in both profiles
    "mcp__orchestrator__orchestrator_agents": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__orchestrator__orchestrator_analyze": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__orchestrator__orchestrator_execute": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__orchestrator__orchestrator_cancel": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__orchestrator__orchestrator_list": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__orchestrator__orchestrator_preview": {ProfileType.CCA.value, ProfileType.CCG.value},
    "mcp__orchestrator__orchestrator_status": {ProfileType.CCA.value, ProfileType.CCG.value},
}


def detect_active_profile(settings_path: Optional[Path] = None) -> ProfileType:
    """Detect active Claude Code profile from settings.json.

    Reads the settings.json file to determine which profile is currently
    active. Defaults to CCA if file not found or profile missing.

    Args:
        settings_path: Optional path to settings.json. Defaults to
            ~/.claude/settings.json

    Returns:
        Active profile type (CCA or CCG)

    Examples:
        >>> profile = detect_active_profile()
        >>> profile.value
        'cca'
        >>> profile == ProfileType.CCG
        False
    """
    if settings_path is None:
        settings_path = Path.home() / ".claude" / "settings.json"

    try:
        if not settings_path.exists():
            logger.warning(
                f"Settings file not found: {settings_path}. "
                f"Defaulting to {ProfileType.CCA.value} profile"
            )
            return ProfileType.CCA

        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)

        profile_str = settings.get("profile", "cca").lower()
        logger.info(
            f"Profile detection: {profile_str} "
            f"(from {settings_path})"
        )

        # Validate profile
        try:
            profile = ProfileType(profile_str)
            logger.debug(f"Active profile: {profile.value}")
            return profile
        except ValueError:
            logger.warning(
                f"Unknown profile '{profile_str}'. "
                f"Valid options: {[p.value for p in ProfileType]}. "
                f"Defaulting to {ProfileType.CCA.value}"
            )
            return ProfileType.CCA

    except json.JSONDecodeError as e:
        logger.error(
            f"Failed to parse settings.json: {e}. "
            f"Defaulting to {ProfileType.CCA.value}"
        )
        return ProfileType.CCA
    except Exception as e:
        logger.error(
            f"Error reading settings: {e}. "
            f"Defaulting to {ProfileType.CCA.value}"
        )
        return ProfileType.CCA


def filter_tools_by_profile(
    tools: list[str],
    profile: ProfileType
) -> list[str]:
    """Filter available tools based on active profile.

    Removes tools that are not available in the current profile.
    Logs filtered tools for debugging.

    Args:
        tools: List of tool names to filter
        profile: Active profile type

    Returns:
        Filtered list of tool names available for this profile

    Examples:
        >>> tools = [
        ...     "mcp__web_reader__webReader",
        ...     "some_restricted_tool"
        ... ]
        >>> profile = ProfileType.CCG
        >>> filtered = filter_tools_by_profile(tools, profile)
        >>> "mcp__web_reader__webReader" in filtered
        True
    """
    filtered_tools: list[str] = []
    restricted_tools: list[str] = []

    for tool in tools:
        # Check if tool has profile restrictions
        if tool in NATIVE_TOOL_AVAILABILITY:
            allowed_profiles = NATIVE_TOOL_AVAILABILITY[tool]
            if profile.value in allowed_profiles:
                filtered_tools.append(tool)
            else:
                restricted_tools.append(tool)
                logger.debug(
                    f"Tool '{tool}' not available in {profile.value} profile. "
                    f"Allowed in: {allowed_profiles}"
                )
        else:
            # No restriction - available in all profiles
            filtered_tools.append(tool)

    if restricted_tools:
        logger.info(
            f"Filtered {len(restricted_tools)} tools for {profile.value} profile: "
            f"{restricted_tools}"
        )

    logger.debug(
        f"Tool filtering complete: {len(filtered_tools)} available, "
        f"{len(restricted_tools)} restricted"
    )

    return filtered_tools


def is_tool_available_for_profile(
    tool_name: str,
    profile: ProfileType
) -> bool:
    """Check if a tool is available for the given profile.

    Args:
        tool_name: Name of the tool to check
        profile: Active profile type

    Returns:
        True if tool is available, False otherwise

    Examples:
        >>> profile = ProfileType.CCA
        >>> is_tool_available_for_profile("mcp__web_reader__webReader", profile)
        True
    """
    # If tool has restrictions, check profile
    if tool_name in NATIVE_TOOL_AVAILABILITY:
        return profile.value in NATIVE_TOOL_AVAILABILITY[tool_name]

    # No restrictions - available to all
    return True


def get_profile_tool_summary(profile: ProfileType) -> dict[str, int]:
    """Get summary of tool availability for a profile.

    Args:
        profile: Profile type to summarize

    Returns:
        Dict with counts: total, available, restricted

    Examples:
        >>> summary = get_profile_tool_summary(ProfileType.CCA)
        >>> summary['available'] > 0
        True
    """
    total_tools = len(NATIVE_TOOL_AVAILABILITY)
    available = sum(
        1 for tools in NATIVE_TOOL_AVAILABILITY.values()
        if profile.value in tools
    )

    return {
        "total": total_tools,
        "available": available,
        "restricted": total_tools - available,
        "profile": profile.value
    }


# CLI testing
if __name__ == "__main__":
    import sys

    print("Mode-Aware Profile Detection - Tool Switching")
    print("=" * 60)

    # Test profile detection
    print("\n[TEST] Profile Detection")
    profile = detect_active_profile()
    print(f"  Active Profile: {profile.value}")
    print(f"  Description: {profile.name}")

    # Test tool filtering
    print("\n[TEST] Tool Filtering")
    all_tools = list(NATIVE_TOOL_AVAILABILITY.keys())
    filtered = filter_tools_by_profile(all_tools, profile)
    print(f"  Total Tools: {len(all_tools)}")
    print(f"  Available: {len(filtered)}")
    print(f"  Restricted: {len(all_tools) - len(filtered)}")

    # Test specific tool availability
    print("\n[TEST] Tool Availability Checks")
    test_tools = [
        "mcp__web_reader__webReader",
        "mcp__claude_ai_Canva__generate-design",
    ]
    for tool in test_tools:
        available = is_tool_available_for_profile(tool, profile)
        print(f"  {tool}: {'OK' if available else 'RESTRICTED'}")

    # Test profile summary
    print("\n[TEST] Profile Summary")
    summary = get_profile_tool_summary(profile)
    for key, value in summary.items():
        print(f"  {key}: {value}")
