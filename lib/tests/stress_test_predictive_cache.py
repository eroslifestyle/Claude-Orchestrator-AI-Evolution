"""Stress Test per PredictiveAgentCache V14.0.

Test completi di performance, stabilità e memory leak.

Esecuzione:
    python -m pytest lib/tests/stress_test_predictive_cache.py -v -s
    # oppure
    python lib/tests/stress_test_predictive_cache.py
"""

import gc
import os
import sys
import tempfile
import threading
import time
import tracemalloc
from pathlib import Path

# Setup path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from lib.predictive_cache import (
    Prediction,
    PredictiveAgentCache,
    get_predictive_cache,
    reset_predictive_cache,
)


# ============================================================================
# Generatore Task Vari
# ============================================================================

def generate_varied_tasks(count: int = 1000) -> list:
    """Genera task vari per test."""
    base_tasks = [
        "Fix database query optimization in user service",
        "Implement OAuth2 login with Google authentication",
        "Refactor authentication module for better security",
        "Add unit tests for payment service integration",
        "Deploy to production with CI/CD pipeline",
        "Create REST API endpoint for customer data",
        "Optimize SQL query performance in reports",
        "Implement JWT token validation middleware",
        "Add integration tests for API gateway",
        "Configure Docker container for microservice",
        "Fix memory leak in data processing job",
        "Implement rate limiting for public API",
        "Add logging and monitoring to backend",
        "Create database migration for new schema",
        "Implement caching layer with Redis",
        "Fix race condition in concurrent access",
        "Add input validation for user registration",
        "Implement soft delete for audit trail",
        "Create health check endpoint for service",
        "Add pagination to large dataset queries",
        "Implement WebSocket connection handler",
        "Fix timezone handling in date calculations",
        "Add compression for API responses",
        "Implement retry logic for external API calls",
        "Create batch processing job for analytics",
        "Add encryption for sensitive data at rest",
        "Implement search functionality with indexing",
        "Fix deadlock in database transactions",
        "Add rate limiting per user subscription",
        "Implement file upload with virus scanning",
    ]

    # Variazioni
    variations = [
        "", " with error handling", " for production",
        " - urgent fix needed", " (performance optimization)",
        " - code review required", " with comprehensive tests",
        " - security audit", " (technical debt)", " for mobile app"
    ]

    tasks = []
    for i in range(count):
        base = base_tasks[i % len(base_tasks)]
        var = variations[i % len(variations)]
        tasks.append(f"{base}{var} #{i}")

    return tasks


# ============================================================================
# Test 1: Initialization Test
# ============================================================================

def test_initialization():
    """Test 1: Verifica inizializzazione cache."""
    print("\n" + "=" * 60)
    print("TEST 1: INITIALIZATION")
    print("=" * 60)

    results = {"pass": True, "errors": []}

    # 1.1 Singleton pattern
    print("\n1.1 Singleton Pattern Test...")
    try:
        reset_predictive_cache()
        cache1 = get_predictive_cache()
        cache2 = get_predictive_cache()

        if cache1 is cache2:
            print("   [PASS] Singleton pattern verificato")
        else:
            results["pass"] = False
            results["errors"].append("Singleton pattern fallito: istanze diverse")
            print("   [FAIL] Singleton pattern fallito")
    except Exception as e:
        results["pass"] = False
        results["errors"].append(f"Singleton test error: {e}")
        print(f"   [ERROR] {e}")

    # 1.2 Lazy loading AgentUsageTracker
    print("\n1.2 Lazy Loading AgentUsageTracker Test...")
    try:
        reset_predictive_cache()
        cache = get_predictive_cache()

        # Verifica che usage_tracker sia inizializzato (o None se non disponibile)
        if hasattr(cache, '_usage_tracker'):
            print(f"   [PASS] _usage_tracker presente: {type(cache._usage_tracker)}")
        else:
            results["errors"].append("WARNING: _usage_tracker non presente")
            print("   [WARN] _usage_tracker non presente")
    except Exception as e:
        results["pass"] = False
        results["errors"].append(f"Lazy loading test error: {e}")
        print(f"   [ERROR] {e}")

    # 1.3 Caricamento patterns da disco
    print("\n1.3 Pattern Loading Test...")
    import json
    temp_path = None
    try:
        # Crea file temporaneo con patterns (delete=False per evitare race condition)
        fd, temp_path = tempfile.mkstemp(suffix='.json')
        with os.fdopen(fd, 'w') as f:
            json.dump({
                "patterns": {
                    "database:fix": {
                        "agents": ["Database Expert", "DB Query Optimizer L2"],
                        "frequency": 5,
                        "last_seen": time.time()
                    }
                },
                "cooccurrence": {
                    "sql|query": 3
                },
                "version": "1.0.0"
            }, f)

        # Crea cache con file temporaneo
        cache = PredictiveAgentCache(patterns_path=temp_path)

        stats = cache.get_pattern_stats()
        if stats["total_patterns"] >= 1:
            print(f"   [PASS] Caricati {stats['total_patterns']} patterns da disco")
        else:
            results["errors"].append("WARNING: Nessun pattern caricato")
            print("   [WARN] Nessun pattern caricato")

        # Cleanup
        cache.clear_history()

    except Exception as e:
        results["pass"] = False
        results["errors"].append(f"Pattern loading test error: {e}")
        print(f"   [ERROR] {e}")
    finally:
        # Cleanup file temporaneo
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass

    # Reset finale
    reset_predictive_cache()

    status = "PASS" if results["pass"] else "FAIL"
    print(f"\n>>> TEST 1 RESULT: {status}")
    if results["errors"]:
        for err in results["errors"]:
            print(f"    Error: {err}")

    return results


# ============================================================================
# Test 2: Prediction Stress Test (1000 iterazioni)
# ============================================================================

def test_prediction_stress():
    """Test 2: Stress test con 1000 predizioni."""
    print("\n" + "=" * 60)
    print("TEST 2: PREDICTION STRESS (1000 iterations)")
    print("=" * 60)

    results = {"pass": True, "errors": [], "metrics": {}}

    reset_predictive_cache()
    cache = get_predictive_cache()

    # Genera 1000 task
    tasks = generate_varied_tasks(1000)

    print(f"\n2.1 Esecuzione {len(tasks)} predizioni...")

    start_time = time.perf_counter()
    predictions_count = 0

    try:
        for i, task in enumerate(tasks):
            predictions = cache.predict_next_agents(task, {})
            predictions_count += len(predictions)

            # Progress ogni 250
            if (i + 1) % 250 == 0:
                elapsed = time.perf_counter() - start_time
                rate = (i + 1) / elapsed
                print(f"   Progress: {i+1}/1000 ({rate:.1f} ops/sec)")

        elapsed = time.perf_counter() - start_time

        # Metriche
        avg_time_ms = (elapsed / len(tasks)) * 1000
        ops_per_sec = len(tasks) / elapsed

        print(f"\n   [METRICS]")
        print(f"   - Total time: {elapsed:.2f}s")
        print(f"   - Avg per prediction: {avg_time_ms:.2f}ms")
        print(f"   - Ops/sec: {ops_per_sec:.1f}")
        print(f"   - Total predictions generated: {predictions_count}")

        results["metrics"] = {
            "total_time_s": elapsed,
            "avg_time_ms": avg_time_ms,
            "ops_per_sec": ops_per_sec,
            "predictions_generated": predictions_count
        }

        # Verifica performance target (< 5ms avg)
        if avg_time_ms < 5.0:
            print(f"   [PASS] Avg time {avg_time_ms:.2f}ms < 5ms target")
        else:
            results["errors"].append(f"WARNING: Avg time {avg_time_ms:.2f}ms > 5ms target")
            print(f"   [WARN] Avg time {avg_time_ms:.2f}ms > 5ms target")

    except Exception as e:
        results["pass"] = False
        results["errors"].append(f"Stress test error: {e}")
        print(f"   [ERROR] {e}")

    reset_predictive_cache()

    status = "PASS" if results["pass"] else "FAIL"
    print(f"\n>>> TEST 2 RESULT: {status}")
    return results


# ============================================================================
# Test 3: Accuracy Test
# ============================================================================

def test_accuracy():
    """Test 3: Verifica accuracy delle predizioni."""
    print("\n" + "=" * 60)
    print("TEST 3: ACCURACY TEST")
    print("=" * 60)

    results = {"pass": True, "errors": [], "metrics": {}}

    # Crea cache con file temporaneo
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        f.write('{}')
        temp_path = f.name

    try:
        cache = PredictiveAgentCache(
            confidence_threshold=0.5,
            patterns_path=temp_path
        )

        # Pattern consistenti per test accuracy
        patterns = [
            ("Fix database query optimization", ["Database Expert", "DB Query Optimizer L2"]),
            ("Create API endpoint for users", ["Integration Expert", "API Endpoint Builder L2"]),
            ("Add authentication with JWT", ["Security Unified Expert", "Security Auth Specialist L2"]),
            ("Write unit tests for service", ["Tester Expert", "Test Unit Specialist L2"]),
            ("Deploy to Kubernetes cluster", ["DevOps Expert", "DevOps Pipeline Specialist L2"]),
        ]

        print("\n3.1 Training con pattern consistenti (100 iterazioni)...")

        # Training: registra utilizzo coerente
        for _ in range(20):  # 100 task total
            for task, agents in patterns:
                cache.predict_next_agents(task)
                cache.record_actual_usage(task, agents)

        # Test: verifica accuracy
        print("\n3.2 Verifica accuracy...")

        metrics = cache.get_accuracy_metrics()
        print(f"\n   [METRICS]")
        print(f"   - Total predictions: {metrics['total_predictions']}")
        print(f"   - Accuracy: {metrics['accuracy']:.2%}")
        print(f"   - High confidence accuracy: {metrics['high_confidence_accuracy']:.2%}")
        print(f"   - Pattern count: {metrics.get('pattern_count', 0)}")

        results["metrics"] = metrics

        # Verifica target > 85%
        if metrics["accuracy"] >= 0.85:
            print(f"   [PASS] Accuracy {metrics['accuracy']:.2%} >= 85% target")
        elif metrics["accuracy"] >= 0.70:
            results["errors"].append(f"WARNING: Accuracy {metrics['accuracy']:.2%} < 85% target but acceptable")
            print(f"   [WARN] Accuracy {metrics['accuracy']:.2%} < 85% target")
        else:
            results["pass"] = False
            results["errors"].append(f"FAIL: Accuracy {metrics['accuracy']:.2%} too low")
            print(f"   [FAIL] Accuracy {metrics['accuracy']:.2%} too low")

        cache.clear_history()

    except Exception as e:
        results["pass"] = False
        results["errors"].append(f"Accuracy test error: {e}")
        print(f"   [ERROR] {e}")

    finally:
        try:
            os.unlink(temp_path)
        except:
            pass

    status = "PASS" if results["pass"] else "FAIL"
    print(f"\n>>> TEST 3 RESULT: {status}")
    return results


# ============================================================================
# Test 4: Memory Leak Test
# ============================================================================

def test_memory_leak():
    """Test 4: Verifica memory leak."""
    print("\n" + "=" * 60)
    print("TEST 4: MEMORY LEAK TEST")
    print("=" * 60)

    results = {"pass": True, "errors": [], "metrics": {}}

    # Crea file temporaneo
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        f.write('{}')
        temp_path = f.name

    try:
        cache = PredictiveAgentCache(patterns_path=temp_path)

        print("\n4.1 Avvio memory profiling...")
        tracemalloc.start()

        # Snapshot iniziale
        gc.collect()
        snapshot_before = tracemalloc.take_snapshot()

        # Esegui 1000 operazioni
        print("   Eseguendo 1000 operazioni...")
        for i in range(1000):
            task = f"Test task {i} with database query optimization"
            cache.predict_next_agents(task)
            if i % 200 == 0:
                cache.record_actual_usage(task, ["Database Expert"])

        # Snapshot finale
        gc.collect()
        snapshot_after = tracemalloc.take_snapshot()

        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        # Analizza differenza
        top_stats = snapshot_after.compare_to(snapshot_before, 'lineno')

        print(f"\n   [METRICS]")
        print(f"   - Current memory: {current / 1024:.2f} KB")
        print(f"   - Peak memory: {peak / 1024:.2f} KB")
        print(f"   - Peak memory: {peak / 1024 / 1024:.2f} MB")

        results["metrics"] = {
            "current_kb": current / 1024,
            "peak_kb": peak / 1024,
            "peak_mb": peak / 1024 / 1024
        }

        # Top 5 allocations
        print(f"\n   Top 5 memory allocations:")
        for stat in top_stats[:5]:
            print(f"   - {stat}")

        # Verifica target < 1MB
        if peak < 1024 * 1024:  # 1MB
            print(f"\n   [PASS] Peak memory {peak/1024:.2f}KB < 1MB target")
        else:
            results["errors"].append(f"WARNING: Peak memory {peak/1024/1024:.2f}MB >= 1MB target")
            print(f"   [WARN] Peak memory {peak/1024/1024:.2f}MB >= 1MB target")

        cache.clear_history()

    except Exception as e:
        results["pass"] = False
        results["errors"].append(f"Memory leak test error: {e}")
        print(f"   [ERROR] {e}")

    finally:
        try:
            os.unlink(temp_path)
        except:
            pass
        try:
            tracemalloc.stop()
        except:
            pass

    status = "PASS" if results["pass"] else "FAIL"
    print(f"\n>>> TEST 4 RESULT: {status}")
    return results


# ============================================================================
# Test 5: Thread Safety Test
# ============================================================================

def test_thread_safety():
    """Test 5: Verifica thread safety."""
    print("\n" + "=" * 60)
    print("TEST 5: THREAD SAFETY TEST")
    print("=" * 60)

    results = {"pass": True, "errors": [], "metrics": {}}

    # Crea file temporaneo
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        f.write('{}')
        temp_path = f.name

    try:
        cache = PredictiveAgentCache(patterns_path=temp_path)

        num_threads = 10
        ops_per_thread = 100
        errors_list = []

        def stress_thread(thread_id: int):
            """Worker thread."""
            try:
                for i in range(ops_per_thread):
                    task = f"Thread {thread_id} task {i} database query"
                    cache.predict_next_agents(task)
                    if i % 10 == 0:
                        cache.record_actual_usage(task, [f"Agent-{thread_id}"])
            except Exception as e:
                errors_list.append(f"Thread {thread_id}: {e}")

        print(f"\n5.1 Avvio {num_threads} threads x {ops_per_thread} ops...")

        threads = [
            threading.Thread(target=stress_thread, args=(i,))
            for i in range(num_threads)
        ]

        start_time = time.perf_counter()

        for t in threads:
            t.start()

        for t in threads:
            t.join()

        elapsed = time.perf_counter() - start_time
        total_ops = num_threads * ops_per_thread

        print(f"\n   [METRICS]")
        print(f"   - Threads: {num_threads}")
        print(f"   - Ops/thread: {ops_per_thread}")
        print(f"   - Total ops: {total_ops}")
        print(f"   - Time: {elapsed:.2f}s")
        print(f"   - Errors: {len(errors_list)}")

        results["metrics"] = {
            "threads": num_threads,
            "ops_per_thread": ops_per_thread,
            "total_ops": total_ops,
            "time_s": elapsed,
            "errors": len(errors_list)
        }

        if len(errors_list) == 0:
            print(f"\n   [PASS] Thread safety verificata (0 errori)")
        else:
            results["pass"] = False
            for err in errors_list[:5]:
                results["errors"].append(err)
                print(f"   [ERROR] {err}")

        cache.clear_history()

    except Exception as e:
        results["pass"] = False
        results["errors"].append(f"Thread safety test error: {e}")
        print(f"   [ERROR] {e}")

    finally:
        try:
            os.unlink(temp_path)
        except:
            pass

    status = "PASS" if results["pass"] else "FAIL"
    print(f"\n>>> TEST 5 RESULT: {status}")
    return results


# ============================================================================
# Test 6: Pattern Recognition Test
# ============================================================================

def test_pattern_recognition():
    """Test 6: Verifica pattern recognition."""
    print("\n" + "=" * 60)
    print("TEST 6: PATTERN RECOGNITION TEST")
    print("=" * 60)

    results = {"pass": True, "errors": [], "metrics": {}}

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        f.write('{}')
        temp_path = f.name

    try:
        cache = PredictiveAgentCache(patterns_path=temp_path)

        # Registra vari pattern
        print("\n6.1 Registrazione pattern...")

        patterns_to_register = [
            ("Fix database query", ["Database Expert"]),
            ("Create API endpoint", ["Integration Expert"]),
            ("Add JWT auth", ["Security Unified Expert"]),
            ("Write tests", ["Tester Expert"]),
            ("Deploy to k8s", ["DevOps Expert"]),
        ]

        for task, agents in patterns_to_register:
            cache.record_actual_usage(task, agents)

        # Ottieni statistiche
        stats = cache.get_pattern_stats()

        print(f"\n   [METRICS]")
        print(f"   - Total patterns: {stats['total_patterns']}")
        print(f"   - Keyword co-occurrences: {stats['keyword_cooccurrences']}")
        print(f"   - Recent predictions: {stats['recent_predictions_count']}")

        # Top patterns
        print(f"\n   Top patterns:")
        for p in stats['top_patterns'][:5]:
            print(f"   - {p['key']}: freq={p['frequency']}, agents={p['agents']}")

        results["metrics"] = stats

        # Verifica
        if stats['total_patterns'] >= 1:
            print(f"\n   [PASS] Pattern recognition attivo ({stats['total_patterns']} patterns)")
        else:
            results["errors"].append("WARNING: Nessun pattern riconosciuto")
            print("   [WARN] Nessun pattern riconosciuto")

        cache.clear_history()

    except Exception as e:
        results["pass"] = False
        results["errors"].append(f"Pattern recognition test error: {e}")
        print(f"   [ERROR] {e}")

    finally:
        try:
            os.unlink(temp_path)
        except:
            pass

    status = "PASS" if results["pass"] else "FAIL"
    print(f"\n>>> TEST 6 RESULT: {status}")
    return results


# ============================================================================
# Main Runner
# ============================================================================

def run_all_tests():
    """Esegue tutti gli stress test."""
    print("\n" + "=" * 60)
    print("PREDICTIVE CACHE STRESS TEST SUITE")
    print("=" * 60)
    print("Target: accuracy > 85%, memory < 1MB, thread safe")
    print("=" * 60)

    all_results = {
        "initialization": test_initialization(),
        "prediction_stress": test_prediction_stress(),
        "accuracy": test_accuracy(),
        "memory_leak": test_memory_leak(),
        "thread_safety": test_thread_safety(),
        "pattern_recognition": test_pattern_recognition(),
    }

    # Summary
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)

    total_pass = sum(1 for r in all_results.values() if r["pass"])
    total_tests = len(all_results)

    print(f"\nResults: {total_pass}/{total_tests} PASS")

    for name, result in all_results.items():
        status = "PASS" if result["pass"] else "FAIL"
        print(f"  - {name}: {status}")
        if result.get("errors"):
            for err in result["errors"][:2]:
                print(f"      {err}")

    # Key metrics
    print("\n" + "-" * 40)
    print("KEY METRICS:")
    print("-" * 40)

    if all_results["prediction_stress"].get("metrics"):
        m = all_results["prediction_stress"]["metrics"]
        print(f"  Predictions (1000): {m.get('avg_time_ms', 0):.2f}ms avg, {m.get('ops_per_sec', 0):.1f} ops/sec")

    if all_results["accuracy"].get("metrics"):
        m = all_results["accuracy"]["metrics"]
        print(f"  Accuracy: {m.get('accuracy', 0):.2%} (target >85%)")

    if all_results["memory_leak"].get("metrics"):
        m = all_results["memory_leak"]["metrics"]
        print(f"  Memory: {m.get('peak_kb', 0):.2f}KB peak (target <1MB)")

    if all_results["thread_safety"].get("metrics"):
        m = all_results["thread_safety"]["metrics"]
        print(f"  Thread Safety: {m.get('threads', 0)} threads x {m.get('ops_per_thread', 0)} ops")

    # Overall
    print("\n" + "=" * 60)
    overall_status = "PASS" if total_pass == total_tests else "PARTIAL"
    print(f"OVERALL: {overall_status}")
    print("=" * 60)

    return all_results


if __name__ == "__main__":
    run_all_tests()
