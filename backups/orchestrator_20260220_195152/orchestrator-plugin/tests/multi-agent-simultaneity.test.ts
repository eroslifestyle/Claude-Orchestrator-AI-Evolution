/**
 * MULTI-AGENT SIMULTANEITY TEST SUITE
 *
 * Test completi per verificare:
 * 1. Esecuzione simultanea di task multipli
 * 2. Coordinazione multi-agent
 * 3. Parallelismo massivo (fino a 64 agent)
 * 4. Gestione dipendenze con esecuzione parallela
 * 5. Clear contesto automatico
 * 6. Performance sotto carico
 *
 * @version 1.0
 * @date 2026-02-03
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { performance } from 'perf_hooks';

import {
  ParallelExecutionRule,
  createParallelExecutionRule,
  TaskNode,
  ParallelExecutionPlan,
  ExecutionMetrics
} from '../src/execution/ParallelExecutionRule';

import {
  AgentContextManager,
  createAgentContextManager,
  executeWithCleanContext,
  executeBatchWithCleanContexts
} from '../src/execution/AgentContextManager';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Crea task di test con configurazione specifica
 */
function createTestTasks(count: number, withDependencies: boolean = false): TaskNode[] {
  const tasks: TaskNode[] = [];

  for (let i = 0; i < count; i++) {
    const task: TaskNode = {
      id: `task-${i.toString().padStart(3, '0')}`,
      description: `Test Task ${i + 1} - Simulated workload`,
      status: 'pending',
      dependencies: [],
      priority: i < count * 0.1 ? 'CRITICA' :
                i < count * 0.3 ? 'ALTA' :
                i < count * 0.6 ? 'MEDIA' : 'BASSA',
      estimatedDurationMs: 100 + Math.random() * 200, // 100-300ms
      agentType: `agent-type-${i % 5}`,
      model: i % 3 === 0 ? 'opus' : i % 3 === 1 ? 'sonnet' : 'haiku'
    };

    tasks.push(task);
  }

  // Add dependencies if requested
  if (withDependencies && count > 3) {
    // Task 3 depends on task 0 and 1
    tasks[3].dependencies = [tasks[0].id, tasks[1].id];
    // Task 4 depends on task 2
    if (tasks[4]) tasks[4].dependencies = [tasks[2].id];
    // Final task depends on 3 and 4
    if (tasks[count - 1] && count > 5) {
      tasks[count - 1].dependencies = [tasks[3].id, tasks[4]?.id].filter(Boolean) as string[];
    }
  }

  return tasks;
}

/**
 * Simulatore di esecuzione task
 */
async function simulateTaskExecution(task: TaskNode): Promise<{ success: boolean; result?: any; error?: Error }> {
  // Simula tempo di esecuzione
  const executionTime = task.estimatedDurationMs * (0.8 + Math.random() * 0.4); // ±20%
  await new Promise(resolve => setTimeout(resolve, executionTime));

  // 95% success rate
  if (Math.random() > 0.05) {
    return {
      success: true,
      result: {
        taskId: task.id,
        completedAt: Date.now(),
        executionTimeMs: executionTime
      }
    };
  } else {
    return {
      success: false,
      error: new Error(`Simulated failure for task ${task.id}`)
    };
  }
}

/**
 * Misura concorrenza effettiva durante l'esecuzione
 */
class ConcurrencyMonitor {
  private currentConcurrency = 0;
  private maxConcurrency = 0;
  private samples: number[] = [];
  private sampleInterval: NodeJS.Timeout | null = null;

  start(): void {
    this.sampleInterval = setInterval(() => {
      this.samples.push(this.currentConcurrency);
    }, 10);
  }

  stop(): void {
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }
  }

  increment(): void {
    this.currentConcurrency++;
    this.maxConcurrency = Math.max(this.maxConcurrency, this.currentConcurrency);
  }

  decrement(): void {
    this.currentConcurrency--;
  }

  getStats(): { max: number; avg: number; samples: number } {
    const avg = this.samples.length > 0
      ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length
      : 0;
    return {
      max: this.maxConcurrency,
      avg,
      samples: this.samples.length
    };
  }
}

// =============================================================================
// TEST SUITE 1: PARALLEL EXECUTION RULE
// =============================================================================

describe('ParallelExecutionRule', () => {
  let rule: ParallelExecutionRule;

  beforeEach(() => {
    rule = createParallelExecutionRule({
      maxConcurrentAgents: 64,
      enableAggressiveParallel: true
    });
  });

  afterEach(() => {
    rule.reset();
  });

  describe('Task Independence Detection', () => {
    it('should detect all tasks as independent when no dependencies', () => {
      const tasks = createTestTasks(10, false);
      const independentGroups = rule.detectIndependentTasks(tasks);

      expect(independentGroups.has('root')).toBe(true);
      expect(independentGroups.get('root')?.size).toBe(10);
    });

    it('should correctly group tasks by dependency level', () => {
      const tasks = createTestTasks(10, true);
      const independentGroups = rule.detectIndependentTasks(tasks);

      // Should have root level with independent tasks
      expect(independentGroups.has('root')).toBe(true);
      // Root should have tasks 0, 1, 2 (no dependencies)
      const rootTasks = independentGroups.get('root');
      expect(rootTasks?.has('task-000')).toBe(true);
      expect(rootTasks?.has('task-001')).toBe(true);
      expect(rootTasks?.has('task-002')).toBe(true);
    });

    it('should handle large task sets (100+ tasks)', () => {
      const tasks = createTestTasks(100, false);
      const startTime = performance.now();
      const independentGroups = rule.detectIndependentTasks(tasks);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Should be fast
      expect(independentGroups.get('root')?.size).toBe(100);
    });
  });

  describe('Execution Plan Building', () => {
    it('should create single batch for independent tasks', () => {
      const tasks = createTestTasks(20, false);
      const plan = rule.buildParallelExecutionPlan(tasks);

      expect(plan.totalTasks).toBe(20);
      expect(plan.totalBatches).toBe(1); // All independent = 1 batch
      expect(plan.batches[0].taskIds.length).toBe(20);
      expect(plan.speedupFactor).toBeGreaterThan(10); // Should be ~20x speedup
    });

    it('should create multiple batches for dependent tasks', () => {
      const tasks = createTestTasks(10, true);
      const plan = rule.buildParallelExecutionPlan(tasks);

      expect(plan.totalBatches).toBeGreaterThan(1);
      // First batch should have independent root tasks
      expect(plan.batches[0].taskIds).toContain('task-000');
      expect(plan.batches[0].taskIds).toContain('task-001');
    });

    it('should calculate critical path correctly', () => {
      const tasks = createTestTasks(10, true);
      const plan = rule.buildParallelExecutionPlan(tasks);

      expect(plan.criticalPath.length).toBeGreaterThan(0);
      // Critical path should start with a root task
      const firstTask = tasks.find(t => t.id === plan.criticalPath[0]);
      expect(firstTask?.dependencies.length).toBe(0);
    });

    it('should respect maxConcurrentAgents limit', () => {
      const rule32 = createParallelExecutionRule({ maxConcurrentAgents: 8 });
      const tasks = createTestTasks(50, false);
      const plan = rule32.buildParallelExecutionPlan(tasks);

      expect(plan.maxParallelism).toBeLessThanOrEqual(8);
    });
  });

  describe('Parallel Execution', () => {
    it('should execute independent tasks in parallel', async () => {
      const tasks = createTestTasks(10, false);
      rule.buildParallelExecutionPlan(tasks);

      const monitor = new ConcurrencyMonitor();
      monitor.start();

      const metrics = await rule.executeWithMaxParallelism(async (task) => {
        monitor.increment();
        const result = await simulateTaskExecution(task);
        monitor.decrement();
        return result;
      });

      monitor.stop();
      const concurrencyStats = monitor.getStats();

      expect(metrics.tasksCompleted).toBeGreaterThan(0);
      expect(concurrencyStats.max).toBeGreaterThan(1); // Should run in parallel
    });

    it('should achieve speedup vs sequential execution', async () => {
      const tasks = createTestTasks(20, false);
      // Set fast execution time for test
      tasks.forEach(t => t.estimatedDurationMs = 50);

      rule.buildParallelExecutionPlan(tasks);

      const startTime = performance.now();
      const metrics = await rule.executeWithMaxParallelism(async (task) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true };
      });
      const actualDuration = performance.now() - startTime;

      // Sequential would take 20 * 50 = 1000ms
      // Parallel should be much faster
      expect(actualDuration).toBeLessThan(500);
      expect(metrics.actualSpeedup).toBeGreaterThan(2);
    });

    it('should respect dependencies during execution', async () => {
      const tasks = createTestTasks(10, true);
      rule.buildParallelExecutionPlan(tasks);

      const executionOrder: string[] = [];

      await rule.executeWithMaxParallelism(async (task) => {
        executionOrder.push(task.id);
        await new Promise(resolve => setTimeout(resolve, 20));
        return { success: true };
      });

      // task-003 should come after task-000 and task-001
      const idx000 = executionOrder.indexOf('task-000');
      const idx001 = executionOrder.indexOf('task-001');
      const idx003 = executionOrder.indexOf('task-003');

      if (idx003 !== -1) {
        expect(idx003).toBeGreaterThan(Math.min(idx000, idx001));
      }
    });
  });
});

// =============================================================================
// TEST SUITE 2: AGENT CONTEXT MANAGER
// =============================================================================

describe('AgentContextManager', () => {
  let contextManager: AgentContextManager;

  beforeEach(() => {
    contextManager = createAgentContextManager({
      clearBeforeEachExecution: true,
      logClearEvents: false
    });
  });

  afterEach(() => {
    contextManager.destroy();
  });

  describe('Context Clear Before Execution', () => {
    it('should clear context before each execution', async () => {
      const agentId = 'test-agent-001';

      // Add some context
      contextManager.addUserMessage(agentId, 'Previous conversation message');
      contextManager.addAssistantResponse(agentId, 'Previous response');

      const ctx1 = contextManager.getContext(agentId);
      expect(ctx1?.conversationHistory.length).toBe(2);

      // Prepare for execution (should clear)
      const result = await contextManager.prepareForExecution(agentId, 'New task');

      expect(result.wasCleared).toBe(true);
      expect(result.context.conversationHistory.length).toBeLessThanOrEqual(1); // Only system message
    });

    it('should track clear statistics', async () => {
      const agentId = 'test-agent-002';

      contextManager.addUserMessage(agentId, 'Message 1');
      await contextManager.prepareForExecution(agentId, 'Task 1');

      contextManager.addUserMessage(agentId, 'Message 2');
      await contextManager.prepareForExecution(agentId, 'Task 2');

      const stats = contextManager.getStats();
      expect(stats.totalClears).toBe(2);
      expect(stats.clearsByReason['pre_execution']).toBe(2);
    });

    it('should handle batch clear for multiple agents', async () => {
      const agentIds = ['agent-A', 'agent-B', 'agent-C', 'agent-D', 'agent-E'];

      // Add context to each
      for (const id of agentIds) {
        contextManager.addUserMessage(id, 'Old message');
        contextManager.addAssistantResponse(id, 'Old response');
      }

      // Clear all for batch
      const results = await contextManager.clearAllForBatch(agentIds);

      expect(results.length).toBe(5);
      results.forEach(r => {
        expect(r.previousTokenCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Token Management', () => {
    it('should auto-clear when token limit reached', () => {
      const smallLimitManager = createAgentContextManager({
        maxTokensBeforeAutoClear: 100,
        clearBeforeEachExecution: false,
        logClearEvents: false
      });

      const agentId = 'token-test-agent';

      // Add messages until limit
      for (let i = 0; i < 20; i++) {
        smallLimitManager.addUserMessage(agentId, 'A'.repeat(50));
      }

      const stats = smallLimitManager.getStats();
      expect(stats.clearsByReason['token_limit_reached']).toBeGreaterThan(0);

      smallLimitManager.destroy();
    });

    it('should estimate tokens correctly', () => {
      const agentId = 'token-estimate-agent';
      const message = 'This is a test message with exactly 48 characters!'; // ~12 tokens

      contextManager.addUserMessage(agentId, message);

      const ctx = contextManager.getContext(agentId);
      expect(ctx?.tokenCount).toBeGreaterThan(0);
      expect(ctx?.tokenCount).toBeLessThan(50);
    });
  });
});

// =============================================================================
// TEST SUITE 3: MULTI-AGENT SIMULTANEITY
// =============================================================================

describe('Multi-Agent Simultaneity', () => {
  let rule: ParallelExecutionRule;
  let contextManager: AgentContextManager;

  beforeEach(() => {
    rule = createParallelExecutionRule({ maxConcurrentAgents: 32 });
    contextManager = createAgentContextManager({
      clearBeforeEachExecution: true,
      logClearEvents: false
    });
  });

  afterEach(() => {
    rule.reset();
    contextManager.destroy();
  });

  it('should execute 32 agents simultaneously', async () => {
    const tasks = createTestTasks(32, false);
    tasks.forEach(t => t.estimatedDurationMs = 100);

    rule.buildParallelExecutionPlan(tasks);

    let peakConcurrency = 0;
    let currentRunning = 0;

    const metrics = await rule.executeWithMaxParallelism(async (task) => {
      currentRunning++;
      peakConcurrency = Math.max(peakConcurrency, currentRunning);

      await contextManager.prepareForExecution(task.id, task.description);
      await new Promise(resolve => setTimeout(resolve, 50));

      currentRunning--;
      return { success: true };
    });

    expect(peakConcurrency).toBeGreaterThanOrEqual(16); // At least 50% concurrency
    expect(metrics.tasksCompleted).toBe(32);
  });

  it('should handle mixed priority tasks correctly', async () => {
    const tasks: TaskNode[] = [
      { id: 'critical-1', description: 'Critical task', status: 'pending', dependencies: [], priority: 'CRITICA', estimatedDurationMs: 100, agentType: 'fast', model: 'opus' },
      { id: 'critical-2', description: 'Critical task 2', status: 'pending', dependencies: [], priority: 'CRITICA', estimatedDurationMs: 100, agentType: 'fast', model: 'opus' },
      { id: 'high-1', description: 'High priority', status: 'pending', dependencies: [], priority: 'ALTA', estimatedDurationMs: 100, agentType: 'standard', model: 'sonnet' },
      { id: 'medium-1', description: 'Medium priority', status: 'pending', dependencies: [], priority: 'MEDIA', estimatedDurationMs: 100, agentType: 'standard', model: 'sonnet' },
      { id: 'low-1', description: 'Low priority', status: 'pending', dependencies: [], priority: 'BASSA', estimatedDurationMs: 100, agentType: 'slow', model: 'haiku' },
    ];

    const plan = rule.buildParallelExecutionPlan(tasks);

    // All independent, should be in one batch
    expect(plan.batches[0].taskIds[0]).toBe('critical-1'); // Criticals first
    expect(plan.batches[0].taskIds[1]).toBe('critical-2');
  });

  it('should clear context for each agent in batch execution', async () => {
    const tasks = createTestTasks(10, false);

    // Track clear events
    const clearEvents: string[] = [];
    contextManager.on('contextCleared', (event: any) => {
      clearEvents.push(event.agentId);
    });

    // Add initial context to all
    for (const task of tasks) {
      contextManager.addUserMessage(task.id, 'Old context');
    }

    // Prepare for batch
    await contextManager.prepareMultipleForExecution(
      tasks.map(t => ({ agentId: t.id, taskDescription: t.description }))
    );

    expect(clearEvents.length).toBe(10); // All should be cleared
  });

  it('should maintain performance with 64 concurrent agents', async () => {
    const rule64 = createParallelExecutionRule({ maxConcurrentAgents: 64 });
    const tasks = createTestTasks(64, false);
    tasks.forEach(t => t.estimatedDurationMs = 50);

    rule64.buildParallelExecutionPlan(tasks);

    const startTime = performance.now();
    const metrics = await rule64.executeWithMaxParallelism(async (task) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { success: true };
    });
    const duration = performance.now() - startTime;

    // 64 tasks at 50ms each sequential = 3200ms
    // Parallel should be ~50-100ms (single batch)
    expect(duration).toBeLessThan(500);
    expect(metrics.tasksCompleted).toBe(64);
    expect(metrics.maxConcurrentReached).toBeGreaterThanOrEqual(32);

    rule64.reset();
  });
});

// =============================================================================
// TEST SUITE 4: ERROR HANDLING AND RECOVERY
// =============================================================================

describe('Error Handling and Recovery', () => {
  let rule: ParallelExecutionRule;

  beforeEach(() => {
    rule = createParallelExecutionRule({
      maxConcurrentAgents: 16,
      enableAggressiveParallel: true
    });
  });

  afterEach(() => {
    rule.reset();
  });

  it('should continue execution when some tasks fail', async () => {
    const tasks = createTestTasks(10, false);
    rule.buildParallelExecutionPlan(tasks);

    let failedCount = 0;
    const metrics = await rule.executeWithMaxParallelism(async (task) => {
      if (parseInt(task.id.split('-')[1]) % 3 === 0) {
        failedCount++;
        return { success: false, error: new Error('Planned failure') };
      }
      return { success: true };
    });

    expect(metrics.tasksCompleted).toBeGreaterThan(0);
    expect(metrics.tasksFailed).toBe(failedCount);
    expect(metrics.tasksCompleted + metrics.tasksFailed).toBe(10);
  });

  it('should handle exception in task executor', async () => {
    const tasks = createTestTasks(5, false);
    rule.buildParallelExecutionPlan(tasks);

    const metrics = await rule.executeWithMaxParallelism(async (task) => {
      if (task.id === 'task-002') {
        throw new Error('Unexpected exception');
      }
      return { success: true };
    });

    expect(metrics.tasksFailed).toBeGreaterThanOrEqual(1);
    expect(metrics.tasksCompleted).toBeGreaterThanOrEqual(4);
  });

  it('should rebalance on failure when aggressive parallel enabled', () => {
    const tasks: TaskNode[] = [
      { id: 'parent', description: 'Parent task', status: 'pending', dependencies: [], priority: 'ALTA', estimatedDurationMs: 100, agentType: 'fast', model: 'sonnet' },
      { id: 'child-1', description: 'Child 1', status: 'pending', dependencies: ['parent'], priority: 'MEDIA', estimatedDurationMs: 100, agentType: 'fast', model: 'sonnet' },
      { id: 'child-2', description: 'Child 2', status: 'pending', dependencies: ['parent'], priority: 'MEDIA', estimatedDurationMs: 100, agentType: 'fast', model: 'sonnet' },
    ];

    rule.buildParallelExecutionPlan(tasks);

    // Simulate parent failure
    const rebalancedBatches = rule.rebalanceOnFailure('parent');

    // After rebalance, children should have dependency removed
    expect(rebalancedBatches.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// TEST SUITE 5: PERFORMANCE BENCHMARKS
// =============================================================================

describe('Performance Benchmarks', () => {
  it('BENCHMARK: Plan building for 100 tasks', () => {
    const rule = createParallelExecutionRule({ maxConcurrentAgents: 64 });
    const tasks = createTestTasks(100, true);

    const startTime = performance.now();
    const plan = rule.buildParallelExecutionPlan(tasks);
    const duration = performance.now() - startTime;

    console.log(`\nBENCHMARK: 100 tasks plan building`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Batches: ${plan.totalBatches}`);
    console.log(`  Speedup factor: ${plan.speedupFactor.toFixed(2)}x`);

    expect(duration).toBeLessThan(50); // Should be very fast
  });

  it('BENCHMARK: Plan building for 500 tasks', () => {
    const rule = createParallelExecutionRule({ maxConcurrentAgents: 64 });
    const tasks = createTestTasks(500, false);

    const startTime = performance.now();
    const plan = rule.buildParallelExecutionPlan(tasks);
    const duration = performance.now() - startTime;

    console.log(`\nBENCHMARK: 500 tasks plan building`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Max parallelism: ${plan.maxParallelism}`);

    expect(duration).toBeLessThan(200);
  });

  it('BENCHMARK: Context clear performance', async () => {
    const contextManager = createAgentContextManager({
      clearBeforeEachExecution: true,
      logClearEvents: false
    });

    // Setup 100 agents with context
    const agentIds = Array.from({ length: 100 }, (_, i) => `bench-agent-${i}`);
    for (const id of agentIds) {
      contextManager.addUserMessage(id, 'A'.repeat(1000));
      contextManager.addAssistantResponse(id, 'B'.repeat(2000));
    }

    const startTime = performance.now();
    await contextManager.clearAllForBatch(agentIds);
    const duration = performance.now() - startTime;

    console.log(`\nBENCHMARK: Clear 100 agent contexts`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Per agent: ${(duration / 100).toFixed(3)}ms`);

    expect(duration).toBeLessThan(100);

    contextManager.destroy();
  });

  it('BENCHMARK: Full parallel execution 50 tasks', async () => {
    const rule = createParallelExecutionRule({ maxConcurrentAgents: 50 });
    const tasks = createTestTasks(50, false);
    tasks.forEach(t => t.estimatedDurationMs = 20);

    rule.buildParallelExecutionPlan(tasks);

    const startTime = performance.now();
    const metrics = await rule.executeWithMaxParallelism(async (task) => {
      await new Promise(resolve => setTimeout(resolve, 20));
      return { success: true };
    });
    const duration = performance.now() - startTime;

    console.log(`\nBENCHMARK: Execute 50 tasks in parallel`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Sequential estimate: ${50 * 20}ms`);
    console.log(`  Actual speedup: ${metrics.actualSpeedup.toFixed(2)}x`);
    console.log(`  Max concurrent: ${metrics.maxConcurrentReached}`);

    expect(metrics.tasksCompleted).toBe(50);
    expect(duration).toBeLessThan(200);
  });
});

// =============================================================================
// INTEGRATION TEST
// =============================================================================

describe('Integration: Full Multi-Agent Orchestration', () => {
  it('should complete full orchestration workflow', async () => {
    console.log('\n=== FULL ORCHESTRATION INTEGRATION TEST ===\n');

    const rule = createParallelExecutionRule({ maxConcurrentAgents: 32 });
    const contextManager = createAgentContextManager({
      clearBeforeEachExecution: true,
      logClearEvents: false
    });

    // Simulate real-world scenario: 30 tasks with dependencies
    const tasks = createTestTasks(30, true);
    tasks.forEach(t => t.estimatedDurationMs = 30);

    // Build execution plan
    console.log('Building execution plan...');
    const plan = rule.buildParallelExecutionPlan(tasks);
    console.log(`  Batches: ${plan.totalBatches}`);
    console.log(`  Max parallelism: ${plan.maxParallelism}`);
    console.log(`  Expected speedup: ${plan.speedupFactor.toFixed(2)}x`);

    // Execute with context management
    console.log('\nExecuting with context management...');
    const startTime = performance.now();

    const metrics = await rule.executeWithMaxParallelism(async (task) => {
      // Clear context before execution
      await contextManager.prepareForExecution(task.id, task.description);

      // Simulate agent work
      await new Promise(resolve => setTimeout(resolve, 30));

      // Add response
      contextManager.addAssistantResponse(task.id, `Completed: ${task.description}`);

      return { success: Math.random() > 0.05 }; // 95% success rate
    });

    const duration = performance.now() - startTime;

    console.log('\n=== RESULTS ===');
    console.log(`Duration: ${duration.toFixed(0)}ms`);
    console.log(`Tasks completed: ${metrics.tasksCompleted}/${tasks.length}`);
    console.log(`Tasks failed: ${metrics.tasksFailed}`);
    console.log(`Max concurrent: ${metrics.maxConcurrentReached}`);
    console.log(`Actual speedup: ${metrics.actualSpeedup.toFixed(2)}x`);

    const contextStats = contextManager.getStats();
    console.log(`Context clears: ${contextStats.totalClears}`);
    console.log(`Tokens saved: ${contextStats.totalTokensSaved}`);

    // Assertions
    expect(metrics.tasksCompleted + metrics.tasksFailed).toBe(30);
    expect(metrics.maxConcurrentReached).toBeGreaterThan(1);
    expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds

    rule.reset();
    contextManager.destroy();
  });
});
