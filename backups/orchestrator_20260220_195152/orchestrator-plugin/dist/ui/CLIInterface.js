"use strict";
/**
 * Advanced CLI Interface for Claude Code Orchestrator Plugin
 *
 * Provides interactive mode with command completion, rich formatting,
 * and session persistence for optimal user experience.
 *
 * @version 1.0.0
 * @author Development Team
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIInterface = void 0;
const readline = __importStar(require("readline"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const table_1 = require("table");
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("../utils/logger");
/**
 * Advanced CLI Interface with Interactive Features
 */
class CLIInterface {
    logger;
    engine;
    sessionPath;
    historyPath;
    rl = null;
    session;
    history;
    currentSpinner = null;
    isInteractiveMode = false;
    // Performance metrics
    performanceMetrics = {
        commandResponse: 0,
        historySearch: 0,
        autoCompletion: 0,
        sessionLoad: 0
    };
    constructor(engine) {
        this.logger = new logger_1.PluginLogger('CLIInterface');
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
    async startInteractiveMode() {
        this.isInteractiveMode = true;
        this.displayWelcome();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk_1.default.cyan('orchestrator> '),
            completer: this.completer.bind(this),
            historySize: 100
        });
        // Load command history into readline
        this.loadReadlineHistory();
        this.rl.prompt();
        this.rl.on('line', async (input) => {
            await this.handleInteractiveCommand(input.trim());
            this.rl.prompt();
        });
        this.rl.on('close', () => {
            this.saveSession();
            this.saveHistory();
            console.log(chalk_1.default.yellow('\n👋 Goodbye! Session saved.'));
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
    async executeCommand(command, args) {
        const startTime = perf_hooks_1.performance.now();
        try {
            const result = await this.processCommand(command, args);
            // Update performance metrics
            this.performanceMetrics.commandResponse = perf_hooks_1.performance.now() - startTime;
            // Add to history
            this.addToHistory(command, args, true);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.addToHistory(command, args, false, errorMessage);
            throw error;
        }
    }
    /**
     * Handle Interactive Command
     */
    async handleInteractiveCommand(input) {
        if (!input)
            return;
        const startTime = perf_hooks_1.performance.now();
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
            this.performanceMetrics.commandResponse = perf_hooks_1.performance.now() - startTime;
            // Add to history
            this.addToHistory(command, args, true);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(chalk_1.default.red(`❌ Error: ${errorMessage}`));
            this.addToHistory(command, args, false, errorMessage);
        }
    }
    /**
     * Process Orchestrator Commands
     */
    async processCommand(command, args) {
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
    async handleOrchestrateCommand(args) {
        const { request, options } = this.parseOrchestrateArgs(args);
        if (!request) {
            return this.formatHelp();
        }
        // Show analysis spinner
        this.currentSpinner = (0, ora_1.default)({
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
                    return chalk_1.default.yellow('⚠️  Orchestration cancelled by user');
                }
            }
            // Execute orchestration with progress
            this.currentSpinner = (0, ora_1.default)({
                text: 'Starting orchestration...',
                spinner: 'dots'
            }).start();
            const result = await this.engine.orchestrate(request, {
                ...options,
                onProgress: (progress) => this.updateProgress(progress)
            });
            this.currentSpinner.succeed('Orchestration complete');
            this.currentSpinner = null;
            return this.formatOrchestrateResult(result);
        }
        catch (error) {
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
    async handlePreviewCommand(args) {
        const request = args.join(' ').replace(/^["']|["']$/g, '');
        if (!request) {
            return chalk_1.default.yellow('Usage: preview "<description>"\nExample: preview "Add OAuth2 login"');
        }
        this.currentSpinner = (0, ora_1.default)('Generating execution plan...').start();
        try {
            const plan = await this.engine.preview(request);
            this.currentSpinner.succeed('Plan generated');
            this.currentSpinner = null;
            return this.formatExecutionPlan(plan);
        }
        catch (error) {
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
    completer(line) {
        const startTime = perf_hooks_1.performance.now();
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
        this.performanceMetrics.autoCompletion = perf_hooks_1.performance.now() - startTime;
        return [hits, line];
    }
    /**
     * Get history entries helper
     */
    getHistoryEntries() {
        return Array.isArray(this.history) ? this.history : this.getHistoryEntries();
    }
    /**
     * Get Contextual Suggestions
     */
    getContextualSuggestions(line) {
        const suggestions = [];
        // Recent commands from history
        const recentCommands = this.getHistoryEntries()
            .slice(-10)
            .map((entry) => entry.command)
            .filter((cmd, index, arr) => arr.indexOf(cmd) === index);
        suggestions.push(...recentCommands);
        // Common patterns
        if (line.includes('orchestrate') && !line.includes('"')) {
            suggestions.push('orchestrate "Add OAuth2 login with JWT sessions"', 'orchestrate "Fix GUI alignment bugs" --budget 50', 'orchestrate "Optimize database queries" --model-preference sonnet');
        }
        return suggestions;
    }
    /**
     * Update Progress During Orchestration
     */
    updateProgress(progress) {
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
    async confirmExecution(plan) {
        return new Promise((resolve) => {
            const confirmInterface = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            const cost = plan.totalEstimate.cost;
            const time = plan.totalEstimate.time;
            const question = chalk_1.default.yellow(`\n⚠️  Execute orchestration? (Est. cost: $${cost.toFixed(2)}, time: ${time.toFixed(0)}m) [y/N]: `);
            confirmInterface.question(question, (answer) => {
                confirmInterface.close();
                resolve(answer.toLowerCase().startsWith('y'));
            });
        });
    }
    /**
     * Display Welcome Message
     */
    displayWelcome() {
        console.log(chalk_1.default.bold.cyan(`
    ╭─────────────────────────────────────────────────────────╮
    │  🎯 Claude Code Orchestrator Plugin v1.0.0              │
    │  Interactive CLI - Advanced Orchestration Interface    │
    ╰─────────────────────────────────────────────────────────╯
    `));
        console.log(chalk_1.default.gray(`    Session ID: ${this.session.id.slice(0, 8)}`));
        console.log(chalk_1.default.gray(`    Started: ${new Date(this.session.startTime).toLocaleTimeString()}`));
        console.log(chalk_1.default.gray(`    Type 'help' for commands, 'exit' to quit\n`));
    }
    /**
     * Display Help Information
     */
    displayHelp() {
        const helpText = `
${chalk_1.default.bold.cyan('📚 ORCHESTRATOR COMMANDS')}

${chalk_1.default.bold('Orchestration:')}
  orchestrate "<description>" [options]  Execute orchestration
  preview "<description>"               Preview execution plan
  resume <session-id>                   Resume interrupted session
  list [--limit N]                      List recent sessions
  status [session-id]                   Show orchestration status

${chalk_1.default.bold('Options:')}
  --budget N              Max cost in cents (e.g., --budget 100)
  --time-limit TIME       Time limit (e.g., --time-limit 30m)
  --model-preference M    Prefer model (haiku/sonnet/opus)
  --max-parallel N        Max parallel agents (default: 20)
  --dry-run              Preview only, don't execute
  --no-confirm           Skip confirmation prompt

${chalk_1.default.bold('Session:')}
  help, ?                 Show this help
  history [N]             Show command history (default: 10)
  session                 Show session information
  metrics                 Show performance metrics
  clear                   Clear screen
  exit, quit              Exit interactive mode

${chalk_1.default.bold('Examples:')}
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
    parseCommand(input) {
        const args = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            }
            else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = '';
            }
            else if (char === ' ' && !inQuotes) {
                if (current) {
                    args.push(current);
                    current = '';
                }
            }
            else {
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
    parseOrchestrateArgs(args) {
        let request = '';
        const options = {};
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
                            options.modelPreference = model;
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
    parseTimeLimit(timeStr) {
        const match = timeStr.match(/^(\d+)([smh])$/);
        if (!match)
            return 0;
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
    addToHistory(command, args, success, error) {
        const entry = {
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
                this.history = this.getHistoryEntries().slice(-1000);
            }
            else {
                this.history.entries = this.getHistoryEntries().slice(-1000);
            }
        }
        this.history.lastUpdated = Date.now();
    }
    /**
     * Display Command History
     */
    displayHistory(limit = 10) {
        const recent = this.getHistoryEntries().slice(-limit).reverse();
        if (recent.length === 0) {
            console.log(chalk_1.default.gray('No command history found.'));
            return;
        }
        console.log(chalk_1.default.bold.cyan(`\n📊 COMMAND HISTORY (Last ${recent.length})`));
        const tableData = [
            [chalk_1.default.bold('Time'), chalk_1.default.bold('Command'), chalk_1.default.bold('Status'), chalk_1.default.bold('Duration')]
        ];
        for (const entry of recent) {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            const command = `${entry.command} ${entry.args.join(' ')}`.slice(0, 40);
            const status = entry.success ? chalk_1.default.green('✓') : chalk_1.default.red('✗');
            const duration = `${entry.duration.toFixed(0)}ms`;
            tableData.push([time, command, status, duration]);
        }
        const tableOutput = (0, table_1.table)(tableData, {
            border: { getBorderCharacters: () => 'norc' }
        });
        console.log(tableOutput);
    }
    /**
     * Display Session Information
     */
    displaySessionInfo() {
        console.log(chalk_1.default.bold.cyan('\n📊 SESSION INFORMATION'));
        console.log(chalk_1.default.gray('─'.repeat(50)));
        console.log(`Session ID: ${this.session.id}`);
        console.log(`Started: ${new Date(this.session.startTime).toLocaleString()}`);
        console.log(`Commands Executed: ${this.getHistoryEntries().length}`);
        console.log(`Success Rate: ${this.calculateSuccessRate().toFixed(1)}%`);
        console.log(`Avg Response Time: ${this.calculateAvgResponseTime().toFixed(0)}ms`);
    }
    /**
     * Display Performance Metrics
     */
    displayPerformanceMetrics() {
        console.log(chalk_1.default.bold.cyan('\n⚡ PERFORMANCE METRICS'));
        console.log(chalk_1.default.gray('─'.repeat(50)));
        console.log(`Command Response: ${this.performanceMetrics.commandResponse.toFixed(2)}ms`);
        console.log(`History Search: ${this.performanceMetrics.historySearch.toFixed(2)}ms`);
        console.log(`Auto-completion: ${this.performanceMetrics.autoCompletion.toFixed(2)}ms`);
        console.log(`Session Load: ${this.performanceMetrics.sessionLoad.toFixed(2)}ms`);
    }
    /**
     * Calculate Success Rate
     */
    calculateSuccessRate() {
        if (this.getHistoryEntries().length === 0)
            return 100;
        const successful = this.getHistoryEntries().filter((e) => e.success).length;
        return (successful / this.getHistoryEntries().length) * 100;
    }
    /**
     * Calculate Average Response Time
     */
    calculateAvgResponseTime() {
        if (this.getHistoryEntries().length === 0)
            return 0;
        const total = this.getHistoryEntries().reduce((sum, entry) => sum + entry.duration, 0);
        return total / this.getHistoryEntries().length;
    }
    /**
     * Load Session Data
     */
    loadSession() {
        const startTime = perf_hooks_1.performance.now();
        try {
            if (fs.existsSync(this.sessionPath)) {
                const data = fs.readFileSync(this.sessionPath, 'utf8');
                const session = JSON.parse(data);
                this.performanceMetrics.sessionLoad = perf_hooks_1.performance.now() - startTime;
                return session;
            }
        }
        catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            this.logger.warn('Failed to load session, creating new one', { error: errorObj.message });
        }
        // Create new session
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            sessionId: sessionId,
            startTime: new Date(Date.now()),
            status: 'active',
            history: {
                entries: [],
                maxSize: 1000
            },
            version: '1.0.0'
        };
        this.performanceMetrics.sessionLoad = perf_hooks_1.performance.now() - startTime;
        return session;
    }
    /**
     * Load Command History
     */
    loadHistory() {
        const startTime = perf_hooks_1.performance.now();
        try {
            if (fs.existsSync(this.historyPath)) {
                const data = fs.readFileSync(this.historyPath, 'utf8');
                const history = JSON.parse(data);
                this.performanceMetrics.historySearch = perf_hooks_1.performance.now() - startTime;
                return history;
            }
        }
        catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            this.logger.warn('Failed to load history, creating new one', { error: errorObj.message });
        }
        const history = {
            entries: [],
            maxSize: 1000,
            lastUpdated: new Date(Date.now())
        };
        this.performanceMetrics.historySearch = perf_hooks_1.performance.now() - startTime;
        return history;
    }
    /**
     * Load Readline History
     */
    loadReadlineHistory() {
        if (this.rl && this.getHistoryEntries().length > 0) {
            // Add last 50 commands to readline history
            const recentCommands = this.getHistoryEntries()
                .slice(-50)
                .map((entry) => `${entry.command} ${entry.args.join(' ')}`)
                .filter((cmd, index, arr) => arr.indexOf(cmd) === index);
            for (const command of recentCommands) {
                this.rl.history.unshift(command);
            }
        }
    }
    /**
     * Save Session Data
     */
    saveSession() {
        try {
            fs.writeFileSync(this.sessionPath, JSON.stringify(this.session, null, 2));
        }
        catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to save session', { error: errorObj.message });
        }
    }
    /**
     * Save Command History
     */
    saveHistory() {
        try {
            fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2));
        }
        catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to save history', { error: errorObj.message });
        }
    }
    /**
     * Generate Session ID
     */
    generateSessionId() {
        return `cli-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    // Format methods (simplified for space)
    formatHelp() {
        return this.formatError('Missing request description', 'Usage: orchestrate "<description>" [options]');
    }
    formatError(message, details) {
        return `${chalk_1.default.red('❌')} ${message}\n${chalk_1.default.gray(details)}`;
    }
    formatExecutionPlan(plan) {
        // Implementation would format the plan with tables and colors
        return `📊 EXECUTION PLAN\n\nTasks: ${plan.tasks.length}\nEst. Time: ${plan.totalEstimate.time}m\nEst. Cost: $${plan.totalEstimate.cost.toFixed(2)}`;
    }
    formatOrchestrateResult(result) {
        const statusIcon = result.success ? '✨' : '💥';
        const statusText = result.success ? 'COMPLETE' : 'FAILED';
        return `${statusIcon} ORCHESTRATION ${statusText}\n\nDuration: ${(result.metrics.totalTime / 1000 / 60).toFixed(1)}m\nCost: $${result.metrics.totalCost.toFixed(2)}\nFiles Modified: ${result.aggregatedResult.filesModified.length}`;
    }
    async handleResumeCommand(_args) {
        return 'Resume functionality not implemented yet.';
    }
    async handleListCommand(_args) {
        return 'List functionality not implemented yet.';
    }
    async handleStatusCommand(_args) {
        return 'Status functionality not implemented yet.';
    }
}
exports.CLIInterface = CLIInterface;
/**
 * Export CLI Interface
 */
exports.default = CLIInterface;
//# sourceMappingURL=CLIInterface.js.map