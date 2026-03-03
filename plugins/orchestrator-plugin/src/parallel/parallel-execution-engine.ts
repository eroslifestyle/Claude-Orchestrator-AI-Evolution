/**
 * PARALLEL EXECUTION ENGINE V7.0 - LIVELLO 5 IMPLEMENTATION
 * 
 * Sistema di esecuzione parallela con coordinamento intelligente e resilienza agli errori.
 * Supporta esecuzione simultanea di multiple task con batch dependency management,
 * real-time progress tracking e graceful degradation.
 * 
 * FEATURES:
 * - Batch execution con dependency management intelligente
 * - Real-time progress tracking e monitoring
 * - Advanced error handling e retry logic
 * - Dynamic resource management e load balancing
 * - Performance monitoring e metriche in tempo reale
 * - Graceful degradation sotto stress
 * 
 * @author Livello 5 Implementation Expert
 * @version 7.0.0-livello5
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { ProgressTracker } from '../tracking/progress-tracker';
import { PluginLogger } from '../utils/logger';
import type {
  Task,
  TaskResult as TypesTaskResult,
  ModelType,
  TaskStatus,
  ExecutionPlan,
  DependencyGraph
} from '../types';
import type { TaskResult as LauncherTaskResult } from '../execution/task-launcher';

// ============================================================================
// CORE INTERFACES FOR PARALLEL EXECUTION ENGINE
// ============================================================================

export interface ParallelExecutionConfig {
  maxConcurrentTasks: number;
  maxRetryAttempts: number;
  retryDelayBase: number; // milliseconds
  resourceLimits: ResourceLimits;
  degradationThresholds: DegradationThresholds;
  monitoringConfig: MonitoringConfig;
  batchConfig: BatchConfig;
}

export interface ResourceLimits {
  maxMemoryUsage: number; // MB
  maxCpuUsage: number;    // percentage
  maxTokensPerMinute: number;
  maxCostPerMinute: number; // USD
  concurrencyLimit: number;
}

export interface DegradationThresholds {
  errorRateThreshold: number;     // 0.0-1.0
  resourceUsageThreshold: number; // 0.0-1.0
  latencyThreshold: number;       // milliseconds
  costThreshold: number;          // USD
}

export interface MonitoringConfig {
  metricsUpdateInterval: number;  // milliseconds
  performanceLogInterval: number; // milliseconds
  alertThresholds: AlertThresholds;
  enableDetailedLogging: boolean;
}

export interface AlertThresholds {
  criticalErrorRate: number;
  highLatency: number;
  resourceExhaustion: number;
  costOverrun: number;
}

export interface BatchConfig {
  maxBatchSize: number;
  batchTimeoutMs: number;
  dependencyResolutionTimeout: number;
  parallelBatchLimit: number;
}

export interface ExecutionBatch {
  id: string;
  tasks: Task[];
  dependencies: string[]; // Other batch IDs
  status: BatchStatus;
  startTime?: Date;
  endTime?: Date;
  retryCount: number;
  resourceUsage: BatchResourceUsage;
  results: Map<string, TypesTaskResult>;
}

export type BatchStatus = 'pending' | 'ready' | 'executing' | 'completed' | 'failed' | 'degraded';

export interface BatchResourceUsage {
  memory: number;
  cpu: number;
  tokens: number;
  cost: number;
  duration: number;
}

export interface ExecutionMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  retriedTasks: number;
  degradedTasks: number;
  averageExecutionTime: number;
  averageBatchTime: number;
  resourceUtilization: ResourceUtilization;
  errorRate: number;
  throughput: number; // tasks per second
  costEfficiency: number;
  parallelismEfficiency: number;
}

export interface ResourceUtilization {
  memory: number;      // current usage MB
  cpu: number;         // current usage %
  tokens: number;      // current usage per minute
  cost: number;        // current cost per minute
  peakMemory: number;  // peak usage MB
  peakCpu: number;     // peak usage %
}

export interface RetryStrategy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'adaptive';
  baseDelay: number;
  maxDelay: number;
  retryConditions: RetryCondition[];
}

export interface RetryCondition {
  errorType: string;
  retryable: boolean;
  customDelay?: number;
}

export interface DegradationAction {
  trigger: 'error_rate' | 'resource_limit' | 'latency' | 'cost_overrun';
  action: 'reduce_concurrency' | 'switch_model' | 'skip_optional' | 'abort';
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  threshold: number;
  reversible: boolean;
}

export interface ExecutionContext {
  sessionId: string;
  executionPlan: ExecutionPlan;
  config: ParallelExecutionConfig;
  startTime: Date;
  progressTracker: ProgressTracker;
  logger: PluginLogger;
}

export interface TaskExecutionResult {
  success: boolean;
  result?: TypesTaskResult;
  error?: ExecutionError;
  retryCount: number;
  executionTime: number;
  resourceUsage: TaskResourceUsage;
}

export interface TaskResourceUsage {
  memory: number;
  cpu: number;
  tokens: number;
  cost: number;
}

export interface ExecutionError {
  type: 'timeout' | 'resource_limit' | 'api_error' | 'dependency_error' | 'validation_error';
  message: string;
  retryable: boolean;
  cause?: Error;
  context: Record<string, any>;
}

// ============================================================================
// PARALLEL EXECUTION ENGINE - MAIN CLASS
// ============================================================================

export class ParallelExecutionEngine extends EventEmitter {
  private config: ParallelExecutionConfig;
  private logger: PluginLogger;
  private isRunning: boolean = false;
  private currentBatches: Map<string, ExecutionBatch> = new Map();
  private executionQueue: ExecutionBatch[] = [];
  private activeExecutions: Map<string, Promise<TaskExecutionResult>> = new Map();
  private metrics: ExecutionMetrics;
  private resourceMonitor: ResourceMonitor;
  private retryManager: RetryManager;
  private degradationManager: DegradationManager;
  private progressTracker?: ProgressTracker;

  constructor(config: ParallelExecutionConfig) {
    super();
    this.config = config;
    this.logger = new PluginLogger('ParallelExecutionEngine');
    this.resourceMonitor = new ResourceMonitor(config.resourceLimits);
    this.retryManager = new RetryManager(config);
    this.degradationManager = new DegradationManager(config.degradationThresholds);
    this.initializeMetrics();
    this.setupMonitoring();

    this.logger.info('🚀 Parallel Execution Engine V7.0 initialized');
  }

  /**
   * MAIN EXECUTION METHOD
   * Coordina l'esecuzione parallela con batch dependency management
   */
  async executeParallel(
    executionPlan: ExecutionPlan,
    progressTracker?: ProgressTracker
  ): Promise<ParallelExecutionResult> {
    const sessionId = executionPlan.sessionId;
    const startTime = performance.now();
    
    this.logger.info(`🔥 Starting parallel execution for session: ${sessionId}`);
    this.logger.info(`📊 Total tasks: ${executionPlan.tasks.length}`);

    this.progressTracker = progressTracker;
    this.isRunning = true;

    const context: ExecutionContext = {
      sessionId,
      executionPlan,
      config: this.config,
      startTime: new Date(),
      progressTracker: progressTracker || new ProgressTracker(sessionId),
      logger: this.logger
    };

    try {
      // Step 1: Create execution batches with dependency analysis
      const batches = await this.createExecutionBatches(executionPlan);
      this.logger.info(`📦 Created ${batches.length} execution batches`);

      // Step 2: Initialize progress tracking
      context.progressTracker.initializeTasks(executionPlan.tasks as any);

      // Step 3: Execute batches with dependency resolution
      const results = await this.executeBatchesWithDependencies(batches, context);

      // Step 4: Generate final results and metrics
      const executionTime = performance.now() - startTime;
      const finalResult = await this.compileFinalResult(results, executionTime, context);

      this.isRunning = false;
      this.logger.info(`✅ Parallel execution completed in ${(executionTime / 1000).toFixed(2)}s`);
      
      return finalResult;

    } catch (error) {
      this.logger.error('💥 Critical error in parallel execution:', error);
      await this.emergencyShutdown(context);
      throw error;
    }
  }

  /**
   * BATCH CREATION WITH DEPENDENCY MANAGEMENT
   * Crea batch ottimizzati analizzando le dipendenze tra task
   */
  private async createExecutionBatches(plan: ExecutionPlan): Promise<ExecutionBatch[]> {
    this.logger.info('🧠 Creating execution batches with dependency analysis');

    // Handle dependencies - convert string[] to DependencyGraph if needed
    const dependencyGraph = this.ensureDependencyGraph(plan.dependencies, plan.tasks);
    const batches: ExecutionBatch[] = [];
    const taskToBatch = new Map<string, string>();

    // Step 1: Analyze dependency layers
    const layers = this.analyzeDependencyLayers(dependencyGraph);
    this.logger.info(`🌳 Identified ${layers.length} dependency layers`);

    // Step 2: Create batches for each layer
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
      const layer = layers[layerIndex];
      const layerBatches = this.createBatchesForLayer(layer, layerIndex, plan.tasks);
      
      // Set dependencies on previous layer batches
      if (layerIndex > 0) {
        const previousLayerBatchIds = batches
          .filter(b => b.id.startsWith(`layer-${layerIndex - 1}`))
          .map(b => b.id);
        
        layerBatches.forEach(batch => {
          batch.dependencies = previousLayerBatchIds;
        });
      }

      batches.push(...layerBatches);
      
      // Track task-to-batch mapping
      layerBatches.forEach(batch => {
        batch.tasks.forEach(task => {
          taskToBatch.set(task.id, batch.id);
        });
      });
    }

    this.logger.info(`📊 Batch creation summary: ${batches.length} batches across ${layers.length} layers`);
    return batches;
  }

  /**
   * DEPENDENCY LAYER ANALYSIS
   * Analizza il grafo delle dipendenze per identificare layer paralleli
   */
  private analyzeDependencyLayers(dependencyGraph: DependencyGraph): string[][] {
    const layers: string[][] = [];
    const visited = new Set<string>();
    const nodeDepth = new Map<string, number>();
    
    // Calculate depth for each node using topological sort
    const calculateDepth = (taskId: string): number => {
      if (nodeDepth.has(taskId)) {
        return nodeDepth.get(taskId)!;
      }

      const dependencies = dependencyGraph.edges
        .filter(edge => edge.to === taskId)
        .map(edge => edge.from);

      if (dependencies.length === 0) {
        nodeDepth.set(taskId, 0);
        return 0;
      }

      const maxDepth = Math.max(...dependencies.map(dep => calculateDepth(dep)));
      const depth = maxDepth + 1;
      nodeDepth.set(taskId, depth);
      return depth;
    };

    // Calculate depths for all tasks
    dependencyGraph.nodes.forEach(task => {
      calculateDepth(task.id);
    });

    // Group tasks by depth into layers
    const maxDepth = Math.max(...Array.from(nodeDepth.values()));
    for (let depth = 0; depth <= maxDepth; depth++) {
      const tasksAtDepth = dependencyGraph.nodes
        .filter(task => nodeDepth.get(task.id) === depth)
        .map(task => task.id);
      
      if (tasksAtDepth.length > 0) {
        layers.push(tasksAtDepth);
      }
    }

    return layers;
  }

  /**
   * CREATE BATCHES FOR LAYER
   * Crea batch ottimizzati per un singolo layer di dipendenze
   */
  private createBatchesForLayer(taskIds: string[], layerIndex: number, allTasks: Task[]): ExecutionBatch[] {
    const layerTasks = allTasks.filter(task => taskIds.includes(task.id));
    const batches: ExecutionBatch[] = [];
    
    // Group tasks by similarity and resource requirements
    const groups = this.groupTasksForBatching(layerTasks);
    
    groups.forEach((group, groupIndex) => {
      const batchId = `layer-${layerIndex}-batch-${groupIndex}`;
      const batch: ExecutionBatch = {
        id: batchId,
        tasks: group,
        dependencies: [],
        status: 'pending',
        retryCount: 0,
        resourceUsage: {
          memory: 0,
          cpu: 0,
          tokens: 0,
          cost: 0,
          duration: 0
        },
        results: new Map()
      };

      batches.push(batch);
    });

    this.logger.debug(`📦 Layer ${layerIndex}: Created ${batches.length} batches for ${layerTasks.length} tasks`);
    return batches;
  }

  /**
   * GROUP TASKS FOR BATCHING
   * Raggruppa task simili per ottimizzare l'esecuzione in batch
   */
  private groupTasksForBatching(tasks: Task[]): Task[][] {
    const groups: Task[][] = [];
    const maxBatchSize = this.config.batchConfig.maxBatchSize;
    
    // Sort tasks by model and estimated execution time for optimal grouping
    const sortedTasks = tasks.sort((a, b) => {
      if (a.model !== b.model) {
        return a.model.localeCompare(b.model);
      }
      return a.estimatedTime - b.estimatedTime;
    });

    // Create groups with size limit
    for (let i = 0; i < sortedTasks.length; i += maxBatchSize) {
      const group = sortedTasks.slice(i, i + maxBatchSize);
      groups.push(group);
    }

    return groups;
  }

  /**
   * ENSURE DEPENDENCY GRAPH
   * Converte le dipendenze in un DependencyGraph completo se necessario
   */
  private ensureDependencyGraph(
    dependencies: string[] | DependencyGraph | undefined,
    tasks: Task[]
  ): DependencyGraph {
    // Se è già un DependencyGraph, restituiscilo
    if (dependencies && typeof dependencies === 'object' && 'nodes' in dependencies && 'edges' in dependencies) {
      return dependencies as DependencyGraph;
    }

    // Altrimenti, crea un DependencyGraph da un array di dipendenze
    const graph: DependencyGraph = {
      nodes: tasks.map(task => ({
        id: task.id,
        status: task.status || 'pending',
        description: task.description,
        model: task.model,
        estimatedTime: task.estimatedTime
      })),
      edges: []
    };

    // Se dependencies è un array, costruisci gli edges
    if (Array.isArray(dependencies)) {
      // Per ogni task, controlla se ha dipendenze definite
      tasks.forEach(task => {
        if (task.dependencies && task.dependencies.length > 0) {
          task.dependencies.forEach(depId => {
            graph.edges.push({ from: depId, to: task.id });
          });
        }
      });
    }

    return graph;
  }

  /**
   * CONVERT TASK RESULT TO LAUNCHER FORMAT
   * Converte un TypesTaskResult nel formato atteso da ProgressTracker
   */
  private convertToLauncherTaskResult(
    task: Task,
    typesResult: TypesTaskResult,
    success: boolean
  ): LauncherTaskResult {
    return {
      success,
      taskId: typesResult.taskId,
      agentFile: typesResult.agentId,
      model: typesResult.model || task.model,
      duration: typesResult.duration || 0,
      output: JSON.stringify(typesResult.result || { summary: 'Task completed' }),
      filesModified: typesResult.result?.filesModified?.map(f => f.path) || [],
      issues: typesResult.result?.issuesFound?.map((i: any) => i.description || JSON.stringify(i)) || [],
      cost: typesResult.cost,
      tokens: typesResult.tokensUsed || typesResult.tokens,
      error: typesResult.error ? (typeof typesResult.error === 'string' ? typesResult.error : typesResult.error.message) : undefined
    };
  }

  /**
   * EXECUTE BATCHES WITH DEPENDENCIES
   * Esegue i batch rispettando le dipendenze e gestendo la concorrenza
   */
  private async executeBatchesWithDependencies(
    batches: ExecutionBatch[], 
    context: ExecutionContext
  ): Promise<Map<string, ExecutionBatch>> {
    this.logger.info(`⚡ Executing ${batches.length} batches with dependency coordination`);

    this.executionQueue = [...batches];
    const completedBatches = new Map<string, ExecutionBatch>();
    const activeBatches = new Map<string, Promise<ExecutionBatch>>();

    while (this.executionQueue.length > 0 || activeBatches.size > 0) {
      // Start ready batches up to concurrency limit
      await this.startReadyBatches(activeBatches, completedBatches, context);

      // Wait for at least one batch to complete
      if (activeBatches.size > 0) {
        const completed = await Promise.race(Array.from(activeBatches.values()));
        const batchId = completed.id;
        
        completedBatches.set(batchId, completed);
        activeBatches.delete(batchId);

        this.logger.info(`✅ Batch ${batchId} completed with ${completed.results.size} tasks`);
        this.updateMetricsFromBatch(completed);
      }

      // Update progress
      this.emitProgressUpdate(completedBatches, activeBatches, context);

      // Check for degradation triggers
      await this.checkDegradationTriggers(context);
    }

    this.logger.info(`🎉 All batches completed: ${completedBatches.size} total`);
    return completedBatches;
  }

  /**
   * START READY BATCHES
   * Avvia batch pronti per l'esecuzione rispettando limiti di concorrenza
   */
  private async startReadyBatches(
    activeBatches: Map<string, Promise<ExecutionBatch>>,
    completedBatches: Map<string, ExecutionBatch>,
    context: ExecutionContext
  ): Promise<void> {
    const maxConcurrent = this.config.batchConfig.parallelBatchLimit;
    const currentConcurrency = activeBatches.size;

    if (currentConcurrency >= maxConcurrent) {
      return; // Already at capacity
    }

    const readyBatches = this.executionQueue.filter(batch => 
      this.areDependenciesMet(batch, completedBatches)
    );

    const batchesToStart = readyBatches.slice(0, maxConcurrent - currentConcurrency);

    for (const batch of batchesToStart) {
      // Remove from queue
      const queueIndex = this.executionQueue.findIndex(b => b.id === batch.id);
      if (queueIndex !== -1) {
        this.executionQueue.splice(queueIndex, 1);
      }

      // Start execution
      batch.status = 'ready';
      const batchPromise = this.executeBatch(batch, context);
      activeBatches.set(batch.id, batchPromise);

      this.logger.info(`🚀 Started batch ${batch.id} with ${batch.tasks.length} tasks`);
    }
  }

  /**
   * CHECK DEPENDENCIES
   * Verifica se tutte le dipendenze di un batch sono soddisfatte
   */
  private areDependenciesMet(batch: ExecutionBatch, completedBatches: Map<string, ExecutionBatch>): boolean {
    return batch.dependencies.every(depId => {
      const depBatch = completedBatches.get(depId);
      return depBatch && depBatch.status === 'completed';
    });
  }

  /**
   * EXECUTE BATCH
   * Esegue tutti i task in un singolo batch con gestione errori
   */
  private async executeBatch(batch: ExecutionBatch, context: ExecutionContext): Promise<ExecutionBatch> {
    const startTime = performance.now();
    batch.status = 'executing';
    batch.startTime = new Date();

    this.logger.info(`🔄 Executing batch ${batch.id} with ${batch.tasks.length} tasks`);

    try {
      // Execute all tasks in the batch concurrently
      const taskPromises = batch.tasks.map(task => 
        this.executeTaskWithRetry(task, context)
      );

      const taskResults = await Promise.allSettled(taskPromises);

      // Process results
      let successCount = 0;
      let failureCount = 0;

      taskResults.forEach((result, index) => {
        const task = batch.tasks[index];

        if (result.status === 'fulfilled') {
          const taskResult = result.value.result!;
          batch.results.set(task.id, taskResult);
          // Convert to launcher format for ProgressTracker
          const launcherResult = this.convertToLauncherTaskResult(task, taskResult, result.value.success);
          context.progressTracker.completeTask(task.id, launcherResult);

          if (result.value.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } else {
          const errorResult: TypesTaskResult = {
            taskId: task.id,
            agentId: 'unknown',
            status: 'failed',
            error: {
              type: 'agent_failure',
              message: result.reason?.message || 'Unknown error',
              recoverable: false,
              suggestedAction: 'Review task configuration'
            },
            startTime: new Date(),
            endTime: new Date(),
            duration: 0,
            tokensUsed: 0,
            cost: 0,
            model: task.model,
            escalations: []
          };

          batch.results.set(task.id, errorResult);
          // Convert to launcher format for ProgressTracker
          const launcherResult = this.convertToLauncherTaskResult(task, errorResult, false);
          context.progressTracker.completeTask(task.id, launcherResult);
          failureCount++;
        }
      });

      // Update batch status
      const executionTime = performance.now() - startTime;
      batch.endTime = new Date();
      batch.resourceUsage.duration = executionTime;
      
      if (failureCount === 0) {
        batch.status = 'completed';
      } else if (successCount > 0) {
        batch.status = 'degraded'; // Partial success
      } else {
        batch.status = 'failed';
      }

      this.logger.info(`📊 Batch ${batch.id} finished: ${successCount} success, ${failureCount} failed`);
      
      return batch;

    } catch (error) {
      this.logger.error(`💥 Batch ${batch.id} execution failed:`, error);
      batch.status = 'failed';
      batch.endTime = new Date();
      return batch;
    }
  }

  /**
   * EXECUTE TASK WITH RETRY
   * Esegue un singolo task con logica di retry intelligente
   */
  private async executeTaskWithRetry(task: Task, context: ExecutionContext): Promise<TaskExecutionResult> {
    let lastError: ExecutionError | undefined;
    let totalExecutionTime = 0;
    let totalResourceUsage: TaskResourceUsage = { memory: 0, cpu: 0, tokens: 0, cost: 0 };

    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      const attemptStartTime = performance.now();
      
      try {
        // Check resource limits before execution
        await this.resourceMonitor.checkResourceAvailability(task);

        // Update progress tracking
        context.progressTracker.startTask(task.id);

        // Execute the task (this would call the actual Task tool)
        const result = await this.executeTask(task, context);

        const executionTime = performance.now() - attemptStartTime;
        totalExecutionTime += executionTime;

        if (result.success) {
          return {
            success: true,
            result: result.result,
            retryCount: attempt - 1,
            executionTime: totalExecutionTime,
            resourceUsage: totalResourceUsage
          };
        } else {
          lastError = result.error!;
          
          // Check if error is retryable
          if (!this.retryManager.shouldRetry(lastError, attempt)) {
            break;
          }

          // Apply retry delay
          const delay = this.retryManager.calculateRetryDelay(attempt, lastError);
          if (delay > 0) {
            this.logger.debug(`⏳ Retrying task ${task.id} in ${delay}ms (attempt ${attempt})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

      } catch (error) {
        const executionTime = performance.now() - attemptStartTime;
        totalExecutionTime += executionTime;

        lastError = {
          type: 'api_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
          cause: error instanceof Error ? error : undefined,
          context: { taskId: task.id, attempt }
        };

        if (!this.retryManager.shouldRetry(lastError, attempt)) {
          break;
        }

        // Apply retry delay
        const delay = this.retryManager.calculateRetryDelay(attempt, lastError);
        if (delay > 0) {
          this.logger.debug(`⏳ Retrying task ${task.id} in ${delay}ms (attempt ${attempt})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError,
      retryCount: this.config.maxRetryAttempts,
      executionTime: totalExecutionTime,
      resourceUsage: totalResourceUsage
    };
  }

  /**
   * EXECUTE TASK
   * Esegue effettivamente il task (placeholder per integrazione con Task tool)
   */
  private async executeTask(task: Task, context: ExecutionContext): Promise<{ success: boolean; result?: TypesTaskResult; error?: ExecutionError }> {
    // This is a placeholder - in real implementation, this would call the Task tool
    // For now, simulate task execution
    
    const startTime = performance.now();
    const simulatedDuration = Math.random() * 3000 + 1000; // 1-4 seconds
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (success) {
          const result: TypesTaskResult = {
            taskId: task.id,
            agentId: task.agentFile,
            status: 'completed',
            result: {
              header: {
                agent: task.agentFile,
                taskId: task.id,
                status: 'SUCCESS',
                model: task.model,
                timestamp: new Date()
              },
              summary: `Task ${task.id} completed successfully`,
              details: { description: task.description },
              filesModified: [],
              issuesFound: [],
              nextActions: [],
              handoff: { to: '', context: '' },
              rawResponse: `Simulated successful execution of task ${task.id}`
            },
            startTime: new Date(startTime),
            endTime: new Date(),
            duration,
            tokensUsed: Math.floor(Math.random() * 5000 + 1000),
            cost: Math.random() * 0.5 + 0.1,
            model: task.model,
            escalations: []
          };

          resolve({ success: true, result });
        } else {
          const error: ExecutionError = {
            type: 'api_error',
            message: 'Simulated task execution failure',
            retryable: true,
            context: { taskId: task.id }
          };

          resolve({ success: false, error });
        }
      }, simulatedDuration);
    });
  }

  /**
   * CHECK DEGRADATION TRIGGERS
   * Monitora metriche per attivare graceful degradation
   */
  private async checkDegradationTriggers(context: ExecutionContext): Promise<void> {
    const actions = await this.degradationManager.checkTriggers(this.metrics);
    
    for (const action of actions) {
      await this.applyDegradationAction(action, context);
    }
  }

  /**
   * APPLY DEGRADATION ACTION
   * Applica azioni di degradazione per mantenere stabilità
   */
  private async applyDegradationAction(action: DegradationAction, context: ExecutionContext): Promise<void> {
    this.logger.warn(`⚠️ Applying degradation action: ${action.action} (trigger: ${action.trigger})`);

    switch (action.action) {
      case 'reduce_concurrency':
        this.config.batchConfig.parallelBatchLimit = Math.max(1, 
          Math.floor(this.config.batchConfig.parallelBatchLimit * 0.7));
        break;

      case 'switch_model':
        // Switch tasks to lighter model
        this.degradeTaskModels();
        break;

      case 'skip_optional':
        // Mark optional tasks as skipped
        this.skipOptionalTasks();
        break;

      case 'abort':
        this.logger.error(`🚨 Critical degradation: Aborting execution`);
        await this.emergencyShutdown(context);
        throw new Error('Execution aborted due to critical degradation');
    }

    this.emit('degradationApplied', action);
  }

  /**
   * SUPPORTING METHODS FOR METRICS AND MONITORING
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      retriedTasks: 0,
      degradedTasks: 0,
      averageExecutionTime: 0,
      averageBatchTime: 0,
      resourceUtilization: {
        memory: 0,
        cpu: 0,
        tokens: 0,
        cost: 0,
        peakMemory: 0,
        peakCpu: 0
      },
      errorRate: 0,
      throughput: 0,
      costEfficiency: 0,
      parallelismEfficiency: 0
    };
  }

  private setupMonitoring(): void {
    // Setup periodic monitoring
    setInterval(() => {
      this.updateResourceMetrics();
      this.emitMetricsUpdate();
    }, this.config.monitoringConfig.metricsUpdateInterval);
  }

  private updateResourceMetrics(): void {
    // Update resource utilization metrics
    // This would interface with system monitoring in real implementation
    this.metrics.resourceUtilization.memory = this.resourceMonitor.getCurrentMemoryUsage();
    this.metrics.resourceUtilization.cpu = this.resourceMonitor.getCurrentCpuUsage();
  }

  private updateMetricsFromBatch(batch: ExecutionBatch): void {
    const batchSuccesses = Array.from(batch.results.values()).filter(r => r.status === 'completed').length;
    const batchFailures = batch.results.size - batchSuccesses;

    this.metrics.completedTasks += batchSuccesses;
    this.metrics.failedTasks += batchFailures;
    this.metrics.totalTasks = this.metrics.completedTasks + this.metrics.failedTasks;

    if (this.metrics.totalTasks > 0) {
      this.metrics.errorRate = this.metrics.failedTasks / this.metrics.totalTasks;
    }
  }

  private emitProgressUpdate(
    completedBatches: Map<string, ExecutionBatch>, 
    activeBatches: Map<string, Promise<ExecutionBatch>>,
    context: ExecutionContext
  ): void {
    this.emit('progress', {
      completedBatches: completedBatches.size,
      activeBatches: activeBatches.size,
      queuedBatches: this.executionQueue.length,
      metrics: this.metrics
    });
  }

  private emitMetricsUpdate(): void {
    this.emit('metrics', this.metrics);
  }

  private async compileFinalResult(
    batchResults: Map<string, ExecutionBatch>,
    executionTime: number,
    context: ExecutionContext
  ): Promise<ParallelExecutionResult> {
    const allResults: TypesTaskResult[] = [];

    // Convert Map values to array properly
    const batchesArray = Array.from(batchResults.values());
    for (const batch of batchesArray) {
      const batchResultsArray = Array.from(batch.results.values());
      allResults.push(...batchResultsArray);
    }

    const successfulTasks = allResults.filter(r => r.status === 'completed');
    const failedTasks = allResults.filter(r => r.status === 'failed');

    return {
      sessionId: context.sessionId,
      success: failedTasks.length === 0,
      totalTasks: allResults.length,
      completedTasks: successfulTasks.length,
      failedTasks: failedTasks.length,
      executionTime: executionTime / 1000, // Convert to seconds
      batchResults: Array.from(batchResults.values()),
      taskResults: allResults,
      metrics: this.metrics,
      degradationActions: this.degradationManager.getAppliedActions()
    };
  }

  private degradeTaskModels(): void {
    // Implementation for switching to lighter models
    this.logger.info('📉 Degrading task models for better performance');
  }

  private skipOptionalTasks(): void {
    // Implementation for skipping optional tasks
    this.logger.info('⏭️ Skipping optional tasks to reduce load');
  }

  private async emergencyShutdown(context: ExecutionContext): Promise<void> {
    this.logger.error('🚨 Emergency shutdown initiated');
    this.isRunning = false;
    
    // Cancel all active executions
    this.activeExecutions.clear();
    this.executionQueue = [];
    this.currentBatches.clear();
    
    this.emit('emergencyShutdown', { sessionId: context.sessionId });
  }
}

// ============================================================================
// SUPPORTING CLASSES
// ============================================================================

class ResourceMonitor {
  constructor(private limits: ResourceLimits) {}

  async checkResourceAvailability(task: Task): Promise<boolean> {
    const currentUsage = {
      memory: this.getCurrentMemoryUsage(),
      cpu: this.getCurrentCpuUsage(),
      tokens: this.getCurrentTokenUsage(),
      cost: this.getCurrentCostUsage()
    };

    // Check against limits
    return (
      currentUsage.memory < this.limits.maxMemoryUsage &&
      currentUsage.cpu < this.limits.maxCpuUsage &&
      currentUsage.tokens < this.limits.maxTokensPerMinute &&
      currentUsage.cost < this.limits.maxCostPerMinute
    );
  }

  getCurrentMemoryUsage(): number {
    // Placeholder - would interface with system monitoring
    return Math.random() * 1000; // MB
  }

  getCurrentCpuUsage(): number {
    // Placeholder - would interface with system monitoring
    return Math.random() * 100; // Percentage
  }

  getCurrentTokenUsage(): number {
    // Placeholder - would track token usage
    return Math.random() * 10000; // Tokens per minute
  }

  getCurrentCostUsage(): number {
    // Placeholder - would track cost
    return Math.random() * 1.0; // USD per minute
  }
}

class RetryManager {
  private retryStrategy: RetryStrategy;

  constructor(config: ParallelExecutionConfig) {
    this.retryStrategy = {
      maxAttempts: config.maxRetryAttempts,
      backoffStrategy: 'exponential',
      baseDelay: config.retryDelayBase,
      maxDelay: config.retryDelayBase * 10,
      retryConditions: [
        { errorType: 'timeout', retryable: true },
        { errorType: 'api_error', retryable: true },
        { errorType: 'resource_limit', retryable: true, customDelay: 5000 },
        { errorType: 'validation_error', retryable: false }
      ]
    };
  }

  shouldRetry(error: ExecutionError, attempt: number): boolean {
    if (attempt >= this.retryStrategy.maxAttempts) {
      return false;
    }

    const condition = this.retryStrategy.retryConditions.find(c => c.errorType === error.type);
    return condition?.retryable ?? error.retryable;
  }

  calculateRetryDelay(attempt: number, error: ExecutionError): number {
    const condition = this.retryStrategy.retryConditions.find(c => c.errorType === error.type);
    
    if (condition?.customDelay) {
      return condition.customDelay;
    }

    switch (this.retryStrategy.backoffStrategy) {
      case 'linear':
        return Math.min(this.retryStrategy.baseDelay * attempt, this.retryStrategy.maxDelay);
      
      case 'exponential':
        return Math.min(this.retryStrategy.baseDelay * Math.pow(2, attempt - 1), this.retryStrategy.maxDelay);
      
      case 'adaptive':
        // Add jitter for adaptive strategy
        const baseDelay = this.retryStrategy.baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * baseDelay * 0.1;
        return Math.min(baseDelay + jitter, this.retryStrategy.maxDelay);
      
      default:
        return this.retryStrategy.baseDelay;
    }
  }
}

class DegradationManager {
  private thresholds: DegradationThresholds;
  private appliedActions: DegradationAction[] = [];

  constructor(thresholds: DegradationThresholds) {
    this.thresholds = thresholds;
  }

  async checkTriggers(metrics: ExecutionMetrics): Promise<DegradationAction[]> {
    const actions: DegradationAction[] = [];

    // Check error rate threshold
    if (metrics.errorRate > this.thresholds.errorRateThreshold) {
      actions.push({
        trigger: 'error_rate',
        action: 'reduce_concurrency',
        severity: 'moderate',
        threshold: this.thresholds.errorRateThreshold,
        reversible: true
      });
    }

    // Check resource usage
    if (metrics.resourceUtilization.memory > this.thresholds.resourceUsageThreshold * 1000) {
      actions.push({
        trigger: 'resource_limit',
        action: 'switch_model',
        severity: 'moderate',
        threshold: this.thresholds.resourceUsageThreshold,
        reversible: true
      });
    }

    // Filter out already applied actions
    const newActions = actions.filter(action => 
      !this.appliedActions.some(applied => 
        applied.trigger === action.trigger && applied.action === action.action
      )
    );

    this.appliedActions.push(...newActions);
    return newActions;
  }

  getAppliedActions(): DegradationAction[] {
    return [...this.appliedActions];
  }
}

// ============================================================================
// RESULT INTERFACE
// ============================================================================

export interface ParallelExecutionResult {
  sessionId: string;
  success: boolean;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  executionTime: number;
  batchResults: ExecutionBatch[];
  taskResults: TypesTaskResult[];
  metrics: ExecutionMetrics;
  degradationActions: DegradationAction[];
}

export default ParallelExecutionEngine;