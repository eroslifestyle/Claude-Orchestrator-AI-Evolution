/**
 * Progress Visualization System for Claude Code Orchestrator Plugin
 *
 * Provides real-time progress bars, visual dependency graphs,
 * and live metrics dashboard integration for orchestration tasks.
 *
 * @version 1.0.0
 * @author Development Team
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { performance } from 'perf_hooks';
import * as path from 'path';

import { PluginLogger } from '../utils/logger';
import type {
  ExecutionPlan,
  TaskResult,
  TaskStatus,
  OrchestrationMetrics,
  ProgressUpdate,
  DependencyGraph,
  VisualizationConfig,
  LiveMetrics,
  Task
} from '../types';

/**
 * Visual Progress Bar Component
 */
class ProgressBar {
  private width: number;
  private current: number;
  private total: number;
  private label: string;
  private startTime: number;

  constructor(total: number, label: string, width: number = 40) {
    this.width = width;
    this.current = 0;
    this.total = total;
    this.label = label;
    this.startTime = performance.now();
  }

  update(current: number, customLabel?: string): string {
    this.current = Math.min(current, this.total);
    const percentage = (this.current / this.total) * 100;
    const filled = Math.round((this.width * this.current) / this.total);
    const empty = this.width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const displayLabel = customLabel || this.label;

    const elapsed = (performance.now() - this.startTime) / 1000;
    const eta = this.current > 0 ? ((elapsed / this.current) * (this.total - this.current)) : 0;

    return `${chalk.cyan(displayLabel)} [${chalk.green(bar)}] ${chalk.yellow(`${percentage.toFixed(1)}%`)} (${this.current}/${this.total}) ETA: ${this.formatTime(eta)}`;
  }

  complete(): string {
    const elapsed = (performance.now() - this.startTime) / 1000;
    return `${chalk.green('✓')} ${this.label} ${chalk.gray(`completed in ${this.formatTime(elapsed)}`)}`;
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }
}

/**
 * Dependency Graph Visualizer
 */
class DependencyGraphRenderer {
  private graph: DependencyGraph;
  private completed: Set<string>;
  private inProgress: Set<string>;
  private failed: Set<string>;

  constructor(plan: ExecutionPlan) {
    this.graph = this.buildDependencyGraph(plan);
    this.completed = new Set();
    this.inProgress = new Set();
    this.failed = new Set();
  }

  private buildDependencyGraph(plan: ExecutionPlan): DependencyGraph {
    const nodes = plan.tasks; // Use tasks directly as they already match Task interface

    const edges = plan.tasks.flatMap(task =>
      task.dependencies.map(depId => ({
        from: depId,
        to: task.id,
        type: 'required' as const,
        reason: 'dependency'
      }))
    );

    return {
      nodes,
      edges,
      cycles: [],
      criticalPath: plan.tasks.map(t => t.id),
      maxParallelism: plan.tasks.length
    };
  }

  updateStatus(taskId: string, status: TaskStatus): void {
    // Remove from all sets first
    this.completed.delete(taskId);
    this.inProgress.delete(taskId);
    this.failed.delete(taskId);

    // Add to appropriate set
    switch (status) {
      case 'completed':
        this.completed.add(taskId);
        break;
      case 'running':
        this.inProgress.add(taskId);
        break;
      case 'failed':
        this.failed.add(taskId);
        break;
      case 'pending':
      case 'escalated':
        // Don't add to any set
        break;
    }
  }

  render(): string {
    let output = chalk.bold.cyan('\n🔗 DEPENDENCY GRAPH\n');
    output += chalk.gray('─'.repeat(60)) + '\n';

    // Sort nodes by dependencies (topological-ish)
    const sortedNodes = this.topologicalSort();

    for (const node of sortedNodes) {
      const status = this.getNodeStatus(node.id);
      const statusIcon = this.getStatusIcon(status);
      const statusColor = this.getStatusColor(status);

      // Node line
      const label = node.description.slice(0, 20);
      output += `${statusIcon} ${statusColor(`T${this.getTaskIndex(node.id)} ${label}`)}`;
      output += ` ${chalk.gray(`[${node.model}]`)}`;
      output += ` ${chalk.yellow(`${node.estimatedTime}m`)}`;

      // Dependencies
      if (node.dependencies.length > 0) {
        const depNames = node.dependencies
          .map(depId => `T${this.getTaskIndex(depId)}`)
          .join(', ');
        output += ` ${chalk.gray(`← depends on: ${depNames}`)}`;
      }

      output += '\n';

      // Visual connection lines for dependencies
      if (node.dependencies.length > 0) {
        for (let i = 0; i < node.dependencies.length; i++) {
          const isLast = i === node.dependencies.length - 1;
          const connector = isLast ? '└─' : '├─';
          const depId = node.dependencies[i];
          const depStatus = this.getNodeStatus(depId);
          const depIcon = this.getStatusIcon(depStatus);
          output += `    ${chalk.gray(connector)} ${depIcon} T${this.getTaskIndex(depId)}\n`;
        }
      }

      output += '\n';
    }

    // Legend
    output += this.renderLegend();

    return output;
  }

  private topologicalSort(): typeof this.graph.nodes {
    const sorted = [...this.graph.nodes];

    // Simple sort by dependency count (nodes with fewer deps first)
    sorted.sort((a, b) => a.dependencies.length - b.dependencies.length);

    return sorted;
  }

  private getNodeStatus(nodeId: string): TaskStatus {
    if (this.completed.has(nodeId)) return 'completed';
    if (this.inProgress.has(nodeId)) return 'running';
    if (this.failed.has(nodeId)) return 'failed';
    return 'pending';
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return chalk.green('✓');
      case 'in_progress': return chalk.yellow('⏳');
      case 'failed': return chalk.red('✗');
      default: return chalk.gray('○');
    }
  }

  private getStatusColor(status: string): (text: string) => string {
    switch (status) {
      case 'completed': return chalk.green;
      case 'in_progress': return chalk.yellow;
      case 'failed': return chalk.red;
      default: return chalk.gray;
    }
  }

  private getTaskIndex(taskId: string): number {
    return this.graph.nodes.findIndex(node => node.id === taskId) + 1;
  }

  private renderLegend(): string {
    return chalk.gray(`
Legend: ${chalk.green('✓ Completed')} ${chalk.yellow('⏳ In Progress')} ${chalk.red('✗ Failed')} ${chalk.gray('○ Pending')}
`);
  }
}

/**
 * Live Metrics Dashboard
 */
class LiveMetricsDashboard {
  private startTime: number;
  private metrics: LiveMetrics;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startTime = performance.now();
    this.metrics = {
      totalTime: 0,
      totalCost: 0,
      completedTasks: 0,
      totalTasks: 0,
      averageTaskTime: 0,
      costPerTask: 0,
      modelUsage: {},
      throughput: 0,
      errorRate: 0
    };
  }

  start(): void {
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
      this.render();
    }, 1000);
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  updateTaskMetrics(result: TaskResult): void {
    this.metrics.completedTasks += 1;
    this.metrics.totalCost += result.cost || 0;

    if (result.model) {
      this.metrics.modelUsage[result.model] =
        (this.metrics.modelUsage[result.model] || 0) + 1;
    }

    // Update derived metrics
    this.updateDerivedMetrics();
  }

  setTotalTasks(count: number): void {
    this.metrics.totalTasks = count;
  }

  private updateMetrics(): void {
    this.metrics.totalTime = (performance.now() - this.startTime) / 1000;
    this.updateDerivedMetrics();
  }

  private updateDerivedMetrics(): void {
    if (this.metrics.completedTasks > 0) {
      this.metrics.averageTaskTime = this.metrics.totalTime / this.metrics.completedTasks;
      this.metrics.costPerTask = this.metrics.totalCost / this.metrics.completedTasks;
      this.metrics.throughput = this.metrics.completedTasks / (this.metrics.totalTime / 60); // tasks per minute
    }
  }

  private render(): void {
    // Clear previous dashboard (move cursor up and clear)
    process.stdout.write('\x1b[9A\x1b[2K');

    console.log(chalk.bold.cyan('📊 LIVE METRICS DASHBOARD'));
    console.log(chalk.gray('─'.repeat(50)));

    const progress = this.metrics.totalTasks > 0
      ? (this.metrics.completedTasks / this.metrics.totalTasks) * 100
      : 0;

    console.log(`Progress: ${chalk.yellow(`${progress.toFixed(1)}%`)} (${this.metrics.completedTasks}/${this.metrics.totalTasks})`);
    console.log(`Time: ${chalk.cyan(this.formatTime(this.metrics.totalTime))}`);
    console.log(`Cost: ${chalk.green(`$${this.metrics.totalCost.toFixed(3)}`)}`);
    console.log(`Throughput: ${chalk.magenta(`${this.metrics.throughput.toFixed(1)} tasks/min`)}`);

    if (this.metrics.completedTasks > 0) {
      console.log(`Avg Time/Task: ${chalk.blue(`${this.metrics.averageTaskTime.toFixed(1)}s`)}`);
      console.log(`Cost/Task: ${chalk.green(`$${this.metrics.costPerTask.toFixed(3)}`)}`);
    }

    // Model usage
    const modelStats = Object.entries(this.metrics.modelUsage)
      .map(([model, count]) => `${model}: ${count}`)
      .join(' | ');
    console.log(`Models: ${chalk.gray(modelStats || 'None')}`);
    console.log(''); // Extra line for spacing
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }

  getSnapshot(): LiveMetrics {
    return { ...this.metrics };
  }
}

/**
 * Main Progress Visualization System
 */
export class ProgressVisualization {
  private readonly logger: PluginLogger;
  private config: VisualizationConfig;

  private progressBars: Map<string, ProgressBar> = new Map();
  private dependencyRenderer: DependencyGraphRenderer | null = null;
  private liveDashboard: LiveMetricsDashboard | null = null;
  private currentSpinner: Ora | null = null;

  private isVerbose: boolean = false;
  private isRealTime: boolean = false;

  constructor(config: Partial<VisualizationConfig> = {}) {
    this.logger = new PluginLogger('ProgressVisualization');

    this.config = {
      showProgressBars: true,
      showDependencyGraph: true,
      showLiveMetrics: true,
      updateInterval: 1000,
      enableRealTime: true,
      verboseMode: false,
      ...config
    };

    this.isVerbose = this.config.verboseMode;
    this.isRealTime = this.config.enableRealTime;

    this.logger.info('Progress Visualization System initialized', { config: this.config });
  }

  /**
   * Initialize visualization for orchestration
   */
  initializeOrchestration(plan: ExecutionPlan): void {
    console.log(chalk.bold.cyan('\n🎯 ORCHESTRATION VISUALIZATION INITIALIZED\n'));

    // Initialize dependency graph
    if (this.config.showDependencyGraph) {
      this.dependencyRenderer = new DependencyGraphRenderer(plan);
      console.log(this.dependencyRenderer.render());
    }

    // Initialize live metrics dashboard
    if (this.config.showLiveMetrics && this.isRealTime) {
      this.liveDashboard = new LiveMetricsDashboard();
      this.liveDashboard.setTotalTasks(plan.tasks.length);
      this.liveDashboard.start();
    }

    // Initialize progress bars for each task
    if (this.config.showProgressBars) {
      for (let i = 0; i < plan.tasks.length; i++) {
        const task = plan.tasks[i];
        const label = `T${i + 1}: ${task.description.slice(0, 25)}`;
        this.progressBars.set(task.id, new ProgressBar(1, label));
      }
    }

    console.log(chalk.gray('\n' + '═'.repeat(60) + '\n'));
  }

  /**
   * Update task progress
   */
  updateTaskProgress(update: ProgressUpdate): void {
    const { taskId, status, progress, currentOperation } = update;

    // Update dependency graph
    if (this.dependencyRenderer) {
      this.dependencyRenderer.updateStatus(taskId, status);
    }

    // Update progress bar
    if (this.progressBars.has(taskId)) {
      const bar = this.progressBars.get(taskId)!;

      if (status === 'completed') {
        console.log(bar.complete());
      } else {
        const progressValue = progress !== undefined ? progress : 0;
        const label = currentOperation || `Progress: ${progressValue}%`;
        console.log(bar.update(progressValue, label));
      }
    }

    // Show detailed progress in verbose mode
    if (this.isVerbose) {
      const timestamp = new Date().toLocaleTimeString();
      const statusIcon = this.getStatusIcon(status);
      console.log(chalk.gray(`[${timestamp}]`) + ` ${statusIcon} Task ${taskId}: ${currentOperation || status}`);
    }

    // Update live dashboard metrics
    if (this.liveDashboard && status === 'completed') {
      this.liveDashboard.updateTaskMetrics({
        taskId,
        agentId: 'unknown',
        status: status,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        tokensUsed: 1000,
        cost: 0.01,
        model: 'sonnet',
        escalations: [],
        description: taskId,
        agentFile: '',
        metadata: undefined,
        warnings: []
      } as TaskResult);
    }
  }

  /**
   * Update orchestration progress
   */
  updateOrchestrationProgress(
    completedTasks: number,
    totalTasks: number,
    currentPhase: string,
    currentTask?: string
  ): void {
    // Update main orchestration spinner
    if (this.currentSpinner) {
      const percentage = Math.round((completedTasks / totalTasks) * 100);
      const text = currentTask
        ? `${currentPhase}: ${currentTask} (${completedTasks}/${totalTasks} - ${percentage}%)`
        : `${currentPhase} (${completedTasks}/${totalTasks} - ${percentage}%)`;

      this.currentSpinner.text = text;
    }

    // Update overall progress bar
    if (this.config.showProgressBars && !this.progressBars.has('_overall')) {
      const overallBar = new ProgressBar(totalTasks, 'Overall Progress');
      this.progressBars.set('_overall', overallBar);
    }

    if (this.progressBars.has('_overall')) {
      const bar = this.progressBars.get('_overall')!;
      console.log(bar.update(completedTasks, `${currentPhase}`));
    }
  }

  /**
   * Start orchestration spinner
   */
  startOrchestrationSpinner(message: string): void {
    this.currentSpinner = ora({
      text: message,
      spinner: 'dots',
      interval: 100
    }).start();
  }

  /**
   * Stop orchestration spinner
   */
  stopOrchestrationSpinner(success: boolean, message?: string): void {
    if (this.currentSpinner) {
      if (success) {
        this.currentSpinner.succeed(message || 'Orchestration completed');
      } else {
        this.currentSpinner.fail(message || 'Orchestration failed');
      }
      this.currentSpinner = null;
    }
  }

  /**
   * Show dependency graph update
   */
  showDependencyGraphUpdate(): void {
    if (this.dependencyRenderer && this.config.showDependencyGraph) {
      console.clear();
      console.log(this.dependencyRenderer.render());
    }
  }

  /**
   * Display final summary
   */
  displayFinalSummary(metrics: OrchestrationMetrics): void {
    console.log(chalk.bold.cyan('\n🏁 ORCHESTRATION COMPLETE - FINAL SUMMARY\n'));
    console.log(chalk.gray('═'.repeat(60)));

    // Stop live dashboard
    if (this.liveDashboard) {
      this.liveDashboard.stop();
    }

    // Overall statistics
    const duration = metrics.totalTime / 1000 / 60; // Convert to minutes
    console.log(`✨ ${chalk.green('Success!')} Orchestration completed in ${chalk.cyan(`${duration.toFixed(1)} minutes`)}`);
    console.log(`💰 Total Cost: ${chalk.green(`$${metrics.totalCost.toFixed(3)}`)}`);
    console.log(`🔧 Tasks Completed: ${chalk.yellow(`${metrics.successfulTasks}/${metrics.totalTasks}`)}`);

    // Model usage breakdown
    if (Object.keys(metrics.modelUsage).length > 0) {
      console.log('\n📊 Model Usage:');
      for (const [model, tokens] of Object.entries(metrics.modelUsage)) {
        const tokenCount = typeof tokens === 'number' ? tokens : 0;
        const percentage = ((tokenCount / metrics.totalTokens) * 100).toFixed(1);
        console.log(`   ${model}: ${chalk.yellow(`${percentage}%`)} (${tokenCount.toLocaleString()} tokens)`);
      }
    }

    // Performance metrics
    console.log('\n⚡ Performance Metrics:');
    console.log(`   Avg Task Time: ${chalk.blue(`${(metrics.averageTaskTime / 1000).toFixed(1)}s`)}`);
    console.log(`   Throughput: ${chalk.magenta(`${metrics.throughput.toFixed(1)} tasks/min`)}`);
    console.log(`   Success Rate: ${chalk.green(`${(metrics.successRate * 100).toFixed(1)}%`)}`);

    // Show final dependency graph state
    if (this.dependencyRenderer && this.config.showDependencyGraph) {
      console.log(this.dependencyRenderer.render());
    }

    console.log(chalk.gray('═'.repeat(60)));
  }

  /**
   * Export visualization data for analysis
   */
  exportVisualizationData(filePath?: string): string {
    const data = {
      timestamp: new Date().toISOString(),
      config: this.config,
      liveMetrics: this.liveDashboard?.getSnapshot(),
      progressBarsState: Array.from(this.progressBars.keys()),
      dependencyGraph: this.dependencyRenderer ? {
        nodes: this.dependencyRenderer['graph'].nodes,
        edges: this.dependencyRenderer['graph'].edges
      } : null
    };

    const exportPath = filePath || path.join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.claude',
      'orchestrator',
      `visualization-${Date.now()}.json`
    );

    try {
      require('fs').writeFileSync(exportPath, JSON.stringify(data, null, 2));
      this.logger.info('Visualization data exported', { path: exportPath });
      return exportPath;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to export visualization data', { error: errorObj.message });
      throw errorObj;
    }
  }

  /**
   * Configure visualization settings
   */
  configure(newConfig: Partial<VisualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.isVerbose = this.config.verboseMode;
    this.isRealTime = this.config.enableRealTime;

    this.logger.info('Configuration updated', { config: this.config });
  }

  /**
   * Get status icon for task state
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return chalk.green('✓');
      case 'running': return chalk.yellow('⏳');
      case 'in_progress': return chalk.yellow('⏳');
      case 'failed': return chalk.red('✗');
      case 'pending': return chalk.gray('○');
      case 'escalated': return chalk.blue('⊘');
      default: return chalk.gray('?');
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.liveDashboard) {
      this.liveDashboard.stop();
    }

    if (this.currentSpinner) {
      this.currentSpinner.stop();
    }

    this.progressBars.clear();
    this.dependencyRenderer = null;
    this.liveDashboard = null;

    this.logger.info('Progress visualization cleaned up');
  }
}

/**
 * Export Progress Visualization System
 */
export default ProgressVisualization;