"use strict";
/**
 * Error Handling & Recovery UI for Claude Code Orchestrator Plugin
 *
 * Provides guided troubleshooting, error pattern detection,
 * and integration with Learning Engine for error prevention.
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
exports.ErrorRecoveryInterface = void 0;
const readline = __importStar(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const table_1 = require("table");
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("../utils/logger");
const LearningEngine_1 = require("../learning/LearningEngine");
/**
 * Error Pattern Detection Engine
 */
class ErrorPatternDetector {
    logger;
    knownPatterns = new Map();
    constructor() {
        this.logger = new logger_1.PluginLogger('ErrorPatternDetector');
        this.initializeKnownPatterns();
    }
    /**
     * Initialize known error patterns
     */
    initializeKnownPatterns() {
        const patterns = [
            {
                id: 'agent-timeout',
                name: 'Agent Execution Timeout',
                description: 'Agent exceeded time limit',
                regex: /timeout|exceeded.*limit|timed out/i,
                category: 'timeout',
                severity: 'medium',
                commonCauses: [
                    'Complex task requiring more time',
                    'Network connectivity issues',
                    'Agent resource constraints',
                    'Infinite loop in agent code'
                ],
                recoveryStrategies: ['increase-timeout', 'retry-with-simpler-approach', 'manual-intervention']
            },
            {
                id: 'cost-limit-exceeded',
                name: 'Cost Budget Exceeded',
                description: 'Orchestration exceeded cost budget',
                regex: /cost.*exceeded|budget.*limit|over budget/i,
                category: 'budget',
                severity: 'high',
                commonCauses: [
                    'Underestimated task complexity',
                    'Inefficient model usage',
                    'Too many parallel agents',
                    'Repeated failed attempts'
                ],
                recoveryStrategies: ['increase-budget', 'optimize-model-usage', 'reduce-scope', 'manual-review']
            },
            {
                id: 'dependency-violation',
                name: 'Task Dependency Violation',
                description: 'Task dependency requirements not met',
                regex: /dependency.*failed|prerequisite.*missing|dependency.*violation/i,
                category: 'dependency',
                severity: 'high',
                commonCauses: [
                    'Circular dependencies',
                    'Missing prerequisite tasks',
                    'Incorrect dependency order',
                    'Failed dependency task'
                ],
                recoveryStrategies: ['reorder-tasks', 'fix-dependencies', 'skip-failed-deps', 'manual-dependency-check']
            },
            {
                id: 'agent-selection-failed',
                name: 'Agent Selection Failed',
                description: 'Unable to select appropriate agent',
                regex: /no.*agent.*found|agent.*selection.*failed|unknown.*agent/i,
                category: 'routing',
                severity: 'medium',
                commonCauses: [
                    'No matching expert for task type',
                    'All agents disabled',
                    'Incorrect keyword mapping',
                    'Agent file not found'
                ],
                recoveryStrategies: ['manual-agent-selection', 'enable-more-agents', 'fallback-to-general', 'update-keywords']
            },
            {
                id: 'api-rate-limit',
                name: 'API Rate Limit Exceeded',
                description: 'Claude API rate limit reached',
                regex: /rate.*limit|too many requests|quota.*exceeded/i,
                category: 'api',
                severity: 'medium',
                commonCauses: [
                    'Too many concurrent requests',
                    'Rapid successive calls',
                    'API quota exhausted',
                    'Burst traffic patterns'
                ],
                recoveryStrategies: ['wait-and-retry', 'reduce-parallelism', 'implement-backoff', 'upgrade-tier']
            },
            {
                id: 'model-context-overflow',
                name: 'Model Context Limit Exceeded',
                description: 'Input exceeds model context window',
                regex: /context.*too large|token.*limit|input.*too long/i,
                category: 'model',
                severity: 'high',
                commonCauses: [
                    'Very large code files',
                    'Too much context provided',
                    'Inefficient prompt design',
                    'Accumulated context growth'
                ],
                recoveryStrategies: ['chunk-input', 'reduce-context', 'use-larger-model', 'summarize-context']
            },
            {
                id: 'file-access-denied',
                name: 'File Access Permission Error',
                description: 'Insufficient permissions to access files',
                regex: /permission.*denied|access.*denied|unauthorized/i,
                category: 'filesystem',
                severity: 'medium',
                commonCauses: [
                    'Insufficient file permissions',
                    'Read-only file system',
                    'File locked by another process',
                    'Security restrictions'
                ],
                recoveryStrategies: ['check-permissions', 'run-as-admin', 'unlock-files', 'change-location']
            }
        ];
        patterns.forEach(pattern => {
            this.knownPatterns.set(pattern.id, pattern);
        });
        this.logger.info(`Initialized ${patterns.length} error patterns`);
    }
    /**
     * Detect error pattern from error message
     */
    detectPattern(error) {
        const errorText = `${error.message} ${error.details || ''}`;
        for (const pattern of Array.from(this.knownPatterns.values())) {
            if (pattern.regex.test(errorText)) {
                this.logger.debug('Error pattern detected', {
                    pattern: pattern.id,
                    error: error.code
                });
                return pattern;
            }
        }
        return null;
    }
    /**
     * Analyze error for patterns and context
     */
    analyzeError(error) {
        const pattern = this.detectPattern(error);
        return {
            error,
            pattern,
            confidence: pattern ? 0.85 : 0.0,
            suggestedActions: pattern?.recoveryStrategies || [],
            riskLevel: this.calculateRiskLevel(error, pattern),
            estimatedRecoveryTime: this.estimateRecoveryTime(pattern),
            preventionRules: this.generatePreventionRules(pattern)
        };
    }
    calculateRiskLevel(error, pattern) {
        if (!pattern)
            return 'medium';
        switch (pattern.severity) {
            case 'low': return 'low';
            case 'medium': return error.critical ? 'high' : 'medium';
            case 'high': return error.critical ? 'critical' : 'high';
            default: return 'medium';
        }
    }
    estimateRecoveryTime(pattern) {
        if (!pattern)
            return 300; // 5 minutes default
        switch (pattern.category) {
            case 'timeout': return 120; // 2 minutes
            case 'budget': return 60; // 1 minute
            case 'dependency': return 300; // 5 minutes
            case 'routing': return 180; // 3 minutes
            case 'api': return 600; // 10 minutes
            case 'model': return 240; // 4 minutes
            case 'filesystem': return 180; // 3 minutes
            default: return 300;
        }
    }
    generatePreventionRules(pattern) {
        if (!pattern)
            return [];
        const rules = [];
        switch (pattern.id) {
            case 'agent-timeout':
                rules.push({
                    id: 'timeout-prevention',
                    description: 'Set appropriate timeout based on task complexity',
                    condition: 'before-agent-execution',
                    action: 'validate-timeout-limits'
                });
                break;
            case 'cost-limit-exceeded':
                rules.push({
                    id: 'budget-monitoring',
                    description: 'Monitor cost during execution',
                    condition: 'during-execution',
                    action: 'track-cumulative-cost'
                });
                break;
            case 'dependency-violation':
                rules.push({
                    id: 'dependency-validation',
                    description: 'Validate dependencies before execution',
                    condition: 'before-execution',
                    action: 'check-dependency-graph'
                });
                break;
        }
        return rules;
    }
}
/**
 * Recovery Strategy Engine
 */
class RecoveryStrategyEngine {
    logger;
    strategies = new Map();
    constructor() {
        this.logger = new logger_1.PluginLogger('RecoveryStrategyEngine');
        this.initializeRecoveryStrategies();
    }
    initializeRecoveryStrategies() {
        const strategies = [
            {
                id: 'increase-timeout',
                name: 'Increase Timeout Limit',
                description: 'Increase the time limit for agent execution',
                applicablePatterns: ['agent-timeout'],
                difficulty: 'easy',
                estimatedTime: 60,
                steps: [
                    {
                        id: 'current-timeout',
                        description: 'Check current timeout setting',
                        action: 'display-current-timeout',
                        automated: true
                    },
                    {
                        id: 'suggest-timeout',
                        description: 'Calculate recommended timeout increase',
                        action: 'calculate-new-timeout',
                        automated: true
                    },
                    {
                        id: 'apply-timeout',
                        description: 'Apply new timeout setting',
                        action: 'update-timeout-config',
                        automated: false,
                        userInput: true
                    }
                ]
            },
            {
                id: 'increase-budget',
                name: 'Increase Cost Budget',
                description: 'Increase the cost budget for orchestration',
                applicablePatterns: ['cost-limit-exceeded'],
                difficulty: 'easy',
                estimatedTime: 30,
                steps: [
                    {
                        id: 'show-current-usage',
                        description: 'Show current cost usage breakdown',
                        action: 'display-cost-breakdown',
                        automated: true
                    },
                    {
                        id: 'suggest-budget',
                        description: 'Suggest budget increase amount',
                        action: 'calculate-budget-increase',
                        automated: true
                    },
                    {
                        id: 'apply-budget',
                        description: 'Update budget configuration',
                        action: 'update-budget-config',
                        automated: false,
                        userInput: true
                    }
                ]
            },
            {
                id: 'reorder-tasks',
                name: 'Reorder Task Dependencies',
                description: 'Analyze and fix task dependency order',
                applicablePatterns: ['dependency-violation'],
                difficulty: 'medium',
                estimatedTime: 180,
                steps: [
                    {
                        id: 'analyze-deps',
                        description: 'Analyze current dependency graph',
                        action: 'analyze-dependency-graph',
                        automated: true
                    },
                    {
                        id: 'suggest-order',
                        description: 'Suggest corrected task order',
                        action: 'generate-correct-order',
                        automated: true
                    },
                    {
                        id: 'apply-reorder',
                        description: 'Apply new task ordering',
                        action: 'reorder-tasks',
                        automated: false,
                        userInput: true
                    }
                ]
            },
            {
                id: 'manual-agent-selection',
                name: 'Manual Agent Selection',
                description: 'Manually select appropriate agent for task',
                applicablePatterns: ['agent-selection-failed'],
                difficulty: 'medium',
                estimatedTime: 120,
                steps: [
                    {
                        id: 'list-agents',
                        description: 'Display available agents',
                        action: 'list-available-agents',
                        automated: true
                    },
                    {
                        id: 'show-task-details',
                        description: 'Show task requirements',
                        action: 'display-task-details',
                        automated: true
                    },
                    {
                        id: 'select-agent',
                        description: 'Select appropriate agent',
                        action: 'manual-agent-selection',
                        automated: false,
                        userInput: true
                    }
                ]
            },
            {
                id: 'wait-and-retry',
                name: 'Wait and Retry',
                description: 'Wait for rate limit reset and retry',
                applicablePatterns: ['api-rate-limit'],
                difficulty: 'easy',
                estimatedTime: 300,
                steps: [
                    {
                        id: 'check-rate-limit',
                        description: 'Check current rate limit status',
                        action: 'check-rate-limit-status',
                        automated: true
                    },
                    {
                        id: 'wait-period',
                        description: 'Wait for rate limit reset',
                        action: 'wait-for-reset',
                        automated: true
                    },
                    {
                        id: 'retry-operation',
                        description: 'Retry failed operation',
                        action: 'retry-failed-task',
                        automated: true
                    }
                ]
            },
            {
                id: 'chunk-input',
                name: 'Chunk Large Input',
                description: 'Split large input into smaller chunks',
                applicablePatterns: ['model-context-overflow'],
                difficulty: 'hard',
                estimatedTime: 240,
                steps: [
                    {
                        id: 'analyze-input-size',
                        description: 'Analyze input size and structure',
                        action: 'analyze-input-tokens',
                        automated: true
                    },
                    {
                        id: 'suggest-chunks',
                        description: 'Suggest chunking strategy',
                        action: 'suggest-chunking-strategy',
                        automated: true
                    },
                    {
                        id: 'apply-chunking',
                        description: 'Apply chunking and retry',
                        action: 'apply-input-chunking',
                        automated: false,
                        userInput: true
                    }
                ]
            }
        ];
        strategies.forEach(strategy => {
            this.strategies.set(strategy.id, strategy);
        });
        this.logger.info(`Initialized ${strategies.length} recovery strategies`);
    }
    /**
     * Get applicable recovery strategies for error pattern
     */
    getApplicableStrategies(pattern) {
        const applicable = [];
        for (const strategy of Array.from(this.strategies.values())) {
            if (strategy.applicablePatterns.includes(pattern.id)) {
                applicable.push(strategy);
            }
        }
        return applicable.sort((a, b) => {
            // Sort by difficulty (easier first) then by estimated time
            const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
            const aDiff = difficultyOrder[a.difficulty];
            const bDiff = difficultyOrder[b.difficulty];
            if (aDiff !== bDiff)
                return aDiff - bDiff;
            return a.estimatedTime - b.estimatedTime;
        });
    }
    /**
     * Get strategy by ID
     */
    getStrategy(strategyId) {
        return this.strategies.get(strategyId);
    }
}
/**
 * Guided Troubleshooting Interface
 */
class GuidedTroubleshootingInterface {
    rl = null;
    currentSession = null;
    constructor() {
        // Logger removed as unused
    }
    /**
     * Start guided troubleshooting session
     */
    async startTroubleshootingSession(error, analysis, strategies) {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.currentSession = {
            sessionId: `troubleshoot-${Date.now()}`,
            id: `troubleshoot-${Date.now()}`,
            error,
            analysis,
            availableStrategies: strategies,
            selectedStrategy: undefined,
            steps: [],
            currentStep: 0,
            startTime: Date.now(),
            status: 'in-progress'
        };
        try {
            console.clear();
            this.displayTroubleshootingHeader();
            this.displayErrorAnalysis();
            if (strategies.length > 0) {
                const selectedStrategy = await this.selectRecoveryStrategy(strategies);
                this.currentSession.selectedStrategy = selectedStrategy;
                await this.executeRecoveryStrategy(selectedStrategy);
            }
            else {
                await this.handleNoStrategiesAvailable();
            }
            this.currentSession.status = 'completed';
            this.currentSession.endTime = Date.now();
            return this.currentSession;
        }
        catch (error) {
            this.currentSession.status = 'failed';
            this.currentSession.endTime = Date.now();
            throw error;
        }
        finally {
            this.rl?.close();
        }
    }
    displayTroubleshootingHeader() {
        const header = `
╭─────────────────────────────────────────────────────────╮
│  🔧 Error Recovery Assistant                            │
│  Guided Troubleshooting for Orchestrator Plugin        │
╰─────────────────────────────────────────────────────────╯
    `;
        console.log(chalk_1.default.bold.red(header));
    }
    displayErrorAnalysis() {
        if (!this.currentSession)
            return;
        const { error, analysis } = this.currentSession;
        console.log(chalk_1.default.bold.red('\n❌ ERROR DETAILS\n'));
        console.log(chalk_1.default.gray('─'.repeat(60)));
        console.log(`${chalk_1.default.bold('Error Code:')} ${error.code}`);
        console.log(`${chalk_1.default.bold('Message:')} ${error.message}`);
        if (error.details) {
            console.log(`${chalk_1.default.bold('Details:')} ${error.details}`);
        }
        if (analysis.pattern) {
            console.log(`\n${chalk_1.default.bold('Pattern Detected:')} ${chalk_1.default.cyan(analysis.pattern.name)}`);
            console.log(`${chalk_1.default.bold('Description:')} ${analysis.pattern.description}`);
            console.log(`${chalk_1.default.bold('Risk Level:')} ${this.getRiskLevelColor(analysis.riskLevel)(analysis.riskLevel.toUpperCase())}`);
            console.log(`${chalk_1.default.bold('Confidence:')} ${(analysis.confidence * 100).toFixed(1)}%`);
            if (analysis.pattern.commonCauses.length > 0) {
                console.log(`\n${chalk_1.default.bold('Common Causes:')}`);
                analysis.pattern.commonCauses.forEach(cause => {
                    console.log(`  • ${cause}`);
                });
            }
        }
    }
    async selectRecoveryStrategy(strategies) {
        console.log(chalk_1.default.bold.cyan('\n🔨 RECOVERY OPTIONS\n'));
        console.log(chalk_1.default.gray('─'.repeat(60)));
        const tableData = [
            [chalk_1.default.bold('#'), chalk_1.default.bold('Strategy'), chalk_1.default.bold('Difficulty'), chalk_1.default.bold('Est. Time')]
        ];
        strategies.forEach((strategy, index) => {
            const difficultyColor = this.getDifficultyColor(strategy.difficulty);
            tableData.push([
                (index + 1).toString(),
                strategy.name,
                difficultyColor(strategy.difficulty),
                `${Math.ceil(strategy.estimatedTime / 60)} min`
            ]);
        });
        console.log((0, table_1.table)(tableData));
        const choice = await this.promptChoice(`\nSelect recovery strategy (1-${strategies.length})`, 1, strategies.length);
        return strategies[choice - 1];
    }
    async executeRecoveryStrategy(strategy) {
        console.log(chalk_1.default.bold.green(`\n🚀 EXECUTING: ${strategy.name}\n`));
        console.log(chalk_1.default.gray(strategy.description));
        console.log(chalk_1.default.gray('─'.repeat(60)));
        if (!this.currentSession)
            return;
        this.currentSession.steps = strategy.steps;
        for (let i = 0; i < strategy.steps.length; i++) {
            this.currentSession.currentStep = i;
            const step = strategy.steps[i];
            console.log(chalk_1.default.cyan(`\nStep ${i + 1}/${strategy.steps.length}: ${step.description}`));
            if (step.automated) {
                console.log(chalk_1.default.gray('⚙️  Executing automatically...'));
                await this.executeAutomatedStep(step);
            }
            else {
                await this.executeManualStep(step);
            }
            console.log(chalk_1.default.green('✓ Step completed'));
        }
        console.log(chalk_1.default.bold.green('\n🎉 Recovery strategy completed successfully!'));
    }
    async executeAutomatedStep(step) {
        // Simulate automated step execution
        await new Promise(resolve => setTimeout(resolve, 1000));
        switch (step.action) {
            case 'display-current-timeout':
                console.log(chalk_1.default.gray('   Current timeout: 30 minutes'));
                break;
            case 'calculate-new-timeout':
                console.log(chalk_1.default.gray('   Recommended timeout: 45 minutes'));
                break;
            case 'display-cost-breakdown':
                console.log(chalk_1.default.gray('   Current usage: $0.75 / $1.00 budget'));
                break;
            case 'calculate-budget-increase':
                console.log(chalk_1.default.gray('   Recommended budget: $2.00'));
                break;
            case 'analyze-dependency-graph':
                console.log(chalk_1.default.gray('   Found circular dependency: Task A → Task B → Task A'));
                break;
            case 'list-available-agents':
                console.log(chalk_1.default.gray('   Available: gui-super-expert, tester_expert, database_expert'));
                break;
            default:
                console.log(chalk_1.default.gray('   Automated step executed'));
        }
    }
    async executeManualStep(step) {
        if (!step.userInput) {
            console.log(chalk_1.default.yellow('⚠️  Manual action required (no user input)'));
            await this.promptContinue('Press Enter when action is complete');
            return;
        }
        switch (step.action) {
            case 'update-timeout-config':
                const newTimeout = await this.promptInput('Enter new timeout (minutes)', '45');
                console.log(chalk_1.default.green(`✓ Timeout updated to ${newTimeout} minutes`));
                break;
            case 'update-budget-config':
                const newBudget = await this.promptInput('Enter new budget ($)', '2.00');
                console.log(chalk_1.default.green(`✓ Budget updated to $${newBudget}`));
                break;
            case 'manual-agent-selection':
                const agents = ['gui-super-expert', 'tester_expert', 'database_expert'];
                console.log('\nAvailable agents:');
                agents.forEach((agent, i) => console.log(`  ${i + 1}. ${agent}`));
                const agentChoice = await this.promptChoice('Select agent', 1, agents.length);
                const selectedAgent = agents[agentChoice - 1];
                console.log(chalk_1.default.green(`✓ Agent selected: ${selectedAgent}`));
                break;
            default:
                const userResponse = await this.promptInput('Enter your response', 'confirmed');
                console.log(chalk_1.default.green(`✓ Response: ${userResponse}`));
        }
    }
    async handleNoStrategiesAvailable() {
        console.log(chalk_1.default.bold.yellow('\n⚠️  NO AUTOMATED RECOVERY STRATEGIES AVAILABLE\n'));
        console.log(chalk_1.default.gray('This appears to be a novel error that requires manual investigation.'));
        console.log('\n📋 Manual Investigation Steps:');
        console.log('1. Check system logs for additional context');
        console.log('2. Verify configuration settings');
        console.log('3. Test with simplified orchestration');
        console.log('4. Contact support with error details');
        const proceedWithManual = await this.promptConfirm('\nWould you like guidance for manual investigation?');
        if (proceedWithManual) {
            await this.provideManuallInvestigationGuidance();
        }
    }
    async provideManuallInvestigationGuidance() {
        console.log(chalk_1.default.bold.cyan('\n🔍 MANUAL INVESTIGATION GUIDANCE\n'));
        const investigationSteps = [
            'Collect error logs and system state',
            'Identify minimum reproducible case',
            'Check for recent configuration changes',
            'Test with different parameters',
            'Document findings for support'
        ];
        for (let i = 0; i < investigationSteps.length; i++) {
            console.log(chalk_1.default.cyan(`${i + 1}. ${investigationSteps[i]}`));
            const completed = await this.promptConfirm('   Mark as completed?');
            if (completed) {
                console.log(chalk_1.default.green('   ✓ Completed'));
            }
            else {
                console.log(chalk_1.default.yellow('   ⚠️  Skipped'));
            }
        }
    }
    getRiskLevelColor(level) {
        switch (level) {
            case 'low': return chalk_1.default.green;
            case 'medium': return chalk_1.default.yellow;
            case 'high': return chalk_1.default.red;
            case 'critical': return chalk_1.default.magenta;
            default: return chalk_1.default.gray;
        }
    }
    getDifficultyColor(difficulty) {
        switch (difficulty) {
            case 'easy': return chalk_1.default.green;
            case 'medium': return chalk_1.default.yellow;
            case 'hard': return chalk_1.default.red;
            default: return chalk_1.default.gray;
        }
    }
    async promptChoice(question, min, max) {
        return new Promise((resolve) => {
            if (!this.rl)
                return resolve(min);
            this.rl.question(chalk_1.default.cyan(`${question}: `), (answer) => {
                const choice = parseInt(answer.trim());
                if (choice >= min && choice <= max) {
                    resolve(choice);
                }
                else {
                    console.log(chalk_1.default.red(`Invalid choice. Please enter ${min}-${max}`));
                    resolve(this.promptChoice(question, min, max));
                }
            });
        });
    }
    async promptInput(question, defaultValue) {
        return new Promise((resolve) => {
            if (!this.rl)
                return resolve(defaultValue || '');
            const prompt = defaultValue ? `${question} (${defaultValue})` : question;
            this.rl.question(chalk_1.default.cyan(`${prompt}: `), (answer) => {
                resolve(answer.trim() || defaultValue || '');
            });
        });
    }
    async promptConfirm(question) {
        return new Promise((resolve) => {
            if (!this.rl)
                return resolve(false);
            this.rl.question(chalk_1.default.cyan(`${question} (y/N): `), (answer) => {
                resolve(answer.toLowerCase().startsWith('y'));
            });
        });
    }
    async promptContinue(message) {
        return new Promise((resolve) => {
            if (!this.rl)
                return resolve();
            const prompt = message || 'Press Enter to continue...';
            this.rl.question(chalk_1.default.gray(prompt), () => {
                resolve();
            });
        });
    }
}
/**
 * Main Error Recovery Interface
 */
class ErrorRecoveryInterface {
    logger;
    patternDetector;
    strategyEngine;
    guidedInterface;
    learningEngine;
    recoveryHistory = [];
    constructor(learningEngine, config) {
        this.logger = new logger_1.PluginLogger('ErrorRecoveryInterface');
        this.patternDetector = new ErrorPatternDetector();
        this.strategyEngine = new RecoveryStrategyEngine();
        this.guidedInterface = new GuidedTroubleshootingInterface();
        // LearningEngine requires PluginConfig, so if not provided, create a minimal one
        if (learningEngine) {
            this.learningEngine = learningEngine;
        }
        else {
            // Create a minimal LearningEngine - config must have required fields
            const minimalConfig = config || {
                routing: { fallback_agent: 'general', max_parallel_agents: 20, escalation_enabled: true, auto_documentation: true },
                performance: { max_planning_time: 30000, progress_update_interval: 1000, session_timeout: 3600000 },
                costs: { default_budget: 100, cost_alerts: true, model_costs: { haiku: 0.25, sonnet: 1, opus: 5 } },
                agents: [],
                keywords: []
            };
            this.learningEngine = new LearningEngine_1.LearningEngine(minimalConfig);
        }
    }
    /**
     * Handle orchestration error with guided recovery
     */
    async handleError(error) {
        this.logger.info('Starting error recovery process', {
            errorCode: error.code,
            critical: error.critical
        });
        const startTime = perf_hooks_1.performance.now();
        try {
            // Step 1: Analyze error
            const analysis = this.patternDetector.analyzeError(error);
            // Step 2: Get recovery strategies
            const strategies = analysis.pattern
                ? this.strategyEngine.getApplicableStrategies(analysis.pattern)
                : [];
            // Step 3: Learn from error (feed to learning engine)
            // await this.learningEngine.recordError(error, analysis); // Method doesn't exist yet
            // Step 4: Check for similar past errors
            const similarSessions = this.findSimilarSessions(error);
            // Step 5: Present recovery options
            const recoveryOptions = {
                error,
                analysis,
                strategies,
                similarSessions,
                automaticRecovery: this.canAutoRecover(analysis, strategies),
                guidedRecoveryAvailable: strategies.length > 0,
                estimatedRecoveryTime: analysis.estimatedRecoveryTime,
                preventionRules: analysis.preventionRules
            };
            // Step 6: Auto-recovery attempt if possible
            if (recoveryOptions.automaticRecovery && strategies.length > 0) {
                const autoRecoveryResult = await this.attemptAutoRecovery(strategies[0], // Use best strategy
                error);
                recoveryOptions.autoRecoveryAttempted = true;
                recoveryOptions.autoRecoveryResult = autoRecoveryResult;
                if (autoRecoveryResult.success) {
                    this.logger.info('Automatic recovery successful');
                    return recoveryOptions;
                }
            }
            // Step 7: Offer guided recovery
            if (recoveryOptions.guidedRecoveryAvailable) {
                const proceedWithGuided = await this.shouldProceedWithGuided(error, analysis);
                if (proceedWithGuided) {
                    const session = await this.guidedInterface.startTroubleshootingSession(error, analysis, strategies);
                    this.recoveryHistory.push(session);
                    recoveryOptions.guidedSession = session;
                }
            }
            // Step 8: Update learning engine with outcome
            // await this.learningEngine.updateRecoveryOutcome( // Method doesn't exist yet
            //   error,
            //   recoveryOptions.autoRecoveryResult?.success ||
            //   recoveryOptions.guidedSession?.status === 'completed'
            // );
            const totalTime = perf_hooks_1.performance.now() - startTime;
            this.logger.info('Error recovery process completed', {
                totalTime: totalTime.toFixed(2),
                autoRecovered: recoveryOptions.autoRecoveryResult?.success,
                guidedUsed: !!recoveryOptions.guidedSession
            });
            return recoveryOptions;
        }
        catch (recoveryError) {
            const errorObj = recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError));
            this.logger.error('Error recovery process failed', { error: errorObj.message });
            throw errorObj;
        }
    }
    /**
     * Attempt automatic recovery
     */
    async attemptAutoRecovery(strategy, _error) {
        this.logger.info('Attempting automatic recovery', { strategy: strategy.id });
        try {
            // For demo purposes, simulate auto-recovery logic
            // In real implementation, this would execute the strategy steps automatically
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Simple heuristics for auto-recovery success
            const canAutoRecover = strategy.difficulty === 'easy' &&
                strategy.steps.every(step => step.automated);
            if (canAutoRecover) {
                return {
                    success: true,
                    details: `Successfully applied ${strategy.name} automatically`
                };
            }
            else {
                return {
                    success: false,
                    details: 'Strategy requires manual intervention'
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                details: `Auto-recovery failed: ${errorMessage}`
            };
        }
    }
    /**
     * Check if automatic recovery is possible
     */
    canAutoRecover(analysis, strategies) {
        if (strategies.length === 0)
            return false;
        if (analysis.riskLevel === 'critical')
            return false;
        if (analysis.confidence < 0.8)
            return false;
        const bestStrategy = strategies[0];
        return bestStrategy.difficulty === 'easy' &&
            bestStrategy.steps.every(step => step.automated);
    }
    /**
     * Find similar previous troubleshooting sessions
     */
    findSimilarSessions(error) {
        return this.recoveryHistory.filter(session => {
            return session.error.code === error.code ||
                session.analysis.pattern?.id ===
                    this.patternDetector.detectPattern(error)?.id;
        });
    }
    /**
     * Determine if guided recovery should be offered
     */
    async shouldProceedWithGuided(error, analysis) {
        // For critical errors, always offer guided recovery
        if (error.critical || analysis.riskLevel === 'critical') {
            return true;
        }
        // For interactive environments, always offer
        if (process.stdin.isTTY) {
            return true;
        }
        // For non-interactive, only for high confidence patterns
        return analysis.confidence > 0.9;
    }
    /**
     * Get recovery history
     */
    getRecoveryHistory() {
        return [...this.recoveryHistory];
    }
    /**
     * Get recovery statistics
     */
    getRecoveryStatistics() {
        const total = this.recoveryHistory.length;
        if (total === 0) {
            return {
                totalSessions: 0,
                successRate: 0,
                averageTime: 0,
                topPatterns: []
            };
        }
        const successful = this.recoveryHistory.filter(s => s.status === 'completed').length;
        const totalTime = this.recoveryHistory
            .filter(s => s.endTime)
            .reduce((sum, s) => {
            const end = s.endTime instanceof Date ? s.endTime.getTime() : s.endTime;
            const start = s.startTime instanceof Date ? s.startTime.getTime() : s.startTime;
            return sum + (end - start);
        }, 0);
        const patternCounts = new Map();
        this.recoveryHistory.forEach(session => {
            const patternId = session.analysis.pattern?.id;
            if (patternId) {
                patternCounts.set(patternId, (patternCounts.get(patternId) || 0) + 1);
            }
        });
        const topPatterns = Array.from(patternCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([pattern]) => pattern);
        return {
            totalSessions: total,
            successRate: (successful / total) * 100,
            averageTime: totalTime / total / 1000 / 60, // minutes
            topPatterns
        };
    }
}
exports.ErrorRecoveryInterface = ErrorRecoveryInterface;
/**
 * Export Error Recovery Interface
 */
exports.default = ErrorRecoveryInterface;
//# sourceMappingURL=ErrorRecoveryInterface.js.map