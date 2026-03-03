"use strict";
/**
 * Context Pool Manager (CPM) - Index
 *
 * Context pooling system that eliminates Clean Context overhead.
 * Reduces context acquisition time from 200-500ms to <10ms.
 *
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.createHighThroughputPoolManager = exports.createLowMemoryPoolManager = exports.createContextPoolManager = exports.resetContextPoolManager = exports.getContextPoolManager = exports.ContextPoolManager = void 0;
// =============================================================================
// EXPORTS
// ============================================================================
var ContextPoolManager_1 = require("./ContextPoolManager");
// Main class
Object.defineProperty(exports, "ContextPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.ContextPoolManager; } });
// Singleton access
Object.defineProperty(exports, "getContextPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.getContextPoolManager; } });
Object.defineProperty(exports, "resetContextPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.resetContextPoolManager; } });
// Factory functions
Object.defineProperty(exports, "createContextPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.createContextPoolManager; } });
Object.defineProperty(exports, "createLowMemoryPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.createLowMemoryPoolManager; } });
Object.defineProperty(exports, "createHighThroughputPoolManager", { enumerable: true, get: function () { return ContextPoolManager_1.createHighThroughputPoolManager; } });
// =============================================================================
// DEFAULT EXPORT
// =============================================================================
var ContextPoolManager_2 = require("./ContextPoolManager");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(ContextPoolManager_2).default; } });
//# sourceMappingURL=index.js.map