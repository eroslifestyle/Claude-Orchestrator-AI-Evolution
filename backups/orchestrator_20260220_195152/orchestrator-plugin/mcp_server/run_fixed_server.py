#!/usr/bin/env python3
"""
Run the fixed orchestrator server standalone for testing
"""
import asyncio
import sys
import os

# Add the server directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import and run
from server import main

if __name__ == "__main__":
    print("Starting fixed orchestrator server...")
    main()
