"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentExecutor = exports.MessageQueue = exports.ResourceGovernor = exports.DependencyGraph = exports.OrchestratorHub = void 0;
const events_1 = require("events");
// =============================================================================
// DEPENDENCY GRAPH - Risoluzione Topologica
// =============================================================================
class DependencyGraph {
    nodes = new Map();
    inDegree = new Map();
    /**
     * Aggiunge un task al grafo
     */
    addTask(task) {
        this.nodes.set(task.id, task);
        this.inDegree.set(task.id, task.dependencies.length);
        // Registra questo task come dipendente nei suoi prerequisiti
        for (const depId of task.dependencies) {
            const depTask = this.nodes.get(depId);
            if (depTask && !depTask.dependents.includes(task.id)) {
                depTask.dependents.push(task.id);
            }
        }
    }
    /**
     * Rimuove un task dal grafo (cleanup)
     */
    removeTask(taskId) {
        this.nodes.delete(taskId);
        this.inDegree.delete(taskId);
    }
    /**
     * Restituisce i task pronti per l'esecuzione (nessuna dipendenza pendente)
     */
    getReadyTasks() {
        const ready = [];
        for (const [taskId, task] of this.nodes) {
            if (task.status === 'pending' && this.inDegree.get(taskId) === 0) {
                ready.push(task);
            }
        }
        // Ordina per priorità
        return ready.sort((a, b) => {
            const priorityOrder = { 'CRITICA': 0, 'ALTA': 1, 'MEDIA': 2, 'BASSA': 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    /**
     * Marca un task come completato e aggiorna i dipendenti
     */
    markCompleted(taskId) {
        const task = this.nodes.get(taskId);
        if (!task)
            return [];
        task.status = 'completed';
        task.completedAt = Date.now();
        // Decrementa il contatore dei dipendenti
        const newlyReady = [];
        for (const dependentId of task.dependents) {
            const currentDegree = this.inDegree.get(dependentId) || 0;
            const newDegree = Math.max(0, currentDegree - 1);
            this.inDegree.set(dependentId, newDegree);
            if (newDegree === 0) {
                newlyReady.push(dependentId);
            }
        }
        return newlyReady;
    }
    /**
     * Verifica se ci sono cicli nel grafo (deadlock detection)
     */
    hasCycle() {
        const visited = new Set();
        const recStack = new Set();
        const dfs = (taskId) => {
            visited.add(taskId);
            recStack.add(taskId);
            const task = this.nodes.get(taskId);
            if (task) {
                for (const depId of task.dependents) {
                    if (!visited.has(depId)) {
                        if (dfs(depId))
                            return true;
                    }
                    else if (recStack.has(depId)) {
                        return true;
                    }
                }
            }
            recStack.delete(taskId);
            return false;
        };
        for (const taskId of this.nodes.keys()) {
            if (!visited.has(taskId)) {
                if (dfs(taskId))
                    return true;
            }
        }
        return false;
    }
    /**
     * Restituisce statistiche del grafo
     */
    getStats() {
        let pending = 0, running = 0, completed = 0, failed = 0;
        for (const task of this.nodes.values()) {
            switch (task.status) {
                case 'pending':
                case 'ready':
                    pending++;
                    break;
                case 'running':
                    running++;
                    break;
                case 'completed':
                    completed++;
                    break;
                case 'failed':
                    failed++;
                    break;
            }
        }
        return { total: this.nodes.size, pending, running, completed, failed };
    }
    /**
     * Restituisce tutti i task
     */
    getAllTasks() {
        return Array.from(this.nodes.values());
    }
    /**
     * Restituisce un task specifico
     */
    getTask(taskId) {
        return this.nodes.get(taskId);
    }
}
exports.DependencyGraph = DependencyGraph;
// =============================================================================
// RESOURCE GOVERNOR - Ottimizzazione RAM/CPU/Disk
// =============================================================================
class ResourceGovernor {
    config;
    activeAgents = new Set();
    metrics;
    cleanupInterval;
    constructor(config) {
        this.config = config;
        this.metrics = {
            activeAgents: 0,
            queuedTasks: 0,
            memoryUsageMB: 0,
            cpuPercent: 0,
            completedTasks: 0,
            failedTasks: 0
        };
        // Avvia cleanup periodico
        this.startCleanupLoop();
    }
    /**
     * Verifica se è possibile avviare un nuovo agent
     */
    canStartAgent() {
        // Check limite concorrenza
        if (this.activeAgents.size >= this.config.maxConcurrentAgents) {
            return false;
        }
        // Check memoria (stima conservativa)
        const estimatedMemoryPerAgent = 50; // MB stimati per agent
        const projectedMemory = this.metrics.memoryUsageMB + estimatedMemoryPerAgent;
        if (projectedMemory > this.config.memoryLimitMB) {
            return false;
        }
        return true;
    }
    /**
     * Registra l'avvio di un agent
     */
    registerAgentStart(taskId) {
        this.activeAgents.add(taskId);
        this.metrics.activeAgents = this.activeAgents.size;
        this.updateMemoryMetrics();
    }
    /**
     * Registra la fine di un agent
     */
    registerAgentEnd(taskId, success) {
        this.activeAgents.delete(taskId);
        this.metrics.activeAgents = this.activeAgents.size;
        if (success) {
            this.metrics.completedTasks++;
        }
        else {
            this.metrics.failedTasks++;
        }
        this.updateMemoryMetrics();
    }
    /**
     * Aggiorna metriche coda
     */
    updateQueueMetrics(queueSize) {
        this.metrics.queuedTasks = queueSize;
    }
    /**
     * Restituisce le metriche correnti
     */
    getMetrics() {
        this.updateMemoryMetrics();
        return { ...this.metrics };
    }
    /**
     * Aggiorna metriche memoria
     */
    updateMemoryMetrics() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            this.metrics.memoryUsageMB = Math.round(usage.heapUsed / 1024 / 1024);
        }
    }
    /**
     * Loop di cleanup periodico per liberare risorse
     */
    startCleanupLoop() {
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, this.config.cleanupIntervalMs);
    }
    /**
     * Esegue cleanup risorse
     */
    performCleanup() {
        // Force garbage collection se disponibile
        if (typeof global !== 'undefined' && global.gc) {
            global.gc();
        }
        this.updateMemoryMetrics();
    }
    /**
     * Ferma il governor
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}
exports.ResourceGovernor = ResourceGovernor;
class MessageQueue extends events_1.EventEmitter {
    queue = [];
    processing = false;
    maxQueueSize;
    constructor(maxQueueSize = 1000) {
        super();
        this.maxQueueSize = maxQueueSize;
    }
    /**
     * Pubblica un evento nella coda
     */
    publish(event) {
        // Evita overflow coda
        if (this.queue.length >= this.maxQueueSize) {
            this.queue.shift(); // Rimuovi il più vecchio
        }
        this.queue.push(event);
        this.emit(event.type, event);
        this.emit('any', event);
    }
    /**
     * Pubblica evento TASK_READY
     */
    taskReady(taskId) {
        this.publish({
            type: 'TASK_READY',
            taskId,
            timestamp: Date.now()
        });
    }
    /**
     * Pubblica evento TASK_STARTED
     */
    taskStarted(taskId) {
        this.publish({
            type: 'TASK_STARTED',
            taskId,
            timestamp: Date.now()
        });
    }
    /**
     * Pubblica evento TASK_COMPLETED con risultato
     */
    taskCompleted(taskId, result) {
        this.publish({
            type: 'TASK_COMPLETED',
            taskId,
            timestamp: Date.now(),
            payload: result
        });
    }
    /**
     * Pubblica evento TASK_FAILED
     */
    taskFailed(taskId, error) {
        this.publish({
            type: 'TASK_FAILED',
            taskId,
            timestamp: Date.now(),
            payload: { error }
        });
    }
    /**
     * Pubblica evento SPAWN_SUBTASKS
     */
    spawnSubtasks(parentTaskId, subtasks) {
        this.publish({
            type: 'SPAWN_SUBTASKS',
            taskId: parentTaskId,
            timestamp: Date.now(),
            payload: { subtasks }
        });
    }
    /**
     * Restituisce gli ultimi N eventi
     */
    getRecentEvents(count = 50) {
        return this.queue.slice(-count);
    }
    /**
     * Pulisce la coda
     */
    clear() {
        this.queue = [];
    }
}
exports.MessageQueue = MessageQueue;
// =============================================================================
// AGENT EXECUTOR - Esegue singolo agent con retry
// =============================================================================
class AgentExecutor {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Esegue un task con retry logic
     */
    async execute(task) {
        let lastError = null;
        for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
            try {
                return await this.executeOnce(task);
            }
            catch (error) {
                lastError = error;
                if (attempt < this.config.retryAttempts) {
                    // Exponential backoff
                    const delay = this.config.retryDelayMs * Math.pow(2, attempt);
                    await this.sleep(delay);
                }
            }
        }
        // Tutti i tentativi falliti
        return {
            taskId: task.id,
            status: 'failed',
            output: null,
            duration: 0,
            tokensUsed: 0,
            cost: 0,
            error: lastError?.message || 'Unknown error'
        };
    }
    /**
     * Esegue un singolo tentativo
     */
    async executeOnce(task) {
        const startTime = Date.now();
        // Timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Task timeout')), this.config.taskTimeoutMs);
        });
        const executionPromise = this.invokeAgent(task);
        try {
            const result = await Promise.race([executionPromise, timeoutPromise]);
            return result;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Invoca l'agent reale tramite Task tool
     * NOTA: Questa è l'integrazione con Claude Code Task tool
     */
    async invokeAgent(task) {
        const startTime = Date.now();
        // Costruisci il prompt per l'agent
        const prompt = this.buildAgentPrompt(task);
        // TODO: Sostituire con chiamata reale al Task tool
        // Per ora simuliamo l'esecuzione
        // In produzione:
        // const result = await TaskTool({
        //     subagent_type: 'general-purpose',
        //     prompt: prompt,
        //     model: task.model,
        //     description: task.description
        // });
        // Simulazione esecuzione
        await this.sleep(100 + Math.random() * 200);
        const duration = Date.now() - startTime;
        const tokensUsed = Math.floor(500 + Math.random() * 1500);
        const cost = this.calculateCost(task.model, tokensUsed);
        return {
            taskId: task.id,
            status: 'success',
            output: {
                message: `Task ${task.id} completed by ${task.agentExpertFile}`,
                files_modified: [],
                recommendations: []
            },
            duration,
            tokensUsed,
            cost
        };
    }
    /**
     * Costruisce il prompt per l'agent
     */
    buildAgentPrompt(task) {
        return `
=== ORCHESTRATOR TASK ASSIGNMENT ===
Task ID: ${task.id}
Level: ${task.level}
Priority: ${task.priority}
Agent: ${task.agentExpertFile}
Model: ${task.model}

=== DESCRIPTION ===
${task.description}

=== DEPENDENCIES COMPLETED ===
${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}

=== INSTRUCTIONS ===
1. Complete the task described above
2. Report results in structured format
3. If task is complex, suggest sub-tasks for spawning

=== OUTPUT FORMAT ===
{
  "status": "success|partial|failed",
  "output": { ... },
  "suggestedSubtasks": [ ... ] // Optional
}
`;
    }
    /**
     * Calcola il costo in base al modello e tokens
     */
    calculateCost(model, tokens) {
        const rates = {
            'haiku': 0.00025, // $0.25 per 1M tokens
            'sonnet': 0.003, // $3 per 1M tokens
            'opus': 0.015 // $15 per 1M tokens
        };
        return (tokens / 1000000) * rates[model];
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.AgentExecutor = AgentExecutor;
// =============================================================================
// ORCHESTRATOR HUB - Central Command & Control
// =============================================================================
class OrchestratorHub extends events_1.EventEmitter {
    config;
    graph;
    governor;
    messageQueue;
    executor;
    taskCounter = 0;
    sessionId;
    isRunning = false;
    results = new Map();
    constructor(config) {
        super();
        // Config con defaults ottimizzati per risorse
        this.config = {
            maxConcurrentAgents: config?.maxConcurrentAgents ?? 6,
            maxQueueSize: config?.maxQueueSize ?? 100,
            memoryLimitMB: config?.memoryLimitMB ?? 512,
            taskTimeoutMs: config?.taskTimeoutMs ?? 300000,
            retryAttempts: config?.retryAttempts ?? 2,
            retryDelayMs: config?.retryDelayMs ?? 1000,
            cleanupIntervalMs: config?.cleanupIntervalMs ?? 30000,
            enableStreaming: config?.enableStreaming ?? true,
            // N-Level Configuration defaults
            maxDepth: config?.maxDepth ?? 10,
            defaultMaxSubTasks: config?.defaultMaxSubTasks ?? 5,
            autoSpawnSubtasks: config?.autoSpawnSubtasks ?? true,
            dynamicComplexityThreshold: config?.dynamicComplexityThreshold ?? true
        };
        this.sessionId = this.generateSessionId();
        this.graph = new DependencyGraph();
        this.governor = new ResourceGovernor(this.config);
        this.messageQueue = new MessageQueue(this.config.maxQueueSize);
        this.executor = new AgentExecutor(this.config);
        this.setupEventHandlers();
    }
    /**
     * Configura gli event handlers
     */
    setupEventHandlers() {
        // Quando un task è completato, processa i dipendenti
        this.messageQueue.on('TASK_COMPLETED', (event) => {
            this.handleTaskCompleted(event.taskId, event.payload);
        });
        // Quando un task fallisce
        this.messageQueue.on('TASK_FAILED', (event) => {
            this.handleTaskFailed(event.taskId, event.payload.error);
        });
        // Quando vengono generati subtasks
        this.messageQueue.on('SPAWN_SUBTASKS', (event) => {
            this.handleSubtaskSpawn(event.taskId, event.payload.subtasks);
        });
    }
    /**
     * Genera ID sessione
     */
    generateSessionId() {
        return `orch-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
    }
    /**
     * Genera ID task
     */
    generateTaskId(level, parentId) {
        this.taskCounter++;
        if (parentId) {
            return `${parentId}.${this.taskCounter}`;
        }
        return `T${level}.${this.taskCounter}`;
    }
    // =========================================================================
    // PUBLIC API
    // =========================================================================
    /**
     * MAIN ENTRY POINT - Esegue orchestrazione completa
     */
    async orchestrate(userRequest, options) {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 SUPER ORCHESTRATOR v3.0 - TRUE PARALLEL EXECUTION');
        console.log('='.repeat(60));
        console.log(`📋 Session: ${this.sessionId}`);
        console.log(`📝 Request: ${userRequest}`);
        console.log('');
        // STEP 1: Analizza e genera task L1
        const analysis = this.analyzeRequest(userRequest);
        const l1Tasks = this.generateL1Tasks(analysis);
        // STEP 2: Aggiungi al grafo
        for (const task of l1Tasks) {
            this.graph.addTask(task);
        }
        // STEP 3: Genera subtasks se necessario
        await this.generateHierarchicalSubtasks(l1Tasks);
        // STEP 4: Verifica cicli
        if (this.graph.hasCycle()) {
            throw new Error('Circular dependency detected in task graph');
        }
        // STEP 5: Mostra piano di esecuzione
        this.displayExecutionPlan();
        if (options?.preview) {
            return this.buildResult('preview');
        }
        // STEP 6: Esegui!
        await this.executeAll();
        // STEP 7: Genera report finale
        return this.buildResult('completed');
    }
    /**
     * Aggiunge un task singolo (per uso programmatico)
     */
    addTask(task) {
        const fullTask = {
            ...task,
            id: this.generateTaskId(task.level, task.parentTaskId),
            dependents: [],
            status: 'pending',
            createdAt: Date.now()
        };
        this.graph.addTask(fullTask);
        return fullTask.id;
    }
    /**
     * Restituisce lo stato corrente
     */
    getStatus() {
        return {
            sessionId: this.sessionId,
            isRunning: this.isRunning,
            graphStats: this.graph.getStats(),
            resourceMetrics: this.governor.getMetrics(),
            recentEvents: this.messageQueue.getRecentEvents(20)
        };
    }
    /**
     * Ferma l'orchestrazione
     */
    stop() {
        this.isRunning = false;
        this.governor.stop();
        this.emit('stopped');
    }
    // =========================================================================
    // ANALYSIS & TASK GENERATION
    // =========================================================================
    /**
     * Analizza la richiesta utente
     */
    analyzeRequest(request) {
        const keywords = this.extractKeywords(request);
        const domains = this.detectDomains(keywords);
        const complexity = this.calculateComplexity(request, domains);
        return { request, keywords, domains, complexity };
    }
    /**
     * Estrae keywords dalla richiesta
     */
    extractKeywords(request) {
        const keywordMap = {
            'gui': ['gui', 'interfaccia', 'finestra', 'pyqt', 'widget', 'ui', 'button', 'form'],
            'database': ['database', 'db', 'sql', 'sqlite', 'query', 'tabella', 'schema'],
            'api': ['api', 'rest', 'endpoint', 'webhook', 'http', 'request'],
            'security': ['security', 'auth', 'login', 'password', 'jwt', 'token', 'encrypt'],
            'test': ['test', 'testing', 'unit', 'integration', 'debug'],
            'docs': ['documenta', 'readme', 'docs', 'documentation']
        };
        const found = [];
        const requestLower = request.toLowerCase();
        for (const [domain, keys] of Object.entries(keywordMap)) {
            for (const key of keys) {
                if (requestLower.includes(key) && !found.includes(domain)) {
                    found.push(domain);
                }
            }
        }
        return found.length > 0 ? found : ['general'];
    }
    /**
     * Rileva i domini dalla keywords
     */
    detectDomains(keywords) {
        return keywords;
    }
    /**
     * Calcola complessità (0-1)
     */
    calculateComplexity(request, domains) {
        let complexity = 0.3; // Base
        complexity += domains.length * 0.15;
        complexity += (request.split(' ').length / 50) * 0.2;
        if (request.includes(' e ') || request.includes(' con ') || request.includes(' + ')) {
            complexity += 0.2;
        }
        return Math.min(1, complexity);
    }
    /**
     * Genera task di livello 1
     */
    generateL1Tasks(analysis) {
        const tasks = [];
        for (const domain of analysis.domains) {
            const expertFile = this.getExpertFileForDomain(domain);
            const model = this.getModelForExpert(expertFile);
            const taskId = this.generateTaskId(1);
            const task = {
                id: taskId,
                description: `${domain.toUpperCase()}: ${analysis.request}`,
                agentExpertFile: expertFile,
                model,
                priority: this.getPriorityForDomain(domain),
                level: 1,
                depth: 0,
                childTaskIds: [],
                dependencies: [],
                dependents: [],
                status: 'pending',
                createdAt: Date.now(),
                allowSubSpawning: true,
                complexityThreshold: 0.6,
                maxSubTasks: 5,
                maxDepth: 10,
                spawnRules: this.getSpawnRulesForDomain(domain),
                path: taskId,
                rootTaskId: taskId
            };
            tasks.push(task);
        }
        return tasks;
    }
    /**
     * Genera subtasks gerarchici
     */
    async generateHierarchicalSubtasks(parentTasks) {
        for (const parent of parentTasks) {
            if (!parent.allowSubSpawning)
                continue;
            // Calcola complessità del task
            const complexity = this.calculateTaskComplexity(parent);
            if (complexity > parent.complexityThreshold) {
                const subtasks = this.generateSubtasksForParent(parent, complexity);
                for (const subtask of subtasks) {
                    this.graph.addTask(subtask);
                    // Genera L3 se necessario
                    if (subtask.level === 2 && complexity > 0.8) {
                        const microTasks = this.generateSubtasksForParent(subtask, complexity, 3);
                        for (const micro of microTasks) {
                            this.graph.addTask(micro);
                        }
                    }
                }
            }
        }
        // Aggiungi sempre il Documenter finale (REGOLA #5)
        this.addDocumenterTask();
    }
    /**
     * Genera subtasks per un parent
     */
    generateSubtasksForParent(parent, complexity, level = 2) {
        const subtasks = [];
        const maxSubs = Math.min(parent.maxSubTasks, Math.ceil(complexity * 5));
        for (let i = 0; i < maxSubs && i < parent.spawnRules.length; i++) {
            const rule = parent.spawnRules[i];
            const subtaskId = this.generateTaskId(level, parent.id);
            const subtask = {
                id: subtaskId,
                description: `Sub-task for ${parent.id}: ${rule.triggerKeywords.join(', ')}`,
                agentExpertFile: rule.targetExpertFile,
                model: level === 3 ? 'haiku' : rule.model,
                priority: rule.priority,
                level,
                depth: parent.depth + 1,
                parentTaskId: parent.id,
                childTaskIds: [],
                dependencies: [parent.id],
                dependents: [],
                status: 'pending',
                createdAt: Date.now(),
                allowSubSpawning: level === 2,
                complexityThreshold: 0.8,
                maxSubTasks: 3,
                maxDepth: parent.maxDepth,
                spawnRules: [],
                path: `${parent.path}.${subtaskId}`,
                rootTaskId: parent.rootTaskId
            };
            subtasks.push(subtask);
        }
        return subtasks;
    }
    /**
     * Aggiunge il task documenter finale
     */
    addDocumenterTask() {
        const allTasks = this.graph.getAllTasks();
        const nonDocTasks = allTasks.filter(t => !t.agentExpertFile.includes('documenter'));
        const docTaskId = this.generateTaskId(1);
        const documenterTask = {
            id: docTaskId,
            description: 'DOCUMENTER: Genera documentazione finale (REGOLA #5)',
            agentExpertFile: 'core/documenter.md',
            model: 'haiku',
            priority: 'CRITICA',
            level: 1,
            depth: 0,
            childTaskIds: [],
            dependencies: nonDocTasks.map(t => t.id),
            dependents: [],
            status: 'pending',
            createdAt: Date.now(),
            allowSubSpawning: false,
            complexityThreshold: 1,
            maxSubTasks: 0,
            maxDepth: 10,
            spawnRules: [],
            path: docTaskId,
            rootTaskId: docTaskId
        };
        this.graph.addTask(documenterTask);
    }
    /**
     * Calcola complessità di un task specifico
     */
    calculateTaskComplexity(task) {
        let complexity = 0.4;
        if (task.description.length > 100)
            complexity += 0.2;
        if (task.agentExpertFile.includes('architect'))
            complexity += 0.3;
        if (task.agentExpertFile.includes('security'))
            complexity += 0.2;
        return Math.min(1, complexity);
    }
    // =========================================================================
    // EXECUTION ENGINE - True Parallel
    // =========================================================================
    /**
     * Esegue tutti i task rispettando le dipendenze
     */
    async executeAll() {
        this.isRunning = true;
        console.log('\n⚡ STARTING TRUE PARALLEL EXECUTION...\n');
        while (this.isRunning) {
            const stats = this.graph.getStats();
            // Condizione di terminazione
            if (stats.pending === 0 && stats.running === 0) {
                break;
            }
            // Ottieni task pronti
            const readyTasks = this.graph.getReadyTasks();
            this.governor.updateQueueMetrics(readyTasks.length);
            // Avvia task che rispettano i limiti risorse
            const tasksToStart = [];
            for (const task of readyTasks) {
                if (this.governor.canStartAgent()) {
                    tasksToStart.push(task);
                    task.status = 'running';
                    task.startedAt = Date.now();
                    this.governor.registerAgentStart(task.id);
                    this.messageQueue.taskStarted(task.id);
                }
            }
            // Esegui in parallelo
            if (tasksToStart.length > 0) {
                console.log(`🚀 Launching ${tasksToStart.length} agents in parallel: ${tasksToStart.map(t => t.id).join(', ')}`);
                // Non aspettiamo - fire and forget con callback
                for (const task of tasksToStart) {
                    this.executeTaskAsync(task);
                }
            }
            // Piccola pausa per non saturare il loop
            await this.sleep(50);
        }
        this.isRunning = false;
        console.log('\n✅ EXECUTION COMPLETED\n');
    }
    /**
     * Esegue un task in modo asincrono (fire and forget)
     */
    async executeTaskAsync(task) {
        try {
            const result = await this.executor.execute(task);
            this.results.set(task.id, result);
            if (result.status === 'success' || result.status === 'partial') {
                this.messageQueue.taskCompleted(task.id, result);
            }
            else {
                this.messageQueue.taskFailed(task.id, result.error || 'Unknown error');
            }
        }
        catch (error) {
            this.messageQueue.taskFailed(task.id, error.message);
        }
    }
    /**
     * Handler per task completato
     */
    handleTaskCompleted(taskId, result) {
        console.log(`✅ ${taskId} COMPLETED (${result.duration}ms, $${result.cost.toFixed(4)})`);
        this.governor.registerAgentEnd(taskId, true);
        // Sblocca i task dipendenti
        const newlyReady = this.graph.markCompleted(taskId);
        if (newlyReady.length > 0) {
            console.log(`   └─► Unlocked: ${newlyReady.join(', ')}`);
        }
        // Emit evento per listeners esterni
        this.emit('taskCompleted', { taskId, result });
    }
    /**
     * Handler per task fallito
     */
    handleTaskFailed(taskId, error) {
        console.log(`❌ ${taskId} FAILED: ${error}`);
        this.governor.registerAgentEnd(taskId, false);
        const task = this.graph.getTask(taskId);
        if (task) {
            task.status = 'failed';
        }
        this.emit('taskFailed', { taskId, error });
    }
    /**
     * Handler per spawn subtasks
     */
    handleSubtaskSpawn(parentTaskId, subtasks) {
        console.log(`🔄 ${parentTaskId} spawned ${subtasks.length} subtasks`);
        for (const subtask of subtasks) {
            this.graph.addTask(subtask);
        }
    }
    // =========================================================================
    // DISPLAY & REPORTING
    // =========================================================================
    /**
     * Mostra il piano di esecuzione
     */
    displayExecutionPlan() {
        const tasks = this.graph.getAllTasks();
        const stats = this.graph.getStats();
        console.log('\n📋 EXECUTION PLAN');
        console.log('─'.repeat(80));
        console.log(`├─ Total Tasks: ${stats.total}`);
        console.log(`├─ L1 Tasks: ${tasks.filter(t => t.level === 1).length}`);
        console.log(`├─ L2 Tasks: ${tasks.filter(t => t.level === 2).length}`);
        console.log(`├─ L3 Tasks: ${tasks.filter(t => t.level === 3).length}`);
        console.log(`├─ Max Concurrent: ${this.config.maxConcurrentAgents}`);
        console.log(`└─ Memory Limit: ${this.config.memoryLimitMB}MB`);
        console.log('');
        console.log('🤖 TASK TABLE');
        console.log('─'.repeat(80));
        console.log('| ID        | Level | Expert File                    | Model  | Deps    | Status  |');
        console.log('|-----------|-------|--------------------------------|--------|---------|---------|');
        for (const task of tasks) {
            const deps = task.dependencies.length > 0
                ? task.dependencies.slice(0, 2).join(',') + (task.dependencies.length > 2 ? '...' : '')
                : '-';
            console.log(`| ${task.id.padEnd(9)} | L${task.level}    | ${task.agentExpertFile.slice(-30).padEnd(30)} | ${task.model.padEnd(6)} | ${deps.padEnd(7)} | ⏳ READY |`);
        }
        console.log('─'.repeat(80));
        console.log('');
    }
    /**
     * Costruisce il risultato finale
     */
    buildResult(status) {
        const tasks = this.graph.getAllTasks();
        const stats = this.graph.getStats();
        const metrics = this.governor.getMetrics();
        let totalCost = 0;
        let totalDuration = 0;
        let totalTokens = 0;
        for (const result of this.results.values()) {
            totalCost += result.cost;
            totalDuration += result.duration;
            totalTokens += result.tokensUsed;
        }
        return {
            sessionId: this.sessionId,
            status,
            stats,
            metrics,
            totalCost,
            totalDuration,
            totalTokens,
            tasks: tasks.map(t => ({
                id: t.id,
                level: t.level,
                status: t.status,
                duration: this.results.get(t.id)?.duration || 0
            })),
            results: Object.fromEntries(this.results)
        };
    }
    // =========================================================================
    // HELPERS
    // =========================================================================
    getExpertFileForDomain(domain) {
        const mapping = {
            'gui': 'experts/gui-super-expert.md',
            'database': 'experts/database_expert.md',
            'api': 'experts/integration_expert.md',
            'security': 'experts/security_unified_expert.md',
            'test': 'experts/tester_expert.md',
            'docs': 'core/documenter.md',
            'general': 'core/coder.md'
        };
        return mapping[domain] || 'core/coder.md';
    }
    getModelForExpert(expertFile) {
        if (expertFile.includes('architect'))
            return 'opus';
        if (expertFile.includes('documenter') || expertFile.includes('devops'))
            return 'haiku';
        return 'sonnet';
    }
    getPriorityForDomain(domain) {
        if (domain === 'security')
            return 'CRITICA';
        if (['gui', 'database', 'api'].includes(domain))
            return 'ALTA';
        return 'MEDIA';
    }
    getSpawnRulesForDomain(domain) {
        const rules = {
            'gui': [
                { triggerKeywords: ['layout'], targetExpertFile: 'experts/gui-super-expert.md', model: 'sonnet', priority: 'ALTA' },
                { triggerKeywords: ['widget'], targetExpertFile: 'experts/gui-super-expert.md', model: 'sonnet', priority: 'ALTA' }
            ],
            'database': [
                { triggerKeywords: ['schema'], targetExpertFile: 'experts/database_expert.md', model: 'sonnet', priority: 'ALTA' },
                { triggerKeywords: ['query'], targetExpertFile: 'experts/database_expert.md', model: 'haiku', priority: 'MEDIA' }
            ]
        };
        return rules[domain] || [];
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.OrchestratorHub = OrchestratorHub;
// =============================================================================
// EXAMPLE USAGE
// =============================================================================
/*
// Esempio di utilizzo:

const orchestrator = new OrchestratorHub({
    maxConcurrentAgents: 8,
    memoryLimitMB: 256,
    taskTimeoutMs: 120000
});

// Esegui orchestrazione
const result = await orchestrator.orchestrate(
    "Crea una GUI PyQt5 con database SQLite e autenticazione"
);

console.log('Result:', result);

// Oppure aggiungi task manualmente:
orchestrator.addTask({
    description: 'Task manuale',
    agentExpertFile: 'core/coder.md',
    model: 'sonnet',
    priority: 'ALTA',
    level: 1,
    dependencies: [],
    allowSubSpawning: true,
    complexityThreshold: 0.7,
    maxSubTasks: 3,
    spawnRules: []
});

// Monitora stato
const status = orchestrator.getStatus();
console.log('Status:', status);

// Eventi
orchestrator.on('taskCompleted', (data) => {
    console.log('Task completed:', data.taskId);
});

orchestrator.on('taskFailed', (data) => {
    console.log('Task failed:', data.taskId, data.error);
});
*/
//# sourceMappingURL=orchestrator-v3-core.js.map