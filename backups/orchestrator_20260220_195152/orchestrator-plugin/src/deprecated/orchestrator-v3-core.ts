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

import { EventEmitter } from 'events';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

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
    level: number;                   // N livelli dinamici (1, 2, 3, 4, ... N)
    depth: number;                   // Profondità nell'albero (0 = root)
    parentTaskId?: string;
    childTaskIds: string[];          // IDs dei subtask figli
    dependencies: string[];          // IDs dei task prerequisiti
    dependents: string[];            // IDs dei task che dipendono da questo
    status: TaskStatus;
    result?: TaskResult;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;

    // Spawning configuration - N subtasks dinamici
    allowSubSpawning: boolean;
    complexityThreshold: number;
    maxSubTasks: number;             // Max subtasks per questo task
    maxDepth: number;                // Max profondità di spawning (default: 10)
    spawnRules: SubTaskSpawnRule[];

    // Metadata per tracking gerarchico
    path: string;                    // Path nell'albero: "T1.2.3.1"
    rootTaskId: string;              // ID del task radice L1
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
    maxConcurrentAgents: number;     // Limite agenti simultanei (default: 6)
    maxQueueSize: number;            // Max task in coda (default: 100)
    memoryLimitMB: number;           // Limite RAM (default: 512MB)
    taskTimeoutMs: number;           // Timeout per task (default: 300000 = 5min)
    retryAttempts: number;           // Tentativi retry (default: 2)
    retryDelayMs: number;            // Delay tra retry (default: 1000)
    cleanupIntervalMs: number;       // Intervallo pulizia (default: 30000)
    enableStreaming: boolean;        // Streaming risultati (default: true)

    // N-Level Configuration
    maxDepth: number;                // Max profondità gerarchia (default: 10)
    defaultMaxSubTasks: number;      // Default max subtasks per task (default: 5)
    autoSpawnSubtasks: boolean;      // Genera subtasks automaticamente (default: true)
    dynamicComplexityThreshold: boolean; // Adatta threshold per livello (default: true)
}

// =============================================================================
// DEPENDENCY GRAPH - Risoluzione Topologica
// =============================================================================

class DependencyGraph {
    private nodes: Map<string, AgentTask> = new Map();
    private inDegree: Map<string, number> = new Map();

    /**
     * Aggiunge un task al grafo
     */
    addTask(task: AgentTask): void {
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
    removeTask(taskId: string): void {
        this.nodes.delete(taskId);
        this.inDegree.delete(taskId);
    }

    /**
     * Restituisce i task pronti per l'esecuzione (nessuna dipendenza pendente)
     */
    getReadyTasks(): AgentTask[] {
        const ready: AgentTask[] = [];

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
    markCompleted(taskId: string): string[] {
        const task = this.nodes.get(taskId);
        if (!task) return [];

        task.status = 'completed';
        task.completedAt = Date.now();

        // Decrementa il contatore dei dipendenti
        const newlyReady: string[] = [];
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
    hasCycle(): boolean {
        const visited = new Set<string>();
        const recStack = new Set<string>();

        const dfs = (taskId: string): boolean => {
            visited.add(taskId);
            recStack.add(taskId);

            const task = this.nodes.get(taskId);
            if (task) {
                for (const depId of task.dependents) {
                    if (!visited.has(depId)) {
                        if (dfs(depId)) return true;
                    } else if (recStack.has(depId)) {
                        return true;
                    }
                }
            }

            recStack.delete(taskId);
            return false;
        };

        for (const taskId of this.nodes.keys()) {
            if (!visited.has(taskId)) {
                if (dfs(taskId)) return true;
            }
        }

        return false;
    }

    /**
     * Restituisce statistiche del grafo
     */
    getStats(): { total: number; pending: number; running: number; completed: number; failed: number } {
        let pending = 0, running = 0, completed = 0, failed = 0;

        for (const task of this.nodes.values()) {
            switch (task.status) {
                case 'pending': case 'ready': pending++; break;
                case 'running': running++; break;
                case 'completed': completed++; break;
                case 'failed': failed++; break;
            }
        }

        return { total: this.nodes.size, pending, running, completed, failed };
    }

    /**
     * Restituisce tutti i task
     */
    getAllTasks(): AgentTask[] {
        return Array.from(this.nodes.values());
    }

    /**
     * Restituisce un task specifico
     */
    getTask(taskId: string): AgentTask | undefined {
        return this.nodes.get(taskId);
    }
}

// =============================================================================
// RESOURCE GOVERNOR - Ottimizzazione RAM/CPU/Disk
// =============================================================================

class ResourceGovernor {
    private config: OrchestratorConfig;
    private activeAgents: Set<string> = new Set();
    private metrics: ResourceMetrics;
    private cleanupInterval?: NodeJS.Timeout;

    constructor(config: OrchestratorConfig) {
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
    canStartAgent(): boolean {
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
    registerAgentStart(taskId: string): void {
        this.activeAgents.add(taskId);
        this.metrics.activeAgents = this.activeAgents.size;
        this.updateMemoryMetrics();
    }

    /**
     * Registra la fine di un agent
     */
    registerAgentEnd(taskId: string, success: boolean): void {
        this.activeAgents.delete(taskId);
        this.metrics.activeAgents = this.activeAgents.size;

        if (success) {
            this.metrics.completedTasks++;
        } else {
            this.metrics.failedTasks++;
        }

        this.updateMemoryMetrics();
    }

    /**
     * Aggiorna metriche coda
     */
    updateQueueMetrics(queueSize: number): void {
        this.metrics.queuedTasks = queueSize;
    }

    /**
     * Restituisce le metriche correnti
     */
    getMetrics(): ResourceMetrics {
        this.updateMemoryMetrics();
        return { ...this.metrics };
    }

    /**
     * Aggiorna metriche memoria
     */
    private updateMemoryMetrics(): void {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            this.metrics.memoryUsageMB = Math.round(usage.heapUsed / 1024 / 1024);
        }
    }

    /**
     * Loop di cleanup periodico per liberare risorse
     */
    private startCleanupLoop(): void {
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, this.config.cleanupIntervalMs);
    }

    /**
     * Esegue cleanup risorse
     */
    private performCleanup(): void {
        // Force garbage collection se disponibile
        if (typeof global !== 'undefined' && (global as any).gc) {
            (global as any).gc();
        }

        this.updateMemoryMetrics();
    }

    /**
     * Ferma il governor
     */
    stop(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// =============================================================================
// MESSAGE QUEUE - Event Bus per comunicazione
// =============================================================================

interface TaskEvent {
    type: 'TASK_READY' | 'TASK_STARTED' | 'TASK_COMPLETED' | 'TASK_FAILED' | 'SPAWN_SUBTASKS';
    taskId: string;
    timestamp: number;
    payload?: any;
}

class MessageQueue extends EventEmitter {
    private queue: TaskEvent[] = [];
    private processing: boolean = false;
    private maxQueueSize: number;

    constructor(maxQueueSize: number = 1000) {
        super();
        this.maxQueueSize = maxQueueSize;
    }

    /**
     * Pubblica un evento nella coda
     */
    publish(event: TaskEvent): void {
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
    taskReady(taskId: string): void {
        this.publish({
            type: 'TASK_READY',
            taskId,
            timestamp: Date.now()
        });
    }

    /**
     * Pubblica evento TASK_STARTED
     */
    taskStarted(taskId: string): void {
        this.publish({
            type: 'TASK_STARTED',
            taskId,
            timestamp: Date.now()
        });
    }

    /**
     * Pubblica evento TASK_COMPLETED con risultato
     */
    taskCompleted(taskId: string, result: TaskResult): void {
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
    taskFailed(taskId: string, error: string): void {
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
    spawnSubtasks(parentTaskId: string, subtasks: AgentTask[]): void {
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
    getRecentEvents(count: number = 50): TaskEvent[] {
        return this.queue.slice(-count);
    }

    /**
     * Pulisce la coda
     */
    clear(): void {
        this.queue = [];
    }
}

// =============================================================================
// AGENT EXECUTOR - Esegue singolo agent con retry
// =============================================================================

class AgentExecutor {
    private config: OrchestratorConfig;

    constructor(config: OrchestratorConfig) {
        this.config = config;
    }

    /**
     * Esegue un task con retry logic
     */
    async execute(task: AgentTask): Promise<TaskResult> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
            try {
                return await this.executeOnce(task);
            } catch (error) {
                lastError = error as Error;

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
    private async executeOnce(task: AgentTask): Promise<TaskResult> {
        const startTime = Date.now();

        // Timeout wrapper
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Task timeout')), this.config.taskTimeoutMs);
        });

        const executionPromise = this.invokeAgent(task);

        try {
            const result = await Promise.race([executionPromise, timeoutPromise]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Invoca l'agent reale tramite Task tool
     * NOTA: Questa è l'integrazione con Claude Code Task tool
     */
    private async invokeAgent(task: AgentTask): Promise<TaskResult> {
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
    private buildAgentPrompt(task: AgentTask): string {
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
    private calculateCost(model: ModelType, tokens: number): number {
        const rates: Record<ModelType, number> = {
            'haiku': 0.00025,   // $0.25 per 1M tokens
            'sonnet': 0.003,    // $3 per 1M tokens
            'opus': 0.015       // $15 per 1M tokens
        };
        return (tokens / 1000000) * rates[model];
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// =============================================================================
// ORCHESTRATOR HUB - Central Command & Control
// =============================================================================

export class OrchestratorHub extends EventEmitter {
    private config: OrchestratorConfig;
    private graph: DependencyGraph;
    private governor: ResourceGovernor;
    private messageQueue: MessageQueue;
    private executor: AgentExecutor;
    private taskCounter: number = 0;
    private sessionId: string;
    private isRunning: boolean = false;
    private results: Map<string, TaskResult> = new Map();

    constructor(config?: Partial<OrchestratorConfig>) {
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
    private setupEventHandlers(): void {
        // Quando un task è completato, processa i dipendenti
        this.messageQueue.on('TASK_COMPLETED', (event: TaskEvent) => {
            this.handleTaskCompleted(event.taskId, event.payload);
        });

        // Quando un task fallisce
        this.messageQueue.on('TASK_FAILED', (event: TaskEvent) => {
            this.handleTaskFailed(event.taskId, event.payload.error);
        });

        // Quando vengono generati subtasks
        this.messageQueue.on('SPAWN_SUBTASKS', (event: TaskEvent) => {
            this.handleSubtaskSpawn(event.taskId, event.payload.subtasks);
        });
    }

    /**
     * Genera ID sessione
     */
    private generateSessionId(): string {
        return `orch-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
    }

    /**
     * Genera ID task
     */
    private generateTaskId(level: number, parentId?: string): string {
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
    async orchestrate(
        userRequest: string,
        options?: { preview?: boolean; maxParallel?: number }
    ): Promise<OrchestratorResult> {
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
    addTask(task: Omit<AgentTask, 'id' | 'dependents' | 'status' | 'createdAt'>): string {
        const fullTask: AgentTask = {
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
    getStatus(): {
        sessionId: string;
        isRunning: boolean;
        graphStats: ReturnType<DependencyGraph['getStats']>;
        resourceMetrics: ResourceMetrics;
        recentEvents: TaskEvent[];
    } {
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
    stop(): void {
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
    private analyzeRequest(request: string): TaskAnalysis {
        const keywords = this.extractKeywords(request);
        const domains = this.detectDomains(keywords);
        const complexity = this.calculateComplexity(request, domains);

        return { request, keywords, domains, complexity };
    }

    /**
     * Estrae keywords dalla richiesta
     */
    private extractKeywords(request: string): string[] {
        const keywordMap: Record<string, string[]> = {
            'gui': ['gui', 'interfaccia', 'finestra', 'pyqt', 'widget', 'ui', 'button', 'form'],
            'database': ['database', 'db', 'sql', 'sqlite', 'query', 'tabella', 'schema'],
            'api': ['api', 'rest', 'endpoint', 'webhook', 'http', 'request'],
            'security': ['security', 'auth', 'login', 'password', 'jwt', 'token', 'encrypt'],
            'test': ['test', 'testing', 'unit', 'integration', 'debug'],
            'docs': ['documenta', 'readme', 'docs', 'documentation']
        };

        const found: string[] = [];
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
    private detectDomains(keywords: string[]): string[] {
        return keywords;
    }

    /**
     * Calcola complessità (0-1)
     */
    private calculateComplexity(request: string, domains: string[]): number {
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
    private generateL1Tasks(analysis: TaskAnalysis): AgentTask[] {
        const tasks: AgentTask[] = [];

        for (const domain of analysis.domains) {
            const expertFile = this.getExpertFileForDomain(domain);
            const model = this.getModelForExpert(expertFile);

            const taskId = this.generateTaskId(1);
            const task: AgentTask = {
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
    private async generateHierarchicalSubtasks(parentTasks: AgentTask[]): Promise<void> {
        for (const parent of parentTasks) {
            if (!parent.allowSubSpawning) continue;

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
    private generateSubtasksForParent(
        parent: AgentTask,
        complexity: number,
        level: 2 | 3 = 2
    ): AgentTask[] {
        const subtasks: AgentTask[] = [];
        const maxSubs = Math.min(
            parent.maxSubTasks,
            Math.ceil(complexity * 5)
        );

        for (let i = 0; i < maxSubs && i < parent.spawnRules.length; i++) {
            const rule = parent.spawnRules[i];

            const subtaskId = this.generateTaskId(level, parent.id);
            const subtask: AgentTask = {
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
    private addDocumenterTask(): void {
        const allTasks = this.graph.getAllTasks();
        const nonDocTasks = allTasks.filter(t => !t.agentExpertFile.includes('documenter'));

        const docTaskId = this.generateTaskId(1);
        const documenterTask: AgentTask = {
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
    private calculateTaskComplexity(task: AgentTask): number {
        let complexity = 0.4;

        if (task.description.length > 100) complexity += 0.2;
        if (task.agentExpertFile.includes('architect')) complexity += 0.3;
        if (task.agentExpertFile.includes('security')) complexity += 0.2;

        return Math.min(1, complexity);
    }

    // =========================================================================
    // EXECUTION ENGINE - True Parallel
    // =========================================================================

    /**
     * Esegue tutti i task rispettando le dipendenze
     */
    private async executeAll(): Promise<void> {
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
            const tasksToStart: AgentTask[] = [];
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
    private async executeTaskAsync(task: AgentTask): Promise<void> {
        try {
            const result = await this.executor.execute(task);
            this.results.set(task.id, result);

            if (result.status === 'success' || result.status === 'partial') {
                this.messageQueue.taskCompleted(task.id, result);
            } else {
                this.messageQueue.taskFailed(task.id, result.error || 'Unknown error');
            }
        } catch (error) {
            this.messageQueue.taskFailed(task.id, (error as Error).message);
        }
    }

    /**
     * Handler per task completato
     */
    private handleTaskCompleted(taskId: string, result: TaskResult): void {
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
    private handleTaskFailed(taskId: string, error: string): void {
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
    private handleSubtaskSpawn(parentTaskId: string, subtasks: AgentTask[]): void {
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
    private displayExecutionPlan(): void {
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

            console.log(
                `| ${task.id.padEnd(9)} | L${task.level}    | ${task.agentExpertFile.slice(-30).padEnd(30)} | ${task.model.padEnd(6)} | ${deps.padEnd(7)} | ⏳ READY |`
            );
        }

        console.log('─'.repeat(80));
        console.log('');
    }

    /**
     * Costruisce il risultato finale
     */
    private buildResult(status: 'preview' | 'completed' | 'failed'): OrchestratorResult {
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

    private getExpertFileForDomain(domain: string): string {
        const mapping: Record<string, string> = {
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

    private getModelForExpert(expertFile: string): ModelType {
        if (expertFile.includes('architect')) return 'opus';
        if (expertFile.includes('documenter') || expertFile.includes('devops')) return 'haiku';
        return 'sonnet';
    }

    private getPriorityForDomain(domain: string): PriorityLevel {
        if (domain === 'security') return 'CRITICA';
        if (['gui', 'database', 'api'].includes(domain)) return 'ALTA';
        return 'MEDIA';
    }

    private getSpawnRulesForDomain(domain: string): SubTaskSpawnRule[] {
        const rules: Record<string, SubTaskSpawnRule[]> = {
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

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// =============================================================================
// TYPES EXPORT
// =============================================================================

interface TaskAnalysis {
    request: string;
    keywords: string[];
    domains: string[];
    complexity: number;
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

// =============================================================================
// MAIN EXPORT
// =============================================================================

export {
    DependencyGraph,
    ResourceGovernor,
    MessageQueue,
    AgentExecutor,
    OrchestratorConfig,
    AgentTask,
    TaskResult,
    OrchestratorResult
};

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
