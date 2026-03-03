"use strict";
/**
 * PARALLEL EXECUTOR - Consolidated
 * =================================
 * Esecuzione parallela consolidata da tutti i file in parallel/
 *
 * @version 4.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBatched = exports.runParallel = exports.parallelExecutor = exports.ParallelExecutor = void 0;
const events_1 = require("events");
// =============================================================================
// PARALLEL EXECUTOR
// =============================================================================
class ParallelExecutor extends events_1.EventEmitter {
    config;
    running = new Map();
    queue = [];
    results = new Map();
    isExecuting = false;
    constructor(config) {
        super();
        this.config = {
            maxConcurrent: config?.maxConcurrent ?? 12,
            defaultTimeout: config?.defaultTimeout ?? 300000,
            defaultRetries: config?.defaultRetries ?? 2,
            memoryLimitMB: config?.memoryLimitMB ?? 512,
            autoScaleEnabled: config?.autoScaleEnabled ?? true,
            minConcurrent: config?.minConcurrent ?? 2,
            maxConcurrentLimit: config?.maxConcurrentLimit ?? 64
        };
    }
    /**
     * Esegue task in parallelo
     */
    async executeInParallel(tasks) {
        this.isExecuting = true;
        this.queue = [...tasks];
        this.results.clear();
        // Ordina per priorità (più alto = prima)
        this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        this.emit('executionStarted', { totalTasks: tasks.length });
        // Main loop
        while (this.isExecuting && (this.queue.length > 0 || this.running.size > 0)) {
            // Auto-scale se abilitato
            if (this.config.autoScaleEnabled) {
                this.autoScale();
            }
            // Avvia nuovi task
            while (this.queue.length > 0 && this.running.size < this.config.maxConcurrent) {
                const task = this.queue.shift();
                this.startTask(task);
            }
            await this.sleep(10);
        }
        this.isExecuting = false;
        this.emit('executionCompleted', { results: Array.from(this.results.values()) });
        return Array.from(this.results.values());
    }
    /**
     * Esegue in batch
     */
    async batchExecute(tasks, batchSize) {
        const allResults = [];
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            const batchResults = await this.executeInParallel(batch);
            allResults.push(...batchResults);
            this.emit('batchCompleted', {
                batchIndex: Math.floor(i / batchSize),
                totalBatches: Math.ceil(tasks.length / batchSize)
            });
        }
        return allResults;
    }
    /**
     * Avvia un singolo task
     */
    async startTask(task) {
        const startTime = Date.now();
        this.running.set(task.id, { task, startTime });
        this.emit('taskStarted', { taskId: task.id });
        const timeout = task.timeout || this.config.defaultTimeout;
        const maxRetries = task.retries ?? this.config.defaultRetries;
        let lastError = null;
        let retries = 0;
        while (retries <= maxRetries) {
            try {
                const result = await Promise.race([
                    task.fn(),
                    this.createTimeout(timeout)
                ]);
                const duration = Date.now() - startTime;
                this.results.set(task.id, {
                    id: task.id,
                    success: true,
                    result,
                    duration,
                    retries
                });
                this.running.delete(task.id);
                this.emit('taskCompleted', { taskId: task.id, duration, retries });
                return;
            }
            catch (error) {
                lastError = error;
                retries++;
                if (retries <= maxRetries) {
                    this.emit('taskRetrying', { taskId: task.id, attempt: retries });
                    await this.sleep(1000 * retries); // Exponential backoff
                }
            }
        }
        // Fallimento dopo tutti i retry
        const duration = Date.now() - startTime;
        this.results.set(task.id, {
            id: task.id,
            success: false,
            error: lastError?.message || 'Unknown error',
            duration,
            retries: retries - 1
        });
        this.running.delete(task.id);
        this.emit('taskFailed', { taskId: task.id, error: lastError?.message });
    }
    /**
     * Auto-scaling basato su risorse
     */
    autoScale() {
        const metrics = this.getResourceMetrics();
        // Riduci concorrenza se memoria alta
        if (metrics.memoryPercent > 80) {
            this.config.maxConcurrent = Math.max(this.config.minConcurrent, Math.floor(this.config.maxConcurrent * 0.8));
            this.emit('scaled', { direction: 'down', newConcurrency: this.config.maxConcurrent });
        }
        // Aumenta se risorse disponibili
        else if (metrics.memoryPercent < 50 && this.queue.length > this.config.maxConcurrent) {
            this.config.maxConcurrent = Math.min(this.config.maxConcurrentLimit, Math.floor(this.config.maxConcurrent * 1.2));
            this.emit('scaled', { direction: 'up', newConcurrency: this.config.maxConcurrent });
        }
    }
    /**
     * Metriche risorse
     */
    getResourceMetrics() {
        const memUsed = process.memoryUsage().heapUsed / 1024 / 1024;
        const memLimit = this.config.memoryLimitMB;
        return {
            memoryUsedMB: Math.round(memUsed),
            memoryLimitMB: memLimit,
            memoryPercent: Math.round((memUsed / memLimit) * 100),
            activeTasks: this.running.size,
            queuedTasks: this.queue.length,
            cpuEstimate: Math.min(100, this.running.size * 10) // Stima approssimativa
        };
    }
    /**
     * Timeout promise
     */
    createTimeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Task timeout')), ms);
        });
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Stop execution
     */
    stop() {
        this.isExecuting = false;
    }
    /**
     * Get current state
     */
    getState() {
        return {
            running: this.running.size,
            queued: this.queue.length,
            completed: this.results.size
        };
    }
}
exports.ParallelExecutor = ParallelExecutor;
// =============================================================================
// SINGLETON & CONVENIENCE
// =============================================================================
exports.parallelExecutor = new ParallelExecutor();
async function runParallel(tasks, maxConcurrent) {
    const executor = new ParallelExecutor({ maxConcurrent });
    return executor.executeInParallel(tasks);
}
exports.runParallel = runParallel;
async function runBatched(tasks, batchSize) {
    return exports.parallelExecutor.batchExecute(tasks, batchSize);
}
exports.runBatched = runBatched;
//# sourceMappingURL=parallel-executor.js.map