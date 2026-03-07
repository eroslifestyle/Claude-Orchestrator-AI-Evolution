import sys
sys.path.insert(0, "c:/Users/LeoDg/.claude")

import threading
import time
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import List, Dict, Optional

# Import moduli V14.0.2
from lib.predictive_cache import get_predictive_cache
from lib.adaptive_budget import get_budget_calculator

@dataclass
class TaskSpec:
    task_id: str
    description: str
    keywords: List[str]
    complexity: float

@dataclass
class AgentSpec:
    agent_id: str
    agent_type: str
    skills: List[str]

@dataclass
class SkillSpec:
    skill_id: str
    skill_name: str
    category: str

def generate_tasks(n: int = 60) -> List[TaskSpec]:
    templates = [
        ("Refactor {module} for better performance", ["refactor", "performance"], 0.7),
        ("Add OAuth authentication to {module}", ["auth", "security", "api"], 0.8),
        ("Fix bug in {module} causing memory leak", ["fix", "memory", "debug"], 0.6),
        ("Create unit tests for {module}", ["test", "unit test", "pytest"], 0.5),
        ("Implement REST API endpoint for {feature}", ["api", "rest", "endpoint"], 0.6),
        ("Migrate {module} from Python 3.9 to 3.12", ["migrate", "python"], 0.7),
        ("Optimize database queries in {module}", ["database", "query", "optimize"], 0.7),
        ("Add GUI dashboard for {feature}", ["gui", "ui", "dashboard"], 0.6),
        ("Implement n8n workflow for {feature}", ["n8n", "workflow", "automation"], 0.5),
        ("Create MQL Expert Advisor for {strategy}", ["mql", "ea", "trading"], 0.8),
        ("Deploy {module} to production", ["deploy", "devops", "ci/cd"], 0.6),
        ("Security audit of {module}", ["security", "audit", "vulnerability"], 0.9),
    ]

    modules = ["auth", "payment", "user", "dashboard", "api", "database", "cache", "notification"]
    features = ["login", "checkout", "profile", "analytics", "reporting"]
    strategies = ["scalping", "trend_following", "mean_reversion"]

    tasks = []
    for i in range(n):
        template, keywords, base_complexity = templates[i % len(templates)]
        description = template.format(
            module=random.choice(modules),
            feature=random.choice(features),
            strategy=random.choice(strategies)
        )
        complexity = base_complexity + random.uniform(-0.1, 0.1)
        complexity = max(0.1, min(1.0, complexity))

        tasks.append(TaskSpec(
            task_id=f"task_{i:03d}",
            description=description,
            keywords=keywords,
            complexity=complexity
        ))

    return tasks

def generate_agents(n: int = 55) -> List[AgentSpec]:
    real_agents = [
        ("GUI Super Expert", "L1", ["gui", "ui", "widget"]),
        ("GUI Layout Specialist L2", "L2", ["layout", "sizing"]),
        ("Database Expert", "L1", ["database", "sql", "schema"]),
        ("DB Query Optimizer L2", "L2", ["query", "index", "optimize"]),
        ("Security Unified Expert", "L1", ["security", "encryption"]),
        ("Security Auth Specialist L2", "L2", ["auth", "jwt", "session"]),
        ("Integration Expert", "L1", ["api", "rest", "webhook"]),
        ("API Endpoint Builder L2", "L2", ["endpoint", "route"]),
        ("Tester Expert", "L1", ["test", "debug", "qa"]),
        ("Test Unit Specialist L2", "L2", ["unit test", "mock", "pytest"]),
        ("MQL Expert", "L1", ["mql", "ea", "metatrader"]),
        ("MQL Optimization L2", "L2", ["optimize ea", "memory mt5"]),
        ("Trading Strategy Expert", "L1", ["trading", "strategy"]),
        ("Trading Risk Calculator L2", "L2", ["risk", "position size"]),
        ("Mobile Expert", "L1", ["mobile", "ios", "android"]),
        ("Mobile UI Specialist L2", "L2", ["mobile ui", "responsive"]),
        ("N8N Expert", "L1", ["n8n", "workflow"]),
        ("N8N Workflow Builder L2", "L2", ["workflow builder"]),
        ("Claude Systems Expert", "L1", ["claude", "prompt", "token"]),
        ("Claude Prompt Optimizer L2", "L2", ["prompt optimize"]),
        ("Architect Expert", "L1", ["architettura", "design", "system"]),
        ("Architect Design Specialist L2", "L2", ["design pattern", "ddd", "solid"]),
        ("DevOps Expert", "L1", ["devops", "deploy", "ci/cd"]),
        ("DevOps Pipeline Specialist L2", "L2", ["pipeline", "jenkins", "github actions"]),
        ("Languages Expert", "L1", ["python", "js", "c#"]),
        ("Languages Refactor Specialist L2", "L2", ["refactor", "clean code"]),
        ("AI Integration Expert", "L1", ["ai", "llm", "gpt"]),
        ("AI Model Specialist L2", "L2", ["model selection", "fine-tuning", "rag"]),
        ("Social Identity Expert", "L1", ["oauth", "social login"]),
        ("Social OAuth Specialist L2", "L2", ["oauth2 flow", "provider integration"]),
        ("Analyzer", "CORE", ["analyze", "explore", "search"]),
        ("Coder", "CORE", ["implement", "fix", "code"]),
        ("Reviewer", "CORE", ["review", "quality check"]),
        ("Documenter", "CORE", ["document", "changelog"]),
        ("System Coordinator", "CORE", ["cleanup", "checkpoint"]),
        ("Orchestrator", "CORE", ["orchestrate", "delegate"]),
        ("Browser Automation Expert", "L1", ["playwright", "e2e", "scraping"]),
        ("Notification Expert", "L1", ["notification", "alert", "slack"]),
        ("MCP Integration Expert", "L1", ["mcp", "plugin", "extension"]),
        ("Payment Integration Expert", "L1", ["stripe", "paypal", "payment"]),
        ("Offensive Security Expert", "L1", ["pentesting", "exploit", "red team"]),
        ("Reverse Engineering Expert", "L1", ["binary", "disassemble", "ghidra"]),
        ("MQL Decompilation Expert", "L1", ["decompile", ".ex4", ".ex5"]),
    ]

    agents = []
    for i, (name, tier, skills) in enumerate(real_agents):
        agents.append(AgentSpec(
            agent_id=f"agent_{i:03d}",
            agent_type=name,
            skills=skills
        ))

    for i in range(len(real_agents), n):
        agents.append(AgentSpec(
            agent_id=f"mock_agent_{i:03d}",
            agent_type=f"MockAgent{i}",
            skills=[f"mock_skill_{j}" for j in range(3)]
        ))

    return agents

def generate_skills(n: int = 55) -> List[SkillSpec]:
    real_skills = [
        ("orchestrator", "Core", "orchestration"),
        ("code-review", "Core", "review"),
        ("git-workflow", "Core", "git"),
        ("testing-strategy", "Core", "testing"),
        ("debugging", "Core", "debug"),
        ("api-design", "Core", "api"),
        ("remotion-best-practices", "Core", "video"),
        ("keybindings-help", "Core", "shortcuts"),
        ("strategic-compact", "Utility", "optimization"),
        ("verification-loop", "Utility", "validation"),
        ("checkpoint", "Utility", "state"),
        ("sessions", "Utility", "management"),
        ("status", "Utility", "monitoring"),
        ("metrics", "Utility", "analytics"),
        ("prompt-engineering-patterns", "Utility", "prompts"),
        ("plugin-loader", "Utility", "plugins"),
        ("plan", "Workflow", "planning"),
        ("tdd-workflow", "Workflow", "testing"),
        ("security-scan", "Workflow", "security"),
        ("refactor-clean", "Workflow", "refactoring"),
        ("build-fix", "Workflow", "build"),
        ("multi-plan", "Workflow", "planning"),
        ("fix", "Workflow", "debugging"),
        ("cleanup", "Workflow", "maintenance"),
        ("simplify", "Workflow", "optimization"),
        ("python-patterns", "Language", "python"),
        ("python-performance-optimization", "Language", "python"),
        ("typescript-patterns", "Language", "typescript"),
        ("go-patterns", "Language", "go"),
        ("learn", "Learning", "capture"),
        ("evolve", "Learning", "promotion"),
    ]

    skills = []
    for i, (name, category, domain) in enumerate(real_skills):
        skills.append(SkillSpec(
            skill_id=f"skill_{i:03d}",
            skill_name=name,
            category=category
        ))

    for i in range(len(real_skills), n):
        skills.append(SkillSpec(
            skill_id=f"mock_skill_{i:03d}",
            skill_name=f"MockSkill{i}",
            category="Mock"
        ))

    return skills

def test_multi_task_throughput(tasks: List[TaskSpec], n_threads: int = 10):
    cache = get_predictive_cache()
    budget_calc = get_budget_calculator()

    results = {"completed": 0, "errors": 0, "total_time": 0}
    lock = threading.Lock()

    def process_task(task: TaskSpec):
        try:
            start = time.time()
            predictions = cache.predict_next_agents(task.description, {"complexity": task.complexity})
            budget = budget_calc.calculate_budget(task.description, {"files": []})
            duration = time.time() - start

            with lock:
                results["completed"] += 1
                results["total_time"] += duration

        except Exception as e:
            with lock:
                results["errors"] += 1

    start_total = time.time()

    with ThreadPoolExecutor(max_workers=n_threads) as executor:
        futures = [executor.submit(process_task, task) for task in tasks]
        for future in as_completed(futures):
            pass

    total_time = time.time() - start_total
    throughput = len(tasks) / total_time

    return {
        "test": "multi_task_throughput",
        "tasks": len(tasks),
        "completed": results["completed"],
        "errors": results["errors"],
        "total_time_sec": round(total_time, 3),
        "throughput_tasks_per_sec": round(throughput, 2),
        "avg_task_time_ms": round(results["total_time"] / max(1, results["completed"]) * 1000, 3),
        "status": "PASS" if results["errors"] == 0 else "FAIL"
    }

def test_multi_agent_coordination(agents: List[AgentSpec], n_parallel: int = 15):
    cache = get_predictive_cache()

    results = {"successful_predictions": 0, "unique_agents_predicted": set(), "errors": 0}
    lock = threading.Lock()

    def predict_for_agent(agent: AgentSpec):
        try:
            task = f"Work on {agent.agent_type} with skills {agent.skills[0] if agent.skills else 'none'}"
            predictions = cache.predict_next_agents(task, {"agent_type": agent.agent_type})

            with lock:
                results["successful_predictions"] += 1
                for pred in predictions:
                    results["unique_agents_predicted"].add(pred.agent_name if hasattr(pred, "agent_name") else str(pred))

        except Exception as e:
            with lock:
                results["errors"] += 1

    start = time.time()

    with ThreadPoolExecutor(max_workers=n_parallel) as executor:
        futures = [executor.submit(predict_for_agent, agent) for agent in agents]
        for future in as_completed(futures):
            pass

    duration = time.time() - start

    return {
        "test": "multi_agent_coordination",
        "agents": len(agents),
        "successful_predictions": results["successful_predictions"],
        "unique_agents_predicted": len(results["unique_agents_predicted"]),
        "errors": results["errors"],
        "duration_sec": round(duration, 3),
        "predictions_per_sec": round(len(agents) / duration, 2),
        "status": "PASS" if results["errors"] == 0 else "FAIL"
    }

def test_multi_skill_invocation(skills: List[SkillSpec], n_parallel: int = 12):
    results = {"skill_budgets_calculated": 0, "total_tokens": 0, "errors": 0}
    lock = threading.Lock()

    def invoke_skill(skill: SkillSpec):
        try:
            budget_calc = get_budget_calculator()
            task = f"Execute {skill.skill_name} skill from {skill.category} category"
            budget = budget_calc.calculate_budget(task, {"skill_category": skill.category})

            with lock:
                results["skill_budgets_calculated"] += 1
                results["total_tokens"] += budget.final_budget

        except Exception as e:
            with lock:
                results["errors"] += 1

    start = time.time()

    with ThreadPoolExecutor(max_workers=n_parallel) as executor:
        futures = [executor.submit(invoke_skill, skill) for skill in skills]
        for future in as_completed(futures):
            pass

    duration = time.time() - start

    return {
        "test": "multi_skill_invocation",
        "skills": len(skills),
        "budgets_calculated": results["skill_budgets_calculated"],
        "total_tokens": results["total_tokens"],
        "avg_tokens_per_skill": round(results["total_tokens"] / max(1, results["skill_budgets_calculated"]), 1),
        "errors": results["errors"],
        "duration_sec": round(duration, 3),
        "skills_per_sec": round(len(skills) / duration, 2),
        "status": "PASS" if results["errors"] == 0 else "FAIL"
    }

def test_simultaneous_load(tasks: List[TaskSpec], agents: List[AgentSpec], skills: List[SkillSpec]):

    all_results = {
        "task_completed": 0,
        "agent_predictions": 0,
        "skill_invocations": 0,
        "errors": 0,
        "lock": threading.Lock()
    }

    def process_task(task):
        try:
            cache = get_predictive_cache()
            cache.predict_next_agents(task.description, {})
            with all_results["lock"]:
                all_results["task_completed"] += 1
        except:
            with all_results["lock"]:
                all_results["errors"] += 1

    def process_agent(agent):
        try:
            cache = get_predictive_cache()
            cache.predict_next_agents(f"Work on {agent.agent_type}", {})
            with all_results["lock"]:
                all_results["agent_predictions"] += 1
        except:
            with all_results["lock"]:
                all_results["errors"] += 1

    def process_skill(skill):
        try:
            budget_calc = get_budget_calculator()
            budget_calc.calculate_budget(f"Execute {skill.skill_name}", {})
            with all_results["lock"]:
                all_results["skill_invocations"] += 1
        except:
            with all_results["lock"]:
                all_results["errors"] += 1

    work_items = []
    work_items.extend([("task", t) for t in tasks])
    work_items.extend([("agent", a) for a in agents])
    work_items.extend([("skill", s) for s in skills])

    random.shuffle(work_items)

    start = time.time()

    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = []
        for item_type, item in work_items:
            if item_type == "task":
                futures.append(executor.submit(process_task, item))
            elif item_type == "agent":
                futures.append(executor.submit(process_agent, item))
            else:
                futures.append(executor.submit(process_skill, item))

        for future in as_completed(futures):
            pass

    duration = time.time() - start
    total_operations = len(tasks) + len(agents) + len(skills)

    return {
        "test": "simultaneous_load",
        "total_operations": total_operations,
        "tasks": len(tasks),
        "agents": len(agents),
        "skills": len(skills),
        "task_completed": all_results["task_completed"],
        "agent_predictions": all_results["agent_predictions"],
        "skill_invocations": all_results["skill_invocations"],
        "errors": all_results["errors"],
        "duration_sec": round(duration, 3),
        "ops_per_sec": round(total_operations / duration, 2),
        "status": "PASS" if all_results["errors"] == 0 else "FAIL"
    }

def test_memory_under_load(tasks: List[TaskSpec], iterations: int = 5):
    import tracemalloc
    import gc

    tracemalloc.start()
    gc.collect()

    baseline = tracemalloc.get_traced_memory()[0]

    cache = get_predictive_cache()
    budget_calc = get_budget_calculator()

    for _ in range(iterations):
        for task in tasks:
            cache.predict_next_agents(task.description, {})
            budget_calc.calculate_budget(task.description, {})
        gc.collect()

    final = tracemalloc.get_traced_memory()[0]
    tracemalloc.stop()

    growth_kb = (final - baseline) / 1024
    ops = len(tasks) * iterations
    bytes_per_op = (final - baseline) / ops if ops > 0 else 0

    return {
        "test": "memory_under_load",
        "iterations": iterations,
        "operations": ops,
        "baseline_kb": round(baseline / 1024, 2),
        "final_kb": round(final / 1024, 2),
        "growth_kb": round(growth_kb, 2),
        "bytes_per_operation": round(bytes_per_op, 2),
        "status": "PASS" if bytes_per_op < 150 else "FAIL"
    }

if __name__ == "__main__":
    print("=" * 60)
    print("BRUTEFORCE STRESS TEST - V14.0.2")
    print("=" * 60)

    tasks = generate_tasks(60)
    agents = generate_agents(55)
    skills = generate_skills(55)

    print(f"\nGenerated: {len(tasks)} tasks, {len(agents)} agents, {len(skills)} skills")

    results = []

    print("\n[1/5] Multi-Task Throughput...")
    results.append(test_multi_task_throughput(tasks))

    print("[2/5] Multi-Agent Coordination...")
    results.append(test_multi_agent_coordination(agents))

    print("[3/5] Multi-Skill Invocation...")
    results.append(test_multi_skill_invocation(skills))

    print("[4/5] Simultaneous Load...")
    results.append(test_simultaneous_load(tasks, agents, skills))

    print("[5/5] Memory Under Load...")
    results.append(test_memory_under_load(tasks, iterations=3))

    print("\n" + "=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)

    all_pass = True
    for r in results:
        status = r.get("status", "UNKNOWN")
        if status != "PASS":
            all_pass = False
        print(f"\n{r['test'].upper()}: {status}")
        for k, v in r.items():
            if k not in ["test", "status", "lock"]:
                print(f"  {k}: {v}")

    print("\n" + "=" * 60)
    print(f"OVERALL: {'ALL PASS' if all_pass else 'SOME FAILURES'}")
    print("=" * 60)
