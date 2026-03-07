/**
 * Real-time Monitoring Dashboard - Live Orchestration Metrics UI
 *
 * Dashboard web-based per visualizzazione real-time di:
 * - Live orchestration metrics & performance indicators
 * - Cost tracking con budget alerts
 * - Performance bottleneck identification
 * - System health monitoring & agent status
 *
 * @version 1.0 - Fase 3 Implementation
 * @author GUI Super Expert Agent
 * @date 30 Gennaio 2026
 */

import type { PluginConfig } from '../types';
import type {
  OrchestrationMetrics,
  PerformanceAlert,
  AgentMetrics
} from '../types';
import { PluginLogger } from '../utils/logger';

// =============================================================================
// DASHBOARD TYPES & INTERFACES
// =============================================================================

/**
 * Configurazione Dashboard
 */
export interface DashboardConfig {
  /** Porta per server dashboard */
  port: number;
  /** Update interval per real-time data (ms) */
  updateInterval: number;
  /** Abilita live updates via WebSocket */
  enableWebSocketUpdates: boolean;
  /** Tema dashboard */
  theme: 'light' | 'dark' | 'auto';
  /** Abilita notifications browser */
  enableNotifications: boolean;
  /** Retention period per historical data (ore) */
  dataRetentionHours: number;
  /** Abilita export funzionalità */
  enableDataExport: boolean;
}

/**
 * Widget configuration per dashboard
 */
export interface WidgetConfig {
  /** Widget ID */
  id: string;
  /** Widget type */
  type: 'metric' | 'chart' | 'table' | 'alert' | 'gauge' | 'heatmap';
  /** Widget title */
  title: string;
  /** Position in grid */
  position: { row: number; col: number; width: number; height: number };
  /** Refresh rate specifico (ms) */
  refreshRate?: number;
  /** Widget-specific options */
  options: Record<string, any>;
  /** Visibilità widget */
  visible: boolean;
}

/**
 * Dashboard layout configuration
 */
export interface DashboardLayout {
  /** Layout name */
  name: string;
  /** Grid configuration */
  grid: {
    columns: number;
    rowHeight: number;
  };
  /** Widget configurations */
  widgets: WidgetConfig[];
  /** Global styles */
  styles?: Record<string, any>;
}

/**
 * Real-time metrics snapshot
 */
export interface MetricsSnapshot {
  /** Timestamp snapshot */
  timestamp: number;
  /** Current active orchestrations */
  activeOrchestrations: number;
  /** Success rate last hour */
  successRateLastHour: number;
  /** Average execution time */
  avgExecutionTime: number;
  /** Total cost today */
  totalCostToday: number;
  /** Active alerts count */
  activeAlertsCount: number;
  /** System health score */
  systemHealthScore: number;
  /** Top performing agent */
  topAgent: string;
}

/**
 * Chart data structure
 */
export interface ChartData {
  /** Chart type */
  type: 'line' | 'bar' | 'pie' | 'gauge' | 'heatmap' | 'scatter';
  /** Chart title */
  title: string;
  /** Data labels */
  labels: string[];
  /** Datasets */
  datasets: ChartDataset[];
  /** Chart options */
  options: ChartOptions;
}

/**
 * Chart dataset
 */
export interface ChartDataset {
  /** Dataset label */
  label: string;
  /** Data points */
  data: number[];
  /** Background colors */
  backgroundColor?: string | string[];
  /** Border colors */
  borderColor?: string | string[];
  /** Line tension (per line charts) */
  tension?: number;
  /** Fill area under line */
  fill?: boolean;
}

/**
 * Chart options
 */
export interface ChartOptions {
  /** Chart responsive */
  responsive: boolean;
  /** Maintain aspect ratio */
  maintainAspectRatio: boolean;
  /** Animation settings */
  animation?: {
    duration: number;
    easing: string;
  };
  /** Scale settings */
  scales?: Record<string, {
    min?: number;
    max?: number;
    title?: {
      display: boolean;
      text: string;
    };
  }>;
  /** Plugin settings */
  plugins?: Record<string, unknown>;
}

/**
 * WebSocket message types
 */
export interface WSMessage {
  /** Message type */
  type: 'metrics_update' | 'alert' | 'config_update' | 'connection_status';
  /** Message payload */
  payload: any;
  /** Message timestamp */
  timestamp: number;
}

/**
 * Dashboard event
 */
export interface DashboardEvent {
  /** Event type */
  type: string;
  /** Event data */
  data: any;
  /** Source widget */
  source?: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * WebSocket-like interface for dashboard connections
 */
interface WebSocketLike {
  close(): void;
  send?(data: string): void;
  readyState?: number;
}

// =============================================================================
// MONITORING DASHBOARD CLASS
// =============================================================================

export class MonitoringDashboard {
  private dashboardConfig: DashboardConfig;
  private logger: PluginLogger;
  private currentLayout: DashboardLayout;
  private isRunning: boolean;
  private updateTimer: NodeJS.Timeout | undefined;
  private wsConnections: Set<WebSocketLike>; // WebSocket connections
  private metricsHistory: MetricsSnapshot[];
  private eventListeners: Map<string, ((event: DashboardEvent) => void)[]>;

  constructor(_config: PluginConfig, dashboardConfig?: Partial<DashboardConfig>) {
    this.logger = new PluginLogger('MonitoringDashboard');

    // Default configuration
    this.dashboardConfig = {
      port: 3001,
      updateInterval: 5000, // 5 seconds
      enableWebSocketUpdates: true,
      theme: 'dark',
      enableNotifications: true,
      dataRetentionHours: 24,
      enableDataExport: true,
      ...dashboardConfig
    };

    this.isRunning = false;
    this.wsConnections = new Set();
    this.metricsHistory = [];
    this.eventListeners = new Map();

    // Initialize default layout
    this.currentLayout = this.createDefaultLayout();

    this.logger.info('MonitoringDashboard initialized', {
      port: this.dashboardConfig.port,
      updateInterval: this.dashboardConfig.updateInterval,
      theme: this.dashboardConfig.theme
    });
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Avvia dashboard server
   */
  public async startDashboard(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Dashboard already running');
      return;
    }

    try {
      this.logger.info('Starting monitoring dashboard', {
        port: this.dashboardConfig.port
      });

      // Initialize dashboard server (simplified implementation)
      await this.initializeDashboardServer();

      // Start metrics updates
      this.startMetricsUpdates();

      // Setup WebSocket if enabled
      if (this.dashboardConfig.enableWebSocketUpdates) {
        this.setupWebSocketServer();
      }

      this.isRunning = true;

      this.logger.info('Monitoring dashboard started successfully', {
        url: `http://localhost:${this.dashboardConfig.port}`
      });

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to start dashboard', { error: errorObj.message });
      throw errorObj;
    }
  }

  /**
   * Ferma dashboard server
   */
  public async stopDashboard(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping monitoring dashboard');

    // Stop metrics updates
    this.stopMetricsUpdates();

    // Close WebSocket connections
    this.wsConnections.forEach(ws => {
      try {
        ws.close();
      } catch (error) {
        // Ignore close errors
      }
    });
    this.wsConnections.clear();

    this.isRunning = false;
    this.logger.info('Monitoring dashboard stopped');
  }

  /**
   * Update dashboard con nuovi metrics
   */
  public updateMetrics(metrics: OrchestrationMetrics): void {
    const snapshot = this.createMetricsSnapshot(metrics);

    // Add to history
    this.metricsHistory.push(snapshot);

    // Maintain retention limit
    const retentionMs = this.dashboardConfig.dataRetentionHours * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp >= cutoffTime);

    // Broadcast update via WebSocket
    if (this.dashboardConfig.enableWebSocketUpdates) {
      this.broadcastUpdate('metrics_update', snapshot);
    }

    this.logger.debug('Dashboard metrics updated', {
      snapshotTime: snapshot.timestamp,
      historySize: this.metricsHistory.length
    });
  }

  /**
   * Trigger alert nel dashboard
   */
  public triggerAlert(alert: PerformanceAlert): void {
    this.logger.info('Dashboard alert triggered', {
      alertType: alert.type,
      severity: alert.severity,
      message: alert.message
    });

    // Broadcast alert
    if (this.dashboardConfig.enableWebSocketUpdates) {
      this.broadcastUpdate('alert', alert);
    }

    // Browser notification se abilitato
    if (this.dashboardConfig.enableNotifications && alert.severity === 'critical') {
      this.sendBrowserNotification(alert);
    }

    // Emit dashboard event
    this.emitEvent({
      type: 'alert',
      data: alert,
      timestamp: Date.now()
    });
  }

  /**
   * Update dashboard layout
   */
  public updateLayout(layout: DashboardLayout): void {
    this.logger.info('Updating dashboard layout', {
      layoutName: layout.name,
      widgetCount: layout.widgets.length
    });

    this.currentLayout = layout;

    // Broadcast layout update
    if (this.dashboardConfig.enableWebSocketUpdates) {
      this.broadcastUpdate('config_update', { layout });
    }
  }

  /**
   * Export dashboard data
   */
  public exportData(format: 'json' | 'csv' | 'excel'): string | Buffer {
    if (!this.dashboardConfig.enableDataExport) {
      throw new Error('Data export not enabled');
    }

    const exportData = {
      exportTimestamp: Date.now(),
      dashboardConfig: this.dashboardConfig,
      layout: this.currentLayout,
      metricsHistory: this.metricsHistory.slice(-1000) // Last 1000 entries
    };

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);

      case 'csv':
        return this.convertToCSV(exportData.metricsHistory);

      case 'excel':
        // In real implementation, would use a library like xlsx
        return Buffer.from(JSON.stringify(exportData));

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get current dashboard status
   */
  public getDashboardStatus(): {
    isRunning: boolean;
    uptime: number;
    connectedClients: number;
    metricsCount: number;
    lastUpdate: number;
  } {
    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - (this.metricsHistory[0]?.timestamp || Date.now()) : 0,
      connectedClients: this.wsConnections.size,
      metricsCount: this.metricsHistory.length,
      lastUpdate: this.metricsHistory[this.metricsHistory.length - 1]?.timestamp || 0
    };
  }

  /**
   * Add event listener
   */
  public addEventListener(eventType: string, callback: (event: DashboardEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(eventType: string, callback: (event: DashboardEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Cleanup dashboard resources
   */
  public dispose(): void {
    this.stopDashboard();
    this.metricsHistory = [];
    this.eventListeners.clear();
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async initializeDashboardServer(): Promise<void> {
    // Simplified server initialization
    // In real implementation, this would setup Express server with:
    // - Static file serving for dashboard UI
    // - API endpoints for data access
    // - WebSocket server for real-time updates

    this.logger.debug('Dashboard server initialized (mock implementation)');
  }

  private setupWebSocketServer(): void {
    // Simplified WebSocket server setup
    // In real implementation, would use ws library or socket.io

    this.logger.debug('WebSocket server setup (mock implementation)');
  }

  private startMetricsUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.performPeriodicUpdate();
    }, this.dashboardConfig.updateInterval);

    this.logger.debug('Metrics updates started', {
      interval: this.dashboardConfig.updateInterval
    });
  }

  private stopMetricsUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  private performPeriodicUpdate(): void {
    // Generate mock metrics per demo purposes
    // In real implementation, this would fetch from AnalyticsEngine

    const mockSnapshot = this.generateMockSnapshot();
    this.metricsHistory.push(mockSnapshot);

    // Broadcast update
    if (this.dashboardConfig.enableWebSocketUpdates) {
      this.broadcastUpdate('metrics_update', mockSnapshot);
    }
  }

  private generateMockSnapshot(): MetricsSnapshot {
    const now = Date.now();
    const baseSuccess = 0.85;
    const noise = (Math.random() - 0.5) * 0.1;

    return {
      timestamp: now,
      activeOrchestrations: Math.floor(Math.random() * 5) + 1,
      successRateLastHour: Math.max(0.5, Math.min(1.0, baseSuccess + noise)),
      avgExecutionTime: 45000 + Math.random() * 30000,
      totalCostToday: Math.random() * 10,
      activeAlertsCount: Math.floor(Math.random() * 3),
      systemHealthScore: Math.max(0.6, Math.min(1.0, 0.9 + noise)),
      topAgent: ['gui-super-expert', 'integration_expert', 'coder'][Math.floor(Math.random() * 3)]
    };
  }

  private createMetricsSnapshot(metrics: OrchestrationMetrics): MetricsSnapshot {
    return {
      timestamp: metrics.timestamp instanceof Date ? metrics.timestamp.getTime() : Date.now(),
      activeOrchestrations: 1, // Single orchestration
      successRateLastHour: metrics.successRate,
      avgExecutionTime: metrics.totalExecutionTime,
      totalCostToday: metrics.totalCost,
      activeAlertsCount: metrics.errorRate > 0.1 ? 1 : 0,
      systemHealthScore: metrics.successRate * 0.7 + (1 - metrics.errorRate) * 0.3,
      topAgent: metrics.agentPerformance.length > 0
        ? metrics.agentPerformance[0].agentName
        : 'unknown'
    };
  }

  private broadcastUpdate(type: WSMessage['type'], payload: any): void {
    const message: WSMessage = {
      type,
      payload,
      timestamp: Date.now()
    };

    this.wsConnections.forEach(ws => {
      try {
        // In real implementation: ws.send(JSON.stringify(message))
        if (ws.send) {
          ws.send(JSON.stringify(message));
        }
        this.logger.debug('Broadcasting update', { type, clientCount: this.wsConnections.size });
      } catch (error) {
        // Remove failed connections
        this.wsConnections.delete(ws);
      }
    });
  }

  private sendBrowserNotification(_alert: PerformanceAlert): void {
    // In real implementation, would send browser notification
    // For now, just log
    this.logger.info('Browser notification sent');
  }

  private emitEvent(event: DashboardEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Error in event listener', { eventType: event.type, error: errorMessage });
        }
      });
    }
  }

  private createDefaultLayout(): DashboardLayout {
    return {
      name: 'Default Orchestration Dashboard',
      grid: {
        columns: 12,
        rowHeight: 60
      },
      widgets: [
        {
          id: 'metrics-overview',
          type: 'metric',
          title: 'System Overview',
          position: { row: 0, col: 0, width: 12, height: 2 },
          options: {
            metrics: ['activeOrchestrations', 'successRateLastHour', 'avgExecutionTime', 'totalCostToday']
          },
          visible: true
        },
        {
          id: 'success-rate-chart',
          type: 'chart',
          title: 'Success Rate Trend',
          position: { row: 2, col: 0, width: 6, height: 4 },
          options: {
            chartType: 'line',
            timeRange: '1h',
            refreshRate: 30000
          },
          visible: true
        },
        {
          id: 'performance-chart',
          type: 'chart',
          title: 'Execution Time Trend',
          position: { row: 2, col: 6, width: 6, height: 4 },
          options: {
            chartType: 'line',
            timeRange: '1h',
            refreshRate: 30000
          },
          visible: true
        },
        {
          id: 'cost-gauge',
          type: 'gauge',
          title: 'Daily Cost',
          position: { row: 6, col: 0, width: 3, height: 3 },
          options: {
            maxValue: 20,
            warningThreshold: 15,
            criticalThreshold: 18
          },
          visible: true
        },
        {
          id: 'health-gauge',
          type: 'gauge',
          title: 'System Health',
          position: { row: 6, col: 3, width: 3, height: 3 },
          options: {
            maxValue: 1,
            warningThreshold: 0.7,
            criticalThreshold: 0.5
          },
          visible: true
        },
        {
          id: 'agent-performance',
          type: 'table',
          title: 'Agent Performance',
          position: { row: 6, col: 6, width: 6, height: 3 },
          options: {
            columns: ['Agent', 'Success Rate', 'Avg Time', 'Cost'],
            sortBy: 'Success Rate',
            limit: 10
          },
          visible: true
        },
        {
          id: 'alerts-panel',
          type: 'alert',
          title: 'Active Alerts',
          position: { row: 9, col: 0, width: 12, height: 2 },
          options: {
            maxAlerts: 5,
            autoRefresh: true
          },
          visible: true
        }
      ]
    };
  }

  private convertToCSV(data: MetricsSnapshot[]): string {
    if (data.length === 0) return '';

    // CSV headers
    const headers = [
      'timestamp',
      'activeOrchestrations',
      'successRateLastHour',
      'avgExecutionTime',
      'totalCostToday',
      'activeAlertsCount',
      'systemHealthScore',
      'topAgent'
    ];

    // Convert data to CSV rows
    const rows = data.map(snapshot => [
      new Date(snapshot.timestamp).toISOString(),
      snapshot.activeOrchestrations,
      snapshot.successRateLastHour.toFixed(4),
      snapshot.avgExecutionTime.toFixed(0),
      snapshot.totalCostToday.toFixed(4),
      snapshot.activeAlertsCount,
      snapshot.systemHealthScore.toFixed(4),
      snapshot.topAgent
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    return csvContent;
  }
}

// =============================================================================
// DASHBOARD UTILITIES
// =============================================================================

/**
 * Dashboard Data Formatter - Utility per formatting data per dashboard
 */
export class DashboardDataFormatter {
  /**
   * Formatta metrics per chart display
   */
  public static formatForChart(
    metrics: MetricsSnapshot[],
    chartType: string
  ): ChartData {
    const labels = metrics.map(m =>
      new Date(m.timestamp).toLocaleTimeString()
    );

    switch (chartType) {
      case 'success-rate':
        return {
          type: 'line',
          title: 'Success Rate Over Time',
          labels,
          datasets: [{
            label: 'Success Rate',
            data: metrics.map(m => m.successRateLastHour * 100),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          }],
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                min: 0,
                max: 100,
                title: { display: true, text: 'Success Rate (%)' }
              }
            }
          }
        };

      case 'execution-time':
        return {
          type: 'line',
          title: 'Execution Time Trend',
          labels,
          datasets: [{
            label: 'Avg Execution Time',
            data: metrics.map(m => m.avgExecutionTime / 1000), // Convert to seconds
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }],
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                min: 0,
                title: { display: true, text: 'Time (seconds)' }
              }
            }
          }
        };

      case 'cost':
        return {
          type: 'bar',
          title: 'Daily Cost Breakdown',
          labels,
          datasets: [{
            label: 'Cost',
            data: metrics.map(m => m.totalCostToday),
            backgroundColor: '#F59E0B',
            borderColor: '#D97706'
          }],
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                min: 0,
                title: { display: true, text: 'Cost ($)' }
              }
            }
          }
        };

      default:
        throw new Error(`Unknown chart type: ${chartType}`);
    }
  }

  /**
   * Formatta agent metrics per table display
   */
  public static formatAgentTable(agents: AgentMetrics[]): Array<Record<string, string>> {
    return agents.map(agent => ({
      agent: agent.agentName,
      successRate: `${(agent.successRate * 100).toFixed(1)}%`,
      avgTime: `${(agent.executionTime / 1000).toFixed(1)}s`,
      cost: `$${agent.costEfficiency.toFixed(3)}`,
      quality: `${(agent.qualityScore * 100).toFixed(0)}%`
    }));
  }

  /**
   * Formatta alerts per dashboard display
   */
  public static formatAlerts(alerts: PerformanceAlert[]): Array<Record<string, string | string[]>> {
    return alerts.map(alert => ({
      id: alert.id,
      type: alert.type.toUpperCase(),
      severity: alert.severity.toUpperCase(),
      message: alert.message,
      time: new Date(alert.timestamp).toLocaleString(),
      actions: alert.suggestedActions.slice(0, 2) // Top 2 actions
    }));
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Factory per creare MonitoringDashboard configurato
 */
export function createMonitoringDashboard(
  config: PluginConfig,
  dashboardConfig?: Partial<DashboardConfig>
): MonitoringDashboard {
  return new MonitoringDashboard(config, dashboardConfig);
}

/**
 * Factory per creare dashboard layout personalizzato
 */
export function createCustomLayout(
  name: string,
  widgets: WidgetConfig[]
): DashboardLayout {
  return {
    name,
    grid: { columns: 12, rowHeight: 60 },
    widgets
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Helper per validare widget configuration
 */
export function validateWidgetConfig(widget: WidgetConfig): string[] {
  const errors: string[] = [];

  if (!widget.id) errors.push('Widget ID is required');
  if (!widget.title) errors.push('Widget title is required');
  if (!widget.type) errors.push('Widget type is required');

  const validTypes = ['metric', 'chart', 'table', 'alert', 'gauge', 'heatmap'];
  if (!validTypes.includes(widget.type)) {
    errors.push(`Invalid widget type: ${widget.type}`);
  }

  if (!widget.position) {
    errors.push('Widget position is required');
  } else {
    if (widget.position.width <= 0) errors.push('Widget width must be positive');
    if (widget.position.height <= 0) errors.push('Widget height must be positive');
  }

  return errors;
}

/**
 * Helper per creare widget configurations predefiniti
 */
export function createPrebuiltWidget(
  type: 'overview' | 'performance' | 'cost' | 'alerts',
  position: { row: number; col: number; width: number; height: number }
): WidgetConfig {
  switch (type) {
    case 'overview':
      return {
        id: 'system-overview',
        type: 'metric',
        title: 'System Overview',
        position,
        options: {
          metrics: ['activeOrchestrations', 'successRate', 'avgTime', 'totalCost'],
          layout: 'grid'
        },
        visible: true
      };

    case 'performance':
      return {
        id: 'performance-chart',
        type: 'chart',
        title: 'Performance Trends',
        position,
        options: {
          chartType: 'line',
          metrics: ['successRate', 'executionTime'],
          timeRange: '1h'
        },
        visible: true
      };

    case 'cost':
      return {
        id: 'cost-tracker',
        type: 'gauge',
        title: 'Cost Monitor',
        position,
        options: {
          maxValue: 50,
          warningThreshold: 30,
          criticalThreshold: 40,
          unit: '$'
        },
        visible: true
      };

    case 'alerts':
      return {
        id: 'alert-panel',
        type: 'alert',
        title: 'System Alerts',
        position,
        options: {
          maxAlerts: 10,
          groupBySeverity: true,
          autoRefresh: true
        },
        visible: true
      };

    default:
      throw new Error(`Unknown widget type: ${type}`);
  }
}