"use strict";
/**
 * CCH (Central Communication Hub) - Common Type Definitions
 *
 * Centralized type definitions for all CCH components.
 * This file provides unified exports and type aliases for consistency.
 *
 * @module CCH/Types
 * @version 1.0.0
 * @date 02 February 2026
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubEventType = void 0;
/**
 * Hub lifecycle event types
 * Defines the events emitted by the CentralCommunicationHub
 */
var HubEventType;
(function (HubEventType) {
    /** Hub has been initialized and is ready */
    HubEventType["HUB_STARTED"] = "hub_started";
    /** Hub is shutting down */
    HubEventType["HUB_STOPPED"] = "hub_stopped";
    /** A component initialization failed */
    HubEventType["COMPONENT_INIT_FAILED"] = "component_init_failed";
    /** A circuit breaker has opened */
    HubEventType["CIRCUIT_OPENED"] = "circuit_opened";
    /** A circuit breaker has closed (recovered) */
    HubEventType["CIRCUIT_CLOSED"] = "circuit_closed";
    /** Message has been published */
    HubEventType["MESSAGE_PUBLISHED"] = "message_published";
    /** Message has been delivered */
    HubEventType["MESSAGE_DELIVERED"] = "message_delivered";
    /** Message processing failed */
    HubEventType["MESSAGE_FAILED"] = "message_failed";
    /** Routing decision made */
    HubEventType["ROUTING_DECISION"] = "routing_decision";
    /** Context pool threshold reached */
    HubEventType["POOL_THRESHOLD"] = "pool_threshold";
    /** Health status changed */
    HubEventType["HEALTH_STATUS_CHANGED"] = "health_status_changed";
    /** Alert triggered */
    HubEventType["ALERT_TRIGGERED"] = "alert_triggered";
})(HubEventType || (exports.HubEventType = HubEventType = {}));
// =============================================================================
// DEFAULT EXPORT
// =============================================================================
// Note: This module only exports types, no default export
//# sourceMappingURL=types.js.map