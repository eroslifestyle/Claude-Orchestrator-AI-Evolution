/**
 * AGENT CONTEXT MANAGER - Clear Context Before Each Execution
 *
 * Regola che garantisce che ogni agent esegua con contesto pulito
 * per performance ottimali. Prima di ogni esecuzione:
 * 1. Clear della conversazione precedente
 * 2. Reset del contesto agent
 * 3. Preload solo delle info essenziali
 *
 * PRINCIPIO: Ogni agent parte SEMPRE con contesto pulito per
 * massimizzare performance e evitare context bloat.
 *
 * @version 1.0
 * @date 2026-02-03
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentContext {
  agentId: string;
  sessionId: string;
  conversationHistory: ConversationTurn[];
  tokenCount: number;
  maxTokens: number;
  createdAt: number;
  lastAccessAt: number;
  clearCount: number;
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokenEstimate: number;
}

export interface ContextClearResult {
  agentId: string;
  previousTokenCount: number;
  clearedAt: number;
  reason: ContextClearReason;
}

export type ContextClearReason =
  | 'pre_execution'
  | 'token_limit_reached'
  | 'manual_clear'
  | 'error_recovery'
  | 'task_switch'
  | 'periodic_cleanup';

export interface ContextManagerConfig {
  maxTokensBeforeAutoClear: number;
  clearBeforeEachExecution: boolean;
  preserveSystemPrompt: boolean;
  preserveLastNTurns: number;
  enableContextCompression: boolean;
  compressionThreshold: number;
  periodicCleanupIntervalMs: number;
  logClearEvents: boolean;
}

export interface ContextStats {
  totalClears: number;
  totalTokensSaved: number;
  avgTokensBeforeClear: number;
  clearsByReason: Record<ContextClearReason, number>;
}

// =============================================================================
// CONTEXT MANAGER
// =============================================================================

export class AgentContextManager extends EventEmitter {
  private config: ContextManagerConfig;
  private contexts: Map<string, AgentContext> = new Map();
  private stats: ContextStats;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ContextManagerConfig> = {}) {
    super();
    this.config = {
      maxTokensBeforeAutoClear: 50000,
      clearBeforeEachExecution: true,  // REGOLA PRINCIPALE
      preserveSystemPrompt: true,
      preserveLastNTurns: 0,  // Di default non preserva nulla
      enableContextCompression: false,
      compressionThreshold: 30000,
      periodicCleanupIntervalMs: 60000,
      logClearEvents: true,
      ...config
    };

    this.stats = {
      totalClears: 0,
      totalTokensSaved: 0,
      avgTokensBeforeClear: 0,
      clearsByReason: {
        'pre_execution': 0,
        'token_limit_reached': 0,
        'manual_clear': 0,
        'error_recovery': 0,
        'task_switch': 0,
        'periodic_cleanup': 0
      }
    };

    // Start periodic cleanup if configured
    if (this.config.periodicCleanupIntervalMs > 0) {
      this.startPeriodicCleanup();
    }
  }

  // ===========================================================================
  // CORE RULE: CLEAR BEFORE EXECUTION
  // ===========================================================================

  /**
   * Prepara il contesto per l'esecuzione di un agent
   * REGOLA: SEMPRE clear prima dell'esecuzione per performance ottimali
   */
  async prepareForExecution(agentId: string, taskDescription: string): Promise<{
    context: AgentContext;
    wasCleared: boolean;
    clearResult?: ContextClearResult;
  }> {
    let context = this.contexts.get(agentId);
    let wasCleared = false;
    let clearResult: ContextClearResult | undefined;

    // Se la regola è attiva, SEMPRE clear prima dell'esecuzione
    if (this.config.clearBeforeEachExecution) {
      if (context && context.conversationHistory.length > 0) {
        clearResult = await this.clearContext(agentId, 'pre_execution');
        wasCleared = true;

        if (this.config.logClearEvents) {
          console.log(`[CONTEXT] Cleared ${clearResult.previousTokenCount} tokens for agent ${agentId} before execution`);
        }
      }
    }

    // Crea o recupera il contesto
    context = this.getOrCreateContext(agentId);

    // Aggiungi task description come contesto minimo
    this.addSystemContext(agentId, `Current Task: ${taskDescription}`);

    this.emit('preparedForExecution', {
      agentId,
      wasCleared,
      tokenCount: context.tokenCount
    });

    return { context, wasCleared, clearResult };
  }

  /**
   * Clear completo del contesto di un agent
   */
  async clearContext(agentId: string, reason: ContextClearReason): Promise<ContextClearResult> {
    const context = this.contexts.get(agentId);
    const previousTokenCount = context?.tokenCount || 0;
    const now = Date.now();

    // Reset del contesto
    if (context) {
      // Opzionalmente preserva system prompt
      const systemPrompts = this.config.preserveSystemPrompt
        ? context.conversationHistory.filter(t => t.role === 'system').slice(0, 1)
        : [];

      // Opzionalmente preserva ultimi N turns
      const preservedTurns = this.config.preserveLastNTurns > 0
        ? context.conversationHistory.slice(-this.config.preserveLastNTurns)
        : [];

      context.conversationHistory = [...systemPrompts, ...preservedTurns];
      context.tokenCount = this.estimateTokens(context.conversationHistory);
      context.clearCount++;
      context.lastAccessAt = now;
    }

    // Update stats
    this.stats.totalClears++;
    this.stats.totalTokensSaved += previousTokenCount;
    this.stats.clearsByReason[reason]++;
    this.stats.avgTokensBeforeClear =
      this.stats.totalTokensSaved / this.stats.totalClears;

    const result: ContextClearResult = {
      agentId,
      previousTokenCount,
      clearedAt: now,
      reason
    };

    this.emit('contextCleared', result);
    return result;
  }

  // ===========================================================================
  // CONTEXT MANAGEMENT
  // ===========================================================================

  /**
   * Ottiene o crea un contesto per un agent
   */
  getOrCreateContext(agentId: string): AgentContext {
    let context = this.contexts.get(agentId);

    if (!context) {
      context = {
        agentId,
        sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conversationHistory: [],
        tokenCount: 0,
        maxTokens: this.config.maxTokensBeforeAutoClear,
        createdAt: Date.now(),
        lastAccessAt: Date.now(),
        clearCount: 0
      };
      this.contexts.set(agentId, context);
    }

    context.lastAccessAt = Date.now();
    return context;
  }

  /**
   * Aggiunge un messaggio system al contesto
   */
  addSystemContext(agentId: string, content: string): void {
    const context = this.getOrCreateContext(agentId);
    const tokenEstimate = this.estimateTokensForText(content);

    context.conversationHistory.push({
      role: 'system',
      content,
      timestamp: Date.now(),
      tokenEstimate
    });

    context.tokenCount += tokenEstimate;
    this.checkTokenLimit(agentId);
  }

  /**
   * Aggiunge una risposta assistant al contesto
   */
  addAssistantResponse(agentId: string, content: string): void {
    const context = this.getOrCreateContext(agentId);
    const tokenEstimate = this.estimateTokensForText(content);

    context.conversationHistory.push({
      role: 'assistant',
      content,
      timestamp: Date.now(),
      tokenEstimate
    });

    context.tokenCount += tokenEstimate;
    this.checkTokenLimit(agentId);
  }

  /**
   * Aggiunge un messaggio user al contesto
   */
  addUserMessage(agentId: string, content: string): void {
    const context = this.getOrCreateContext(agentId);
    const tokenEstimate = this.estimateTokensForText(content);

    context.conversationHistory.push({
      role: 'user',
      content,
      timestamp: Date.now(),
      tokenEstimate
    });

    context.tokenCount += tokenEstimate;
    this.checkTokenLimit(agentId);
  }

  /**
   * Verifica e gestisce il limite di token
   */
  private checkTokenLimit(agentId: string): void {
    const context = this.contexts.get(agentId);
    if (!context) return;

    if (context.tokenCount >= this.config.maxTokensBeforeAutoClear) {
      this.clearContext(agentId, 'token_limit_reached');

      if (this.config.logClearEvents) {
        console.log(`[CONTEXT] Auto-cleared ${agentId} due to token limit (${context.tokenCount} tokens)`);
      }
    }
  }

  // ===========================================================================
  // BATCH OPERATIONS
  // ===========================================================================

  /**
   * Clear di tutti i contesti prima di un batch parallelo
   * Garantisce che tutti gli agent partano con contesto pulito
   */
  async clearAllForBatch(agentIds: string[], reason: ContextClearReason = 'pre_execution'): Promise<ContextClearResult[]> {
    console.log(`[CONTEXT] Clearing contexts for ${agentIds.length} agents before batch execution...`);

    const results = await Promise.all(
      agentIds.map(agentId => this.clearContext(agentId, reason))
    );

    const totalTokensCleared = results.reduce((sum, r) => sum + r.previousTokenCount, 0);
    console.log(`[CONTEXT] Cleared ${totalTokensCleared} total tokens from ${agentIds.length} agents`);

    this.emit('batchCleared', {
      agentCount: agentIds.length,
      totalTokensCleared,
      results
    });

    return results;
  }

  /**
   * Prepara multipli agent per esecuzione parallela
   */
  async prepareMultipleForExecution(
    agentTasks: Array<{ agentId: string; taskDescription: string }>
  ): Promise<Map<string, { context: AgentContext; wasCleared: boolean }>> {
    const results = new Map<string, { context: AgentContext; wasCleared: boolean }>();

    // First, clear all contexts
    if (this.config.clearBeforeEachExecution) {
      await this.clearAllForBatch(
        agentTasks.map(at => at.agentId),
        'pre_execution'
      );
    }

    // Then prepare each
    for (const { agentId, taskDescription } of agentTasks) {
      const result = await this.prepareForExecution(agentId, taskDescription);
      results.set(agentId, {
        context: result.context,
        wasCleared: result.wasCleared
      });
    }

    return results;
  }

  // ===========================================================================
  // PERIODIC CLEANUP
  // ===========================================================================

  /**
   * Avvia cleanup periodico dei contesti inattivi
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performPeriodicCleanup();
    }, this.config.periodicCleanupIntervalMs);
  }

  /**
   * Esegue cleanup periodico
   */
  private performPeriodicCleanup(): void {
    const now = Date.now();
    const staleThreshold = this.config.periodicCleanupIntervalMs * 2;

    for (const [agentId, context] of Array.from(this.contexts.entries())) {
      if (now - context.lastAccessAt > staleThreshold && context.tokenCount > 0) {
        this.clearContext(agentId, 'periodic_cleanup');

        if (this.config.logClearEvents) {
          console.log(`[CONTEXT] Periodic cleanup for inactive agent ${agentId}`);
        }
      }
    }
  }

  // ===========================================================================
  // TOKEN ESTIMATION
  // ===========================================================================

  /**
   * Stima i token per un array di turns
   */
  private estimateTokens(turns: ConversationTurn[]): number {
    return turns.reduce((sum, turn) => sum + turn.tokenEstimate, 0);
  }

  /**
   * Stima i token per un testo
   * Usa approssimazione: ~4 caratteri per token
   */
  private estimateTokensForText(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // ===========================================================================
  // STATS & DIAGNOSTICS
  // ===========================================================================

  /**
   * Ottiene le statistiche del context manager
   */
  getStats(): ContextStats {
    return { ...this.stats };
  }

  /**
   * Ottiene info su tutti i contesti attivi
   */
  getActiveContexts(): Array<{
    agentId: string;
    tokenCount: number;
    turnCount: number;
    lastAccess: number;
  }> {
    return Array.from(this.contexts.entries()).map(([agentId, ctx]) => ({
      agentId,
      tokenCount: ctx.tokenCount,
      turnCount: ctx.conversationHistory.length,
      lastAccess: ctx.lastAccessAt
    }));
  }

  /**
   * Ottiene il contesto di un agent specifico
   */
  getContext(agentId: string): AgentContext | undefined {
    return this.contexts.get(agentId);
  }

  /**
   * Genera report dello stato dei contesti
   */
  generateReport(): string {
    const contexts = this.getActiveContexts();
    const totalTokens = contexts.reduce((sum, c) => sum + c.tokenCount, 0);

    return `
=== AGENT CONTEXT MANAGER REPORT ===

Configuration:
- Clear Before Each Execution: ${this.config.clearBeforeEachExecution}
- Max Tokens Before Auto-Clear: ${this.config.maxTokensBeforeAutoClear}
- Preserve System Prompt: ${this.config.preserveSystemPrompt}
- Preserve Last N Turns: ${this.config.preserveLastNTurns}

Statistics:
- Total Clears: ${this.stats.totalClears}
- Total Tokens Saved: ${this.stats.totalTokensSaved}
- Avg Tokens Before Clear: ${this.stats.avgTokensBeforeClear.toFixed(0)}

Clears by Reason:
${Object.entries(this.stats.clearsByReason)
  .filter(([_, count]) => count > 0)
  .map(([reason, count]) => `  - ${reason}: ${count}`)
  .join('\n')}

Active Contexts: ${contexts.length}
Total Active Tokens: ${totalTokens}

${contexts.length > 0 ? 'Context Details:\n' + contexts
  .map(c => `  - ${c.agentId}: ${c.tokenCount} tokens, ${c.turnCount} turns`)
  .join('\n') : ''}
===================================
    `.trim();
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Pulisce tutte le risorse
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.contexts.clear();
    this.removeAllListeners();
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createAgentContextManager(
  config?: Partial<ContextManagerConfig>
): AgentContextManager {
  return new AgentContextManager(config);
}

// =============================================================================
// SINGLETON INSTANCE FOR GLOBAL USE
// =============================================================================

let globalContextManager: AgentContextManager | null = null;

export function getGlobalContextManager(): AgentContextManager {
  if (!globalContextManager) {
    globalContextManager = createAgentContextManager({
      clearBeforeEachExecution: true,
      logClearEvents: true
    });
  }
  return globalContextManager;
}

// =============================================================================
// EXECUTION WRAPPER
// =============================================================================

/**
 * Wrapper che garantisce clear del contesto prima di ogni esecuzione
 */
export async function executeWithCleanContext<T>(
  agentId: string,
  taskDescription: string,
  executor: () => Promise<T>
): Promise<T> {
  const contextManager = getGlobalContextManager();

  // REGOLA: Clear SEMPRE prima dell'esecuzione
  await contextManager.prepareForExecution(agentId, taskDescription);

  try {
    const result = await executor();
    return result;
  } finally {
    // Registra la risposta per analytics (opzionale)
    contextManager.addAssistantResponse(agentId, '[Execution completed]');
  }
}

/**
 * Wrapper per esecuzione batch con clear automatico
 */
export async function executeBatchWithCleanContexts<T>(
  tasks: Array<{ agentId: string; taskDescription: string; executor: () => Promise<T> }>
): Promise<Array<{ agentId: string; result: T | Error; success: boolean }>> {
  const contextManager = getGlobalContextManager();

  // REGOLA: Clear di TUTTI i contesti prima del batch
  await contextManager.prepareMultipleForExecution(
    tasks.map(t => ({ agentId: t.agentId, taskDescription: t.taskDescription }))
  );

  // Esecuzione parallela
  const results = await Promise.allSettled(
    tasks.map(async (task) => {
      const result = await task.executor();
      return { agentId: task.agentId, result };
    })
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') {
      return { agentId: tasks[i].agentId, result: r.value.result, success: true };
    } else {
      return { agentId: tasks[i].agentId, result: r.reason, success: false };
    }
  });
}
