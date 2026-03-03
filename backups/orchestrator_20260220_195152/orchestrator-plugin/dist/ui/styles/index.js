"use strict";
/**
 * Styles Module Index
 *
 * Centralized export point for all UI styles in the orchestrator plugin.
 * Based on the TELEGRAM module's styling system.
 *
 * @version 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIMS = exports.FONTS = exports.COLORS = exports.getQSSStylesheet = exports.getGlobalStylesheet = exports.GlobalStyles = void 0;
__exportStar(require("./GlobalStyles"), exports);
// Re-export commonly used items for convenience
var GlobalStyles_1 = require("./GlobalStyles");
Object.defineProperty(exports, "GlobalStyles", { enumerable: true, get: function () { return __importDefault(GlobalStyles_1).default; } });
var GlobalStyles_2 = require("./GlobalStyles");
Object.defineProperty(exports, "getGlobalStylesheet", { enumerable: true, get: function () { return GlobalStyles_2.getGlobalStylesheet; } });
Object.defineProperty(exports, "getQSSStylesheet", { enumerable: true, get: function () { return GlobalStyles_2.getQSSStylesheet; } });
Object.defineProperty(exports, "COLORS", { enumerable: true, get: function () { return GlobalStyles_2.COLORS; } });
Object.defineProperty(exports, "FONTS", { enumerable: true, get: function () { return GlobalStyles_2.FONTS; } });
Object.defineProperty(exports, "DIMS", { enumerable: true, get: function () { return GlobalStyles_2.DIMS; } });
//# sourceMappingURL=index.js.map