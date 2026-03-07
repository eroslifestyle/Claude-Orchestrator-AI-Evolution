/**
 * SUPER ORCHESTRATOR v3.0 - True Parallel Hierarchical Execution
 * ==============================================================
 *
 * Architettura Event-Driven con:
 * - Dependency Graph (risoluzione topologica)
 * - True Parallelism (task indipendenti partono subito)
 * - Resource Governor (RAM/CPU/Disk optimization)
 * - Centralized Hub (comunicazione agent → orchestrator)
 *
 * @author LeoDg + Claude Orchestrator
 * @version 3.0.0
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
type ModelType = 'haiku' | 'sonnet' | 'opus';
type TaskStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';
type PriorityLevel = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
interface TaskResult {
    taskId: string;
    status: 'success' | 'partial' | 'failed';
    output: any;
    duration: number;
    tokensUsed: number;
    cost: number;
    error?: string;
}
interface AgentTask {
    id: string;
    description: string;
    agentExpertFile: string;
    model: ModelType;
    priority: PriorityLevel;
    level: number;
    depth: number;
    parentTaskId?: string;
    childTaskIds: string[];
    dependencies: string[];
    dependents: string[];
    status: TaskStatus;
    result?: TaskResult;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    allowSubSpawning: boolean;
    complexityThreshold: number;
    maxSubTasks: number;
    maxDepth: number;
    spawnRules: SubTaskSpawnRule[];
    path: string;
    rootTaskId: string;
}
interface SubTaskSpawnRule {
    triggerKeywords: string[];
    targetExpertFile: string;
    model: ModelType;
    priority: PriorityLevel;
}
interface ResourceMetrics {
    activeAgents: number;
    queuedTasks: number;
    memoryUsageMB: number;
    cpuPercent: number;
    completedTasks: number;
    failedTasks: number;
}
interface OrchestratorConfig {
    maxConcurrentAgents: number;
    maxQueueSize: number;
    memoryLimitMB: number;
    taskTimeoutMs: number;
    retryAttempts: number;
    retryDelayMs: number;
    cleanupIntervalMs: number;
    enableStreaming: boolean;
    maxDepth: number;
    defaultMaxSubTasks: number;
    autoSpawnSubtasks: boolean;
    dynamicComplexityThreshold: boolean;
}
declare class DependencyGraph {
    private nodes;
    private inDegree;
    /**
     * Aggiunge un task al grafo
     */
    addTask(task: AgentTask): void;
    /**
     * Rimuove un task dal grafo (cleanup)
     */
    removeTask(taskId: string): void;
    /**
     * Restituisce i task pronti per l'esecuzione (nessuna dipendenza pendente)
     */
    getReadyTasks(): AgentTask[];
    /**
     * Marca un task come completato e aggiorna i dipendenti
     */
    markCompleted(taskId: string): string[];
    /**
     * Verifica se ci sono cicli nel grafo (deadlock detection)
     */
    hasCycle(): boolean;
    /**
     * Restituisce statistiche del grafo
     */
    getStats(): {
        total: number;
        pending: number;
        running: number;
        completed: number;
        failed: number;
    };
    /**
     * Restituisce tutti i task
     */
    getAllTasks(): AgentTask[];
    /**
     * Restituisce un task specifico
     */
    getTask(taskId: string): AgentTask | undefined;
}
declare class ResourceGovernor {
    private config;
    private activeAgents;
    private metrics;
    private cleanupInterval?;
    constructor(config: OrchestratorConfig);
    /**
     * Verifica se è possibile avviare un nuovo agent
     */
    canStartAgent(): boolean;
    /**
     * Registra l'avvio di un agent
     */
    registerAgentStart(taskId: string): void;
    /**
     * Registra la fine di un agent
     */
    registerAgentEnd(taskId: string, success: boolean): void;
    /**
     * Aggiorna metriche coda
     */
    updateQueueMetrics(queueSize: number): void;
    /**
     * Restituisce le metriche correnti
     */
    getMetrics(): ResourceMetrics;
    /**
     * Aggiorna metriche memoria
     */
    private updateMemoryMetrics;
    /**
     * Loop di cleanup periodico per liberare risorse
     */
    private startCleanupLoop;
    /**
     * Esegue cleanup risorse
     */
    private performCleanup;
    /**
     * Ferma il governor
     */
    stop(): void;
}
interface TaskEvent {
    type: 'TASK_READY' | 'TASK_STARTED' | 'TASK_COMPLETED' | 'TASK_FAILED' | 'SPAWN_SUBTASKS';
    taskId: string;
    timestamp: number;
    payload?: any;
}
declare class MessageQueue extends EventEmitter {
    private queue;
    private processing;
    private maxQueueSize;
    constructor(maxQueueSize?: number);
    /**
     * Pubblica un evento nella coda
     */
    publish(event: TaskEvent): void;
    /**
     * Pubblica evento TASK_READY
     */
    taskReady(taskId: string): void;
    /**
     * Pubblica evento TASK_STARTED
     */
    taskStarted(taskId: string): void;
    /**
     * Pubblica evento TASK_COMPLETED con risultato
     */
    taskCompleted(taskId: string, result: TaskResult): void;
    /**
     * Pubblica evento TASK_FAILED
     */
    taskFailed(taskId: string, error: string): void;
    /**
     * Pubblica evento SPAWN_SUBTASKS
     */
    spawnSubtasks(parentTaskId: string, subtasks: AgentTask[]): void;
    /**
     * Restituisce gli ultimi N eventi
     */
    getRecentEvents(count?: number): TaskEvent[];
    /**
     * Pulisce la coda
     */
    clear(): void;
}
declare class AgentExecutor {
    private config;
    constructor(config: OrchestratorConfig);
    /**
     * Esegue un task con retry logic
     */
    execute(task: AgentTask): Promise<TaskResult>;
    /**
     * Esegue un singolo tentativo
     */
    private executeOnce;
    /**
     * Invoca l'agent reale tramite Task tool
     * NOTA: Questa è l'integrazione con Claude Code Task tool
     */
    private invokeAgent;
    /**
     * Costruisce il prompt per l'agent
     */
    private buildAgentPrompt;
    /**
     * Calcola il costo in base al modello e tokens
     */
    private calculateCost;
    /**
     * Sleep utility
     */
    private sleep;
}
export declare class OrchestratorHub extends EventEmitter {
    private config;
    private graph;
    private governor;
    private messageQueue;
    private executor;
    private taskCounter;
    private sessionId;
    private isRunning;
    private results;
    constructor(config?: Partial<OrchestratorConfig>);
    /**
     * Configura gli event handlers
     */
    private setupEventHandlers;
    /**
     * Genera ID sessione
     */
    private generateSessionId;
    /**
     * Genera ID task
     */
    private generateTaskId;
    /**
     * MAIN ENTRY POINT - Esegue orchestrazione completa
     */
    orchestrate(userRequest: string, options?: {
        preview?: boolean;
        maxParallel?: number;
    }): Promise<OrchestratorResult>;
    /**
     * Aggiunge un task singolo (per uso programmatico)
     */
    addTask(task: Omit<AgentTask, 'id' | 'dependents' | 'status' | 'createdAt'>): string;
    /**
     * Restituisce lo stato corrente
     */
    getStatus(): {
        sessionId: string;
        isRunning: boolean;
        graphStats: ReturnType<DependencyGraph['getStats']>;
        resourceMetrics: ResourceMetrics;
        recentEvents: TaskEvent[];
    };
    /**
     * Ferma l'orchestrazione
     */
    stop(): void;
    /**
     * Analizza la richiesta utente
     */
    private analyzeRequest;
    /**
     * Estrae keywords dalla richiesta
     */
    private extractKeywords;
    /**
     * Rileva i domini dalla keywords
     */
    private detectDomains;
    /**
     * Calcola complessità (0-1)
     */
    private calculateComplexity;
    /**
     * Genera task di livello 1
     */
    private generateL1Tasks;
    /**
     * Genera subtasks gerarchici
     */
    private generateHierarchicalSubtasks;
    /**
     * Genera subtasks per un parent
     */
    private generateSubtasksForParent;
    /**
     * Aggiunge il task documenter finale
     */
    private addDocumenterTask;
    /**
     * Calcola complessità di un task specifico
     */
    private calculateTaskComplexity;
    /**
     * Esegue tutti i task rispettando le dipendenze
     */
    private executeAll;
    /**
     * Esegue un task in modo asincrono (fire and forget)
     */
    private executeTaskAsync;
    /**
     * Handler per task completato
     */
    private handleTaskCompleted;
    /**
     * Handler per task fallito
     */
    private handleTaskFailed;
    /**
     * Handler per spawn subtasks
     */
    private handleSubtaskSpawn;
    /**
     * Mostra il piano di esecuzione
     */
    private displayExecutionPlan;
    /**
     * Costruisce il risultato finale
     */
    private buildResult;
    private getExpertFileForDomain;
    private getModelForExpert;
    private getPriorityForDomain;
    private getSpawnRulesForDomain;
    private sleep;
}
interface OrchestratorResult {
    sessionId: string;
    status: 'preview' | 'completed' | 'failed';
    stats: ReturnType<DependencyGraph['getStats']>;
    metrics: ResourceMetrics;
    totalCost: number;
    totalDuration: number;
    totalTokens: number;
    tasks: Array<{
        id: string;
        level: number;
        status: TaskStatus;
        duration: number;
    }>;
    results: Record<string, TaskResult>;
}
export { DependencyGraph, ResourceGovernor, MessageQueue, AgentExecutor, OrchestratorConfig, AgentTask, TaskResult, OrchestratorResult };
//# sourceMappingURL=orchestrator-v3-core.d.ts.map