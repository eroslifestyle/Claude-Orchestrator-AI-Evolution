#!/usr/bin/env python3
"""
Test script for profile detection and tool filtering

Run this to verify:
1. Profile detection from settings.json
2. Tool filtering by profile
3. Logging output
"""

import sys
import logging
from pathlib import Path

# Add mcp_server to path
sys.path.insert(0, str(Path(__file__).parent))

from profile_detector import (
    detect_active_profile,
    filter_tools_by_profile,
    is_tool_available_for_profile,
    get_profile_tool_summary,
    ProfileType,
    NATIVE_TOOL_AVAILABILITY
)

# Setup logging to see debug output
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def test_profile_detection():
    """Test profile detection from settings.json"""
    print("\n" + "="*60)
    print("TEST 1: Profile Detection")
    print("="*60)

    profile = detect_active_profile()
    print(f"\nDetected Profile: {profile.value}")
    print(f"Profile Type: {profile.name}")

    # Read settings.json to verify
    settings_path = Path.home() / ".claude" / "settings.json"
    if settings_path.exists():
        import json
        with open(settings_path, 'r') as f:
            settings = json.load(f)
        print(f"Settings Profile: {settings.get('profile', 'NOT SET')}")
        print(f"Settings Description: {settings.get('description', 'NOT SET')}")

    return profile

def test_tool_filtering(profile: ProfileType):
    """Test tool filtering by profile"""
    print("\n" + "="*60)
    print("TEST 2: Tool Filtering")
    print("="*60)

    all_tools = list(NATIVE_TOOL_AVAILABILITY.keys())
    print(f"\nTotal tools in registry: {len(all_tools)}")

    filtered = filter_tools_by_profile(all_tools, profile)
    print(f"Available for {profile.value}: {len(filtered)}")
    print(f"Restricted: {len(all_tools) - len(filtered)}")

    # Show some examples
    print("\nSample available tools:")
    for tool in filtered[:5]:
        print(f"  [OK] {tool}")

    if len(filtered) < len(all_tools):
        restricted = set(all_tools) - set(filtered)
        print("\nSample restricted tools:")
        for tool in list(restricted)[:5]:
            print(f"  [RESTRICTED] {tool}")

def test_specific_tools(profile: ProfileType):
    """Test specific tool availability"""
    print("\n" + "="*60)
    print("TEST 3: Specific Tool Checks")
    print("="*60)

    test_tools = [
        "mcp__web_reader__webReader",
        "mcp__claude_ai_Canva__generate-design",
        "mcp__4_5v_mcp__analyze_image",
    ]

    for tool in test_tools:
        available = is_tool_available_for_profile(tool, profile)
        status = "[AVAILABLE]" if available else "[RESTRICTED]"
        print(f"{status}: {tool}")

def test_profile_summary(profile: ProfileType):
    """Test profile summary"""
    print("\n" + "="*60)
    print("TEST 4: Profile Summary")
    print("="*60)

    summary = get_profile_tool_summary(profile)
    print(f"\nProfile: {summary['profile']}")
    print(f"Total Tools: {summary['total']}")
    print(f"Available: {summary['available']}")
    print(f"Restricted: {summary['restricted']}")

def test_simulated_profile_switch():
    """Test what happens when switching profiles"""
    print("\n" + "="*60)
    print("TEST 5: Simulated Profile Switch")
    print("="*60)

    all_tools = list(NATIVE_TOOL_AVAILABILITY.keys())

    for profile_type in ProfileType:
        filtered = filter_tools_by_profile(all_tools, profile_type)
        print(f"\n{profile_type.value}: {len(filtered)}/{len(all_tools)} tools available")

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("PROFILE DETECTOR TEST SUITE")
    print("="*60)

    try:
        # Test 1: Profile detection
        profile = test_profile_detection()

        # Test 2: Tool filtering
        test_tool_filtering(profile)

        # Test 3: Specific tools
        test_specific_tools(profile)

        # Test 4: Profile summary
        test_profile_summary(profile)

        # Test 5: Simulated profile switch
        test_simulated_profile_switch()

        print("\n" + "="*60)
        print("ALL TESTS COMPLETED")
        print("="*60)
        print("\nCheck the logs above for detailed debug output.")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())
