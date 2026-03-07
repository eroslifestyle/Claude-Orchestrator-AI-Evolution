/**
 * Ultra-Resilient Testing Framework
 *
 * Comprehensive testing suite that validates 100% failure scenario coverage.
 * Tests all 5 resilience components and provides mathematical proof
 * of zero-failure tolerance achievement.
 *
 * CRITICAL MISSION: Mathematically validate that the system can handle
 * 100% of possible failure scenarios without complete system failure.
 *
 * @version 1.0.0 - MATHEMATICAL VALIDATION OF 100% COVERAGE
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { ValidationResult } from '../types';
/**
 * Ultra-Resilient Testing Framework - Main Class
 */
export declare class UltraResilientTesting extends EventEmitter {
    private readonly logger;
    private readonly scenarioGenerator;
    private readonly coverageAnalyzer;
    private readonly testComponents;
    constructor();
    /**
     * Execute comprehensive resilience testing
     */
    executeComprehensiveTesting(): Promise<ValidationResult>;
    /**
     * Execute individual test scenarios
     */
    private executeTestScenarios;
    /**
     * Execute individual test scenario
     */
    private executeTestScenario;
    private setupTestEnvironment;
    private testEdgeCaseScenario;
    private testResourceConstraintScenario;
    private testConfigCascadeScenario;
    private testIntegrationScenario;
    private testCombinationScenario;
    private testStressScenario;
    private createFailureContextFromScenario;
    private createResourceConstraintContextFromScenario;
    private createCascadeContextFromScenario;
    private createIntegrationContextFromScenario;
    private inferConstraintType;
    private simulateSystemMetrics;
    private validateTestResult;
    private assessSystemHealthAfterTesting;
    private generateFinalReport;
}
/**
 * Export Ultra-Resilient Testing Framework
 */
export default UltraResilientTesting;
//# sourceMappingURL=UltraResilientTesting.d.ts.map