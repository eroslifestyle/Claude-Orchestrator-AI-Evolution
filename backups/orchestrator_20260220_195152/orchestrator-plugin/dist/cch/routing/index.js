"use strict";
/**
 * UnifiedRouterEngine Module - Exports
 *
 * Centralized routing module with LRU cache support.
 * Exports all public types and factory functions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.LRUMap = exports.SimplifiedTFIDF = exports.createUnifiedRouterEngine = exports.UnifiedRouterEngine = void 0;
// Main exports
var UnifiedRouterEngine_1 = require("./UnifiedRouterEngine");
Object.defineProperty(exports, "UnifiedRouterEngine", { enumerable: true, get: function () { return UnifiedRouterEngine_1.UnifiedRouterEngine; } });
Object.defineProperty(exports, "createUnifiedRouterEngine", { enumerable: true, get: function () { return UnifiedRouterEngine_1.createUnifiedRouterEngine; } });
Object.defineProperty(exports, "SimplifiedTFIDF", { enumerable: true, get: function () { return UnifiedRouterEngine_1.SimplifiedTFIDF; } });
Object.defineProperty(exports, "LRUMap", { enumerable: true, get: function () { return UnifiedRouterEngine_1.LRUMap; } });
// Re-export for convenience
var UnifiedRouterEngine_2 = require("./UnifiedRouterEngine");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return UnifiedRouterEngine_2.UnifiedRouterEngine; } });
//# sourceMappingURL=index.js.map