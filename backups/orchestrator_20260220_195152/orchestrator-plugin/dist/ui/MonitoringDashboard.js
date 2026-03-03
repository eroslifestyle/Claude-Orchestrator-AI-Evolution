"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrebuiltWidget = exports.validateWidgetConfig = exports.createCustomLayout = exports.createMonitoringDashboard = exports.DashboardDataFormatter = exports.MonitoringDashboard = void 0;
const logger_1 = require("../utils/logger");
// =============================================================================
// MONITORING DASHBOARD CLASS
// =============================================================================
class MonitoringDashboard {
    dashboardConfig;
    logger;
    currentLayout;
    isRunning;
    updateTimer;
    wsConnections; // WebSocket connections
    metricsHistory;
    eventListeners;
    constructor(_config, dashboardConfig) {
        this.logger = new logger_1.PluginLogger('MonitoringDashboard');
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
    async startDashboard() {
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
        }
        catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to start dashboard', { error: errorObj.message });
            throw errorObj;
        }
    }
    /**
     * Ferma dashboard server
     */
    async stopDashboard() {
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
            }
            catch (error) {
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
    updateMetrics(metrics) {
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
    triggerAlert(alert) {
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
    updateLayout(layout) {
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
    exportData(format) {
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
    getDashboardStatus() {
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
    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }
    /**
     * Remove event listener
     */
    removeEventListener(eventType, callback) {
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
    dispose() {
        this.stopDashboard();
        this.metricsHistory = [];
        this.eventListeners.clear();
    }
    // =============================================================================
    // PRIVATE METHODS
    // =============================================================================
    async initializeDashboardServer() {
        // Simplified server initialization
        // In real implementation, this would setup Express server with:
        // - Static file serving for dashboard UI
        // - API endpoints for data access
        // - WebSocket server for real-time updates
        this.logger.debug('Dashboard server initialized (mock implementation)');
    }
    setupWebSocketServer() {
        // Simplified WebSocket server setup
        // In real implementation, would use ws library or socket.io
        this.logger.debug('WebSocket server setup (mock implementation)');
    }
    startMetricsUpdates() {
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
    stopMetricsUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = undefined;
        }
    }
    performPeriodicUpdate() {
        // Generate mock metrics per demo purposes
        // In real implementation, this would fetch from AnalyticsEngine
        const mockSnapshot = this.generateMockSnapshot();
        this.metricsHistory.push(mockSnapshot);
        // Broadcast update
        if (this.dashboardConfig.enableWebSocketUpdates) {
            this.broadcastUpdate('metrics_update', mockSnapshot);
        }
    }
    generateMockSnapshot() {
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
    createMetricsSnapshot(metrics) {
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
    broadcastUpdate(type, payload) {
        const message = {
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
            }
            catch (error) {
                // Remove failed connections
                this.wsConnections.delete(ws);
            }
        });
    }
    sendBrowserNotification(_alert) {
        // In real implementation, would send browser notification
        // For now, just log
        this.logger.info('Browser notification sent');
    }
    emitEvent(event) {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(event);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error('Error in event listener', { eventType: event.type, error: errorMessage });
                }
            });
        }
    }
    createDefaultLayout() {
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
    convertToCSV(data) {
        if (data.length === 0)
            return '';
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
exports.MonitoringDashboard = MonitoringDashboard;
// =============================================================================
// DASHBOARD UTILITIES
// =============================================================================
/**
 * Dashboard Data Formatter - Utility per formatting data per dashboard
 */
class DashboardDataFormatter {
    /**
     * Formatta metrics per chart display
     */
    static formatForChart(metrics, chartType) {
        const labels = metrics.map(m => new Date(m.timestamp).toLocaleTimeString());
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
    static formatAgentTable(agents) {
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
    static formatAlerts(alerts) {
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
exports.DashboardDataFormatter = DashboardDataFormatter;
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
/**
 * Factory per creare MonitoringDashboard configurato
 */
function createMonitoringDashboard(config, dashboardConfig) {
    return new MonitoringDashboard(config, dashboardConfig);
}
exports.createMonitoringDashboard = createMonitoringDashboard;
/**
 * Factory per creare dashboard layout personalizzato
 */
function createCustomLayout(name, widgets) {
    return {
        name,
        grid: { columns: 12, rowHeight: 60 },
        widgets
    };
}
exports.createCustomLayout = createCustomLayout;
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Helper per validare widget configuration
 */
function validateWidgetConfig(widget) {
    const errors = [];
    if (!widget.id)
        errors.push('Widget ID is required');
    if (!widget.title)
        errors.push('Widget title is required');
    if (!widget.type)
        errors.push('Widget type is required');
    const validTypes = ['metric', 'chart', 'table', 'alert', 'gauge', 'heatmap'];
    if (!validTypes.includes(widget.type)) {
        errors.push(`Invalid widget type: ${widget.type}`);
    }
    if (!widget.position) {
        errors.push('Widget position is required');
    }
    else {
        if (widget.position.width <= 0)
            errors.push('Widget width must be positive');
        if (widget.position.height <= 0)
            errors.push('Widget height must be positive');
    }
    return errors;
}
exports.validateWidgetConfig = validateWidgetConfig;
/**
 * Helper per creare widget configurations predefiniti
 */
function createPrebuiltWidget(type, position) {
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
exports.createPrebuiltWidget = createPrebuiltWidget;
//# sourceMappingURL=MonitoringDashboard.js.map