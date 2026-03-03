/**
 * UnifiedSearchDashboard - Revolutionary Search Interface con Serena Intelligence
 *
 * Implementazione GUI Super Expert per unified search orchestration dashboard
 * con real-time visualization e intelligent search management.
 *
 * @version 1.0 - Unified Search Dashboard (T6)
 * @author GUI Super Expert Agent
 * @date 30 Gennaio 2026
 */
import type { AnalyticsInsight } from '../types';
import { PluginLogger } from '../utils/logger';
import { SerenaSearchIntegration } from '../integrations/SerenaSearchIntegration';
import { EnhancedKeywordExtractor } from '../analysis/EnhancedKeywordExtractor';
import { SmartAgentRouter } from '../routing/SmartAgentRouter';
import { SearchPoweredAnalytics } from '../analytics/SearchPoweredAnalytics';
import { SerenaPerformanceOptimizer } from '../performance/SerenaPerformanceOptimizer';
import type { PerformanceOptimizationResult } from '../performance/SerenaPerformanceOptimizer';
interface DashboardState {
    isActive: boolean;
    currentView: DashboardView;
    searchState: SearchState;
    performanceState: PerformanceState;
    analyticsState: AnalyticsState;
    notifications: DashboardNotification[];
    userPreferences: UserPreferences;
}
type DashboardView = 'overview' | 'search' | 'analytics' | 'performance' | 'settings';
interface SearchState {
    activeSearches: ActiveSearch[];
    searchHistory: SearchHistoryEntry[];
    patterns: SearchPattern[];
    filters: SearchFilters;
    results: SearchResult[];
    isSearching: boolean;
}
interface ActiveSearch {
    searchId: string;
    query: string;
    startTime: Date;
    estimatedDuration: number;
    progress: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    resultCount: number;
    searchType: 'simple' | 'pattern' | 'semantic' | 'batch';
}
interface SearchHistoryEntry {
    timestamp: Date;
    query: string;
    resultCount: number;
    executionTime: number;
    success: boolean;
    searchType: 'simple' | 'pattern' | 'semantic' | 'batch';
}
interface SearchPattern {
    patternId: string;
    name: string;
    description: string;
    pattern: string;
    category: 'code' | 'file' | 'content' | 'semantic';
    usageCount: number;
    successRate: number;
    averageTime: number;
    isFavorite: boolean;
}
interface SearchFilters {
    fileTypes: string[];
    directories: string[];
    dateRange: DateRange;
    complexity: 'low' | 'medium' | 'high' | 'any';
    includeTests: boolean;
    caseInsensitive: boolean;
}
interface DateRange {
    start: Date;
    end: Date;
}
interface SearchResult {
    resultId: string;
    searchId: string;
    filePath: string;
    lineNumber: number;
    content: string;
    context: SearchResultContext;
    relevance: number;
    preview: string;
}
interface SearchResultContext {
    beforeLines: string[];
    afterLines: string[];
    functionName?: string;
    className?: string;
    namespace?: string;
}
interface PerformanceState {
    currentMetrics: CurrentPerformanceMetrics;
    historicalData: HistoricalPerformanceData;
    alerts: DashboardPerformanceAlert[];
    optimizations: OptimizationSuggestion[];
    benchmarks: BenchmarkData[];
    isMonitoring: boolean;
}
interface CurrentPerformanceMetrics {
    searchTime: number;
    cacheHitRate: number;
    throughput: number;
    systemLoad: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
    lastUpdated: Date;
}
interface HistoricalPerformanceData {
    timeRange: string;
    dataPoints: PerformanceDataPoint[];
    trends: PerformanceTrend[];
    anomalies: PerformanceAnomaly[];
}
interface PerformanceDataPoint {
    timestamp: Date;
    searchTime: number;
    throughput: number;
    errorRate: number;
    systemLoad: number;
}
interface PerformanceTrend {
    metric: string;
    direction: 'improving' | 'degrading' | 'stable';
    changeRate: number;
    confidence: number;
    prediction: string;
}
interface PerformanceAnomaly {
    timestamp: Date;
    metric: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
    resolution: string;
}
interface DashboardPerformanceAlert {
    alertId: string;
    timestamp: Date;
    type: 'threshold' | 'anomaly' | 'prediction' | 'degradation';
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    metric: string;
    currentValue: number;
    thresholdValue: number;
    isActive: boolean;
    acknowledgedBy?: string;
}
interface OptimizationSuggestion {
    suggestionId: string;
    category: 'search' | 'system' | 'cache' | 'routing';
    title: string;
    description: string;
    expectedImprovement: number;
    implementationEffort: 'low' | 'medium' | 'high';
    priority: number;
    status: 'pending' | 'applied' | 'dismissed';
    appliedAt?: Date;
}
interface BenchmarkData {
    benchmarkId: string;
    name: string;
    category: 'search' | 'routing' | 'system' | 'integration';
    timestamp: Date;
    results: BenchmarkResult[];
    baseline: BenchmarkBaseline;
    status: 'running' | 'completed' | 'failed';
}
interface BenchmarkResult {
    metric: string;
    value: number;
    unit: string;
    target: number;
    variance: number;
    grade: 'excellent' | 'good' | 'fair' | 'poor';
}
interface BenchmarkBaseline {
    version: string;
    timestamp: Date;
    results: Record<string, number>;
}
interface AnalyticsState {
    insights: AnalyticsInsight[];
    patterns: PatternAnalysis[];
    predictions: Prediction[];
    reports: AnalyticsReport[];
    isAnalyzing: boolean;
    autoRefresh: boolean;
}
interface PatternAnalysis {
    patternId: string;
    usage: PatternUsageData;
    performance: PatternPerformanceData;
    evolution: PatternEvolution;
    recommendations: PatternRecommendation[];
}
interface PatternUsageData {
    totalUsage: number;
    recentUsage: number;
    usageTrend: 'increasing' | 'decreasing' | 'stable';
    topUsers: string[];
    usageDistribution: Record<string, number>;
}
interface PatternPerformanceData {
    averageTime: number;
    successRate: number;
    errorTypes: Record<string, number>;
    performanceTrend: 'improving' | 'degrading' | 'stable';
    bottlenecks: string[];
}
interface PatternEvolution {
    originalPattern: string;
    currentPattern: string;
    optimizationHistory: PatternOptimization[];
    performanceGain: number;
    stabilityScore: number;
}
interface PatternOptimization {
    timestamp: Date;
    type: 'accuracy' | 'performance' | 'scope' | 'syntax';
    description: string;
    improvement: number;
    appliedBy: 'system' | 'user';
}
interface PatternRecommendation {
    recommendationType: 'optimize' | 'replace' | 'merge' | 'deprecate';
    description: string;
    expectedBenefit: string;
    effort: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
}
interface Prediction {
    predictionId: string;
    timestamp: Date;
    type: 'performance' | 'usage' | 'failure' | 'opportunity';
    timeframe: string;
    confidence: number;
    description: string;
    implications: string[];
    preventiveActions: string[];
    monitoringMetrics: string[];
}
interface AnalyticsReport {
    reportId: string;
    title: string;
    description: string;
    type: 'summary' | 'detailed' | 'trend' | 'comparison';
    period: string;
    generatedAt: Date;
    sections: ReportSection[];
    recommendations: string[];
    executiveSummary: string;
}
interface ReportSection {
    title: string;
    content: string;
    charts: ChartData[];
    tables: TableData[];
    insights: string[];
}
interface ChartData {
    chartId: string;
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
    title: string;
    data: any[];
    options: any;
}
interface TableData {
    tableId: string;
    headers: string[];
    rows: any[][];
    sortable: boolean;
    filterable: boolean;
}
interface DashboardNotification {
    notificationId: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    persistent: boolean;
    actionable: boolean;
    actions: NotificationAction[];
    autoHide: boolean;
    hideAfter: number;
}
interface NotificationAction {
    actionId: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    callback: string;
}
interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    defaultView: DashboardView;
    autoRefreshInterval: number;
    notificationSettings: NotificationSettings;
    displaySettings: DisplaySettings;
    searchSettings: SearchSettings;
    performanceSettings: PerformanceSettings;
}
interface NotificationSettings {
    enableNotifications: boolean;
    alertThresholds: Record<string, number>;
    notificationTypes: string[];
    soundEnabled: boolean;
    emailNotifications: boolean;
}
interface DisplaySettings {
    compactMode: boolean;
    showTooltips: boolean;
    animationsEnabled: boolean;
    chartAnimations: boolean;
    tablePageSize: number;
}
interface SearchSettings {
    defaultSearchType: 'simple' | 'pattern' | 'semantic';
    saveSearchHistory: boolean;
    maxHistoryEntries: number;
    defaultFilters: SearchFilters;
    patternSuggestions: boolean;
}
interface PerformanceSettings {
    monitoringEnabled: boolean;
    metricsInterval: number;
    alertThresholds: Record<string, number>;
    benchmarkSchedule: string;
    optimizationAutoApply: boolean;
}
export declare class UnifiedSearchDashboard {
    private logger;
    private serenaIntegration;
    private smartRouter;
    private enhancedExtractor;
    private analyticsEngine;
    private performanceOptimizer;
    private dashboardState;
    private eventListeners;
    private updateInterval;
    private isInitialized;
    constructor(logger: PluginLogger, serenaIntegration: SerenaSearchIntegration, smartRouter: SmartAgentRouter, enhancedExtractor: EnhancedKeywordExtractor, analyticsEngine: SearchPoweredAnalytics, performanceOptimizer: SerenaPerformanceOptimizer);
    /**
     * Initialize unified search dashboard
     */
    initialize(): Promise<void>;
    /**
     * Shutdown dashboard and cleanup resources
     */
    shutdown(): Promise<void>;
    /**
     * Execute search with unified interface
     */
    executeSearch(request: UnifiedSearchRequest): Promise<UnifiedSearchResponse>;
    /**
     * Get real-time analytics dashboard data
     */
    getAnalyticsDashboard(): Promise<AnalyticsDashboardData>;
    /**
     * Generate analytics reports
     */
    generateReport(type: 'summary' | 'detailed' | 'trend' | 'comparison', period: string): Promise<AnalyticsReport>;
    /**
     * Get real-time performance dashboard
     */
    getPerformanceDashboard(): Promise<PerformanceDashboardData>;
    /**
     * Execute performance optimization
     */
    executeOptimization(): Promise<PerformanceOptimizationResult>;
    private initializeDashboardState;
    private loadUserPreferences;
    private saveUserPreferences;
    private initializeComponents;
    private startRealTimeMonitoring;
    private loadInitialData;
    private setupEventListeners;
    private updateRealTimeData;
    private onSearchCompleted;
    private onOptimizationCompleted;
    private onAlertTriggered;
    private generateSearchId;
    private generateReportId;
    private generateNotificationId;
    private generateSuggestionId;
    private getDefaultFilters;
    private getEmptyMetrics;
    private getEmptyHistoricalData;
    private getDefaultPreferences;
    private estimateSearchDuration;
    private updateProgress;
    private convertToSerenaRequest;
    private enhanceSearchResults;
    private addToSearchHistory;
    private calculateSearchMetrics;
    private generateSearchSuggestions;
    private identifyResultPatterns;
    private createEmptyMetrics;
    private addNotification;
    private on;
    private emit;
    private loadSearchPatterns;
    private createAnalyticsOverview;
    private formatSearchPatternData;
    private formatCodebaseInsights;
    private formatPerformanceMetrics;
    private formatPredictions;
    private formatRecommendations;
    private createReportSections;
    private extractRecommendations;
    private mapCurrentMetrics;
    private formatHistoricalData;
    private formatBenchmarkData;
    private generatePerformanceAlerts;
    private calculatePerformanceTrends;
    private checkForAlerts;
    getDashboardState(): DashboardState;
    switchView(view: DashboardView): Promise<void>;
    updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void>;
    getNotifications(): DashboardNotification[];
    dismissNotification(notificationId: string): void;
}
interface UnifiedSearchRequest {
    query: string;
    type?: 'simple' | 'pattern' | 'semantic' | 'batch';
    filters?: Partial<SearchFilters>;
    options?: SearchRequestOptions;
}
interface SearchRequestOptions {
    maxResults?: number;
    timeout?: number;
    priority?: 'low' | 'normal' | 'high';
    cacheResults?: boolean;
}
interface UnifiedSearchResponse {
    searchId: string;
    query: string;
    results: SearchResult[];
    totalResults: number;
    executionTime: number;
    searchMetrics: any;
    suggestions: string[];
    patterns: string[];
    success: boolean;
    error?: string;
}
interface AnalyticsDashboardData {
    overview: {
        insights: AnalyticsInsight[];
        [key: string]: any;
    };
    searchPatterns: any;
    codebaseInsights: any;
    performanceMetrics: any;
    predictions: any;
    recommendations: any;
    lastUpdated: Date;
}
interface PerformanceDashboardData {
    currentMetrics: CurrentPerformanceMetrics;
    historicalData: HistoricalPerformanceData;
    optimizations: OptimizationSuggestion[];
    benchmarks: BenchmarkData[];
    alerts: DashboardPerformanceAlert[];
    trends: PerformanceTrend[];
    lastUpdated: Date;
}
export declare function createUnifiedSearchDashboard(logger: PluginLogger, serenaIntegration: SerenaSearchIntegration, smartRouter: SmartAgentRouter, enhancedExtractor: EnhancedKeywordExtractor, analyticsEngine: SearchPoweredAnalytics, performanceOptimizer: SerenaPerformanceOptimizer): UnifiedSearchDashboard;
export type { DashboardState, DashboardView, UnifiedSearchRequest, UnifiedSearchResponse, AnalyticsDashboardData, PerformanceDashboardData, UserPreferences };
//# sourceMappingURL=UnifiedSearchDashboard.d.ts.map