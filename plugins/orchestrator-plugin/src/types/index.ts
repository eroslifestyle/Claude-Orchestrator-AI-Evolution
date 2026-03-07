/**
 * Type Definitions for Orchestrator Plugin
 *
 * This file contains all TypeScript type definitions used
 * throughout the orchestrator plugin.
 */

// =============================================================================
// Basic Types
// =============================================================================

export type ModelType = 'haiku' | 'sonnet' | 'opus';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'escalated';
export type PriorityLevel = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
export type DomainType = string;
export type ExecutionStrategyType = 'sequential' | 'parallel' | 'hybrid';
export type MitigationStrategy = string;

// =============================================================================
// Plugin Interface Types
// =============================================================================

export interface PluginCommand {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  handler: CommandHandler;
}

export interface CommandHandler {
  (args: string[]): Promise<string>;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface OrchestratorOptions {
  maxParallel?: number;                    // Max parallel agents (default: 20)
  modelPreference?: ModelType;             // Prefer specific model
  budget?: number;                         // Max cost in cents
  timeLimit?: number;                      // Max time in seconds
  autoDocument?: boolean;                  // Auto-run documenter (default: true)
  confirmBefore?: boolean;                 // Require user confirmation (default: true)
  retryFailed?: boolean;                   // Auto-retry failed tasks (default: true)
  escalateOnFailure?: boolean;             // Auto-escalate model (default: true)
  dryRun?: boolean;                        // Preview mode only
  onProgress?: (update: ProgressUpdate) => void; // Progress callback
}

export interface PluginConfig {
  routing: RoutingConfig;
  performance: PerformanceConfig;
  costs: CostConfig;
  agents: AgentConfig[];
  keywords: KeywordMapping[];
}

export interface RoutingConfig {
  fallback_agent: string;
  max_parallel_agents: number;
  escalation_enabled: boolean;
  auto_documentation: boolean;
}

export interface PerformanceConfig {
  max_planning_time: number;
  progress_update_interval: number;
  session_timeout: number;
}

export interface CostConfig {
  default_budget: number;
  cost_alerts: boolean;
  model_costs: Record<ModelType, number>;
}

// =============================================================================
// Analysis Types
// =============================================================================

export interface Keyword {
  text: string;
  confidence: number;                      // 0.0 to 1.0
  domain?: string;
  synonyms: string[];
}

export interface KeywordExtractionResult {
  keywords: Keyword[];
  primaryDomain: string;
  secondaryDomains: string[];
  confidence: number;
  processingTime: number;
}

export interface DetectedDomain {
  name: string;
  confidence: number;
  keywords: Keyword[];
  suggestedAgent: string;
  priority: PriorityLevel;
}

export interface ClassifiedDomain {
  name: string;
  confidence: number;
  matchedKeywords: string[];
  suggestedAgent: string;
  suggestedModel: ModelType;
  priority: PriorityLevel;
  weight: number;
}

export interface ComplexityAssessment {
  level: 'low' | 'medium' | 'high';
  score: number;                           // 0.0 to 1.0
  factors: ComplexityFactor[];
  recommendedModel: ModelType;
  estimatedTime: number;                   // in minutes
  estimatedCost: number;                   // in dollars
}

export interface ComplexityFactor {
  type: 'domain_count' | 'dependency_depth' | 'keyword_ambiguity' | 'file_count';
  impact: number;                          // 0.0 to 1.0
  description: string;
}

// =============================================================================
// Agent and Routing Types
// =============================================================================

export interface AgentConfig {
  name: string;
  file: string;
  role: string;
  specialization: string;
  keywords: string[];
  defaultModel: ModelType;
  description: string;
  size_kb?: number;
  version?: string;
}

export interface AgentSelection {
  agentName: string;
  agentFile: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
  priority: PriorityLevel;
}

export interface ModelSelection {
  model: ModelType;
  reasoning: string;
  confidence: number;
  estimatedCost: number;
  escalationPotential: boolean;
}

export interface KeywordMapping {
  domain: string;
  primary_agent: string;
  agentFile?: string;
  keywords: string[];
  priority: PriorityLevel;
  model: ModelType;
  notes?: string;
  description?: string;
}

// RoutingDecision is now defined in routing/AgentRouter.ts to avoid conflicts

// =============================================================================
// Task and Execution Types
// =============================================================================

export interface Task {
  id: string;
  description: string;
  agentFile: string;                       // e.g., "experts/gui-super-expert.md"
  model: ModelType;
  dependencies: string[];                  // Task IDs this depends on
  specialization: string;
  priority: PriorityLevel;
  estimatedTime: number;                   // in minutes
  estimatedCost: number;                   // in dollars
  metadata: TaskMetadata;
}

export interface TaskMetadata {
  domain: string;
  complexity: ComplexityAssessment;
  keywords: Keyword[];
  agentSelection: AgentSelection;
  modelSelection: ModelSelection;
}

export interface ExecutionPlan {
  sessionId: string;
  tasks: Task[];
  dependencies: DependencyGraph;
  parallelBatches: ExecutionBatch[];
  totalEstimate: {
    time: number;                          // in minutes
    cost: number;                          // in dollars
  };
  riskFactors: RiskFactor[];
  createdAt: Date;
  totalEstimatedDuration?: number;
}

export interface ExecutionBatch {
  id: string;
  tasks: Task[];
  dependencies: string[];                  // Batch IDs this depends on
  estimatedTime: number;
  estimatedCost: number;
  parallelizable: boolean;
}

export interface DependencyGraph {
  nodes: Task[];
  edges: DependencyEdge[];
  cycles: CircularDependency[];
  criticalPath: string[];                  // Task IDs in critical path
  maxParallelism: number;
}

export interface DependencyEdge {
  from: string;                            // Task ID
  to: string;                              // Task ID
  type: 'required' | 'optional' | 'preference';
  reason: string;
}

export interface CircularDependency {
  cycle: string[];                         // Task IDs forming cycle
  severity: 'error' | 'warning';
  resolution: string;
}

export interface RiskFactor {
  type: 'complexity' | 'dependencies' | 'cost' | 'time';
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

// =============================================================================
// Progress and Monitoring Types
// =============================================================================

export interface ProgressSnapshot {
  sessionId: string;
  totalTasks: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  percentComplete: number;
  estimatedTimeRemaining: number;
  currentBatch: number;
  totalBatches: number;
  activeTasks: RunningTask[];
  lastUpdate: Date;
}

export interface RunningTask {
  taskId: string;
  agentId: string;
  description: string;
  status: TaskStatus;
  progress: number;                        // 0.0 to 1.0
  startTime: Date;
  estimatedCompletion: Date;
  currentOperation: string;
}

export interface ProgressUpdate {
  taskId: string;
  status: TaskStatus;
  progress?: number;
  currentOperation?: string;
  error?: TaskError;
}

export interface ProgressCallback {
  (update: ProgressSnapshot): void;
}

export interface UnsubscribeFunction {
  (): void;
}

// =============================================================================
// Result Types
// =============================================================================

export interface TaskResult {
  taskId: string;
  agentId: string;
  status: TaskStatus;
  result?: ParsedAgentResponse;
  error?: TaskError;
  errors?: TaskError[];                    // Multiple errors (for compatibility)
  startTime: Date;
  endTime: Date;
  duration: number;                        // in milliseconds
  tokensUsed: number;
  cost: number;
  model: ModelType;
  escalations: ModelEscalation[];
  warnings: string[];                      // Warning messages during execution
  description?: string;                    // Task description
  agentFile?: string;                      // Agent file path
  metadata?: TaskMetadata;                 // Additional task metadata
}

export interface ParsedAgentResponse {
  header: {
    agent: string;
    taskId: string;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'BLOCKED';
    model: ModelType;
    timestamp: Date;
  };
  summary: string;
  details: Record<string, any>;
  filesModified: FileChange[];
  issuesFound: Issue[];
  nextActions: string[];
  handoff: {
    to: string;
    context: string;
  };
  rawResponse: string;
}

export interface OrchestratorResult {
  sessionId: string;
  success: boolean;
  executionPlan: ExecutionPlan;
  taskResults: TaskResult[];
  aggregatedResult: AggregatedResult;
  metrics: ExecutionMetrics;
  documentation: DocumentationResult;
  errors: OrchestratorError[];
  warnings: string[];
  duration: number;                        // in milliseconds
  completedAt: Date;
  request?: string;                        // Original user request
}

export interface AggregatedResult {
  filesModified: FileChange[];
  totalChanges: number;
  issuesFound: Issue[];
  recommendations: string[];
  summary: string;
  qualityScore: number;                    // 0.0 to 1.0
}

export interface ExecutionMetrics {
  totalTime: number;                       // in milliseconds
  totalCost: number;                       // in dollars
  totalTokens: number;
  modelUsage: Record<ModelType, number>;   // tokens per model
  agentUsage: Record<string, number>;      // usage count per agent
  parallelismEfficiency: number;          // 0.0 to 1.0
  successRate: number;                     // 0.0 to 1.0
  escalationRate: number;                  // 0.0 to 1.0
  averageTaskTime: number;                 // in milliseconds
  peakParallelTasks: number;
  throughput: number;                      // tasks per minute
}

// =============================================================================
// File and Change Types
// =============================================================================

export interface FileChange {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  description: string;
  lineCount?: number;
}

export interface Issue {
  type: 'error' | 'warning' | 'info';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

// =============================================================================
// Error Types
// =============================================================================

export interface TaskError {
  type: 'agent_failure' | 'timeout' | 'api_error' | 'validation_error';
  message: string;
  details?: Record<string, any>;
  recoverable: boolean;
  suggestedAction: string;
}

export interface OrchestratorError {
  type: 'planning_error' | 'execution_error' | 'aggregation_error';
  message: string;
  taskId?: string;
  fatal: boolean;
  timestamp: Date;
  code?: string;
  details?: string;
  critical?: boolean;
}

export interface ModelEscalation {
  from: ModelType;
  to: ModelType;
  reason: EscalationReason;
  timestamp: Date;
  costImpact: number;
}

export interface EscalationReason {
  type: 'failure' | 'timeout' | 'complexity';
  attempts: number;
  error?: string;
}

// =============================================================================
// Documentation Types
// =============================================================================

export interface DocumentationResult {
  filesUpdated: string[];
  contextHistoryUpdated: boolean;
  readmeUpdated: boolean;
  codeCommentsAdded: number;
  summary: string;
}

export interface DocumentationTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
}

export interface DocumentationConfig {
  enabled: boolean;
  outputDirectory: string;
  templates: DocumentationTemplate[];
  autoGenerate: boolean;
  outputPath?: string;
  format?: 'markdown' | 'html';
  includeMetadata?: boolean;
}

export interface DocumentationOutput {
  success: boolean;
  filesGenerated: string[];
  errors: string[];
  timestamp: Date;
  content?: string;
  format?: string;
  documents?: any[];
}

export interface AutoDocumentationMetrics {
  totalDocumentsGenerated: number;
  averageGenerationTime: number;
  successRate: number;
  lastGenerated: Date;
  documentsGenerated?: number;
  totalTime?: number;
}

export interface ExpertAgentCall {
  agentType: string;
  instructions: string;
  model: ModelType;
  agentFile: string;
  agent?: string;
  task?: string;
  result?: any;
}

// =============================================================================
// Integration Types
// =============================================================================

export interface AgentDefinition {
  id?: string;
  name: string;
  role: string;
  specialization: string;
  instructions: string;
  keywords: string[];
  defaultModel: ModelType;
  version?: string;
  filePath?: string;
  enabled?: boolean;
}

export interface TaskToolRequest {
  subagent_type: string;
  instructions: string;
  model: ModelType;
  agent_id: string;
  description: string;
}

export interface TaskToolResult {
  success: boolean;
  output: string;
  agent_id: string;
  model_used: ModelType;
  tokens_used: number;
  duration: number;
}

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ComplianceResult {
  isCompliant: boolean;
  violations: string[];
  suggestions: string[];
}

// =============================================================================
// Session Types
// =============================================================================

export interface SessionData {
  sessionId: string;
  id: string;                              // Same as sessionId, for compatibility
  userRequest: string;
  options: OrchestratorOptions;
  executionPlan?: ExecutionPlan;           // Made optional
  startTime: Date;
  endTime?: Date;
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'cancelled';
  currentBatch: number;
  taskResults: TaskResult[];
  progress: ProgressSnapshot;
}

// =============================================================================
// Utility Types
// =============================================================================

export interface TimeAndCost {
  time: number;                            // in minutes
  cost: number;                            // in dollars
}

export interface ExecutionContext {
  sessionId: string;
  options: OrchestratorOptions;
  config: PluginConfig;
  startTime: Date;
}

export interface RoutingContext {
  domains: DetectedDomain[];
  complexity: ComplexityAssessment;
  budget?: number;
  timeLimit?: number;
}

// =============================================================================
// Additional Types for UI Components
// =============================================================================

export interface CLISession {
  id: string;
  startTime: number;
  version: string;
}

export interface CLIHistory {
  entries: CLIHistoryEntry[];
  lastUpdated: number;
}

export interface CLIHistoryEntry {
  timestamp: number;
  command: string;
  args: string[];
  success: boolean;
  error?: string | undefined;
  duration: number;
}

export interface VisualizationConfig {
  showProgressBars: boolean;
  showDependencyGraph: boolean;
  showLiveMetrics: boolean;
  updateInterval: number;
  enableRealTime: boolean;
  verboseMode: boolean;
}

export interface LiveMetrics {
  totalTime: number;
  totalCost: number;
  completedTasks: number;
  totalTasks: number;
  averageTaskTime: number;
  costPerTask: number;
  modelUsage: Record<string, number>;
  throughput: number;
  errorRate: number;
}

export interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  regex: RegExp;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  commonCauses: string[];
  recoveryStrategies: string[];
}

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  applicablePatterns: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  steps: GuideStep[];
}

export interface GuideStep {
  id: string;
  description: string;
  action: string;
  automated: boolean;
  userInput?: boolean;
}

export interface TroubleshootingSession {
  id: string;
  error: OrchestratorError;
  analysis: ErrorAnalysisResult;
  availableStrategies: RecoveryStrategy[];
  selectedStrategy: RecoveryStrategy | null;
  steps: GuideStep[];
  currentStep: number;
  startTime: number;
  endTime?: number;
  status: 'in-progress' | 'completed' | 'failed';
}

export interface ErrorAnalysisResult {
  error: OrchestratorError;
  pattern: ErrorPattern | null;
  confidence: number;
  suggestedActions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedRecoveryTime: number;
  preventionRules: ErrorPreventionRule[];
}

export interface RecoveryOptions {
  error: OrchestratorError;
  analysis: ErrorAnalysisResult;
  strategies: RecoveryStrategy[];
  similarSessions: TroubleshootingSession[];
  automaticRecovery: boolean;
  guidedRecoveryAvailable: boolean;
  estimatedRecoveryTime: number;
  preventionRules: ErrorPreventionRule[];
  autoRecoveryAttempted?: boolean;
  autoRecoveryResult?: { success: boolean; details: string };
  guidedSession?: TroubleshootingSession;
}

export interface ErrorPreventionRule {
  id: string;
  description: string;
  condition: string;
  action: string;
}

export interface OrchestratorConfig {
  version: string;
  maxParallelAgents: number;
  defaultTimeLimit: number;
  defaultBudget: number;
  modelPreferences: any;
  agentRegistry: AgentRegistry;
  keywordMappings: KeywordMapping[];
  enabledAgents?: string[];
  enableCaching?: boolean;
  enableMetrics?: boolean;
  logLevel?: string;
  'model-preferences'?: string;
  features: {
    enableCaching: boolean;
    enableMetrics: boolean;
    enableAutoDocumentation: boolean;
    enableProgressVisualization: boolean;
  };
  logging: {
    level: string;
    enableFileLogging: boolean;
    enableConsoleLogging: boolean;
  };
  paths: {
    configDirectory: string;
    agentFiles: string;
    logsDirectory: string;
    cacheDirectory: string;
  };
}

export interface AgentRegistry {
  version: string;
  lastUpdated: string;
  agents: AgentDefinition[];
}

export interface ConfigurationWizardOptions {
  skipWelcome?: boolean;
}

export interface ConfigurationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface SetupWizardStep {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'input' | 'choice' | 'multi-choice' | 'custom' | 'confirmation' | 'completion';
  fields?: WizardField[];
  choices?: WizardChoice[];
}

export interface WizardField {
  key: string;
  label: string;
  default?: string;
  type: 'string' | 'number' | 'boolean' | 'choice';
  choices?: string[];
}

export interface WizardChoice {
  key: string;
  label: string;
  default?: boolean;
}

// Extend OrchestratorError to match usage in UI
export interface ExtendedOrchestratorError extends OrchestratorError {
  code: string;
  details?: string;
  critical?: boolean;
}

// Additional types for UI components
export interface OrchestrationMetrics {
  timestamp: number;
  totalExecutionTime: number;
  totalTime: number;
  totalCost: number;
  successRate: number;
  errorRate: number;
  agentPerformance: AgentMetrics[];
  totalTasks: number;
  successfulTasks: number;
  totalTokens: number;
  modelUsage: Record<string, number>;
  averageTaskTime: number;
  throughput: number;
}

export interface AgentMetrics {
  agentName: string;
  successRate: number;
  executionTime: number;
  costEfficiency: number;
  qualityScore: number;
}

export interface PerformanceAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: number;
  suggestedActions: string[];
}

// =============================================================================
// Integration Types
// =============================================================================

export interface IntegrationContext {
  [key: string]: any;
}

export interface IntegrationResilienceResult {
  success: boolean;
  attempts?: number;
  error?: string;
  data?: unknown;
  errors?: Array<{ type: string; message: string; timestamp: Date; recoverable: boolean }>;
  totalTimeMs?: number;
  strategy?: 'retry' | 'fallback' | 'circuit-breaker' | 'bulkhead';
  metrics?: {
    retryCount?: number;
    fallbackActivated?: boolean;
    circuitBreakerState?: 'closed' | 'open' | 'half-open';
  };
  resilienceId?: string;
  failureAnalysis?: FailureAnalysis;
  strategiesApplied?: ResilienceStrategy[];
  resilienceTime?: number;
  integrationType?: string;
}

export interface ApiEndpoint {
  url: string;
  method?: string;
  timeout?: number;
  baseUrl?: string;
  path?: string;
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'api-key' | 'basic' | 'oauth2';
    token?: string;
    apiKey?: string;
    username?: string;
    password?: string;
  };
}

export interface RateLimitConfig {
  maxRequests?: number;
  perMilliseconds?: number;
  windowMs?: number;
  strategy?: 'sliding-window' | 'token-bucket' | 'fixed-window';
  backoffMultiplier?: number;
  maxWaitTimeMs?: number;
}

export interface RetryConfig {
  maxAttempts?: number;
  backoffMs?: number;
  initialDelayMs?: number;
  baseDelay?: number;
  maxDelayMs?: number;
  maxDelay?: number;
  strategy?: 'exponential' | 'linear' | 'fixed';
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  retryableErrorTypes?: string[];
  retryableErrors?: string[];
  backoffFactor?: number;
}

export interface BreakerConfig {
  threshold?: number;
  timeout?: number;
  resetTimeout?: number;
}

export interface IntegrationHealth {
  status: 'healthy' | 'degraded' | 'down' | 'failed';
  lastCheck?: Date;
  successCount?: number;
  lastSuccess?: Date;
  failureCount?: number;
  lastFailure?: Date;
  lastError?: unknown;
  successRate?: number;
  responseTime?: number;
  averageResponseTime?: number;
}

export interface ApiCall {
  endpoint: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
  data?: unknown;
  rateLimitConfig?: RateLimitConfig;
  retryConfig?: RetryConfig;
}

export interface PluginIntegration {
  name: string;
  version?: string;
  enabled?: boolean;
  id?: string;
  config?: Record<string, unknown>;
}

export interface CrossPlatformConfig {
  platform: string;
  settings?: Record<string, unknown>;
  platformSpecificPaths?: Record<string, string>;
  compatibilityMode?: boolean;
}

export interface IntegrationFailurePattern {
  pattern?: string;
  frequency?: number;
  id?: string;
  type?: string;
  indicators?: string[];
  confidence?: number;
  severity?: 'low' | 'medium' | 'high';
  lastOccurred?: Date;
}

export interface ResilienceStrategy {
  type: string;
  config?: unknown;
  priority?: number;
}

export interface ApiCallResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | Error;
  statusCode?: number;
  headers?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  callId?: string;
  attempts?: Array<{
    attempt: number;
    startTime: number;
    endTime: number;
    error?: string;
    statusCode?: number;
  }>;
}

export interface RateLimitState {
  remaining?: number;
  resetAt?: Date;
  requests?: number;
  windowStart?: number;
  blocked?: boolean;
  resetTime?: number;
  endpoint?: string;
  limit?: number;
}

export interface IntegrationMetrics {
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  successfulCalls?: number;
  failedCalls?: number;
  averageResponseTime?: number;
  lastCallTimestamp?: Date;
}

export interface FailureAnalysis {
  reason?: string;
  suggestedAction?: string;
  pattern?: IntegrationFailurePattern;
  recoveryActions?: RecoveryAction[];
  rootCause?: string;
}

export interface RecoveryAction {
  action: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedCost?: number;
}

// =============================================================================
// Cascade Prevention Types
// =============================================================================

export interface CascadeFailureContext {
  trigger?: string;
  affectedServices?: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold?: number;
  recoveryTimeout?: number;
}

export interface FailureIsolationResult {
  isolated: boolean;
  services?: string[];
}

// =============================================================================
// Extended Documentation Types
// =============================================================================

export interface DocumentationConfigExtended {
  outputPath?: string;
  format?: 'markdown' | 'html';
  includeMetadata?: boolean;
}

// =============================================================================
// Resource Constraint Recovery Types
// =============================================================================

export interface ResourceConstraint {
  type: 'memory' | 'cpu' | 'disk' | 'timeout' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentUsage: number;
  limit: number;
  available: number;
  timestamp: Date;
}

export interface ResourceRecoveryResult {
  success: boolean;
  actionTaken: string;
  resourcesFreed: number;
  newUsageLevel: number;
  duration: number;
  error?: string;
}

export interface SystemResourceMetrics {
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  timestamp: Date;
}

export interface ResourceThresholds {
  memory: {
    warning: number;
    critical: number;
  };
  cpu: {
    warning: number;
    critical: number;
  };
  disk: {
    warning: number;
    critical: number;
  };
}

export interface ResourceRecoveryConfig {
  enabled: boolean;
  monitoringInterval: number;
  cleanupEnabled: boolean;
  throttlingEnabled: boolean;
  thresholds: ResourceThresholds;
}

export type ResourceOptimizationStrategy = 'aggressive' | 'moderate' | 'conservative';

export interface ResourceConstraintContext {
  constraint: ResourceConstraint;
  metrics: SystemResourceMetrics;
  availableActions: string[];
  recommendation: string;
}

export type MemoryPressureLevel = 'low' | 'medium' | 'high' | 'critical';

export type ThrottlingStrategy = 'none' | 'reduce_parallelism' | 'pause_execution' | 'emergency_cleanup';

export type LoadDistributionStrategy = 'round_robin' | 'least_loaded' | 'random' | 'priority_based';

export interface ResourceCleanupResult {
  success: boolean;
  itemsCleaned: number;
  spaceFreed: number;
  duration: number;
  error?: string;
}

export interface ResourceMonitoringConfig {
  enabled: boolean;
  interval: number;
  historySize: number;
  alertThresholds: ResourceThresholds;
}

// =============================================================================
// Resilience and Fallback Types
// =============================================================================

export interface FailureContext {
  type: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
  attempts: number;
  lastError?: string;
}

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  duration: number;
  result?: any;
  error?: string;
}

export interface TaskContext {
  taskId: string;
  description: string;
  agentFile: string;
  model: ModelType;
  priority: PriorityLevel;
  dependencies: string[];
  status: TaskStatus;
  startTime?: Date;
}

export interface SynthesizedAgent {
  name: string;
  role: string;
  specialization: string;
  capabilities: string[];
  model: ModelType;
  instructions: string;
  keywords: string[];
  priority: PriorityLevel;
}

export interface ConfigurationState {
  valid: boolean;
  config: PluginConfig;
  errors: string[];
  warnings: string[];
}

export interface OrchestrationRequest {
  userRequest: string;
  options: OrchestratorOptions;
  sessionId: string;
  timestamp: Date;
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  metadata?: Record<string, any>;
}

export interface UltraResilientConfig {
  enabled: boolean;
  maxRetries: number;
  fallbackTimeout: number;
  emergencyMode: boolean;
  selfHealing: boolean;
}

export type FailureMode = 'transient' | 'permanent' | 'recoverable' | 'critical';

export interface SelfHealingResult {
  success: boolean;
  healingAction: string;
  duration: number;
  originalError: string;
  outcome: string;
}

// =============================================================================
// Agent Synthesis Types
// =============================================================================

export interface AgentTemplate {
  name: string;
  role: string;
  specialization: string;
  defaultModel: ModelType;
  instructions: string;
  capabilities: AgentCapability[];
  keywords: string[];
}

export interface SynthesisResult {
  success: boolean;
  agent: SynthesizedAgent;
  confidence: number;
  reason: string;
  duration: number;
}

export interface AgentCapability {
  name: string;
  category: string;
  description: string;
  required: boolean;
}

export interface EmergencySynthesisConfig {
  enabled: boolean;
  fallbackTemplates: AgentTemplate[];
  confidenceThreshold: number;
  maxSynthesisTime: number;
}

export type TaskComplexityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AgentProfile {
  name: string;
  role: string;
  specialization: string;
  capabilities: string[];
  keywords: string[];
  defaultModel: ModelType;
  successRate: number;
  avgExecutionTime: number;
}

// =============================================================================
// Agent Task Types
// =============================================================================

export interface AgentTask {
  id: string;
  agentFile: string;
  description: string;
  model: ModelType;
  priority: PriorityLevel;
  dependencies: string[];
  status: TaskStatus;
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: TaskError;
  depth?: number;
  childTaskIds?: string[];
  maxDepth?: number;
  path?: string;
  rootTaskId?: string;
}