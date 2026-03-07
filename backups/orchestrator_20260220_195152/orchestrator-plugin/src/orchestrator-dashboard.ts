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

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

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
    progress: number;          // 0-100
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
    progress: number;          // 0-100
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
    globalProgress: number;    // 0-100
    elapsedTime: number;
    estimatedRemaining: number;
    totalCost: number;
    maxParallelism: number;
    currentParallelism: number;
    speedupFactor: number;
    levelsCount: number;
}

// =============================================================================
// ORCHESTRATOR DASHBOARD
// =============================================================================

export class OrchestratorDashboard extends EventEmitter {
    private tasks: Map<string, DashboardTask> = new Map();
    private startTime: number = 0;
    private updateInterval?: NodeJS.Timeout;
    private refreshRateMs: number;
    private lastDisplay: string = '';

    constructor(refreshRateMs: number = 500) {
        super();
        this.refreshRateMs = refreshRateMs;
    }

    // =========================================================================
    // TASK MANAGEMENT
    // =========================================================================

    /**
     * Registra un nuovo task
     */
    registerTask(task: DashboardTask): void {
        this.tasks.set(task.id, task);
        this.emit('taskRegistered', task);
    }

    /**
     * Aggiorna lo stato di un task
     */
    updateTask(taskId: string, updates: Partial<DashboardTask>): void {
        const task = this.tasks.get(taskId);
        if (task) {
            Object.assign(task, updates);

            // Calcola durata se completato
            if (updates.status === 'completed' && task.startTime) {
                task.endTime = Date.now();
                task.duration = task.endTime - task.startTime;
            }

            this.emit('taskUpdated', task);
        }
    }

    /**
     * Marca un task come avviato
     */
    taskStarted(taskId: string): void {
        this.updateTask(taskId, {
            status: 'running',
            startTime: Date.now(),
            progress: 10
        });
    }

    /**
     * Marca un task come completato
     */
    taskCompleted(taskId: string, cost: number = 0): void {
        this.updateTask(taskId, {
            status: 'completed',
            progress: 100,
            cost
        });
    }

    /**
     * Marca un task come fallito
     */
    taskFailed(taskId: string): void {
        this.updateTask(taskId, {
            status: 'failed',
            progress: 0
        });
    }

    /**
     * Aggiorna il progresso di un task
     */
    updateProgress(taskId: string, progress: number): void {
        this.updateTask(taskId, { progress: Math.min(100, Math.max(0, progress)) });
    }

    // =========================================================================
    // STATISTICS
    // =========================================================================

    /**
     * Calcola statistiche globali
     */
    getGlobalStats(): GlobalStats {
        let completed = 0, failed = 0, running = 0, pending = 0;
        let totalCost = 0;
        let totalDuration = 0;
        let completedCount = 0;
        let maxDepth = 0;

        for (const task of this.tasks.values()) {
            maxDepth = Math.max(maxDepth, task.depth);
            totalCost += task.cost;

            switch (task.status) {
                case 'completed':
                    completed++;
                    if (task.duration) {
                        totalDuration += task.duration;
                        completedCount++;
                    }
                    break;
                case 'failed': failed++; break;
                case 'running': running++; break;
                default: pending++; break;
            }
        }

        const total = this.tasks.size;
        const globalProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const avgDuration = completedCount > 0 ? totalDuration / completedCount : 0;
        const elapsed = this.startTime ? Date.now() - this.startTime : 0;
        const estimatedRemaining = running + pending > 0 && avgDuration > 0
            ? Math.round(((running + pending) * avgDuration) / Math.max(1, running))
            : 0;

        // Calcola speedup teorico
        const sequentialTime = total * avgDuration;
        const speedup = elapsed > 0 && sequentialTime > 0 ? sequentialTime / elapsed : 1;

        return {
            totalTasks: total,
            completedTasks: completed,
            failedTasks: failed,
            runningTasks: running,
            pendingTasks: pending,
            globalProgress,
            elapsedTime: elapsed,
            estimatedRemaining,
            totalCost,
            maxParallelism: Math.max(running, this.getMaxHistoricalParallelism()),
            currentParallelism: running,
            speedupFactor: speedup,
            levelsCount: maxDepth + 1
        };
    }

    /**
     * Calcola statistiche per livello
     */
    getLevelStats(): LevelStats[] {
        const levelMap = new Map<number, DashboardTask[]>();

        // Raggruppa per livello
        for (const task of this.tasks.values()) {
            if (!levelMap.has(task.depth)) {
                levelMap.set(task.depth, []);
            }
            levelMap.get(task.depth)!.push(task);
        }

        // Calcola stats per ogni livello
        const stats: LevelStats[] = [];

        for (const [level, tasks] of levelMap) {
            let pending = 0, running = 0, completed = 0, failed = 0;
            let totalDuration = 0, completedCount = 0, totalCost = 0;
            const activeAgents: string[] = [];

            for (const task of tasks) {
                totalCost += task.cost;

                switch (task.status) {
                    case 'completed':
                        completed++;
                        if (task.duration) {
                            totalDuration += task.duration;
                            completedCount++;
                        }
                        break;
                    case 'failed': failed++; break;
                    case 'running':
                        running++;
                        activeAgents.push(task.agent);
                        break;
                    default: pending++; break;
                }
            }

            const total = tasks.length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            stats.push({
                level,
                total,
                pending,
                running,
                completed,
                failed,
                progress,
                avgDuration: completedCount > 0 ? totalDuration / completedCount : 0,
                totalCost,
                activeAgents
            });
        }

        return stats.sort((a, b) => a.level - b.level);
    }

    /**
     * Max parallelismo storico (approssimato)
     */
    private maxHistoricalParallelism: number = 0;
    private getMaxHistoricalParallelism(): number {
        const current = Array.from(this.tasks.values()).filter(t => t.status === 'running').length;
        this.maxHistoricalParallelism = Math.max(this.maxHistoricalParallelism, current);
        return this.maxHistoricalParallelism;
    }

    // =========================================================================
    // DISPLAY - TABELLE E PROGRESS BAR
    // =========================================================================

    /**
     * Genera la visualizzazione completa della dashboard
     */
    render(): string {
        const globalStats = this.getGlobalStats();
        const levelStats = this.getLevelStats();

        let output = '';

        // Header
        output += this.renderHeader(globalStats);

        // Progress Bar Globale
        output += this.renderGlobalProgressBar(globalStats);

        // Statistiche Riepilogative
        output += this.renderSummaryStats(globalStats);

        // Tabella per Livello
        output += this.renderLevelTable(levelStats);

        // Tabella Task Dettagliata
        output += this.renderTaskTable();

        // Footer con metriche
        output += this.renderFooter(globalStats);

        return output;
    }

    /**
     * Header della dashboard
     */
    private renderHeader(stats: GlobalStats): string {
        const now = new Date().toLocaleTimeString();
        return `
╔══════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 ORCHESTRATOR DASHBOARD v3.1 - REAL TIME                     ║
║                              ${now}                                        ║
╠══════════════════════════════════════════════════════════════════════════════════╣
`;
    }

    /**
     * Barra di progresso globale
     */
    private renderGlobalProgressBar(stats: GlobalStats): string {
        const barWidth = 50;
        const filled = Math.round((stats.globalProgress / 100) * barWidth);
        const empty = barWidth - filled;

        const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
        const progressColor = stats.globalProgress === 100 ? '✅' :
                             stats.globalProgress >= 75 ? '🟢' :
                             stats.globalProgress >= 50 ? '🟡' :
                             stats.globalProgress >= 25 ? '🟠' : '🔴';

        return `
║  ${progressColor} GLOBAL PROGRESS                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────────┐   ║
║  │ ${progressBar} │ ${stats.globalProgress.toString().padStart(3)}%  ║
║  └──────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                  ║
`;
    }

    /**
     * Statistiche riepilogative
     */
    private renderSummaryStats(stats: GlobalStats): string {
        const elapsed = this.formatDuration(stats.elapsedTime);
        const remaining = this.formatDuration(stats.estimatedRemaining);

        return `
║  📊 SUMMARY                                                                      ║
║  ┌────────────────┬────────────────┬────────────────┬────────────────┐          ║
║  │ Total Tasks    │ Completed      │ Running        │ Pending        │          ║
║  │     ${stats.totalTasks.toString().padStart(5)}      │   ${stats.completedTasks.toString().padStart(5)} ✅     │   ${stats.runningTasks.toString().padStart(5)} 🔄     │   ${stats.pendingTasks.toString().padStart(5)} ⏳     │          ║
║  ├────────────────┼────────────────┼────────────────┼────────────────┤          ║
║  │ Failed         │ Levels         │ Parallelism    │ Speedup        │          ║
║  │   ${stats.failedTasks.toString().padStart(5)} ❌     │     ${stats.levelsCount.toString().padStart(5)}      │ ${stats.currentParallelism.toString().padStart(3)}/${stats.maxParallelism.toString().padStart(3)} 🚀     │   ${stats.speedupFactor.toFixed(1).padStart(5)}x     │          ║
║  ├────────────────┼────────────────┼────────────────┼────────────────┤          ║
║  │ Elapsed        │ Remaining      │ Cost           │ Efficiency     │          ║
║  │   ${elapsed.padStart(8)}   │   ${remaining.padStart(8)}   │  $${stats.totalCost.toFixed(3).padStart(7)}   │   ${Math.round(stats.speedupFactor / stats.maxParallelism * 100).toString().padStart(5)}%   │          ║
║  └────────────────┴────────────────┴────────────────┴────────────────┘          ║
║                                                                                  ║
`;
    }

    /**
     * Tabella statistiche per livello
     */
    private renderLevelTable(levelStats: LevelStats[]): string {
        let output = `
║  📈 LEVEL BREAKDOWN                                                              ║
║  ┌───────┬───────┬─────────┬─────────┬─────────┬─────────┬──────────────────┐   ║
║  │ Level │ Total │ Pending │ Running │  Done   │ Failed  │     Progress     │   ║
║  ├───────┼───────┼─────────┼─────────┼─────────┼─────────┼──────────────────┤   ║
`;

        for (const level of levelStats) {
            const miniBar = this.renderMiniProgressBar(level.progress, 12);
            output += `║  │  L${level.level.toString().padStart(2)}  │  ${level.total.toString().padStart(4)} │   ${level.pending.toString().padStart(4)}  │   ${level.running.toString().padStart(4)}  │   ${level.completed.toString().padStart(4)}  │   ${level.failed.toString().padStart(4)}  │ ${miniBar} ${level.progress.toString().padStart(3)}% │   ║
`;
        }

        output += `║  └───────┴───────┴─────────┴─────────┴─────────┴─────────┴──────────────────┘   ║
║                                                                                  ║
`;

        return output;
    }

    /**
     * Tabella dettagliata dei task
     */
    private renderTaskTable(): string {
        const tasks = Array.from(this.tasks.values())
            .sort((a, b) => {
                // Prima per profondità, poi per path
                if (a.depth !== b.depth) return a.depth - b.depth;
                return a.path.localeCompare(b.path);
            });

        let output = `
║  📋 TASK DETAILS (showing first 15)                                              ║
║  ┌──────────────┬───────────────────────────┬──────────────────┬────────┬──────┐║
║  │    Path      │        Description        │      Agent       │ Model  │Status│║
║  ├──────────────┼───────────────────────────┼──────────────────┼────────┼──────┤║
`;

        const displayTasks = tasks.slice(0, 15);

        for (const task of displayTasks) {
            const statusIcon = this.getStatusIcon(task.status);
            const desc = task.description.slice(0, 23).padEnd(23);
            const agent = task.agent.split('/').pop()?.slice(0, 14).padEnd(14) || 'N/A'.padEnd(14);
            const indent = '  '.repeat(Math.min(task.depth, 3));
            const path = (indent + task.path).slice(0, 12).padEnd(12);

            output += `║  │ ${path} │ ${desc}   │ ${agent}   │ ${task.model.padEnd(6)} │  ${statusIcon}  │║
`;
        }

        if (tasks.length > 15) {
            output += `║  │    ...     │ ... and ${(tasks.length - 15).toString().padStart(3)} more tasks ...  │      ...       │  ...   │  ... │║
`;
        }

        output += `║  └──────────────┴───────────────────────────┴──────────────────┴────────┴──────┘║
║                                                                                  ║
`;

        return output;
    }

    /**
     * Footer con metriche aggiuntive
     */
    private renderFooter(stats: GlobalStats): string {
        const runningTasks = Array.from(this.tasks.values())
            .filter(t => t.status === 'running')
            .map(t => t.path)
            .slice(0, 5)
            .join(', ');

        return `
║  🔄 CURRENTLY RUNNING: ${(runningTasks || 'None').slice(0, 55).padEnd(55)}  ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║  💡 Press Ctrl+C to stop | Auto-refresh: ${this.refreshRateMs}ms | Memory optimized       ║
╚══════════════════════════════════════════════════════════════════════════════════╝
`;
    }

    /**
     * Mini progress bar per tabella livelli
     */
    private renderMiniProgressBar(progress: number, width: number): string {
        const filled = Math.round((progress / 100) * width);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * Icona status
     */
    private getStatusIcon(status: TaskStatus): string {
        switch (status) {
            case 'completed': return '✅';
            case 'running': return '🔄';
            case 'failed': return '❌';
            case 'ready': return '🟢';
            default: return '⏳';
        }
    }

    /**
     * Formatta durata in formato leggibile
     */
    private formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
        return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
    }

    // =========================================================================
    // REAL-TIME UPDATES
    // =========================================================================

    /**
     * Avvia aggiornamenti real-time
     */
    startRealTimeUpdates(): void {
        this.startTime = Date.now();

        this.updateInterval = setInterval(() => {
            this.displayUpdate();
        }, this.refreshRateMs);
    }

    /**
     * Ferma aggiornamenti real-time
     */
    stopRealTimeUpdates(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
    }

    /**
     * Mostra aggiornamento (solo se cambiato)
     */
    private displayUpdate(): void {
        const display = this.render();

        // Mostra solo se cambiato
        if (display !== this.lastDisplay) {
            // Clear console e mostra nuovo output
            console.clear();
            console.log(display);
            this.lastDisplay = display;
        }
    }

    /**
     * Mostra snapshot singolo
     */
    display(): void {
        console.log(this.render());
    }

    // =========================================================================
    // EXPORT & REPORTING
    // =========================================================================

    /**
     * Esporta report in formato JSON
     */
    exportJSON(): string {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            globalStats: this.getGlobalStats(),
            levelStats: this.getLevelStats(),
            tasks: Array.from(this.tasks.values())
        }, null, 2);
    }

    /**
     * Esporta report in formato Markdown
     */
    exportMarkdown(): string {
        const stats = this.getGlobalStats();
        const levelStats = this.getLevelStats();

        let md = `# Orchestrator Execution Report

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | ${stats.totalTasks} |
| Completed | ${stats.completedTasks} |
| Failed | ${stats.failedTasks} |
| Total Time | ${this.formatDuration(stats.elapsedTime)} |
| Total Cost | $${stats.totalCost.toFixed(4)} |
| Max Parallelism | ${stats.maxParallelism} |
| Speedup Factor | ${stats.speedupFactor.toFixed(2)}x |

## Level Breakdown

| Level | Total | Completed | Failed | Progress |
|-------|-------|-----------|--------|----------|
`;

        for (const level of levelStats) {
            md += `| L${level.level} | ${level.total} | ${level.completed} | ${level.failed} | ${level.progress}% |\n`;
        }

        md += `
## Task Details

| Path | Description | Agent | Status | Duration |
|------|-------------|-------|--------|----------|
`;

        for (const task of this.tasks.values()) {
            md += `| ${task.path} | ${task.description.slice(0, 30)} | ${task.agent.split('/').pop()} | ${task.status} | ${task.duration ? this.formatDuration(task.duration) : '-'} |\n`;
        }

        return md;
    }

    /**
     * Genera report finale
     */
    generateFinalReport(): string {
        const stats = this.getGlobalStats();
        const levelStats = this.getLevelStats();

        return `
╔══════════════════════════════════════════════════════════════════════════════════╗
║                        🏁 ORCHESTRATOR - FINAL REPORT                            ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  ✅ EXECUTION COMPLETED                                                          ║
║                                                                                  ║
║  📊 RESULTS                                                                      ║
║  ├─ Total Tasks:      ${stats.totalTasks.toString().padStart(6)}                                                ║
║  ├─ Completed:        ${stats.completedTasks.toString().padStart(6)} ✅                                             ║
║  ├─ Failed:           ${stats.failedTasks.toString().padStart(6)} ❌                                             ║
║  ├─ Success Rate:     ${((stats.completedTasks / stats.totalTasks) * 100).toFixed(1).padStart(6)}%                                            ║
║                                                                                  ║
║  ⏱️  TIMING                                                                       ║
║  ├─ Total Time:       ${this.formatDuration(stats.elapsedTime).padStart(10)}                                          ║
║  ├─ Sequential Est:   ${this.formatDuration(stats.totalTasks * (stats.elapsedTime / stats.completedTasks)).padStart(10)}                                          ║
║  ├─ Speedup Factor:   ${stats.speedupFactor.toFixed(2).padStart(10)}x                                         ║
║                                                                                  ║
║  🚀 PARALLELISM                                                                  ║
║  ├─ Max Parallel:     ${stats.maxParallelism.toString().padStart(6)} agents                                        ║
║  ├─ Levels:           ${stats.levelsCount.toString().padStart(6)}                                                ║
║  ├─ Efficiency:       ${((stats.speedupFactor / stats.maxParallelism) * 100).toFixed(1).padStart(6)}%                                            ║
║                                                                                  ║
║  💰 COST                                                                         ║
║  ├─ Total Cost:       $${stats.totalCost.toFixed(4).padStart(8)}                                            ║
║  ├─ Cost per Task:    $${(stats.totalCost / stats.totalTasks).toFixed(6).padStart(10)}                                          ║
║                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// =============================================================================
// INTEGRATED EXECUTOR WITH DASHBOARD
// =============================================================================

export class OrchestratorWithDashboard {
    private dashboard: OrchestratorDashboard;
    private tasks: Map<string, any> = new Map();
    private isRunning: boolean = false;

    constructor(refreshRateMs: number = 500) {
        this.dashboard = new OrchestratorDashboard(refreshRateMs);
    }

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
    }): void {
        const task: DashboardTask = {
            id: config.id,
            path: config.path,
            depth: config.depth,
            description: config.description,
            agent: config.agent,
            model: config.model,
            status: 'pending',
            progress: 0,
            parentId: config.parentId,
            childIds: [],
            dependsOn: config.dependsOn || [],
            cost: 0
        };

        this.tasks.set(config.id, task);
        this.dashboard.registerTask(task);
    }

    /**
     * Esegue con dashboard real-time
     */
    async execute(): Promise<void> {
        this.isRunning = true;
        this.dashboard.startRealTimeUpdates();

        // Simula esecuzione
        const allTasks = Array.from(this.tasks.values());

        for (const task of allTasks) {
            if (!this.isRunning) break;

            // Simula avvio
            this.dashboard.taskStarted(task.id);

            // Simula esecuzione
            await this.sleep(100 + Math.random() * 200);

            // Simula completamento
            const cost = task.model === 'opus' ? 0.015 : task.model === 'sonnet' ? 0.003 : 0.0003;
            this.dashboard.taskCompleted(task.id, cost);
        }

        this.dashboard.stopRealTimeUpdates();
        console.log(this.dashboard.generateFinalReport());
    }

    /**
     * Ferma esecuzione
     */
    stop(): void {
        this.isRunning = false;
        this.dashboard.stopRealTimeUpdates();
    }

    /**
     * Ottieni dashboard per accesso diretto
     */
    getDashboard(): OrchestratorDashboard {
        return this.dashboard;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// =============================================================================
// EXPORT
// =============================================================================

export { DashboardTask, LevelStats, GlobalStats };
