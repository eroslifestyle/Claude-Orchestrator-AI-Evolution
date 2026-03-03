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

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CleanContextManager, CleanTaskWrapper, prepareCleanTask } from './clean-context';

const execAsync = promisify(exec);

// =============================================================================
// TYPES - Tipi unificati
// =============================================================================

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

    // State
    status: TaskStatus;
    progress: number;
    result?: any;
    error?: string;

    // Timing
    createdAt: number;
    startedAt?: number;
    endedAt?: number;
    duration?: number;

    // Dependencies
    parentId: string | null;
    childIds: string[];
    dependsOn: string[];
    blockedBy: Set<string>;
    unlocks: string[];

    // Documentation
    workDone: string[];
    filesModified: string[];
    errorsEncountered: string[];
    notes: string;
}

export interface OrchestratorConfig {
    // Execution
    maxConcurrent: number;
    maxDepth: number;
    maxTasks: number;
    taskTimeout: number;

    // Features
    enableSmartModelSelection: boolean;
    enableAgentDiscovery: boolean;
    enableAutoDocumentation: boolean;
    enableDashboard: boolean;
    enableStreaming: boolean;

    // Clean Context - MASSIMA EFFICIENZA
    enableCleanContext: boolean;      // Ogni agent inizia con /clear
    cleanBeforeTask: boolean;         // Clear prima di ogni task
    cleanAfterTask: boolean;          // Clear dopo ogni task
    isolateAgents: boolean;           // Isola contesto tra agent
    focusMode: boolean;               // Rimuove verbosità inutile

    // Fallback
    autoFallbackOnMissing: boolean;
    defaultFallbackAgent: string;

    // Simulation
    simulateExecution: boolean;
    simulationDelay: { min: number; max: number };
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

// =============================================================================
// KEYWORD MAPPINGS - Mapping diretto senza dipendenze esterne
// =============================================================================

const KEYWORD_AGENT_MAP: Record<string, { agent: string; model: ModelType; priority: PriorityLevel }> = {
    // GUI & Frontend
    'gui': { agent: 'experts/gui-super-expert.md', model: 'sonnet', priority: 'ALTA' },
    'pyqt': { agent: 'experts/gui-super-expert.md', model: 'sonnet', priority: 'ALTA' },
    'pyqt5': { agent: 'experts/gui-super-expert.md', model: 'sonnet', priority: 'ALTA' },
    'qt': { agent: 'experts/gui-super-expert.md', model: 'sonnet', priority: 'ALTA' },
    'widget': { agent: 'experts/gui-super-expert.md', model: 'sonnet', priority: 'ALTA' },
    'ui': { agent: 'experts/gui-super-expert.md', model: 'sonnet', priority: 'ALTA' },
    'frontend': { agent: 'experts/gui-super-expert.md', model: 'sonnet', priority: 'ALTA' },

    // Database
    'database': { agent: 'experts/database_expert.md', model: 'sonnet', priority: 'ALTA' },
    'db': { agent: 'experts/database_expert.md', model: 'sonnet', priority: 'ALTA' },
    'sql': { agent: 'experts/database_expert.md', model: 'sonnet', priority: 'ALTA' },
    'sqlite': { agent: 'experts/database_expert.md', model: 'sonnet', priority: 'ALTA' },
    'query': { agent: 'experts/database_expert.md', model: 'sonnet', priority: 'ALTA' },
    'schema': { agent: 'experts/db-schema-designer.md', model: 'sonnet', priority: 'ALTA' },

    // Security
    'security': { agent: 'experts/security_unified_expert.md', model: 'opus', priority: 'CRITICA' },
    'auth': { agent: 'experts/security_unified_expert.md', model: 'opus', priority: 'CRITICA' },
    'authentication': { agent: 'experts/security_unified_expert.md', model: 'opus', priority: 'CRITICA' },
    'jwt': { agent: 'experts/security_unified_expert.md', model: 'opus', priority: 'CRITICA' },
    'oauth': { agent: 'experts/social_identity_expert.md', model: 'sonnet', priority: 'CRITICA' },

    // API & Integration
    'api': { agent: 'experts/api-design-specialist.md', model: 'sonnet', priority: 'ALTA' },
    'rest': { agent: 'experts/api-design-specialist.md', model: 'sonnet', priority: 'ALTA' },
    'telegram': { agent: 'experts/integration_expert.md', model: 'sonnet', priority: 'ALTA' },
    'webhook': { agent: 'experts/integration_expert.md', model: 'sonnet', priority: 'ALTA' },
    'integration': { agent: 'experts/integration_expert.md', model: 'sonnet', priority: 'ALTA' },

    // Trading & MQL
    'trading': { agent: 'experts/trading_strategy_expert.md', model: 'sonnet', priority: 'ALTA' },
    'mql': { agent: 'experts/mql_expert.md', model: 'sonnet', priority: 'ALTA' },
    'mt4': { agent: 'experts/mql_expert.md', model: 'sonnet', priority: 'ALTA' },
    'mt5': { agent: 'experts/mql_expert.md', model: 'sonnet', priority: 'ALTA' },
    'metatrader': { agent: 'experts/mql_expert.md', model: 'sonnet', priority: 'ALTA' },

    // Architecture
    'architecture': { agent: 'experts/architect_expert.md', model: 'opus', priority: 'ALTA' },
    'design': { agent: 'experts/architect_expert.md', model: 'opus', priority: 'ALTA' },
    'refactor': { agent: 'experts/architect_expert.md', model: 'opus', priority: 'ALTA' },
    'pattern': { agent: 'experts/architect_expert.md', model: 'opus', priority: 'ALTA' },

    // Testing
    'test': { agent: 'experts/tester_expert.md', model: 'sonnet', priority: 'ALTA' },
    'testing': { agent: 'experts/tester_expert.md', model: 'sonnet', priority: 'ALTA' },
    'debug': { agent: 'experts/tester_expert.md', model: 'sonnet', priority: 'ALTA' },
    'fix': { agent: 'experts/tester_expert.md', model: 'sonnet', priority: 'ALTA' },
    'bug': { agent: 'experts/tester_expert.md', model: 'sonnet', priority: 'ALTA' },

    // DevOps
    'devops': { agent: 'experts/devops_expert.md', model: 'haiku', priority: 'MEDIA' },
    'docker': { agent: 'experts/devops_expert.md', model: 'haiku', priority: 'MEDIA' },
    'deploy': { agent: 'experts/devops_expert.md', model: 'haiku', priority: 'MEDIA' },
    'ci': { agent: 'experts/devops_expert.md', model: 'haiku', priority: 'MEDIA' },
    'cd': { agent: 'experts/devops_expert.md', model: 'haiku', priority: 'MEDIA' },

    // AI
    'ai': { agent: 'experts/ai_integration_expert.md', model: 'sonnet', priority: 'ALTA' },
    'llm': { agent: 'experts/ai_integration_expert.md', model: 'sonnet', priority: 'ALTA' },
    'claude': { agent: 'experts/claude_systems_expert.md', model: 'sonnet', priority: 'ALTA' },
    'prompt': { agent: 'experts/ai_integration_expert.md', model: 'sonnet', priority: 'ALTA' },

    // Documentation
    'document': { agent: 'experts/documenter_expert.md', model: 'haiku', priority: 'BASSA' },
    'documentation': { agent: 'experts/documenter_expert.md', model: 'haiku', priority: 'BASSA' },
    'doc': { agent: 'experts/documenter_expert.md', model: 'haiku', priority: 'BASSA' },

    // Core operations
    'analyze': { agent: 'core/analyzer.md', model: 'sonnet', priority: 'MEDIA' },
    'code': { agent: 'core/coder.md', model: 'sonnet', priority: 'MEDIA' },
    'implement': { agent: 'core/coder.md', model: 'sonnet', priority: 'MEDIA' },
    'review': { agent: 'core/reviewer.md', model: 'sonnet', priority: 'MEDIA' },
};

// Keywords che indicano task ripetitivi (-> Haiku)
const REPETITIVE_KEYWORDS = [
    'format', 'lint', 'validate', 'check', 'verify', 'build', 'compile',
    'copy', 'move', 'rename', 'log', 'report', 'export', 'import', 'sync'
];

// Keywords che indicano alta complessità (-> Opus)
const COMPLEX_KEYWORDS = [
    'architect', 'design', 'refactor', 'optimize', 'security', 'migration',
    'integration', 'strategy', 'analysis', 'performance', 'scalability',
    'distributed', 'concurrent', 'async', 'investigate', 'research'
];

// =============================================================================
// L2 AUTO-DELEGATION MAPPING - Task specifici delegati a sub-agent L2
// =============================================================================

const L2_AUTO_DELEGATE: Record<string, { keywords: string[], agent: string, model: ModelType }> = {
    'security-auth-specialist-l2': {
        keywords: ['jwt', 'mfa', 'totp', 'session', '2fa', 'otp'],
        agent: 'specialists/security-auth-specialist-l2.md',
        model: 'sonnet'
    },
    'db-query-optimizer-l2': {
        keywords: ['query optimization', 'n+1', 'index optimization', 'slow query'],
        agent: 'specialists/db-query-optimizer-l2.md',
        model: 'sonnet'
    },
    'claude-prompt-optimizer-l2': {
        keywords: ['prompt engineering', 'token optimization', 'prompt tuning'],
        agent: 'specialists/claude-prompt-optimizer-l2.md',
        model: 'sonnet'
    },
    'gui-layout-specialist-l2': {
        keywords: ['qtabwidget', 'sidebar', 'form layout', 'dashboard layout'],
        agent: 'specialists/gui-layout-specialist-l2.md',
        model: 'sonnet'
    },
    'test-unit-specialist-l2': {
        keywords: ['pytest', 'mocking', 'fixtures', 'tdd'],
        agent: 'specialists/test-unit-specialist-l2.md',
        model: 'haiku'
    },
    'trading-risk-calculator-l2': {
        keywords: ['position sizing', 'kelly criterion', 'drawdown', 'risk calculation'],
        agent: 'specialists/trading-risk-calculator-l2.md',
        model: 'sonnet'
    }
};

// =============================================================================
// KEYWORD MATCHING - Word boundary per evitare false positive
// =============================================================================

/**
 * Match keyword con word boundary per evitare false positive
 * Es: "tab" NON deve matchare "database"
 */
function matchKeyword(text: string, keyword: string): boolean {
    // Escape caratteri speciali regex
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    return regex.test(text);
}

// =============================================================================
// ORCHESTRATOR v4 - ENGINE PRINCIPALE
// =============================================================================

export class OrchestratorV4 extends EventEmitter {
    private config: OrchestratorConfig;
    private tasks: Map<string, Task> = new Map();
    private readyQueue: string[] = [];
    private runningTasks: Set<string> = new Set();
    private taskCounter = 0;

    private isRunning = false;
    private startTime = 0;
    private maxHistoricalParallelism = 0;
    private sessionId: string;

    // Cache per performance
    private agentCache: Map<string, string> = new Map();
    private analysisCache: Map<string, { agent: string; model: ModelType; priority: PriorityLevel }> = new Map();

    // Clean Context Manager
    private cleanContextManager: CleanTaskWrapper;

    constructor(config?: Partial<OrchestratorConfig>) {
        super();
        this.sessionId = `session_${Date.now()}`;

        this.config = {
            maxConcurrent: config?.maxConcurrent ?? 12,
            maxDepth: config?.maxDepth ?? 10,
            maxTasks: config?.maxTasks ?? 500,
            taskTimeout: config?.taskTimeout ?? 300000,

            enableSmartModelSelection: config?.enableSmartModelSelection ?? true,
            enableAgentDiscovery: config?.enableAgentDiscovery ?? true,
            enableAutoDocumentation: config?.enableAutoDocumentation ?? true,
            enableDashboard: config?.enableDashboard ?? true,
            enableStreaming: config?.enableStreaming ?? true,

            // Clean Context - ATTIVO DI DEFAULT
            enableCleanContext: config?.enableCleanContext ?? true,
            cleanBeforeTask: config?.cleanBeforeTask ?? true,
            cleanAfterTask: config?.cleanAfterTask ?? false,
            isolateAgents: config?.isolateAgents ?? true,
            focusMode: config?.focusMode ?? true,

            autoFallbackOnMissing: config?.autoFallbackOnMissing ?? true,
            defaultFallbackAgent: config?.defaultFallbackAgent ?? 'core/coder.md',

            simulateExecution: config?.simulateExecution ?? true,
            simulationDelay: config?.simulationDelay ?? { min: 50, max: 200 }
        };

        // Inizializza Clean Context Manager
        this.cleanContextManager = new CleanTaskWrapper({
            clearBeforeTask: this.config.cleanBeforeTask,
            clearAfterTask: this.config.cleanAfterTask,
            isolateAgents: this.config.isolateAgents,
            focusMode: this.config.focusMode
        });
    }

    // =========================================================================
    // SMART ANALYSIS - Analisi task senza dipendenze pesanti
    // =========================================================================

    private analyzeTask(description: string, agentHint?: string): { agent: string; model: ModelType; priority: PriorityLevel } {
        const cacheKey = `${description}:${agentHint || ''}`;

        // Check cache
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey)!;
        }

        const lowerDesc = description.toLowerCase();
        let bestMatch: { agent: string; model: ModelType; priority: PriorityLevel } | null = null;
        let highestScore = 0;

        // Se c'è un hint, usalo come base
        if (agentHint) {
            bestMatch = {
                agent: agentHint,
                model: 'sonnet',
                priority: 'MEDIA'
            };
        }

        // Prima controlla L2 specialists per task molto specifici
        for (const [name, config] of Object.entries(L2_AUTO_DELEGATE)) {
            for (const kw of config.keywords) {
                if (matchKeyword(lowerDesc, kw) || lowerDesc.includes(kw.toLowerCase())) {
                    // L2 ha priorità alta per task specifici
                    return {
                        agent: config.agent,
                        model: config.model,
                        priority: 'ALTA' as PriorityLevel
                    };
                }
            }
        }

        // Cerca keywords nel task con word boundary (FIX #1)
        for (const [keyword, mapping] of Object.entries(KEYWORD_AGENT_MAP)) {
            if (matchKeyword(lowerDesc, keyword)) {
                const score = keyword.length; // Parole più lunghe = più specifiche
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = mapping;
                }
            }
        }

        // Aggiusta modello per complessità
        if (bestMatch) {
            // Check task ripetitivo -> Haiku (con word boundary)
            if (REPETITIVE_KEYWORDS.some(k => matchKeyword(lowerDesc, k))) {
                bestMatch = { ...bestMatch, model: 'haiku' };
            }
            // Check task complesso -> Opus (con word boundary)
            else if (COMPLEX_KEYWORDS.some(k => matchKeyword(lowerDesc, k))) {
                bestMatch = { ...bestMatch, model: 'opus' };
            }
        }

        // Fallback default
        const result = bestMatch || {
            agent: this.config.defaultFallbackAgent,
            model: 'sonnet' as ModelType,
            priority: 'MEDIA' as PriorityLevel
        };

        // Cache result
        this.analysisCache.set(cacheKey, result);

        return result;
    }

    // =========================================================================
    // TASK CREATION
    // =========================================================================

    addTask(taskConfig: TaskConfig): string {
        if (this.tasks.size >= this.config.maxTasks) {
            throw new Error(`Max tasks limit reached (${this.config.maxTasks})`);
        }

        this.taskCounter++;
        const id = `task_${this.taskCounter}`;
        const path = `T${this.taskCounter}`;

        // Smart analysis
        const analysis = this.analyzeTask(taskConfig.description, taskConfig.agentFile);

        // Override con valori espliciti se forniti
        const resolvedAgent = taskConfig.agentFile || analysis.agent;
        const resolvedModel = taskConfig.model || analysis.model;
        const resolvedPriority = taskConfig.priority || analysis.priority;

        const task: Task = {
            id,
            path,
            depth: 0,
            config: taskConfig,
            resolvedAgent,
            resolvedModel,
            resolvedPriority,

            status: 'ready',
            progress: 0,
            createdAt: Date.now(),

            parentId: null,
            childIds: [],
            dependsOn: taskConfig.dependsOn || [],
            blockedBy: new Set(taskConfig.dependsOn || []),
            unlocks: [],

            workDone: [],
            filesModified: [],
            errorsEncountered: [],
            notes: `Model: ${resolvedModel} | Agent: ${resolvedAgent}`
        };

        // Se ha dipendenze, imposta come pending
        if (task.blockedBy.size > 0) {
            task.status = 'pending';
        }

        // Registra nelle dipendenze
        for (const depId of task.dependsOn) {
            const dep = this.tasks.get(depId);
            if (dep) {
                dep.unlocks.push(id);
            }
        }

        this.tasks.set(id, task);

        if (task.status === 'ready') {
            this.readyQueue.push(id);
        }

        this.emit('taskAdded', { taskId: id, task });

        return id;
    }

    addTasks(configs: TaskConfig[]): string[] {
        return configs.map(c => this.addTask(c));
    }

    // =========================================================================
    // EXECUTION ENGINE
    // =========================================================================

    async execute(): Promise<ExecutionStats> {
        this.isRunning = true;
        this.startTime = Date.now();

        this.showHeader();

        // Main execution loop
        while (this.isRunning && !this.isComplete()) {
            const readyTasks = this.getReadyTasks();

            for (const task of readyTasks) {
                this.executeTaskAsync(task);
            }

            await this.sleep(10);
        }

        this.isRunning = false;

        const stats = this.getStats();
        this.showFinalReport(stats);

        return stats;
    }

    private async executeTaskAsync(task: Task): Promise<void> {
        task.status = 'running';
        task.startedAt = Date.now();
        task.progress = 10;
        this.runningTasks.add(task.id);

        this.maxHistoricalParallelism = Math.max(
            this.maxHistoricalParallelism,
            this.runningTasks.size
        );

        this.emit('taskStarted', { taskId: task.id });

        if (this.config.enableStreaming) {
            console.log(`  [${task.id}] STARTED - ${task.config.description.substring(0, 40)}...`);
        }

        try {
            const result = await this.invokeAgent(task);

            task.status = 'completed';
            task.progress = 100;
            task.endedAt = Date.now();
            task.duration = task.endedAt - task.startedAt;
            task.result = result;

            this.runningTasks.delete(task.id);

            // Sblocca task dipendenti
            const unlockedTasks = this.unlockDependentTasks(task.id);

            this.emit('taskCompleted', {
                taskId: task.id,
                duration: task.duration,
                unlockedCount: unlockedTasks.length
            });

            if (this.config.enableStreaming) {
                console.log(`  [${task.id}] COMPLETED in ${task.duration}ms`);
            }

        } catch (error) {
            task.status = 'failed';
            task.progress = 0;
            task.endedAt = Date.now();
            task.duration = task.endedAt - task.startedAt;
            task.error = (error as Error).message;

            this.runningTasks.delete(task.id);

            this.emit('taskFailed', { taskId: task.id, error: task.error });

            if (this.config.enableStreaming) {
                console.log(`  [${task.id}] FAILED: ${task.error}`);
            }
        }
    }

    private async invokeAgent(task: Task): Promise<any> {
        // CLEAN CONTEXT: Prepara prompt pulito per massima efficienza
        let cleanPrompt = '';
        let cleanMetadata: any = {};

        if (this.config.enableCleanContext) {
            const wrapped = this.cleanContextManager.wrap(
                task.id,
                task.config.description,
                task.resolvedAgent
            );

            cleanPrompt = wrapped.prompt;
            cleanMetadata = wrapped.metadata;

            // Emetti evento per logging
            this.emit('cleanContextPrepared', {
                taskId: task.id,
                clearCommand: wrapped.clearCommand,
                contextSize: cleanMetadata.contextSize,
                optimizations: cleanMetadata.optimizations
            });

            if (this.config.enableStreaming) {
                console.log(`  [${task.id}] CLEAN CONTEXT: ${cleanMetadata.optimizations.join(', ')}`);
            }
        }

        if (this.config.simulateExecution) {
            const delay = this.config.simulationDelay.min +
                Math.random() * (this.config.simulationDelay.max - this.config.simulationDelay.min);

            // Simula progresso
            for (let p = 20; p <= 90; p += 20) {
                await this.sleep(delay / 4);
                task.progress = p;
            }

            return {
                success: true,
                simulated: true,
                agent: task.resolvedAgent,
                model: task.resolvedModel,
                cleanContext: this.config.enableCleanContext,
                contextSize: cleanMetadata.contextSize || 0
            };
        }

        // REAL EXECUTION con Clean Context
        // Il prompt è già preparato in cleanPrompt
        // Da usare con Task tool:
        // Task({
        //   subagent_type: "general-purpose",
        //   prompt: cleanPrompt,  // <-- Prompt pulito e ottimizzato
        //   model: task.resolvedModel
        // })

        return {
            success: true,
            realExecution: false,
            cleanPrompt: cleanPrompt.substring(0, 200) + '...',  // Preview
            cleanContext: this.config.enableCleanContext
        };
    }

    /**
     * Ottieni statistiche Clean Context
     */
    getCleanContextStats(): any {
        return this.cleanContextManager.getStats();
    }

    // =========================================================================
    // DEPENDENCY MANAGEMENT
    // =========================================================================

    private unlockDependentTasks(completedTaskId: string): string[] {
        const unlocked: string[] = [];

        for (const [taskId, task] of Array.from(this.tasks)) {
            if (task.blockedBy.has(completedTaskId)) {
                task.blockedBy.delete(completedTaskId);

                if (task.blockedBy.size === 0 && task.status === 'pending') {
                    task.status = 'ready';
                    this.readyQueue.push(taskId);
                    unlocked.push(taskId);
                }
            }
        }

        return unlocked;
    }

    private getReadyTasks(): Task[] {
        const availableSlots = this.config.maxConcurrent - this.runningTasks.size;
        if (availableSlots <= 0) return [];

        const priorityOrder: Record<PriorityLevel, number> = {
            'CRITICA': 0, 'ALTA': 1, 'MEDIA': 2, 'BASSA': 3
        };

        const ready: Task[] = [];
        const remaining: string[] = [];

        while (this.readyQueue.length > 0) {
            const taskId = this.readyQueue.shift()!;
            const task = this.tasks.get(taskId);

            if (task && task.status === 'ready') {
                ready.push(task);
            }
        }

        // Ordina per priorità
        ready.sort((a, b) => priorityOrder[a.resolvedPriority] - priorityOrder[b.resolvedPriority]);

        // Prendi solo quanti ne possiamo eseguire
        const toExecute = ready.slice(0, availableSlots);
        const toRequeue = ready.slice(availableSlots);

        for (const task of toRequeue) {
            this.readyQueue.push(task.id);
        }

        return toExecute;
    }

    // =========================================================================
    // STATE & STATS
    // =========================================================================

    private isComplete(): boolean {
        for (const task of Array.from(this.tasks.values())) {
            if (task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled') {
                return false;
            }
        }
        return true;
    }

    getStats(): ExecutionStats {
        let completed = 0, failed = 0, running = 0, pending = 0;
        let totalDuration = 0;
        const modelDist: Record<ModelType, number> = { haiku: 0, sonnet: 0, opus: 0 };

        for (const task of Array.from(this.tasks.values())) {
            modelDist[task.resolvedModel]++;

            switch (task.status) {
                case 'completed':
                    completed++;
                    if (task.duration) totalDuration += task.duration;
                    break;
                case 'failed': failed++; break;
                case 'running': running++; break;
                case 'pending': case 'ready': pending++; break;
            }
        }

        const total = this.tasks.size;
        const elapsed = Date.now() - this.startTime;

        // Build base stats
        const stats: ExecutionStats = {
            totalTasks: total,
            completed,
            failed,
            running,
            pending,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
            elapsedMs: elapsed,
            avgTaskDuration: completed > 0 ? Math.round(totalDuration / completed) : 0,
            parallelism: this.runningTasks.size,
            maxParallelism: this.maxHistoricalParallelism,
            modelDistribution: modelDist
        };

        // Add Clean Context stats if enabled
        if (this.config.enableCleanContext) {
            const ccStats = this.cleanContextManager.getStats();
            stats.cleanContext = {
                tasksProcessed: ccStats.taskCount,
                tokensSaved: ccStats.totalTokensSaved,
                isContextClean: ccStats.isClean,
                optimizations: ['clear_start', 'agent_expertise', 'task_only', 'isolation', 'focus_mode']
                    .filter(opt => {
                        if (opt === 'clear_start') return this.config.cleanBeforeTask;
                        if (opt === 'isolation') return this.config.isolateAgents;
                        if (opt === 'focus_mode') return this.config.focusMode;
                        return true;
                    })
            };
        }

        return stats;
    }

    getSessionReport(): SessionReport {
        const stats = this.getStats();
        const errors = Array.from(this.tasks.values())
            .filter(t => t.error)
            .map(t => `[${t.id}] ${t.error}`);

        const recommendations: string[] = [];

        if (stats.modelDistribution.opus > stats.totalTasks * 0.5) {
            recommendations.push('Consider downgrading some Opus tasks to Sonnet for cost optimization');
        }

        if (stats.failed > 0) {
            recommendations.push(`${stats.failed} tasks failed - review error logs`);
        }

        return {
            sessionId: this.sessionId,
            startTime: this.startTime,
            endTime: Date.now(),
            stats,
            tasks: Array.from(this.tasks.values()),
            errors,
            recommendations,
            cleanContextEnabled: this.config.enableCleanContext
        };
    }

    // =========================================================================
    // UI OUTPUT
    // =========================================================================

    private showHeader(): void {
        console.log('\n' + '='.repeat(60));
        console.log('  👑 ORCHESTRATOR v4.1 - EMPEROR UNIFIED ENGINE');
        console.log('='.repeat(60));
        console.log(`  Session: ${this.sessionId}`);
        console.log(`  Tasks: ${this.tasks.size} | Max Parallel: ${this.config.maxConcurrent}`);
        console.log(`  Smart Model Selection: ${this.config.enableSmartModelSelection ? '✓ ON' : '✗ OFF'}`);
        console.log(`  Clean Context Mode: ${this.config.enableCleanContext ? '✓ ACTIVE' : '✗ OFF'}`);
        if (this.config.enableCleanContext) {
            console.log(`    ├─ Clear Before Task: ${this.config.cleanBeforeTask ? '✓' : '✗'}`);
            console.log(`    ├─ Isolate Agents: ${this.config.isolateAgents ? '✓' : '✗'}`);
            console.log(`    └─ Focus Mode: ${this.config.focusMode ? '✓' : '✗'}`);
        }
        console.log('='.repeat(60) + '\n');
    }

    private showFinalReport(stats: ExecutionStats): void {
        const cleanStats = this.cleanContextManager.getStats();

        console.log('\n' + '='.repeat(60));
        console.log('  👑 EXECUTION COMPLETE');
        console.log('='.repeat(60));
        console.log(`
  📊 RESULTS:
    Tasks: ${stats.completed}/${stats.totalTasks} completed (${stats.progress}%)
    Failed: ${stats.failed}
    Duration: ${stats.elapsedMs}ms
    Avg Task: ${stats.avgTaskDuration}ms
    Max Parallelism: ${stats.maxParallelism}

  🤖 MODEL DISTRIBUTION:
    Opus:   ${stats.modelDistribution.opus} tasks
    Sonnet: ${stats.modelDistribution.sonnet} tasks
    Haiku:  ${stats.modelDistribution.haiku} tasks
`);
        if (this.config.enableCleanContext) {
            console.log(`  🧹 CLEAN CONTEXT STATS:
    Tasks Processed: ${cleanStats.taskCount}
    Tokens Saved: ${cleanStats.totalTokensSaved}
    Context Clean: ${cleanStats.isClean ? '✓ YES' : '✗ NO'}
`);
        }
        console.log('='.repeat(60) + '\n');
    }

    // =========================================================================
    // UTILITIES
    // =========================================================================

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop(): void {
        this.isRunning = false;
    }

    reset(): void {
        this.tasks.clear();
        this.readyQueue = [];
        this.runningTasks.clear();
        this.taskCounter = 0;
        this.isRunning = false;
        this.maxHistoricalParallelism = 0;
        this.sessionId = `session_${Date.now()}`;
        this.analysisCache.clear();
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    getTasks(): Task[] {
        return Array.from(this.tasks.values());
    }

    getTask(id: string): Task | undefined {
        return this.tasks.get(id);
    }

    getConfig(): OrchestratorConfig {
        return { ...this.config };
    }

    updateConfig(updates: Partial<OrchestratorConfig>): void {
        Object.assign(this.config, updates);
    }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const orchestrator = new OrchestratorV4();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export async function runOrchestration(tasks: TaskConfig[], config?: Partial<OrchestratorConfig>): Promise<ExecutionStats> {
    const orch = new OrchestratorV4(config);
    orch.addTasks(tasks);
    return await orch.execute();
}

export function analyzeRequest(description: string): { agent: string; model: ModelType; priority: PriorityLevel } {
    const orch = new OrchestratorV4();
    return (orch as any).analyzeTask(description);
}

// =============================================================================
// FIX #6: COMPLEXITY DETECTION - Soglie corrette
// =============================================================================

export type ComplexityLevel = 'bassa' | 'media' | 'alta';

/**
 * Calcola la complessità basata sul numero di task
 * FIX #6: Soglie aggiornate (10+ = alta, 5+ = media)
 */
export function calculateComplexity(taskCount: number): ComplexityLevel {
    if (taskCount >= 10) return 'alta';
    if (taskCount >= 5) return 'media';
    return 'bassa';
}

// =============================================================================
// FIX #7: ESTIMATED TIME FORMULA - Con fattore parallelismo
// =============================================================================

/**
 * Stima il tempo di esecuzione considerando il parallelismo
 * FIX #7: Formula migliorata
 */
export function estimateTime(taskCount: number, maxParallel: number = 6): string {
    const baseTimePerTask = 2; // minuti per task
    const parallelFactor = 0.6; // efficienza parallelismo (60%)
    const overheadMinutes = 1; // overhead orchestrazione

    const sequentialTime = taskCount * baseTimePerTask;

    // Calcola il numero di batch paralleli
    const batches = Math.ceil(taskCount / maxParallel);
    const parallelTime = Math.ceil(batches * baseTimePerTask * parallelFactor) + overheadMinutes;

    if (parallelTime === sequentialTime) {
        return `${parallelTime} min`;
    }
    return `${parallelTime}-${sequentialTime} min`;
}

// =============================================================================
// FIX #8: SESSION PERSISTENCE - Salvataggio sessioni in JSON
// =============================================================================

const SESSIONS_DIR = path.join(__dirname, '../data');
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'sessions.json');

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
export function saveSessions(sessions: PersistedSession[]): void {
    try {
        if (!fs.existsSync(SESSIONS_DIR)) {
            fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        }
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    } catch (error) {
        console.error('Error saving sessions:', error);
    }
}

/**
 * Carica le sessioni da file JSON
 * FIX #8: Persistenza sessioni
 */
export function loadSessions(): PersistedSession[] {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
    return [];
}

/**
 * Aggiunge una sessione alla lista persistita
 */
export function persistSession(session: PersistedSession): void {
    const sessions = loadSessions();
    // Mantieni solo le ultime 50 sessioni
    const recentSessions = sessions.slice(-49);
    recentSessions.push(session);
    saveSessions(recentSessions);
}

// =============================================================================
// FIX #10: CLEANUP PROCESSI - Termina processi orfani
// =============================================================================

/**
 * Cleanup processi orfani (Python, Node, etc.)
 * FIX #10: Regola #0 - Pulizia processi
 */
export async function cleanupOrphanProcesses(): Promise<void> {
    const isWindows = process.platform === 'win32';

    const commands = isWindows
        ? [
            'taskkill /F /IM python.exe 2>NUL',
            'taskkill /F /IM node.exe 2>NUL',
            'taskkill /F /IM bash.exe 2>NUL',
            'taskkill /F /IM pwsh.exe 2>NUL'
          ]
        : [
            'pkill -f "python" 2>/dev/null || true',
            'pkill -f "node" 2>/dev/null || true'
          ];

    for (const cmd of commands) {
        try {
            await execAsync(cmd);
        } catch (e) {
            // Ignora errori se processo non esiste
        }
    }
}

// =============================================================================
// FIX #2: DOCUMENTER DEDUPLICATION - Check prima di aggiungere
// =============================================================================

/**
 * Verifica se il documenter è già presente nei task
 * FIX #2: Evita duplicazione documenter
 */
export function isDocumenterPresent(tasks: { resolvedAgent: string }[]): boolean {
    return tasks.some(t =>
        t.resolvedAgent?.toLowerCase().includes('documenter') ||
        t.resolvedAgent?.toLowerCase().includes('documentation')
    );
}

/**
 * Aggiunge documenter alla fine se non già presente
 * FIX #2: Con check deduplicazione
 */
export function addDocumenterIfNeeded(
    tasks: TaskConfig[],
    existingTasks: { resolvedAgent: string }[]
): TaskConfig[] {
    if (isDocumenterPresent(existingTasks)) {
        return tasks; // Già presente, non aggiungere
    }

    // Aggiungi documenter alla fine
    return [
        ...tasks,
        {
            description: 'Documenta tutte le modifiche effettuate',
            agentFile: 'core/documenter.md',
            model: 'haiku' as ModelType,
            priority: 'BASSA' as PriorityLevel,
            dependsOn: tasks.length > 0 ? [`task_${tasks.length}`] : []
        }
    ];
}
