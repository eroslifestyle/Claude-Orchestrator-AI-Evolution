/**
 * Orchestrator Engine Core - LIVELLO 4 IMPLEMENTATION
 *
 * Advanced orchestration engine capable of coordinating up to 64 agents in parallel
 * with complex dependency management, intelligent task decomposition, and ML-based
 * cost prediction. Features automatic model selection, result aggregation, and
 * synthesis capabilities for enterprise-grade orchestration.
 *
 * @version 4.0 - Level 4 Core Implementation
 * @author Orchestrator Expert + Architect Expert + AI Integration Expert
 * @date 31 Gennaio 2026
 */
import type { OrchestratorOptions, OrchestratorResult, ExecutionPlan, PluginConfig } from '../types';
export declare class OrchestratorEngine {
    private config;
    private logger;
    private sessions;
    private keywordExtractor;
    private agentRouter;
    private modelSelector;
    private dependencyGraphBuilder;
    private costPredictionEngine;
    private analyticsEngine;
    private performanceOptimizer;
    private performanceMetrics;
    private globalBudgetTracker;
    private agentPool;
    private resourceManager;
    private qualityController;
    private readonly maxConcurrentAgents;
    private readonly maxConcurrentSessions;
    private currentAgentUtilization;
    constructor(config: PluginConfig);
    /**
     * Main orchestration method - COMPLETE FASE 2 IMPLEMENTATION
     */
    orchestrate(request: string, options?: OrchestratorOptions): Promise<OrchestratorResult>;
    /**
     * Preview orchestration plan - COMPLETE IMPLEMENTATION
     */
    preview(request: string, options?: OrchestratorOptions): Promise<ExecutionPlan>;
    /**
     * Resume orchestration session
     * TODO: Full implementation in Phase 2
     */
    resume(sessionId: string): Promise<OrchestratorResult>;
    /**
     * Cancel orchestration session
     * TODO: Full implementation in Phase 2
     */
    cancel(sessionId: string): Promise<void>;
    /**
     * Generate mock execution plan for development/testing
     */
    private generateMockPlan;
    /**
     * Create mock task for development/testing
     */
    private createMockTask;
    /**
     * Get specialization from agent file path
     */
    private getSpecializationFromAgentFile;
    /**
     * Get domain from agent file path
     */
    private getDomainFromAgentFile;
    /**
     * Initialize agent pool for 64-agent support
     */
    private initializeAgentPool;
    /**
     * Perform advanced task decomposition
     */
    private performTaskDecomposition;
    /**
     * Perform complexity analysis with ML enhancement
     */
    private performComplexityAnalysis;
    /**
     * Perform enhanced domain classification
     */
    private performEnhancedDomainClassification;
    private assessComplexity;
    private assessComplexityFromRequest;
    private generateDomainRequirements;
    private generateBudgetConstraints;
    private generatePerformanceRequirements;
    private generateQualityRequirements;
    private executeTaskBatches;
    private executeTask;
    private createFailedTaskResult;
    private handleErrorRecovery;
    private aggregateTaskResults;
    private generateDocumentation;
    private calculateFinalMetrics;
    private calculateModelUsage;
    private calculateAgentUsage;
    private calculateParallelismEfficiency;
    private calculatePeakParallelTasks;
    private convertToExecutionPlan;
    private convertGraphToExecutionPlan;
    private convertNodeToTask;
    private generateFallbackPlan;
    private createSimpleFallbackTask;
    private collectSessionErrors;
    private collectSessionWarnings;
    private createErrorResult;
    private updateGlobalBudget;
    /**
     * Generate unique session ID
     */
    private generateSessionId;
    private splitIntoSentences;
    private calculateRequestComplexity;
    private determineDecompositionStrategy;
    private extractSubTasks;
    private mapActionToDomain;
    private estimateSubTaskComplexity;
    private estimateSubTaskDuration;
    private identifyRequiredExpertise;
    private assignSubTaskPriority;
    private canSubTaskRunInParallel;
    private identifySubTaskOutputs;
    private generateValidationCriteria;
    private estimateSubTaskCost;
    private identifyParallelizationOpportunities;
    private buildSubTaskDependencies;
    private calculateDecompositionConfidence;
    private estimateComplexityReduction;
    private calculateComplexityFactors;
    private calculateOverallComplexityScore;
    private mapScoreToComplexityLevel;
    private determineRecommendedApproach;
    private estimateRequiredAgents;
    private estimateTotalTime;
    private assessRiskFactors;
    private generateMitigationStrategies;
    private analyzeSubTaskDomains;
    private mapDomainToAgent;
    private mapDomainToModel;
    private mergeDomainResults;
    private detectDomainConflicts;
    /**
     * Perform advanced agent allocation with 64-agent support
     */
    private performAdvancedAgentAllocation;
    /**
     * Generate multi-agent routing decisions
     */
    private generateMultiAgentRoutingDecisions;
    /**
     * Perform cost prediction and optimization
     */
    private performCostPredictionAndOptimization;
    private calculateConcurrentTaskLimit;
    private assignTasksToAgents;
    private calculateResourceUtilization;
    private identifyBottlenecks;
    private calculateScalabilityLimit;
    private selectPrimaryAgent;
    private calculateAgentScore;
    private convertToAgentDefinition;
    private calculateRoutingConfidence;
    private extractCostFeaturesFromAnalysis;
    private inferTaskCategory;
    private applyCostOptimizations;
    /**
     * Build advanced dependency graph with multi-agent support
     */
    private buildAdvancedDependencyGraph;
    /**
     * Generate parallel execution batches for 64-agent coordination
     */
    private generateParallelExecutionBatches;
    /**
     * Optimize for maximum parallelism with resource management
     */
    private optimizeForMaximumParallelism;
    private findAssignedAgent;
    private selectModelForTask;
    private mapDomainToNodeType;
    private mapPriorityToNumber;
    private mapComplexityToCriticality;
    private generateResourceRequirements;
    private generateNodeInputs;
    private generateNodeOutputs;
    private generateTaskConstraints;
    private mapDependencyType;
    private mapDependencyStrength;
    private inferTransferData;
    private detectImplicitDependencies;
    private buildExecutionPlan;
    private detectCircularDependencies;
    private calculateCriticalPath;
    private identifyAdvancedParallelizationOpportunities;
    private findIndependentTaskGroups;
    private findPipelineOpportunities;
    private findSequentialChains;
    private buildSequentialChain;
    private assessExecutionRisks;
    private calculateBatchDependencies;
    private aggregateResourceRequirements;
    private calculateParallelismEfficiencyForBatches;
    private applyParallelismOptimizations;
    /**
     * Initialize real-time session metrics
     */
    private initializeRealTimeMetrics;
    /**
     * Execute advanced parallel batches with 64-agent coordination
     */
    private executeAdvancedParallelBatches;
    /**
     * Execute advanced task with enhanced monitoring
     */
    private executeAdvancedTask;
    /**
     * Perform enhanced task execution with quality monitoring
     */
    private performEnhancedTaskExecution;
    /**
     * Extract cost features from task node
     */
    private extractCostFeaturesFromTask;
    /**
     * Update real-time metrics during execution
     */
    private updateRealTimeMetrics;
    /**
     * Handle advanced error recovery with agent reallocation
     */
    private handleAdvancedErrorRecovery;
    /**
     * Determine recovery strategy for failed task
     */
    private determineRecoveryStrategy;
    /**
     * Execute recovery strategy
     */
    private executeRecoveryStrategy;
    /**
     * Escalate model to higher tier
     */
    private escalateModel;
    /**
     * Find alternative agent for task retry
     */
    private findAlternativeAgent;
    /**
     * Retry task with different model
     */
    private retryTaskWithModel;
    /**
     * Retry task with different agent
     */
    private retryTaskWithAgent;
    /**
     * Retry task with extended timeout
     */
    private retryTaskWithTimeout;
    /**
     * Perform dynamic agent reallocation based on quality metrics
     */
    private performDynamicAgentReallocation;
    /**
     * Perform intelligent result synthesis
     */
    private performIntelligentResultSynthesis;
    /**
     * Determine synthesis strategy based on results
     */
    private determineSynthesisStrategy;
    /**
     * Perform synthesis based on strategy
     */
    private performSynthesis;
    /**
     * Perform merge synthesis
     */
    private performMergeSynthesis;
    /**
     * Perform aggregate synthesis
     */
    private performAggregateSynthesis;
    /**
     * Perform transform synthesis
     */
    private performTransformSynthesis;
    /**
     * Perform validate synthesis
     */
    private performValidateSynthesis;
    /**
     * Calculate result consistency score
     */
    private calculateResultConsistency;
    /**
     * Group results by domain
     */
    private groupResultsByDomain;
    /**
     * Extract summary from result
     */
    private extractResultSummary;
    /**
     * Classify result type
     */
    private classifyResultType;
    /**
     * Perform consistency check
     */
    private performConsistencyCheck;
    /**
     * Detect and resolve conflicts
     */
    private detectAndResolveConflicts;
    /**
     * Find tasks that ran simultaneously
     */
    private findSimultaneousTasks;
    /**
     * Find result conflicts
     */
    private findResultConflicts;
    /**
     * Check if two results are conflicting
     */
    private areResultsConflicting;
    /**
     * Calculate synthesis quality score
     */
    private calculateSynthesisQuality;
}
//# sourceMappingURL=orchestrator-engine.d.ts.map