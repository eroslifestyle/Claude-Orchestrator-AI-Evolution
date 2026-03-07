#!/usr/bin/env python3
"""
Test profile switching by temporarily modifying settings.json

This demonstrates the mode-aware tool switching in action.
"""

import json
import sys
import logging
from pathlib import Path

# Add mcp_server to path
sys.path.insert(0, str(Path(__file__).parent))

from profile_detector import (
    detect_active_profile,
    filter_tools_by_profile,
    ProfileType,
    NATIVE_TOOL_AVAILABILITY
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)

def backup_settings(settings_path: Path) -> dict:
    """Backup current settings"""
    with open(settings_path, 'r') as f:
        return json.load(f)

def restore_settings(settings_path: Path, settings: dict):
    """Restore settings from backup"""
    with open(settings_path, 'w') as f:
        json.dump(settings, f, indent=2)

def test_profile_switch():
    """Test switching between cca and ccg profiles"""
    settings_path = Path.home() / ".claude" / "settings.json"

    print("="*60)
    print("PROFILE SWITCHING TEST")
    print("="*60)

    # Backup current settings
    print("\n[1] Backing up current settings...")
    original_settings = backup_settings(settings_path)
    original_profile = original_settings.get("profile", "cca")
    print(f"    Current profile: {original_profile}")

    try:
        # Test with CCA profile
        print("\n[2] Switching to CCA profile...")
        original_settings["profile"] = "cca"
        restore_settings(settings_path, original_settings)

        profile_cca = detect_active_profile()
        print(f"    Detected: {profile_cca.value}")
        print(f"    Profile type: {profile_cca.name}")

        all_tools = list(NATIVE_TOOL_AVAILABILITY.keys())
        filtered_cca = filter_tools_by_profile(all_tools, profile_cca)
        print(f"    Available tools: {len(filtered_cca)}/{len(all_tools)}")

        # Test with CCG profile
        print("\n[3] Switching to CCG profile...")
        original_settings["profile"] = "ccg"
        restore_settings(settings_path, original_settings)

        profile_ccg = detect_active_profile()
        print(f"    Detected: {profile_ccg.value}")
        print(f"    Profile type: {profile_ccg.name}")

        filtered_ccg = filter_tools_by_profile(all_tools, profile_ccg)
        print(f"    Available tools: {len(filtered_ccg)}/{len(all_tools)}")

        # Compare
        print("\n[4] Comparison:")
        print(f"    CCA: {len(filtered_cca)} tools")
        print(f"    CCG: {len(filtered_ccg)} tools")
        print(f"    Difference: {abs(len(filtered_cca) - len(filtered_ccg))} tools")

        if len(filtered_cca) != len(filtered_ccg):
            cca_only = set(filtered_cca) - set(filtered_ccg)
            ccg_only = set(filtered_ccg) - set(filtered_cca)

            if cca_only:
                print(f"\n    Tools only in CCA ({len(cca_only)}):")
                for tool in list(cca_only)[:3]:
                    print(f"      - {tool}")

            if ccg_only:
                print(f"\n    Tools only in CCG ({len(ccg_only)}):")
                for tool in list(ccg_only)[:3]:
                    print(f"      - {tool}")

    finally:
        # Restore original settings
        print("\n[5] Restoring original settings...")
        original_settings["profile"] = original_profile
        restore_settings(settings_path, original_settings)
        print(f"    Restored to: {original_profile}")

    print("\n" + "="*60)
    print("TEST COMPLETED SUCCESSFULLY")
    print("="*60)

if __name__ == "__main__":
    try:
        test_profile_switch()
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
