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

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

type ModelType = 'haiku' | 'sonnet' | 'opus';
type TaskStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed';

interface NLevelTask {
    id: string;
    path: string;                    // Gerarchia: "T1.2.3.4" (N livelli)
    depth: number;                   // Profondità: 0, 1, 2, ... N
    description: string;
    agentExpertFile: string;
    model: ModelType;
    priority: number;                // 0 = max priority

    // Gerarchia
    parentId: string | null;
    childIds: string[];
    rootId: string;

    // Dipendenze
    dependsOn: string[];             // Task che DEVE aspettare
    blockedBy: Set<string>;          // Dipendenze NON ancora completate
    unlocks: string[];               // Task che SBLOCCA al completamento

    // Stato
    status: TaskStatus;
    result?: any;
    error?: string;
    startTime?: number;
    endTime?: number;

    // Spawning
    canSpawnChildren: boolean;
    maxChildren: number;
    complexityScore: number;
}

interface ExecutorConfig {
    maxConcurrent: number;           // Max task simultanei (default: 64)
    maxDepth: number;                // Max profondità (default: 10)
    maxTotalTasks: number;           // Max task totali (default: 1000)
    timeoutMs: number;               // Timeout singolo task
    memoryLimitMB: number;           // Limite RAM
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

// =============================================================================
// N-LEVEL TASK GRAPH
// =============================================================================

class NLevelTaskGraph {
    private tasks: Map<string, NLevelTask> = new Map();
    private readyQueue: string[] = [];
    private taskCounter: number = 0;

    /**
     * Aggiunge un task al grafo
     */
    addTask(task: NLevelTask): void {
        // Inizializza blockedBy dalle dipendenze
        task.blockedBy = new Set(task.dependsOn.filter(depId => {
            const depTask = this.tasks.get(depId);
            return !depTask || depTask.status !== 'completed';
        }));

        this.tasks.set(task.id, task);

        // Registra questo task come "unlocks" nei suoi prerequisiti
        for (const depId of task.dependsOn) {
            const depTask = this.tasks.get(depId);
            if (depTask && !depTask.unlocks.includes(task.id)) {
                depTask.unlocks.push(task.id);
            }
        }

        // Se non ha dipendenze pendenti, è pronto
        if (task.blockedBy.size === 0) {
            task.status = 'ready';
            this.readyQueue.push(task.id);
        }
    }

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
    }): NLevelTask {
        this.taskCounter++;

        const parent = config.parentId ? this.tasks.get(config.parentId) : null;
        const depth = parent ? parent.depth + 1 : 0;
        const path = parent ? `${parent.path}.${this.taskCounter}` : `T${this.taskCounter}`;
        const rootId = parent ? parent.rootId : path;

        const task: NLevelTask = {
            id: `task_${this.taskCounter}`,
            path,
            depth,
            description: config.description,
            agentExpertFile: config.agentExpertFile,
            model: config.model,
            priority: config.priority ?? depth, // Profondità = priorità default

            parentId: config.parentId || null,
            childIds: [],
            rootId,

            dependsOn: config.dependsOn || (config.parentId ? [config.parentId] : []),
            blockedBy: new Set(),
            unlocks: [],

            status: 'pending',

            canSpawnChildren: config.canSpawnChildren ?? true,
            maxChildren: config.maxChildren ?? 5,
            complexityScore: 0.5
        };

        // Registra come figlio nel parent
        if (parent) {
            parent.childIds.push(task.id);
        }

        return task;
    }

    /**
     * Marca un task come completato e sblocca i dipendenti
     * RITORNA: lista di task appena sbloccati (pronti per esecuzione immediata)
     */
    markCompleted(taskId: string, result?: any): string[] {
        const task = this.tasks.get(taskId);
        if (!task) return [];

        task.status = 'completed';
        task.result = result;
        task.endTime = Date.now();

        // Sblocca tutti i task che dipendono da questo
        const newlyReady: string[] = [];

        for (const unlockedId of task.unlocks) {
            const unlockedTask = this.tasks.get(unlockedId);
            if (unlockedTask && unlockedTask.status === 'pending') {
                unlockedTask.blockedBy.delete(taskId);

                // Se non ha più blocchi, è pronto!
                if (unlockedTask.blockedBy.size === 0) {
                    unlockedTask.status = 'ready';
                    this.readyQueue.push(unlockedId);
                    newlyReady.push(unlockedId);
                }
            }
        }

        return newlyReady;
    }

    /**
     * Marca un task come fallito
     */
    markFailed(taskId: string, error: string): void {
        const task = this.tasks.get(taskId);
        if (task) {
            task.status = 'failed';
            task.error = error;
            task.endTime = Date.now();
        }
    }

    /**
     * Estrae i task pronti per l'esecuzione (ordinati per priorità)
     */
    getReadyTasks(maxCount: number = 100): NLevelTask[] {
        const ready: NLevelTask[] = [];

        // Svuota la coda e raccogli i task pronti
        while (this.readyQueue.length > 0 && ready.length < maxCount) {
            const taskId = this.readyQueue.shift()!;
            const task = this.tasks.get(taskId);

            if (task && task.status === 'ready') {
                ready.push(task);
            }
        }

        // Ordina per priorità (0 = max)
        return ready.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Restituisce statistiche
     */
    getStats(): ExecutionStats {
        let completed = 0, failed = 0, running = 0, pending = 0;
        let maxDepth = 0;
        let totalDuration = 0;
        let completedCount = 0;

        for (const task of this.tasks.values()) {
            maxDepth = Math.max(maxDepth, task.depth);

            switch (task.status) {
                case 'completed':
                    completed++;
                    if (task.startTime && task.endTime) {
                        totalDuration += task.endTime - task.startTime;
                        completedCount++;
                    }
                    break;
                case 'failed': failed++; break;
                case 'running': running++; break;
                default: pending++; break;
            }
        }

        return {
            totalTasks: this.tasks.size,
            completed,
            failed,
            running,
            pending,
            maxDepthReached: maxDepth,
            avgTaskDuration: completedCount > 0 ? totalDuration / completedCount : 0,
            parallelismEfficiency: this.tasks.size > 0 ? (completed + running) / this.tasks.size : 0
        };
    }

    /**
     * Verifica se l'esecuzione è completata
     */
    isComplete(): boolean {
        const stats = this.getStats();
        return stats.pending === 0 && stats.running === 0;
    }

    /**
     * Restituisce tutti i task
     */
    getAllTasks(): NLevelTask[] {
        return Array.from(this.tasks.values());
    }

    /**
     * Restituisce un task specifico
     */
    getTask(taskId: string): NLevelTask | undefined {
        return this.tasks.get(taskId);
    }

    /**
     * Restituisce i figli di un task
     */
    getChildren(taskId: string): NLevelTask[] {
        const task = this.tasks.get(taskId);
        if (!task) return [];

        return task.childIds
            .map(id => this.tasks.get(id))
            .filter((t): t is NLevelTask => t !== undefined);
    }

    /**
     * Restituisce l'albero gerarchico
     */
    getHierarchy(): Map<string, NLevelTask[]> {
        const hierarchy = new Map<string, NLevelTask[]>();

        for (const task of this.tasks.values()) {
            const parentId = task.parentId || 'root';
            if (!hierarchy.has(parentId)) {
                hierarchy.set(parentId, []);
            }
            hierarchy.get(parentId)!.push(task);
        }

        return hierarchy;
    }
}

// =============================================================================
// N-LEVEL PARALLEL EXECUTOR
// =============================================================================

export class NLevelParallelExecutor extends EventEmitter {
    private config: ExecutorConfig;
    private graph: NLevelTaskGraph;
    private runningTasks: Set<string> = new Set();
    private isExecuting: boolean = false;
    private startTime: number = 0;

    constructor(config?: Partial<ExecutorConfig>) {
        super();

        this.config = {
            maxConcurrent: config?.maxConcurrent ?? 64,
            maxDepth: config?.maxDepth ?? 10,
            maxTotalTasks: config?.maxTotalTasks ?? 1000,
            timeoutMs: config?.timeoutMs ?? 300000,
            memoryLimitMB: config?.memoryLimitMB ?? 512
        };

        this.graph = new NLevelTaskGraph();
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

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
    }): string {
        const task = this.graph.createTask({
            ...config,
            dependsOn: []
        });

        this.graph.addTask(task);
        return task.id;
    }

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
    }): string {
        const task = this.graph.createTask({
            parentId,
            ...config,
            dependsOn: [parentId, ...(config.additionalDependencies || [])]
        });

        this.graph.addTask(task);
        return task.id;
    }

    /**
     * Aggiunge un task con dipendenze custom (non gerarchiche)
     */
    addTaskWithDependencies(config: {
        description: string;
        agentExpertFile: string;
        model: ModelType;
        dependsOn: string[];
        priority?: number;
    }): string {
        const task = this.graph.createTask({
            ...config,
            canSpawnChildren: false
        });

        this.graph.addTask(task);
        return task.id;
    }

    /**
     * ESECUZIONE PARALLELA MASSIVA
     * Tutti i task indipendenti partono SIMULTANEAMENTE
     */
    async execute(): Promise<ExecutionStats> {
        this.isExecuting = true;
        this.startTime = Date.now();

        console.log('\n' + '⚡'.repeat(30));
        console.log('🚀 N-LEVEL PARALLEL EXECUTOR - MAXIMUM PARALLELISM');
        console.log('⚡'.repeat(30));

        this.displayTaskTree();

        console.log('\n🔥 STARTING SIMULTANEOUS EXECUTION...\n');

        // Loop principale di esecuzione
        while (this.isExecuting && !this.graph.isComplete()) {
            // Ottieni TUTTI i task pronti
            const readyTasks = this.graph.getReadyTasks(
                this.config.maxConcurrent - this.runningTasks.size
            );

            if (readyTasks.length > 0) {
                console.log(`\n🚀 LAUNCHING ${readyTasks.length} TASKS SIMULTANEOUSLY:`);
                readyTasks.forEach(t => console.log(`   ├─ [${t.path}] ${t.description.slice(0, 40)}...`));

                // Lancia TUTTI in parallelo (fire & forget)
                for (const task of readyTasks) {
                    this.executeTaskAsync(task);
                }
            }

            // Piccola pausa per permettere agli eventi di propagarsi
            await this.sleep(10);
        }

        this.isExecuting = false;

        const finalStats = this.graph.getStats();
        this.displayFinalReport(finalStats);

        return finalStats;
    }

    /**
     * Ferma l'esecuzione
     */
    stop(): void {
        this.isExecuting = false;
        this.emit('stopped');
    }

    /**
     * Restituisce lo stato corrente
     */
    getStatus(): ExecutionStats & { isExecuting: boolean; elapsedMs: number } {
        return {
            ...this.graph.getStats(),
            isExecuting: this.isExecuting,
            elapsedMs: this.startTime ? Date.now() - this.startTime : 0
        };
    }

    // =========================================================================
    // EXECUTION ENGINE
    // =========================================================================

    /**
     * Esegue un task in modo asincrono
     */
    private async executeTaskAsync(task: NLevelTask): Promise<void> {
        task.status = 'running';
        task.startTime = Date.now();
        this.runningTasks.add(task.id);

        this.emit('taskStarted', { taskId: task.id, path: task.path });

        try {
            // Esegui il task (simulato per ora)
            const result = await this.invokeAgent(task);

            // Marca come completato
            const newlyReady = this.graph.markCompleted(task.id, result);

            this.runningTasks.delete(task.id);
            this.emit('taskCompleted', {
                taskId: task.id,
                path: task.path,
                result,
                unlockedTasks: newlyReady
            });

            console.log(`   ✅ [${task.path}] DONE → Unlocked: ${newlyReady.length > 0 ? newlyReady.map(id => this.graph.getTask(id)?.path).join(', ') : 'none'}`);

            // Genera subtasks se necessario
            if (task.canSpawnChildren && result.suggestedSubtasks) {
                await this.spawnDynamicSubtasks(task, result.suggestedSubtasks);
            }

        } catch (error) {
            this.graph.markFailed(task.id, (error as Error).message);
            this.runningTasks.delete(task.id);

            this.emit('taskFailed', {
                taskId: task.id,
                path: task.path,
                error: (error as Error).message
            });

            console.log(`   ❌ [${task.path}] FAILED: ${(error as Error).message}`);
        }
    }

    /**
     * Invoca l'agent (da sostituire con Task tool reale)
     */
    private async invokeAgent(task: NLevelTask): Promise<any> {
        // Simula latenza di esecuzione
        const duration = 50 + Math.random() * 150;
        await this.sleep(duration);

        // Simula generazione subtasks per task complessi
        const suggestedSubtasks = task.canSpawnChildren && task.depth < this.config.maxDepth && Math.random() > 0.7
            ? this.generateMockSubtasks(task)
            : undefined;

        return {
            status: 'success',
            output: `Result of ${task.path}`,
            duration,
            suggestedSubtasks
        };
    }

    /**
     * Genera subtasks mock (da sostituire con logica reale)
     */
    private generateMockSubtasks(parent: NLevelTask): any[] {
        const count = Math.min(parent.maxChildren, 1 + Math.floor(Math.random() * 3));
        const subtasks = [];

        for (let i = 0; i < count; i++) {
            subtasks.push({
                description: `Subtask ${i + 1} of ${parent.path}`,
                agentExpertFile: parent.agentExpertFile,
                model: parent.depth < 3 ? 'sonnet' : 'haiku'
            });
        }

        return subtasks;
    }

    /**
     * Spawna subtasks dinamicamente durante l'esecuzione
     */
    private async spawnDynamicSubtasks(parent: NLevelTask, subtaskConfigs: any[]): Promise<void> {
        if (parent.depth >= this.config.maxDepth) {
            console.log(`   ⚠️ [${parent.path}] Max depth reached, skipping subtask spawn`);
            return;
        }

        console.log(`   🔄 [${parent.path}] Spawning ${subtaskConfigs.length} dynamic subtasks...`);

        for (const config of subtaskConfigs) {
            const subtaskId = this.addSubTask(parent.id, {
                description: config.description,
                agentExpertFile: config.agentExpertFile,
                model: config.model,
                canSpawnChildren: parent.depth + 1 < this.config.maxDepth - 1,
                maxChildren: Math.max(1, parent.maxChildren - 1)
            });

            const subtask = this.graph.getTask(subtaskId);
            if (subtask) {
                console.log(`      └─ Created [${subtask.path}]`);
            }
        }
    }

    // =========================================================================
    // DISPLAY
    // =========================================================================

    /**
     * Mostra l'albero dei task
     */
    private displayTaskTree(): void {
        console.log('\n📋 TASK HIERARCHY:');
        console.log('─'.repeat(60));

        const hierarchy = this.graph.getHierarchy();
        const rootTasks = hierarchy.get('root') || [];

        const printTask = (task: NLevelTask, indent: string = ''): void => {
            const statusIcon = {
                'pending': '⏳',
                'ready': '🟢',
                'running': '🔄',
                'completed': '✅',
                'failed': '❌'
            }[task.status];

            console.log(`${indent}${statusIcon} [${task.path}] ${task.description.slice(0, 40)}... (${task.model})`);

            const children = this.graph.getChildren(task.id);
            for (let i = 0; i < children.length; i++) {
                const isLast = i === children.length - 1;
                const childIndent = indent + (isLast ? '   └─ ' : '   ├─ ');
                printTask(children[i], childIndent.slice(0, -3));
            }
        };

        for (const task of rootTasks) {
            printTask(task);
        }

        console.log('─'.repeat(60));
    }

    /**
     * Mostra il report finale
     */
    private displayFinalReport(stats: ExecutionStats): void {
        const elapsed = Date.now() - this.startTime;

        console.log('\n' + '═'.repeat(60));
        console.log('📊 EXECUTION COMPLETE - FINAL REPORT');
        console.log('═'.repeat(60));
        console.log(`├─ Total Tasks:       ${stats.totalTasks}`);
        console.log(`├─ Completed:         ${stats.completed} ✅`);
        console.log(`├─ Failed:            ${stats.failed} ❌`);
        console.log(`├─ Max Depth Reached: ${stats.maxDepthReached}`);
        console.log(`├─ Total Time:        ${elapsed}ms`);
        console.log(`├─ Avg Task Duration: ${Math.round(stats.avgTaskDuration)}ms`);
        console.log(`├─ Parallelism:       ${Math.round(stats.parallelismEfficiency * 100)}%`);
        console.log(`└─ Theoretical Sequential: ${Math.round(stats.avgTaskDuration * stats.totalTasks)}ms`);
        console.log(`   Speedup Factor:    ${((stats.avgTaskDuration * stats.totalTasks) / elapsed).toFixed(1)}x`);
        console.log('═'.repeat(60));
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// =============================================================================
// COMMUNICATION HUB - Per comunicazione Agent → Orchestrator
// =============================================================================

export class CommunicationHub extends EventEmitter {
    private messageLog: Array<{
        timestamp: number;
        from: string;
        type: string;
        payload: any;
    }> = [];

    /**
     * Agent invia risultato all'orchestrator
     */
    agentReport(taskId: string, report: {
        status: 'success' | 'partial' | 'failed';
        output: any;
        suggestedSubtasks?: any[];
        issues?: string[];
        recommendations?: string[];
    }): void {
        this.log(taskId, 'REPORT', report);
        this.emit('agentReport', { taskId, report });
    }

    /**
     * Agent richiede spawn di subtasks
     */
    requestSubtasks(taskId: string, subtasks: any[]): void {
        this.log(taskId, 'SPAWN_REQUEST', { subtasks });
        this.emit('spawnRequest', { taskId, subtasks });
    }

    /**
     * Agent richiede informazioni da altri agent
     */
    requestInfo(fromTaskId: string, targetTaskId: string, query: string): void {
        this.log(fromTaskId, 'INFO_REQUEST', { targetTaskId, query });
        this.emit('infoRequest', { fromTaskId, targetTaskId, query });
    }

    /**
     * Orchestrator invia comando a agent
     */
    orchestratorCommand(taskId: string, command: string, payload?: any): void {
        this.log('orchestrator', 'COMMAND', { taskId, command, payload });
        this.emit('command', { taskId, command, payload });
    }

    /**
     * Broadcast a tutti gli agent
     */
    broadcast(message: string, payload?: any): void {
        this.log('orchestrator', 'BROADCAST', { message, payload });
        this.emit('broadcast', { message, payload });
    }

    /**
     * Restituisce log messaggi recenti
     */
    getMessageLog(count: number = 100): typeof this.messageLog {
        return this.messageLog.slice(-count);
    }

    /**
     * Log interno
     */
    private log(from: string, type: string, payload: any): void {
        this.messageLog.push({
            timestamp: Date.now(),
            from,
            type,
            payload
        });

        // Limita dimensione log
        if (this.messageLog.length > 10000) {
            this.messageLog = this.messageLog.slice(-5000);
        }
    }
}

// =============================================================================
// EXPORT
// =============================================================================

export {
    NLevelTaskGraph,
    NLevelTask,
    ExecutorConfig,
    ExecutionStats
};

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/*
const executor = new NLevelParallelExecutor({
    maxConcurrent: 64,
    maxDepth: 10
});

// Aggiungi task L1
const t1 = executor.addRootTask({
    description: 'GUI Development',
    agentExpertFile: 'experts/gui-super-expert.md',
    model: 'sonnet'
});

const t2 = executor.addRootTask({
    description: 'Database Development',
    agentExpertFile: 'experts/database_expert.md',
    model: 'sonnet'
});

// Aggiungi subtasks L2
const t1_1 = executor.addSubTask(t1, {
    description: 'Main Window Layout',
    agentExpertFile: 'experts/gui-super-expert.md',
    model: 'sonnet'
});

const t1_2 = executor.addSubTask(t1, {
    description: 'Widget Components',
    agentExpertFile: 'experts/gui-super-expert.md',
    model: 'haiku'
});

// Aggiungi subtasks L3
executor.addSubTask(t1_1, {
    description: 'Menu Bar',
    agentExpertFile: 'experts/gui-super-expert.md',
    model: 'haiku'
});

executor.addSubTask(t1_1, {
    description: 'Toolbar',
    agentExpertFile: 'experts/gui-super-expert.md',
    model: 'haiku'
});

// Task con dipendenze cross-branch
executor.addTaskWithDependencies({
    description: 'Integration Testing',
    agentExpertFile: 'experts/tester_expert.md',
    model: 'sonnet',
    dependsOn: [t1, t2] // Aspetta sia GUI che DB
});

// Esegui!
const stats = await executor.execute();
console.log('Final stats:', stats);
*/
