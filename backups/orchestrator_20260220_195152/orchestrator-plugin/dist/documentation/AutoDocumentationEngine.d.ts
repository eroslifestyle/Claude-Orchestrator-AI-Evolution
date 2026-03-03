/**
 * Auto-Documentation Engine for Claude Code Orchestrator Plugin
 *
 * Implements REGOLA #5 automation - automatically triggers documenter expert
 * and generates comprehensive documentation from orchestration results.
 *
 * @version 1.0.0
 * @author Development Team
 */
import type { OrchestratorResult, ExecutionPlan, DocumentationConfig, DocumentationOutput, AutoDocumentationMetrics, ExtendedExpertAgentCall } from '../types';
interface ExtendedDocumentationOutput extends DocumentationOutput {
    success: boolean;
    filesGenerated?: string[];
    errors?: string[];
    timestamp?: Date;
    sessionId: string;
    generatedAt: string;
    documents: any[];
    metrics: {
        generationTime: number;
        documentsCreated: number;
        templatesUsed: string[];
        expertCalled: boolean;
    };
    expertCall?: ExtendedExpertAgentCall;
}
/**
 * Main Auto-Documentation Engine
 */
export declare class AutoDocumentationEngine {
    private readonly logger;
    private readonly templateEngine;
    private readonly expertIntegration;
    private config;
    private extendedConfig;
    private metrics;
    private extendedMetrics;
    constructor(config?: Partial<DocumentationConfig>);
    /**
     * Generate comprehensive documentation from orchestration result
     * Main entry point for REGOLA #5 automation
     */
    generateDocumentation(result: OrchestratorResult, plan?: ExecutionPlan): Promise<ExtendedDocumentationOutput>;
    /**
     * Generate documentation from specific template
     */
    private generateFromTemplate;
    /**
     * Prepare data for template rendering
     */
    private prepareTemplateData;
    /**
     * Export documentation in configured formats
     */
    private exportDocumentation;
    /**
     * Get documentation metrics
     */
    getMetrics(): AutoDocumentationMetrics;
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    private buildDependencyEdges;
    private extractComponents;
    private extractConfigChanges;
    private extractErrorHandling;
    private extractTestingInfo;
    private extractDeploymentInfo;
    private generateAccomplishmentSummary;
    private extractNewFeatures;
    private extractConfigOptions;
    private generateTroubleshooting;
    private convertMarkdownToHtml;
}
export {};
//# sourceMappingURL=AutoDocumentationEngine.d.ts.map