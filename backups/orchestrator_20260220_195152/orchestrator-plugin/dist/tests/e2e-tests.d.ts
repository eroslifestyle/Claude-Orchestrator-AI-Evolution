#!/usr/bin/env node
/**
 * End-to-End Tests for Claude Code Orchestrator Plugin
 *
 * Validates complete integration and compatibility with Claude Code plugin system.
 * Tests all major components and workflows in a production-like environment.
 *
 * @version 1.0.0
 * @author Development Team
 */
/**
 * E2E Test Runner
 */
declare class E2ETestRunner {
    private testSuites;
    private totalTests;
    private passedTests;
    private startTime;
    /**
     * Run all end-to-end tests
     */
    run(): Promise<void>;
    /**
     * Test Suite 1: Plugin Structure Validation
     */
    private runPluginStructureTests;
    /**
     * Test Suite 2: Core Engine Integration
     */
    private runCoreEngineTests;
    /**
     * Test Suite 3: UI Components Integration
     */
    private runUIComponentsTests;
    /**
     * Test Suite 4: CLI Interface Tests
     */
    private runCLIInterfaceTests;
    /**
     * Test Suite 5: Auto-Documentation Tests
     */
    private runAutoDocumentationTests;
    /**
     * Test Suite 6: Error Recovery Tests
     */
    private runErrorRecoveryTests;
    /**
     * Test Suite 7: Configuration Management Tests
     */
    private runConfigurationTests;
    /**
     * Test Suite 8: Installation System Tests
     */
    private runInstallationTests;
    /**
     * Test Suite 9: Performance Tests
     */
    private runPerformanceTests;
    /**
     * Test Suite 10: Claude Code Compatibility Tests
     */
    private runClaudeCompatibilityTests;
    private testPackageJson;
    private testMainEntryPoint;
    private testTypeScriptDeclarations;
    private testRequiredDirectories;
    private testPluginExports;
    private testPluginInstantiation;
    private testCommandsRegistration;
    private testPluginMetadata;
    private testCoreEngineInitialization;
    private testProgressVisualization;
    private testConfigurationManager;
    private testErrorRecoveryInterface;
    private testCLIInterfaceInit;
    private testCommandParsing;
    private testSessionManagement;
    private testDocumentationEngine;
    private testTemplateProcessing;
    private testRegola5Automation;
    private testErrorPatternDetection;
    private testRecoveryStrategies;
    private testGuidedTroubleshooting;
    private testConfigurationLoading;
    private testConfigurationValidation;
    private testSetupWizardWorkflow;
    private testPluginValidator;
    private testPackageCreation;
    private testInstallationProcess;
    private testPluginStartupTime;
    private testCLIResponseTime;
    private testMemoryUsage;
    private testPluginInterfaceCompliance;
    private testCommandRegistrationCompliance;
    private testPluginLifecycleCompliance;
    /**
     * Display suite results
     */
    private displaySuiteResults;
    /**
     * Display final test results
     */
    private displayResults;
}
export { E2ETestRunner };
//# sourceMappingURL=e2e-tests.d.ts.map