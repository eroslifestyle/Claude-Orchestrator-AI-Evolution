/**
 * CCH PERFORMANCE BENCHMARKS
 * =========================
 *
 * Comprehensive performance benchmarks for CCH components:
 * - Throughput: >100 messages/second target
 * - Latency: <100ms for routing target
 * - Context acquisition: <10ms target
 * - Cache hit rate: >80% target
 *
 * Run with: npm run benchmark
 * or: ts-node tests/cch/benchmark.ts
 *
 * @version 1.0.0
 * @date 01 February 2026
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { performance } from 'perf_hooks';

import {
  UnifiedMessageQueue,
  type CCHMessage,
  MessagePriority
} from '../../src/cch/queue/UnifiedMessageQueue';

import {
  UnifiedRouterEngine,
  type TaskRequest
} from '../../src/cch/routing/UnifiedRouterEngine';

import {
  ContextPoolManager
} from '../../src/cch/pool/ContextPoolManager';

import {
  FaultToleranceLayer
} from '../../src/cch/fault/FaultToleranceLayer';

import {
  ObservabilityModule
} from '../../src/cch/observability/ObservabilityModule';

import {
  CentralCommunicationHub,
  createHub
} from '../../src/cch/CentralCommunicationHub';

// ============================================================================
// BENCHMARK UTILITIES
// ============================================================================

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
  target: string;
  passed: boolean;
}

interface BenchmarkSuite {
  name: string;
  benchmarks: BenchmarkResult[];
}

class BenchmarkRunner {
  private suites: Map<string, BenchmarkSuite> = new Map();

  async bench(
    suiteName: string,
    benchmarkName: string,
    iterations: number,
    fn: (iteration: number) => Promise<void> | void,
    targetCheck: (result: BenchmarkResult) => boolean
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await fn(i);
    }

    // Actual benchmark
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now();
      await fn(i);
      times.push(performance.now() - iterStart);
    }

    const totalTime = performance.now() - startTime;
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = (iterations / totalTime) * 1000;

    const result: BenchmarkResult = {
      name: benchmarkName,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      opsPerSecond,
      target: '',
      passed: false
    };

    result.passed = targetCheck(result);

    // Add to suite
    if (!this.suites.has(suiteName)) {
      this.suites.set(suiteName, { name: suiteName, benchmarks: [] });
    }
    this.suites.get(suiteName)!.benchmarks.push(result);

    return result;
  }

  async benchThroughput(
    suiteName: string,
    benchmarkName: string,
    durationMs: number,
    targetOpsPerSecond: number,
    fn: () => Promise<void> | void
  ): Promise<BenchmarkResult> {
    const startTime = performance.now();
    let iterations = 0;

    while (performance.now() - startTime < durationMs) {
      await fn();
      iterations++;
    }

    const totalTime = performance.now() - startTime;
    const opsPerSecond = (iterations / totalTime) * 1000;

    const result: BenchmarkResult = {
      name: benchmarkName,
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      minTime: 0,
      maxTime: 0,
      opsPerSecond,
      target: `>${targetOpsPerSecond} ops/sec`,
      passed: opsPerSecond >= targetOpsPerSecond
    };

    if (!this.suites.has(suiteName)) {
      this.suites.set(suiteName, { name: suiteName, benchmarks: [] });
    }
    this.suites.get(suiteName)!.benchmarks.push(result);

    return result;
  }

  printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('                     CCH PERFORMANCE BENCHMARK RESULTS');
    console.log('='.repeat(80) + '\n');

    for (const suite of this.suites.values()) {
      console.log(`\n${suite.name}`);
      console.log('-'.repeat(80));

      for (const bench of suite.benchmarks) {
        const status = bench.passed ? 'PASS' : 'FAIL';
        const statusColor = bench.passed ? '\x1b[32m' : '\x1b[31m';
        const reset = '\x1b[0m';

        console.log(`  ${bench.name}`);
        console.log(`    Status:     ${statusColor}${status}${reset} (target: ${bench.target || 'N/A'})`);
        console.log(`    Iterations: ${bench.iterations.toLocaleString()}`);
        console.log(`    Total Time: ${bench.totalTime.toFixed(2)}ms`);
        console.log(`    Avg Time:   ${bench.avgTime.toFixed(3)}ms`);
        console.log(`    Min Time:   ${bench.minTime.toFixed(3)}ms`);
        console.log(`    Max Time:   ${bench.maxTime.toFixed(3)}ms`);
        console.log(`    Throughput: ${bench.opsPerSecond.toFixed(2)} ops/sec`);
        console.log('');
      }

      // Suite summary
      const passed = suite.benchmarks.filter(b => b.passed).length;
      const total = suite.benchmarks.length;
      console.log(`  Suite: ${passed}/${total} benchmarks passed`);
    }

    // Overall summary
    const allBenchmarks = Array.from(this.suites.values()).flatMap(s => s.benchmarks);
    const totalPassed = allBenchmarks.filter(b => b.passed).length;
    const totalBenchmarks = allBenchmarks.length;

    console.log('\n' + '='.repeat(80));
    console.log(`OVERALL: ${totalPassed}/${totalBenchmarks} benchmarks passed`);
    console.log('='.repeat(80) + '\n');

    // Performance targets summary
    console.log('Performance Targets:');
    console.log('  - Throughput:    >100 msg/sec');
    console.log('  - Latency:       <100ms (routing)');
    console.log('  - Context:       <10ms (acquisition)');
    console.log('  - Cache Hit:     >80%');
    console.log('');
  }

  getSummary(): {
    totalBenchmarks: number;
    passed: number;
    failed: number;
    passRate: number;
  } {
    const allBenchmarks = Array.from(this.suites.values()).flatMap(s => s.benchmarks);
    const passed = allBenchmarks.filter(b => b.passed).length;

    return {
      totalBenchmarks: allBenchmarks.length,
      passed,
      failed: allBenchmarks.length - passed,
      passRate: (passed / allBenchmarks.length) * 100
    };
  }
}

// ============================================================================
// MESSAGE QUEUE BENCHMARKS
// ============================================================================

async function benchmarkUMQ(runner: BenchmarkRunner): Promise<void> {
  console.log('Initializing UMQ benchmarks...');

  const umq = new UnifiedMessageQueue({
    storagePath: './benchmark-data/umq',
    logLevel: 'error',
    pollingInterval: 10,
    maxBatchSize: 100
  });
  await umq.initialize();

  // Throughput benchmark
  await runner.benchThroughput(
    'UnifiedMessageQueue',
    'Message Publish Throughput',
    5000, // 5 seconds
    100, // target: 100 msg/sec
    async () => {
      await umq.publish('bench.test', {
        id: '',
        topic: 'bench.test',
        payload: { data: 'benchmark test message' },
        timestamp: Date.now(),
        priority: MessagePriority.NORMAL,
        retryCount: 0,
        headers: {}
      });
    }
  );

  // Single message publish latency
  await runner.bench(
    'UnifiedMessageQueue',
    'Message Publish Latency',
    1000,
    async (i) => {
      await umq.publish(`bench.latency.${i % 10}`, {
        id: '',
        topic: `bench.latency.${i % 10}`,
        payload: { index: i },
        timestamp: Date.now(),
        priority: MessagePriority.NORMAL,
        retryCount: 0,
        headers: {}
      });
    },
    (result) => result.avgTime < 50 // target: <50ms
  );

  // Subscribe and delivery
  let deliveredCount = 0;
  umq.subscribe('bench.delivery.*', async () => {
    deliveredCount++;
  });

  await runner.benchThroughput(
    'UnifiedMessageQueue',
    'Message Delivery Throughput',
    5000,
    100,
    async () => {
      await umq.publish(`bench.delivery.${deliveredCount % 10}`, {
        id: '',
        topic: `bench.delivery.${deliveredCount % 10}`,
        payload: {},
        timestamp: Date.now(),
        priority: MessagePriority.NORMAL,
        retryCount: 0,
        headers: {}
      });
    }
  );

  await umq.shutdown();
}

// ============================================================================
// ROUTER BENCHMARKS
// ============================================================================

async function benchmarkURE(runner: BenchmarkRunner): Promise<void> {
  console.log('Initializing URE benchmarks...');

  const ure = new UnifiedRouterEngine({
    maxCacheEntries: 1000,
    cachingEnabled: true,
    metricsEnabled: true
  });

  // Cache warmup - create 50 unique requests
  const warmupRequests: TaskRequest[] = [];
  for (let i = 0; i < 50; i++) {
    warmupRequests.push({
      request: `Create a GUI component ${i}`,
      domain: i % 3 === 0 ? 'gui' : i % 3 === 1 ? 'database' : 'security'
    });
  }

  await ure.warmup(warmupRequests);

  // Routing latency (cache hit)
  await runner.bench(
    'UnifiedRouterEngine',
    'Routing Decision Latency (Cache Hit)',
    1000,
    (i) => {
      ure.route(warmupRequests[i % warmupRequests.length]);
    },
    (result) => result.avgTime < 100 // target: <100ms
  );

  // Routing latency (cache miss)
  const uniqueRequests: TaskRequest[] = [];
  for (let i = 0; i < 100; i++) {
    uniqueRequests.push({
      request: `Unique routing request ${i} with specific parameters`,
      complexity: i % 4 === 0 ? 'low' : i % 4 === 1 ? 'medium' : i % 4 === 2 ? 'high' : 'extreme'
    });
  }

  await runner.bench(
    'UnifiedRouterEngine',
    'Routing Decision Latency (Cache Miss)',
    100,
    (i) => {
      ure.route(uniqueRequests[i]);
    },
    (result) => result.avgTime < 200 // target: <200ms for cache miss
  );

  // Cache hit rate
  const mixedRequests: TaskRequest[] = [];
  // 80% repeated, 20% unique
  for (let i = 0; i < 100; i++) {
    if (i < 80) {
      mixedRequests.push(warmupRequests[i % warmupRequests.length]);
    } else {
      mixedRequests.push({
        request: `Unique request ${i}`
      });
    }
  }

  // Reset stats
  ure.resetStats();

  for (const req of mixedRequests) {
    ure.route(req);
  }

  const stats = ure.getStats();
  const hitRate = stats.cacheHitRate;

  runner.suites.get('UnifiedRouterEngine')!.benchmarks.push({
    name: 'Cache Hit Rate',
    iterations: 100,
    totalTime: 0,
    avgTime: 0,
    minTime: 0,
    maxTime: 0,
    opsPerSecond: hitRate * 100,
    target: '>80%',
    passed: hitRate > 0.8
  });

  // Throughput
  await runner.benchThroughput(
    'UnifiedRouterEngine',
    'Routing Throughput',
    5000,
    100,
    () => {
      ure.route(warmupRequests[Math.floor(Math.random() * warmupRequests.length)]);
    }
  );
}

// ============================================================================
// CONTEXT POOL BENCHMARKS
// ============================================================================

async function benchmarkCPM(runner: BenchmarkRunner): Promise<void> {
  console.log('Initializing CPM benchmarks...');

  const cpm = new ContextPoolManager({
    minPoolSize: 10,
    maxPoolSize: 100,
    preloadCount: 50,
    contextTTL: 60000,
    cleanupInterval: 10000
  });

  // Preload contexts
  await cpm.preload(['gui', 'database', 'coder', 'security', 'api']);

  // Context acquisition latency (from pool)
  await runner.bench(
    'ContextPoolManager',
    'Context Acquisition Latency (From Pool)',
    1000,
    async () => {
      const ctx = await cpm.acquire('gui');
      await cpm.release(ctx);
    },
    (result) => result.avgTime < 10 // target: <10ms
  );

  // Context acquisition throughput
  await runner.benchThroughput(
    'ContextPoolManager',
    'Context Acquisition Throughput',
    5000,
    100, // target: 100 acquisitions/sec
    async () => {
      const ctx = await cpm.acquire('database');
      await cpm.release(ctx);
    }
  );

  // Multi-agent type acquisition
  const agentTypes = ['gui', 'database', 'coder', 'security', 'api'];

  await runner.bench(
    'ContextPoolManager',
    'Multi-Agent Context Acquisition',
    500,
    async (i) => {
      const agentType = agentTypes[i % agentTypes.length];
      const ctx = await cpm.acquire(agentType);
      await cpm.release(ctx);
    },
    (result) => result.avgTime < 15 // target: <15ms
  );

  // Pool hit rate
  // First, populate the pool
  const contexts: unknown[] = [];
  for (let i = 0; i < 50; i++) {
    const ctx = await cpm.acquire('gui');
    contexts.push(ctx);
  }
  for (const ctx of contexts) {
    await cpm.release(ctx as any);
  }

  // Reset stats
  cpm.resetStats();

  // Now acquire and release multiple times
  for (let i = 0; i < 100; i++) {
    const ctx = await cpm.acquire('gui');
    await cpm.release(ctx);
  }

  const poolStats = cpm.getStats();
  const hitRate = poolStats.hitRate;

  runner.suites.get('ContextPoolManager')!.benchmarks.push({
    name: 'Pool Hit Rate',
    iterations: 100,
    totalTime: 0,
    avgTime: 0,
    minTime: 0,
    maxTime: 0,
    opsPerSecond: hitRate * 100,
    target: '>80%',
    passed: hitRate > 0.8
  });

  cpm.shutdown();
}

// ============================================================================
// FAULT TOLERANCE BENCHMARKS
// ============================================================================

async function benchmarkFTL(runner: BenchmarkRunner): Promise<void> {
  console.log('Initializing FTL benchmarks...');

  const ftl = new FaultToleranceLayer({
    defaultRetryPolicy: {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 100,
      multiplier: 2,
      jitter: false
    },
    circuitBreaker: {
      failureThreshold: 10,
      successThreshold: 2,
      timeout: 60000,
      slidingWindowSize: 100,
      halfOpenMaxCalls: 3
    }
  });

  // Successful execution latency
  await runner.bench(
    'FaultToleranceLayer',
    'Successful Execution Latency',
    1000,
    async () => {
      await ftl.execute('test-service', async () => {
        return 'ok';
      });
    },
    (result) => result.avgTime < 5 // target: <5ms overhead
  );

  // Retry execution latency
  await runner.bench(
    'FaultToleranceLayer',
    'Retry Execution Latency (3 attempts)',
    100,
    async () => {
      let attempts = 0;
      await ftl.execute('retry-service', async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('fail');
        }
        return 'ok';
      });
    },
    (result) => result.avgTime < 100 // target: <100ms with retries
  );

  // Throughput (successful)
  await runner.benchThroughput(
    'FaultToleranceLayer',
    'Execution Throughput (Success)',
    5000,
    500, // target: 500 executions/sec
    async () => {
      await ftl.execute('throughput-service', async () => 'ok');
    }
  );

  ftl.shutdown();
}

// ============================================================================
// OBSERVABILITY BENCHMARKS
// ============================================================================

async function benchmarkOM(runner: BenchmarkRunner): Promise<void> {
  console.log('Initializing OM benchmarks...');

  const om = new ObservabilityModule({
    logLevel: 'error',
    maxMetrics: 10000
  });

  // Metric recording latency
  await runner.bench(
    'ObservabilityModule',
    'Counter Increment Latency',
    10000,
    (i) => {
      om.increment('bench.counter', 1, { iter: String(i % 10) });
    },
    (result) => result.avgTime < 1 // target: <1ms
  );

  // Gauge set latency
  await runner.bench(
    'ObservabilityModule',
    'Gauge Set Latency',
    10000,
    (i) => {
      om.gauge('bench.gauge', i, { iter: String(i % 10) });
    },
    (result) => result.avgTime < 1 // target: <1ms
  );

  // Span creation/finish latency
  await runner.bench(
    'ObservabilityModule',
    'Span Lifecycle Latency',
    1000,
    () => {
      const span = om.startSpan('bench.operation');
      om.finishSpan(span);
    },
    (result) => result.avgTime < 5 // target: <5ms
  );

  // Logging latency
  await runner.bench(
    'ObservabilityModule',
    'Logging Latency',
    1000,
    (i) => {
      om.info('Benchmark log message', { iteration: i });
    },
    (result) => result.avgTime < 2 // target: <2ms
  );

  // Metrics export
  await runner.bench(
    'ObservabilityModule',
    'Metrics Export Latency (1000 metrics)',
    100,
    async () => {
      om.exportMetrics('json');
    },
    (result) => result.avgTime < 100 // target: <100ms
  );

  om.shutdown();
}

// ============================================================================
// HUB INTEGRATION BENCHMARKS
// ============================================================================

async function benchmarkHub(runner: BenchmarkRunner): Promise<void> {
  console.log('Initializing Hub benchmarks...');

  const hub = new CentralCommunicationHub({
    storagePath: './benchmark-data/hub',
    autoInit: true,
    enableShutdownHooks: false,
    umq: {
      logLevel: 'error',
      pollingInterval: 10
    },
    om: {
      logLevel: 'error'
    }
  });
  await hub.initialize();
  await hub.preloadContexts(['gui', 'database', 'coder']);

  // End-to-end message flow
  let receivedCount = 0;
  hub.subscribe('bench.e2e.*', async () => {
    receivedCount++;
  });

  await runner.benchThroughput(
    'CentralCommunicationHub',
    'End-to-End Message Throughput',
    5000,
    100, // target: 100 msg/sec
    async () => {
      await hub.publish(`bench.e2e.test`, {
        data: 'benchmark message'
      });
    }
  );

  // Routing with context acquisition
  await runner.bench(
    'CentralCommunicationHub',
    'Route + Acquire Context Latency',
    500,
    async () => {
      const context = await hub.routeAndAcquire({
        request: 'Create a GUI component'
      });
      await hub.releaseContext(context.cleanContext);
    },
    (result) => result.avgTime < 50 // target: <50ms
  );

  // Full execute with routing
  await runner.bench(
    'CentralCommunicationHub',
    'Execute With Routing Latency',
    200,
    async () => {
      await hub.executeWithRouting(
        { request: 'Simple task' },
        async (ctx) => {
          return { result: 'ok' };
        }
      );
    },
    (result) => result.avgTime < 100 // target: <100ms
  );

  // Statistics gathering
  await runner.bench(
    'CentralCommunicationHub',
    'Statistics Gathering Latency',
    1000,
    () => {
      hub.getStats();
    },
    (result) => result.avgTime < 10 // target: <10ms
  );

  await hub.shutdown();
}

// ============================================================================
// MAIN BENCHMARK RUNNER
// ============================================================================

async function runAllBenchmarks(): Promise<void> {
  console.clear();
  console.log('\n' + '='.repeat(80));
  console.log('               CCH - CENTRAL COMMUNICATION HUB');
  console.log('                    PERFORMANCE BENCHMARKS');
  console.log('='.repeat(80));
  console.log('\nStarting benchmarks...\n');

  const runner = new BenchmarkRunner();

  try {
    // Run all benchmark suites
    await benchmarkUMQ(runner);
    await benchmarkURE(runner);
    await benchmarkCPM(runner);
    await benchmarkFTL(runner);
    await benchmarkOM(runner);
    await benchmarkHub(runner);

    // Print results
    runner.printResults();

    // Exit with appropriate code
    const summary = runner.getSummary();
    const exitCode = summary.failed > 0 ? 1 : 0;

    console.log(`Benchmark completed with exit code: ${exitCode}`);

    // In Node.js, we can't directly exit in all environments
    // but we return the summary for programmatic use
    return { summary, exitCode };
  } catch (error) {
    console.error('Benchmark error:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { runAllBenchmarks, BenchmarkRunner, BenchmarkResult };

// Run if executed directly
if (require.main === module) {
  runAllBenchmarks()
    .then(({ exitCode }) => {
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
