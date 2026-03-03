/**
 * ORCHESTRATOR VISUALIZER - Complete Activity Logging
 *
 * REGOLA: Ogni qual volta si utilizza l'orchestrator, visualizza
 * TUTTI i messaggi per seguire il lavoro completo.
 *
 * Features:
 * - Real-time progress tracking
 * - Agent activity monitoring
 * - Task status updates
 * - Error and warning display
 * - Performance metrics
 * - Visual formatting
 *
 * @version 1.0
 * @date 2026-02-03
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type LogCategory =
  | 'ORCHESTRATOR'
  | 'AGENT'
  | 'TASK'
  | 'CONTEXT'
  | 'PARALLEL'
  | 'DEPENDENCY'
  | 'FALLBACK'
  | 'PERFORMANCE'
  | 'ERROR'
  | 'SYSTEM';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  agentId?: string;
  taskId?: string;
  batchId?: string;
}

export interface VisualizerConfig {
  enabled: boolean;
  showTimestamps: boolean;
  showAgentActivity: boolean;
  showTaskProgress: boolean;
  showPerformanceMetrics: boolean;
  showContextEvents: boolean;
  showDependencyFlow: boolean;
  showErrors: boolean;
  colorOutput: boolean;
  minLogLevel: LogLevel;
  maxHistorySize: number;
  realTimeRefreshMs: number;
}

export interface AgentActivityState {
  agentId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentTask?: string;
  startTime?: number;
  taskCount: number;
  successCount: number;
  failCount: number;
}

export interface TaskProgressState {
  taskId: string;
  description: string;
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped';
  agentId?: string;
  startTime?: number;
  endTime?: number;
  progress: number;  // 0-100
}

export interface OrchestratorState {
  sessionId: string;
  startTime: number;
  status: 'initializing' | 'planning' | 'executing' | 'completed' | 'failed';
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
  pendingTasks: number;
  currentBatch: number;
  totalBatches: number;
  activeAgents: number;
  maxConcurrency: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

// =============================================================================
// ANSI COLOR CODES (for terminal output)
// =============================================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

// =============================================================================
// ORCHESTRATOR VISUALIZER
// =============================================================================

export class OrchestratorVisualizer extends EventEmitter {
  private config: VisualizerConfig;
  private logHistory: LogEntry[] = [];
  private agentStates: Map<string, AgentActivityState> = new Map();
  private taskStates: Map<string, TaskProgressState> = new Map();
  private orchestratorState: OrchestratorState | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private lineCount = 0;

  constructor(config: Partial<VisualizerConfig> = {}) {
    super();
    this.config = {
      enabled: true,
      showTimestamps: true,
      showAgentActivity: true,
      showTaskProgress: true,
      showPerformanceMetrics: true,
      showContextEvents: true,
      showDependencyFlow: true,
      showErrors: true,
      colorOutput: true,
      minLogLevel: 'INFO',
      maxHistorySize: 1000,
      realTimeRefreshMs: 100,
      ...config
    };
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Inizializza una nuova sessione di orchestrazione
   */
  startSession(sessionId: string, totalTasks: number, maxConcurrency: number): void {
    if (!this.config.enabled) return;

    this.orchestratorState = {
      sessionId,
      startTime: Date.now(),
      status: 'initializing',
      totalTasks,
      completedTasks: 0,
      failedTasks: 0,
      runningTasks: 0,
      pendingTasks: totalTasks,
      currentBatch: 0,
      totalBatches: 0,
      activeAgents: 0,
      maxConcurrency,
      elapsedMs: 0,
      estimatedRemainingMs: 0
    };

    this.printHeader(sessionId, totalTasks, maxConcurrency);
    this.log('INFO', 'ORCHESTRATOR', 'Session started', { sessionId, totalTasks });
  }

  /**
   * Stampa header della sessione
   */
  private printHeader(sessionId: string, totalTasks: number, maxConcurrency: number): void {
    const separator = '='.repeat(80);
    const title = ' ORCHESTRATOR VISUALIZER - LIVE ACTIVITY MONITOR ';

    console.log('\n' + this.color(separator, 'cyan'));
    console.log(this.color(title.padStart(40 + title.length / 2).padEnd(80), 'bright', 'cyan'));
    console.log(this.color(separator, 'cyan'));
    console.log(`
  Session:      ${this.color(sessionId, 'yellow')}
  Total Tasks:  ${this.color(totalTasks.toString(), 'green')}
  Max Parallel: ${this.color(maxConcurrency.toString(), 'green')}
  Started:      ${this.color(new Date().toISOString(), 'dim')}
`);
    console.log(this.color(separator, 'cyan') + '\n');
  }

  // ===========================================================================
  // LOGGING
  // ===========================================================================

  /**
   * Log entry principale
   */
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    options?: { agentId?: string; taskId?: string; batchId?: string }
  ): void {
    if (!this.config.enabled) return;
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      ...options
    };

    this.logHistory.push(entry);
    if (this.logHistory.length > this.config.maxHistorySize) {
      this.logHistory.shift();
    }

    this.printLogEntry(entry);
    this.emit('log', entry);
  }

  /**
   * Verifica se il livello di log deve essere mostrato
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const minIndex = levels.indexOf(this.config.minLogLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  /**
   * Stampa una entry di log formattata
   */
  private printLogEntry(entry: LogEntry): void {
    const timestamp = this.config.showTimestamps
      ? this.color(`[${this.formatTime(entry.timestamp)}]`, 'dim') + ' '
      : '';

    const levelColor = this.getLevelColor(entry.level);
    const level = this.color(`[${entry.level.padEnd(5)}]`, levelColor);

    const categoryColor = this.getCategoryColor(entry.category);
    const category = this.color(`[${entry.category.padEnd(11)}]`, categoryColor);

    let context = '';
    if (entry.agentId) context += this.color(` [Agent:${entry.agentId}]`, 'magenta');
    if (entry.taskId) context += this.color(` [Task:${entry.taskId}]`, 'blue');
    if (entry.batchId) context += this.color(` [Batch:${entry.batchId}]`, 'yellow');

    const message = entry.level === 'ERROR' || entry.level === 'CRITICAL'
      ? this.color(entry.message, 'red')
      : entry.message;

    console.log(`${timestamp}${level} ${category}${context} ${message}`);

    if (entry.data && entry.level === 'DEBUG') {
      console.log(this.color(`    Data: ${JSON.stringify(entry.data)}`, 'dim'));
    }

    this.lineCount++;
  }

  // ===========================================================================
  // AGENT ACTIVITY TRACKING
  // ===========================================================================

  /**
   * Log avvio agent
   */
  logAgentStart(agentId: string, taskId: string, taskDescription: string): void {
    if (!this.config.showAgentActivity) return;

    let state = this.agentStates.get(agentId);
    if (!state) {
      state = {
        agentId,
        status: 'idle',
        taskCount: 0,
        successCount: 0,
        failCount: 0
      };
      this.agentStates.set(agentId, state);
    }

    state.status = 'running';
    state.currentTask = taskId;
    state.startTime = Date.now();
    state.taskCount++;

    this.log('INFO', 'AGENT', `Agent started execution`, {
      taskId,
      description: taskDescription.substring(0, 50)
    }, { agentId, taskId });

    this.updateOrchestratorState({ runningTasks: this.orchestratorState!.runningTasks + 1 });
  }

  /**
   * Log completamento agent
   */
  logAgentComplete(agentId: string, taskId: string, success: boolean, durationMs: number): void {
    if (!this.config.showAgentActivity) return;

    const state = this.agentStates.get(agentId);
    if (state) {
      state.status = success ? 'completed' : 'failed';
      state.currentTask = undefined;
      if (success) state.successCount++;
      else state.failCount++;
    }

    const emoji = success ? '' : '';
    const status = success ? this.color('SUCCESS', 'green') : this.color('FAILED', 'red');

    this.log(
      success ? 'INFO' : 'WARN',
      'AGENT',
      `Agent ${status} (${durationMs}ms)`,
      { durationMs, success },
      { agentId, taskId }
    );

    this.updateOrchestratorState({
      runningTasks: Math.max(0, this.orchestratorState!.runningTasks - 1),
      completedTasks: success
        ? this.orchestratorState!.completedTasks + 1
        : this.orchestratorState!.completedTasks,
      failedTasks: success
        ? this.orchestratorState!.failedTasks
        : this.orchestratorState!.failedTasks + 1
    });
  }

  // ===========================================================================
  // TASK PROGRESS TRACKING
  // ===========================================================================

  /**
   * Log creazione task
   */
  logTaskCreated(taskId: string, description: string, dependencies: string[]): void {
    if (!this.config.showTaskProgress) return;

    this.taskStates.set(taskId, {
      taskId,
      description,
      status: 'pending',
      progress: 0
    });

    const depInfo = dependencies.length > 0
      ? ` (depends on: ${dependencies.join(', ')})`
      : ' (no dependencies)';

    this.log('DEBUG', 'TASK', `Task created: ${description.substring(0, 40)}...${depInfo}`, {
      dependencies
    }, { taskId });
  }

  /**
   * Log task pronto per esecuzione
   */
  logTaskReady(taskId: string): void {
    if (!this.config.showTaskProgress) return;

    const state = this.taskStates.get(taskId);
    if (state) {
      state.status = 'ready';
      state.progress = 10;
    }

    this.log('INFO', 'TASK', 'Task ready for execution', undefined, { taskId });
  }

  /**
   * Log avvio task
   */
  logTaskStart(taskId: string, agentId: string): void {
    if (!this.config.showTaskProgress) return;

    const state = this.taskStates.get(taskId);
    if (state) {
      state.status = 'running';
      state.agentId = agentId;
      state.startTime = Date.now();
      state.progress = 50;
    }

    this.log('INFO', 'TASK', 'Task execution started', { agentId }, { taskId, agentId });
  }

  /**
   * Log completamento task
   */
  logTaskComplete(taskId: string, success: boolean, durationMs: number): void {
    if (!this.config.showTaskProgress) return;

    const state = this.taskStates.get(taskId);
    if (state) {
      state.status = success ? 'completed' : 'failed';
      state.endTime = Date.now();
      state.progress = 100;
    }

    const emoji = success ? '' : '';
    this.log(
      success ? 'INFO' : 'ERROR',
      'TASK',
      `Task ${success ? 'completed' : 'FAILED'} (${durationMs}ms)`,
      { durationMs },
      { taskId }
    );
  }

  // ===========================================================================
  // BATCH AND PARALLEL EXECUTION
  // ===========================================================================

  /**
   * Log inizio batch
   */
  logBatchStart(batchId: string, batchOrder: number, totalBatches: number, taskCount: number): void {
    this.log('INFO', 'PARALLEL', `BATCH ${batchOrder + 1}/${totalBatches} starting with ${taskCount} parallel tasks`, {
      taskCount,
      batchOrder
    }, { batchId });

    this.updateOrchestratorState({
      currentBatch: batchOrder + 1,
      totalBatches
    });

    this.printBatchBanner(batchOrder + 1, totalBatches, taskCount);
  }

  /**
   * Log completamento batch
   */
  logBatchComplete(batchId: string, completed: number, failed: number, durationMs: number): void {
    const successRate = completed / (completed + failed) * 100;

    this.log('INFO', 'PARALLEL', `BATCH completed: ${completed} success, ${failed} failed (${durationMs}ms)`, {
      completed,
      failed,
      durationMs,
      successRate: successRate.toFixed(1)
    }, { batchId });

    this.printBatchSummary(completed, failed, durationMs);
  }

  /**
   * Stampa banner del batch
   */
  private printBatchBanner(current: number, total: number, taskCount: number): void {
    console.log('\n' + this.color('-'.repeat(60), 'cyan'));
    console.log(this.color(`  BATCH ${current}/${total} - ${taskCount} tasks executing in parallel`, 'bright', 'cyan'));
    console.log(this.color('-'.repeat(60), 'cyan'));
  }

  /**
   * Stampa summary del batch
   */
  private printBatchSummary(completed: number, failed: number, durationMs: number): void {
    const total = completed + failed;
    const successRate = total > 0 ? (completed / total * 100).toFixed(1) : '0';

    console.log(this.color('-'.repeat(60), 'dim'));
    console.log(`  Completed: ${this.color(completed.toString(), 'green')} | ` +
                `Failed: ${this.color(failed.toString(), failed > 0 ? 'red' : 'green')} | ` +
                `Duration: ${this.color(durationMs + 'ms', 'yellow')} | ` +
                `Success: ${this.color(successRate + '%', parseFloat(successRate) >= 90 ? 'green' : 'yellow')}`);
    console.log(this.color('-'.repeat(60), 'dim') + '\n');
  }

  // ===========================================================================
  // CONTEXT EVENTS
  // ===========================================================================

  /**
   * Log clear del contesto
   */
  logContextClear(agentId: string, tokenCount: number, reason: string): void {
    if (!this.config.showContextEvents) return;

    this.log('DEBUG', 'CONTEXT', `Context cleared (${tokenCount} tokens) - ${reason}`, {
      tokenCount,
      reason
    }, { agentId });
  }

  // ===========================================================================
  // DEPENDENCY EVENTS
  // ===========================================================================

  /**
   * Log risoluzione dipendenza
   */
  logDependencyResolved(taskId: string, dependencyId: string): void {
    if (!this.config.showDependencyFlow) return;

    this.log('DEBUG', 'DEPENDENCY', `Dependency resolved: ${dependencyId}`, {
      dependency: dependencyId
    }, { taskId });
  }

  /**
   * Log blocco per dipendenza
   */
  logDependencyBlocked(taskId: string, waitingFor: string[]): void {
    if (!this.config.showDependencyFlow) return;

    this.log('INFO', 'DEPENDENCY', `Task blocked, waiting for: ${waitingFor.join(', ')}`, {
      waitingFor
    }, { taskId });
  }

  // ===========================================================================
  // ERROR AND FALLBACK
  // ===========================================================================

  /**
   * Log errore
   */
  logError(message: string, error: Error, context?: { taskId?: string; agentId?: string }): void {
    if (!this.config.showErrors) return;

    this.log('ERROR', 'ERROR', message, {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    }, context);
  }

  /**
   * Log fallback
   */
  logFallback(taskId: string, originalAgent: string, fallbackAgent: string, reason: string): void {
    this.log('WARN', 'FALLBACK', `Fallback triggered: ${originalAgent} -> ${fallbackAgent}`, {
      originalAgent,
      fallbackAgent,
      reason
    }, { taskId });
  }

  // ===========================================================================
  // PERFORMANCE METRICS
  // ===========================================================================

  /**
   * Log metriche performance
   */
  logPerformanceMetrics(metrics: {
    elapsedMs: number;
    avgTaskDuration: number;
    maxConcurrency: number;
    currentConcurrency: number;
    throughput: number;
  }): void {
    if (!this.config.showPerformanceMetrics) return;

    this.log('INFO', 'PERFORMANCE', 'Metrics update', metrics);
  }

  // ===========================================================================
  // SESSION END
  // ===========================================================================

  /**
   * Finalizza e stampa report della sessione
   */
  endSession(finalMetrics: {
    totalDurationMs: number;
    tasksCompleted: number;
    tasksFailed: number;
    maxConcurrencyReached: number;
    avgConcurrency: number;
    speedupFactor: number;
    totalTokensCleared: number;
  }): void {
    if (!this.config.enabled) return;

    this.orchestratorState!.status = 'completed';

    this.printFinalReport(finalMetrics);
    this.log('INFO', 'ORCHESTRATOR', 'Session completed', finalMetrics);
  }

  /**
   * Stampa report finale
   */
  private printFinalReport(metrics: any): void {
    const separator = '='.repeat(80);

    console.log('\n' + this.color(separator, 'green'));
    console.log(this.color(' ORCHESTRATION COMPLETE - FINAL REPORT '.padStart(50).padEnd(80), 'bright', 'green'));
    console.log(this.color(separator, 'green'));

    console.log(`
${this.color('EXECUTION SUMMARY', 'bright')}
  ${this.color('Total Duration:', 'cyan')}      ${metrics.totalDurationMs}ms (${(metrics.totalDurationMs / 1000).toFixed(2)}s)
  ${this.color('Tasks Completed:', 'cyan')}     ${this.color(metrics.tasksCompleted.toString(), 'green')}
  ${this.color('Tasks Failed:', 'cyan')}        ${this.color(metrics.tasksFailed.toString(), metrics.tasksFailed > 0 ? 'red' : 'green')}

${this.color('PARALLELISM METRICS', 'bright')}
  ${this.color('Max Concurrency:', 'cyan')}     ${metrics.maxConcurrencyReached} agents
  ${this.color('Avg Concurrency:', 'cyan')}     ${metrics.avgConcurrency.toFixed(2)} agents
  ${this.color('Speedup Factor:', 'cyan')}      ${this.color(metrics.speedupFactor.toFixed(2) + 'x', 'yellow')} vs sequential

${this.color('CONTEXT MANAGEMENT', 'bright')}
  ${this.color('Tokens Cleared:', 'cyan')}      ${metrics.totalTokensCleared}

${this.color('SUCCESS RATE:', 'bright')} ${this.getSuccessRateBar(metrics.tasksCompleted, metrics.tasksFailed)}
`);

    console.log(this.color(separator, 'green') + '\n');
  }

  /**
   * Genera barra del success rate
   */
  private getSuccessRateBar(completed: number, failed: number): string {
    const total = completed + failed;
    const rate = total > 0 ? (completed / total) * 100 : 0;
    const filledBlocks = Math.round(rate / 5);
    const emptyBlocks = 20 - filledBlocks;

    const color = rate >= 90 ? 'green' : rate >= 70 ? 'yellow' : 'red';
    const bar = this.color('', color).repeat(filledBlocks) + ''.repeat(emptyBlocks);

    return `${bar} ${rate.toFixed(1)}%`;
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Formatta timestamp
   */
  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[1].slice(0, -1);
  }

  /**
   * Applica colore al testo
   */
  private color(text: string, ...colors: string[]): string {
    if (!this.config.colorOutput) return text;

    const colorCodes = colors.map(c => (COLORS as any)[c] || '').join('');
    return colorCodes + text + COLORS.reset;
  }

  /**
   * Colore per livello log
   */
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case 'DEBUG': return 'dim';
      case 'INFO': return 'green';
      case 'WARN': return 'yellow';
      case 'ERROR': return 'red';
      case 'CRITICAL': return 'bgRed';
      default: return 'white';
    }
  }

  /**
   * Colore per categoria
   */
  private getCategoryColor(category: LogCategory): string {
    switch (category) {
      case 'ORCHESTRATOR': return 'cyan';
      case 'AGENT': return 'magenta';
      case 'TASK': return 'blue';
      case 'CONTEXT': return 'dim';
      case 'PARALLEL': return 'yellow';
      case 'DEPENDENCY': return 'cyan';
      case 'FALLBACK': return 'yellow';
      case 'PERFORMANCE': return 'green';
      case 'ERROR': return 'red';
      case 'SYSTEM': return 'white';
      default: return 'white';
    }
  }

  /**
   * Aggiorna stato orchestrator
   */
  private updateOrchestratorState(update: Partial<OrchestratorState>): void {
    if (this.orchestratorState) {
      Object.assign(this.orchestratorState, update);
      this.orchestratorState.elapsedMs = Date.now() - this.orchestratorState.startTime;
    }
  }

  /**
   * Ottieni stato corrente
   */
  getState(): OrchestratorState | null {
    return this.orchestratorState;
  }

  /**
   * Ottieni log history
   */
  getLogHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Reset del visualizer
   */
  reset(): void {
    this.logHistory = [];
    this.agentStates.clear();
    this.taskStates.clear();
    this.orchestratorState = null;
    this.lineCount = 0;
  }
}

// =============================================================================
// FACTORY AND SINGLETON
// =============================================================================

export function createOrchestratorVisualizer(
  config?: Partial<VisualizerConfig>
): OrchestratorVisualizer {
  return new OrchestratorVisualizer(config);
}

let globalVisualizer: OrchestratorVisualizer | null = null;

export function getGlobalVisualizer(): OrchestratorVisualizer {
  if (!globalVisualizer) {
    globalVisualizer = createOrchestratorVisualizer({
      enabled: true,
      showTimestamps: true,
      showAgentActivity: true,
      showTaskProgress: true,
      showPerformanceMetrics: true,
      showContextEvents: true,
      showDependencyFlow: true,
      showErrors: true,
      colorOutput: true,
      minLogLevel: 'INFO'
    });
  }
  return globalVisualizer;
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR GLOBAL LOGGING
// =============================================================================

export const visualizer = {
  startSession: (sessionId: string, totalTasks: number, maxConcurrency: number) =>
    getGlobalVisualizer().startSession(sessionId, totalTasks, maxConcurrency),

  log: (level: LogLevel, category: LogCategory, message: string, data?: any, options?: any) =>
    getGlobalVisualizer().log(level, category, message, data, options),

  agentStart: (agentId: string, taskId: string, taskDescription: string) =>
    getGlobalVisualizer().logAgentStart(agentId, taskId, taskDescription),

  agentComplete: (agentId: string, taskId: string, success: boolean, durationMs: number) =>
    getGlobalVisualizer().logAgentComplete(agentId, taskId, success, durationMs),

  taskCreated: (taskId: string, description: string, dependencies: string[]) =>
    getGlobalVisualizer().logTaskCreated(taskId, description, dependencies),

  taskReady: (taskId: string) =>
    getGlobalVisualizer().logTaskReady(taskId),

  taskStart: (taskId: string, agentId: string) =>
    getGlobalVisualizer().logTaskStart(taskId, agentId),

  taskComplete: (taskId: string, success: boolean, durationMs: number) =>
    getGlobalVisualizer().logTaskComplete(taskId, success, durationMs),

  batchStart: (batchId: string, batchOrder: number, totalBatches: number, taskCount: number) =>
    getGlobalVisualizer().logBatchStart(batchId, batchOrder, totalBatches, taskCount),

  batchComplete: (batchId: string, completed: number, failed: number, durationMs: number) =>
    getGlobalVisualizer().logBatchComplete(batchId, completed, failed, durationMs),

  contextClear: (agentId: string, tokenCount: number, reason: string) =>
    getGlobalVisualizer().logContextClear(agentId, tokenCount, reason),

  error: (message: string, error: Error, context?: any) =>
    getGlobalVisualizer().logError(message, error, context),

  fallback: (taskId: string, originalAgent: string, fallbackAgent: string, reason: string) =>
    getGlobalVisualizer().logFallback(taskId, originalAgent, fallbackAgent, reason),

  endSession: (metrics: any) =>
    getGlobalVisualizer().endSession(metrics)
};
