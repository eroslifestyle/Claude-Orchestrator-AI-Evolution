"use strict";
/**
 * ModelSelector - Intelligent Model Selection & Auto-Escalation
 *
 * Implementazione Claude Systems Expert con algoritmo di selezione
 * haiku/sonnet/opus, auto-escalation logic e cost optimization.
 *
 * @version 1.0 - Fase 2 Implementation
 * @author Claude Systems Expert Agent
 * @date 30 Gennaio 2026
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModelSelector = exports.ModelSelector = void 0;
const logger_1 = require("../utils/logger");
// =============================================================================
// MODEL SELECTOR CLASS
// =============================================================================
class ModelSelector {
    logger;
    modelCapabilities;
    performanceMetrics;
    escalationHistory;
    globalBudgetTracker;
    constructor() {
        this.logger = new logger_1.PluginLogger('ModelSelector');
        this.modelCapabilities = new Map();
        this.performanceMetrics = new Map();
        this.escalationHistory = [];
        this.initializeModelCapabilities();
        this.initializePerformanceMetrics();
        this.initializeBudgetTracker();
        this.logger.info('ModelSelector initialized with intelligent selection algorithms');
    }
    // =============================================================================
    // PUBLIC SELECTION API
    // =============================================================================
    /**
     * Select optimal model based on task requirements
     */
    async selectModel(criteria) {
        this.logger.debug('Starting model selection', { criteria });
        try {
            // Analyze task requirements
            const requirements = this.analyzeRequirements(criteria);
            // Calculate model scores
            const modelScores = this.calculateModelScores(requirements);
            // Apply budget constraints
            const budgetFilteredScores = this.applyBudgetConstraints(modelScores, criteria.budgetConstraints);
            // Select primary model
            const selectedModel = this.selectPrimaryModel(budgetFilteredScores);
            // Calculate confidence and alternatives
            const confidence = this.calculateSelectionConfidence(selectedModel, budgetFilteredScores);
            const alternatives = this.generateAlternatives(budgetFilteredScores, selectedModel);
            // Generate escalation triggers
            const escalationTriggers = this.generateEscalationTriggers(selectedModel, criteria);
            // Create fallback plan
            const fallbackPlan = this.createFallbackPlan(selectedModel, alternatives);
            // Generate reasoning
            const reasoning = this.generateSelectionReasoning(selectedModel, requirements, confidence);
            // Estimate costs and latency
            const { cost, latency } = this.estimateModelExecution(selectedModel, criteria);
            const result = {
                selectedModel,
                confidence,
                reasoning,
                alternatives,
                estimatedCost: cost,
                estimatedLatency: latency,
                escalationTriggers,
                fallbackPlan
            };
            // Update budget tracking
            this.updateBudgetTracking(selectedModel, cost);
            this.logger.info('Model selection completed', {
                selectedModel,
                confidence,
                estimatedCost: cost
            });
            return result;
        }
        catch (error) {
            this.logger.error('Model selection failed', { error, criteria });
            return this.createEmergencySelection();
        }
    }
    /**
     * Auto-escalate model based on failure patterns
     */
    async autoEscalate(currentModel, failureContext) {
        this.logger.debug('Evaluating auto-escalation', { currentModel, failureContext });
        const escalationRule = this.findApplicableEscalationRule(currentModel, failureContext);
        if (!escalationRule) {
            this.logger.debug('No escalation rule applicable');
            return null;
        }
        // Check cooldown period
        if (this.isInCooldownPeriod(escalationRule)) {
            this.logger.debug('Escalation in cooldown period');
            return null;
        }
        // Check budget constraints for escalation
        const targetModel = escalationRule.toModel;
        const escalationCost = this.estimateEscalationCost(currentModel, targetModel);
        if (!this.canAffordEscalation(escalationCost)) {
            this.logger.warn('Cannot afford model escalation', {
                from: currentModel,
                to: targetModel,
                cost: escalationCost
            });
            return null;
        }
        // Record escalation event
        this.recordEscalationEvent({
            timestamp: new Date(),
            fromModel: currentModel,
            toModel: targetModel,
            reason: failureContext.reason,
            automatic: true,
            cost: escalationCost
        });
        this.logger.info('Auto-escalating model', {
            from: currentModel,
            to: targetModel,
            reason: failureContext.reason
        });
        // Create escalated selection
        return this.createEscalatedSelection(targetModel, escalationRule, failureContext);
    }
    /**
     * Optimize model selection for cost efficiency
     */
    async optimizeForCost(currentSelection, qualityThreshold = 0.8) {
        this.logger.debug('Optimizing model selection for cost', {
            currentModel: currentSelection.selectedModel,
            currentCost: currentSelection.estimatedCost
        });
        const optimizationResults = [];
        // Test downgrade options
        const downgrades = this.getModelDowngrades(currentSelection.selectedModel);
        for (const downgrade of downgrades) {
            const performance = this.performanceMetrics.get(downgrade);
            if (performance && performance.avgQualityScore >= qualityThreshold) {
                const costSavings = this.calculateCostSavings(currentSelection.selectedModel, downgrade);
                optimizationResults.push({
                    model: downgrade,
                    costSavings,
                    qualityImpact: performance.avgQualityScore,
                    riskLevel: this.assessDowngradeRisk(currentSelection.selectedModel, downgrade)
                });
            }
        }
        // Select best optimization
        if (optimizationResults.length > 0) {
            const bestOptimization = optimizationResults.reduce((best, current) => current.costSavings > best.costSavings ? current : best);
            if (bestOptimization.costSavings > 0.20) { // 20% savings threshold
                return this.createOptimizedSelection(bestOptimization, currentSelection);
            }
        }
        return currentSelection; // No optimization beneficial
    }
    /**
     * Get model performance analytics
     */
    getModelAnalytics() {
        const analytics = {
            modelComparison: this.generateModelComparison(),
            escalationAnalysis: this.analyzeEscalationPatterns(),
            costEfficiencyMetrics: this.calculateCostEfficiencyMetrics(),
            qualityTrends: this.analyzeQualityTrends(),
            recommendations: this.generateModelRecommendations()
        };
        return analytics;
    }
    // =============================================================================
    // PRIVATE SELECTION LOGIC
    // =============================================================================
    analyzeRequirements(criteria) {
        const requirements = {
            creativity: 0,
            reasoning: 0,
            precision: 0,
            speed: 0,
            costSensitivity: 0
        };
        // Analyze complexity impact
        const complexityWeights = {
            low: { reasoning: 0.3, creativity: 0.2, precision: 0.6, speed: 0.8 },
            medium: { reasoning: 0.6, creativity: 0.4, precision: 0.7, speed: 0.6 },
            high: { reasoning: 0.8, creativity: 0.7, precision: 0.8, speed: 0.4 },
            extreme: { reasoning: 1.0, creativity: 0.9, precision: 0.9, speed: 0.2 }
        };
        const weights = complexityWeights[criteria.complexity];
        Object.assign(requirements, weights);
        // Analyze domain requirements
        criteria.domainRequirements.forEach(domain => {
            if (domain.requiresCreativity)
                requirements.creativity += 0.2;
            if (domain.requiresPrecision)
                requirements.precision += 0.2;
            if (domain.requiresReasoning)
                requirements.reasoning += 0.2;
            if (domain.requiresSpeed)
                requirements.speed += 0.2;
        });
        // Apply budget sensitivity
        const budgetSensitivity = {
            low: 0.2,
            medium: 0.5,
            high: 0.8
        };
        requirements.costSensitivity = budgetSensitivity[criteria.budgetConstraints.costSensitivity];
        // Normalize requirements to 0-1 range
        Object.keys(requirements).forEach(key => {
            requirements[key] = Math.min(requirements[key], 1.0);
        });
        return requirements;
    }
    calculateModelScores(requirements) {
        const scores = new Map();
        Array.from(this.modelCapabilities.entries()).forEach(([model, capabilities]) => {
            const score = capabilities.creativityLevel * requirements.creativity * 0.25 +
                capabilities.reasoningCapability * requirements.reasoning * 0.25 +
                capabilities.precisionLevel * requirements.precision * 0.25 +
                (1 - capabilities.avgLatencyMs / 10000) * requirements.speed * 0.15 + // Speed inverse to latency
                (1 - capabilities.costPer1kTokens / 0.15) * requirements.costSensitivity * 0.1; // Cost inverse
            scores.set(model, Math.max(0, Math.min(1, score)));
        });
        return scores;
    }
    applyBudgetConstraints(modelScores, budgetConstraints) {
        const constrainedScores = new Map();
        Array.from(modelScores.entries()).forEach(([model, score]) => {
            const capabilities = this.modelCapabilities.get(model);
            const estimatedCost = capabilities.costPer1kTokens * 10; // Assume 10k tokens avg
            // Check if model is within budget
            if (estimatedCost <= budgetConstraints.maxCostPerTask) {
                // Apply budget optimization strategy
                let adjustedScore = score;
                if (budgetConstraints.optimizationStrategy === 'cost_first') {
                    adjustedScore *= (1 - estimatedCost / budgetConstraints.maxCostPerTask);
                }
                else if (budgetConstraints.optimizationStrategy === 'balanced') {
                    adjustedScore *= (1 - (estimatedCost / budgetConstraints.maxCostPerTask) * 0.5);
                }
                // 'quality_first' keeps original score
                constrainedScores.set(model, adjustedScore);
            }
        });
        return constrainedScores;
    }
    selectPrimaryModel(modelScores) {
        if (modelScores.size === 0)
            return 'haiku'; // Emergency fallback
        let bestModel = 'haiku';
        let bestScore = -1;
        Array.from(modelScores.entries()).forEach(([model, score]) => {
            if (score > bestScore) {
                bestScore = score;
                bestModel = model;
            }
        });
        return bestModel;
    }
    generateEscalationTriggers(selectedModel, criteria) {
        const triggers = [];
        // Always include failure rate trigger
        triggers.push({
            condition: 'failure_rate_high',
            fromModel: selectedModel,
            toModel: this.getNextModelUp(selectedModel),
            threshold: 0.3, // 30% failure rate
            autoTrigger: true,
            cooldownMinutes: 10
        });
        // Add quality trigger for high-precision tasks
        const hasPrecisionRequirement = criteria.domainRequirements.some(d => d.requiresPrecision);
        if (hasPrecisionRequirement) {
            triggers.push({
                condition: 'quality_below_threshold',
                fromModel: selectedModel,
                toModel: this.getNextModelUp(selectedModel),
                threshold: 0.8, // 80% quality threshold
                autoTrigger: true,
                cooldownMinutes: 15
            });
        }
        // Add complexity trigger for complex tasks
        if (criteria.complexity === 'high' || criteria.complexity === 'extreme') {
            triggers.push({
                condition: 'complexity_underestimated',
                fromModel: selectedModel,
                toModel: 'opus', // Go straight to opus for complex tasks
                threshold: 0.7,
                autoTrigger: false, // Manual approval for opus
                cooldownMinutes: 30
            });
        }
        return triggers;
    }
    getNextModelUp(currentModel) {
        const hierarchy = ['haiku', 'sonnet', 'opus'];
        const currentIndex = hierarchy.indexOf(currentModel);
        if (currentIndex < hierarchy.length - 1) {
            return hierarchy[currentIndex + 1];
        }
        return currentModel; // Already at top
    }
    getModelDowngrades(currentModel) {
        const hierarchy = ['haiku', 'sonnet', 'opus'];
        const currentIndex = hierarchy.indexOf(currentModel);
        return hierarchy.slice(0, currentIndex);
    }
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    initializeModelCapabilities() {
        // Claude model capabilities based on Claude Systems Expert knowledge
        this.modelCapabilities.set('haiku', {
            model: 'haiku',
            costPer1kTokens: 0.0008,
            avgLatencyMs: 800,
            maxContextTokens: 200000,
            reasoningCapability: 0.6,
            creativityLevel: 0.4,
            precisionLevel: 0.7,
            multilingualSupport: 0.8,
            codeGenerationQuality: 0.6,
            problemSolvingStrength: 0.5
        });
        this.modelCapabilities.set('sonnet', {
            model: 'sonnet',
            costPer1kTokens: 0.008,
            avgLatencyMs: 1500,
            maxContextTokens: 200000,
            reasoningCapability: 0.8,
            creativityLevel: 0.7,
            precisionLevel: 0.85,
            multilingualSupport: 0.9,
            codeGenerationQuality: 0.85,
            problemSolvingStrength: 0.8
        });
        this.modelCapabilities.set('opus', {
            model: 'opus',
            costPer1kTokens: 0.08,
            avgLatencyMs: 3000,
            maxContextTokens: 200000,
            reasoningCapability: 0.95,
            creativityLevel: 0.95,
            precisionLevel: 0.9,
            multilingualSupport: 0.95,
            codeGenerationQuality: 0.9,
            problemSolvingStrength: 0.95
        });
        this.logger.debug('Model capabilities initialized');
    }
    initializePerformanceMetrics() {
        // Initialize with baseline metrics
        ['haiku', 'sonnet', 'opus'].forEach(model => {
            this.performanceMetrics.set(model, {
                model: model,
                successRate: 0.85,
                avgQualityScore: 0.8,
                avgLatency: this.modelCapabilities.get(model)?.avgLatencyMs || 1000,
                avgCostPerTask: this.modelCapabilities.get(model)?.costPer1kTokens || 0.01,
                escalationRate: 0.1,
                userSatisfactionScore: 0.8,
                totalUsage: 0,
                failurePatterns: []
            });
        });
        this.logger.debug('Performance metrics initialized');
    }
    initializeBudgetTracker() {
        this.globalBudgetTracker = {
            dailyLimit: 100.0, // $100 daily limit
            currentSpending: 0.0,
            remainingBudget: 100.0,
            spendingByModel: new Map(),
            projectedSpending: 0.0
        };
        this.logger.debug('Budget tracker initialized');
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    createEmergencySelection() {
        return {
            selectedModel: 'haiku',
            confidence: 0.1,
            reasoning: 'Emergency fallback selection due to selection failure',
            alternatives: [],
            estimatedCost: 0.01,
            estimatedLatency: 1000,
            escalationTriggers: [],
            fallbackPlan: {
                fallbackSequence: ['haiku'],
                fallbackCriteria: ['emergency'],
                emergencyModel: 'haiku',
                maxFallbackAttempts: 1
            }
        };
    }
    // Additional methods would be implemented here...
    // Due to length constraints, showing key structure and primary methods
    // =============================================================================
    // MISSING METHOD IMPLEMENTATIONS
    // =============================================================================
    calculateSelectionConfidence(selectedModel, modelScores) {
        const score = modelScores.get(selectedModel) || 0;
        const totalScore = Array.from(modelScores.values()).reduce((sum, s) => sum + s, 0);
        return totalScore > 0 ? score / totalScore : 0.5;
    }
    generateAlternatives(modelScores, selectedModel) {
        const alternatives = [];
        const sortedModels = Array.from(modelScores.entries())
            .filter(([model]) => model !== selectedModel)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2);
        for (const [model, score] of sortedModels) {
            const capabilities = this.modelCapabilities.get(model);
            alternatives.push({
                model,
                score,
                reason: `Alternative model with ${score.toFixed(2)} score`,
                costDelta: capabilities.costPer1kTokens - (this.modelCapabilities.get(selectedModel)?.costPer1kTokens || 0),
                qualityDelta: capabilities.reasoningCapability - (this.modelCapabilities.get(selectedModel)?.reasoningCapability || 0)
            });
        }
        return alternatives;
    }
    createFallbackPlan(selectedModel, alternatives) {
        const fallbackSequence = [];
        if (selectedModel !== 'haiku') {
            fallbackSequence.push('haiku');
        }
        if (selectedModel === 'opus' && alternatives.length > 0) {
            fallbackSequence.push(alternatives[0].model);
        }
        return {
            fallbackSequence,
            fallbackCriteria: ['model_failure', 'quality_threshold', 'cost_limit'],
            emergencyModel: 'haiku',
            maxFallbackAttempts: 3
        };
    }
    generateSelectionReasoning(selectedModel, requirements, confidence) {
        const capabilities = this.modelCapabilities.get(selectedModel);
        let reasoning = `Selected ${selectedModel} based on requirements: `;
        if (requirements.reasoning > 0.7) {
            reasoning += `high reasoning need (${capabilities.reasoningCapability.toFixed(2)} capability), `;
        }
        if (requirements.creativity > 0.7) {
            reasoning += `high creativity need (${capabilities.creativityLevel.toFixed(2)} capability), `;
        }
        if (requirements.costSensitivity > 0.5) {
            reasoning += `cost optimization (${capabilities.costPer1kTokens.toFixed(4)}/1k tokens), `;
        }
        reasoning += `overall confidence: ${confidence.toFixed(2)}`;
        return reasoning;
    }
    estimateModelExecution(selectedModel, criteria) {
        const capabilities = this.modelCapabilities.get(selectedModel);
        const estimatedTokens = criteria.estimatedTokens || 10000;
        const cost = (capabilities.costPer1kTokens * estimatedTokens) / 1000;
        const latency = capabilities.avgLatencyMs * (1 + (criteria.complexity === 'high' ? 0.5 : 0));
        return { cost, latency };
    }
    updateBudgetTracking(selectedModel, cost) {
        const currentSpending = this.globalBudgetTracker.spendingByModel.get(selectedModel) || 0;
        this.globalBudgetTracker.spendingByModel.set(selectedModel, currentSpending + cost);
        this.globalBudgetTracker.currentSpending += cost;
        this.globalBudgetTracker.remainingBudget = this.globalBudgetTracker.dailyLimit - this.globalBudgetTracker.currentSpending;
        this.globalBudgetTracker.projectedSpending += cost;
    }
    findApplicableEscalationRule(currentModel, failureContext) {
        // Simple escalation rule based on failure rate
        if (failureContext.failureRate > 0.3) {
            return {
                condition: 'failure_rate_high',
                fromModel: currentModel,
                toModel: this.getNextModelUp(currentModel),
                threshold: 0.3,
                autoTrigger: true,
                cooldownMinutes: 10
            };
        }
        return null;
    }
    isInCooldownPeriod(escalationRule) {
        // Check if escalation is in cooldown (simplified implementation)
        const recentEscalations = this.escalationHistory.filter(event => event.toModel === escalationRule.toModel &&
            (Date.now() - event.timestamp.getTime()) < escalationRule.cooldownMinutes * 60 * 1000);
        return recentEscalations.length > 0;
    }
    estimateEscalationCost(fromModel, toModel) {
        const fromCapabilities = this.modelCapabilities.get(fromModel);
        const toCapabilities = this.modelCapabilities.get(toModel);
        return toCapabilities.costPer1kTokens - fromCapabilities.costPer1kTokens;
    }
    canAffordEscalation(escalationCost) {
        return this.globalBudgetTracker.remainingBudget >= escalationCost;
    }
    recordEscalationEvent(event) {
        this.escalationHistory.push(event);
        // Limit history size
        if (this.escalationHistory.length > 1000) {
            this.escalationHistory = this.escalationHistory.slice(-500);
        }
    }
    createEscalatedSelection(targetModel, escalationRule, failureContext) {
        return {
            selectedModel: targetModel,
            confidence: 0.8,
            reasoning: `Escalated from ${escalationRule.fromModel} due to ${failureContext.reason}`,
            alternatives: [],
            estimatedCost: this.modelCapabilities.get(targetModel)?.costPer1kTokens || 0,
            estimatedLatency: this.modelCapabilities.get(targetModel)?.avgLatencyMs || 1000,
            escalationTriggers: [escalationRule],
            fallbackPlan: {
                fallbackSequence: [escalationRule.fromModel],
                fallbackCriteria: ['escalation_failure'],
                emergencyModel: 'haiku',
                maxFallbackAttempts: 2
            }
        };
    }
    calculateCostSavings(currentModel, targetModel) {
        const currentCost = this.modelCapabilities.get(currentModel)?.costPer1kTokens || 0;
        const targetCost = this.modelCapabilities.get(targetModel)?.costPer1kTokens || 0;
        return currentCost - targetCost;
    }
    assessDowngradeRisk(currentModel, targetModel) {
        const hierarchy = ['haiku', 'sonnet', 'opus'];
        const currentIndex = hierarchy.indexOf(currentModel);
        const targetIndex = hierarchy.indexOf(targetModel);
        const difference = currentIndex - targetIndex;
        if (difference <= 1)
            return 'low';
        if (difference === 2)
            return 'medium';
        return 'high';
    }
    createOptimizedSelection(optimization, currentSelection) {
        return {
            ...currentSelection,
            selectedModel: optimization.model,
            estimatedCost: currentSelection.estimatedCost - optimization.costSavings,
            reasoning: `Optimized for cost: ${optimization.costSavings.toFixed(4)} savings with ${optimization.riskLevel} risk`
        };
    }
    generateModelComparison() {
        const comparisons = [];
        Array.from(this.performanceMetrics.entries()).forEach(([model, metrics]) => {
            comparisons.push({
                model,
                usage: metrics.totalUsage,
                successRate: metrics.successRate,
                avgCost: metrics.avgCostPerTask,
                avgQuality: metrics.avgQualityScore
            });
        });
        return comparisons.sort((a, b) => b.usage - a.usage);
    }
    analyzeEscalationPatterns() {
        const recentEscalations = this.escalationHistory.slice(-100);
        const totalEscalations = recentEscalations.length;
        const escalationRate = totalEscalations / Math.max(1, this.performanceMetrics.size);
        const commonTriggers = recentEscalations
            .reduce((acc, event) => {
            acc[event.reason] = (acc[event.reason] || 0) + 1;
            return acc;
        }, {});
        const costImpact = recentEscalations.reduce((sum, event) => sum + event.cost, 0);
        return {
            totalEscalations,
            escalationRate,
            commonTriggers: Object.keys(commonTriggers).sort((a, b) => commonTriggers[b] - commonTriggers[a]),
            costImpact
        };
    }
    calculateCostEfficiencyMetrics() {
        const costPerSuccessfulTask = new Map();
        const qualityCostRatio = new Map();
        const optimalModelByBudget = [];
        Array.from(this.performanceMetrics.entries()).forEach(([model, metrics]) => {
            const costPerTask = metrics.avgCostPerTask / Math.max(metrics.successRate, 0.1);
            costPerSuccessfulTask.set(model, costPerTask);
            qualityCostRatio.set(model, metrics.avgQualityScore / Math.max(costPerTask, 0.01));
            if (metrics.avgCostPerTask < 0.05 && metrics.avgQualityScore > 0.8) {
                optimalModelByBudget.push(model);
            }
        });
        return {
            costPerSuccessfulTask,
            qualityCostRatio,
            optimalModelByBudget
        };
    }
    analyzeQualityTrends() {
        const trends = [];
        Array.from(this.performanceMetrics.entries()).forEach(([model, metrics]) => {
            trends.push({
                model,
                period: 'current',
                avgQuality: metrics.avgQualityScore,
                trend: metrics.avgQualityScore > 0.8 ? 'stable' : 'improving'
            });
        });
        return trends;
    }
    generateModelRecommendations() {
        const recommendations = [];
        Array.from(this.performanceMetrics.entries()).forEach(([model, metrics]) => {
            if (metrics.escalationRate > 0.2) {
                recommendations.push({
                    type: 'quality_improvement',
                    description: `Consider upgrading ${model} due to high escalation rate`,
                    priority: 'medium',
                    expectedBenefit: 'Reduced escalations and improved success rate'
                });
            }
            if (metrics.avgCostPerTask > 0.1) {
                recommendations.push({
                    type: 'cost_optimization',
                    description: `Consider optimizing ${model} usage for cost efficiency`,
                    priority: 'low',
                    expectedBenefit: 'Reduced operational costs'
                });
            }
        });
        return recommendations;
    }
}
exports.ModelSelector = ModelSelector;
// =============================================================================
// FACTORY & EXPORTS
// =============================================================================
function createModelSelector() {
    return new ModelSelector();
}
exports.createModelSelector = createModelSelector;
//# sourceMappingURL=ModelSelector.js.map