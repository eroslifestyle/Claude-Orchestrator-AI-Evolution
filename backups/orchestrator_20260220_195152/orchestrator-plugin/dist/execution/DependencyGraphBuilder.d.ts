/**
 * DependencyGraphBuilder - Auto-Dependency Detection & Parallel Optimization
 *
 * Implementazione Architect Expert con pattern avanzato per dependency detection
 * automatica da task descriptions e parallel execution batch optimization.
 *
 * @version 1.0 - Fase 2 Implementation
 * @author Architect Expert Agent
 * @date 30 Gennaio 2026
 */
import type { ClassifiedDomain } from '../analysis/types';
import type { RoutingDecision } from '../routing/AgentRouter';
import type { ModelType } from '../types';
type RoutingAgentDefinition = RoutingDecision['primaryAgent'];
interface DependencyNode {
    id: string;
    name: string;
    type: DependencyNodeType;
    agent: RoutingAgentDefinition;
    model: ModelType;
    description: string;
    estimatedDurationMinutes: number;
    estimatedCost: number;
    priority: number;
    criticality: 'low' | 'medium' | 'high' | 'critical';
    parallelizable: boolean;
    resourceRequirements: ResourceRequirement[];
    inputs: DependencyInput[];
    outputs: DependencyOutput[];
    constraints: TaskConstraint[];
}
type DependencyNodeType = 'analysis' | 'implementation' | 'testing' | 'integration' | 'documentation' | 'validation' | 'deployment';
interface DependencyEdge {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    dependencyType: DependencyType;
    strength: DependencyStrength;
    condition?: string;
    delay?: number;
    transferData?: string[];
}
type DependencyType = 'hard' | 'soft' | 'data' | 'resource' | 'logical' | 'validation' | 'precedence';
type DependencyStrength = 'weak' | 'medium' | 'strong' | 'absolute';
interface ResourceRequirement {
    type: ResourceType;
    amount: number;
    unit: string;
    exclusive: boolean;
    shareable: boolean;
}
type ResourceType = 'cpu' | 'memory' | 'network' | 'storage' | 'api_quota' | 'agent_slot';
interface DependencyInput {
    name: string;
    type: DataType;
    required: boolean;
    source?: string;
    validation?: ValidationRule;
}
interface DependencyOutput {
    name: string;
    type: DataType;
    consumers: string[];
    cacheable: boolean;
    ttl?: number;
}
type DataType = 'code' | 'configuration' | 'documentation' | 'test_result' | 'analysis_result' | 'artifact';
interface ValidationRule {
    rule: string;
    parameters: Record<string, any>;
    errorMessage: string;
}
interface TaskConstraint {
    type: ConstraintType;
    value: any;
    description: string;
    negotiable: boolean;
}
type ConstraintType = 'time_window' | 'resource_limit' | 'quality_gate' | 'budget_limit' | 'dependency_timeout' | 'concurrency_limit';
interface DependencyGraph {
    id: string;
    name: string;
    description: string;
    nodes: Map<string, DependencyNode>;
    edges: Map<string, DependencyEdge>;
    executionPlan: ExecutionPlan;
    circularDependencies: CircularDependency[];
    criticalPath: string[];
    parallelizationOpportunities: ParallelBatchConfig[];
    totalEstimatedTime: number;
    totalEstimatedCost: number;
    complexityScore: number;
    riskAssessment: RiskAssessment;
    metadata?: any;
}
interface ExecutionPlan {
    batches: ExecutionBatch[];
    totalBatches: number;
    maxConcurrency: number;
    estimatedCompletion: Date;
    contingencyPlans: ContingencyPlan[];
    monitoringPoints: MonitoringPoint[];
}
interface ExecutionBatch {
    batchId: string;
    order: number;
    nodes: string[];
    canRunInParallel: boolean;
    dependencies: string[];
    estimatedDuration: number;
    resourceRequirements: ResourceRequirement[];
    riskLevel: 'low' | 'medium' | 'high';
    fallbackOptions: string[];
}
interface CircularDependency {
    cycle: string[];
    severity: 'warning' | 'error';
    resolution: ResolutionStrategy[];
    impact: string;
}
interface ResolutionStrategy {
    strategy: 'break_dependency' | 'merge_nodes' | 'add_intermediate' | 'parallel_execution';
    description: string;
    cost: number;
    risk: 'low' | 'medium' | 'high';
}
interface ParallelBatchConfig {
    batchId: string;
    nodes: string[];
    maxConcurrency: number;
    estimatedSpeedup: number;
    resourceConflicts: ResourceConflict[];
    optimalSchedule: ScheduleSlot[];
}
interface ResourceConflict {
    resource: ResourceType;
    conflictingNodes: string[];
    severity: 'low' | 'medium' | 'high';
    resolution: string;
}
interface ScheduleSlot {
    startTime: number;
    duration: number;
    nodeId: string;
    resources: ResourceRequirement[];
}
interface RiskAssessment {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: RiskFactor[];
    mitigationStrategies: MitigationStrategy[];
    contingencyTriggers: ContingencyTrigger[];
}
interface RiskFactor {
    factor: string;
    probability: number;
    impact: number;
    riskScore: number;
    category: 'technical' | 'resource' | 'dependency' | 'external';
}
interface MitigationStrategy {
    risk: string;
    strategy: string;
    cost: number;
    effectiveness: number;
    implementation: string;
}
interface ContingencyPlan {
    trigger: ContingencyTrigger;
    actions: ContingencyAction[];
    rollbackPlan: string;
    estimatedCost: number;
}
interface ContingencyTrigger {
    condition: string;
    threshold: number;
    monitoring: boolean;
    autoTrigger: boolean;
}
interface ContingencyAction {
    action: string;
    priority: number;
    cost: number;
    duration: number;
    dependencies: string[];
}
interface MonitoringPoint {
    nodeId: string;
    metric: string;
    threshold: number;
    alertLevel: 'info' | 'warning' | 'error' | 'critical';
    action: string;
}
export declare class DependencyGraphBuilder {
    private logger;
    private dependencyPatterns;
    private resourceLimits;
    private optimizationStrategies;
    private circularDependencyResolver;
    private parallelizationOptimizer;
    constructor();
    /**
     * Build dependency graph from domains and routing decisions
     */
    buildDependencyGraph(domains: ClassifiedDomain[], routingDecisions: RoutingDecision[], taskDescription: string): Promise<DependencyGraph>;
    /**
     * Optimize graph for parallel execution
     */
    optimizeForParallelism(graph: DependencyGraph, maxConcurrency?: number): Promise<DependencyGraph>;
    /**
     * Detect circular dependencies in the graph
     */
    detectCircularDependencies(graph: DependencyGraph): Promise<CircularDependency[]>;
    /**
     * Get graph visualization data
     */
    getGraphVisualization(graph: DependencyGraph): GraphVisualization;
    private initializeDependencyPatterns;
    private initializeResourceLimits;
    private initializeOptimizationStrategies;
    private createDependencyEdges;
    private resolveCircularDependencies;
    private applyResolutionStrategy;
    private breakDependency;
    private mergeNodes;
    private addIntermediateNode;
    private calculateCriticalPath;
    private topologicalSort;
    private optimizeParallelExecution;
    private detectResourceConflictsInBatch;
    private createOptimalSchedule;
    private createExecutionPlan;
    private createExecutionBatches;
    private aggregateResourceRequirements;
    private assessBatchRiskLevel;
    private generateFallbackOptions;
    private createContingencyPlans;
    private createMonitoringPoints;
    private calculateGraphMetrics;
    private assessRisks;
    private generateMitigationStrategies;
    private generateContingencyTriggers;
    private identifyIndependentClusters;
    private findConnectedNodes;
    private optimizeResourceAllocation;
    private rebalanceExecutionBatches;
    private calculateEstimatedSpeedup;
    private assessCycleSeverity;
    private generateResolutionStrategies;
    private assessCycleImpact;
    private assessParallelizability;
    private generateResourceRequirements;
    private generateInputRequirements;
    private generateOutputDefinitions;
    private generateTaskConstraints;
    private balanceResources;
    private optimizeCriticalPath;
    private createNodesFromRouting;
    private autoDetectDependencies;
    private detectPatternBasedDependencies;
    private detectDataFlowDependencies;
    private detectResourceConflicts;
    private detectLogicalSequences;
    private detectDomainSpecificDependencies;
    private inferNodeType;
    private calculateNodePriority;
    private assessNodeCriticality;
    private generateGraphId;
}
interface GraphVisualization {
    nodes: VisualNode[];
    edges: VisualEdge[];
    batches: VisualBatch[];
    criticalPath: string[];
    metrics: VisualMetrics;
}
interface VisualNode {
    id: string;
    label: string;
    type: DependencyNodeType;
    agent: string;
    model: ModelType;
    priority: number;
    parallelizable: boolean;
    estimatedDuration: number;
}
interface VisualEdge {
    id: string;
    source: string;
    target: string;
    type: DependencyType;
    strength: DependencyStrength;
    label: string;
}
interface VisualBatch {
    id: string;
    order: number;
    nodes: string[];
    parallel: boolean;
    duration: number;
}
interface VisualMetrics {
    totalTime: number;
    totalCost: number;
    complexity: number;
    parallelism: number;
}
export declare function createDependencyGraphBuilder(): DependencyGraphBuilder;
export type { DependencyGraph, DependencyNode, DependencyEdge, ExecutionPlan, CircularDependency, GraphVisualization, ParallelBatchConfig };
//# sourceMappingURL=DependencyGraphBuilder.d.ts.map