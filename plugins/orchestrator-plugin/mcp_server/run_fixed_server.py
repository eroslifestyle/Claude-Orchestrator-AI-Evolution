#!/usr/bin/env python3
"""
Run the fixed orchestrator server standalone for testing
"""
import asyncio
import sys
import os

# Add the server directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import and run with fallback exception handling
try:
    from server import main
except (ImportError, AttributeError):
    try:
        from mcp_server.server import main
    except (ImportError, AttributeError):
        main = None  # type: ignore

if __name__ == "__main__":
    print("Starting fixed orchestrator server...")
    if main is not None:
        main()
    else:
        print("Error: Could not import server module")
        sys.exit(1)
