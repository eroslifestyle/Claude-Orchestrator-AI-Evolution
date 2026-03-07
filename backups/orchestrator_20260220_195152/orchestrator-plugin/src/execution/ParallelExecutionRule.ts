/**
 * PARALLEL EXECUTION RULE - Multi-Agent Simultaneous Execution
 *
 * Regola che attiva automaticamente l'esecuzione parallela multi-agent
 * quando vengono rilevati task multipli senza dipendenze reciproche.
 *
 * PRINCIPIO: Quando ci sono N task senza dipendenze, eseguili TUTTI
 * simultaneamente con N agent, rispettando SOLO le dipendenze esplicite.
 *
 * @version 1.0
 * @date 2026-02-03
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export interface TaskNode {
  id: string;
  description: string;
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed';
  dependencies: string[];  // IDs of tasks this depends on
  priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
  estimatedDurationMs: number;
  agentType: string;
  model: 'opus' | 'sonnet' | 'haiku';
}

export interface ExecutionBatch {
  batchId: string;
  batchOrder: number;
  taskIds: string[];
  canRunInParallel: boolean;
  maxConcurrency: number;
  estimatedDurationMs: number;
  blockedBy: string[];  // Previous batch IDs that must complete first
}

export interface ParallelExecutionPlan {
  totalTasks: number;
  totalBatches: number;
  maxParallelism: number;
  batches: ExecutionBatch[];
  criticalPath: string[];
  estimatedTotalTimeMs: number;
  estimatedSequentialTimeMs: number;
  speedupFactor: number;
}

export interface ExecutionMetrics {
  startTime: number;
  endTime?: number;
  tasksCompleted: number;
  tasksFailed: number;
  maxConcurrentReached: number;
  avgConcurrency: number;
  actualSpeedup: number;
}

export interface ParallelRuleConfig {
  maxConcurrentAgents: number;
  enableAggressiveParallel: boolean;
  respectOnlyHardDependencies: boolean;
  minBatchSize: number;
  maxBatchWaitMs: number;
  priorityBoostForIndependent: boolean;
}

// =============================================================================
// PARALLEL EXECUTION RULE ENGINE
// =============================================================================

export class ParallelExecutionRule extends EventEmitter {
  private config: ParallelRuleConfig;
  private tasks: Map<string, TaskNode> = new Map();
  private executionPlan: ParallelExecutionPlan | null = null;
  private metrics: ExecutionMetrics;
  private runningTasks: Set<string> = new Set();
  private completedTasks: Set<string> = new Set();
  private failedTasks: Set<string> = new Set();

  constructor(config: Partial<ParallelRuleConfig> = {}) {
    super();
    this.config = {
      maxConcurrentAgents: 64,
      enableAggressiveParallel: true,
      respectOnlyHardDependencies: true,
      minBatchSize: 1,
      maxBatchWaitMs: 5000,
      priorityBoostForIndependent: true,
      ...config
    };

    this.metrics = {
      startTime: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      maxConcurrentReached: 0,
      avgConcurrency: 0,
      actualSpeedup: 1
    };
  }

  // ===========================================================================
  // RULE 1: DETECT INDEPENDENT TASKS
  // ===========================================================================

  /**
   * Identifica tutti i task che possono essere eseguiti in parallelo
   * (nessuna dipendenza reciproca)
   */
  detectIndependentTasks(tasks: TaskNode[]): Map<string, Set<string>> {
    const independentGroups = new Map<string, Set<string>>();

    // Build dependency graph
    const dependsOn = new Map<string, Set<string>>();
    const dependedBy = new Map<string, Set<string>>();

    for (const task of tasks) {
      dependsOn.set(task.id, new Set(task.dependencies));
      if (!dependedBy.has(task.id)) {
        dependedBy.set(task.id, new Set());
      }
      for (const dep of task.dependencies) {
        if (!dependedBy.has(dep)) {
          dependedBy.set(dep, new Set());
        }
        dependedBy.get(dep)!.add(task.id);
      }
    }

    // Find tasks with no dependencies (root level)
    const rootTasks = tasks.filter(t => t.dependencies.length === 0);
    if (rootTasks.length > 0) {
      independentGroups.set('root', new Set(rootTasks.map(t => t.id)));
    }

    // Group by dependency level
    const levels = this.computeDependencyLevels(tasks);
    for (const [level, taskIds] of Array.from(levels.entries())) {
      if (taskIds.size > 1) {
        independentGroups.set(`level-${level}`, taskIds);
      }
    }

    return independentGroups;
  }

  /**
   * Calcola i livelli di dipendenza (tasks allo stesso livello sono indipendenti)
   */
  private computeDependencyLevels(tasks: TaskNode[]): Map<number, Set<string>> {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const levels = new Map<string, number>();
    const result = new Map<number, Set<string>>();

    // Topological sort with level assignment
    const visited = new Set<string>();
    const tempVisited = new Set<string>();

    const assignLevel = (taskId: string): number => {
      if (levels.has(taskId)) return levels.get(taskId)!;
      if (tempVisited.has(taskId)) return 0; // Circular dependency fallback

      tempVisited.add(taskId);
      const task = taskMap.get(taskId);

      if (!task || task.dependencies.length === 0) {
        levels.set(taskId, 0);
        tempVisited.delete(taskId);
        return 0;
      }

      let maxDepLevel = -1;
      for (const depId of task.dependencies) {
        const depLevel = assignLevel(depId);
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }

      const level = maxDepLevel + 1;
      levels.set(taskId, level);
      tempVisited.delete(taskId);
      return level;
    };

    for (const task of tasks) {
      assignLevel(task.id);
    }

    // Group by level
    for (const [taskId, level] of Array.from(levels.entries())) {
      if (!result.has(level)) {
        result.set(level, new Set());
      }
      result.get(level)!.add(taskId);
    }

    return result;
  }

  // ===========================================================================
  // RULE 2: BUILD PARALLEL EXECUTION PLAN
  // ===========================================================================

  /**
   * Costruisce il piano di esecuzione parallela ottimizzato
   */
  buildParallelExecutionPlan(tasks: TaskNode[]): ParallelExecutionPlan {
    this.tasks = new Map(tasks.map(t => [t.id, t]));

    const levels = this.computeDependencyLevels(tasks);
    const batches: ExecutionBatch[] = [];
    let batchOrder = 0;

    // Sort levels and create batches
    const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);

    for (const level of sortedLevels) {
      const taskIdSet = levels.get(level)!;
      const taskIds = Array.from(taskIdSet);
      const tasksInLevel = taskIds.map(id => this.tasks.get(id)!);

      // Sort by priority within level
      tasksInLevel.sort((a, b) => {
        const priorityOrder = { 'CRITICA': 0, 'ALTA': 1, 'MEDIA': 2, 'BASSA': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Calculate batch concurrency
      const maxConcurrency = Math.min(
        taskIds.length,
        this.config.maxConcurrentAgents
      );

      // Estimate duration (max of all tasks since parallel)
      const estimatedDurationMs = Math.max(
        ...tasksInLevel.map(t => t.estimatedDurationMs)
      );

      // Previous batch IDs (all batches from previous level)
      const blockedBy = batchOrder > 0
        ? [batches[batchOrder - 1].batchId]
        : [];

      batches.push({
        batchId: `batch-${batchOrder}`,
        batchOrder,
        taskIds: tasksInLevel.map(t => t.id),
        canRunInParallel: true,
        maxConcurrency,
        estimatedDurationMs,
        blockedBy
      });

      batchOrder++;
    }

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(tasks, levels);

    // Calculate timing estimates
    const estimatedTotalTimeMs = batches.reduce(
      (sum, b) => sum + b.estimatedDurationMs, 0
    );
    const estimatedSequentialTimeMs = tasks.reduce(
      (sum, t) => sum + t.estimatedDurationMs, 0
    );
    const speedupFactor = estimatedSequentialTimeMs / estimatedTotalTimeMs;

    this.executionPlan = {
      totalTasks: tasks.length,
      totalBatches: batches.length,
      maxParallelism: Math.max(...batches.map(b => b.maxConcurrency)),
      batches,
      criticalPath,
      estimatedTotalTimeMs,
      estimatedSequentialTimeMs,
      speedupFactor
    };

    this.emit('planCreated', this.executionPlan);
    return this.executionPlan;
  }

  /**
   * Calcola il percorso critico (catena di dipendenze più lunga)
   */
  private calculateCriticalPath(
    tasks: TaskNode[],
    levels: Map<number, Set<string>>
  ): string[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const pathLengths = new Map<string, number>();
    const pathPredecessor = new Map<string, string | null>();

    // Calculate longest path to each node
    const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);

    for (const level of sortedLevels) {
      for (const taskId of Array.from(levels.get(level)!)) {
        const task = taskMap.get(taskId)!;

        if (task.dependencies.length === 0) {
          pathLengths.set(taskId, task.estimatedDurationMs);
          pathPredecessor.set(taskId, null);
        } else {
          let maxPredLength = 0;
          let maxPred: string | null = null;

          for (const depId of task.dependencies) {
            const depLength = pathLengths.get(depId) || 0;
            if (depLength > maxPredLength) {
              maxPredLength = depLength;
              maxPred = depId;
            }
          }

          pathLengths.set(taskId, maxPredLength + task.estimatedDurationMs);
          pathPredecessor.set(taskId, maxPred);
        }
      }
    }

    // Find the task with longest path
    let maxLength = 0;
    let endTask: string | null = null;
    for (const [taskId, length] of Array.from(pathLengths.entries())) {
      if (length > maxLength) {
        maxLength = length;
        endTask = taskId;
      }
    }

    // Reconstruct critical path
    const criticalPath: string[] = [];
    let current = endTask;
    while (current) {
      criticalPath.unshift(current);
      current = pathPredecessor.get(current) || null;
    }

    return criticalPath;
  }

  // ===========================================================================
  // RULE 3: EXECUTE WITH MAXIMUM PARALLELISM
  // ===========================================================================

  /**
   * Esegue il piano con parallelismo massimo
   * @param taskExecutor Funzione che esegue effettivamente il task
   */
  async executeWithMaxParallelism(
    taskExecutor: (task: TaskNode) => Promise<{ success: boolean; result?: any; error?: Error }>
  ): Promise<ExecutionMetrics> {
    if (!this.executionPlan) {
      throw new Error('No execution plan available. Call buildParallelExecutionPlan first.');
    }

    this.metrics.startTime = Date.now();
    this.runningTasks.clear();
    this.completedTasks.clear();
    this.failedTasks.clear();

    let concurrencySamples: number[] = [];

    console.log('\n' + '='.repeat(70));
    console.log(' PARALLEL EXECUTION RULE - MULTI-AGENT SIMULTANEOUS EXECUTION');
    console.log('='.repeat(70));
    console.log(`Total Tasks: ${this.executionPlan.totalTasks}`);
    console.log(`Total Batches: ${this.executionPlan.totalBatches}`);
    console.log(`Max Parallelism: ${this.executionPlan.maxParallelism} agents`);
    console.log(`Expected Speedup: ${this.executionPlan.speedupFactor.toFixed(2)}x`);
    console.log('='.repeat(70) + '\n');

    // Execute batch by batch
    for (const batch of this.executionPlan.batches) {
      console.log(`\n[BATCH ${batch.batchOrder + 1}/${this.executionPlan.totalBatches}] ` +
                  `Executing ${batch.taskIds.length} tasks in parallel`);

      // Wait for blocking batches to complete
      for (const blockedBy of batch.blockedBy) {
        const blockingBatch = this.executionPlan.batches.find(b => b.batchId === blockedBy);
        if (blockingBatch) {
          const incomplete = blockingBatch.taskIds.filter(
            id => !this.completedTasks.has(id) && !this.failedTasks.has(id)
          );
          if (incomplete.length > 0) {
            console.log(`  Waiting for blocking batch ${blockedBy}...`);
            await this.waitForTasks(incomplete);
          }
        }
      }

      // Get tasks ready to execute
      const tasksToExecute = batch.taskIds
        .map(id => this.tasks.get(id)!)
        .filter(t => t && !this.completedTasks.has(t.id) && !this.failedTasks.has(t.id));

      if (tasksToExecute.length === 0) {
        console.log('  All tasks already completed, skipping batch.');
        continue;
      }

      // Mark as running
      for (const task of tasksToExecute) {
        this.runningTasks.add(task.id);
        task.status = 'running';
      }

      // Track concurrency
      concurrencySamples.push(this.runningTasks.size);
      this.metrics.maxConcurrentReached = Math.max(
        this.metrics.maxConcurrentReached,
        this.runningTasks.size
      );

      console.log(`  Running ${tasksToExecute.length} agents simultaneously:`);
      for (const task of tasksToExecute) {
        console.log(`    - [${task.id}] ${task.description.substring(0, 50)}...`);
      }

      // Execute ALL tasks in parallel using Promise.allSettled
      const batchStartTime = Date.now();

      const results = await Promise.allSettled(
        tasksToExecute.map(async (task) => {
          try {
            const result = await taskExecutor(task);
            return { taskId: task.id, ...result };
          } catch (error) {
            return { taskId: task.id, success: false, error: error as Error };
          }
        })
      );

      const batchDuration = Date.now() - batchStartTime;

      // Process results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { taskId, success, error } = result.value;
          const task = this.tasks.get(taskId)!;
          this.runningTasks.delete(taskId);

          if (success) {
            this.completedTasks.add(taskId);
            task.status = 'completed';
            this.metrics.tasksCompleted++;
            console.log(`    [OK] ${taskId} completed`);
          } else {
            this.failedTasks.add(taskId);
            task.status = 'failed';
            this.metrics.tasksFailed++;
            console.log(`    [FAIL] ${taskId}: ${error?.message || 'Unknown error'}`);
          }
        } else {
          // Promise rejected
          console.log(`    [ERROR] Unexpected failure in batch execution`);
        }
      }

      console.log(`  Batch completed in ${batchDuration}ms`);
      this.emit('batchCompleted', {
        batchId: batch.batchId,
        duration: batchDuration,
        completed: results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length,
        failed: results.filter(r => r.status === 'rejected' || !(r.value as any).success).length
      });
    }

    // Finalize metrics
    this.metrics.endTime = Date.now();
    this.metrics.avgConcurrency = concurrencySamples.length > 0
      ? concurrencySamples.reduce((a, b) => a + b, 0) / concurrencySamples.length
      : 0;

    const actualDuration = this.metrics.endTime - this.metrics.startTime;
    const sequentialEstimate = Array.from(this.tasks.values())
      .reduce((sum, t) => sum + t.estimatedDurationMs, 0);
    this.metrics.actualSpeedup = sequentialEstimate / actualDuration;

    console.log('\n' + '='.repeat(70));
    console.log(' EXECUTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Tasks Completed: ${this.metrics.tasksCompleted}/${this.executionPlan.totalTasks}`);
    console.log(`Tasks Failed: ${this.metrics.tasksFailed}`);
    console.log(`Max Concurrent Agents: ${this.metrics.maxConcurrentReached}`);
    console.log(`Avg Concurrency: ${this.metrics.avgConcurrency.toFixed(2)}`);
    console.log(`Actual Speedup: ${this.metrics.actualSpeedup.toFixed(2)}x`);
    console.log(`Total Duration: ${actualDuration}ms`);
    console.log('='.repeat(70) + '\n');

    this.emit('executionComplete', this.metrics);
    return this.metrics;
  }

  /**
   * Attende il completamento di specifici task
   */
  private async waitForTasks(taskIds: string[]): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const allDone = taskIds.every(
          id => this.completedTasks.has(id) || this.failedTasks.has(id)
        );
        if (allDone) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }

  // ===========================================================================
  // RULE 4: DYNAMIC REBALANCING
  // ===========================================================================

  /**
   * Ribilancia dinamicamente il piano quando un task fallisce
   */
  rebalanceOnFailure(failedTaskId: string): ExecutionBatch[] {
    if (!this.executionPlan) return [];

    const failedTask = this.tasks.get(failedTaskId);
    if (!failedTask) return this.executionPlan.batches;

    // Find tasks that depend on the failed one
    const affectedTasks: string[] = [];
    for (const [taskId, task] of Array.from(this.tasks.entries())) {
      if (task.dependencies.includes(failedTaskId)) {
        affectedTasks.push(taskId);
      }
    }

    if (affectedTasks.length === 0) {
      console.log(`[REBALANCE] No tasks affected by failure of ${failedTaskId}`);
      return this.executionPlan.batches;
    }

    console.log(`[REBALANCE] ${affectedTasks.length} tasks affected by failure of ${failedTaskId}`);

    // Options:
    // 1. Skip affected tasks (mark as skipped)
    // 2. Attempt fallback execution
    // 3. Re-route dependencies

    if (this.config.enableAggressiveParallel) {
      // Try to continue without the failed task chain
      for (const taskId of affectedTasks) {
        const task = this.tasks.get(taskId)!;
        // Remove dependency on failed task
        task.dependencies = task.dependencies.filter(d => d !== failedTaskId);
        console.log(`  [REBALANCE] Removed dependency on ${failedTaskId} from ${taskId}`);
      }
    }

    // Rebuild affected batches
    return this.executionPlan.batches;
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Ottiene lo stato attuale dell'esecuzione
   */
  getExecutionState(): {
    running: string[];
    completed: string[];
    failed: string[];
    pending: string[];
  } {
    const allTaskIds = Array.from(this.tasks.keys());
    return {
      running: Array.from(this.runningTasks),
      completed: Array.from(this.completedTasks),
      failed: Array.from(this.failedTasks),
      pending: allTaskIds.filter(
        id => !this.runningTasks.has(id) &&
              !this.completedTasks.has(id) &&
              !this.failedTasks.has(id)
      )
    };
  }

  /**
   * Ottiene il piano di esecuzione corrente
   */
  getExecutionPlan(): ParallelExecutionPlan | null {
    return this.executionPlan;
  }

  /**
   * Ottiene le metriche correnti
   */
  getMetrics(): ExecutionMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset dello stato
   */
  reset(): void {
    this.tasks.clear();
    this.executionPlan = null;
    this.runningTasks.clear();
    this.completedTasks.clear();
    this.failedTasks.clear();
    this.metrics = {
      startTime: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      maxConcurrentReached: 0,
      avgConcurrency: 0,
      actualSpeedup: 1
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createParallelExecutionRule(
  config?: Partial<ParallelRuleConfig>
): ParallelExecutionRule {
  return new ParallelExecutionRule(config);
}

// =============================================================================
// INTEGRATION HELPER
// =============================================================================

/**
 * Helper per integrare la regola con l'orchestrator esistente
 */
export function applyParallelExecutionRule(
  orchestrator: any,
  config?: Partial<ParallelRuleConfig>
): ParallelExecutionRule {
  const rule = createParallelExecutionRule(config);

  // Hook into orchestrator's task queue
  if (orchestrator.on) {
    orchestrator.on('tasksReady', (tasks: TaskNode[]) => {
      const plan = rule.buildParallelExecutionPlan(tasks);
      console.log(`[PARALLEL RULE] Built plan with ${plan.totalBatches} batches, ` +
                  `speedup factor: ${plan.speedupFactor.toFixed(2)}x`);
    });
  }

  return rule;
}
