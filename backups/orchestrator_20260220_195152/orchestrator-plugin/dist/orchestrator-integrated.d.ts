/**
 * SUPER ORCHESTRATOR v3.3 - INTEGRATED SYSTEM
 * =============================================
 * Sistema completo integrato con:
 * - N-Level Parallel Executor
 * - Real-Time Dashboard
 * - Communication Hub
 * - Resource Governor
 * - Smart Model Selection
 * - Auto Documentation
 * - Agent Discovery & Registry
 *
 * REGOLE FONDAMENTALI:
 * 1. Orchestrator: SEMPRE Opus
 * 2. Altri task: Modello assegnato in base a complessità
 * 3. Task ripetitivi/loop: Haiku
 * 4. Documentazione automatica post-task
 * 5. Verifica agent esistenza + fallback automatico
 *
 * @version 3.3.0-INTEGRATED
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import { DiscoveryResult, AgentInfo } from './agent-discovery';
type ModelType = 'haiku' | 'sonnet' | 'opus';
type PriorityLevel = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
interface ExecutorConfig {
    maxConcurrent: number;
    maxDepth: number;
    maxTotalTasks: number;
    taskTimeoutMs: number;
    memoryLimitMB: number;
    refreshRateMs: number;
    enableDashboard: boolean;
    simulateExecution: boolean;
    simulationDelayMs: {
        min: number;
        max: number;
    };
    enableAutoDocumentation: boolean;
    documentationOutputDir: string;
    generateSessionReport: boolean;
    enableSmartModelSelection: boolean;
    orchestratorModel: ModelType;
    enableAgentDiscovery: boolean;
    autoFallbackOnMissing: boolean;
    showMissingAgentWarnings: boolean;
}
interface LevelStats {
    level: number;
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    progress: number;
    avgDuration: number;
    totalCost: number;
}
interface GlobalStats {
    totalTasks: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
    progress: number;
    elapsedMs: number;
    estimatedRemainingMs: number;
    totalCost: number;
    maxParallelism: number;
    currentParallelism: number;
    speedupFactor: number;
    levelsCount: number;
    avgTaskDuration: number;
}
export declare class IntegratedOrchestrator extends EventEmitter {
    private config;
    private tasks;
    private readyQueue;
    private runningTasks;
    private taskCounter;
    private isRunning;
    private startTime;
    private maxHistoricalParallelism;
    private dashboardInterval?;
    private lastDashboardOutput;
    constructor(config?: Partial<ExecutorConfig>);
    /**
     * Inizializza Agent Discovery
     */
    private initializeAgentDiscovery;
    /**
     * Valida e risolvi agent file
     * Ritorna l'agent validato o un fallback se non trovato
     */
    private resolveAgentFile;
    /**
     * Crea e aggiunge un task root (L0)
     */
    addRootTask(config: {
        description: string;
        agentExpertFile: string;
        model?: ModelType;
        priority?: PriorityLevel;
        canSpawnChildren?: boolean;
        maxChildren?: number;
    }): string;
    /**
     * Crea e aggiunge un subtask
     */
    addSubTask(parentId: string, config: {
        description: string;
        agentExpertFile: string;
        model?: ModelType;
        priority?: PriorityLevel;
        additionalDependencies?: string[];
        canSpawnChildren?: boolean;
        maxChildren?: number;
    }): string | null;
    /**
     * Aggiunge task con dipendenze custom
     */
    addTaskWithDependencies(config: {
        description: string;
        agentExpertFile: string;
        model?: ModelType;
        dependsOn: string[];
        priority?: PriorityLevel;
    }): string;
    /**
     * Esegue tutti i task con massimo parallelismo
     */
    execute(): Promise<GlobalStats>;
    /**
     * Genera e mostra il report di sessione
     */
    private generateAndShowSessionReport;
    /**
     * Mostra summary dell'Agent Discovery
     */
    private displayAgentDiscoverySummary;
    /**
     * Ottieni report completo dell'Agent Discovery
     */
    getAgentDiscoveryReport(): string;
    /**
     * Ottieni tutti gli agent disponibili
     */
    getAvailableAgents(): AgentInfo[];
    /**
     * Cerca agent per task description
     */
    findAgentForTask(description: string): DiscoveryResult;
    /**
     * Ferma l'esecuzione
     */
    stop(): void;
    /**
     * Verifica se l'esecuzione è completa
     */
    private isComplete;
    /**
     * Ottieni task pronti per l'esecuzione (max = spazio disponibile)
     */
    private getReadyTasks;
    /**
     * Esegue un task in modo asincrono
     */
    private executeTaskAsync;
    /**
     * Documenta un task completato
     */
    private documentCompletedTask;
    /**
     * Invoca l'agent
     */
    private invokeAgent;
    /**
     * Genera subtasks mock
     */
    private generateMockSubtasks;
    /**
     * Spawn subtasks dinamicamente
     */
    private spawnDynamicSubtasks;
    /**
     * Sblocca i task dipendenti
     */
    private unlockDependents;
    /**
     * Calcola il costo
     */
    private calculateCost;
    /**
     * Statistiche globali
     */
    getGlobalStats(): GlobalStats;
    /**
     * Statistiche per livello
     */
    getLevelStats(): LevelStats[];
    /**
     * Avvia dashboard real-time
     */
    private startDashboard;
    /**
     * Ferma dashboard
     */
    private stopDashboard;
    /**
     * Aggiorna dashboard
     */
    private updateDashboard;
    /**
     * Render dashboard
     */
    private renderDashboard;
    /**
     * Mini progress bar
     */
    private renderMiniBar;
    /**
     * Formatta durata
     */
    private formatDuration;
    /**
     * Mostra stato iniziale
     */
    private displayInitialState;
    /**
     * Mostra report finale
     */
    private displayFinalReport;
    private sleep;
}
export declare function runStressTest(config?: {
    rootTasks?: number;
    maxDepth?: number;
    maxConcurrent?: number;
    spawnProbability?: number;
}): Promise<GlobalStats>;
export {};
//# sourceMappingURL=orchestrator-integrated.d.ts.map