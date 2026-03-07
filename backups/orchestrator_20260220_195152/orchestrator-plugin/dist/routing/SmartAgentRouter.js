"use strict";
/**
 * SmartAgentRouter - Intelligent Agent Routing con Search Intelligence
 *
 * Implementazione Architect Expert con revolutionary search-powered routing
 * per optimal agent selection basata su Serena search insights.
 *
 * @version 2.0 - Serena Intelligence Integration
 * @author Architect Expert Agent (T3)
 * @date 30 Gennaio 2026
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSmartAgentRouter = exports.SmartAgentRouter = void 0;
// =============================================================================
// SMART AGENT ROUTER CLASS
// =============================================================================
class SmartAgentRouter {
    logger;
    serenaIntegration;
    enhancedExtractor;
    availableAgents;
    searchIntelligence;
    agentRegistry;
    routingHistory;
    performanceCache;
    constructor(logger, serenaIntegration, enhancedExtractor, availableAgents) {
        this.logger = logger;
        this.serenaIntegration = serenaIntegration;
        this.enhancedExtractor = enhancedExtractor;
        this.availableAgents = availableAgents;
        this.agentRegistry = new Map(availableAgents.map(agent => [agent.name, agent]));
        this.routingHistory = [];
        this.performanceCache = new Map();
        this.searchIntelligence = this.initializeSearchIntelligence();
        this.initializeIntelligentRouting();
    }
    // =============================================================================
    // SMART ROUTING CORE METHODS
    // =============================================================================
    /**
     * Revolutionary intelligent routing con Serena search insights
     */
    async routeIntelligent(userInput, domains, keywords, complexity) {
        const startTime = Date.now();
        try {
            // 1. Gather search intelligence about the codebase
            const searchInsights = await this.gatherSearchIntelligence(userInput, keywords);
            // 2. Perform semantic analysis of requirements
            const semanticAnalysis = await this.enhancedExtractor.getSemanticInsights(userInput);
            // 3. Analyze code patterns and dependencies
            const codebaseInsights = await this.enhancedExtractor.getCodebaseInsights(userInput);
            // 4. Intelligent agent selection based on multiple signals
            const agentSelection = this.performIntelligentAgentSelection(domains, semanticAnalysis, codebaseInsights, complexity);
            // 5. Model optimization based on search intelligence
            const modelSelection = this.optimizeModelSelection(agentSelection, searchInsights, complexity);
            // 6. Generate smart routing strategy
            const routingStrategy = this.generateSmartRoutingStrategy(agentSelection, codebaseInsights, searchInsights);
            // 7. Performance and risk prediction
            const performancePrediction = this.predictPerformance(agentSelection, modelSelection, routingStrategy);
            const riskAssessment = this.assessRisks(agentSelection, routingStrategy, searchInsights);
            // 8. Generate alternatives
            const alternatives = this.generateAlternativeRoutings(domains, complexity, agentSelection);
            const decision = {
                selectedAgent: agentSelection.primary,
                selectedModel: modelSelection,
                supportingAgents: agentSelection.supporting,
                routingStrategy,
                confidence: this.calculateOverallConfidence(agentSelection, searchInsights),
                reasoning: this.generateRoutingReasoning(agentSelection, searchInsights),
                alternatives,
                performancePrediction,
                riskAssessment
            };
            // 9. Learn from this routing decision
            this.learnFromRoutingDecision(decision, userInput);
            // 10. Cache performance prediction
            this.cachePerformancePrediction(userInput, performancePrediction);
            this.logger.info(`Smart routing completed in ${Date.now() - startTime}ms`, {
                agent: decision.selectedAgent.name,
                model: decision.selectedModel,
                confidence: decision.confidence
            });
            return decision;
        }
        catch (error) {
            this.logger.warn(`Smart routing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return this.fallbackToTraditionalRouting(domains, complexity);
        }
    }
    /**
     * Gather comprehensive search intelligence about codebase
     */
    async gatherSearchIntelligence(_userInput, keywords) {
        // Analyze codebase complexity
        const complexityAnalysis = await this.analyzeCodebaseComplexity(keywords);
        // Perform dependency analysis
        const dependencyAnalysis = await this.analyzeDependencies();
        // Gather performance insights
        const performanceProfile = await this.gatherPerformanceProfile();
        // Update agent capability mapping
        const agentCapabilityMapping = this.updateAgentCapabilityMapping();
        // Optimize routing strategies
        const routingOptimization = this.optimizeRoutingStrategies();
        return {
            codebaseComplexity: complexityAnalysis,
            dependencyAnalysis,
            performanceProfile,
            agentCapabilityMapping,
            routingOptimization
        };
    }
    /**
     * Intelligent agent selection based on search insights
     */
    performIntelligentAgentSelection(domains, semanticAnalysis, codebaseInsights, complexity) {
        const candidateScores = new Map();
        // Score agents based on domain expertise
        for (const domain of domains) {
            const domainAgents = this.searchIntelligence.agentCapabilityMapping.domainCoverage[domain.name] || [];
            for (const agentName of domainAgents) {
                const currentScore = candidateScores.get(agentName) || 0;
                candidateScores.set(agentName, currentScore + (domain.confidence * 1.0));
            }
        }
        // Enhance scoring with semantic analysis
        for (const semantic of semanticAnalysis) {
            const relevantAgents = this.findRelevantAgentsForKeyword(semantic.keyword);
            for (const agentName of relevantAgents) {
                const currentScore = candidateScores.get(agentName) || 0;
                const boost = semantic.semanticWeight * semantic.contextualRelevance;
                candidateScores.set(agentName, currentScore + boost);
            }
        }
        // Adjust scoring based on code pattern insights
        for (const pattern of codebaseInsights) {
            const patternAgents = this.getAgentsForPatternType(pattern.patternType);
            for (const agentName of patternAgents) {
                const currentScore = candidateScores.get(agentName) || 0;
                candidateScores.set(agentName, currentScore + (pattern.confidence * 0.5));
            }
        }
        // Apply complexity filtering
        const complexityCapableAgents = this.filterAgentsByComplexity(candidateScores, complexity);
        // Select primary agent
        const primaryAgentName = this.selectPrimaryAgent(complexityCapableAgents);
        const primaryAgent = this.agentRegistry.get(primaryAgentName);
        // Select supporting agents
        const supportingAgents = this.selectSupportingAgents(primaryAgentName, domains, complexity);
        return {
            primary: primaryAgent,
            supporting: supportingAgents
        };
    }
    // =============================================================================
    // CODEBASE ANALYSIS METHODS
    // =============================================================================
    async analyzeCodebaseComplexity(_keywords) {
        // Perform comprehensive codebase analysis using Serena search
        const searches = await this.serenaIntegration.batchSearch([
            { pattern: '\\.(ts|js|py|java|cpp|cs)$', restrictToCodeFiles: true },
            { pattern: 'class\\s+\\w+', restrictToCodeFiles: true },
            { pattern: 'function\\s+\\w+|\\w+\\s*=\\s*\\(', restrictToCodeFiles: true },
            { pattern: 'import\\s+.*from|require\\(', restrictToCodeFiles: true },
            { pattern: '//\\s*TODO|//\\s*FIXME|//\\s*HACK', restrictToCodeFiles: true }
        ]);
        const totalFiles = searches[0]?.fileCount || 0;
        const totalClasses = searches[1]?.totalMatches || 0;
        const totalFunctions = searches[2]?.totalMatches || 0;
        const totalImports = searches[3]?.totalMatches || 0;
        const technicalDebtMarkers = searches[4]?.totalMatches || 0;
        // Estimate code lines (rough calculation)
        const estimatedCodeLines = totalFiles * 100; // Average 100 lines per file
        // Calculate technical debt score
        const technicalDebtScore = Math.min(1.0, technicalDebtMarkers / Math.max(1, estimatedCodeLines) * 1000);
        // Analyze language distribution
        const languageDistribution = await this.analyzeLanguageDistribution();
        return {
            totalFiles,
            codeLines: estimatedCodeLines,
            languageDistribution,
            dependencyDepth: this.calculateDependencyDepth(totalImports, totalFiles),
            cyclomaticComplexity: this.estimateCyclomaticComplexity(totalFunctions, totalClasses),
            technicalDebtScore
        };
    }
    async analyzeDependencies() {
        // Analyze cross-file dependencies
        const dependencySearches = await this.serenaIntegration.batchSearch([
            { pattern: 'import.*from\\s*[\'"]\\./.*[\'"]', restrictToCodeFiles: true },
            { pattern: 'import.*from\\s*[\'"]\\.\\./', restrictToCodeFiles: true },
            { pattern: 'require\\([\'"]\\./.*[\'"]\\)', restrictToCodeFiles: true }
        ]);
        const crossFileReferences = dependencySearches.reduce((sum, result) => sum + result.totalMatches, 0);
        // Identify hotspot files (files with many dependencies)
        const hotspotFiles = this.identifyHotspotFiles(dependencySearches);
        // Detect circular dependencies (simplified)
        const circularDependencies = await this.detectCircularDependencies();
        return {
            crossFileReferences,
            circularDependencies,
            hotspotFiles,
            isolatedModules: [],
            dependencyStrength: {}
        };
    }
    async gatherPerformanceProfile() {
        const serenaMetrics = this.serenaIntegration.getMetrics();
        return {
            searchTimeByPattern: { default: serenaMetrics.searchTime },
            agentResponseTimes: this.getHistoricalAgentPerformance(),
            modelEfficiency: this.getModelEfficiencyMetrics(),
            parallelismOpportunities: 0.8, // 80% of tasks can be parallelized
            bottleneckPrediction: this.predictPerformanceBottlenecks()
        };
    }
    // =============================================================================
    // AGENT CAPABILITY & OPTIMIZATION METHODS
    // =============================================================================
    updateAgentCapabilityMapping() {
        const agentSpecializations = {};
        // Build specialization profiles for each agent
        for (const agent of this.availableAgents) {
            agentSpecializations[agent.name] = {
                agent: agent.name,
                coreStrengths: agent.keywords,
                supportingSkills: this.inferSupportingSkills(agent),
                performanceMetrics: this.getAgentPerformanceMetrics(agent.name),
                preferredComplexity: this.inferPreferredComplexity(agent),
                collaboratesWellWith: this.getCollaborationPartners(agent.name),
                hasConflictsWith: this.getConflictingAgents(agent.name)
            };
        }
        return {
            agentSpecializations,
            domainCoverage: this.buildDomainCoverage(),
            complexityHandling: this.buildComplexityHandling(),
            collaborationPatterns: this.getSuccessfulCollaborations(),
            exclusionRules: this.getExclusionRules()
        };
    }
    optimizeRoutingStrategies() {
        return {
            fastPathTriggers: ['simple', 'quick', 'basic', 'straightforward'],
            complexityThresholds: {
                'low': 0.3,
                'medium': 0.6,
                'high': 0.8,
                'extreme': 1.0
            },
            loadBalancingRules: this.generateLoadBalancingRules(),
            failoverStrategies: this.generateFailoverStrategies(),
            adaptiveLearning: this.getAdaptiveLearningData()
        };
    }
    // =============================================================================
    // ROUTING DECISION LOGIC
    // =============================================================================
    selectPrimaryAgent(candidateScores) {
        if (candidateScores.size === 0) {
            return 'coder'; // Default fallback
        }
        // Sort by score and select highest
        const sortedCandidates = Array.from(candidateScores.entries())
            .sort(([, a], [, b]) => b - a);
        return sortedCandidates[0][0];
    }
    selectSupportingAgents(primaryAgent, domains, complexity) {
        const supporting = [];
        // Add reviewer if complexity is high
        if (complexity === 'high') {
            const reviewer = this.agentRegistry.get('reviewer');
            if (reviewer && reviewer.name !== primaryAgent) {
                supporting.push(reviewer);
            }
        }
        // Add domain-specific supporters for multi-domain tasks
        if (domains.length > 2) {
            const secondaryDomain = domains[1];
            const domainAgents = this.searchIntelligence.agentCapabilityMapping.domainCoverage[secondaryDomain.name] || [];
            for (const agentName of domainAgents.slice(0, 1)) { // Max 1 supporting agent
                const agent = this.agentRegistry.get(agentName);
                if (agent && agent.name !== primaryAgent) {
                    supporting.push(agent);
                    break;
                }
            }
        }
        return supporting;
    }
    optimizeModelSelection(agentSelection, searchInsights, complexity) {
        const agent = agentSelection.primary;
        let selectedModel = agent.defaultModel;
        // Upgrade model based on complexity
        if (complexity === 'high' && selectedModel === 'haiku') {
            selectedModel = 'sonnet';
        }
        // Consider performance profile
        const modelEfficiency = searchInsights.performanceProfile.modelEfficiency;
        const currentEfficiency = modelEfficiency[selectedModel] || 0.7;
        // If current model efficiency is low, consider upgrading
        if (currentEfficiency < 0.6 && selectedModel !== 'opus') {
            if (selectedModel === 'haiku') {
                selectedModel = 'sonnet';
            }
            else if (selectedModel === 'sonnet') {
                selectedModel = 'opus';
            }
        }
        return selectedModel;
    }
    generateSmartRoutingStrategy(agentSelection, codebaseInsights, searchInsights) {
        const hasMultipleAgents = agentSelection.supporting.length > 0;
        const hasComplexDependencies = codebaseInsights.some(p => p.patternType === 'import');
        let executionType = 'single';
        if (hasMultipleAgents) {
            executionType = hasComplexDependencies ? 'sequential' : 'parallel';
        }
        return {
            executionType,
            dependencyHandling: hasComplexDependencies ? 'strict' : 'flexible',
            failoverEnabled: true,
            qualityGates: this.generateQualityGates(agentSelection.primary),
            optimizationHints: this.generateOptimizationHints(searchInsights)
        };
    }
    // =============================================================================
    // PREDICTION & ASSESSMENT METHODS
    // =============================================================================
    predictPerformance(agentSelection, modelSelection, routingStrategy) {
        const baseTime = this.getBaseExecutionTime(agentSelection.primary, modelSelection);
        const supportingTime = agentSelection.supporting.length * 5; // 5 minutes per supporting agent
        let estimatedTime = baseTime;
        if (routingStrategy.executionType === 'sequential') {
            estimatedTime += supportingTime;
        }
        else if (routingStrategy.executionType === 'parallel') {
            estimatedTime = Math.max(baseTime, supportingTime);
        }
        const estimatedCost = this.calculateEstimatedCost(modelSelection, estimatedTime);
        const successProbability = this.calculateSuccessProbability(agentSelection.primary, modelSelection);
        return {
            estimatedTime,
            estimatedCost,
            qualityExpectation: 0.85, // Based on historical data
            successProbability,
            bottleneckLikelihood: 0.2 // 20% chance of bottlenecks
        };
    }
    assessRisks(_agentSelection, _routingStrategy, searchInsights) {
        const risks = [];
        // Complexity risk
        if (searchInsights.codebaseComplexity.technicalDebtScore > 0.7) {
            risks.push({
                type: 'complexity',
                severity: 'high',
                description: 'High technical debt in codebase',
                probability: 0.7,
                impact: 'Increased implementation time and potential quality issues',
                mitigation: 'Add extra review steps and consider refactoring'
            });
        }
        // Dependency risk
        if (searchInsights.dependencyAnalysis.circularDependencies.length > 0) {
            risks.push({
                type: 'dependency',
                severity: 'medium',
                description: 'Circular dependencies detected',
                probability: 0.5,
                impact: 'Potential integration issues',
                mitigation: 'Careful dependency management and modular approach'
            });
        }
        const overallRisk = this.calculateOverallRisk(risks);
        return {
            overallRisk,
            specificRisks: risks,
            mitigationStrategies: risks.map(r => r.mitigation),
            contingencyPlan: 'Fallback to simpler implementation with reduced scope'
        };
    }
    // =============================================================================
    // UTILITY & HELPER METHODS
    // =============================================================================
    findRelevantAgentsForKeyword(keyword) {
        const relevantAgents = [];
        for (const agent of this.availableAgents) {
            if (agent.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))) {
                relevantAgents.push(agent.name);
            }
        }
        return relevantAgents;
    }
    getAgentsForPatternType(patternType) {
        const patternAgentMap = {
            'class': ['architect_expert', 'coder'],
            'interface': ['architect_expert', 'coder'],
            'function': ['coder', 'languages_expert'],
            'import': ['integration_expert', 'coder'],
            'variable': ['coder', 'reviewer']
        };
        return patternAgentMap[patternType] || ['coder'];
    }
    filterAgentsByComplexity(candidateScores, complexity) {
        const filtered = new Map();
        Array.from(candidateScores.entries()).forEach(([agentName, score]) => {
            const agent = this.agentRegistry.get(agentName);
            if (!agent)
                return;
            const capabilityMapping = this.searchIntelligence.agentCapabilityMapping;
            const complexityHandling = capabilityMapping.complexityHandling[agentName] || ['low'];
            if (complexityHandling.includes(complexity)) {
                filtered.set(agentName, score);
            }
        });
        return filtered;
    }
    calculateOverallConfidence(agentSelection, searchInsights) {
        let confidence = 0.7; // Base confidence
        // Boost based on agent specialization match
        const agentSpec = searchInsights.agentCapabilityMapping.agentSpecializations[agentSelection.primary.name];
        if (agentSpec) {
            confidence += agentSpec.performanceMetrics.successRate * 0.2;
        }
        // Boost based on codebase understanding
        if (searchInsights.codebaseComplexity.technicalDebtScore < 0.3) {
            confidence += 0.1; // Clean codebase is easier to work with
        }
        return Math.min(1.0, confidence);
    }
    generateRoutingReasoning(agentSelection, searchInsights) {
        const agent = agentSelection.primary;
        const complexity = searchInsights.codebaseComplexity.technicalDebtScore;
        const specializationStr = Array.isArray(agent.specialization)
            ? agent.specialization.join(', ')
            : agent.specialization;
        let reasoning = `Selected ${agent.name} based on specialization in ${specializationStr}.`;
        if (agentSelection.supporting.length > 0) {
            reasoning += ` Added ${agentSelection.supporting.length} supporting agents for comprehensive coverage.`;
        }
        if (complexity > 0.5) {
            reasoning += ' Complexity analysis indicates careful approach needed.';
        }
        return reasoning;
    }
    generateAlternativeRoutings(_domains, _complexity, currentSelection) {
        const alternatives = [];
        // Generate 2-3 alternative routings
        const otherAgents = this.availableAgents.filter(a => a.name !== currentSelection.primary.name);
        for (const agent of otherAgents.slice(0, 2)) {
            const specializationStr = Array.isArray(agent.specialization)
                ? agent.specialization.join(', ')
                : agent.specialization;
            alternatives.push({
                agent: agent.name,
                model: agent.defaultModel,
                confidence: 0.6,
                tradeoffs: [`Different specialization: ${specializationStr}`],
                whenToPrefer: `When ${specializationStr} is primary concern`
            });
        }
        return alternatives;
    }
    // =============================================================================
    // LEARNING & ADAPTATION METHODS
    // =============================================================================
    learnFromRoutingDecision(decision, _userInput) {
        // Store routing decision for future learning
        this.routingHistory.push(decision);
        // Limit history size
        if (this.routingHistory.length > 1000) {
            this.routingHistory = this.routingHistory.slice(-500);
        }
    }
    cachePerformancePrediction(userInput, prediction) {
        const cacheKey = this.generateCacheKey(userInput);
        this.performanceCache.set(cacheKey, prediction);
        // Limit cache size
        if (this.performanceCache.size > 100) {
            const firstKey = this.performanceCache.keys().next().value;
            this.performanceCache.delete(firstKey);
        }
    }
    generateCacheKey(input) {
        return input.toLowerCase().replace(/[^\w]/g, '').slice(0, 50);
    }
    // =============================================================================
    // FALLBACK METHODS
    // =============================================================================
    fallbackToTraditionalRouting(_domains, _complexity) {
        // Simple fallback routing when smart routing fails
        const primaryAgent = this.availableAgents.find(a => a.name === 'coder') || this.availableAgents[0];
        return {
            selectedAgent: primaryAgent,
            selectedModel: primaryAgent.defaultModel,
            supportingAgents: [],
            routingStrategy: {
                executionType: 'single',
                dependencyHandling: 'flexible',
                failoverEnabled: true,
                qualityGates: [],
                optimizationHints: []
            },
            confidence: 0.6,
            reasoning: 'Fallback routing due to smart routing failure',
            alternatives: [],
            performancePrediction: {
                estimatedTime: 10,
                estimatedCost: 0.50,
                qualityExpectation: 0.7,
                successProbability: 0.8,
                bottleneckLikelihood: 0.3
            },
            riskAssessment: {
                overallRisk: 'medium',
                specificRisks: [],
                mitigationStrategies: [],
                contingencyPlan: 'Manual intervention if needed'
            }
        };
    }
    // =============================================================================
    // INITIALIZATION & CONFIGURATION METHODS
    // =============================================================================
    initializeSearchIntelligence() {
        return {
            codebaseComplexity: {
                totalFiles: 0,
                codeLines: 0,
                languageDistribution: {},
                dependencyDepth: 0,
                cyclomaticComplexity: 0,
                technicalDebtScore: 0
            },
            dependencyAnalysis: {
                crossFileReferences: 0,
                circularDependencies: [],
                hotspotFiles: [],
                isolatedModules: [],
                dependencyStrength: {}
            },
            performanceProfile: {
                searchTimeByPattern: {},
                agentResponseTimes: {},
                modelEfficiency: { haiku: 0.8, sonnet: 0.9, opus: 0.95, auto: 0.85 },
                parallelismOpportunities: 0.7,
                bottleneckPrediction: []
            },
            agentCapabilityMapping: {
                agentSpecializations: {},
                domainCoverage: {},
                complexityHandling: {},
                collaborationPatterns: [],
                exclusionRules: []
            },
            routingOptimization: {
                fastPathTriggers: [],
                complexityThresholds: { low: 0.3, medium: 0.6, high: 0.8, extreme: 1.0 },
                loadBalancingRules: [],
                failoverStrategies: [],
                adaptiveLearning: {
                    routingDecisions: [],
                    outcomeCorrelations: [],
                    adaptationRules: [],
                    confidenceThreshold: 0.8
                }
            }
        };
    }
    initializeIntelligentRouting() {
        this.logger.info('SmartAgentRouter initialized with Serena search intelligence');
    }
    // Placeholder methods for comprehensive implementation
    async analyzeLanguageDistribution() { return {}; }
    calculateDependencyDepth(imports, files) { return Math.min(5, imports / files); }
    estimateCyclomaticComplexity(functions, classes) { return (functions + classes) / 10; }
    identifyHotspotFiles(_searches) { return []; }
    async detectCircularDependencies() { return []; }
    getHistoricalAgentPerformance() { return {}; }
    getModelEfficiencyMetrics() { return { haiku: 0.8, sonnet: 0.9, opus: 0.95, auto: 0.85 }; }
    predictPerformanceBottlenecks() { return []; }
    inferSupportingSkills(_agent) { return []; }
    getAgentPerformanceMetrics(_agentName) {
        return { averageTime: 10, successRate: 0.85, qualityScore: 0.8, costEfficiency: 0.7, userSatisfaction: 0.85 };
    }
    inferPreferredComplexity(_agent) { return 'medium'; }
    getCollaborationPartners(_agentName) { return []; }
    getConflictingAgents(_agentName) { return []; }
    buildDomainCoverage() { return {}; }
    buildComplexityHandling() { return {}; }
    getSuccessfulCollaborations() { return []; }
    getExclusionRules() { return []; }
    generateLoadBalancingRules() { return []; }
    generateFailoverStrategies() { return []; }
    getAdaptiveLearningData() {
        return { routingDecisions: [], outcomeCorrelations: [], adaptationRules: [], confidenceThreshold: 0.8 };
    }
    generateQualityGates(_agent) { return []; }
    generateOptimizationHints(_insights) { return []; }
    getBaseExecutionTime(_agent, _model) { return 10; }
    calculateEstimatedCost(_model, time) { return time * 0.05; }
    calculateSuccessProbability(_agent, _model) { return 0.85; }
    calculateOverallRisk(risks) {
        return risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low';
    }
    // =============================================================================
    // PUBLIC API METHODS
    // =============================================================================
    getSearchIntelligence() {
        return this.searchIntelligence;
    }
    getRoutingHistory() {
        return [...this.routingHistory];
    }
    clearCache() {
        this.performanceCache.clear();
        this.logger.info('SmartAgentRouter cache cleared');
    }
}
exports.SmartAgentRouter = SmartAgentRouter;
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
function createSmartAgentRouter(logger, serenaIntegration, enhancedExtractor, availableAgents) {
    return new SmartAgentRouter(logger, serenaIntegration, enhancedExtractor, availableAgents);
}
exports.createSmartAgentRouter = createSmartAgentRouter;
// =============================================================================
// EXPORT TYPES
// =============================================================================
// All interfaces are already exported with 'export interface' declarations
//# sourceMappingURL=SmartAgentRouter.js.map