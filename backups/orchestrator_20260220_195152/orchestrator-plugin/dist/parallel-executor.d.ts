/**
 * PARALLEL EXECUTOR - Consolidated
 * =================================
 * Esecuzione parallela consolidata da tutti i file in parallel/
 *
 * @version 4.0.0
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export interface ParallelTask<T = any> {
    id: string;
    fn: () => Promise<T>;
    priority?: number;
    timeout?: number;
    retries?: number;
}
export interface ParallelResult<T = any> {
    id: string;
    success: boolean;
    result?: T;
    error?: string;
    duration: number;
    retries: number;
}
export interface ResourceMetrics {
    memoryUsedMB: number;
    memoryLimitMB: number;
    memoryPercent: number;
    activeTasks: number;
    queuedTasks: number;
    cpuEstimate: number;
}
export interface ExecutorConfig {
    maxConcurrent: number;
    defaultTimeout: number;
    defaultRetries: number;
    memoryLimitMB: number;
    autoScaleEnabled: boolean;
    minConcurrent: number;
    maxConcurrentLimit: number;
}
export declare class ParallelExecutor extends EventEmitter {
    private config;
    private running;
    private queue;
    private results;
    private isExecuting;
    constructor(config?: Partial<ExecutorConfig>);
    /**
     * Esegue task in parallelo
     */
    executeInParallel<T>(tasks: ParallelTask<T>[]): Promise<ParallelResult<T>[]>;
    /**
     * Esegue in batch
     */
    batchExecute<T>(tasks: ParallelTask<T>[], batchSize: number): Promise<ParallelResult<T>[]>;
    /**
     * Avvia un singolo task
     */
    private startTask;
    /**
     * Auto-scaling basato su risorse
     */
    private autoScale;
    /**
     * Metriche risorse
     */
    getResourceMetrics(): ResourceMetrics;
    /**
     * Timeout promise
     */
    private createTimeout;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Stop execution
     */
    stop(): void;
    /**
     * Get current state
     */
    getState(): {
        running: number;
        queued: number;
        completed: number;
    };
}
export declare const parallelExecutor: ParallelExecutor;
export declare function runParallel<T>(tasks: ParallelTask<T>[], maxConcurrent?: number): Promise<ParallelResult<T>[]>;
export declare function runBatched<T>(tasks: ParallelTask<T>[], batchSize: number): Promise<ParallelResult<T>[]>;
//# sourceMappingURL=parallel-executor.d.ts.map