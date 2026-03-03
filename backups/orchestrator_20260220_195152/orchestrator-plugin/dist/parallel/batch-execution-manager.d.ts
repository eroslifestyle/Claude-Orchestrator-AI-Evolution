/**
 * BATCH EXECUTION MANAGER V7.0
 *
 * Sistema avanzato per gestione batch con dependency management intelligente,
 * ottimizzazione automatica e coordinamento di task paralleli.
 *
 * FEATURES:
 * - Smart dependency resolution con cycle detection
 * - Dynamic batch optimization basata su metriche real-time
 * - Adaptive scheduling con load balancing
 * - Resource-aware batch sizing
 * - Intelligent task grouping e priority management
 *
 * @author Livello 5 Batch Expert
 * @version 7.0.0-batch-master
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { Task, DependencyGraph } from '../types';
import type { ExecutionBatch, ExecutionMetrics as ParallelExecutionMetrics } from './parallel-execution-engine';
export interface BatchExecutionConfig {
    maxBatchSize: number;
    minBatchSize: number;
    maxConcurrentBatches: number;
    batchTimeoutMs: number;
    dependencyTimeoutMs: number;
    optimizationInterval: number;
    resourceThresholds: BatchResourceThresholds;
    priorityConfig: BatchPriorityConfig;
}
export interface BatchResourceThresholds {
    memoryPerBatch: number;
    cpuPerBatch: number;
    tokensPerBatch: number;
    costPerBatch: number;
    executionTimeLimit: number;
}
export interface BatchPriorityConfig {
    priorityWeights: {
        CRITICA: number;
        ALTA: number;
        MEDIA: number;
        BASSA: number;
    };
    dependencyWeight: number;
    resourceWeight: number;
    ageWeight: number;
}
export interface BatchOptimizationResult {
    originalBatches: number;
    optimizedBatches: number;
    estimatedSpeedup: number;
    resourceSavings: number;
    dependencyImprovements: number;
}
export interface DependencyResolution {
    resolved: boolean;
    resolutionTime: number;
    cycles: DependencyCycle[];
    criticalPath: string[];
    parallelizableGroups: string[][];
    warnings: string[];
}
export interface DependencyCycle {
    taskIds: string[];
    severity: 'warning' | 'error';
    suggestedResolution: string;
    canBreak: boolean;
}
export interface BatchSchedule {
    batches: ScheduledBatch[];
    totalEstimatedTime: number;
    maxParallelism: number;
    resourceUtilization: BatchResourceUtilization;
    criticalPathLength: number;
}
export interface ScheduledBatch {
    id: string;
    batch: ExecutionBatch;
    scheduledStart: Date;
    estimatedDuration: number;
    priority: number;
    resourceRequirements: BatchResourceRequirements;
    dependencies: string[];
    canStart: boolean;
}
export interface BatchResourceRequirements {
    memory: number;
    cpu: number;
    tokens: number;
    cost: number;
    concurrency: number;
}
export interface BatchResourceUtilization {
    peakMemory: number;
    peakCpu: number;
    peakConcurrency: number;
    averageUtilization: number;
    resourceEfficiency: number;
}
export interface BatchParallelExecutionMetrics {
    totalBatches: number;
    completedBatches: number;
    failedBatches: number;
    averageBatchTime: number;
    batchSizeEfficiency: number;
    dependencyResolutionTime: number;
    optimizationTime: number;
    batchCreationTime?: number;
    resourceUtilization: BatchResourceUtilization;
    parallelismAchieved: number;
}
export declare class BatchExecutionManager extends EventEmitter {
    private config;
    private logger;
    private dependencyResolver;
    private batchOptimizer;
    private scheduler;
    private metrics;
    private activeBatches;
    private completedBatches;
    private resourceMonitor;
    constructor(config: BatchExecutionConfig);
    /**
     * CREATE OPTIMIZED BATCHES
     * Crea batch ottimizzati analizzando dipendenze e risorse
     */
    createOptimizedBatches(tasks: Task[], dependencyGraph: DependencyGraph): Promise<BatchCreationResult>;
    /**
     * EXECUTE BATCH SCHEDULE
     * Esegue i batch secondo lo schedule ottimizzato
     */
    executeBatchSchedule(schedule: BatchSchedule, executionHandler: BatchExecutionHandler): Promise<BatchExecutionResult>;
    /**
     * DYNAMIC BATCH OPTIMIZATION
     * Ottimizza batch durante l'esecuzione basandosi su metriche real-time
     */
    dynamicOptimization(remainingBatches: ScheduledBatch[], currentMetrics: ParallelExecutionMetrics): Promise<OptimizationRecommendation>;
    private createInitialBatches;
    private groupTasksByDependencyLayer;
    private createBatchesForLayer;
    private createBatch;
    private sortTasksForBatching;
    private getPriorityWeight;
    private estimateTaskResources;
    private getModelResourceMultiplier;
    private wouldExceedBatchLimits;
    private startReadyBatches;
    private waitForNextCompletion;
    private updateBatchDependencies;
    private initializeMetrics;
    private updateMetrics;
    private updateBatchMetrics;
    private getMetrics;
    private analyzeCurrentPerformance;
    private isBatchSizeSuboptimal;
    private hasResourceImbalance;
    private isPrioritySuboptimal;
    private calculateOverallEfficiency;
    private calculateOptimalBatchSize;
    private calculateResourceAdjustments;
    private calculateOptimalPriorities;
    private calculateRecommendedPriority;
    private getPriorityAdjustmentReason;
    private calculateEstimatedImpact;
    private calculateConfidenceScore;
    private emitBatchCompleted;
    private emitProgressUpdate;
}
export interface BatchCreationResult {
    success: boolean;
    batches: ExecutionBatch[];
    schedule?: BatchSchedule;
    dependencyResolution?: DependencyResolution;
    optimizationResult?: BatchOptimizationResult;
    creationTime: number;
    error?: string;
    metrics?: BatchParallelExecutionMetrics;
}
export interface BatchExecutionResult {
    success: boolean;
    results: Map<string, ExecutionBatch>;
    executionTime: number;
    error?: string;
    metrics?: BatchParallelExecutionMetrics;
}
export interface BatchExecutionHandler {
    executeBatch(batch: ExecutionBatch): Promise<ExecutionBatch>;
}
export interface BatchOptimizationResultWithBatches extends BatchOptimizationResult {
    batches: ExecutionBatch[];
    optimizationTime: number;
}
export interface OptimizationRecommendation {
    hasRecommendations: boolean;
    recommendations: OptimizationAction[];
    estimatedImpact: number;
    confidenceScore: number;
}
export interface OptimizationAction {
    type: 'resize_batches' | 'redistribute_resources' | 'reorder_priority';
    reason: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    newBatchSize?: number;
    resourceAdjustments?: ResourceAdjustment[];
    newPriorityOrder?: PriorityRecommendation[];
}
export interface ResourceAdjustment {
    resource: 'memory' | 'cpu' | 'tokens' | 'cost';
    action: 'reduce' | 'increase' | 'reduce_load';
    percentage: number;
}
export interface PriorityRecommendation {
    batchId: string;
    currentPriority: number;
    recommendedPriority: number;
    reason: string;
}
export interface PerformanceAnalysis {
    batchSizeSuboptimal: boolean;
    resourceImbalance: boolean;
    prioritySuboptimal: boolean;
    overallEfficiency: number;
}
export default BatchExecutionManager;
//# sourceMappingURL=batch-execution-manager.d.ts.map