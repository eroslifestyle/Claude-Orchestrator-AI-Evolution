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
/// <reference types="node" />
import { EventEmitter } from 'events';
import { ProgressTracker } from '../tracking/progress-tracker';
import { PluginLogger } from '../utils/logger';
import type { Task, TaskResult as TypesTaskResult, ExecutionPlan } from '../types';
export interface ParallelExecutionConfig {
    maxConcurrentTasks: number;
    maxRetryAttempts: number;
    retryDelayBase: number;
    resourceLimits: ResourceLimits;
    degradationThresholds: DegradationThresholds;
    monitoringConfig: MonitoringConfig;
    batchConfig: BatchConfig;
}
export interface ResourceLimits {
    maxMemoryUsage: number;
    maxCpuUsage: number;
    maxTokensPerMinute: number;
    maxCostPerMinute: number;
    concurrencyLimit: number;
}
export interface DegradationThresholds {
    errorRateThreshold: number;
    resourceUsageThreshold: number;
    latencyThreshold: number;
    costThreshold: number;
}
export interface MonitoringConfig {
    metricsUpdateInterval: number;
    performanceLogInterval: number;
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
    dependencies: string[];
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
    throughput: number;
    costEfficiency: number;
    parallelismEfficiency: number;
}
export interface ResourceUtilization {
    memory: number;
    cpu: number;
    tokens: number;
    cost: number;
    peakMemory: number;
    peakCpu: number;
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
export declare class ParallelExecutionEngine extends EventEmitter {
    private config;
    private logger;
    private isRunning;
    private currentBatches;
    private executionQueue;
    private activeExecutions;
    private metrics;
    private resourceMonitor;
    private retryManager;
    private degradationManager;
    private progressTracker?;
    constructor(config: ParallelExecutionConfig);
    /**
     * MAIN EXECUTION METHOD
     * Coordina l'esecuzione parallela con batch dependency management
     */
    executeParallel(executionPlan: ExecutionPlan, progressTracker?: ProgressTracker): Promise<ParallelExecutionResult>;
    /**
     * BATCH CREATION WITH DEPENDENCY MANAGEMENT
     * Crea batch ottimizzati analizzando le dipendenze tra task
     */
    private createExecutionBatches;
    /**
     * DEPENDENCY LAYER ANALYSIS
     * Analizza il grafo delle dipendenze per identificare layer paralleli
     */
    private analyzeDependencyLayers;
    /**
     * CREATE BATCHES FOR LAYER
     * Crea batch ottimizzati per un singolo layer di dipendenze
     */
    private createBatchesForLayer;
    /**
     * GROUP TASKS FOR BATCHING
     * Raggruppa task simili per ottimizzare l'esecuzione in batch
     */
    private groupTasksForBatching;
    /**
     * ENSURE DEPENDENCY GRAPH
     * Converte le dipendenze in un DependencyGraph completo se necessario
     */
    private ensureDependencyGraph;
    /**
     * CONVERT TASK RESULT TO LAUNCHER FORMAT
     * Converte un TypesTaskResult nel formato atteso da ProgressTracker
     */
    private convertToLauncherTaskResult;
    /**
     * EXECUTE BATCHES WITH DEPENDENCIES
     * Esegue i batch rispettando le dipendenze e gestendo la concorrenza
     */
    private executeBatchesWithDependencies;
    /**
     * START READY BATCHES
     * Avvia batch pronti per l'esecuzione rispettando limiti di concorrenza
     */
    private startReadyBatches;
    /**
     * CHECK DEPENDENCIES
     * Verifica se tutte le dipendenze di un batch sono soddisfatte
     */
    private areDependenciesMet;
    /**
     * EXECUTE BATCH
     * Esegue tutti i task in un singolo batch con gestione errori
     */
    private executeBatch;
    /**
     * EXECUTE TASK WITH RETRY
     * Esegue un singolo task con logica di retry intelligente
     */
    private executeTaskWithRetry;
    /**
     * EXECUTE TASK
     * Esegue effettivamente il task (placeholder per integrazione con Task tool)
     */
    private executeTask;
    /**
     * CHECK DEGRADATION TRIGGERS
     * Monitora metriche per attivare graceful degradation
     */
    private checkDegradationTriggers;
    /**
     * APPLY DEGRADATION ACTION
     * Applica azioni di degradazione per mantenere stabilità
     */
    private applyDegradationAction;
    /**
     * SUPPORTING METHODS FOR METRICS AND MONITORING
     */
    private initializeMetrics;
    private setupMonitoring;
    private updateResourceMetrics;
    private updateMetricsFromBatch;
    private emitProgressUpdate;
    private emitMetricsUpdate;
    private compileFinalResult;
    private degradeTaskModels;
    private skipOptionalTasks;
    private emergencyShutdown;
}
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
//# sourceMappingURL=parallel-execution-engine.d.ts.map