#!/usr/bin/env python
"""Stress test for AB Testing Framework V14.0"""

import sys
import time
import tempfile
import os
import threading
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ab_testing import ABTestingFramework, RoutingStrategy

def run_stress_test():
    print('=' * 60)
    print('AB TESTING STRESS TEST RESULTS')
    print('=' * 60)

    with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
        test_path = f.name

    errors = []
    results = {}

    # TEST 1: CREAZIONE 100 ESPERIMENTI
    print('\n[1/6] Experiment Creation Test...')
    ab = ABTestingFramework(storage_path=test_path)

    start = time.time()
    try:
        for i in range(100):
            control = RoutingStrategy(f'control_{i}', {'mode': 'haiku'})
            treatment = RoutingStrategy(f'treatment_{i}', {'mode': 'haiku', 'cache': True})
            ab.create_experiment(f'exp_{i}', control, treatment)
        elapsed = (time.time() - start) * 1000
        results['creation_time_ms'] = elapsed
        print(f'    100 experiments created in {elapsed:.0f} ms')
    except Exception as e:
        errors.append(f'Creation: {e}')
        print(f'    ERROR: {e}')

    # TEST 2: VARIANT ASSIGNMENT
    print('\n[2/6] Variant Assignment Test...')
    try:
        user_variants = []
        for user_id in [f'user_{i}' for i in range(1000)]:
            variant = ab.assign_variant('exp_0', user_id)
            user_variants.append(variant)

        dist = Counter(user_variants)
        results['distribution'] = dict(dist)
        print(f'    Variant distribution: control={dist["control"]}, treatment={dist["treatment"]} (target ~500)')

        if 450 <= dist['control'] <= 550 and 450 <= dist['treatment'] <= 550:
            results['distribution_ok'] = True
            print('    Distribution check: PASS')
        else:
            results['distribution_ok'] = False
            errors.append(f'Distribution out of range: {dict(dist)}')
            print('    Distribution check: FAIL')

        determinism_ok = True
        expected = user_variants[123]
        for _ in range(10):
            if ab.assign_variant('exp_0', 'user_123') != expected:
                determinism_ok = False
                break

        results['determinism'] = determinism_ok
        print(f'    Determinism test: {"PASS" if determinism_ok else "FAIL"}')

    except Exception as e:
        errors.append(f'Assignment: {e}')
        print(f'    ERROR: {e}')

    # TEST 3: Z-TEST
    print('\n[3/6] Z-test Statistical Test...')
    try:
        control = RoutingStrategy('control', {'mode': 'haiku'})
        treatment = RoutingStrategy('treatment', {'mode': 'opus'})
        ab.create_experiment('stat_test', control, treatment)

        for i in range(100):
            variant = ab.assign_variant('stat_test', f'stat_user_{i}')
            if variant == 'control':
                success = i < 30
            else:
                success = i < 40
            ab.record_result('stat_test', variant, success=success)

        result = ab.get_result('stat_test')
        results['z_score'] = result.z_score
        results['p_value'] = result.p_value
        results['is_significant'] = result.is_significant
        results['winner'] = result.winner

        print(f'    Z-score: {result.z_score:.3f}')
        print(f'    P-value: {result.p_value:.4f}')
        print(f'    Significant: {"YES" if result.is_significant else "NO"}')
        print(f'    Winner: {result.winner}')

    except Exception as e:
        errors.append(f'Z-test: {e}')
        print(f'    ERROR: {e}')

    # TEST 4: PERSISTENCE
    print('\n[4/6] Persistence Test...')
    try:
        ab2 = ABTestingFramework(storage_path=test_path)
        experiments = ab2.list_experiments(active_only=False)
        results['persisted_count'] = len(experiments)

        expected_count = 101
        if len(experiments) == expected_count:
            results['persistence_ok'] = True
            print(f'    Loaded {len(experiments)} experiments from disk (expected {expected_count})')
            print('    Persistence check: PASS')
        else:
            results['persistence_ok'] = False
            errors.append(f'Persistence count mismatch: {len(experiments)} vs {expected_count}')
            print(f'    Loaded {len(experiments)} experiments from disk (expected {expected_count})')
            print('    Persistence check: FAIL')

    except Exception as e:
        errors.append(f'Persistence: {e}')
        print(f'    ERROR: {e}')

    # TEST 5: THREAD SAFETY
    print('\n[5/6] Thread Safety Test...')
    try:
        ab3 = ABTestingFramework()
        control = RoutingStrategy('c', {})
        treatment = RoutingStrategy('t', {})
        ab3.create_experiment('thread_test', control, treatment)

        thread_errors = []

        def stress_thread(thread_id):
            try:
                for i in range(100):
                    variant = ab3.assign_variant('thread_test', f'thread_{thread_id}_user_{i}')
                    ab3.record_result('thread_test', variant, success=True)
            except Exception as e:
                thread_errors.append(str(e))

        threads = [threading.Thread(target=stress_thread, args=(i,)) for i in range(10)]
        for t in threads: t.start()
        for t in threads: t.join()

        results['thread_errors'] = len(thread_errors)
        results['thread_safety'] = len(thread_errors) == 0

        if thread_errors:
            print(f'    Thread safety test: FAIL')
            print(f'    Errors: {thread_errors[:3]}...')
        else:
            print('    Thread safety test: PASS (10 threads x 100 ops)')

    except Exception as e:
        errors.append(f'Thread safety: {e}')
        print(f'    ERROR: {e}')

    # TEST 6: MINIMUM SAMPLES
    print('\n[6/6] Minimum Samples Test...')
    try:
        control = RoutingStrategy('c', {})
        treatment = RoutingStrategy('t', {})
        ab.create_experiment('min_sample_test', control, treatment)

        for i in range(10):
            variant = ab.assign_variant('min_sample_test', f'min_user_{i}')
            ab.record_result('min_sample_test', variant, success=True)

        result = ab.get_result('min_sample_test')
        results['min_samples_significant'] = result.is_significant

        if not result.is_significant:
            results['min_samples_ok'] = True
            print(f'    Min samples check: is_significant={result.is_significant} (expected False)')
            print('    Min samples test: PASS')
        else:
            results['min_samples_ok'] = False
            errors.append('Min samples should not be significant')
            print(f'    Min samples check: is_significant={result.is_significant} (should be False)')
            print('    Min samples test: FAIL')

    except Exception as e:
        errors.append(f'Min samples: {e}')
        print(f'    ERROR: {e}')

    # CLEANUP
    try:
        os.unlink(test_path)
    except:
        pass

    # SUMMARY
    print('\n' + '=' * 60)
    print('SUMMARY')
    print('=' * 60)

    dist = results.get('distribution', {})
    z_score = results.get('z_score', 'N/A')
    p_value = results.get('p_value', 'N/A')

    print(f"\nExperiments Created (100): {results.get('creation_time_ms', 'N/A')} ms")
    print(f"Variant Distribution: control={dist.get('control', 'N/A')}, treatment={dist.get('treatment', 'N/A')} (target ~500 each)")
    print(f"Determinism: {'PASS' if results.get('determinism') else 'FAIL'}")
    if isinstance(z_score, float):
        print(f"Z-test: z-score={z_score:.3f}, p-value={p_value:.4f}, significant={'YES' if results.get('is_significant') else 'NO'}")
    else:
        print(f"Z-test: z-score={z_score}, p-value={p_value}")
    print(f"Persistence: {results.get('persisted_count', 'N/A')} experiments loaded")
    print(f"Thread Safety: {'PASS' if results.get('thread_safety') else 'FAIL'} (10 threads x 100 ops)")
    print(f"Min Samples Check: {'PASS' if results.get('min_samples_ok') else 'FAIL'}")
    print(f"Errors: {errors if errors else 'none'}")
    print(f"Overall: {'PASS' if not errors else 'FAIL'}")

    return len(errors) == 0


if __name__ == '__main__':
    success = run_stress_test()
    sys.exit(0 if success else 1)
