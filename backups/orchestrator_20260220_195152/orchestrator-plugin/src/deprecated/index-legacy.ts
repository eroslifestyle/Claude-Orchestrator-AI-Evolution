/**
 * Orchestrator Plugin - Main Entry Point
 *
 * This is the main entry point for the Claude Code Orchestrator Plugin.
 * It provides intelligent multi-agent orchestration capabilities with
 * automatic agent selection, parallelism management, and cost optimization.
 *
 * @version 1.0.0
 * @author Development Team
 */

import { OrchestratorEngine } from './core/orchestrator-engine';
import { ConfigLoader } from './utils/config-loader';
import { PluginLogger } from './utils/logger';
import type {
  OrchestratorOptions,
  OrchestratorResult,
  ExecutionPlan,
  PluginCommand,
  CommandHandler,
  SessionSummary,
} from './types';

// Initialize logger
const logger = new PluginLogger('OrchestratorPlugin');

// Plugin metadata
export const PLUGIN_INFO = {
  name: 'orchestrator-plugin',
  version: '1.0.0',
  description: 'Intelligent multi-agent orchestration for Claude Code',
  author: 'Development Team',
} as const;

/**
 * Main Orchestrator Plugin class
 * Implements the Claude Code plugin interface
 */
export class OrchestratorPlugin {
  private engine: OrchestratorEngine;
  private config: any;

  constructor() {
    logger.info('Initializing Orchestrator Plugin v1.0.0');

    // Load configuration
    this.config = ConfigLoader.loadConfig();

    // Initialize orchestration engine
    this.engine = new OrchestratorEngine(this.config);

    logger.info('Orchestrator Plugin initialized successfully');
  }

  /**
   * Get plugin metadata
   */
  getPluginInfo() {
    return PLUGIN_INFO;
  }

  /**
   * Get available commands
   */
  getCommands(): PluginCommand[] {
    return [
      {
        name: 'orchestrator',
        description: 'Orchestrate multi-agent task execution',
        usage: '/orchestrator "<natural language description>" [options]',
        examples: [
          '/orchestrator "Add OAuth2 login with secure session storage"',
          '/orchestrator "Fix GUI alignment bug" --budget 50',
          '/orchestrator "Optimize database queries" --time-limit 30m',
        ],
        handler: this.handleOrchestrateCommand.bind(this),
      },
      {
        name: 'orchestrator-preview',
        description: 'Preview orchestration plan without execution',
        usage: '/orchestrator-preview "<description>"',
        examples: [
          '/orchestrator-preview "Add dark mode toggle to settings"',
          '/orchestrator-preview "Implement user authentication system"',
        ],
        handler: this.handlePreviewCommand.bind(this),
      },
      {
        name: 'orchestrator-resume',
        description: 'Resume interrupted orchestration session',
        usage: '/orchestrator-resume <session-id>',
        examples: [
          '/orchestrator-resume a7f3c9d2-4e8b-1234-5678-90abcdef1234',
        ],
        handler: this.handleResumeCommand.bind(this),
      },
      {
        name: 'orchestrator-list',
        description: 'List recent orchestration sessions',
        usage: '/orchestrator-list [--limit N]',
        examples: [
          '/orchestrator-list',
          '/orchestrator-list --limit 5',
        ],
        handler: this.handleListCommand.bind(this),
      },
      {
        name: 'orchestrator-status',
        description: 'Show status of running or recent orchestration',
        usage: '/orchestrator-status [session-id]',
        examples: [
          '/orchestrator-status',
          '/orchestrator-status a7f3c9d2',
        ],
        handler: this.handleStatusCommand.bind(this),
      },
    ];
  }

  /**
   * Handle /orchestrator command
   */
  private async handleOrchestrateCommand(args: string[]): Promise<string> {
    try {
      logger.info('Processing orchestrate command', { args });

      // Parse command arguments
      const { request, options } = this.parseOrchestrateArgs(args);

      if (!request) {
        return this.showOrchestrateHelp();
      }

      // Show initial analysis
      console.log('🎯 ORCHESTRATOR PLUGIN v1.0 - ANALYZING REQUEST...\n');

      // Execute orchestration
      const result = await this.engine.orchestrate(request, options);

      // Return formatted result
      return this.formatOrchestrateResult(result);

    } catch (error) {
      logger.error('Failed to execute orchestrate command', { error });
      return this.formatError('Orchestration failed', error);
    }
  }

  /**
   * Handle /orchestrator-preview command
   */
  private async handlePreviewCommand(args: string[]): Promise<string> {
    try {
      logger.info('Processing orchestrate-preview command', { args });

      const request = args.join(' ').replace(/^["']|["']$/g, '');

      if (!request) {
        return 'Usage: /orchestrator-preview "<description>"\nExample: /orchestrator-preview "Add OAuth2 login"';
      }

      console.log('🎯 ORCHESTRATOR PLUGIN - PREVIEW MODE\n');

      // Generate execution plan
      const plan = await this.engine.preview(request);

      // Return formatted plan
      return this.formatExecutionPlan(plan);

    } catch (error) {
      logger.error('Failed to generate preview', { error });
      return this.formatError('Preview generation failed', error);
    }
  }

  /**
   * Handle /orchestrator-resume command
   */
  private async handleResumeCommand(args: string[]): Promise<string> {
    try {
      const sessionId = args[0];

      if (!sessionId) {
        return 'Usage: /orchestrator-resume <session-id>\nExample: /orchestrator-resume a7f3c9d2';
      }

      console.log(`🔄 RESUMING ORCHESTRATION SESSION: ${sessionId}\n`);

      const result = await this.engine.resume(sessionId);
      return this.formatOrchestrateResult(result);

    } catch (error) {
      logger.error('Failed to resume orchestration', { error, sessionId: args[0] });
      return this.formatError('Session resume failed', error);
    }
  }

  /**
   * Handle /orchestrator-list command
   */
  private async handleListCommand(args: string[]): Promise<string> {
    try {
      // Parse limit option
      const limitIndex = args.indexOf('--limit');
      const limit = limitIndex >= 0 && limitIndex + 1 < args.length
        ? parseInt(args[limitIndex + 1], 10)
        : 10;

      // Get recent sessions (TODO: implement session management)
      const sessions = await this.getRecentSessions(limit);

      return this.formatSessionList(sessions);

    } catch (error) {
      logger.error('Failed to list sessions', { error });
      return this.formatError('Session listing failed', error);
    }
  }

  /**
   * Handle /orchestrator-status command
   */
  private async handleStatusCommand(args: string[]): Promise<string> {
    try {
      const sessionId = args[0];

      if (!sessionId) {
        // Show current status
        return this.formatCurrentStatus();
      } else {
        // Show specific session status
        const status = await this.getSessionStatus(sessionId);
        return this.formatSessionStatus(status);
      }

    } catch (error) {
      logger.error('Failed to get status', { error, sessionId: args[0] });
      return this.formatError('Status retrieval failed', error);
    }
  }

  /**
   * Parse orchestrate command arguments
   */
  private parseOrchestrateArgs(args: string[]): { request: string; options: OrchestratorOptions } {
    const request = args.find(arg => !arg.startsWith('--'))?.replace(/^["']|["']$/g, '') || '';
    const options: OrchestratorOptions = {};

    // Parse options
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--budget' && i + 1 < args.length) {
        options.budget = parseFloat(args[i + 1]);
      } else if (arg === '--time-limit' && i + 1 < args.length) {
        const timeStr = args[i + 1];
        options.timeLimit = this.parseTimeLimit(timeStr);
      } else if (arg === '--model-preference' && i + 1 < args.length) {
        const model = args[i + 1];
        if (['haiku', 'sonnet', 'opus'].includes(model)) {
          options.modelPreference = model as 'haiku' | 'sonnet' | 'opus';
        }
      } else if (arg === '--max-parallel' && i + 1 < args.length) {
        options.maxParallel = parseInt(args[i + 1], 10);
      } else if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg === '--no-confirm') {
        options.confirmBefore = false;
      }
    }

    return { request, options };
  }

  /**
   * Parse time limit string (e.g., "30m", "1h", "90s")
   */
  private parseTimeLimit(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smh])$/);
    if (!match) return 0;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      default: return 0;
    }
  }

  /**
   * Show orchestrate command help
   */
  private showOrchestrateHelp(): string {
    return `🎯 Orchestrator Plugin - Help

Usage: /orchestrator "<description>" [options]

Options:
  --budget N          Set maximum cost in cents (e.g., --budget 100 for $1.00)
  --time-limit TIME   Set time limit (e.g., --time-limit 30m)
  --model-preference  Prefer specific model (haiku/sonnet/opus)
  --max-parallel N    Max parallel agents (default: 20)
  --dry-run          Preview only, don't execute
  --no-confirm       Skip confirmation prompt

Examples:
  /orchestrator "Add OAuth2 login with JWT sessions"
  /orchestrator "Fix GUI bug" --budget 50 --time-limit 15m
  /orchestrator "Optimize queries" --model-preference sonnet

Other Commands:
  /orchestrator-preview "<description>"  - Preview execution plan
  /orchestrator-resume <session-id>      - Resume interrupted session
  /orchestrator-list                     - Show recent sessions
  /orchestrator-status                   - Show current status
`;
  }

  /**
   * Format orchestration result for display
   */
  private formatOrchestrateResult(result: OrchestratorResult): string {
    const { success, metrics, taskResults, aggregatedResult } = result;

    const statusIcon = success ? '✨' : '💥';
    const statusText = success ? 'ORCHESTRATION COMPLETE' : 'ORCHESTRATION FAILED';

    const duration = (metrics.totalTime / 1000 / 60).toFixed(1); // Convert to minutes

    let output = `${statusIcon} ${statusText} (${duration} min)\n\n`;

    // Summary stats
    output += `📊 FINAL REPORT\n`;
    output += `├─ Success: ${taskResults.filter(t => t.status === 'completed').length}/${taskResults.length} tasks completed\n`;
    output += `├─ Time: ${duration} min\n`;
    output += `├─ Cost: $${metrics.totalCost.toFixed(2)}\n`;
    output += `├─ Model Usage: `;

    const modelUsage = Object.entries(metrics.modelUsage)
      .map(([model, tokens]) => `${model} ${((tokens / metrics.totalTokens) * 100).toFixed(0)}%`)
      .join(' | ');
    output += `${modelUsage}\n`;

    output += `└─ Files Modified: ${aggregatedResult.filesModified.length} files\n\n`;

    // Files modified
    if (aggregatedResult.filesModified.length > 0) {
      output += `📁 FILES MODIFIED\n`;
      for (const file of aggregatedResult.filesModified) {
        output += `├─ ${file.path} (${file.description})\n`;
      }
      output += '\n';
    }

    // Session ID for reference
    output += `Session ID: ${result.sessionId.slice(0, 8)} (for reference or resume)\n`;

    return output;
  }

  /**
   * Format execution plan for preview
   */
  private formatExecutionPlan(plan: ExecutionPlan): string {
    let output = `📊 REQUEST ANALYSIS\n`;
    output += `├─ Domains: ${plan.tasks.map(t => t.metadata?.domain).filter(Boolean).join(', ')}\n`;
    output += `├─ Complexity: ${this.getOverallComplexity(plan)}\n`;
    output += `├─ Files: ${this.estimateFileCount(plan)}\n`;
    output += `└─ Est. time: ${(plan.totalEstimate.time).toFixed(0)} min\n\n`;

    output += `🤖 EXECUTION PLAN\n\n`;
    output += `| # | Task | Agent Expert File | Model | Depends | Est. |\n`;
    output += `|---|------|-------------------|-------|---------|------|\n`;

    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i];
      const taskNum = `T${i + 1}`;
      const deps = task.dependencies.length > 0
        ? task.dependencies.map(d => `T${plan.tasks.findIndex(t => t.id === d) + 1}`).join(',')
        : '-';

      output += `| ${taskNum} | ${task.description.slice(0, 18)}... | ${task.agentFile} | ${task.model} | ${deps} | ${task.estimatedTime}m |\n`;
    }

    output += `\n`;
    output += `Total: ${plan.tasks.length} agents | ${plan.parallelBatches.length} batches | ~${plan.totalEstimate.time.toFixed(0)} min | Est. cost: $${plan.totalEstimate.cost.toFixed(2)}\n`;

    return output;
  }

  /**
   * Format error message
   */
  private formatError(message: string, error: any): string {
    return `❌ ${message}\n\nDetails: ${error.message || error}\n\nFor help: /orchestrator --help`;
  }

  // ==============================================================================
  // SESSION MANAGEMENT - Now Implemented
  // ==============================================================================

  private async getRecentSessions(limit: number): Promise<SessionSummary[]> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const sessionsDir = path.join(os.homedir(), '.claude', '.orchestrator', 'sessions');

      // Create directory if it doesn't exist
      if (!fs.existsSync(sessionsDir)) {
        return [];
      }

      const files = fs.readdirSync(sessionsDir);
      const sessionFiles = files
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(sessionsDir, a));
          const statB = fs.statSync(path.join(sessionsDir, b));
          return statB.mtimeMs - statA.mtimeMs; // Sort by modification time, newest first
        })
        .slice(0, limit);

      const sessions: SessionSummary[] = [];
      for (const file of sessionFiles) {
        try {
          const content = fs.readFileSync(path.join(sessionsDir, file), 'utf-8');
          const session = JSON.parse(content);
          sessions.push({
            sessionId: session.sessionId || file.replace('.json', ''),
            userRequest: session.userRequest || 'Unknown',
            status: session.status || 'unknown',
            startTime: new Date(session.startTime || Date.now()),
            taskCount: session.taskResults?.length || 0,
          });
        } catch {
          // Skip invalid session files
          continue;
        }
      }

      return sessions;
    } catch {
      return [];
    }
  }

  private async getSessionStatus(sessionId: string): Promise<any> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const sessionFile = path.join(os.homedir(), '.claude', '.orchestrator', 'sessions', `${sessionId}.json`);

      if (!fs.existsSync(sessionFile)) {
        return { sessionId, status: 'not_found', error: 'Session not found' };
      }

      const content = fs.readFileSync(sessionFile, 'utf-8');
      const session = JSON.parse(content);

      return {
        sessionId: session.sessionId,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        taskCount: session.taskResults?.length || 0,
        completedTasks: session.taskResults?.filter((t: any) => t.status === 'completed').length || 0,
        userRequest: session.userRequest,
      };
    } catch {
      return { sessionId, status: 'error', error: 'Failed to read session' };
    }
  }

  private formatSessionList(sessions: SessionSummary[]): string {
    if (sessions.length === 0) {
      return '📋 No recent orchestration sessions found.\n\nTip: Use /orchestrator to start a new session.';
    }

    let output = '📋 RECENT ORCHESTRATION SESSIONS\n\n';

    for (const session of sessions) {
      const icon = session.status === 'completed' ? '✅' : session.status === 'failed' ? '❌' : '⏳';
      const timeAgo = this.getTimeAgo(session.startTime);
      output += `${icon} [${session.sessionId}] ${session.userRequest.substring(0, 50)}${session.userRequest.length > 50 ? '...' : ''}\n`;
      output += `   └─ Status: ${session.status} | Tasks: ${session.taskCount} | ${timeAgo}\n\n`;
    }

    return output;
  }

  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  private formatCurrentStatus(): string {
    return '📊 ORCHESTRATOR STATUS\n\n├─ Plugin: Active\n├─ Version: 1.0.0\n└─ No active sessions\n';
  }

  private formatSessionStatus(status: any): string {
    return `📊 SESSION STATUS: ${status.sessionId}\n\n├─ Status: ${status.status}\n└─ Details: Not implemented yet\n`;
  }

  private getOverallComplexity(plan: ExecutionPlan): string {
    // Simple heuristic based on number of agents and domains
    if (plan.tasks.length <= 2) return 'Low';
    if (plan.tasks.length <= 5) return 'Medium';
    return 'High';
  }

  private estimateFileCount(plan: ExecutionPlan): string {
    const baseCount = Math.ceil(plan.tasks.length * 0.8);
    return `${baseCount}-${baseCount + 2}`;
  }
}

/**
 * Plugin factory function
 * This is called by Claude Code to initialize the plugin
 */
export function createPlugin(): OrchestratorPlugin {
  return new OrchestratorPlugin();
}

/**
 * Export types for external usage
 */
export type {
  OrchestratorOptions,
  OrchestratorResult,
  ExecutionPlan,
  PluginCommand,
  CommandHandler,
  SessionSummary,
};

/**
 * Default export
 */
export default OrchestratorPlugin;