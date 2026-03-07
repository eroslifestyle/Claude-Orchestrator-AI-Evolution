/**
 * N-LEVEL PARALLEL EXECUTOR
 * ==========================
 * Sistema di esecuzione parallela a N livelli dinamici.
 *
 * PRINCIPIO FONDAMENTALE:
 * - TUTTI i task indipendenti partono SIMULTANEAMENTE
 * - Nessuna attesa per "livello" - solo dipendenze reali
 * - Ogni task completato sblocca IMMEDIATAMENTE i suoi dipendenti
 *
 * @version 3.1.0 - N-Level Support
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
type ModelType = 'haiku' | 'sonnet' | 'opus';
type TaskStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed';
interface NLevelTask {
    id: string;
    path: string;
    depth: number;
    description: string;
    agentExpertFile: string;
    model: ModelType;
    priority: number;
    parentId: string | null;
    childIds: string[];
    rootId: string;
    dependsOn: string[];
    blockedBy: Set<string>;
    unlocks: string[];
    status: TaskStatus;
    result?: any;
    error?: string;
    startTime?: number;
    endTime?: number;
    canSpawnChildren: boolean;
    maxChildren: number;
    complexityScore: number;
}
interface ExecutorConfig {
    maxConcurrent: number;
    maxDepth: number;
    maxTotalTasks: number;
    timeoutMs: number;
    memoryLimitMB: number;
}
interface ExecutionStats {
    totalTasks: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
    maxDepthReached: number;
    avgTaskDuration: number;
    parallelismEfficiency: number;
}
declare class NLevelTaskGraph {
    private tasks;
    private readyQueue;
    private taskCounter;
    /**
     * Aggiunge un task al grafo
     */
    addTask(task: NLevelTask): void;
    /**
     * Crea un nuovo task con ID gerarchico
     */
    createTask(config: {
        parentId?: string;
        description: string;
        agentExpertFile: string;
        model: ModelType;
        priority?: number;
        dependsOn?: string[];
        canSpawnChildren?: boolean;
        maxChildren?: number;
    }): NLevelTask;
    /**
     * Marca un task come completato e sblocca i dipendenti
     * RITORNA: lista di task appena sbloccati (pronti per esecuzione immediata)
     */
    markCompleted(taskId: string, result?: any): string[];
    /**
     * Marca un task come fallito
     */
    markFailed(taskId: string, error: string): void;
    /**
     * Estrae i task pronti per l'esecuzione (ordinati per priorità)
     */
    getReadyTasks(maxCount?: number): NLevelTask[];
    /**
     * Restituisce statistiche
     */
    getStats(): ExecutionStats;
    /**
     * Verifica se l'esecuzione è completata
     */
    isComplete(): boolean;
    /**
     * Restituisce tutti i task
     */
    getAllTasks(): NLevelTask[];
    /**
     * Restituisce un task specifico
     */
    getTask(taskId: string): NLevelTask | undefined;
    /**
     * Restituisce i figli di un task
     */
    getChildren(taskId: string): NLevelTask[];
    /**
     * Restituisce l'albero gerarchico
     */
    getHierarchy(): Map<string, NLevelTask[]>;
}
export declare class NLevelParallelExecutor extends EventEmitter {
    private config;
    private graph;
    private runningTasks;
    private isExecuting;
    private startTime;
    constructor(config?: Partial<ExecutorConfig>);
    /**
     * Aggiunge un task L1 (radice)
     */
    addRootTask(config: {
        description: string;
        agentExpertFile: string;
        model: ModelType;
        priority?: number;
        canSpawnChildren?: boolean;
        maxChildren?: number;
    }): string;
    /**
     * Aggiunge un subtask (qualsiasi livello)
     */
    addSubTask(parentId: string, config: {
        description: string;
        agentExpertFile: string;
        model: ModelType;
        additionalDependencies?: string[];
        canSpawnChildren?: boolean;
        maxChildren?: number;
    }): string;
    /**
     * Aggiunge un task con dipendenze custom (non gerarchiche)
     */
    addTaskWithDependencies(config: {
        description: string;
        agentExpertFile: string;
        model: ModelType;
        dependsOn: string[];
        priority?: number;
    }): string;
    /**
     * ESECUZIONE PARALLELA MASSIVA
     * Tutti i task indipendenti partono SIMULTANEAMENTE
     */
    execute(): Promise<ExecutionStats>;
    /**
     * Ferma l'esecuzione
     */
    stop(): void;
    /**
     * Restituisce lo stato corrente
     */
    getStatus(): ExecutionStats & {
        isExecuting: boolean;
        elapsedMs: number;
    };
    /**
     * Esegue un task in modo asincrono
     */
    private executeTaskAsync;
    /**
     * Invoca l'agent (da sostituire con Task tool reale)
     */
    private invokeAgent;
    /**
     * Genera subtasks mock (da sostituire con logica reale)
     */
    private generateMockSubtasks;
    /**
     * Spawna subtasks dinamicamente durante l'esecuzione
     */
    private spawnDynamicSubtasks;
    /**
     * Mostra l'albero dei task
     */
    private displayTaskTree;
    /**
     * Mostra il report finale
     */
    private displayFinalReport;
    /**
     * Sleep utility
     */
    private sleep;
}
export declare class CommunicationHub extends EventEmitter {
    private messageLog;
    /**
     * Agent invia risultato all'orchestrator
     */
    agentReport(taskId: string, report: {
        status: 'success' | 'partial' | 'failed';
        output: any;
        suggestedSubtasks?: any[];
        issues?: string[];
        recommendations?: string[];
    }): void;
    /**
     * Agent richiede spawn di subtasks
     */
    requestSubtasks(taskId: string, subtasks: any[]): void;
    /**
     * Agent richiede informazioni da altri agent
     */
    requestInfo(fromTaskId: string, targetTaskId: string, query: string): void;
    /**
     * Orchestrator invia comando a agent
     */
    orchestratorCommand(taskId: string, command: string, payload?: any): void;
    /**
     * Broadcast a tutti gli agent
     */
    broadcast(message: string, payload?: any): void;
    /**
     * Restituisce log messaggi recenti
     */
    getMessageLog(count?: number): typeof this.messageLog;
    /**
     * Log interno
     */
    private log;
}
export { NLevelTaskGraph, NLevelTask, ExecutorConfig, ExecutionStats };
//# sourceMappingURL=n-level-parallel-executor.d.ts.map