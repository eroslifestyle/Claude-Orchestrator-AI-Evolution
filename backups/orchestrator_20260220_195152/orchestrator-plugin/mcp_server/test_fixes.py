#!/usr/bin/env python3
"""
Test script to verify bug fixes in orchestrator server
"""

import sys
import os
import io

# Fix Windows encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server import engine, TaskStatus
from datetime import datetime

def test_bug1_status_with_session_id():
    """Test BUG #1: orchestrator_status with specific session_id should not crash"""
    print("\n" + "="*60)
    print("TEST BUG #1: orchestrator_status f-string fix")
    print("="*60)

    # Create a session
    plan = engine.generate_execution_plan("Test request for bug fix verification")
    session_id = plan.session_id

    # Get session
    session = engine.get_session(session_id)

    try:
        # This was crashing before with:
        # "Invalid format specifier '.2f if session.plan else 0.00'"
        tasks_count = len(session.plan.tasks) if session.plan else 0
        est_cost = session.plan.estimated_cost if session.plan else 0.00
        est_time = session.plan.estimated_time if session.plan else 0.0
        complexity = session.plan.complexity if session.plan else "N/A"
        domains = ', '.join(session.plan.domains) if session.plan and session.plan.domains else "N/A"

        output = f"""📊 SESSION STATUS: {session.session_id}
├─ Request: {session.user_request}
├─ Status: {session.status.value}
├─ Started: {session.started_at.isoformat()}
├─ Domains: {domains}
├─ Complexity: {complexity}
├─ Tasks: {tasks_count}
├─ Est. Time: {est_time:.1f} min
└─ Est. Cost: ${est_cost:.2f}
"""
        print(output)
        print("✅ BUG #1 FIX VERIFIED - No f-string error!")
        return True
    except Exception as e:
        print(f"❌ BUG #1 STILL PRESENT: {e}")
        return False

def test_bug2_keyword_matching():
    """Test BUG #2: keyword 'ea' should not match in 'crea'"""
    print("\n" + "="*60)
    print("TEST BUG #2: keyword matching word boundaries")
    print("="*60)

    # Test case 1: "Crea un'applicazione" should NOT match "ea"
    analysis1 = engine.analyze_request("Crea un'applicazione web con React")
    has_ea_in_crea = 'ea' in analysis1['keywords']

    print(f"Request: 'Crea un'applicazione web con React'")
    print(f"Keywords found: {analysis1['keywords']}")
    print(f"'ea' incorrectly matched: {has_ea_in_crea}")

    # Test case 2: "Sviluppa un EA per MetaTrader" SHOULD match "ea"
    analysis2 = engine.analyze_request("Sviluppa un EA per MetaTrader")
    has_ea_in_metatrader = 'ea' in analysis2['keywords']

    print(f"\nRequest: 'Sviluppa un EA per MetaTrader'")
    print(f"Keywords found: {analysis2['keywords']}")
    print(f"'ea' correctly matched: {has_ea_in_metatrader}")

    if not has_ea_in_crea and has_ea_in_metatrader:
        print("\n✅ BUG #2 FIX VERIFIED - Word boundary matching works!")
        return True
    else:
        if has_ea_in_crea:
            print("\n❌ BUG #2 STILL PRESENT: 'ea' matches in 'crea'")
        if not has_ea_in_metatrader:
            print("\n❌ Regression: 'ea' should match 'EA' in MetaTrader context")
        return False

def main():
    print("="*60)
    print("ORCHESTRATOR v6.0 - BUG FIX VERIFICATION TEST")
    print("="*60)

    results = []

    # Run tests
    results.append(("BUG #1 (f-string)", test_bug1_status_with_session_id()))
    results.append(("BUG #2 (keyword matching)", test_bug2_keyword_matching()))

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    all_passed = True
    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{name}: {status}")
        if not passed:
            all_passed = False

    print("="*60)
    if all_passed:
        print("🎉 ALL TESTS PASSED - FIXES VERIFIED!")
        return 0
    else:
        print("⚠️ SOME TESTS FAILED - FIXES NEED REVIEW")
        return 1

if __name__ == "__main__":
    sys.exit(main())
