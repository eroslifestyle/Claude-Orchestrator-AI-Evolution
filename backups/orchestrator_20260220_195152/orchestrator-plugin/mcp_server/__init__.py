"""
Orchestrator MCP Server
=======================

Model Context Protocol server for Claude Code Orchestrator Plugin.
Provides automatic orchestration capabilities - ALWAYS ON.

Author: LeoDg
Version: 2.1.0
"""

__version__ = "2.1.0"
__author__ = "LeoDg"
__all__ = ["main"]

from .server import main

__all__.__all__ = ["main"]
