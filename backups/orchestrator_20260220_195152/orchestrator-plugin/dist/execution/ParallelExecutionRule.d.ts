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
/// <reference types="node" />
import { EventEmitter } from 'events';
export interface TaskNode {
    id: string;
    description: string;
    status: 'pending' | 'ready' | 'running' | 'completed' | 'failed';
    dependencies: string[];
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
    blockedBy: string[];
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
export declare class ParallelExecutionRule extends EventEmitter {
    private config;
    private tasks;
    private executionPlan;
    private metrics;
    private runningTasks;
    private completedTasks;
    private failedTasks;
    constructor(config?: Partial<ParallelRuleConfig>);
    /**
     * Identifica tutti i task che possono essere eseguiti in parallelo
     * (nessuna dipendenza reciproca)
     */
    detectIndependentTasks(tasks: TaskNode[]): Map<string, Set<string>>;
    /**
     * Calcola i livelli di dipendenza (tasks allo stesso livello sono indipendenti)
     */
    private computeDependencyLevels;
    /**
     * Costruisce il piano di esecuzione parallela ottimizzato
     */
    buildParallelExecutionPlan(tasks: TaskNode[]): ParallelExecutionPlan;
    /**
     * Calcola il percorso critico (catena di dipendenze più lunga)
     */
    private calculateCriticalPath;
    /**
     * Esegue il piano con parallelismo massimo
     * @param taskExecutor Funzione che esegue effettivamente il task
     */
    executeWithMaxParallelism(taskExecutor: (task: TaskNode) => Promise<{
        success: boolean;
        result?: any;
        error?: Error;
    }>): Promise<ExecutionMetrics>;
    /**
     * Attende il completamento di specifici task
     */
    private waitForTasks;
    /**
     * Ribilancia dinamicamente il piano quando un task fallisce
     */
    rebalanceOnFailure(failedTaskId: string): ExecutionBatch[];
    /**
     * Ottiene lo stato attuale dell'esecuzione
     */
    getExecutionState(): {
        running: string[];
        completed: string[];
        failed: string[];
        pending: string[];
    };
    /**
     * Ottiene il piano di esecuzione corrente
     */
    getExecutionPlan(): ParallelExecutionPlan | null;
    /**
     * Ottiene le metriche correnti
     */
    getMetrics(): ExecutionMetrics;
    /**
     * Reset dello stato
     */
    reset(): void;
}
export declare function createParallelExecutionRule(config?: Partial<ParallelRuleConfig>): ParallelExecutionRule;
/**
 * Helper per integrare la regola con l'orchestrator esistente
 */
export declare function applyParallelExecutionRule(orchestrator: any, config?: Partial<ParallelRuleConfig>): ParallelExecutionRule;
//# sourceMappingURL=ParallelExecutionRule.d.ts.map