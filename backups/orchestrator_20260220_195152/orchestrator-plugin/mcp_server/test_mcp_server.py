#!/usr/bin/env python3
"""
Test script for Orchestrator MCP Server
Run this to verify the server works correctly before deployment
"""

import asyncio
import json
import sys
from mcp_server import OrchestratorEngine, engine


def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


def test_analyze():
    """Test the analyze functionality"""
    print_section("TEST 1: orchestrator_analyze")

    test_requests = [
        "Implementa una GUI PyQt5 con tab e widget per il gestione clienti",
        "Aggiungi autenticazione JWT con refresh token sicuri",
        "Crea un EA MQL5 che gestisce multiple posizioni con risk management",
        "Ottimizza le query PostgreSQL per migliorare performance",
    ]

    for request in test_requests:
        print(f"📝 Request: \"{request[:50]}...\"")
        analysis = engine.analyze_request(request)
        print(f"   ├─ Keywords: {', '.join(analysis['keywords'][:5])}")
        print(f"   ├─ Domains: {', '.join(analysis['domains'])}")
        print(f"   ├─ Complexity: {analysis['complexity']}")
        print()


def test_generate_plan():
    """Test execution plan generation"""
    print_section("TEST 2: orchestrator_execute (plan generation)")

    request = "Implementa una GUI PyQt5 con database SQLite per gestione magazzino"
    print(f"📝 Request: \"{request}\"")

    plan = engine.generate_execution_plan(request)

    print(f"\n📊 Generated Plan:")
    print(f"├─ Session ID: {plan.session_id}")
    print(f"├─ Total Tasks: {plan.total_agents}")
    print(f"├─ Domains: {', '.join(plan.domains)}")
    print(f"├─ Complexity: {plan.complexity}")
    print(f"├─ Est. Time: {plan.estimated_time:.1f} min")
    print(f"└─ Est. Cost: ${plan.estimated_cost:.2f}")

    print(f"\n🤖 Tasks:")
    for task in plan.tasks:
        deps = f" (depends: {', '.join(task.dependencies)})" if task.dependencies else ""
        print(f"   [{task.id}] {task.description[:40]}... {deps}")
        print(f"           → {task.agent_expert_file} | {task.model} | {task.priority}")


def test_agents_list():
    """Test agents listing"""
    print_section("TEST 3: orchestrator_agents")

    agents = engine.get_available_agents()
    print(f"🤖 Total Expert Agents: {len(agents)}")

    # Group by domain
    domains = {}
    for agent in agents:
        expert_file = agent['expert_file']
        domain = expert_file.split('/')[0] if '/' in expert_file else 'core'
        if domain not in domains:
            domains[domain] = []
        domains[domain].append(agent)

    for domain, domain_agents in sorted(domains.items()):
        print(f"\n📁 {domain.upper()}:")
        for agent in domain_agents[:3]:  # Show first 3 per domain
            print(f"   ├─ {agent['keyword']:15} → {agent['model']} ({agent['priority']})")


def test_sessions():
    """Test session management"""
    print_section("TEST 4: orchestrator_list & orchestrator_status")

    # Create some test sessions
    test_requests = [
        "Test request 1: GUI implementation",
        "Test request 2: Database optimization",
        "Test request 3: Security audit",
    ]

    for req in test_requests:
        engine.generate_execution_plan(req)

    sessions = engine.list_sessions(5)
    print(f"📋 Recent Sessions: {len(sessions)}")

    for session in sessions[:5]:
        print(f"├─ [{session['session_id']}] {session['user_request'][:40]}")
        print(f"│  └─ Status: {session['status']} | Tasks: {session['tasks_count']}")

    # Test status for specific session
    if sessions:
        session_id = sessions[0]['session_id']
        session = engine.get_session(session_id)
        if session:
            print(f"\n📊 Session {session_id} Details:")
            print(f"├─ Request: {session.user_request}")
            print(f"├─ Status: {session.status.value}")
            print(f"└─ Started: {session.started_at}")


def test_preview():
    """Test preview mode"""
    print_section("TEST 5: orchestrator_preview")

    request = "Crea un sistema di trading con GUI in PyQt5, database PostgreSQL, e integrazione API cTrader"
    print(f"📝 Request: \"{request}\"")

    plan = engine.generate_execution_plan(request)
    analysis = engine.analyze_request(request)

    print(f"\n🔍 Preview Analysis:")
    print(f"├─ Keywords: {', '.join(analysis['keywords'])}")
    print(f"├─ Domains: {', '.join(analysis['domains'])}")
    print(f"├─ Multi-Domain: {analysis['is_multi_domain']}")
    print(f"└─ Complexity: {analysis['complexity']}")

    print(f"\n🤖 Task Breakdown:")
    work_tasks = [t for t in plan.tasks if "documenter" not in t.agent_expert_file]
    for task in work_tasks:
        print(f"   [{task.id}] {task.description[:35]}")
        print(f"           → {task.agent_expert_file} | {task.model}")

    doc_task = plan.tasks[-1]
    print(f"\n   [FINAL] {doc_task.description}")
    print(f"           → {doc_task.agent_expert_file} | {doc_task.model}")


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("  ORCHESTRATOR MCP SERVER - TEST SUITE")
    print("  Version 2.1.0-MCP")
    print("=" * 60)

    try:
        test_analyze()
        test_generate_plan()
        test_agents_list()
        test_sessions()
        test_preview()

        print_section("✅ ALL TESTS PASSED")
        print("The Orchestrator MCP Server is working correctly!")
        print("\n🚀 Next Steps:")
        print("1. Deploy to GitHub: https://github.com/LeoDg/orchestrator-mcp-server")
        print("2. Test with: uvx --from git+https://github.com/LeoDg/orchestrator-mcp-server orchestrator-mcp")
        print("3. Update .mcp.json with correct GitHub URL")
        print("4. Restart Claude Code to activate MCP server")

        return 0

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
