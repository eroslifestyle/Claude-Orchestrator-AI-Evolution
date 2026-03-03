"use strict";
/**
 * CLEAN CONTEXT SYSTEM
 * ====================
 * Garantisce che ogni agent lavori con contesto pulito
 * per massima concentrazione ed efficienza.
 *
 * REGOLE:
 * 1. Ogni task inizia con /clear
 * 2. Agent riceve SOLO le informazioni necessarie
 * 3. Zero pollution da task precedenti
 * 4. Contesto minimo = massima efficienza
 *
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClearCommand = exports.prepareCleanTask = exports.taskWrapper = exports.cleanContext = exports.CleanTaskWrapper = exports.CleanContextManager = void 0;
const events_1 = require("events");
// =============================================================================
// PROMPT TEMPLATES
// =============================================================================
const CLEAN_START_PROMPT = `
# CLEAN CONTEXT - FRESH START

You are starting a NEW task with ZERO previous context.
Focus ONLY on the task below. Ignore any prior conversation.

---
`;
const AGENT_FOCUS_PROMPT = (agentName, expertise) => `
# AGENT: ${agentName}

## YOUR EXPERTISE
${expertise}

## RULES
1. Focus ONLY on this specific task
2. Do NOT reference previous tasks
3. Complete this task fully before anything else
4. Be concise and efficient

---
`;
const TASK_ONLY_PROMPT = (description, requirements) => `
# CURRENT TASK

## Description
${description}

${requirements.length > 0 ? `## Requirements
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}` : ''}

## Instructions
Execute this task now. Start immediately.
`;
const ISOLATION_FOOTER = `
---
Remember: This is an ISOLATED task. Do not carry over any context from other tasks.
`;
// =============================================================================
// CLEAN CONTEXT MANAGER
// =============================================================================
class CleanContextManager extends events_1.EventEmitter {
    config;
    state;
    agentExpertiseCache = new Map();
    constructor(config) {
        super();
        this.config = {
            clearBeforeTask: config?.clearBeforeTask ?? true,
            clearAfterTask: config?.clearAfterTask ?? false,
            isolateAgents: config?.isolateAgents ?? true,
            maxContextTokens: config?.maxContextTokens ?? 4000,
            maxHistoryItems: config?.maxHistoryItems ?? 0, // 0 = no history
            injectSystemPrompt: config?.injectSystemPrompt ?? true,
            injectAgentExpertise: config?.injectAgentExpertise ?? true,
            injectTaskOnly: config?.injectTaskOnly ?? true,
            stripUnnecessaryContext: config?.stripUnnecessaryContext ?? true,
            compressLargeInputs: config?.compressLargeInputs ?? true,
            focusMode: config?.focusMode ?? true
        };
        this.state = {
            isClean: true,
            lastCleared: Date.now(),
            taskCount: 0,
            totalTokensSaved: 0
        };
    }
    /**
     * Prepara un prompt pulito per un task
     */
    prepareCleanPrompt(context) {
        const optimizations = [];
        let systemPrompt = '';
        let userPrompt = '';
        // 1. Clear start
        if (this.config.clearBeforeTask) {
            systemPrompt += CLEAN_START_PROMPT;
            optimizations.push('clear_start');
        }
        // 2. Agent expertise
        if (this.config.injectAgentExpertise && context.agentExpertise) {
            const agentName = this.extractAgentName(context.agentFile);
            systemPrompt += AGENT_FOCUS_PROMPT(agentName, context.agentExpertise);
            optimizations.push('agent_expertise');
        }
        // 3. Task only
        if (this.config.injectTaskOnly) {
            userPrompt = TASK_ONLY_PROMPT(context.description, context.requiredContext);
            optimizations.push('task_only');
        }
        else {
            userPrompt = context.description;
        }
        // 4. Isolation footer
        if (this.config.isolateAgents) {
            userPrompt += ISOLATION_FOOTER;
            optimizations.push('isolation');
        }
        // 5. Focus mode - strip unnecessary words
        if (this.config.focusMode) {
            userPrompt = this.applyFocusMode(userPrompt);
            optimizations.push('focus_mode');
        }
        // 6. Compress if needed
        if (this.config.compressLargeInputs) {
            const { prompt, saved } = this.compressPrompt(userPrompt);
            userPrompt = prompt;
            if (saved > 0) {
                this.state.totalTokensSaved += saved;
                optimizations.push(`compressed_${saved}_tokens`);
            }
        }
        const contextSize = this.estimateTokens(systemPrompt + userPrompt);
        this.state.taskCount++;
        this.emit('promptPrepared', {
            taskId: context.taskId,
            contextSize,
            optimizations
        });
        return {
            systemPrompt,
            userPrompt,
            contextSize,
            isClean: true,
            optimizations
        };
    }
    /**
     * Genera il comando di clear per Claude Code
     */
    getClearCommand() {
        return '/clear';
    }
    /**
     * Genera prompt wrapper per Task tool
     */
    wrapForTaskTool(context) {
        const cleanPrompt = this.prepareCleanPrompt(context);
        // Formato per Task tool
        return `${cleanPrompt.systemPrompt}

${cleanPrompt.userPrompt}

---
[CLEAN CONTEXT ACTIVE - Task ID: ${context.taskId}]
[Optimizations: ${cleanPrompt.optimizations.join(', ')}]
[Context Size: ${cleanPrompt.contextSize} tokens]`;
    }
    /**
     * Prepara agent expertise dal file
     */
    async loadAgentExpertise(agentFile) {
        // Check cache
        if (this.agentExpertiseCache.has(agentFile)) {
            return this.agentExpertiseCache.get(agentFile);
        }
        // Expertise generica basata sul nome file
        const expertise = this.generateExpertiseFromFilename(agentFile);
        this.agentExpertiseCache.set(agentFile, expertise);
        return expertise;
    }
    /**
     * Genera expertise dal nome file
     */
    generateExpertiseFromFilename(agentFile) {
        const expertiseMap = {
            'gui': 'GUI development with PyQt5, Qt widgets, layouts, and user experience design.',
            'database': 'Database design, SQL queries, SQLite, migrations, and data modeling.',
            'security': 'Security best practices, authentication, authorization, JWT, encryption.',
            'api': 'API design, REST, GraphQL, endpoints, request/response handling.',
            'integration': 'System integration, webhooks, external APIs, messaging systems.',
            'trading': 'Trading strategies, risk management, position sizing, market analysis.',
            'mql': 'MQL4/MQL5 programming, Expert Advisors, MetaTrader integration.',
            'architect': 'Software architecture, design patterns, system design, scalability.',
            'tester': 'Testing strategies, unit tests, integration tests, debugging.',
            'devops': 'DevOps practices, Docker, CI/CD, deployment, infrastructure.',
            'mobile': 'Mobile development, iOS, Android, React Native, Flutter.',
            'ai': 'AI integration, LLMs, prompt engineering, embeddings, RAG.',
            'claude': 'Claude API, Anthropic ecosystem, MCP, tool use.',
            'documenter': 'Technical documentation, README, changelogs, code comments.',
            'coder': 'General programming, code implementation, algorithms.',
            'analyzer': 'Code analysis, review, optimization suggestions.',
            'reviewer': 'Code review, quality assurance, best practices enforcement.'
        };
        const lowerFile = agentFile.toLowerCase();
        for (const [key, expertise] of Object.entries(expertiseMap)) {
            if (lowerFile.includes(key)) {
                return expertise;
            }
        }
        return 'General software development and problem solving.';
    }
    /**
     * Estrai nome agent dal path
     */
    extractAgentName(agentFile) {
        const filename = agentFile.split('/').pop() || agentFile;
        return filename
            .replace('.md', '')
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }
    /**
     * Applica focus mode - rimuove verbosità
     */
    applyFocusMode(text) {
        // Rimuove frasi di cortesia inutili
        const removePhrases = [
            /please\s+/gi,
            /could you\s+/gi,
            /would you\s+/gi,
            /I would like you to\s+/gi,
            /if possible,?\s*/gi,
            /thank you\.?\s*/gi,
            /thanks\.?\s*/gi
        ];
        let focused = text;
        for (const phrase of removePhrases) {
            focused = focused.replace(phrase, '');
        }
        // Rimuove spazi multipli
        focused = focused.replace(/\s+/g, ' ').trim();
        return focused;
    }
    /**
     * Comprimi prompt se troppo lungo
     */
    compressPrompt(text) {
        const originalTokens = this.estimateTokens(text);
        if (originalTokens <= this.config.maxContextTokens) {
            return { prompt: text, saved: 0 };
        }
        // Strategia di compressione
        let compressed = text;
        // 1. Rimuovi commenti markdown
        compressed = compressed.replace(/<!--[\s\S]*?-->/g, '');
        // 2. Riduci liste verbose
        compressed = compressed.replace(/^(\s*[-*]\s+.{100,})/gm, (match) => {
            return match.substring(0, 100) + '...';
        });
        // 3. Rimuovi linee vuote multiple
        compressed = compressed.replace(/\n{3,}/g, '\n\n');
        const newTokens = this.estimateTokens(compressed);
        const saved = originalTokens - newTokens;
        return { prompt: compressed, saved };
    }
    /**
     * Stima token (approssimativa)
     */
    estimateTokens(text) {
        // ~4 caratteri per token in media
        return Math.ceil(text.length / 4);
    }
    /**
     * Reset state
     */
    reset() {
        this.state = {
            isClean: true,
            lastCleared: Date.now(),
            taskCount: 0,
            totalTokensSaved: 0
        };
        this.agentExpertiseCache.clear();
    }
    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.state,
            config: this.config
        };
    }
    /**
     * Update config
     */
    updateConfig(updates) {
        Object.assign(this.config, updates);
    }
}
exports.CleanContextManager = CleanContextManager;
// =============================================================================
// TASK WRAPPER - Per uso con Task tool
// =============================================================================
class CleanTaskWrapper {
    contextManager;
    constructor(config) {
        this.contextManager = new CleanContextManager(config);
    }
    /**
     * Wrappa un task per esecuzione pulita
     */
    wrap(taskId, description, agentFile) {
        const expertise = this.contextManager['generateExpertiseFromFilename'](agentFile);
        const context = {
            taskId,
            description,
            agentFile,
            agentExpertise: expertise,
            requiredContext: [],
            forbiddenContext: [],
            focusAreas: []
        };
        const wrappedPrompt = this.contextManager.wrapForTaskTool(context);
        const cleanPrompt = this.contextManager.prepareCleanPrompt(context);
        return {
            clearCommand: this.contextManager.getClearCommand(),
            prompt: wrappedPrompt,
            metadata: {
                taskId,
                agent: agentFile,
                contextSize: cleanPrompt.contextSize,
                optimizations: cleanPrompt.optimizations
            }
        };
    }
    /**
     * Get stats
     */
    getStats() {
        return this.contextManager.getStats();
    }
}
exports.CleanTaskWrapper = CleanTaskWrapper;
// =============================================================================
// SINGLETON & EXPORTS
// =============================================================================
exports.cleanContext = new CleanContextManager();
exports.taskWrapper = new CleanTaskWrapper();
/**
 * Prepara un task per esecuzione pulita
 */
function prepareCleanTask(taskId, description, agentFile) {
    return exports.taskWrapper.wrap(taskId, description, agentFile);
}
exports.prepareCleanTask = prepareCleanTask;
/**
 * Get clear command
 */
function getClearCommand() {
    return '/clear';
}
exports.getClearCommand = getClearCommand;
//# sourceMappingURL=clean-context.js.map