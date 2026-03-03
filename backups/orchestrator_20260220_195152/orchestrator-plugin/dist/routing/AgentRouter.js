"use strict";
/**
 * AgentRouter - Intelligent Agent Routing System
 *
 * Implementazione Architect Expert con design pattern modulare per
 * mappatura keyword → agent path con confidence-based selection.
 *
 * @version 1.0 - Fase 2 Implementation
 * @author Architect Expert Agent
 * @date 30 Gennaio 2026
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentRouter = exports.AgentRouter = void 0;
const logger_1 = require("../utils/logger");
// =============================================================================
// AGENT ROUTER CLASS
// =============================================================================
class AgentRouter {
    logger;
    agentRegistry;
    domainMappings; // domain -> agent names
    routingHistory;
    metrics;
    fallbackStrategy;
    constructor() {
        this.logger = new logger_1.PluginLogger('AgentRouter');
        this.agentRegistry = new Map();
        this.domainMappings = new Map();
        this.routingHistory = [];
        this.metrics = this.initializeMetrics();
        this.initializeAgentRegistry();
        this.initializeDomainMappings();
        this.initializeFallbackStrategy();
        this.logger.info('AgentRouter initialized with intelligent routing capabilities');
    }
    // =============================================================================
    // PUBLIC ROUTING API
    // =============================================================================
    /**
     * Route keywords to appropriate agents with confidence-based selection
     */
    async routeToAgents(domains, keywords, complexity = 'medium') {
        this.logger.debug('Starting agent routing', {
            domainCount: domains.length,
            keywordCount: keywords.length,
            complexity
        });
        try {
            // Primary routing based on domain confidence
            const primaryAgent = this.selectPrimaryAgent(domains);
            const fallbackAgents = this.selectFallbackAgents(domains, primaryAgent);
            // Calculate routing confidence
            const confidence = this.calculateRoutingConfidence(domains, primaryAgent);
            // Build execution strategy
            const executionStrategy = this.buildExecutionStrategy(primaryAgent, fallbackAgents, domains, complexity);
            // Generate reasoning explanation
            const reasoning = this.generateRoutingReasoning(domains, primaryAgent, confidence);
            // Estimate costs and time
            const { cost, timeMinutes } = this.estimateExecution(executionStrategy);
            const decision = {
                primaryAgent,
                fallbackAgents,
                confidence,
                reasoning,
                executionStrategy,
                estimatedCost: cost,
                estimatedTimeMinutes: timeMinutes
            };
            // Update metrics and history
            this.updateMetrics(decision);
            this.routingHistory.push(decision);
            this.logger.info('Agent routing completed', {
                primaryAgent: primaryAgent.name,
                confidence,
                fallbackCount: fallbackAgents.length
            });
            return decision;
        }
        catch (error) {
            this.logger.error('Agent routing failed', { error, domains, keywords });
            return this.createEmergencyRouting(complexity);
        }
    }
    /**
     * Get alternative routing options for a domain
     */
    getAlternativeRouting(domain) {
        const domainName = domain.name;
        const agentNames = this.domainMappings.get(domainName) || [];
        const agents = agentNames
            .map(name => this.agentRegistry.get(name))
            .filter(Boolean);
        return agents.sort((a, b) => {
            // Sort by model capability and specialization relevance
            const modelPriority = { 'opus': 3, 'sonnet': 2, 'haiku': 1 };
            return ((modelPriority[b.defaultModel] || 0) - (modelPriority[a.defaultModel] || 0)) ||
                (b.keywords.filter(k => domain.matchedKeywords.includes(k)).length -
                    a.keywords.filter(k => domain.matchedKeywords.includes(k)).length);
        });
    }
    /**
     * Validate routing decision before execution
     */
    validateRouting(decision) {
        const issues = [];
        const recommendations = [];
        // Check confidence threshold
        if (decision.confidence < 0.6) {
            issues.push(`Low routing confidence: ${decision.confidence.toFixed(2)}`);
            recommendations.push('Consider manual review or alternative agents');
        }
        // Check agent availability
        if (!this.agentRegistry.has(decision.primaryAgent.name)) {
            issues.push(`Primary agent not found: ${decision.primaryAgent.name}`);
            recommendations.push('Use fallback routing strategy');
        }
        // Check complexity vs agent capability
        const isComplexTask = decision.executionStrategy.batches.length > 3;
        const isSimpleAgent = decision.primaryAgent.defaultModel === 'haiku';
        if (isComplexTask && isSimpleAgent) {
            recommendations.push('Consider upgrading to sonnet/opus for complex tasks');
        }
        // Check estimated cost vs benefit
        if (decision.estimatedCost > 5.0) { // $5 threshold
            recommendations.push('High cost estimated - consider optimization');
        }
        return {
            valid: issues.length === 0,
            issues,
            recommendations
        };
    }
    /**
     * Get routing metrics and statistics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    // =============================================================================
    // PRIVATE ROUTING LOGIC
    // =============================================================================
    selectPrimaryAgent(domains) {
        if (domains.length === 0) {
            return this.fallbackStrategy.fallbackAgent;
        }
        const primaryDomain = domains[0];
        const candidates = this.getAlternativeRouting(primaryDomain);
        if (candidates.length === 0) {
            this.logger.warn('No candidates found for domain', { domain: primaryDomain.name });
            return this.fallbackStrategy.fallbackAgent;
        }
        // Select best candidate based on confidence and capability
        return candidates.reduce((best, candidate) => {
            const candidateScore = this.calculateAgentScore(candidate, primaryDomain);
            const bestScore = this.calculateAgentScore(best, primaryDomain);
            return candidateScore > bestScore ? candidate : best;
        });
    }
    selectFallbackAgents(domains, primaryAgent) {
        const fallbacks = [];
        // Add secondary domain agents
        domains.slice(1, 3).forEach(domain => {
            const candidates = this.getAlternativeRouting(domain);
            if (candidates.length > 0 && candidates[0].name !== primaryAgent.name) {
                fallbacks.push(candidates[0]);
            }
        });
        // Add general fallbacks
        const generalFallbacks = [
            this.agentRegistry.get('coder'),
            this.agentRegistry.get('analyzer'),
            this.fallbackStrategy.fallbackAgent
        ].filter(Boolean);
        generalFallbacks.forEach(agent => {
            if (!fallbacks.find(f => f.name === agent.name) && agent.name !== primaryAgent.name) {
                fallbacks.push(agent);
            }
        });
        return fallbacks.slice(0, 3); // Max 3 fallbacks
    }
    calculateRoutingConfidence(domains, primaryAgent) {
        if (domains.length === 0)
            return 0.1;
        const primaryDomain = domains[0];
        const agentMatchScore = this.calculateAgentMatchScore(primaryAgent, primaryDomain);
        const domainConfidence = primaryDomain.confidence;
        const multiDomainPenalty = domains.length > 1 ? 0.1 : 0;
        return Math.min((agentMatchScore * 0.6 + domainConfidence * 0.4) - multiDomainPenalty, 1.0);
    }
    buildExecutionStrategy(primaryAgent, fallbackAgents, domains, complexity) {
        const isMultiDomain = domains.length > 1;
        const isComplexTask = complexity === 'high' || complexity === 'extreme';
        // Determine execution type
        let type = 'sequential';
        if (isMultiDomain && domains.length <= 3) {
            type = 'parallel';
        }
        else if (isComplexTask && isMultiDomain) {
            type = 'hybrid';
        }
        // Build execution batches
        const batches = this.createExecutionBatches(primaryAgent, fallbackAgents, domains, type);
        // Configure retry and escalation
        const retryPolicy = this.createRetryPolicy(complexity);
        const escalationRules = this.createEscalationRules(complexity);
        return {
            type,
            batches,
            maxConcurrency: isMultiDomain ? Math.min(domains.length, 5) : 1,
            timeoutMinutes: this.calculateTimeout(complexity, domains.length),
            retryPolicy,
            escalationRules
        };
    }
    createExecutionBatches(primaryAgent, fallbackAgents, domains, type) {
        const batches = [];
        if (type === 'parallel' && domains.length > 1) {
            // Create parallel batches for independent domains
            domains.forEach((domain, index) => {
                const agent = index === 0 ? primaryAgent :
                    this.getAlternativeRouting(domain)[0] ||
                        fallbackAgents[0];
                if (agent) {
                    batches.push({
                        agents: [agent],
                        dependencies: [],
                        priority: index === 0 ? 1 : 2,
                        parallelizable: true
                    });
                }
            });
        }
        else if (type === 'hybrid') {
            // Mixed approach: parallel for independent, sequential for dependent
            batches.push({
                agents: [primaryAgent],
                dependencies: [],
                priority: 1,
                parallelizable: false
            });
            if (fallbackAgents.length > 0) {
                batches.push({
                    agents: fallbackAgents.slice(0, 2),
                    dependencies: [primaryAgent.name],
                    priority: 2,
                    parallelizable: true
                });
            }
        }
        else {
            // Sequential execution
            batches.push({
                agents: [primaryAgent, ...fallbackAgents.slice(0, 1)],
                dependencies: [],
                priority: 1,
                parallelizable: false
            });
        }
        return batches;
    }
    createRetryPolicy(complexity) {
        const baseRetries = { low: 1, medium: 2, high: 3, extreme: 5 };
        return {
            maxRetries: baseRetries[complexity],
            backoffStrategy: 'exponential',
            initialDelayMs: 1000,
            maxDelayMs: 30000,
            retryableErrors: [
                'agent_timeout',
                'temporary_failure',
                'rate_limit_exceeded',
                'resource_unavailable'
            ]
        };
    }
    createEscalationRules(complexity) {
        const rules = [
            {
                trigger: 'failure_count',
                action: 'upgrade_model',
                threshold: 2,
                cooldownMinutes: 5
            }
        ];
        if (complexity === 'high' || complexity === 'extreme') {
            rules.push({
                trigger: 'complexity_high',
                action: 'add_specialist',
                threshold: 0.8,
                cooldownMinutes: 10
            });
        }
        return rules;
    }
    calculateAgentScore(agent, domain) {
        const matchScore = this.calculateAgentMatchScore(agent, domain);
        const modelCapability = { 'haiku': 0.5, 'sonnet': 0.8, 'opus': 1.0 };
        const priorityBonus = { 'CRITICA': 0.2, 'ALTA': 0.1, 'MEDIA': 0.05, 'BASSA': 0 };
        return matchScore * 0.6 +
            modelCapability[agent.defaultModel] * 0.3 +
            (priorityBonus[agent.priority] || 0) * 0.1;
    }
    calculateAgentMatchScore(agent, domain) {
        const keywordMatches = agent.keywords.filter(k => domain.matchedKeywords.some(mk => mk.includes(k) || k.includes(mk))).length;
        const totalKeywords = Math.max(agent.keywords.length, 1);
        const matchRatio = keywordMatches / totalKeywords;
        // Boost for exact specialization match
        const specializationBoost = agent.specialization.toLowerCase()
            .includes(domain.name.toLowerCase()) ? 0.3 : 0;
        return Math.min(matchRatio + specializationBoost, 1.0);
    }
    generateRoutingReasoning(domains, primaryAgent, confidence) {
        const primaryDomain = domains[0];
        const isMultiDomain = domains.length > 1;
        let reasoning = `Selected ${primaryAgent.name} (${primaryAgent.defaultModel}) `;
        reasoning += `for ${primaryDomain.name} domain (confidence: ${confidence.toFixed(2)}). `;
        if (isMultiDomain) {
            reasoning += `Multi-domain request detected with ${domains.length} domains. `;
        }
        reasoning += `Agent specializes in: ${primaryAgent.specialization}. `;
        const keywordOverlap = primaryAgent.keywords.filter(k => primaryDomain.matchedKeywords.includes(k));
        if (keywordOverlap.length > 0) {
            reasoning += `Keyword matches: ${keywordOverlap.join(', ')}.`;
        }
        return reasoning;
    }
    estimateExecution(strategy) {
        const modelCosts = { 'haiku': 0.01, 'sonnet': 0.05, 'opus': 0.15 }; // Per execution
        const baseTimeMinutes = { 'haiku': 2, 'sonnet': 5, 'opus': 10 };
        let totalCost = 0;
        let maxTime = 0;
        strategy.batches.forEach(batch => {
            let batchCost = 0;
            let batchTime = 0;
            batch.agents.forEach(agent => {
                batchCost += modelCosts[agent.defaultModel];
                batchTime = Math.max(batchTime, baseTimeMinutes[agent.defaultModel]);
            });
            totalCost += batchCost;
            if (batch.parallelizable) {
                maxTime = Math.max(maxTime, batchTime);
            }
            else {
                maxTime += batchTime;
            }
        });
        return {
            cost: totalCost,
            timeMinutes: maxTime
        };
    }
    createEmergencyRouting(complexity) {
        const emergencyAgent = this.fallbackStrategy.fallbackAgent;
        return {
            primaryAgent: emergencyAgent,
            fallbackAgents: [],
            confidence: 0.1,
            reasoning: 'Emergency routing due to routing failure',
            executionStrategy: {
                type: 'sequential',
                batches: [{
                        agents: [emergencyAgent],
                        dependencies: [],
                        priority: 1,
                        parallelizable: false
                    }],
                maxConcurrency: 1,
                timeoutMinutes: 10,
                retryPolicy: this.createRetryPolicy(complexity),
                escalationRules: []
            },
            estimatedCost: 0.01,
            estimatedTimeMinutes: 5
        };
    }
    calculateTimeout(complexity, domainCount) {
        const baseTimeout = { low: 5, medium: 10, high: 20, extreme: 40 };
        return baseTimeout[complexity] + (domainCount * 2);
    }
    // =============================================================================
    // INITIALIZATION & METRICS
    // =============================================================================
    initializeAgentRegistry() {
        // Load from config/agent-registry.json
        // For now, creating core agents from the structure
        const agents = [
            {
                name: 'orchestrator',
                filePath: 'core/orchestrator.md',
                role: 'Central coordination hub',
                specialization: 'Multi-agent orchestration, parallelism, delegation',
                keywords: ['orchestrate', 'coordinate', 'manage', 'delegate', 'parallel'],
                defaultModel: 'sonnet',
                priority: 'ALTA',
                size_kb: 118,
                version: '5.3'
            },
            {
                name: 'coder',
                filePath: 'core/coder.md',
                role: 'General implementation specialist',
                specialization: 'Coding generale, implementazione feature, bug fixing',
                keywords: ['code', 'implement', 'develop', 'create', 'build', 'fix'],
                defaultModel: 'sonnet',
                priority: 'MEDIA',
                size_kb: 8.2,
                version: '2.8'
            },
            {
                name: 'analyzer',
                filePath: 'core/analyzer.md',
                role: 'Code exploration specialist',
                specialization: 'Analisi codebase, esplorazione file, keyword search',
                keywords: ['analyze', 'explore', 'search', 'find', 'structure', 'codebase'],
                defaultModel: 'haiku',
                priority: 'ALTA',
                size_kb: 5.5,
                version: '2.1'
            },
            {
                name: 'gui-super-expert',
                filePath: 'experts/gui-super-expert.md',
                role: 'UI/UX specialist',
                specialization: 'PyQt5, Qt, UI, Widget, Tab, Dialog, Layout, Design Systems',
                keywords: ['gui', 'ui', 'ux', 'interface', 'widget', 'pyqt', 'qt', 'layout', 'dialog'],
                defaultModel: 'sonnet',
                priority: 'ALTA',
                size_kb: 7.1,
                version: '2.0'
            },
            {
                name: 'architect_expert',
                filePath: 'experts/architect_expert.md',
                role: 'Software architecture specialist',
                specialization: 'System Design, API Design, Design Pattern, Microservizi',
                keywords: ['architecture', 'design', 'pattern', 'system', 'api', 'microservices'],
                defaultModel: 'opus',
                priority: 'ALTA',
                size_kb: 21.6,
                version: '2.1'
            }
        ];
        agents.forEach(agent => {
            this.agentRegistry.set(agent.name, agent);
        });
        this.logger.debug('Agent registry initialized', { count: agents.length });
    }
    initializeDomainMappings() {
        const mappings = [
            { domain: 'gui', agents: ['gui-super-expert'] },
            { domain: 'testing', agents: ['tester_expert'] },
            { domain: 'database', agents: ['database_expert'] },
            { domain: 'security', agents: ['security_unified_expert'] },
            { domain: 'architecture', agents: ['architect_expert'] },
            { domain: 'implementation', agents: ['coder', 'languages_expert'] },
            { domain: 'analysis', agents: ['analyzer'] },
            { domain: 'orchestration', agents: ['orchestrator'] }
        ];
        mappings.forEach(({ domain, agents }) => {
            this.domainMappings.set(domain, agents);
        });
        this.logger.debug('Domain mappings initialized', { domains: mappings.length });
    }
    initializeFallbackStrategy() {
        const fallbackAgent = this.agentRegistry.get('coder') || {
            name: 'coder',
            filePath: 'core/coder.md',
            role: 'General implementation specialist',
            specialization: 'Coding generale, implementazione feature, bug fixing',
            keywords: ['code', 'implement', 'develop'],
            defaultModel: 'sonnet',
            priority: 'MEDIA',
            size_kb: 8.2,
            version: '2.8'
        };
        this.fallbackStrategy = {
            strategy: 'graceful_degradation',
            fallbackAgent,
            confidenceThreshold: 0.3,
            maxFallbackDepth: 3
        };
        this.logger.debug('Fallback strategy initialized');
    }
    initializeMetrics() {
        return {
            totalRoutings: 0,
            successRate: 1.0,
            averageConfidence: 0.0,
            agentUsageStats: new Map(),
            fallbackUsageRate: 0.0,
            escalationRate: 0.0
        };
    }
    updateMetrics(decision) {
        this.metrics.totalRoutings++;
        this.metrics.averageConfidence =
            (this.metrics.averageConfidence * (this.metrics.totalRoutings - 1) + decision.confidence) /
                this.metrics.totalRoutings;
        const agentName = decision.primaryAgent.name;
        const currentUsage = this.metrics.agentUsageStats.get(agentName) || 0;
        this.metrics.agentUsageStats.set(agentName, currentUsage + 1);
    }
}
exports.AgentRouter = AgentRouter;
// =============================================================================
// FACTORY & EXPORTS
// =============================================================================
function createAgentRouter() {
    return new AgentRouter();
}
exports.createAgentRouter = createAgentRouter;
//# sourceMappingURL=AgentRouter.js.map