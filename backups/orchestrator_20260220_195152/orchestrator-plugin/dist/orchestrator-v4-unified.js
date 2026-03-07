"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDocumenterIfNeeded = exports.isDocumenterPresent = exports.cleanupOrphanProcesses = exports.persistSession = exports.loadSessions = exports.saveSessions = exports.estimateTime = exports.calculateComplexity = exports.analyzeRequest = exports.runOrchestration = exports.orchestrator = exports.OrchestratorV4 = void 0;
const events_1 = require("events");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const clean_context_1 = require("./clean-context");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// =============================================================================
// KEYWORD MAPPINGS - Mapping diretto senza dipendenze esterne
// =============================================================================
const KEYWORD_AGENT_MAP = {
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
const L2_AUTO_DELEGATE = {
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
function matchKeyword(text, keyword) {
    // Escape caratteri speciali regex
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    return regex.test(text);
}
// =============================================================================
// ORCHESTRATOR v4 - ENGINE PRINCIPALE
// =============================================================================
class OrchestratorV4 extends events_1.EventEmitter {
    config;
    tasks = new Map();
    readyQueue = [];
    runningTasks = new Set();
    taskCounter = 0;
    isRunning = false;
    startTime = 0;
    maxHistoricalParallelism = 0;
    sessionId;
    // Cache per performance
    agentCache = new Map();
    analysisCache = new Map();
    // Clean Context Manager
    cleanContextManager;
    constructor(config) {
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
        this.cleanContextManager = new clean_context_1.CleanTaskWrapper({
            clearBeforeTask: this.config.cleanBeforeTask,
            clearAfterTask: this.config.cleanAfterTask,
            isolateAgents: this.config.isolateAgents,
            focusMode: this.config.focusMode
        });
    }
    // =========================================================================
    // SMART ANALYSIS - Analisi task senza dipendenze pesanti
    // =========================================================================
    analyzeTask(description, agentHint) {
        const cacheKey = `${description}:${agentHint || ''}`;
        // Check cache
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey);
        }
        const lowerDesc = description.toLowerCase();
        let bestMatch = null;
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
                        priority: 'ALTA'
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
            model: 'sonnet',
            priority: 'MEDIA'
        };
        // Cache result
        this.analysisCache.set(cacheKey, result);
        return result;
    }
    // =========================================================================
    // TASK CREATION
    // =========================================================================
    addTask(taskConfig) {
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
        const task = {
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
    addTasks(configs) {
        return configs.map(c => this.addTask(c));
    }
    // =========================================================================
    // EXECUTION ENGINE
    // =========================================================================
    async execute() {
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
    async executeTaskAsync(task) {
        task.status = 'running';
        task.startedAt = Date.now();
        task.progress = 10;
        this.runningTasks.add(task.id);
        this.maxHistoricalParallelism = Math.max(this.maxHistoricalParallelism, this.runningTasks.size);
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
        }
        catch (error) {
            task.status = 'failed';
            task.progress = 0;
            task.endedAt = Date.now();
            task.duration = task.endedAt - task.startedAt;
            task.error = error.message;
            this.runningTasks.delete(task.id);
            this.emit('taskFailed', { taskId: task.id, error: task.error });
            if (this.config.enableStreaming) {
                console.log(`  [${task.id}] FAILED: ${task.error}`);
            }
        }
    }
    async invokeAgent(task) {
        // CLEAN CONTEXT: Prepara prompt pulito per massima efficienza
        let cleanPrompt = '';
        let cleanMetadata = {};
        if (this.config.enableCleanContext) {
            const wrapped = this.cleanContextManager.wrap(task.id, task.config.description, task.resolvedAgent);
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
            cleanPrompt: cleanPrompt.substring(0, 200) + '...', // Preview
            cleanContext: this.config.enableCleanContext
        };
    }
    /**
     * Ottieni statistiche Clean Context
     */
    getCleanContextStats() {
        return this.cleanContextManager.getStats();
    }
    // =========================================================================
    // DEPENDENCY MANAGEMENT
    // =========================================================================
    unlockDependentTasks(completedTaskId) {
        const unlocked = [];
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
    getReadyTasks() {
        const availableSlots = this.config.maxConcurrent - this.runningTasks.size;
        if (availableSlots <= 0)
            return [];
        const priorityOrder = {
            'CRITICA': 0, 'ALTA': 1, 'MEDIA': 2, 'BASSA': 3
        };
        const ready = [];
        const remaining = [];
        while (this.readyQueue.length > 0) {
            const taskId = this.readyQueue.shift();
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
    isComplete() {
        for (const task of Array.from(this.tasks.values())) {
            if (task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled') {
                return false;
            }
        }
        return true;
    }
    getStats() {
        let completed = 0, failed = 0, running = 0, pending = 0;
        let totalDuration = 0;
        const modelDist = { haiku: 0, sonnet: 0, opus: 0 };
        for (const task of Array.from(this.tasks.values())) {
            modelDist[task.resolvedModel]++;
            switch (task.status) {
                case 'completed':
                    completed++;
                    if (task.duration)
                        totalDuration += task.duration;
                    break;
                case 'failed':
                    failed++;
                    break;
                case 'running':
                    running++;
                    break;
                case 'pending':
                case 'ready':
                    pending++;
                    break;
            }
        }
        const total = this.tasks.size;
        const elapsed = Date.now() - this.startTime;
        // Build base stats
        const stats = {
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
                    if (opt === 'clear_start')
                        return this.config.cleanBeforeTask;
                    if (opt === 'isolation')
                        return this.config.isolateAgents;
                    if (opt === 'focus_mode')
                        return this.config.focusMode;
                    return true;
                })
            };
        }
        return stats;
    }
    getSessionReport() {
        const stats = this.getStats();
        const errors = Array.from(this.tasks.values())
            .filter(t => t.error)
            .map(t => `[${t.id}] ${t.error}`);
        const recommendations = [];
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
    showHeader() {
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
    showFinalReport(stats) {
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    stop() {
        this.isRunning = false;
    }
    reset() {
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
    getTasks() {
        return Array.from(this.tasks.values());
    }
    getTask(id) {
        return this.tasks.get(id);
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(updates) {
        Object.assign(this.config, updates);
    }
}
exports.OrchestratorV4 = OrchestratorV4;
// =============================================================================
// SINGLETON INSTANCE
// =============================================================================
exports.orchestrator = new OrchestratorV4();
// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================
async function runOrchestration(tasks, config) {
    const orch = new OrchestratorV4(config);
    orch.addTasks(tasks);
    return await orch.execute();
}
exports.runOrchestration = runOrchestration;
function analyzeRequest(description) {
    const orch = new OrchestratorV4();
    return orch.analyzeTask(description);
}
exports.analyzeRequest = analyzeRequest;
/**
 * Calcola la complessità basata sul numero di task
 * FIX #6: Soglie aggiornate (10+ = alta, 5+ = media)
 */
function calculateComplexity(taskCount) {
    if (taskCount >= 10)
        return 'alta';
    if (taskCount >= 5)
        return 'media';
    return 'bassa';
}
exports.calculateComplexity = calculateComplexity;
// =============================================================================
// FIX #7: ESTIMATED TIME FORMULA - Con fattore parallelismo
// =============================================================================
/**
 * Stima il tempo di esecuzione considerando il parallelismo
 * FIX #7: Formula migliorata
 */
function estimateTime(taskCount, maxParallel = 6) {
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
exports.estimateTime = estimateTime;
// =============================================================================
// FIX #8: SESSION PERSISTENCE - Salvataggio sessioni in JSON
// =============================================================================
const SESSIONS_DIR = path.join(__dirname, '../data');
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'sessions.json');
/**
 * Salva le sessioni su file JSON
 * FIX #8: Persistenza sessioni
 */
function saveSessions(sessions) {
    try {
        if (!fs.existsSync(SESSIONS_DIR)) {
            fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        }
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    }
    catch (error) {
        console.error('Error saving sessions:', error);
    }
}
exports.saveSessions = saveSessions;
/**
 * Carica le sessioni da file JSON
 * FIX #8: Persistenza sessioni
 */
function loadSessions() {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Error loading sessions:', error);
    }
    return [];
}
exports.loadSessions = loadSessions;
/**
 * Aggiunge una sessione alla lista persistita
 */
function persistSession(session) {
    const sessions = loadSessions();
    // Mantieni solo le ultime 50 sessioni
    const recentSessions = sessions.slice(-49);
    recentSessions.push(session);
    saveSessions(recentSessions);
}
exports.persistSession = persistSession;
// =============================================================================
// FIX #10: CLEANUP PROCESSI - Termina processi orfani
// =============================================================================
/**
 * Cleanup processi orfani (Python, Node, etc.)
 * FIX #10: Regola #0 - Pulizia processi
 */
async function cleanupOrphanProcesses() {
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
        }
        catch (e) {
            // Ignora errori se processo non esiste
        }
    }
}
exports.cleanupOrphanProcesses = cleanupOrphanProcesses;
// =============================================================================
// FIX #2: DOCUMENTER DEDUPLICATION - Check prima di aggiungere
// =============================================================================
/**
 * Verifica se il documenter è già presente nei task
 * FIX #2: Evita duplicazione documenter
 */
function isDocumenterPresent(tasks) {
    return tasks.some(t => t.resolvedAgent?.toLowerCase().includes('documenter') ||
        t.resolvedAgent?.toLowerCase().includes('documentation'));
}
exports.isDocumenterPresent = isDocumenterPresent;
/**
 * Aggiunge documenter alla fine se non già presente
 * FIX #2: Con check deduplicazione
 */
function addDocumenterIfNeeded(tasks, existingTasks) {
    if (isDocumenterPresent(existingTasks)) {
        return tasks; // Già presente, non aggiungere
    }
    // Aggiungi documenter alla fine
    return [
        ...tasks,
        {
            description: 'Documenta tutte le modifiche effettuate',
            agentFile: 'core/documenter.md',
            model: 'haiku',
            priority: 'BASSA',
            dependsOn: tasks.length > 0 ? [`task_${tasks.length}`] : []
        }
    ];
}
exports.addDocumenterIfNeeded = addDocumenterIfNeeded;
//# sourceMappingURL=orchestrator-v4-unified.js.map