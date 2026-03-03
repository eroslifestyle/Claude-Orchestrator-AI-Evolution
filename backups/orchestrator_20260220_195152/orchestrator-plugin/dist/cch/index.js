"use strict";
/**
 * CCH (Central Communication Hub) Module - Barrel Export
 *
 * Provides context pooling, fault tolerance, observability, routing,
 * message queue, and the main hub orchestrator.
 *
 * @version 1.0.0
 * @date 01 February 2026
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.createUMQ = exports.UnifiedMessageQueue = exports.createUnifiedRouterEngine = exports.UnifiedRouterEngine = exports.resetObservability = exports.getObservability = exports.createObservability = exports.ObservabilityModule = exports.RetryExhaustedError = exports.CircuitBreakerOpenError = exports.createFaultToleranceLayer = exports.FaultToleranceLayer = exports.createHighThroughputPoolManager = exports.createLowMemoryPoolManager = exports.createContextPoolManager = exports.resetContextPoolManager = exports.getContextPoolManager = exports.ContextPoolManager = exports.resetHub = exports.getHub = exports.createProductionHub = exports.createDevHub = exports.createHubLazy = exports.createHub = exports.CentralCommunicationHub = void 0;
// =============================================================================
// MAIN HUB - CentralCommunicationHub
// =============================================================================
var CentralCommunicationHub_1 = require("./CentralCommunicationHub");
Object.defineProperty(exports, "CentralCommunicationHub", { enumerable: true, get: function () { return CentralCommunicationHub_1.CentralCommunicationHub; } });
Object.defineProperty(exports, "createHub", { enumerable: true, get: function () { return CentralCommunicationHub_1.createHub; } });
Object.defineProperty(exports, "createHubLazy", { enumerable: true, get: function () { return CentralCommunicationHub_1.createHubLazy; } });
Object.defineProperty(exports, "createDevHub", { enumerable: true, get: function () { return CentralCommunicationHub_1.createDevHub; } });
Object.defineProperty(exports, "createProductionHub", { enumerable: true, get: function () { return CentralCommunicationHub_1.createProductionHub; } });
Object.defineProperty(exports, "getHub", { enumerable: true, get: function () { return CentralCommunicationHub_1.getHub; } });
Object.defineProperty(exports, "resetHub", { enumerable: true, get: function () { return CentralCommunicationHub_1.resetHub; } });
// =============================================================================
// POOL - Context Pool Manager (CPM)
// =============================================================================
var ContextPoolManager_1 = require("./pool/ContextPoolManager");
Object.defineProperty(exports, "ContextPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.ContextPoolManager; } });
Object.defineProperty(exports, "getContextPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.getContextPoolManager; } });
Object.defineProperty(exports, "resetContextPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.resetContextPoolManager; } });
Object.defineProperty(exports, "createContextPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.createContextPoolManager; } });
Object.defineProperty(exports, "createLowMemoryPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.createLowMemoryPoolManager; } });
Object.defineProperty(exports, "createHighThroughputPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.createHighThroughputPoolManager; } });
// =============================================================================
// FAULT TOLERANCE - FaultToleranceLayer (FTL)
// =============================================================================
var FaultToleranceLayer_1 = require("./fault/FaultToleranceLayer");
Object.defineProperty(exports, "FaultToleranceLayer", { enumerable: true, get: function () { return FaultToleranceLayer_1.FaultToleranceLayer; } });
Object.defineProperty(exports, "createFaultToleranceLayer", { enumerable: true, get: function () { return FaultToleranceLayer_1.createFaultToleranceLayer; } });
Object.defineProperty(exports, "CircuitBreakerOpenError", { enumerable: true, get: function () { return FaultToleranceLayer_1.CircuitBreakerOpenError; } });
Object.defineProperty(exports, "RetryExhaustedError", { enumerable: true, get: function () { return FaultToleranceLayer_1.RetryExhaustedError; } });
// =============================================================================
// OBSERVABILITY - ObservabilityModule (OM)
// =============================================================================
var ObservabilityModule_1 = require("./observability/ObservabilityModule");
Object.defineProperty(exports, "ObservabilityModule", { enumerable: true, get: function () { return ObservabilityModule_1.ObservabilityModule; } });
Object.defineProperty(exports, "createObservability", { enumerable: true, get: function () { return ObservabilityModule_1.createObservability; } });
Object.defineProperty(exports, "getObservability", { enumerable: true, get: function () { return ObservabilityModule_1.getObservability; } });
Object.defineProperty(exports, "resetObservability", { enumerable: true, get: function () { return ObservabilityModule_1.resetObservability; } });
// =============================================================================
// ROUTING - UnifiedRouterEngine (URE)
// =============================================================================
var UnifiedRouterEngine_1 = require("./routing/UnifiedRouterEngine");
Object.defineProperty(exports, "UnifiedRouterEngine", { enumerable: true, get: function () { return UnifiedRouterEngine_1.UnifiedRouterEngine; } });
Object.defineProperty(exports, "createUnifiedRouterEngine", { enumerable: true, get: function () { return UnifiedRouterEngine_1.createUnifiedRouterEngine; } });
// =============================================================================
// QUEUE - UnifiedMessageQueue (UMQ)
// =============================================================================
var UnifiedMessageQueue_1 = require("./queue/UnifiedMessageQueue");
Object.defineProperty(exports, "UnifiedMessageQueue", { enumerable: true, get: function () { return UnifiedMessageQueue_1.UnifiedMessageQueue; } });
Object.defineProperty(exports, "createUMQ", { enumerable: true, get: function () { return UnifiedMessageQueue_1.createUMQ; } });
// =============================================================================
// DEFAULT EXPORT
// =============================================================================
var CentralCommunicationHub_2 = require("./CentralCommunicationHub");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return CentralCommunicationHub_2.CentralCommunicationHub; } });
//# sourceMappingURL=index.js.map