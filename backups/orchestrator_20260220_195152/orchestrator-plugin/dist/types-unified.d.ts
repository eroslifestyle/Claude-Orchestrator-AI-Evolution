/**
 * Unified Type Definitions for Orchestrator v4
 *
 * Consolidates all types from:
 * - src/types.ts (main types)
 * - src/types/index.ts (extended types)
 *
 * Single source of truth for all orchestrator plugin types.
 * No external dependencies, fully self-contained.
 */
/** Supported AI models */
export type ModelType = 'haiku' | 'sonnet' | 'opus' | 'auto';
/** Task execution status */
export type TaskStatus = 'pending' | 'in_progress' | 'running' | 'completed' | 'failed' | 'cancelled' | 'escalated' | 'planning';
/** Priority levels for task execution */
export type PriorityLevel = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
/** Complexity level for analysis */
export type ComplexityLevel = 'bassa' | 'media' | 'alta' | 'molto_alta';
/** Execution strategy type */
export type ExecutionStrategyType = 'sequential' | 'parallel' | 'hybrid';
/** Domain type */
export type DomainType = string;
/** Memory pressure level */
export type MemoryPressureLevel = 'low' | 'medium' | 'high' | 'critical';
/** Throttling strategy */
export type ThrottlingStrategy = 'none' | 'reduce_parallelism' | 'pause_execution' | 'emergency_cleanup';
/** Load distribution strategy */
export type LoadDistributionStrategy = 'round_robin' | 'least_loaded' | 'random' | 'priority_based';
/** Resource optimization strategy */
export type ResourceOptimizationStrategy = 'aggressive' | 'moderate' | 'conservative';
/** Failure mode type */
export type FailureMode = 'transient' | 'permanent' | 'recoverable' | 'critical';
/** Task complexity level */
export type TaskComplexityLevel = 'low' | 'medium' | 'high' | 'critical';
/**
 * Main plugin configuration
 */
export interface PluginConfig {
    maxParallelAgents?: number;
    defaultModel?: ModelType;
    enableCaching?: boolean;
    cacheSize?: number;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    configDir?: string;
    routing?: {
        fallback_agent?: string;
        max_parallel_agents?: number;
        escalation_enabled?: boolean;
        auto_documentation?: boolean;
    };
    performance?: {
        max_planning_time?: number;
        progress_update_interval?: number;
        session_timeout?: number;
    };
    costs?: {
        default_budget?: number;
        cost_alerts?: boolean;
        model_costs?: Record<ModelType, number>;
    };
    agents?: AgentConfig[];
    keywords?: KeywordMapping[];
}
/**
 * Agent configuration
 */
export interface AgentConfig {
    id: string;
    name: string;
    file: string;
    model: ModelType;
    priority: PriorityLevel;
    specialization: string[];
    level: 1 | 2 | 3;
    role?: string;
    description?: string;
    keywords?: string[];
    defaultModel?: ModelType;
    size_kb?: number;
    version?: string;
}
/**
 * Keyword to expert mapping
 */
export interface KeywordMapping {
    keyword: string;
    expertFile: string;
    domain: string;
    primary_agent?: string;
    priority?: PriorityLevel;
    model?: ModelType;
    notes?: string;
    keywords?: string[];
}
/**
 * Orchestrator execution options
 */
export interface OrchestratorOptions {
    budget?: number;
    timeLimit?: number;
    modelPreference?: ModelType;
    maxParallel?: number;
    dryRun?: boolean;
    confirmBefore?: boolean;
    resumeSessionId?: string;
    autoDocument?: boolean;
    retryFailed?: boolean;
    escalateOnFailure?: boolean;
    onProgress?: (update: ProgressUpdate) => void;
}
/**
 * Single task in execution plan
 */
export interface Task {
    id: string;
    description: string;
    agentId: string;
    agentFile: string;
    model: ModelType;
    specialization: string;
    dependencies: string[];
    priority: PriorityLevel;
    level: 1 | 2 | 3;
    estimatedTime: number;
    estimatedCost: number;
    status?: TaskStatus;
    metadata?: any;
    [key: string]: any;
}
/**
 * Task execution result
 */
export interface TaskResult {
    taskId: string;
    agentId: string;
    status: TaskStatus;
    description: string;
    result?: any;
    error?: string | {
        message: string;
        type: string;
        recoverable: boolean;
        suggestedAction: string;
    };
    startTime: Date;
    endTime?: Date;
    duration?: number;
    tokens?: number;
    cost?: number;
    model?: ModelType;
    [key: string]: any;
}
/**
 * Execution plan with all tasks
 */
export interface ExecutionPlan {
    sessionId: string;
    userRequest: string;
    tasks: Task[];
    parallelBatches: ParallelBatch[];
    totalAgents: number;
    estimatedTime: number;
    estimatedCost: number;
    complexity: ComplexityLevel;
    domains: string[];
    timestamp: Date;
    dependencies?: string[];
    metadata?: any;
    [key: string]: any;
}
/**
 * Parallel batch of tasks
 */
export interface ParallelBatch {
    batchId?: string;
    id?: string;
    taskIds?: string[];
    tasks?: Task[];
    estimatedDuration?: number;
    estimatedTime?: number;
    dependencies?: string[];
    [key: string]: any;
}
/**
 * Aggregated result from all tasks
 */
export interface AggregatedResult {
    success: boolean;
    filesModified: FileModification[];
    summary: string;
    recommendations?: string[];
    totalChanges?: number;
    [key: string]: any;
}
/**
 * File modification record
 */
export interface FileModification {
    path: string;
    description: string;
    changes: string[];
}
/**
 * Execution metrics
 */
export interface ExecutionMetrics {
    totalTime: number;
    totalCost: number;
    totalTokens: number;
    modelUsage: Record<string, number>;
    tasksCompleted: number;
    tasksFailed: number;
    successRate?: number;
    agentUsage?: Record<string, number>;
    [key: string]: any;
}
/**
 * Complete orchestration result
 */
export interface OrchestratorResult {
    success: boolean;
    sessionId: string;
    userRequest: string;
    metrics: ExecutionMetrics;
    taskResults: TaskResult[];
    aggregatedResult: AggregatedResult;
    timestamp: Date;
    executionPlan?: ExecutionPlan;
    duration?: number;
    [key: string]: any;
}
/**
 * Live metrics for progress visualization
 */
export interface LiveMetrics {
    totalTasks: number;
    completedTasks: number;
    failedTasks?: number;
    runningTasks?: number;
    averageDuration?: number;
    totalCost: number;
    totalTokens?: number;
    timestamp?: Date;
    totalTime: number;
    modelUsage: Record<string, number>;
    averageTaskTime: number;
    costPerTask: number;
    throughput: number;
    successRate?: number;
    errorRate?: number;
    [key: string]: any;
}
/**
 * Agent-specific metrics
 */
export interface AgentMetrics {
    agentId: string;
    agentName: string;
    tasksCompleted: number;
    tasksFailed: number;
    totalTokens: number;
    totalCost: number;
    averageDuration: number;
    successRate?: number;
    executionTime?: number;
    costEfficiency?: number;
    qualityScore?: number;
    [key: string]: any;
}
/**
 * Orchestration metrics for monitoring
 */
export interface OrchestrationMetrics {
    sessionId: string;
    startTime: Date;
    timestamp?: Date;
    elapsed: number;
    totalExecutionTime?: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    successfulTasks: number;
    totalCost: number;
    totalTokens: number;
    averageDuration: number;
    totalTime: number;
    modelUsage: Record<string, number>;
    averageTaskTime: number;
    throughput: number;
    successRate: number;
    errorRate?: number;
    agentPerformance?: Record<string, any>;
    [key: string]: any;
}
/**
 * Session data for persistence
 */
export interface SessionData {
    sessionId: string;
    userRequest: string;
    status: TaskStatus;
    startTime: Date;
    endTime?: Date;
    executionPlan?: ExecutionPlan;
    taskResults: TaskResult[];
    options: OrchestratorOptions;
}
/**
 * Session summary for listing
 */
export interface SessionSummary {
    sessionId: string;
    userRequest: string;
    status: TaskStatus;
    startTime: Date;
    taskCount: number;
}
/**
 * Progress snapshot for tracking
 */
export interface ProgressSnapshot {
    sessionId: string;
    timestamp: Date;
    overallProgress: number;
    taskStatuses: Record<string, TaskStatus>;
    activeAgents: string[];
    estimatedCompletion?: Date;
}
/**
 * Progress update event
 */
export interface ProgressUpdate {
    sessionId: string;
    timestamp: Date;
    taskId: string;
    status: TaskStatus;
    progress: number;
    message?: string;
    currentOperation?: string;
}
/**
 * Keyword extraction result
 */
export interface KeywordExtractionResult {
    keywords: string[];
    domains: string[];
    confidence: number;
    complexity: ComplexityLevel;
}
/**
 * Domain classification result
 */
export interface DomainClassificationResult {
    primaryDomain: string;
    secondaryDomains: string[];
    confidence: number;
}
/**
 * Time and cost estimation
 */
export interface TimeAndCost {
    estimatedTime: number;
    estimatedCost: number;
    confidence: number;
}
/**
 * Routing decision for agent selection
 */
export interface RoutingDecision {
    primaryAgent: string;
    fallbackAgents: string[];
    confidence: number;
    reasoning: string;
}
/**
 * Agent definition for routing
 */
export interface AgentDefinition {
    id: string;
    name: string;
    file: string;
    model: ModelType;
    priority: PriorityLevel;
    specialization: string[];
    capabilities: string[];
}
/**
 * Orchestrator error
 */
export interface OrchestratorError {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
    critical?: boolean;
}
/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
    strategy: 'retry' | 'fallback' | 'skip' | 'abort';
    maxRetries?: number;
    fallbackAgent?: string;
}
/**
 * Error analysis result
 */
export interface ErrorAnalysisResult {
    error: OrchestratorError;
    rootCause: string;
    suggestions: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    confidence?: number;
    [key: string]: any;
}
/**
 * Recovery options for error handling
 */
export interface RecoveryOptions {
    canRetry: boolean;
    canFallback: boolean;
    canSkip: boolean;
    canAbort: boolean;
    fallbackAgent?: string;
    guidedSession?: boolean;
    [key: string]: any;
}
/**
 * Error prevention rule
 */
export interface ErrorPreventionRule {
    id: string;
    pattern: string;
    prevention: string;
    severity: 'low' | 'medium' | 'high';
}
/**
 * Documentation generation result
 */
export interface DocumentationResult {
    success: boolean;
    files: string[];
    filesUpdated?: number;
    summary: string;
    wordCount: number;
    qualityScore?: number;
    [key: string]: any;
}
/**
 * Documentation template configuration
 */
export interface DocumentationTemplate {
    name: string;
    path: string;
    sections: string[];
    variables: Record<string, string>;
}
/**
 * Documentation configuration
 */
export interface DocumentationConfig {
    outputDir: string;
    templates: DocumentationTemplate[];
    format: 'markdown' | 'html' | 'json';
    includeTimestamp: boolean;
}
/**
 * Documentation output format
 */
export interface DocumentationOutput {
    content: string;
    format: string;
    filePath: string;
    metadata: Record<string, any>;
}
/**
 * Auto-documentation metrics
 */
export interface AutoDocumentationMetrics {
    totalFiles: number;
    processedFiles: number;
    generatedDocs: number;
    totalTime: number;
    averageTimePerFile: number;
}
/**
 * Plugin command definition
 */
export interface PluginCommand {
    name: string;
    description: string;
    usage: string;
    examples: string[];
    handler: CommandHandler;
}
/**
 * Command handler function
 */
export type CommandHandler = (args: string[]) => Promise<string> | string;
/**
 * Progress callback type
 */
export type ProgressCallback = (progress: number, message: string) => void;
/**
 * Performance alert
 */
export interface PerformanceAlert {
    id?: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    type?: string;
    message: string;
    timestamp: Date;
    source: string;
    details?: any;
    suggestedActions?: string[];
}
/**
 * Visualization configuration
 */
export interface VisualizationConfig {
    showProgress?: boolean;
    showProgressBars?: boolean;
    showDependencies?: boolean;
    showDependencyGraph?: boolean;
    showMetrics?: boolean;
    showLiveMetrics?: boolean;
    updateInterval?: number;
    theme?: 'light' | 'dark';
    verboseMode?: boolean;
    enableRealTime?: boolean;
    [key: string]: any;
}
/**
 * Troubleshooting session data
 */
export interface TroubleshootingSession {
    sessionId: string;
    errors: OrchestratorError[];
    startTime: Date;
    endTime?: Date;
    status: 'active' | 'resolved' | 'abandoned';
    analysis?: any;
    [key: string]: any;
}
/**
 * Guide step for troubleshooting
 */
export interface GuideStep {
    stepNumber: number;
    title: string;
    description: string;
    action?: string;
    expectedOutcome?: string;
    [key: string]: any;
}
/**
 * Dependency graph node
 */
export interface DependencyGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    cycles?: string[];
    [key: string]: any;
}
/**
 * Graph node in dependency tree
 */
export interface GraphNode {
    id: string;
    label?: string;
    status?: TaskStatus;
    dependencies?: string[];
    description?: string;
    model?: ModelType;
    estimatedTime?: number;
    [key: string]: any;
}
/**
 * Graph edge representing dependency
 */
export interface GraphEdge {
    from: string;
    to: string;
    type?: 'hard' | 'soft' | 'required';
    reason?: string;
    [key: string]: any;
}
/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Input validation options
 */
export interface ValidationOptions {
    validateBudget?: boolean;
    validateTimeLimit?: boolean;
    validateModel?: boolean;
}
/**
 * Expert agent call configuration
 */
export interface ExpertAgentCall {
    agentId: string;
    agentFile: string;
    model: ModelType;
    prompt: string;
    context?: any;
}
/**
 * Extended expert agent call with additional properties
 */
export interface ExtendedExpertAgentCall extends ExpertAgentCall {
    agentType?: string;
    specialization?: string;
    priority?: PriorityLevel;
    estimatedTime?: number;
    estimatedCost?: number;
}
//# sourceMappingURL=types-unified.d.ts.map