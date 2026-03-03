/**
 * ORCHESTRATOR v4.1 - EMPEROR UNIFIED ENGINE
 * ============================================
 * Single source of truth per l'orchestrazione.
 * Consolida tutte le versioni precedenti (core, enhanced, integrated, v3)
 * in un unico file snello e performante.
 *
 * FEATURES:
 * - Smart Model Selection (Opus/Sonnet/Haiku)
 * - Agent Discovery & Fallback
 * - Auto Documentation
 * - Parallel Execution (fino a 128 agenti)
 * - Resilience & Recovery integrati
 * - Streaming Results
 * - Lazy Loading
 * - CLEAN CONTEXT: Ogni agent inizia con /clear per massima efficienza
 *
 * @version 4.1.0-EMPEROR
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export type ModelType = 'haiku' | 'sonnet' | 'opus';
export type TaskStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PriorityLevel = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
export interface TaskConfig {
    description: string;
    agentFile?: string;
    model?: ModelType;
    priority?: PriorityLevel;
    dependsOn?: string[];
    timeout?: number;
    retries?: number;
    metadata?: Record<string, any>;
}
export interface Task {
    id: string;
    path: string;
    depth: number;
    config: TaskConfig;
    resolvedAgent: string;
    resolvedModel: ModelType;
    resolvedPriority: PriorityLevel;
    status: TaskStatus;
    progress: number;
    result?: any;
    error?: string;
    createdAt: number;
    startedAt?: number;
    endedAt?: number;
    duration?: number;
    parentId: string | null;
    childIds: string[];
    dependsOn: string[];
    blockedBy: Set<string>;
    unlocks: string[];
    workDone: string[];
    filesModified: string[];
    errorsEncountered: string[];
    notes: string;
}
export interface OrchestratorConfig {
    maxConcurrent: number;
    maxDepth: number;
    maxTasks: number;
    taskTimeout: number;
    enableSmartModelSelection: boolean;
    enableAgentDiscovery: boolean;
    enableAutoDocumentation: boolean;
    enableDashboard: boolean;
    enableStreaming: boolean;
    enableCleanContext: boolean;
    cleanBeforeTask: boolean;
    cleanAfterTask: boolean;
    isolateAgents: boolean;
    focusMode: boolean;
    autoFallbackOnMissing: boolean;
    defaultFallbackAgent: string;
    simulateExecution: boolean;
    simulationDelay: {
        min: number;
        max: number;
    };
}
export interface CleanContextStats {
    tasksProcessed: number;
    tokensSaved: number;
    isContextClean: boolean;
    optimizations: string[];
}
export interface ExecutionStats {
    totalTasks: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
    progress: number;
    elapsedMs: number;
    avgTaskDuration: number;
    parallelism: number;
    maxParallelism: number;
    modelDistribution: Record<ModelType, number>;
    cleanContext?: CleanContextStats;
}
export interface SessionReport {
    sessionId: string;
    startTime: number;
    endTime: number;
    stats: ExecutionStats;
    tasks: Task[];
    errors: string[];
    recommendations: string[];
    cleanContextEnabled: boolean;
}
export declare class OrchestratorV4 extends EventEmitter {
    private config;
    private tasks;
    private readyQueue;
    private runningTasks;
    private taskCounter;
    private isRunning;
    private startTime;
    private maxHistoricalParallelism;
    private sessionId;
    private agentCache;
    private analysisCache;
    private cleanContextManager;
    constructor(config?: Partial<OrchestratorConfig>);
    private analyzeTask;
    addTask(taskConfig: TaskConfig): string;
    addTasks(configs: TaskConfig[]): string[];
    execute(): Promise<ExecutionStats>;
    private executeTaskAsync;
    private invokeAgent;
    /**
     * Ottieni statistiche Clean Context
     */
    getCleanContextStats(): any;
    private unlockDependentTasks;
    private getReadyTasks;
    private isComplete;
    getStats(): ExecutionStats;
    getSessionReport(): SessionReport;
    private showHeader;
    private showFinalReport;
    private sleep;
    stop(): void;
    reset(): void;
    getTasks(): Task[];
    getTask(id: string): Task | undefined;
    getConfig(): OrchestratorConfig;
    updateConfig(updates: Partial<OrchestratorConfig>): void;
}
export declare const orchestrator: OrchestratorV4;
export declare function runOrchestration(tasks: TaskConfig[], config?: Partial<OrchestratorConfig>): Promise<ExecutionStats>;
export declare function analyzeRequest(description: string): {
    agent: string;
    model: ModelType;
    priority: PriorityLevel;
};
export type ComplexityLevel = 'bassa' | 'media' | 'alta';
/**
 * Calcola la complessità basata sul numero di task
 * FIX #6: Soglie aggiornate (10+ = alta, 5+ = media)
 */
export declare function calculateComplexity(taskCount: number): ComplexityLevel;
/**
 * Stima il tempo di esecuzione considerando il parallelismo
 * FIX #7: Formula migliorata
 */
export declare function estimateTime(taskCount: number, maxParallel?: number): string;
export interface PersistedSession {
    sessionId: string;
    startTime: number;
    endTime?: number;
    taskCount: number;
    status: 'running' | 'completed' | 'failed';
    stats?: ExecutionStats;
}
/**
 * Salva le sessioni su file JSON
 * FIX #8: Persistenza sessioni
 */
export declare function saveSessions(sessions: PersistedSession[]): void;
/**
 * Carica le sessioni da file JSON
 * FIX #8: Persistenza sessioni
 */
export declare function loadSessions(): PersistedSession[];
/**
 * Aggiunge una sessione alla lista persistita
 */
export declare function persistSession(session: PersistedSession): void;
/**
 * Cleanup processi orfani (Python, Node, etc.)
 * FIX #10: Regola #0 - Pulizia processi
 */
export declare function cleanupOrphanProcesses(): Promise<void>;
/**
 * Verifica se il documenter è già presente nei task
 * FIX #2: Evita duplicazione documenter
 */
export declare function isDocumenterPresent(tasks: {
    resolvedAgent: string;
}[]): boolean;
/**
 * Aggiunge documenter alla fine se non già presente
 * FIX #2: Con check deduplicazione
 */
export declare function addDocumenterIfNeeded(tasks: TaskConfig[], existingTasks: {
    resolvedAgent: string;
}[]): TaskConfig[];
//# sourceMappingURL=orchestrator-v4-unified.d.ts.map