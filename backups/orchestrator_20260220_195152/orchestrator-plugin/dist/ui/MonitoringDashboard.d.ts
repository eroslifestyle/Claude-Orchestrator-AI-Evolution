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
/// <reference types="node" />
/// <reference types="node" />
import type { PluginConfig } from '../types';
import type { OrchestrationMetrics, PerformanceAlert, AgentMetrics } from '../types';
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
    position: {
        row: number;
        col: number;
        width: number;
        height: number;
    };
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
export declare class MonitoringDashboard {
    private dashboardConfig;
    private logger;
    private currentLayout;
    private isRunning;
    private updateTimer;
    private wsConnections;
    private metricsHistory;
    private eventListeners;
    constructor(_config: PluginConfig, dashboardConfig?: Partial<DashboardConfig>);
    /**
     * Avvia dashboard server
     */
    startDashboard(): Promise<void>;
    /**
     * Ferma dashboard server
     */
    stopDashboard(): Promise<void>;
    /**
     * Update dashboard con nuovi metrics
     */
    updateMetrics(metrics: OrchestrationMetrics): void;
    /**
     * Trigger alert nel dashboard
     */
    triggerAlert(alert: PerformanceAlert): void;
    /**
     * Update dashboard layout
     */
    updateLayout(layout: DashboardLayout): void;
    /**
     * Export dashboard data
     */
    exportData(format: 'json' | 'csv' | 'excel'): string | Buffer;
    /**
     * Get current dashboard status
     */
    getDashboardStatus(): {
        isRunning: boolean;
        uptime: number;
        connectedClients: number;
        metricsCount: number;
        lastUpdate: number;
    };
    /**
     * Add event listener
     */
    addEventListener(eventType: string, callback: (event: DashboardEvent) => void): void;
    /**
     * Remove event listener
     */
    removeEventListener(eventType: string, callback: (event: DashboardEvent) => void): void;
    /**
     * Cleanup dashboard resources
     */
    dispose(): void;
    private initializeDashboardServer;
    private setupWebSocketServer;
    private startMetricsUpdates;
    private stopMetricsUpdates;
    private performPeriodicUpdate;
    private generateMockSnapshot;
    private createMetricsSnapshot;
    private broadcastUpdate;
    private sendBrowserNotification;
    private emitEvent;
    private createDefaultLayout;
    private convertToCSV;
}
/**
 * Dashboard Data Formatter - Utility per formatting data per dashboard
 */
export declare class DashboardDataFormatter {
    /**
     * Formatta metrics per chart display
     */
    static formatForChart(metrics: MetricsSnapshot[], chartType: string): ChartData;
    /**
     * Formatta agent metrics per table display
     */
    static formatAgentTable(agents: AgentMetrics[]): Array<Record<string, string>>;
    /**
     * Formatta alerts per dashboard display
     */
    static formatAlerts(alerts: PerformanceAlert[]): Array<Record<string, string | string[]>>;
}
/**
 * Factory per creare MonitoringDashboard configurato
 */
export declare function createMonitoringDashboard(config: PluginConfig, dashboardConfig?: Partial<DashboardConfig>): MonitoringDashboard;
/**
 * Factory per creare dashboard layout personalizzato
 */
export declare function createCustomLayout(name: string, widgets: WidgetConfig[]): DashboardLayout;
/**
 * Helper per validare widget configuration
 */
export declare function validateWidgetConfig(widget: WidgetConfig): string[];
/**
 * Helper per creare widget configurations predefiniti
 */
export declare function createPrebuiltWidget(type: 'overview' | 'performance' | 'cost' | 'alerts', position: {
    row: number;
    col: number;
    width: number;
    height: number;
}): WidgetConfig;
//# sourceMappingURL=MonitoringDashboard.d.ts.map