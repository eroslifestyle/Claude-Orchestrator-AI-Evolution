"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStressTest = exports.IntegratedOrchestrator = void 0;
const events_1 = require("events");
const smart_model_selector_1 = require("./smart-model-selector");
const auto_documenter_1 = require("./auto-documenter");
const agent_discovery_1 = require("./agent-discovery");
// =============================================================================
// INTEGRATED ORCHESTRATOR
// =============================================================================
class IntegratedOrchestrator extends events_1.EventEmitter {
    config;
    tasks = new Map();
    readyQueue = [];
    runningTasks = new Set();
    taskCounter = 0;
    isRunning = false;
    startTime = 0;
    maxHistoricalParallelism = 0;
    dashboardInterval;
    lastDashboardOutput = '';
    constructor(config) {
        super();
        this.config = {
            maxConcurrent: config?.maxConcurrent ?? 12,
            maxDepth: config?.maxDepth ?? 10,
            maxTotalTasks: config?.maxTotalTasks ?? 500,
            taskTimeoutMs: config?.taskTimeoutMs ?? 300000,
            memoryLimitMB: config?.memoryLimitMB ?? 512,
            refreshRateMs: config?.refreshRateMs ?? 300,
            enableDashboard: config?.enableDashboard ?? true,
            simulateExecution: config?.simulateExecution ?? true,
            simulationDelayMs: config?.simulationDelayMs ?? { min: 50, max: 200 },
            // Documentation defaults
            enableAutoDocumentation: config?.enableAutoDocumentation ?? true,
            documentationOutputDir: config?.documentationOutputDir ?? 'docs/orchestrator',
            generateSessionReport: config?.generateSessionReport ?? true,
            // Smart Model Selection defaults
            enableSmartModelSelection: config?.enableSmartModelSelection ?? true,
            orchestratorModel: 'opus', // SEMPRE Opus per orchestrator
            // Agent Discovery defaults
            enableAgentDiscovery: config?.enableAgentDiscovery ?? true,
            autoFallbackOnMissing: config?.autoFallbackOnMissing ?? true,
            showMissingAgentWarnings: config?.showMissingAgentWarnings ?? true
        };
        // Reset documenter per nuova sessione
        if (this.config.enableAutoDocumentation) {
            auto_documenter_1.autoDocumenter.reset();
        }
        // Inizializza Agent Discovery
        if (this.config.enableAgentDiscovery) {
            this.initializeAgentDiscovery();
        }
    }
    /**
     * Inizializza Agent Discovery
     */
    async initializeAgentDiscovery() {
        if (agent_discovery_1.agentDiscovery.needsRefresh()) {
            await agent_discovery_1.agentDiscovery.scan();
        }
    }
    /**
     * Valida e risolvi agent file
     * Ritorna l'agent validato o un fallback se non trovato
     */
    resolveAgentFile(agentPath, taskDescription) {
        const warnings = [];
        // Prima cerca per path
        let result = agent_discovery_1.agentDiscovery.findAgent(agentPath);
        // Se non trovato, cerca per task description
        if (!result.found) {
            result = agent_discovery_1.agentDiscovery.findAgentForTask(taskDescription);
        }
        if (result.found && result.agent) {
            return {
                resolvedPath: result.agent.relativePath,
                wasFound: true,
                usedFallback: false,
                agentInfo: result.agent,
                warnings: []
            };
        }
        // Agent non trovato - gestisci fallback
        if (this.config.showMissingAgentWarnings) {
            warnings.push(`Agent '${agentPath}' non trovato`);
            for (const suggestion of result.suggestions) {
                warnings.push(`  - ${suggestion}`);
            }
        }
        if (this.config.autoFallbackOnMissing && result.alternatives.length > 0) {
            const fallback = result.alternatives[0];
            warnings.push(`Usando fallback: ${fallback.name} (${fallback.relativePath})`);
            return {
                resolvedPath: fallback.relativePath,
                wasFound: false,
                usedFallback: true,
                agentInfo: fallback,
                warnings
            };
        }
        // Nessun fallback disponibile - usa path originale
        warnings.push(`Nessun fallback disponibile - usando path originale`);
        return {
            resolvedPath: agentPath,
            wasFound: false,
            usedFallback: false,
            warnings
        };
    }
    // =========================================================================
    // TASK CREATION
    // =========================================================================
    /**
     * Crea e aggiunge un task root (L0)
     */
    addRootTask(config) {
        this.taskCounter++;
        const id = `task_${this.taskCounter}`;
        const path = `T${this.taskCounter}`;
        // Agent Discovery - risolvi e valida agent
        let resolvedAgentFile = config.agentExpertFile;
        let agentPriority = config.priority;
        if (this.config.enableAgentDiscovery) {
            const agentResolution = this.resolveAgentFile(config.agentExpertFile, config.description);
            resolvedAgentFile = agentResolution.resolvedPath;
            // Log warnings se presenti
            if (agentResolution.warnings.length > 0 && this.config.showMissingAgentWarnings) {
                console.log(`\n⚠️  AGENT RESOLUTION [${id}]:`);
                for (const warning of agentResolution.warnings) {
                    console.log(`   ${warning}`);
                }
            }
            // Usa priority dall'agent info se disponibile
            if (agentResolution.agentInfo?.priority) {
                agentPriority = agentPriority ?? agentResolution.agentInfo.priority;
            }
            // Emetti evento
            this.emit('agentResolved', {
                taskId: id,
                originalPath: config.agentExpertFile,
                resolvedPath: resolvedAgentFile,
                wasFound: agentResolution.wasFound,
                usedFallback: agentResolution.usedFallback
            });
        }
        // Smart Model Selection
        let selectedModel = config.model ?? 'sonnet';
        let modelReason = 'Specified by configuration';
        let modelConfidence = 1.0;
        if (this.config.enableSmartModelSelection && !config.model) {
            const selection = smart_model_selector_1.modelSelector.selectModel(config.description, resolvedAgentFile, // Usa agent risolto
            { depth: 0, isSubtask: false });
            selectedModel = selection.model;
            modelReason = selection.reason;
            modelConfidence = selection.confidence;
        }
        const task = {
            id,
            path,
            depth: 0,
            description: config.description,
            agentExpertFile: resolvedAgentFile, // Usa agent risolto
            model: selectedModel,
            priority: agentPriority ?? 'MEDIA', // Usa priority risolta
            parentId: null,
            childIds: [],
            rootId: id,
            dependsOn: [],
            blockedBy: new Set(),
            unlocks: [],
            status: 'ready',
            progress: 0,
            cost: 0,
            tokensUsed: 0,
            createdAt: Date.now(),
            canSpawnChildren: config.canSpawnChildren ?? true,
            maxChildren: config.maxChildren ?? 5,
            // Documentation fields
            workDone: [],
            filesModified: [],
            fixesApplied: [],
            errorsEncountered: [],
            lessonsLearned: { bestPractices: [], antiPatterns: [] },
            // Model selection info
            modelSelectionReason: modelReason,
            modelConfidence: modelConfidence
        };
        this.tasks.set(id, task);
        this.readyQueue.push(id);
        return id;
    }
    /**
     * Crea e aggiunge un subtask
     */
    addSubTask(parentId, config) {
        const parent = this.tasks.get(parentId);
        if (!parent)
            return null;
        if (parent.depth >= this.config.maxDepth) {
            return null; // Max depth reached
        }
        this.taskCounter++;
        const id = `task_${this.taskCounter}`;
        const childIndex = parent.childIds.length + 1;
        const path = `${parent.path}.${childIndex}`;
        const dependencies = [parentId, ...(config.additionalDependencies || [])];
        const newDepth = parent.depth + 1;
        // Smart Model Selection per subtask
        let selectedModel = config.model ?? 'sonnet';
        let modelReason = 'Specified by configuration';
        let modelConfidence = 1.0;
        if (this.config.enableSmartModelSelection && !config.model) {
            const selection = smart_model_selector_1.modelSelector.selectModel(config.description, config.agentExpertFile, {
                parentModel: parent.model,
                depth: newDepth,
                isSubtask: true
            });
            selectedModel = selection.model;
            modelReason = selection.reason;
            modelConfidence = selection.confidence;
        }
        const task = {
            id,
            path,
            depth: newDepth,
            description: config.description,
            agentExpertFile: config.agentExpertFile,
            model: selectedModel,
            priority: config.priority ?? 'MEDIA',
            parentId,
            childIds: [],
            rootId: parent.rootId,
            dependsOn: dependencies,
            blockedBy: new Set(dependencies.filter(depId => {
                const dep = this.tasks.get(depId);
                return !dep || dep.status !== 'completed';
            })),
            unlocks: [],
            status: 'pending',
            progress: 0,
            cost: 0,
            tokensUsed: 0,
            createdAt: Date.now(),
            canSpawnChildren: config.canSpawnChildren ?? (newDepth < this.config.maxDepth - 1),
            maxChildren: config.maxChildren ?? Math.max(1, parent.maxChildren - 1),
            // Documentation fields
            workDone: [],
            filesModified: [],
            fixesApplied: [],
            errorsEncountered: [],
            lessonsLearned: { bestPractices: [], antiPatterns: [] },
            // Model selection info
            modelSelectionReason: modelReason,
            modelConfidence: modelConfidence
        };
        // Registra nelle dipendenze
        for (const depId of dependencies) {
            const dep = this.tasks.get(depId);
            if (dep) {
                dep.unlocks.push(id);
            }
        }
        // Registra nel parent
        parent.childIds.push(id);
        this.tasks.set(id, task);
        // Se già pronto, aggiungi alla coda
        if (task.blockedBy.size === 0) {
            task.status = 'ready';
            this.readyQueue.push(id);
        }
        return id;
    }
    /**
     * Aggiunge task con dipendenze custom
     */
    addTaskWithDependencies(config) {
        this.taskCounter++;
        const id = `task_${this.taskCounter}`;
        const path = `D${this.taskCounter}`; // D = dependency task
        // Trova la profondità massima delle dipendenze + 1
        let maxTaskDepth = 0;
        for (const depId of config.dependsOn) {
            const dep = this.tasks.get(depId);
            if (dep) {
                maxTaskDepth = Math.max(maxTaskDepth, dep.depth);
            }
        }
        const newDepth = maxTaskDepth + 1;
        // Smart Model Selection
        let selectedModel = config.model ?? 'sonnet';
        let modelReason = 'Specified by configuration';
        let modelConfidence = 1.0;
        if (this.config.enableSmartModelSelection && !config.model) {
            const selection = smart_model_selector_1.modelSelector.selectModel(config.description, config.agentExpertFile, { depth: newDepth, isSubtask: config.dependsOn.length > 0 });
            selectedModel = selection.model;
            modelReason = selection.reason;
            modelConfidence = selection.confidence;
        }
        const task = {
            id,
            path,
            depth: newDepth,
            description: config.description,
            agentExpertFile: config.agentExpertFile,
            model: selectedModel,
            priority: config.priority ?? 'MEDIA',
            parentId: null,
            childIds: [],
            rootId: id,
            dependsOn: config.dependsOn,
            blockedBy: new Set(config.dependsOn.filter(depId => {
                const dep = this.tasks.get(depId);
                return !dep || dep.status !== 'completed';
            })),
            unlocks: [],
            status: 'pending',
            progress: 0,
            cost: 0,
            tokensUsed: 0,
            createdAt: Date.now(),
            canSpawnChildren: false,
            maxChildren: 0,
            // Documentation fields
            workDone: [],
            filesModified: [],
            fixesApplied: [],
            errorsEncountered: [],
            lessonsLearned: { bestPractices: [], antiPatterns: [] },
            // Model selection info
            modelSelectionReason: modelReason,
            modelConfidence: modelConfidence
        };
        // Registra nelle dipendenze
        for (const depId of config.dependsOn) {
            const dep = this.tasks.get(depId);
            if (dep) {
                dep.unlocks.push(id);
            }
        }
        this.tasks.set(id, task);
        if (task.blockedBy.size === 0) {
            task.status = 'ready';
            this.readyQueue.push(id);
        }
        return id;
    }
    // =========================================================================
    // EXECUTION
    // =========================================================================
    /**
     * Esegue tutti i task con massimo parallelismo
     */
    async execute() {
        this.isRunning = true;
        this.startTime = Date.now();
        console.log('\n' + '⚡'.repeat(40));
        console.log('🚀 SUPER ORCHESTRATOR v3.3 - INTEGRATED SYSTEM');
        console.log('   Smart Model Selection + Auto Documentation + Agent Discovery');
        console.log('⚡'.repeat(40) + '\n');
        // Inizializza Agent Discovery se abilitato
        if (this.config.enableAgentDiscovery) {
            await this.initializeAgentDiscovery();
            this.displayAgentDiscoverySummary();
        }
        // Mostra stato iniziale
        this.displayInitialState();
        // Avvia dashboard real-time
        if (this.config.enableDashboard) {
            this.startDashboard();
        }
        // Loop principale
        while (this.isRunning && !this.isComplete()) {
            // Ottieni task pronti (già limitati a slot disponibili)
            const readyTasks = this.getReadyTasks();
            // Avvia tutti i task pronti (fire-and-forget per parallelismo)
            for (const task of readyTasks) {
                this.executeTaskAsync(task);
            }
            // Breve pausa per permettere ai task di completare
            await this.sleep(10);
        }
        // Ferma dashboard
        if (this.config.enableDashboard) {
            this.stopDashboard();
        }
        this.isRunning = false;
        // Mostra report finale
        const finalStats = this.getGlobalStats();
        this.displayFinalReport(finalStats);
        // Genera report sessione con documentazione
        if (this.config.generateSessionReport) {
            this.generateAndShowSessionReport();
        }
        return finalStats;
    }
    /**
     * Genera e mostra il report di sessione
     */
    generateAndShowSessionReport() {
        const sessionMd = auto_documenter_1.autoDocumenter.generateSessionMarkdown();
        const errorCatalogMd = auto_documenter_1.autoDocumenter.generateErrorCatalogMarkdown();
        console.log('\n' + '📝'.repeat(40));
        console.log('            SESSION DOCUMENTATION GENERATED');
        console.log('📝'.repeat(40));
        // Mostra distribuzione modelli
        const report = auto_documenter_1.autoDocumenter.generateSessionReport();
        console.log(`
📊 MODEL DISTRIBUTION
├─ Opus:   ${report.modelDistribution['opus'] || 0} tasks (orchestrator/critical)
├─ Sonnet: ${report.modelDistribution['sonnet'] || 0} tasks (standard complexity)
└─ Haiku:  ${report.modelDistribution['haiku'] || 0} tasks (repetitive/loop)

📋 DOCUMENTATION SUMMARY
├─ Tasks Documented: ${report.tasksCompleted + report.tasksFailed}
├─ Errors Cataloged: ${report.commonErrors.length}
├─ New Patterns: ${report.knowledgeUpdates.newPatterns.length}
└─ Anti-Patterns: ${report.knowledgeUpdates.confirmedAntiPatterns.length}
`);
        // Mostra raccomandazioni se presenti
        if (report.recommendations.length > 0) {
            console.log('💡 RECOMMENDATIONS');
            report.recommendations.forEach((r, i) => {
                console.log(`   ${i + 1}. ${r}`);
            });
            console.log('');
        }
        // Emetti evento con report completo
        this.emit('sessionReportGenerated', {
            sessionMarkdown: sessionMd,
            errorCatalog: errorCatalogMd,
            report
        });
    }
    /**
     * Mostra summary dell'Agent Discovery
     */
    displayAgentDiscoverySummary() {
        const agents = agent_discovery_1.agentDiscovery.getAllAgents();
        const plugins = agent_discovery_1.agentDiscovery.getAllPlugins();
        // Raggruppa per categoria
        const byCategory = {};
        for (const agent of agents) {
            byCategory[agent.category] = (byCategory[agent.category] || 0) + 1;
        }
        console.log('🔍 AGENT DISCOVERY');
        console.log(`├─ Total Agents: ${agents.length}`);
        console.log(`├─ Categories: ${Object.entries(byCategory).map(([k, v]) => `${k}(${v})`).join(', ')}`);
        console.log(`├─ Installed Plugins: ${plugins.length}`);
        console.log(`└─ Auto-Fallback: ${this.config.autoFallbackOnMissing ? 'ENABLED' : 'DISABLED'}`);
        console.log('');
    }
    /**
     * Ottieni report completo dell'Agent Discovery
     */
    getAgentDiscoveryReport() {
        return agent_discovery_1.agentDiscovery.generateReport();
    }
    /**
     * Ottieni tutti gli agent disponibili
     */
    getAvailableAgents() {
        return agent_discovery_1.agentDiscovery.getAllAgents();
    }
    /**
     * Cerca agent per task description
     */
    findAgentForTask(description) {
        return agent_discovery_1.agentDiscovery.findAgentForTask(description);
    }
    /**
     * Ferma l'esecuzione
     */
    stop() {
        this.isRunning = false;
        this.stopDashboard();
    }
    /**
     * Verifica se l'esecuzione è completa
     */
    isComplete() {
        for (const task of Array.from(this.tasks.values())) {
            if (task.status !== 'completed' && task.status !== 'failed') {
                return false;
            }
        }
        return true;
    }
    /**
     * Ottieni task pronti per l'esecuzione (max = spazio disponibile)
     */
    getReadyTasks() {
        const ready = [];
        const availableSlots = this.config.maxConcurrent - this.runningTasks.size;
        if (availableSlots <= 0)
            return ready;
        // Priorità per l'ordinamento
        const priorityOrder = {
            'CRITICA': 0, 'ALTA': 1, 'MEDIA': 2, 'BASSA': 3
        };
        // Raccogli tutti i task pronti dalla coda (senza rimuoverli ancora)
        const allReady = [];
        const tempQueue = [];
        while (this.readyQueue.length > 0) {
            const taskId = this.readyQueue.shift();
            const task = this.tasks.get(taskId);
            if (task && task.status === 'ready') {
                allReady.push(task);
            }
            // Task non validi vengono scartati
        }
        // Ordina per priorità
        allReady.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        // Prendi solo quanti ne possiamo eseguire
        for (let i = 0; i < allReady.length; i++) {
            if (i < availableSlots) {
                ready.push(allReady[i]);
            }
            else {
                // Rimetti in coda quelli che non possiamo eseguire ora
                this.readyQueue.push(allReady[i].id);
            }
        }
        return ready;
    }
    /**
     * Esegue un task in modo asincrono
     */
    async executeTaskAsync(task) {
        task.status = 'running';
        task.startedAt = Date.now();
        task.progress = 10;
        this.runningTasks.add(task.id);
        // Aggiorna max parallelism
        this.maxHistoricalParallelism = Math.max(this.maxHistoricalParallelism, this.runningTasks.size);
        this.emit('taskStarted', { taskId: task.id, path: task.path });
        try {
            // Esegui (simulato o reale)
            const result = await this.invokeAgent(task);
            // Completa
            task.status = 'completed';
            task.progress = 100;
            task.endedAt = Date.now();
            task.duration = task.endedAt - task.startedAt;
            task.result = result;
            task.cost = this.calculateCost(task.model, task.tokensUsed);
            this.runningTasks.delete(task.id);
            // Sblocca dipendenti
            const newlyReady = this.unlockDependents(task.id);
            this.emit('taskCompleted', {
                taskId: task.id,
                path: task.path,
                duration: task.duration,
                unlockedCount: newlyReady.length
            });
            // Auto-documentazione
            if (this.config.enableAutoDocumentation) {
                this.documentCompletedTask(task, 'SUCCESS');
            }
            // Spawn subtasks dinamici se richiesto
            if (task.canSpawnChildren && result.suggestedSubtasks) {
                await this.spawnDynamicSubtasks(task, result.suggestedSubtasks);
            }
        }
        catch (error) {
            task.status = 'failed';
            task.progress = 0;
            task.endedAt = Date.now();
            task.duration = task.endedAt - task.startedAt;
            task.error = error.message;
            // Registra errore nel task
            task.errorsEncountered.push({
                code: 'TASK_FAILED',
                message: task.error,
                resolution: 'Requires manual intervention'
            });
            this.runningTasks.delete(task.id);
            this.emit('taskFailed', {
                taskId: task.id,
                path: task.path,
                error: task.error
            });
            // Auto-documentazione per task fallito
            if (this.config.enableAutoDocumentation) {
                this.documentCompletedTask(task, 'FAILED');
            }
        }
    }
    /**
     * Documenta un task completato
     */
    documentCompletedTask(task, status) {
        const doc = {
            taskId: task.id,
            taskPath: task.path,
            description: task.description,
            agentUsed: task.agentExpertFile,
            modelUsed: task.model,
            duration: task.duration || 0,
            status,
            workDone: task.workDone.length > 0 ? task.workDone : [`Executed ${task.description}`],
            filesModified: task.filesModified,
            fixesApplied: task.fixesApplied,
            errorsEncountered: task.errorsEncountered,
            dependencies: {
                requires: task.dependsOn,
                unlocks: task.unlocks
            },
            lessonsLearned: task.lessonsLearned,
            notes: `Model selected: ${task.model} (${task.modelSelectionReason}, confidence: ${(task.modelConfidence * 100).toFixed(0)}%)`,
            timestamp: task.endedAt || Date.now()
        };
        auto_documenter_1.autoDocumenter.documentTask(doc);
    }
    /**
     * Invoca l'agent
     */
    async invokeAgent(task) {
        if (this.config.simulateExecution) {
            // Simulazione
            const delay = this.config.simulationDelayMs.min +
                Math.random() * (this.config.simulationDelayMs.max - this.config.simulationDelayMs.min);
            await this.sleep(delay);
            task.tokensUsed = Math.floor(500 + Math.random() * 1500);
            // Simula generazione subtasks
            const shouldSpawn = task.canSpawnChildren &&
                task.depth < this.config.maxDepth - 1 &&
                Math.random() > 0.6;
            return {
                status: 'success',
                output: `Result of ${task.path}`,
                suggestedSubtasks: shouldSpawn ? this.generateMockSubtasks(task) : undefined
            };
        }
        else {
            // TODO: Integrazione reale con Task tool
            throw new Error('Real execution not implemented yet');
        }
    }
    /**
     * Genera subtasks mock
     */
    generateMockSubtasks(parent) {
        const count = Math.min(parent.maxChildren, 1 + Math.floor(Math.random() * 3));
        const subtasks = [];
        for (let i = 0; i < count; i++) {
            subtasks.push({
                description: `Subtask ${i + 1} of ${parent.path}`,
                agentExpertFile: parent.agentExpertFile,
                model: parent.depth < 2 ? 'sonnet' : 'haiku'
            });
        }
        return subtasks;
    }
    /**
     * Spawn subtasks dinamicamente
     */
    async spawnDynamicSubtasks(parent, configs) {
        for (const config of configs) {
            this.addSubTask(parent.id, {
                description: config.description,
                agentExpertFile: config.agentExpertFile,
                model: config.model,
                canSpawnChildren: parent.depth + 1 < this.config.maxDepth - 2,
                maxChildren: Math.max(1, parent.maxChildren - 1)
            });
        }
    }
    /**
     * Sblocca i task dipendenti
     */
    unlockDependents(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return [];
        const newlyReady = [];
        for (const unlockedId of task.unlocks) {
            const unlocked = this.tasks.get(unlockedId);
            if (unlocked && unlocked.status === 'pending') {
                unlocked.blockedBy.delete(taskId);
                if (unlocked.blockedBy.size === 0) {
                    unlocked.status = 'ready';
                    this.readyQueue.push(unlockedId);
                    newlyReady.push(unlockedId);
                }
            }
        }
        return newlyReady;
    }
    /**
     * Calcola il costo
     */
    calculateCost(model, tokens) {
        const rates = {
            'haiku': 0.00025,
            'sonnet': 0.003,
            'opus': 0.015
        };
        return (tokens / 1000000) * rates[model] * 1000; // *1000 per avere valori visibili
    }
    // =========================================================================
    // STATISTICS
    // =========================================================================
    /**
     * Statistiche globali
     */
    getGlobalStats() {
        let completed = 0, failed = 0, running = 0, pending = 0;
        let totalCost = 0, totalDuration = 0, completedCount = 0;
        let maxDepth = 0;
        for (const task of Array.from(this.tasks.values())) {
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
                case 'failed':
                    failed++;
                    break;
                case 'running':
                    running++;
                    break;
                default:
                    pending++;
                    break;
            }
        }
        const total = this.tasks.size;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const elapsed = this.startTime ? Date.now() - this.startTime : 0;
        const avgDuration = completedCount > 0 ? totalDuration / completedCount : 0;
        const estimatedRemaining = (running + pending) > 0 && avgDuration > 0
            ? Math.round(((running + pending) * avgDuration) / Math.max(1, this.config.maxConcurrent))
            : 0;
        const sequentialTime = completedCount * avgDuration;
        const speedup = elapsed > 0 && sequentialTime > 0 ? sequentialTime / elapsed : 1;
        return {
            totalTasks: total,
            completed,
            failed,
            running,
            pending,
            progress,
            elapsedMs: elapsed,
            estimatedRemainingMs: estimatedRemaining,
            totalCost,
            maxParallelism: this.maxHistoricalParallelism,
            currentParallelism: running,
            speedupFactor: speedup,
            levelsCount: maxDepth + 1,
            avgTaskDuration: avgDuration
        };
    }
    /**
     * Statistiche per livello
     */
    getLevelStats() {
        const levelMap = new Map();
        for (const task of Array.from(this.tasks.values())) {
            if (!levelMap.has(task.depth)) {
                levelMap.set(task.depth, []);
            }
            levelMap.get(task.depth).push(task);
        }
        const stats = [];
        for (const [level, tasks] of Array.from(levelMap)) {
            let pending = 0, running = 0, completed = 0, failed = 0;
            let totalDuration = 0, completedCount = 0, totalCost = 0;
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
                    case 'failed':
                        failed++;
                        break;
                    case 'running':
                        running++;
                        break;
                    default:
                        pending++;
                        break;
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
                totalCost
            });
        }
        return stats.sort((a, b) => a.level - b.level);
    }
    // =========================================================================
    // DASHBOARD
    // =========================================================================
    /**
     * Avvia dashboard real-time
     */
    startDashboard() {
        this.dashboardInterval = setInterval(() => {
            this.updateDashboard();
        }, this.config.refreshRateMs);
    }
    /**
     * Ferma dashboard
     */
    stopDashboard() {
        if (this.dashboardInterval) {
            clearInterval(this.dashboardInterval);
            this.dashboardInterval = undefined;
        }
    }
    /**
     * Aggiorna dashboard
     */
    updateDashboard() {
        const output = this.renderDashboard();
        if (output !== this.lastDashboardOutput) {
            console.clear();
            console.log(output);
            this.lastDashboardOutput = output;
        }
    }
    /**
     * Render dashboard
     */
    renderDashboard() {
        const stats = this.getGlobalStats();
        const levelStats = this.getLevelStats();
        const now = new Date().toLocaleTimeString();
        let output = `
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                      🎯 ORCHESTRATOR v3.1 - REAL TIME DASHBOARD                        ║
║                                    ${now}                                          ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
`;
        // Progress bar globale
        const barWidth = 60;
        const filled = Math.round((stats.progress / 100) * barWidth);
        const empty = barWidth - filled;
        const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
        const progressIcon = stats.progress === 100 ? '✅' : stats.progress >= 50 ? '🟢' : '🟡';
        output += `
║  ${progressIcon} GLOBAL PROGRESS                                                                ║
║  │ ${progressBar} │ ${stats.progress.toString().padStart(3)}%   ║
║                                                                                         ║
`;
        // Summary stats
        output += `
║  📊 SUMMARY                                                                             ║
║  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐ ║
║  │   TOTAL     │  COMPLETED  │   RUNNING   │   PENDING   │   FAILED    │  PARALLEL   │ ║
║  │    ${stats.totalTasks.toString().padStart(4)}     │    ${stats.completed.toString().padStart(4)} ✅  │    ${stats.running.toString().padStart(4)} 🔄  │    ${stats.pending.toString().padStart(4)} ⏳  │    ${stats.failed.toString().padStart(4)} ❌  │  ${stats.currentParallelism.toString().padStart(2)}/${stats.maxParallelism.toString().padStart(2)} 🚀  │ ║
║  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘ ║
║                                                                                         ║
║  ⏱️  Time: ${this.formatDuration(stats.elapsedMs).padEnd(10)} │ ETA: ${this.formatDuration(stats.estimatedRemainingMs).padEnd(10)} │ Speedup: ${stats.speedupFactor.toFixed(1).padStart(5)}x │ Cost: $${stats.totalCost.toFixed(4).padStart(8)} ║
║                                                                                         ║
`;
        // Level breakdown
        output += `
║  📈 LEVEL BREAKDOWN                                                                     ║
║  ┌───────┬───────┬─────────┬─────────┬─────────┬─────────┬────────────────────────────┐║
║  │ LEVEL │ TOTAL │ PENDING │ RUNNING │  DONE   │ FAILED  │         PROGRESS           │║
║  ├───────┼───────┼─────────┼─────────┼─────────┼─────────┼────────────────────────────┤║
`;
        for (const level of levelStats) {
            const miniBar = this.renderMiniBar(level.progress, 20);
            output += `║  │  L${level.level.toString().padStart(2)}  │  ${level.total.toString().padStart(4)} │   ${level.pending.toString().padStart(4)}  │   ${level.running.toString().padStart(4)}  │   ${level.completed.toString().padStart(4)}  │   ${level.failed.toString().padStart(4)}  │ ${miniBar} ${level.progress.toString().padStart(3)}% │║
`;
        }
        output += `║  └───────┴───────┴─────────┴─────────┴─────────┴─────────┴────────────────────────────┘║
║                                                                                         ║
`;
        // Task dettagliati
        output += `
║  📋 ACTIVE TASKS                                                                        ║
║  ┌────────────────┬────────────────────────────────┬──────────────────────┬────────────┐║
║  │     PATH       │          DESCRIPTION           │        AGENT         │   STATUS   │║
║  ├────────────────┼────────────────────────────────┼──────────────────────┼────────────┤║
`;
        const activeTasks = Array.from(this.tasks.values())
            .filter(t => t.status === 'running')
            .slice(0, 8);
        for (const task of activeTasks) {
            const path = task.path.slice(0, 14).padEnd(14);
            const desc = task.description.slice(0, 28).padEnd(28);
            const agent = task.agentExpertFile.split('/').pop()?.slice(0, 18).padEnd(18) || 'N/A'.padEnd(18);
            output += `║  │ ${path} │ ${desc}   │ ${agent}   │    🔄      │║
`;
        }
        if (activeTasks.length === 0) {
            output += `║  │      -         │ No active tasks                │         -            │     -      │║
`;
        }
        output += `║  └────────────────┴────────────────────────────────┴──────────────────────┴────────────┘║
`;
        // Footer
        output += `
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║  💡 Auto-refresh: ${this.config.refreshRateMs}ms │ Max Concurrent: ${this.config.maxConcurrent} │ Max Depth: ${this.config.maxDepth} │ Memory Optimized    ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
`;
        return output;
    }
    /**
     * Mini progress bar
     */
    renderMiniBar(progress, width) {
        const filled = Math.round((progress / 100) * width);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
    /**
     * Formatta durata
     */
    formatDuration(ms) {
        if (ms < 1000)
            return `${Math.round(ms)}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }
    // =========================================================================
    // DISPLAY
    // =========================================================================
    /**
     * Mostra stato iniziale
     */
    displayInitialState() {
        const stats = this.getGlobalStats();
        console.log('📋 INITIAL STATE');
        console.log('─'.repeat(60));
        console.log(`├─ Total Tasks: ${stats.totalTasks}`);
        console.log(`├─ Levels: ${stats.levelsCount}`);
        console.log(`├─ Max Concurrent: ${this.config.maxConcurrent}`);
        console.log(`├─ Max Depth: ${this.config.maxDepth}`);
        console.log(`└─ Simulation Mode: ${this.config.simulateExecution ? 'ON' : 'OFF'}`);
        console.log('');
        console.log('🚀 Starting execution...\n');
    }
    /**
     * Mostra report finale
     */
    displayFinalReport(stats) {
        console.log('\n' + '═'.repeat(80));
        console.log('                     🏁 ORCHESTRATOR - FINAL REPORT');
        console.log('═'.repeat(80));
        console.log(`
  ✅ EXECUTION ${stats.failed === 0 ? 'COMPLETED SUCCESSFULLY' : 'COMPLETED WITH ERRORS'}

  📊 RESULTS
  ├─ Total Tasks:       ${stats.totalTasks}
  ├─ Completed:         ${stats.completed} ✅
  ├─ Failed:            ${stats.failed} ❌
  ├─ Success Rate:      ${((stats.completed / stats.totalTasks) * 100).toFixed(1)}%

  ⏱️  PERFORMANCE
  ├─ Total Time:        ${this.formatDuration(stats.elapsedMs)}
  ├─ Avg Task Duration: ${this.formatDuration(stats.avgTaskDuration)}
  ├─ Sequential Est:    ${this.formatDuration(stats.totalTasks * stats.avgTaskDuration)}
  ├─ Speedup Factor:    ${stats.speedupFactor.toFixed(2)}x 🚀

  🔄 PARALLELISM
  ├─ Max Parallel:      ${stats.maxParallelism} agents
  ├─ Levels Used:       ${stats.levelsCount}
  ├─ Efficiency:        ${((stats.speedupFactor / stats.maxParallelism) * 100).toFixed(1)}%

  💰 COST
  ├─ Total Cost:        $${stats.totalCost.toFixed(4)}
  └─ Cost per Task:     $${(stats.totalCost / stats.totalTasks).toFixed(6)}
`);
        console.log('═'.repeat(80) + '\n');
    }
    // =========================================================================
    // UTILITIES
    // =========================================================================
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.IntegratedOrchestrator = IntegratedOrchestrator;
// =============================================================================
// STRESS TEST
// =============================================================================
async function runStressTest(config) {
    const rootTasks = config?.rootTasks ?? 8;
    const maxDepth = config?.maxDepth ?? 5;
    const maxConcurrent = config?.maxConcurrent ?? 12;
    console.log('\n' + '🧪'.repeat(40));
    console.log('         ORCHESTRATOR STRESS TEST');
    console.log('🧪'.repeat(40));
    console.log(`
  Configuration:
  ├─ Root Tasks: ${rootTasks}
  ├─ Max Depth: ${maxDepth}
  ├─ Max Concurrent: ${maxConcurrent}
  └─ Mode: Simulation
`);
    const orchestrator = new IntegratedOrchestrator({
        maxConcurrent,
        maxDepth,
        refreshRateMs: 200,
        enableDashboard: true,
        simulateExecution: true,
        simulationDelayMs: { min: 30, max: 150 }
    });
    // Genera task root
    const agents = [
        'experts/gui-super-expert.md',
        'experts/database_expert.md',
        'experts/security_unified_expert.md',
        'experts/integration_expert.md',
        'experts/architect_expert.md',
        'experts/tester_expert.md'
    ];
    const rootIds = [];
    for (let i = 0; i < rootTasks; i++) {
        const id = orchestrator.addRootTask({
            description: `Root Task ${i + 1} - ${['GUI', 'Database', 'API', 'Security', 'Architecture', 'Testing'][i % 6]}`,
            agentExpertFile: agents[i % agents.length],
            model: i < 2 ? 'opus' : i < 5 ? 'sonnet' : 'haiku',
            priority: i < 2 ? 'CRITICA' : i < 5 ? 'ALTA' : 'MEDIA',
            canSpawnChildren: true,
            maxChildren: 4
        });
        rootIds.push(id);
    }
    // Aggiungi alcuni subtask iniziali
    for (const rootId of rootIds.slice(0, 4)) {
        for (let j = 0; j < 2; j++) {
            orchestrator.addSubTask(rootId, {
                description: `Subtask ${j + 1} of root`,
                agentExpertFile: agents[Math.floor(Math.random() * agents.length)],
                model: 'sonnet',
                canSpawnChildren: true,
                maxChildren: 3
            });
        }
    }
    // Aggiungi task finale che dipende da tutti i root
    orchestrator.addTaskWithDependencies({
        description: 'Final Documentation (depends on all)',
        agentExpertFile: 'core/documenter.md',
        model: 'haiku',
        dependsOn: rootIds,
        priority: 'CRITICA'
    });
    // Esegui!
    return await orchestrator.execute();
}
exports.runStressTest = runStressTest;
// =============================================================================
// MAIN (se eseguito direttamente)
// =============================================================================
// Per test diretto con ts-node o npx
if (typeof require !== 'undefined' && require.main === module) {
    runStressTest({
        rootTasks: 6,
        maxDepth: 4,
        maxConcurrent: 10
    }).then(stats => {
        console.log('\n✅ Stress test completed!');
        process.exit(0);
    }).catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=orchestrator-integrated.js.map