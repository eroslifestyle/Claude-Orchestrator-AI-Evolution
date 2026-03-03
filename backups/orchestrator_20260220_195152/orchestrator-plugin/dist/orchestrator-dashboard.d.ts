/**
 * ORCHESTRATOR DASHBOARD v3.1
 * ============================
 * Sistema di visualizzazione real-time con:
 * - Tabelle riepilogative per livello
 * - Barra di progresso globale
 * - Status di ogni task/subtask
 * - Agent assegnati e parallelismo
 *
 * @version 3.1.0
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
type TaskStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed';
type ModelType = 'haiku' | 'sonnet' | 'opus';
interface DashboardTask {
    id: string;
    path: string;
    depth: number;
    description: string;
    agent: string;
    model: ModelType;
    status: TaskStatus;
    progress: number;
    startTime?: number;
    endTime?: number;
    duration?: number;
    parentId?: string;
    childIds: string[];
    dependsOn: string[];
    cost: number;
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
    activeAgents: string[];
}
interface GlobalStats {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    runningTasks: number;
    pendingTasks: number;
    globalProgress: number;
    elapsedTime: number;
    estimatedRemaining: number;
    totalCost: number;
    maxParallelism: number;
    currentParallelism: number;
    speedupFactor: number;
    levelsCount: number;
}
export declare class OrchestratorDashboard extends EventEmitter {
    private tasks;
    private startTime;
    private updateInterval?;
    private refreshRateMs;
    private lastDisplay;
    constructor(refreshRateMs?: number);
    /**
     * Registra un nuovo task
     */
    registerTask(task: DashboardTask): void;
    /**
     * Aggiorna lo stato di un task
     */
    updateTask(taskId: string, updates: Partial<DashboardTask>): void;
    /**
     * Marca un task come avviato
     */
    taskStarted(taskId: string): void;
    /**
     * Marca un task come completato
     */
    taskCompleted(taskId: string, cost?: number): void;
    /**
     * Marca un task come fallito
     */
    taskFailed(taskId: string): void;
    /**
     * Aggiorna il progresso di un task
     */
    updateProgress(taskId: string, progress: number): void;
    /**
     * Calcola statistiche globali
     */
    getGlobalStats(): GlobalStats;
    /**
     * Calcola statistiche per livello
     */
    getLevelStats(): LevelStats[];
    /**
     * Max parallelismo storico (approssimato)
     */
    private maxHistoricalParallelism;
    private getMaxHistoricalParallelism;
    /**
     * Genera la visualizzazione completa della dashboard
     */
    render(): string;
    /**
     * Header della dashboard
     */
    private renderHeader;
    /**
     * Barra di progresso globale
     */
    private renderGlobalProgressBar;
    /**
     * Statistiche riepilogative
     */
    private renderSummaryStats;
    /**
     * Tabella statistiche per livello
     */
    private renderLevelTable;
    /**
     * Tabella dettagliata dei task
     */
    private renderTaskTable;
    /**
     * Footer con metriche aggiuntive
     */
    private renderFooter;
    /**
     * Mini progress bar per tabella livelli
     */
    private renderMiniProgressBar;
    /**
     * Icona status
     */
    private getStatusIcon;
    /**
     * Formatta durata in formato leggibile
     */
    private formatDuration;
    /**
     * Avvia aggiornamenti real-time
     */
    startRealTimeUpdates(): void;
    /**
     * Ferma aggiornamenti real-time
     */
    stopRealTimeUpdates(): void;
    /**
     * Mostra aggiornamento (solo se cambiato)
     */
    private displayUpdate;
    /**
     * Mostra snapshot singolo
     */
    display(): void;
    /**
     * Esporta report in formato JSON
     */
    exportJSON(): string;
    /**
     * Esporta report in formato Markdown
     */
    exportMarkdown(): string;
    /**
     * Genera report finale
     */
    generateFinalReport(): string;
}
export declare class OrchestratorWithDashboard {
    private dashboard;
    private tasks;
    private isRunning;
    constructor(refreshRateMs?: number);
    /**
     * Registra un task
     */
    addTask(config: {
        id: string;
        path: string;
        depth: number;
        description: string;
        agent: string;
        model: ModelType;
        parentId?: string;
        dependsOn?: string[];
    }): void;
    /**
     * Esegue con dashboard real-time
     */
    execute(): Promise<void>;
    /**
     * Ferma esecuzione
     */
    stop(): void;
    /**
     * Ottieni dashboard per accesso diretto
     */
    getDashboard(): OrchestratorDashboard;
    private sleep;
}
export { DashboardTask, LevelStats, GlobalStats };
//# sourceMappingURL=orchestrator-dashboard.d.ts.map