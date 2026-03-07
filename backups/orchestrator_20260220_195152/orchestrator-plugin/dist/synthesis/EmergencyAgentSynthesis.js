"use strict";
/**
 * Emergency Agent Synthesis Engine
 *
 * Dynamically creates working agents when files are missing or corrupted.
 * Ensures ZERO scenario can fail due to missing agent capabilities.
 *
 * KEY INNOVATION: Template-based agent creation that guarantees
 * functional agent generation for ANY task keywords combination.
 *
 * @version 1.0.0 - ZERO FAILURE TOLERANCE
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyAgentSynthesis = void 0;
const perf_hooks_1 = require("perf_hooks");
const events_1 = require("events");
const logger_1 = require("../utils/logger");
/**
 * Keyword Analysis Engine
 * Analyzes task keywords to determine required agent capabilities
 */
class KeywordAnalyzer {
    logger;
    keywordMappings;
    constructor() {
        this.logger = new logger_1.PluginLogger('KeywordAnalyzer');
        this.keywordMappings = new Map();
        this.initializeKeywordMappings();
    }
    /**
     * Analyze keywords to determine required capabilities
     */
    analyzeKeywords(keywords) {
        const capabilities = [];
        const domainCounts = new Map();
        let totalConfidence = 0;
        // Analyze each keyword
        for (const keyword of keywords) {
            const normalizedKeyword = keyword.toLowerCase().trim();
            const keywordCapabilities = this.getCapabilitiesForKeyword(normalizedKeyword);
            capabilities.push(...keywordCapabilities);
            // Track domain frequency
            keywordCapabilities.forEach(cap => {
                domainCounts.set(cap.domain, (domainCounts.get(cap.domain) || 0) + 1);
            });
            totalConfidence += this.getKeywordConfidence(normalizedKeyword);
        }
        // Determine primary domain
        const primaryDomain = this.determinePrimaryDomain(domainCounts);
        // Calculate complexity level
        const complexityLevel = this.calculateComplexityLevel(keywords, capabilities);
        // Calculate final confidence score
        const confidenceScore = keywords.length > 0 ? totalConfidence / keywords.length : 0.5;
        // Remove duplicates
        const uniqueCapabilities = this.deduplicateCapabilities(capabilities);
        return {
            capabilities: uniqueCapabilities,
            primaryDomain,
            complexityLevel,
            confidenceScore: Math.min(confidenceScore, 1.0)
        };
    }
    getCapabilitiesForKeyword(keyword) {
        const mappings = this.keywordMappings.get(keyword) || [];
        // Fallback mapping for unknown keywords
        if (mappings.length === 0) {
            return this.getFallbackCapabilities(keyword);
        }
        return mappings;
    }
    getFallbackCapabilities(keyword) {
        // Intelligent fallback based on keyword patterns
        const fallbacks = [];
        // Code-related fallbacks
        if (/code|implement|develop|program|script/.test(keyword)) {
            fallbacks.push({
                id: 'basic-coding',
                name: 'Basic Coding',
                domain: 'coding',
                priority: 'high',
                description: 'Basic code implementation and file operations'
            });
        }
        // Analysis-related fallbacks
        if (/analyz|explore|search|find|investigate/.test(keyword)) {
            fallbacks.push({
                id: 'basic-analysis',
                name: 'Basic Analysis',
                domain: 'analysis',
                priority: 'medium',
                description: 'Basic file analysis and structure exploration'
            });
        }
        // Documentation fallbacks
        if (/document|doc|readme|comment|explain/.test(keyword)) {
            fallbacks.push({
                id: 'basic-documentation',
                name: 'Basic Documentation',
                domain: 'documentation',
                priority: 'medium',
                description: 'Basic documentation and commenting'
            });
        }
        // Test-related fallbacks
        if (/test|debug|fix|error|bug/.test(keyword)) {
            fallbacks.push({
                id: 'basic-testing',
                name: 'Basic Testing',
                domain: 'testing',
                priority: 'medium',
                description: 'Basic testing and debugging capabilities'
            });
        }
        // Default fallback if no patterns match
        if (fallbacks.length === 0) {
            fallbacks.push({
                id: 'general-purpose',
                name: 'General Purpose',
                domain: 'general',
                priority: 'medium',
                description: 'General purpose task handling with basic capabilities'
            });
        }
        return fallbacks;
    }
    getKeywordConfidence(keyword) {
        // Known keywords have higher confidence
        if (this.keywordMappings.has(keyword)) {
            return 0.9;
        }
        // Pattern-based confidence for unknown keywords
        const patterns = [
            { pattern: /^(gui|ui|interface|widget|dialog)$/i, confidence: 0.8 },
            { pattern: /^(database|sql|query|schema)$/i, confidence: 0.8 },
            { pattern: /^(test|debug|fix|error)$/i, confidence: 0.8 },
            { pattern: /^(code|implement|develop)$/i, confidence: 0.8 },
            { pattern: /^(analyze|explore|search)$/i, confidence: 0.7 },
            { pattern: /^(document|doc|readme)$/i, confidence: 0.7 }
        ];
        for (const { pattern, confidence } of patterns) {
            if (pattern.test(keyword)) {
                return confidence;
            }
        }
        return 0.5; // Default confidence for unknown keywords
    }
    determinePrimaryDomain(domainCounts) {
        if (domainCounts.size === 0)
            return 'general';
        let maxCount = 0;
        let primaryDomain = 'general';
        domainCounts.forEach((count, domain) => {
            if (count > maxCount) {
                maxCount = count;
                primaryDomain = domain;
            }
        });
        return primaryDomain;
    }
    calculateComplexityLevel(keywords, capabilities) {
        const keywordCount = keywords.length;
        const capabilityCount = capabilities.length;
        const highPriorityCount = capabilities.filter(cap => cap.priority === 'high').length;
        // Complexity scoring
        let complexityScore = 0;
        complexityScore += keywordCount * 0.2;
        complexityScore += capabilityCount * 0.3;
        complexityScore += highPriorityCount * 0.5;
        if (complexityScore >= 2.0)
            return 'high';
        if (complexityScore >= 1.0)
            return 'medium';
        return 'low';
    }
    deduplicateCapabilities(capabilities) {
        const seen = new Set();
        return capabilities.filter(cap => {
            if (seen.has(cap.id))
                return false;
            seen.add(cap.id);
            return true;
        });
    }
    initializeKeywordMappings() {
        // GUI/UI Domain
        const guiCapabilities = [
            {
                id: 'gui-development',
                name: 'GUI Development',
                domain: 'gui',
                priority: 'high',
                description: 'PyQt5/Qt GUI development, layouts, widgets, signals'
            },
            {
                id: 'ui-design',
                name: 'UI Design',
                domain: 'gui',
                priority: 'medium',
                description: 'User interface design and user experience'
            }
        ];
        ['gui', 'ui', 'interface', 'pyqt5', 'qt', 'widget', 'dialog', 'layout'].forEach(keyword => {
            this.keywordMappings.set(keyword, guiCapabilities);
        });
        // Database Domain
        const databaseCapabilities = [
            {
                id: 'database-design',
                name: 'Database Design',
                domain: 'database',
                priority: 'high',
                description: 'Database schema design, optimization, migrations'
            },
            {
                id: 'sql-queries',
                name: 'SQL Queries',
                domain: 'database',
                priority: 'medium',
                description: 'SQL query writing and optimization'
            }
        ];
        ['database', 'sql', 'sqlite', 'postgresql', 'query', 'schema', 'migration'].forEach(keyword => {
            this.keywordMappings.set(keyword, databaseCapabilities);
        });
        // Coding Domain
        const codingCapabilities = [
            {
                id: 'code-implementation',
                name: 'Code Implementation',
                domain: 'coding',
                priority: 'high',
                description: 'General coding, implementation, file operations'
            },
            {
                id: 'refactoring',
                name: 'Code Refactoring',
                domain: 'coding',
                priority: 'medium',
                description: 'Code refactoring and optimization'
            }
        ];
        ['code', 'implement', 'develop', 'program', 'script', 'function', 'class', 'module'].forEach(keyword => {
            this.keywordMappings.set(keyword, codingCapabilities);
        });
        // Testing Domain
        const testingCapabilities = [
            {
                id: 'testing-qa',
                name: 'Testing & QA',
                domain: 'testing',
                priority: 'high',
                description: 'Testing, debugging, performance analysis'
            },
            {
                id: 'error-handling',
                name: 'Error Handling',
                domain: 'testing',
                priority: 'medium',
                description: 'Error detection and handling strategies'
            }
        ];
        ['test', 'debug', 'fix', 'error', 'bug', 'performance', 'qa', 'quality'].forEach(keyword => {
            this.keywordMappings.set(keyword, testingCapabilities);
        });
        // Analysis Domain
        const analysisCapabilities = [
            {
                id: 'codebase-analysis',
                name: 'Codebase Analysis',
                domain: 'analysis',
                priority: 'high',
                description: 'Code analysis, exploration, structure understanding'
            },
            {
                id: 'pattern-recognition',
                name: 'Pattern Recognition',
                domain: 'analysis',
                priority: 'medium',
                description: 'Pattern detection and analysis'
            }
        ];
        ['analyze', 'exploration', 'search', 'find', 'investigate', 'examine', 'review'].forEach(keyword => {
            this.keywordMappings.set(keyword, analysisCapabilities);
        });
        // Documentation Domain
        const documentationCapabilities = [
            {
                id: 'technical-writing',
                name: 'Technical Writing',
                domain: 'documentation',
                priority: 'medium',
                description: 'Technical documentation, comments, README files'
            },
            {
                id: 'code-commenting',
                name: 'Code Commenting',
                domain: 'documentation',
                priority: 'medium',
                description: 'Code commenting and inline documentation'
            }
        ];
        ['document', 'doc', 'readme', 'comment', 'documentation', 'explain', 'describe'].forEach(keyword => {
            this.keywordMappings.set(keyword, documentationCapabilities);
        });
        this.logger.info(`Initialized keyword mappings for ${this.keywordMappings.size} keywords`);
    }
}
/**
 * Agent Template Generator
 * Creates agent templates based on required capabilities
 */
class AgentTemplateGenerator {
    logger;
    baseTemplates;
    constructor() {
        this.logger = new logger_1.PluginLogger('AgentTemplateGenerator');
        this.baseTemplates = new Map();
        this.initializeBaseTemplates();
    }
    /**
     * Generate agent template based on capabilities
     */
    generateTemplate(capabilities, primaryDomain, complexityLevel, taskContext) {
        // Get base template for primary domain
        const baseTemplate = this.baseTemplates.get(primaryDomain) || this.baseTemplates.get('general');
        // Customize template based on capabilities
        const customizedTemplate = {
            ...baseTemplate,
            id: `emergency-${primaryDomain}-${Date.now()}`,
            name: `Emergency ${this.capitalizeFirst(primaryDomain)} Agent`,
            capabilities: capabilities,
            complexityLevel,
            instructions: this.generateInstructions(capabilities, complexityLevel, taskContext),
            prompt: this.generatePrompt(capabilities, primaryDomain, taskContext),
            metadata: {
                ...baseTemplate.metadata,
                synthetic: true,
                generatedAt: new Date().toISOString(),
                taskKeywords: taskContext.keywords,
                urgencyLevel: taskContext.urgency
            }
        };
        this.logger.info('Generated emergency agent template', {
            templateId: customizedTemplate.id,
            domain: primaryDomain,
            capabilities: capabilities.length,
            complexity: complexityLevel
        });
        return customizedTemplate;
    }
    generateInstructions(capabilities, complexity, taskContext) {
        const instructions = [];
        instructions.push('# EMERGENCY AGENT INSTRUCTIONS');
        instructions.push('> **AUTO-GENERATED:** This agent was created automatically during system recovery');
        instructions.push(`> **GENERATED:** ${new Date().toISOString()}`);
        instructions.push(`> **COMPLEXITY:** ${complexity.toUpperCase()}`);
        instructions.push('');
        // Role definition
        instructions.push('## PRIMARY ROLE');
        instructions.push('You are an emergency agent synthesized to handle tasks when primary agents are unavailable.');
        instructions.push('Provide functional results even with limited capabilities.');
        instructions.push('');
        // Capabilities section
        instructions.push('## CAPABILITIES');
        capabilities.forEach(cap => {
            instructions.push(`### ${cap.name} (Priority: ${cap.priority})`);
            instructions.push(cap.description);
            instructions.push('');
        });
        // Complexity-specific instructions
        instructions.push('## EXECUTION GUIDELINES');
        if (complexity === 'high') {
            instructions.push('- Break complex tasks into smaller, manageable steps');
            instructions.push('- Focus on core functionality first');
            instructions.push('- Provide progress updates for long-running operations');
        }
        else if (complexity === 'medium') {
            instructions.push('- Handle tasks efficiently with available capabilities');
            instructions.push('- Provide clear explanations for actions taken');
        }
        else {
            instructions.push('- Handle simple tasks directly');
            instructions.push('- Provide concise, actionable results');
        }
        // Emergency mode guidelines
        instructions.push('');
        instructions.push('## EMERGENCY MODE GUIDELINES');
        instructions.push('- Prioritize functional results over perfect implementation');
        instructions.push('- Use available tools and capabilities efficiently');
        instructions.push('- Provide clear indication when operating in limited mode');
        instructions.push('- Document any limitations or assumptions made');
        instructions.push('- Suggest follow-up actions when appropriate');
        // Fallback handling
        if (taskContext.fallbackMode) {
            instructions.push('');
            instructions.push('## FALLBACK MODE ACTIVE');
            instructions.push('- This agent is operating in fallback mode');
            instructions.push('- Some advanced features may not be available');
            instructions.push('- Focus on delivering basic functionality');
            instructions.push('- Clearly communicate any limitations to the user');
        }
        return instructions.join('\n');
    }
    generatePrompt(capabilities, primaryDomain, taskContext) {
        const prompts = [];
        prompts.push('You are an emergency agent specialized in:');
        const capabilityList = capabilities
            .sort((a, b) => {
            const priorities = { high: 3, medium: 2, low: 1 };
            return priorities[b.priority] - priorities[a.priority];
        })
            .map(cap => `- ${cap.name}: ${cap.description}`)
            .join('\n');
        prompts.push(capabilityList);
        prompts.push('');
        prompts.push('IMPORTANT CONTEXT:');
        prompts.push('- You are operating in emergency/recovery mode');
        prompts.push('- Primary agents are currently unavailable');
        prompts.push('- Focus on delivering functional results with available capabilities');
        prompts.push('- Be transparent about any limitations');
        if (taskContext.originalTask) {
            prompts.push('');
            prompts.push('ORIGINAL TASK CONTEXT:');
            prompts.push(`Task: ${taskContext.originalTask}`);
            if (taskContext.keywords.length > 0) {
                prompts.push(`Keywords: ${taskContext.keywords.join(', ')}`);
            }
        }
        prompts.push('');
        prompts.push('Provide practical, working solutions within your capabilities.');
        return prompts.join('\n');
    }
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    initializeBaseTemplates() {
        // General purpose template
        this.baseTemplates.set('general', {
            id: 'emergency-general',
            name: 'Emergency General Agent',
            domain: 'general',
            capabilities: [],
            complexityLevel: 'medium',
            instructions: '',
            prompt: '',
            metadata: {
                version: '1.0.0',
                type: 'emergency',
                synthetic: true
            }
        });
        // Coding domain template
        this.baseTemplates.set('coding', {
            id: 'emergency-coding',
            name: 'Emergency Coding Agent',
            domain: 'coding',
            capabilities: [],
            complexityLevel: 'medium',
            instructions: '',
            prompt: '',
            metadata: {
                version: '1.0.0',
                type: 'emergency',
                synthetic: true,
                specialization: 'coding'
            }
        });
        // GUI domain template
        this.baseTemplates.set('gui', {
            id: 'emergency-gui',
            name: 'Emergency GUI Agent',
            domain: 'gui',
            capabilities: [],
            complexityLevel: 'high',
            instructions: '',
            prompt: '',
            metadata: {
                version: '1.0.0',
                type: 'emergency',
                synthetic: true,
                specialization: 'gui'
            }
        });
        // Database domain template
        this.baseTemplates.set('database', {
            id: 'emergency-database',
            name: 'Emergency Database Agent',
            domain: 'database',
            capabilities: [],
            complexityLevel: 'medium',
            instructions: '',
            prompt: '',
            metadata: {
                version: '1.0.0',
                type: 'emergency',
                synthetic: true,
                specialization: 'database'
            }
        });
        // Testing domain template
        this.baseTemplates.set('testing', {
            id: 'emergency-testing',
            name: 'Emergency Testing Agent',
            domain: 'testing',
            capabilities: [],
            complexityLevel: 'medium',
            instructions: '',
            prompt: '',
            metadata: {
                version: '1.0.0',
                type: 'emergency',
                synthetic: true,
                specialization: 'testing'
            }
        });
        // Analysis domain template
        this.baseTemplates.set('analysis', {
            id: 'emergency-analysis',
            name: 'Emergency Analysis Agent',
            domain: 'analysis',
            capabilities: [],
            complexityLevel: 'low',
            instructions: '',
            prompt: '',
            metadata: {
                version: '1.0.0',
                type: 'emergency',
                synthetic: true,
                specialization: 'analysis'
            }
        });
        // Documentation domain template
        this.baseTemplates.set('documentation', {
            id: 'emergency-documentation',
            name: 'Emergency Documentation Agent',
            domain: 'documentation',
            capabilities: [],
            complexityLevel: 'low',
            instructions: '',
            prompt: '',
            metadata: {
                version: '1.0.0',
                type: 'emergency',
                synthetic: true,
                specialization: 'documentation'
            }
        });
        this.logger.info(`Initialized ${this.baseTemplates.size} base agent templates`);
    }
}
/**
 * Emergency Agent Synthesis Engine - Main Class
 * Coordinates the synthesis of emergency agents
 */
class EmergencyAgentSynthesis extends events_1.EventEmitter {
    logger;
    keywordAnalyzer;
    templateGenerator;
    config;
    synthesisCache = new Map();
    synthesisHistory = [];
    constructor(config) {
        super();
        this.logger = new logger_1.PluginLogger('EmergencyAgentSynthesis');
        this.keywordAnalyzer = new KeywordAnalyzer();
        this.templateGenerator = new AgentTemplateGenerator();
        this.config = {
            cacheEnabled: true,
            cacheTTL: 3600000, // 1 hour
            maxConcurrentSynthesis: 5,
            synthesisTimeout: 10000, // 10 seconds
            fallbackToMinimal: true,
            ...config
        };
        this.logger.info('Emergency Agent Synthesis Engine initialized', {
            config: this.config
        });
    }
    /**
     * Main synthesis method - creates agent from task context
     */
    async synthesizeAgent(taskContext) {
        const synthesisId = `synthesis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = perf_hooks_1.performance.now();
        this.logger.info('Starting emergency agent synthesis', {
            synthesisId,
            keywords: taskContext.keywords,
            urgency: taskContext.urgency
        });
        this.emit('synthesis-started', { synthesisId, taskContext });
        try {
            // Step 1: Check cache first
            if (this.config.cacheEnabled) {
                const cacheKey = this.generateCacheKey(taskContext);
                const cachedAgent = this.synthesisCache.get(cacheKey);
                if (cachedAgent) {
                    this.logger.info('Using cached synthesized agent', { synthesisId, cacheKey });
                    return cachedAgent;
                }
            }
            // Step 2: Analyze keywords to determine capabilities
            const analysis = this.keywordAnalyzer.analyzeKeywords(taskContext.keywords);
            this.logger.info('Keyword analysis completed', {
                synthesisId,
                primaryDomain: analysis.primaryDomain,
                capabilities: analysis.capabilities.length,
                complexity: analysis.complexityLevel,
                confidence: analysis.confidenceScore
            });
            // Step 3: Generate agent template
            const template = this.templateGenerator.generateTemplate(analysis.capabilities, analysis.primaryDomain, analysis.complexityLevel, taskContext);
            // Step 4: Create synthesized agent
            const synthesizedAgent = await this.createSynthesizedAgent(template, taskContext, synthesisId);
            // Step 5: Cache the result
            if (this.config.cacheEnabled) {
                const cacheKey = this.generateCacheKey(taskContext);
                this.synthesisCache.set(cacheKey, synthesizedAgent);
                // Set cache expiry
                setTimeout(() => {
                    this.synthesisCache.delete(cacheKey);
                }, this.config.cacheTTL);
            }
            // Step 6: Record synthesis result
            const totalTime = perf_hooks_1.performance.now() - startTime;
            const synthesisResult = {
                synthesisId,
                success: true,
                agent: synthesizedAgent,
                keywordAnalysis: analysis,
                synthesisTime: totalTime,
                timestamp: new Date().toISOString()
            };
            this.synthesisHistory.push(synthesisResult);
            this.emit('synthesis-completed', synthesisResult);
            this.logger.info('Emergency agent synthesis completed successfully', {
                synthesisId,
                agentType: synthesizedAgent.type,
                totalTime: totalTime.toFixed(2),
                capabilities: analysis.capabilities.length
            });
            return synthesizedAgent;
        }
        catch (error) {
            this.logger.error('Emergency agent synthesis failed', {
                synthesisId,
                error: error.message
            });
            // Fallback to minimal agent
            if (this.config.fallbackToMinimal) {
                const minimalAgent = await this.createMinimalAgent(taskContext, synthesisId);
                const synthesisResult = {
                    synthesisId,
                    success: true, // Success with fallback
                    agent: minimalAgent,
                    keywordAnalysis: null,
                    synthesisTime: perf_hooks_1.performance.now() - startTime,
                    fallbackUsed: true,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                this.synthesisHistory.push(synthesisResult);
                this.emit('synthesis-fallback', synthesisResult);
                return minimalAgent;
            }
            else {
                // Record failed synthesis
                const synthesisResult = {
                    synthesisId,
                    success: false,
                    agent: null,
                    keywordAnalysis: null,
                    synthesisTime: perf_hooks_1.performance.now() - startTime,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                this.synthesisHistory.push(synthesisResult);
                this.emit('synthesis-failed', synthesisResult);
                throw error;
            }
        }
    }
    /**
     * Create synthesized agent from template
     */
    async createSynthesizedAgent(template, taskContext, synthesisId) {
        const agentContent = this.generateAgentContent(template);
        const synthesizedAgent = {
            type: template.id,
            path: `:memory:${synthesisId}`,
            content: agentContent,
            synthetic: true,
            healingMethod: 'emergency-synthesis',
            template,
            capabilities: template.capabilities,
            metadata: {
                synthesisId,
                generated: new Date().toISOString(),
                taskContext: taskContext,
                version: '1.0.0',
                synthetic: true
            }
        };
        return synthesizedAgent;
    }
    /**
     * Create minimal fallback agent
     */
    async createMinimalAgent(taskContext, synthesisId) {
        const minimalContent = `# MINIMAL EMERGENCY AGENT

> **Auto-generated minimal agent**
> **Synthesis ID:** ${synthesisId}
> **Generated:** ${new Date().toISOString()}

## Role
Emergency minimal agent for basic task handling when synthesis fails.

## Capabilities
- Basic task processing
- Simple file operations
- Error-tolerant execution
- Minimal functionality guarantee

## Instructions
Provide basic functionality using available system capabilities.
Focus on delivering working results even with limitations.

## Task Context
${taskContext.originalTask ? `Original Task: ${taskContext.originalTask}` : 'No specific task context'}
${taskContext.keywords.length > 0 ? `Keywords: ${taskContext.keywords.join(', ')}` : 'No keywords provided'}

## Emergency Mode
This is a minimal emergency agent. Functionality is limited but guaranteed.`;
        // Create minimal template for the synthesized agent
        const minimalCapabilities = [{
                id: 'minimal-basic',
                name: 'Basic Operations',
                domain: 'general',
                priority: 'medium',
                description: 'Basic task handling with minimal capabilities'
            }];
        const minimalTemplate = {
            id: 'emergency-minimal',
            name: 'Emergency Minimal Agent',
            domain: 'general',
            capabilities: minimalCapabilities,
            complexityLevel: 'low',
            instructions: minimalContent,
            prompt: 'Provide basic functionality using available system capabilities.',
            metadata: {
                version: '1.0.0',
                type: 'emergency',
                synthetic: true,
                generatedAt: new Date().toISOString(),
                taskKeywords: taskContext.keywords,
                urgencyLevel: taskContext.urgency || 'normal',
                minimal: true
            }
        };
        const minimalAgent = {
            type: 'emergency-minimal',
            path: `:memory:minimal-${synthesisId}`,
            content: minimalContent,
            synthetic: true,
            healingMethod: 'minimal-fallback',
            template: minimalTemplate,
            capabilities: minimalCapabilities,
            metadata: {
                synthesisId,
                generated: new Date().toISOString(),
                taskContext: taskContext,
                version: '1.0.0',
                synthetic: true,
                minimal: true
            }
        };
        return minimalAgent;
    }
    /**
     * Generate agent file content from template
     */
    generateAgentContent(template) {
        const content = [];
        // Header
        content.push(`# ${template.name.toUpperCase()}`);
        content.push('');
        content.push(`> **Domain:** ${template.domain}`);
        content.push(`> **Type:** Emergency Synthesized Agent`);
        content.push(`> **Generated:** ${new Date().toISOString()}`);
        content.push(`> **Complexity:** ${template.complexityLevel.toUpperCase()}`);
        content.push('');
        // Capabilities
        if (template.capabilities.length > 0) {
            content.push('## CAPABILITIES');
            template.capabilities.forEach(cap => {
                content.push(`- **${cap.name}** (${cap.priority}): ${cap.description}`);
            });
            content.push('');
        }
        // Instructions
        content.push(template.instructions);
        content.push('');
        // Prompt
        content.push('## EXECUTION PROMPT');
        content.push(template.prompt);
        content.push('');
        // Metadata
        content.push('---');
        content.push('## METADATA');
        content.push('```json');
        content.push(JSON.stringify(template.metadata, null, 2));
        content.push('```');
        return content.join('\n');
    }
    /**
     * Generate cache key for task context
     */
    generateCacheKey(taskContext) {
        const keyParts = [
            taskContext.keywords.sort().join('-'),
            taskContext.urgency || 'normal',
            taskContext.fallbackMode ? 'fallback' : 'normal'
        ];
        return keyParts.join('|');
    }
    /**
     * Get synthesis statistics
     */
    getSynthesisStatistics() {
        const total = this.synthesisHistory.length;
        if (total === 0) {
            return {
                totalSyntheses: 0,
                successRate: 100,
                averageTime: 0,
                cacheHitRate: 0,
                domainDistribution: {},
                complexityDistribution: {}
            };
        }
        const successful = this.synthesisHistory.filter(s => s.success).length;
        const avgTime = this.synthesisHistory.reduce((sum, s) => sum + s.synthesisTime, 0) / total;
        // Domain distribution
        const domainDistribution = {};
        this.synthesisHistory.forEach(s => {
            if (s.keywordAnalysis) {
                const domain = s.keywordAnalysis.primaryDomain;
                domainDistribution[domain] = (domainDistribution[domain] || 0) + 1;
            }
        });
        // Complexity distribution
        const complexityDistribution = {};
        this.synthesisHistory.forEach(s => {
            if (s.keywordAnalysis) {
                const complexity = s.keywordAnalysis.complexityLevel;
                complexityDistribution[complexity] = (complexityDistribution[complexity] || 0) + 1;
            }
        });
        return {
            totalSyntheses: total,
            successRate: (successful / total) * 100,
            averageTime: avgTime,
            cacheHitRate: 0, // Would need cache hit tracking
            domainDistribution,
            complexityDistribution
        };
    }
    /**
     * Clear synthesis cache
     */
    clearCache() {
        this.synthesisCache.clear();
        this.logger.info('Emergency agent synthesis cache cleared');
    }
    /**
     * Get synthesis history
     */
    getSynthesisHistory() {
        return [...this.synthesisHistory];
    }
}
exports.EmergencyAgentSynthesis = EmergencyAgentSynthesis;
/**
 * Export Emergency Agent Synthesis Engine
 */
exports.default = EmergencyAgentSynthesis;
//# sourceMappingURL=EmergencyAgentSynthesis.js.map