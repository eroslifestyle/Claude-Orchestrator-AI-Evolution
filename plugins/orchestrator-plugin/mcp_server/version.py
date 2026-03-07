"""
Orchestrator Version - Single Source of Truth
"""
from pathlib import Path

# Read VERSION file
VERSION_FILE = Path(__file__).parent.parent / "VERSION"

def get_version() -> str:
    """Get version from VERSION file - single source of truth."""
    try:
        return VERSION_FILE.read_text().strip()
    except FileNotFoundError:
        return "12.6.0"  # Fallback

def get_skill_version() -> str:
    """Get skill version (V prefix format)."""
    return f"V{get_version()}"

# Version exports
__version__ = get_version()
__skill_version__ = get_skill_version()
__mcp_version__ = get_version()
__api_version__ = "3"
