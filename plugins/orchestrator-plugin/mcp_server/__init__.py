"""
Orchestrator MCP Server
=======================

Model Context Protocol server for Claude Code Orchestrator Plugin.
Provides automatic orchestration capabilities - ALWAYS ON.

Author: LeoDg
Version: 2.1.0
"""

__version__ = "12.6.1"
__skill_version__ = "V12.6.1"
__author__ = "LeoDg"
__docformat__ = "google"

# Import get_version and get_server_info from version module
try:
    from .version import get_version, get_server_info
except ImportError:
    # Fallback if version.py doesn't have these functions
    def get_version():
        return f"v{__version__}"

    def get_server_info():
        return {
            "name": "orchestrator-v12",
            "version": __version__,
            "skill_version": __skill_version__,
            "author": __author__,
            "description": "Orchestrator MCP Server v12.6 - Automatic task orchestration",
            "fixes": [
                "FIX #1: Core orchestration engine",
                "FIX #2: Documenter task always last",
                "FIX #3: NO-IMPROVISE protocol",
                "FIX #4: Centralized keyword loading",
                "FIX #5: Expert priority mapping",
                "FIX #6: Model selector integration",
                "FIX #7: Parallel time estimation",
                "FIX #8: Session persistence",
                "FIX #9: Process lifecycle management"
            ]
        }

from .server import main

__all__ = ["main", "get_version", "get_server_info", "__version__", "__skill_version__"]
