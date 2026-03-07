/**
 * ORCHESTRATOR VISUALIZER - Complete Activity Logging
 *
 * REGOLA: Ogni qual volta si utilizza l'orchestrator, visualizza
 * TUTTI i messaggi per seguire il lavoro completo.
 *
 * Features:
 * - Real-time progress tracking
 * - Agent activity monitoring
 * - Task status updates
 * - Error and warning display
 * - Performance metrics
 * - Visual formatting
 *
 * @version 1.0
 * @date 2026-02-03
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type LogCategory = 'ORCHESTRATOR' | 'AGENT' | 'TASK' | 'CONTEXT' | 'PARALLEL' | 'DEPENDENCY' | 'FALLBACK' | 'PERFORMANCE' | 'ERROR' | 'SYSTEM';
export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    category: LogCategory;
    message: string;
    data?: any;
    agentId?: string;
    taskId?: string;
    batchId?: string;
}
export interface VisualizerConfig {
    enabled: boolean;
    showTimestamps: boolean;
    showAgentActivity: boolean;
    showTaskProgress: boolean;
    showPerformanceMetrics: boolean;
    showContextEvents: boolean;
    showDependencyFlow: boolean;
    showErrors: boolean;
    colorOutput: boolean;
    minLogLevel: LogLevel;
    maxHistorySize: number;
    realTimeRefreshMs: number;
}
export interface AgentActivityState {
    agentId: string;
    status: 'idle' | 'running' | 'completed' | 'failed';
    currentTask?: string;
    startTime?: number;
    taskCount: number;
    successCount: number;
    failCount: number;
}
export interface TaskProgressState {
    taskId: string;
    description: string;
    status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped';
    agentId?: string;
    startTime?: number;
    endTime?: number;
    progress: number;
}
export interface OrchestratorState {
    sessionId: string;
    startTime: number;
    status: 'initializing' | 'planning' | 'executing' | 'completed' | 'failed';
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    runningTasks: number;
    pendingTasks: number;
    currentBatch: number;
    totalBatches: number;
    activeAgents: number;
    maxConcurrency: number;
    elapsedMs: number;
    estimatedRemainingMs: number;
}
export declare class OrchestratorVisualizer extends EventEmitter {
    private config;
    private logHistory;
    private agentStates;
    private taskStates;
    private orchestratorState;
    private refreshTimer;
    private lineCount;
    constructor(config?: Partial<VisualizerConfig>);
    /**
     * Inizializza una nuova sessione di orchestrazione
     */
    startSession(sessionId: string, totalTasks: number, maxConcurrency: number): void;
    /**
     * Stampa header della sessione
     */
    private printHeader;
    /**
     * Log entry principale
     */
    log(level: LogLevel, category: LogCategory, message: string, data?: any, options?: {
        agentId?: string;
        taskId?: string;
        batchId?: string;
    }): void;
    /**
     * Verifica se il livello di log deve essere mostrato
     */
    private shouldLog;
    /**
     * Stampa una entry di log formattata
     */
    private printLogEntry;
    /**
     * Log avvio agent
     */
    logAgentStart(agentId: string, taskId: string, taskDescription: string): void;
    /**
     * Log completamento agent
     */
    logAgentComplete(agentId: string, taskId: string, success: boolean, durationMs: number): void;
    /**
     * Log creazione task
     */
    logTaskCreated(taskId: string, description: string, dependencies: string[]): void;
    /**
     * Log task pronto per esecuzione
     */
    logTaskReady(taskId: string): void;
    /**
     * Log avvio task
     */
    logTaskStart(taskId: string, agentId: string): void;
    /**
     * Log completamento task
     */
    logTaskComplete(taskId: string, success: boolean, durationMs: number): void;
    /**
     * Log inizio batch
     */
    logBatchStart(batchId: string, batchOrder: number, totalBatches: number, taskCount: number): void;
    /**
     * Log completamento batch
     */
    logBatchComplete(batchId: string, completed: number, failed: number, durationMs: number): void;
    /**
     * Stampa banner del batch
     */
    private printBatchBanner;
    /**
     * Stampa summary del batch
     */
    private printBatchSummary;
    /**
     * Log clear del contesto
     */
    logContextClear(agentId: string, tokenCount: number, reason: string): void;
    /**
     * Log risoluzione dipendenza
     */
    logDependencyResolved(taskId: string, dependencyId: string): void;
    /**
     * Log blocco per dipendenza
     */
    logDependencyBlocked(taskId: string, waitingFor: string[]): void;
    /**
     * Log errore
     */
    logError(message: string, error: Error, context?: {
        taskId?: string;
        agentId?: string;
    }): void;
    /**
     * Log fallback
     */
    logFallback(taskId: string, originalAgent: string, fallbackAgent: string, reason: string): void;
    /**
     * Log metriche performance
     */
    logPerformanceMetrics(metrics: {
        elapsedMs: number;
        avgTaskDuration: number;
        maxConcurrency: number;
        currentConcurrency: number;
        throughput: number;
    }): void;
    /**
     * Finalizza e stampa report della sessione
     */
    endSession(finalMetrics: {
        totalDurationMs: number;
        tasksCompleted: number;
        tasksFailed: number;
        maxConcurrencyReached: number;
        avgConcurrency: number;
        speedupFactor: number;
        totalTokensCleared: number;
    }): void;
    /**
     * Stampa report finale
     */
    private printFinalReport;
    /**
     * Genera barra del success rate
     */
    private getSuccessRateBar;
    /**
     * Formatta timestamp
     */
    private formatTime;
    /**
     * Applica colore al testo
     */
    private color;
    /**
     * Colore per livello log
     */
    private getLevelColor;
    /**
     * Colore per categoria
     */
    private getCategoryColor;
    /**
     * Aggiorna stato orchestrator
     */
    private updateOrchestratorState;
    /**
     * Ottieni stato corrente
     */
    getState(): OrchestratorState | null;
    /**
     * Ottieni log history
     */
    getLogHistory(): LogEntry[];
    /**
     * Reset del visualizer
     */
    reset(): void;
}
export declare function createOrchestratorVisualizer(config?: Partial<VisualizerConfig>): OrchestratorVisualizer;
export declare function getGlobalVisualizer(): OrchestratorVisualizer;
export declare const visualizer: {
    startSession: (sessionId: string, totalTasks: number, maxConcurrency: number) => void;
    log: (level: LogLevel, category: LogCategory, message: string, data?: any, options?: any) => void;
    agentStart: (agentId: string, taskId: string, taskDescription: string) => void;
    agentComplete: (agentId: string, taskId: string, success: boolean, durationMs: number) => void;
    taskCreated: (taskId: string, description: string, dependencies: string[]) => void;
    taskReady: (taskId: string) => void;
    taskStart: (taskId: string, agentId: string) => void;
    taskComplete: (taskId: string, success: boolean, durationMs: number) => void;
    batchStart: (batchId: string, batchOrder: number, totalBatches: number, taskCount: number) => void;
    batchComplete: (batchId: string, completed: number, failed: number, durationMs: number) => void;
    contextClear: (agentId: string, tokenCount: number, reason: string) => void;
    error: (message: string, error: Error, context?: any) => void;
    fallback: (taskId: string, originalAgent: string, fallbackAgent: string, reason: string) => void;
    endSession: (metrics: any) => void;
};
//# sourceMappingURL=OrchestratorVisualizer.d.ts.map