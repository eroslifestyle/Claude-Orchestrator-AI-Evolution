/**
 * Advanced CLI Interface for Claude Code Orchestrator Plugin
 *
 * Provides interactive mode with command completion, rich formatting,
 * and session persistence for optimal user experience.
 *
 * @version 1.0.0
 * @author Development Team
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { table as createTable } from 'table';
import { performance } from 'perf_hooks';

import { OrchestratorV4 as OrchestratorEngine } from '../orchestrator-v4-unified';
import { PluginLogger } from '../utils/logger';
import type {
  OrchestratorOptions,
  OrchestratorResult,
  ExecutionPlan,
  CLISession,
  CLIHistory,
  CLIHistoryEntry,
  ProgressUpdate,
  Task,
  DependencyGraph
} from '../types';

/**
 * Advanced CLI Interface with Interactive Features
 */
export class CLIInterface {
  private readonly logger: PluginLogger;
  private readonly engine: OrchestratorEngine;
  private readonly sessionPath: string;
  private readonly historyPath: string;

  private rl: readline.Interface | null = null;
  private session: CLISession;
  private history: CLIHistory;
  private currentSpinner: Ora | null = null;
  private isInteractiveMode: boolean = false;

  // Performance metrics
  private performanceMetrics = {
    commandResponse: 0,
    historySearch: 0,
    autoCompletion: 0,
    sessionLoad: 0
  };

  constructor(engine: OrchestratorEngine) {
    this.logger = new PluginLogger('CLIInterface');
    this.engine = engine;

    // Setup session and history paths
    const cliDir = path.join(os.homedir(), '.claude', 'orchestrator');
    this.sessionPath = path.join(cliDir, 'session.json');
    this.historyPath = path.join(cliDir, 'history.json');

    // Ensure directory exists
    fs.mkdirSync(cliDir, { recursive: true });

    // Initialize session and history
    this.session = this.loadSession();
    this.history = this.loadHistory();

    this.logger.info('CLI Interface initialized');
  }

  /**
   * Start Interactive Mode
   */
  async startInteractiveMode(): Promise<void> {
    this.isInteractiveMode = true;

    this.displayWelcome();

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('orchestrator> '),
      completer: this.completer.bind(this),
      historySize: 100
    });

    // Load command history into readline
    this.loadReadlineHistory();

    this.rl.prompt();

    this.rl.on('line', async (input) => {
      await this.handleInteractiveCommand(input.trim());
      this.rl!.prompt();
    });

    this.rl.on('close', () => {
      this.saveSession();
      this.saveHistory();
      console.log(chalk.yellow('\n👋 Goodbye! Session saved.'));
      process.exit(0);
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      if (this.currentSpinner) {
        this.currentSpinner.fail('Operation cancelled');
      }
      this.rl?.close();
    });
  }

  /**
   * Execute Single Command (Non-Interactive)
   */
  async executeCommand(command: string, args: string[]): Promise<string> {
    const startTime = performance.now();

    try {
      const result = await this.processCommand(command, args);

      // Update performance metrics
      this.performanceMetrics.commandResponse = performance.now() - startTime;

      // Add to history
      this.addToHistory(command, args, true);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addToHistory(command, args, false, errorMessage);
      throw error;
    }
  }

  /**
   * Handle Interactive Command
   */
  private async handleInteractiveCommand(input: string): Promise<void> {
    if (!input) return;

    const startTime = performance.now();

    const parts = this.parseCommand(input);
    const [command, ...args] = parts;

    // Handle built-in commands
    switch (command) {
      case 'help':
      case '?':
        this.displayHelp();
        return;

      case 'history':
        this.displayHistory(parseInt(args[0]) || 10);
        return;

      case 'clear':
        console.clear();
        this.displayWelcome();
        return;

      case 'session':
        this.displaySessionInfo();
        return;

      case 'metrics':
        this.displayPerformanceMetrics();
        return;

      case 'exit':
      case 'quit':
        this.rl?.close();
        return;

      case '':
        return;
    }

    try {
      const result = await this.processCommand(command, args);
      console.log(result);

      // Update metrics
      this.performanceMetrics.commandResponse = performance.now() - startTime;

      // Add to history
      this.addToHistory(command, args, true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`❌ Error: ${errorMessage}`));
      this.addToHistory(command, args, false, errorMessage);
    }
  }

  /**
   * Process Orchestrator Commands
   */
  private async processCommand(command: string, args: string[]): Promise<string> {
    switch (command) {
      case 'orchestrate':
        return this.handleOrchestrateCommand(args);

      case 'preview':
      case 'orchestrate-preview':
        return this.handlePreviewCommand(args);

      case 'resume':
      case 'orchestrate-resume':
        return this.handleResumeCommand(args);

      case 'list':
      case 'orchestrate-list':
        return this.handleListCommand(args);

      case 'status':
      case 'orchestrate-status':
        return this.handleStatusCommand(args);

      default:
        throw new Error(`Unknown command: ${command}. Type 'help' for available commands.`);
    }
  }

  /**
   * Handle Orchestrate Command with Rich UI
   */
  private async handleOrchestrateCommand(args: string[]): Promise<string> {
    const { request, options } = this.parseOrchestrateArgs(args);

    if (!request) {
      return this.formatHelp();
    }

    // Show analysis spinner
    this.currentSpinner = ora({
      text: 'Analyzing request and planning orchestration...',
      spinner: 'dots'
    }).start();

    try {
      // Generate execution plan first
      const plan = await this.engine.preview(request, options);

      this.currentSpinner.succeed('Analysis complete');

      // Display execution plan
      console.log(this.formatExecutionPlan(plan));

      // Confirm execution in interactive mode
      if (this.isInteractiveMode && !options.dryRun) {
        const confirmed = await this.confirmExecution(plan);
        if (!confirmed) {
          return chalk.yellow('⚠️  Orchestration cancelled by user');
        }
      }

      // Execute orchestration with progress
      this.currentSpinner = ora({
        text: 'Starting orchestration...',
        spinner: 'dots'
      }).start();

      const result = await this.engine.orchestrate(request, {
        ...options,
        onProgress: (progress: ProgressUpdate) => this.updateProgress(progress)
      });

      this.currentSpinner.succeed('Orchestration complete');
      this.currentSpinner = null;

      return this.formatOrchestrateResult(result);

    } catch (error) {
      if (this.currentSpinner) {
        this.currentSpinner.fail('Orchestration failed');
        this.currentSpinner = null;
      }
      throw error;
    }
  }

  /**
   * Handle Preview Command
   */
  private async handlePreviewCommand(args: string[]): Promise<string> {
    const request = args.join(' ').replace(/^["']|["']$/g, '');

    if (!request) {
      return chalk.yellow('Usage: preview "<description>"\nExample: preview "Add OAuth2 login"');
    }

    this.currentSpinner = ora('Generating execution plan...').start();

    try {
      const plan = await this.engine.preview(request);
      this.currentSpinner.succeed('Plan generated');
      this.currentSpinner = null;

      return this.formatExecutionPlan(plan);

    } catch (error) {
      if (this.currentSpinner) {
        this.currentSpinner.fail('Preview failed');
        this.currentSpinner = null;
      }
      throw error;
    }
  }

  /**
   * Auto-completion Handler
   */
  private completer(line: string): [string[], string] {
    const startTime = performance.now();

    const commands = [
      'orchestrate', 'preview', 'resume', 'list', 'status',
      'help', 'history', 'clear', 'session', 'metrics', 'exit'
    ];

    const options = [
      '--budget', '--time-limit', '--model-preference',
      '--max-parallel', '--dry-run', '--no-confirm'
    ];

    const models = ['haiku', 'sonnet', 'opus'];

    const hits = commands.filter((c) => c.startsWith(line));

    // If no command hits, try options and models
    if (hits.length === 0) {
      hits.push(...options.filter((o) => o.startsWith(line)));
      hits.push(...models.filter((m) => m.startsWith(line)));
    }

    // Add intelligent suggestions based on context
    const suggestions = this.getContextualSuggestions(line);
    hits.push(...suggestions.filter(s => s.startsWith(line)));

    this.performanceMetrics.autoCompletion = performance.now() - startTime;

    return [hits, line];
  }

  /**
   * Get history entries helper
   */
  private getHistoryEntries(): CLIHistoryEntry[] {
    return Array.isArray(this.history) ? this.history : this.getHistoryEntries();
  }

  /**
   * Get Contextual Suggestions
   */
  private getContextualSuggestions(line: string): string[] {
    const suggestions: string[] = [];

    // Recent commands from history
    const recentCommands = this.getHistoryEntries()
      .slice(-10)
      .map((entry: CLIHistoryEntry) => entry.command)
      .filter((cmd: string, index: number, arr: string[]) => arr.indexOf(cmd) === index);

    suggestions.push(...recentCommands);

    // Common patterns
    if (line.includes('orchestrate') && !line.includes('"')) {
      suggestions.push(
        'orchestrate "Add OAuth2 login with JWT sessions"',
        'orchestrate "Fix GUI alignment bugs" --budget 50',
        'orchestrate "Optimize database queries" --model-preference sonnet'
      );
    }

    return suggestions;
  }

  /**
   * Update Progress During Orchestration
   */
  private updateProgress(progress: ProgressUpdate): void {
    if (this.currentSpinner) {
      const percentage = progress.progress !== undefined
        ? Math.round(progress.progress * 100)
        : 0;

      const text = progress.currentOperation
        ? `${progress.currentOperation} (${percentage}%)`
        : `Progress: ${percentage}%`;

      this.currentSpinner.text = text;
    }
  }

  /**
   * Confirm Execution in Interactive Mode
   */
  private async confirmExecution(plan: ExecutionPlan): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmInterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const cost = plan.totalEstimate.cost;
      const time = plan.totalEstimate.time;

      const question = chalk.yellow(
        `\n⚠️  Execute orchestration? (Est. cost: $${cost.toFixed(2)}, time: ${time.toFixed(0)}m) [y/N]: `
      );

      confirmInterface.question(question, (answer) => {
        confirmInterface.close();
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }

  /**
   * Display Welcome Message
   */
  private displayWelcome(): void {
    console.log(chalk.bold.cyan(`
    ╭─────────────────────────────────────────────────────────╮
    │  🎯 Claude Code Orchestrator Plugin v1.0.0              │
    │  Interactive CLI - Advanced Orchestration Interface    │
    ╰─────────────────────────────────────────────────────────╯
    `));

    console.log(chalk.gray(`    Session ID: ${this.session.id.slice(0, 8)}`));
    console.log(chalk.gray(`    Started: ${new Date(this.session.startTime).toLocaleTimeString()}`));
    console.log(chalk.gray(`    Type 'help' for commands, 'exit' to quit\n`));
  }

  /**
   * Display Help Information
   */
  private displayHelp(): void {
    const helpText = `
${chalk.bold.cyan('📚 ORCHESTRATOR COMMANDS')}

${chalk.bold('Orchestration:')}
  orchestrate "<description>" [options]  Execute orchestration
  preview "<description>"               Preview execution plan
  resume <session-id>                   Resume interrupted session
  list [--limit N]                      List recent sessions
  status [session-id]                   Show orchestration status

${chalk.bold('Options:')}
  --budget N              Max cost in cents (e.g., --budget 100)
  --time-limit TIME       Time limit (e.g., --time-limit 30m)
  --model-preference M    Prefer model (haiku/sonnet/opus)
  --max-parallel N        Max parallel agents (default: 20)
  --dry-run              Preview only, don't execute
  --no-confirm           Skip confirmation prompt

${chalk.bold('Session:')}
  help, ?                 Show this help
  history [N]             Show command history (default: 10)
  session                 Show session information
  metrics                 Show performance metrics
  clear                   Clear screen
  exit, quit              Exit interactive mode

${chalk.bold('Examples:')}
  orchestrate "Add OAuth2 login with secure sessions"
  orchestrate "Fix GUI bugs" --budget 50 --time-limit 15m
  preview "Implement user authentication system"
  resume a7f3c9d2
    `;

    console.log(helpText);
  }

  /**
   * Parse Command Arguments
   */
  private parseCommand(input: string): string[] {
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      args.push(current);
    }

    return args;
  }

  /**
   * Parse Orchestrate Arguments
   */
  private parseOrchestrateArgs(args: string[]): { request: string; options: OrchestratorOptions } {
    let request = '';
    const options: OrchestratorOptions = {};

    // Find the request string (first non-option argument)
    for (const arg of args) {
      if (!arg.startsWith('--')) {
        request = arg;
        break;
      }
    }

    // Parse options
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--budget':
          if (i + 1 < args.length) {
            options.budget = parseFloat(args[i + 1]);
          }
          break;
        case '--time-limit':
          if (i + 1 < args.length) {
            options.timeLimit = this.parseTimeLimit(args[i + 1]);
          }
          break;
        case '--model-preference':
          if (i + 1 < args.length) {
            const model = args[i + 1];
            if (['haiku', 'sonnet', 'opus'].includes(model)) {
              options.modelPreference = model as 'haiku' | 'sonnet' | 'opus';
            }
          }
          break;
        case '--max-parallel':
          if (i + 1 < args.length) {
            options.maxParallel = parseInt(args[i + 1], 10);
          }
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        case '--no-confirm':
          options.confirmBefore = false;
          break;
      }
    }

    return { request, options };
  }

  /**
   * Parse Time Limit String
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
   * Add Command to History
   */
  private addToHistory(command: string, args: string[], success: boolean, error?: string): void {
    const entry: CLIHistoryEntry = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(Date.now()),
      command,
      args,
      success,
      error,
      duration: this.performanceMetrics.commandResponse
    };

    this.getHistoryEntries().push(entry);

    // Keep only last 1000 entries
    if (this.getHistoryEntries().length > 1000) {
      if (Array.isArray(this.history)) {
        this.history = this.getHistoryEntries().slice(-1000) as any;
      } else {
        this.history.entries = this.getHistoryEntries().slice(-1000);
      }
    }

    this.history.lastUpdated = Date.now();
  }

  /**
   * Display Command History
   */
  private displayHistory(limit: number = 10): void {
    const recent = this.getHistoryEntries().slice(-limit).reverse();

    if (recent.length === 0) {
      console.log(chalk.gray('No command history found.'));
      return;
    }

    console.log(chalk.bold.cyan(`\n📊 COMMAND HISTORY (Last ${recent.length})`));

    const tableData = [
      [chalk.bold('Time'), chalk.bold('Command'), chalk.bold('Status'), chalk.bold('Duration')]
    ];

    for (const entry of recent) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const command = `${entry.command} ${entry.args.join(' ')}`.slice(0, 40);
      const status = entry.success ? chalk.green('✓') : chalk.red('✗');
      const duration = `${entry.duration.toFixed(0)}ms`;

      tableData.push([time, command, status, duration]);
    }

    const tableOutput = createTable(tableData, {
      border: { getBorderCharacters: () => 'norc' } as any
    });

    console.log(tableOutput);
  }

  /**
   * Display Session Information
   */
  private displaySessionInfo(): void {
    console.log(chalk.bold.cyan('\n📊 SESSION INFORMATION'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`Session ID: ${this.session.id}`);
    console.log(`Started: ${new Date(this.session.startTime).toLocaleString()}`);
    console.log(`Commands Executed: ${this.getHistoryEntries().length}`);
    console.log(`Success Rate: ${this.calculateSuccessRate().toFixed(1)}%`);
    console.log(`Avg Response Time: ${this.calculateAvgResponseTime().toFixed(0)}ms`);
  }

  /**
   * Display Performance Metrics
   */
  private displayPerformanceMetrics(): void {
    console.log(chalk.bold.cyan('\n⚡ PERFORMANCE METRICS'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`Command Response: ${this.performanceMetrics.commandResponse.toFixed(2)}ms`);
    console.log(`History Search: ${this.performanceMetrics.historySearch.toFixed(2)}ms`);
    console.log(`Auto-completion: ${this.performanceMetrics.autoCompletion.toFixed(2)}ms`);
    console.log(`Session Load: ${this.performanceMetrics.sessionLoad.toFixed(2)}ms`);
  }

  /**
   * Calculate Success Rate
   */
  private calculateSuccessRate(): number {
    if (this.getHistoryEntries().length === 0) return 100;

    const successful = this.getHistoryEntries().filter((e: CLIHistoryEntry) => e.success).length;
    return (successful / this.getHistoryEntries().length) * 100;
  }

  /**
   * Calculate Average Response Time
   */
  private calculateAvgResponseTime(): number {
    if (this.getHistoryEntries().length === 0) return 0;

    const total = this.getHistoryEntries().reduce((sum: number, entry: CLIHistoryEntry) => sum + entry.duration, 0);
    return total / this.getHistoryEntries().length;
  }

  /**
   * Load Session Data
   */
  private loadSession(): CLISession {
    const startTime = performance.now();

    try {
      if (fs.existsSync(this.sessionPath)) {
        const data = fs.readFileSync(this.sessionPath, 'utf8');
        const session = JSON.parse(data);

        this.performanceMetrics.sessionLoad = performance.now() - startTime;
        return session;
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Failed to load session, creating new one', { error: errorObj.message });
    }

    // Create new session
    const sessionId = this.generateSessionId();
    const session: CLISession = {
      id: sessionId,
      sessionId: sessionId,
      startTime: new Date(Date.now()),
      status: 'active',
      history: {
        entries: [] as CLIHistoryEntry[],
        maxSize: 1000
      },
      version: '1.0.0'
    };

    this.performanceMetrics.sessionLoad = performance.now() - startTime;
    return session;
  }

  /**
   * Load Command History
   */
  private loadHistory(): CLIHistory {
    const startTime = performance.now();

    try {
      if (fs.existsSync(this.historyPath)) {
        const data = fs.readFileSync(this.historyPath, 'utf8');
        const history = JSON.parse(data);

        this.performanceMetrics.historySearch = performance.now() - startTime;
        return history;
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Failed to load history, creating new one', { error: errorObj.message });
    }

    const history: CLIHistory = {
      entries: [],
      maxSize: 1000,
      lastUpdated: new Date(Date.now())
    };

    this.performanceMetrics.historySearch = performance.now() - startTime;
    return history;
  }

  /**
   * Load Readline History
   */
  private loadReadlineHistory(): void {
    if (this.rl && this.getHistoryEntries().length > 0) {
      // Add last 50 commands to readline history
      const recentCommands = this.getHistoryEntries()
        .slice(-50)
        .map((entry: CLIHistoryEntry) => `${entry.command} ${entry.args.join(' ')}`)
        .filter((cmd: string, index: number, arr: string[]) => arr.indexOf(cmd) === index);

      for (const command of recentCommands) {
        (this.rl as any).history.unshift(command);
      }
    }
  }

  /**
   * Save Session Data
   */
  private saveSession(): void {
    try {
      fs.writeFileSync(this.sessionPath, JSON.stringify(this.session, null, 2));
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to save session', { error: errorObj.message });
    }
  }

  /**
   * Save Command History
   */
  private saveHistory(): void {
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2));
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to save history', { error: errorObj.message });
    }
  }

  /**
   * Generate Session ID
   */
  private generateSessionId(): string {
    return `cli-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Format methods (simplified for space)
  private formatHelp(): string {
    return this.formatError('Missing request description', 'Usage: orchestrate "<description>" [options]');
  }

  private formatError(message: string, details: string): string {
    return `${chalk.red('❌')} ${message}\n${chalk.gray(details)}`;
  }

  private formatExecutionPlan(plan: ExecutionPlan): string {
    // Implementation would format the plan with tables and colors
    return `📊 EXECUTION PLAN\n\nTasks: ${plan.tasks.length}\nEst. Time: ${plan.totalEstimate.time}m\nEst. Cost: $${plan.totalEstimate.cost.toFixed(2)}`;
  }

  private formatOrchestrateResult(result: OrchestratorResult): string {
    const statusIcon = result.success ? '✨' : '💥';
    const statusText = result.success ? 'COMPLETE' : 'FAILED';

    return `${statusIcon} ORCHESTRATION ${statusText}\n\nDuration: ${(result.metrics.totalTime / 1000 / 60).toFixed(1)}m\nCost: $${result.metrics.totalCost.toFixed(2)}\nFiles Modified: ${result.aggregatedResult.filesModified.length}`;
  }

  private async handleResumeCommand(_args: string[]): Promise<string> {
    return 'Resume functionality not implemented yet.';
  }

  private async handleListCommand(_args: string[]): Promise<string> {
    return 'List functionality not implemented yet.';
  }

  private async handleStatusCommand(_args: string[]): Promise<string> {
    return 'Status functionality not implemented yet.';
  }
}

/**
 * Export CLI Interface
 */
export default CLIInterface;