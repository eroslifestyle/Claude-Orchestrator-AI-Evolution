/**
 * Orchestrator Plugin - Type Definitions
 *
 * Central type definitions for the entire orchestrator system.
 * This file was missing and causing compilation errors.
 */

// =============================================================================
// MODEL TYPES
// =============================================================================

export type ModelType = 'haiku' | 'sonnet' | 'opus' | 'auto';

/**
 * Priority levels for task execution
 */
export type PriorityLevel = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';

/**
 * Task execution status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'running' | 'completed' | 'failed' | 'cancelled' | 'escalated' | 'planning';

/**
 * Complexity level for analysis
 */
export type ComplexityLevel = 'bassa' | 'media' | 'alta' | 'molto_alta';

// =============================================================================
// CONFIG TYPES
// =============================================================================

/**
 * Main plugin configuration
 */
export interface PluginConfig {
  // Core properties
  name?: string;
  version?: string;
  environment?: 'test' | 'development' | 'production';
  maxParallelAgents?: number;
  defaultModel?: ModelType;
  enableCaching?: boolean;
  cacheSize?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  configDir?: string;
  // Plugin feature flags
  plugins?: {
    analytics?: { enabled?: boolean };
    learning?: { enabled?: boolean };
    monitoring?: { enabled?: boolean };
    costPrediction?: { enabled?: boolean };
    optimization?: { enabled?: boolean };
  };
  // Extended properties for config-loader compatibility
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
    model_costs?: {
      haiku?: number;
      sonnet?: number;
      opus?: number;
    };
  };
  agents?: any[];
  keywords?: any[];
}

/**
 * Agent configuration from registry
 */
export interface AgentConfig {
  id: string;
  name: string;
  file: string;
  model: ModelType;
  priority: PriorityLevel;
  specialization: string[];
  level: 1 | 2 | 3; // L1=Core, L2=Specialist, L3=Micro
  // Extended properties for config-loader compatibility
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
  keyword?: string;
  expertFile?: string;
  domain?: string;
  // Extended properties for config-loader compatibility
  agentFile?: string;
  description?: string;
  primary_agent?: string;
  priority?: PriorityLevel;
  model?: ModelType;
  notes?: string;
  keywords?: string[];
  [key: string]: any;
}

/**
 * Full Orchestrator configuration
 */
export interface OrchestratorConfig {
  maxParallelAgents?: number;
  defaultModel?: ModelType;
  enableCaching?: boolean;
  cacheSize?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  routing?: {
    fallbackAgent?: string;
    maxParallelAgents?: number;
    escalationEnabled?: boolean;
    autoDocumentation?: boolean;
  };
  performance?: {
    maxPlanningTime?: number;
    progressUpdateInterval?: number;
    sessionTimeout?: number;
  };
  costs?: {
    defaultBudget?: number;
    costAlerts?: boolean;
    modelCosts?: Record<string, number>;
  };
  agents?: AgentConfig[];
  keywords?: KeywordMapping[];
  /** Keyword mappings for agent routing (alias for keywords) */
  keywordMappings?: KeywordMapping[];
  /** List of enabled agent IDs */
  enabledAgents?: string[];
  /** Enable metrics collection */
  enableMetrics?: boolean;
  /** Feature flags for various capabilities */
  features?: {
    autoDocumentation?: boolean;
    metrics?: boolean;
    enableCaching?: boolean;
    enableMetrics?: boolean;
    enableAutoDocumentation?: boolean;
    [key: string]: any;
  };
  /** Agent registry */
  agentRegistry?: {
    agents: AgentDefinition[] | Map<string, AgentDefinition>;
  };
  /** Model strategy */
  modelStrategy?: string;
  /** Version string */
  version?: string;
  /** Additional properties */
  [key: string]: any;
}

/**
 * Agent registry for managing available agents
 */
export interface AgentRegistry {
  agents: Map<string, AgentDefinition>;
  keywords: Map<string, KeywordMapping>;
  domains: Map<string, string[]>;
}

/**
 * Configuration wizard options
 */
export interface ConfigurationWizardOptions {
  interactive?: boolean;
  autoDetect?: boolean;
  skipValidation?: boolean;
  defaults?: Partial<OrchestratorConfig>;
  /** Skip welcome screen */
  skipWelcome?: boolean;
  [key: string]: any;
}

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Setup wizard step definition
 */
export interface SetupWizardStep {
  id: string;
  title: string;
  description: string;
  required?: boolean;
  completed?: boolean;
  validator?: (value: any) => boolean;
  fields?: WizardStepField[];
  choices?: WizardStepChoice[];
  /** Type of step (e.g., 'input', 'choice', 'confirmation') */
  type?: string;
  [key: string]: any;
}

/**
 * Wizard step field definition
 */
export interface WizardStepField {
  key: string;
  label: string;
  default: string;
  type: string;
  choices?: string[];
}

/**
 * Wizard step choice definition
 */
export interface WizardStepChoice {
  key: string;
  label: string;
  default?: boolean;
  [key: string]: any;
}

// =============================================================================
// ORCHESTRATION TYPES
// =============================================================================

/**
 * Options for orchestration execution
 */
export interface OrchestratorOptions {
  /** Maximum budget in cents */
  budget?: number;
  /** Time limit in seconds */
  timeLimit?: number;
  /** Preferred model to use */
  modelPreference?: ModelType;
  /** Maximum parallel agents */
  maxParallel?: number;
  /** Preview only, don't execute */
  dryRun?: boolean;
  /** Ask for confirmation before executing */
  confirmBefore?: boolean;
  /** Session ID to resume */
  resumeSessionId?: string;
  /** Auto-run documenter at the end (default: true) */
  autoDocument?: boolean;
  /** Auto-retry failed tasks (default: true) */
  retryFailed?: boolean;
  /** Auto-escalate model on failure (default: true) */
  escalateOnFailure?: boolean;
  /** Progress callback (legacy format) */
  onProgress?: ((progress: number, message: string) => void) | ProgressUpdateCallback;
}

/**
 * Result of a single task execution
 */
export interface TaskResult {
  taskId: string;
  agentId: string;
  status: TaskStatus;
  description?: string;
  result?: any | TaskResultData;
  error?: string | TaskError;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tokens?: number;
  tokensUsed?: number; // Alias for tokens, used in parallel execution
  cost?: number;
  model?: ModelType;
  escalations?: TaskEscalation[];
  [key: string]: any; // Allow extra properties for flexibility
}

/**
 * Detailed task result data structure
 */
export interface TaskResultData {
  header: {
    agent: string;
    taskId: string;
    status: string;
    model: ModelType;
    timestamp: Date;
  };
  summary: string;
  details?: {
    description?: string;
    [key: string]: any;
  };
  filesModified?: FileModification[];
  issuesFound?: any[];
  nextActions?: any[];
  handoff?: {
    to: string;
    context: string;
  };
  rawResponse?: string;
  [key: string]: any;
}

/**
 * Task error structure
 */
export interface TaskError {
  type: string;
  message: string;
  recoverable: boolean;
  suggestedAction?: string;
  [key: string]: any;
}

/**
 * Task escalation record
 */
export interface TaskEscalation {
  agentId: string;
  reason: string;
  timestamp: Date;
  [key: string]: any;
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
  [key: string]: any; // Allow extra properties
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
  [key: string]: any; // Allow extra properties
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
  [key: string]: any; // Allow extra properties
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
  [key: string]: any; // Allow extra properties
}

/**
 * Execution plan with all tasks
 */
export interface ExecutionPlan {
  sessionId: string;
  userRequest?: string;
  tasks?: Task[];
  parallelBatches?: ParallelBatch[];
  totalAgents?: number;
  estimatedTime?: number;
  estimatedCost?: number;
  complexity?: ComplexityLevel;
  domains?: string[];
  timestamp?: Date;
  dependencies?: string[] | DependencyGraph | { nodes: any; edges: any; cycles?: any; criticalPath?: any; maxParallelism?: number };
  metadata?: any;
  nodes?: any[];
  totalEstimate?: { time: number; cost: number };
  riskFactors?: any[];
  createdAt?: Date;
  [key: string]: any; // Allow extra properties
}

/**
 * Parallel batch of tasks
 */
export interface ParallelBatch {
  batchId?: string;
  id?: string; // Alternative identifier
  taskIds?: string[];
  tasks?: Task[]; // Alternative to taskIds
  estimatedDuration?: number;
  estimatedTime?: number; // Alternative name
  dependencies?: string[];
  [key: string]: any; // Allow extra properties
}

// =============================================================================
// SESSION TYPES
// =============================================================================

/**
 * CLI Session data
 */
export interface CLISession {
  id: string;                              // Session identifier (alias for sessionId)
  sessionId: string;
  startTime: Date;
  status: 'active' | 'paused' | 'completed';
  history: CLIHistoryEntry[] | CLIHistory; // Can be array or CLIHistory object
  config?: Record<string, any>;
  version?: string;                        // Session format version
}

/**
 * CLI History container
 */
export interface CLIHistory {
  entries: CLIHistoryEntry[];
  maxSize?: number;                        // Max history entries
  lastUpdated?: Date | number;             // Last update timestamp
}

/**
 * CLI History entry
 */
export interface CLIHistoryEntry {
  id: string;
  command: string;
  args?: string[];                         // Command arguments
  timestamp: Date;
  result?: string;
  success: boolean;
  error?: string;                          // Error message if failed
  duration?: number;                       // Command execution time (ms)
}

/**
 * Session data for persistence
 */
export interface SessionData {
  sessionId: string;
  id?: string; // Alias for sessionId
  userRequest: string;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  executionPlan?: ExecutionPlan;
  taskResults: TaskResult[];
  options: OrchestratorOptions;
  [key: string]: any; // Allow extra properties
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

// =============================================================================
// ANALYSIS TYPES
// =============================================================================

/**
 * Result of keyword extraction
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
 * Progress callback type
 */
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Extended progress callback type for UI updates
 */
export type ProgressUpdateCallback = (progress: ProgressUpdate) => void;

// =============================================================================
// COMMAND TYPES
// =============================================================================

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

// =============================================================================
// ROUTING TYPES
// =============================================================================

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
  name?: string;
  file?: string;
  model?: ModelType;
  priority?: PriorityLevel;
  specialization?: string[] | string; // Can be array or string for compatibility
  capabilities?: string[];
  enabled?: boolean;
  agentFile?: string; // alias per expertFile
  role?: string;
  filePath?: string;
  defaultModel?: ModelType;
  keywords?: string[];
  instructions?: string;
  /** Size in kilobytes */
  size_kb?: number;
  /** Version string */
  version?: string;
  /** Last model update timestamp */
  model_updated?: string;
  [key: string]: any;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

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
 * Error recovery strategy - extended for error recovery interface
 */
export interface ErrorRecoveryStrategy {
  strategy?: 'retry' | 'fallback' | 'skip' | 'abort';
  maxRetries?: number;
  fallbackAgent?: string;
  /** Unique identifier for the strategy */
  id?: string;
  /** Human-readable name */
  name?: string;
  /** Description of what the strategy does */
  description?: string;
  /** Error patterns this strategy applies to */
  applicablePatterns?: string[];
  /** Difficulty level: easy, medium, hard */
  difficulty?: 'easy' | 'medium' | 'hard';
  /** Estimated time to apply in seconds */
  estimatedTime?: number;
  /** Step-by-step instructions */
  steps?: GuideStep[];
  [key: string]: any;
}

/**
 * Error pattern for detection and handling
 */
export interface ErrorPattern {
  id: string;
  name?: string;                           // Human-readable name
  description?: string;                    // Pattern description
  pattern?: RegExp | string;               // Pattern regex (optional if using regex)
  regex?: RegExp;                          // Alias for pattern (for compatibility)
  errorType?: string;                      // Error type (optional)
  category?: string;                       // Error category (timeout, budget, dependency, etc.)
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedActions?: string[];             // Suggested actions (optional)
  commonCauses?: string[];                 // Common causes for this error
  recoveryStrategies?: string[];           // Available recovery strategies
}

/**
 * Recovery strategy type alias
 */
export type RecoveryStrategy = ErrorRecoveryStrategy;

// =============================================================================
// DOCUMENTATION TYPES
// =============================================================================

/**
 * Documentation generation result
 */
export interface DocumentationResult {
  success: boolean;
  files: string[];
  filesUpdated?: number | string[];
  summary: string;
  wordCount?: number;
  qualityScore?: number;
  contextHistoryUpdated?: boolean;
  readmeUpdated?: boolean;
  codeCommentsAdded?: number;
  [key: string]: any; // Allow extra properties
}

/**
 * Documentation template configuration - extended for auto documentation
 */
export interface DocumentationTemplate {
  name: string;
  path: string;
  sections: string[];
  variables: Record<string, string>;
  /** Unique identifier for the template */
  id?: string;
  /** Template content or reference */
  template?: string;
  [key: string]: any;
}

/**
 * Documentation configuration
 */
export interface DocumentationConfig {
  enabled?: boolean;
  outputDirectory?: string;
  autoGenerate?: boolean;
  outputDir?: string;
  templates?: DocumentationTemplate[];
  format?: 'markdown' | 'html' | 'json';
  includeTimestamp?: boolean;
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
 * Extended documentation output with success flag
 */
export interface ExtendedDocumentationOutput extends DocumentationOutput {
  success: boolean;
  filesGenerated?: string[];
  errors?: string[];
  timestamp?: Date;
  sessionId?: string;
  [key: string]: any;
}

/**
 * Auto-documentation metrics - extended
 */
export interface AutoDocumentationMetrics {
  totalFiles?: number;
  processedFiles?: number;
  generatedDocs?: number;
  totalTime?: number;
  averageTimePerFile?: number;
  /** Number of documents generated */
  documentsGenerated?: number;
  /** Total documents generated across all sessions */
  totalDocumentsGenerated?: number;
  /** Last generation timestamp */
  lastGenerated?: Date;
  /** Average generation time per document */
  averageGenerationTime?: number;
  /** Success rate */
  successRate?: number;
  [key: string]: any;
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
  /** Task identifier or description */
  task?: string | any;
  /** Instructions for the agent */
  instructions?: string;
  [key: string]: any;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

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

// =============================================================================
// UI TYPES
// =============================================================================

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
  // Extended properties for UI compatibility
  totalTime: number;
  modelUsage: Record<string, number>;
  averageTaskTime: number;
  costPerTask: number;
  throughput: number;
  successRate?: number;
  errorRate?: number;
  [key: string]: any; // Allow extra properties
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
 * Analytics insight for dashboard visualization
 */
export interface AnalyticsInsight {
  insightId: string;
  timestamp: Date;
  type: 'trend' | 'anomaly' | 'opportunity' | 'warning';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions: string[];
  relevanceScore: number;
}

/**
 * Orchestration metrics for monitoring
 */
export interface OrchestrationMetrics {
  sessionId: string;
  startTime?: Date;
  timestamp?: Date | number;
  elapsed?: number;
  totalExecutionTime?: number;
  totalTasks?: number;
  completedTasks?: number;
  failedTasks?: number;
  successfulTasks?: number;
  totalCost: number;
  totalTokens?: number;
  averageDuration?: number;
  totalTime?: number;
  modelUsage?: Record<string, number>;
  averageTaskTime?: number;
  throughput?: number;
  successRate: number;
  errorRate?: number;
  agentPerformance?: Record<string, any> | AgentMetrics[];
  /** Task type classification */
  taskType?: string;
  /** Number of agents involved */
  agentCount?: number;
  /** Resource utilization metrics */
  resourceUtilization?: {
    cpuUsage?: number;
    memoryUsage?: number;
    tokenUsage?: number;
    apiCallCount?: number;
    networkLatency?: number;
  };
  [key: string]: any; // Allow extra properties
}

/**
 * Agent-specific metrics
 */
export interface AgentMetrics {
  agentId?: string;
  agentName: string;
  tasksCompleted?: number;
  tasksFailed?: number;
  totalTokens?: number;
  totalCost?: number;
  averageDuration?: number;
  successRate?: number;
  executionTime?: number;
  costEfficiency?: number;
  qualityScore?: number;
  /** Agent type/expert file */
  agentType?: string;
  /** Model used */
  model?: string;
  /** Error count */
  errorCount?: number;
  /** Task completion rate */
  completionRate?: number;
  [key: string]: any; // Allow extra properties
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
 * Dependency graph node
 */
export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles?: string[];
  criticalPath?: string[];
  maxParallelism?: number;
  [key: string]: any;
}

/**
 * Graph node in dependency tree
 */
export interface GraphNode {
  id: string;
  label?: string;  // Made optional to match Task
  status?: TaskStatus;
  dependencies?: string[];
  description?: string;
  model?: ModelType;
  estimatedTime?: number;
  [key: string]: any; // Allow extra properties
}

/**
 * Graph edge representing dependency
 */
export interface GraphEdge {
  from: string;
  to: string;
  type?: 'hard' | 'soft' | 'required';
  reason?: string;
  [key: string]: any; // Allow extra properties
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
  [key: string]: any; // Allow extra properties
}

/**
 * Troubleshooting session data
 */
export interface TroubleshootingSession {
  id?: string;                              // Session identifier (alias for sessionId)
  sessionId: string;
  errors?: OrchestratorError[];
  error?: OrchestratorError;                // Primary error (alias for errors[0])
  startTime: Date | number;
  endTime?: Date | number;
  status: 'active' | 'resolved' | 'abandoned' | 'in-progress' | 'completed' | 'failed';
  analysis?: ErrorAnalysisResult;
  availableStrategies?: ErrorRecoveryStrategy[];
  selectedStrategy?: ErrorRecoveryStrategy;
  steps?: GuideStep[];
  currentStep?: number;
  [key: string]: any; // Allow extra properties
}

/**
 * Error analysis result
 */
export interface ErrorAnalysisResult {
  error?: OrchestratorError;
  rootCause?: string;
  suggestions?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  pattern?: ErrorPattern;
  suggestedActions?: any;
  estimatedRecoveryTime?: number;
  preventionRules?: ErrorPreventionRule[];
  [key: string]: any;
}

/**
 * Recovery options for error handling
 */
export interface RecoveryOptions {
  canRetry?: boolean;
  canFallback?: boolean;
  canSkip?: boolean;
  canAbort?: boolean;
  fallbackAgent?: string;
  guidedSession?: boolean | TroubleshootingSession;  // Can be boolean or the session itself
  analysis?: ErrorAnalysisResult;
  strategies?: ErrorRecoveryStrategy[];
  similarSessions?: TroubleshootingSession[];
  automaticRecovery?: boolean;
  guidedRecoveryAvailable?: boolean;
  estimatedRecoveryTime?: any;
  preventionRules?: any;
  error?: OrchestratorError;                   // The error being recovered from
  autoRecoveryAttempted?: boolean;             // Whether auto-recovery was attempted
  autoRecoveryResult?: { success: boolean; details: string };  // Auto-recovery result
  [key: string]: any;
}

/**
 * Guide step for troubleshooting
 */
export interface GuideStep {
  stepNumber?: number;
  title?: string;
  id?: string;
  description: string;
  action?: string;
  expectedOutcome?: string;
  /** Whether step is automated */
  automated?: boolean;
  /** Whether step requires user input */
  userInput?: boolean;
  [key: string]: any;
}

/**
 * Error prevention rule - extended
 */
export interface ErrorPreventionRule {
  id?: string;
  pattern?: string;
  prevention?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  /** Description of what this rule prevents */
  description?: string;
  /** Condition when this rule applies */
  condition?: string;
  /** Action to take */
  action?: string;
  [key: string]: any;
}

// =============================================================================
// TYPES EXPORTED NOMINALLY - No default export for types
// =============================================================================
// All types are exported via 'export interface' and 'export type' declarations above
// Use: import { TypeName } from './types';


// =============================================================================
// EMERGENCY AGENT SYNTHESIS TYPES
// =============================================================================

/**
 * Task complexity level for synthesis
 */
export type TaskComplexityLevel = 'low' | 'medium' | 'high';

/**
 * Urgency level for task context
 */
export type UrgencyLevel = 'low' | 'normal' | 'high' | 'critical';

/**
 * Task context for emergency agent synthesis
 */
export interface TaskContext {
  keywords: string[];
  urgency?: UrgencyLevel;
  fallbackMode?: boolean;
  originalTask?: string;
  complexity?: TaskComplexityLevel;
  domain?: string;
  [key: string]: any;
}

/**
 * Agent capability definition
 */
export interface AgentCapability {
  id: string;
  name: string;
  domain: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  [key: string]: any;
}

/**
 * Agent template for synthesis
 */
export interface AgentTemplate {
  id: string;
  name: string;
  domain: string;
  capabilities: AgentCapability[];
  complexityLevel: TaskComplexityLevel;
  instructions: string;
  prompt: string;
  metadata: {
    version?: string;
    type?: string;
    synthetic?: boolean;
    generatedAt?: string;
    taskKeywords?: string[];
    urgencyLevel?: UrgencyLevel;
    specialization?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Synthesized agent result
 */
export interface SynthesizedAgent {
  type: string;
  path: string;
  content: string;
  synthetic: boolean;
  healingMethod: string;
  template: AgentTemplate;
  capabilities: AgentCapability[];
  metadata: {
    synthesisId: string;
    generated: string;
    taskContext: TaskContext;
    version?: string;
    synthetic: boolean;
    minimal?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Keyword analysis result for synthesis
 */
export interface KeywordAnalysisResult {
  capabilities: AgentCapability[];
  primaryDomain: string;
  complexityLevel: TaskComplexityLevel;
  confidenceScore: number;
  [key: string]: any;
}

/**
 * Synthesis result
 */
export interface SynthesisResult {
  synthesisId: string;
  success: boolean;
  agent: SynthesizedAgent | null;
  keywordAnalysis: KeywordAnalysisResult | null;
  synthesisTime: number;
  fallbackUsed?: boolean;
  error?: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * Emergency synthesis configuration
 */
export interface EmergencySynthesisConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  maxConcurrentSynthesis: number;
  synthesisTimeout: number;
  fallbackToMinimal: boolean;
  [key: string]: any;
}

/**
 * Agent profile for registry
 */
export interface AgentProfile {
  id: string;
  name: string;
  domain: string;
  capabilities: AgentCapability[];
  complexityLevel: TaskComplexityLevel;
  description?: string;
  version?: string;
  enabled?: boolean;
  synthetic?: boolean;
  [key: string]: any;
}

// =============================================================================
// CLASSIFIED DOMAIN TYPES (for routing)
// =============================================================================

/**
 * Classified domain with model type restriction
 */
export interface ClassifiedDomain {
  name: string;
  confidence: number;
  matchedKeywords: any[];
  suggestedAgent: string;
  suggestedModel: 'haiku' | 'sonnet' | 'opus' | 'auto'; // Includes 'auto' for compatibility
  priority: 'ALTA' | 'MEDIA' | 'BASSA';
  weight: number;
  [key: string]: any;
}

// =============================================================================
// INTEGRATION RESILIENCE TYPES
// =============================================================================

/**
 * Integration context for resilience handling
 */
export interface IntegrationContext {
  integrationType: string;
  endpoint?: string;
  error: Error;
  pluginId?: string;
  operation?: string;
  parameters?: any;
  originalApiCall?: ApiCall;
  [key: string]: any;
}

/**
 * Result of integration resilience handling
 */
export interface IntegrationResilienceResult {
  resilienceId: string;
  success: boolean;
  integrationType: string;
  strategiesApplied: ResilienceStrategy[];
  resilienceTime: number;
  failureAnalysis?: FailureAnalysis;
  error?: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * API endpoint configuration
 */
export interface ApiEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
  retryable?: boolean;
  [key: string]: any;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  burstLimit?: number;
  endpoint?: string;
  [key: string]: any;
}

/**
 * Retry configuration for API calls
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
  [key: string]: any;
}

/**
 * Circuit breaker configuration
 */
export interface BreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenAttempts?: number;
  monitorPeriod?: number;
  [key: string]: any;
}

/**
 * Integration health status
 */
export interface IntegrationHealth {
  status: 'healthy' | 'degraded' | 'down' | 'failed';
  lastCheck?: Date;
  successCount?: number;
  failureCount?: number;
  successRate?: number;
  averageResponseTime?: number;
  lastSuccess?: Date;
  lastFailure?: Date;
  lastError?: string | unknown;
  responseTime?: number;
  [key: string]: any;
}

/**
 * API call configuration
 */
export interface ApiCall {
  endpoint: string;
  /** URL alias for endpoint */
  url?: string;
  method: string;
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
  rateLimitConfig?: RateLimitConfig;
  /** Retry config */
  retryConfig?: RetryConfig;
  [key: string]: any;
}

/**
 * Plugin integration configuration
 */
export interface PluginIntegration {
  pluginId: string;
  pluginName: string;
  version: string;
  enabled: boolean;
  healthCheckInterval?: number;
  fallbackAvailable?: boolean;
  [key: string]: any;
}

/**
 * Cross-platform configuration
 */
export interface CrossPlatformConfig {
  targetPlatforms: string[];
  platformSpecificPaths?: Record<string, string>;
  compatibilityMode?: 'strict' | 'lenient' | 'auto';
  [key: string]: any;
}

/**
 * Integration failure pattern
 */
export interface IntegrationFailurePattern {
  type: string;
  indicators: string[];
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  [key: string]: any;
}

/**
 * Resilience strategy result
 */
export interface ResilienceStrategy {
  strategy: string;
  success: boolean;
  executionTime: number;
  result?: any;
  details?: string;
  error?: string;
  [key: string]: any;
}

/**
 * API call result
 */
export interface ApiCallResult<T = any> {
  success: boolean;
  data?: T;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  /** Headers alias for responseHeaders */
  headers?: Record<string, string>;
  callId: string;
  attempts: Array<{
    attempt: number;
    startTime: number;
    endTime: number;
    error?: string;
    statusCode?: number;
  }>;
  totalTime: number;
  error?: string | Error;
  [key: string]: any;
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  endpoint: string;
  limit?: number;
  remaining: number;
  resetTime: number;
  blocked: boolean;
  /** Request count */
  requests?: number;
  /** Window start timestamp */
  windowStart?: number;
  [key: string]: any;
}

/**
 * Integration metrics
 */
export interface IntegrationMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  lastCallTime?: Date;
  errorRate: number;
  [key: string]: any;
}

/**
 * Failure analysis result
 */
export interface FailureAnalysis {
  pattern: IntegrationFailurePattern;
  recoveryActions: RecoveryAction[];
  confidence?: number;
  suggestedStrategy?: string;
  [key: string]: any;
}

/**
 * Recovery action definition
 */
export interface RecoveryAction {
  type: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  description: string;
  /** Action name (alias for type) */
  action?: string;
  /** Estimated cost */
  estimatedCost?: number;
  [key: string]: any;
}

// =============================================================================
// CASCADE FAILURE PREVENTION TYPES
// =============================================================================

/**
 * Context for cascade failure prevention
 */
export interface CascadeFailureContext {
  rootPath: string;
  configPaths: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  systemState?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
  };
  timestamp?: string;
  [key: string]: any;
}

/**
 * Result of failure isolation operation
 */
export interface FailureIsolationResult {
  success: boolean;
  strategy: string;
  fixedIssues: string[];
  isolationTime: number;
  impact: string;
  details?: string;
  error?: string;
  [key: string]: any;
}

// =============================================================================
// RESOURCE CONSTRAINT RECOVERY TYPES
// =============================================================================

/**
 * Memory pressure level for resource monitoring
 */
export type MemoryPressureLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Throttling strategy for resource management
 */
export type ThrottlingStrategy = 'none' | 'conservative' | 'moderate' | 'aggressive' | 'emergency';

/**
 * Load distribution strategy for parallel execution
 */
export type LoadDistributionStrategy = 'round-robin' | 'least-loaded' | 'priority-based' | 'adaptive';

/**
 * System resource metrics
 */
export interface SystemResourceMetrics {
  timestamp: string;
  memory: {
    heap: {
      used: number;
      total: number;
      limit: number;
    };
    system: {
      total: number;
      free: number;
      used: number;
    };
    usage: number;
    pressure: MemoryPressureLevel;
  };
  cpu: {
    usage: number;
    load: number[];
    cores: number;
    utilization: 'low' | 'medium' | 'high';
  };
  disk: {
    usage: number;
    available: number;
    total: number;
    pressure: 'normal' | 'high' | 'critical';
  };
  network?: {
    bytesReceived?: number;
    bytesSent?: number;
    packetsReceived?: number;
    packetsSent?: number;
  };
  uptime: number;
  collectTime: number;
  [key: string]: any;
}

/**
 * Resource threshold configuration
 */
export interface ResourceThresholds {
  memory: {
    warning: number;
    critical: number;
    emergency: number;
  };
  cpu: {
    warning: number;
    critical: number;
    emergency: number;
  };
  disk: {
    warning: number;
    critical: number;
    emergency: number;
  };
  network?: {
    warning: number;
    critical: number;
    emergency: number;
  };
}

/**
 * Resource monitoring configuration
 */
export interface ResourceMonitoringConfig {
  monitoringInterval: number;
  historyRetention: number;
  predictionWindow: number;
  enablePredictions?: boolean;
  alertThresholds?: ResourceThresholds;
}

/**
 * Resource constraint type
 */
export type ResourceConstraint = 'memory' | 'cpu' | 'disk' | 'timeout' | 'network';

/**
 * Resource constraint context
 */
export interface ResourceConstraintContext {
  constraintType: ResourceConstraint;
  severity: 'warning' | 'critical' | 'emergency';
  currentMetrics?: SystemResourceMetrics;
  affectedOperations?: string[];
  recoveryOptions?: string[];
  systemState?: {
    memoryUsage?: number;
    cpuUsage?: number;
    diskUsage?: number;
  };
  timestamp?: string;
  [key: string]: any;
}

/**
 * Resource optimization strategy
 */
export interface ResourceOptimizationStrategy {
  type: string;
  actions: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: number;
  throttlingStrategy?: ThrottlingStrategy;
  loadDistribution?: LoadDistributionStrategy;
  [key: string]: any;
}

/**
 * Resource cleanup result
 */
export interface ResourceCleanupResult {
  strategy: 'conservative' | 'aggressive' | 'emergency';
  memoryFreed: number;
  filesRemoved: number;
  diskSpaceFreed: number;
  cleanupTime: number;
  success: boolean;
  details: string[];
  error?: string;
  [key: string]: any;
}

/**
 * Resource recovery result
 */
export interface ResourceRecoveryResult {
  recoveryId: string;
  success: boolean;
  constraintType: ResourceConstraint;
  severity: string;
  strategiesApplied: any[];
  resourcesBefore: SystemResourceMetrics;
  resourcesAfter: SystemResourceMetrics | null;
  recoveryTime: number;
  timestamp: string;
  error?: string;
  [key: string]: any;
}

/**
 * Resource recovery configuration
 */
export interface ResourceRecoveryConfig {
  enableProactiveMonitoring: boolean;
  enableAutomaticCleanup: boolean;
  enableLoadDistribution: boolean;
  thresholds: ResourceThresholds;
  monitoring: ResourceMonitoringConfig;
  recovery: {
    maxRecoveryAttempts: number;
    recoveryTimeout: number;
    emergencyThrottling: boolean;
  };
  [key: string]: any;
}

// =============================================================================
// ULTRA-RESILIENT FALLBACK TYPES
// =============================================================================

/**
 * Failure context for ultra-resilient fallback
 */
export interface FailureContext {
  error: Error;
  originalTask?: any;
  systemState?: any;
  stackTrace?: string;
  timestamp?: string;
  configPath?: string;
  agentPath?: string;
  agentType?: string;
  keywords?: string[];
  [key: string]: any;
}

/**
 * Failure mode classification
 */
export interface FailureMode {
  category: string;
  subtype: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  estimatedRecoveryTime: number;
  primaryStrategy: string;
  fallbackStrategies: string[];
  [key: string]: any;
}

/**
 * Recovery result from ultra-resilient fallback
 */
export interface RecoveryResult {
  success: boolean;
  recoveryId: string;
  strategy: string;
  executionResult: ExecutionResult | null;
  degradedMode: boolean;
  performanceImpact: number;
  totalRecoveryTime: number;
  failureMode?: FailureMode;
  synthesizedAgent?: any;
  healingResult?: SelfHealingResult;
  healingTargets?: number;
  retryCount?: number;
  error?: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * Self-healing result
 */
export interface SelfHealingResult {
  success: boolean;
  method: string;
  healingTime: number;
  details: string;
  [key: string]: any;
}

/**
 * Configuration state
 */
export interface ConfigurationState {
  valid: boolean;
  corrupted: boolean;
  loaded: boolean;
  configPath?: string;
  backupPath?: string;
  templateUsed?: string;
  emergencyMode?: boolean;
  [key: string]: any;
}

/**
 * Orchestration request
 */
export interface OrchestrationRequest {
  id: string;
  task?: string;
  prompt?: string;
  model?: ModelType;
  priority?: PriorityLevel;
  timeout?: number;
  maxRetries?: number;
  options?: OrchestratorOptions;
  context?: any;
  [key: string]: any;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  result: any;
  executionTime: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    network: number;
  };
  [key: string]: any;
}

/**
 * Ultra-resilient configuration
 */
export interface UltraResilientConfig {
  maxRecoveryTime: number;
  maxRecoveryAttempts: number;
  emergencyModeEnabled: boolean;
  selfHealingEnabled: boolean;
  performanceOverheadLimit: number;
  zeroToleranceMode: boolean;
  [key: string]: any;
}

// =============================================================================
// AGENT TASK TYPES
// =============================================================================

/**
 * Agent task for progress tracking
 * Extends base Task with progress-specific properties
 */
export interface AgentTask {
  id: string;
  agentExpertFile: string;
  model: ModelType;
  level: 1 | 2 | 3;
  description?: string;
  status?: TaskStatus;
  dependencies?: string[];
  estimatedTime?: number;
  estimatedCost?: number;
  priority?: PriorityLevel;
  [key: string]: any;
}
