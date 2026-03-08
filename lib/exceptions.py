"""Custom exceptions for Orchestrator V14.0.4.

This module provides a hierarchical exception system for clean error handling
and proper exception chaining across all orchestrator components.

Exception Hierarchy:
    OrchestratorError (base)
    |-- AgentError (agent-related issues)
    |-- TaskError (task-related issues)
    |-- LockError (lock-related issues)
        |-- DistributedLockError (distributed lock specific)
    |-- ConfigurationError (config-related issues)
    |-- RoutingError (routing-related issues)
    |-- CacheError (cache-related issues)
    |-- DatabaseError (database-related issues)

Usage:
    from lib.exceptions import ConfigurationError, AgentError

    try:
        config = load_config()
    except IOError as err:
        raise ConfigurationError(f"Failed to load config: {err}") from err
"""

from typing import Optional, Any, Dict


class OrchestratorError(Exception):
    """Base exception for all orchestrator errors.

    All custom exceptions in the orchestrator should inherit from this class.
    Provides consistent error formatting and optional context.

    Attributes:
        message: Human-readable error description
        context: Optional dictionary with additional error context
        cause: The underlying exception that caused this error
    """

    def __init__(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize OrchestratorError.

        Args:
            message: Human-readable error description
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        self.message = message
        self.context = context or {}
        self.cause = cause
        super().__init__(message)

    def __str__(self) -> str:
        """Return formatted error message with context."""
        if self.context:
            context_str = ", ".join(f"{k}={v}" for k, v in self.context.items())
            return f"{self.message} [{context_str}]"
        return self.message

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for logging/serialization.

        Returns:
            Dictionary with error details
        """
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "context": self.context,
            "cause": str(self.cause) if self.cause else None
        }


# =============================================================================
# AGENT ERRORS
# =============================================================================

class AgentError(OrchestratorError):
    """Exception for agent-related errors.

    Raised when there are issues with agent selection, execution,
    or agent-specific operations.

    Examples:
        - Agent not found in registry
        - Agent execution failed
        - Agent performance data unavailable
    """

    def __init__(
        self,
        message: str,
        agent_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize AgentError.

        Args:
            message: Human-readable error description
            agent_id: ID of the agent that caused the error
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if agent_id:
            ctx["agent_id"] = agent_id
        super().__init__(message, ctx, cause)


class AgentNotFoundError(AgentError):
    """Exception raised when an agent cannot be found.

    Specific case when looking up an agent that doesn't exist
    in the registry or routing table.
    """

    pass


class AgentExecutionError(AgentError):
    """Exception raised when agent execution fails.

    Used when an agent is found but fails to execute properly.
    """

    def __init__(
        self,
        message: str,
        agent_id: Optional[str] = None,
        task_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize AgentExecutionError.

        Args:
            message: Human-readable error description
            agent_id: ID of the agent that failed
            task_id: ID of the task that was being executed
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if task_id:
            ctx["task_id"] = task_id
        super().__init__(message, agent_id, ctx, cause)


# =============================================================================
# TASK ERRORS
# =============================================================================

class TaskError(OrchestratorError):
    """Exception for task-related errors.

    Raised when there are issues with task creation, execution,
    or task lifecycle management.

    Examples:
        - Task timeout
        - Task validation failure
        - Task dependency issues
    """

    def __init__(
        self,
        message: str,
        task_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize TaskError.

        Args:
            message: Human-readable error description
            task_id: ID of the task that caused the error
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if task_id:
            ctx["task_id"] = task_id
        super().__init__(message, ctx, cause)


class TaskTimeoutError(TaskError):
    """Exception raised when a task exceeds its timeout.

    Specific case for timeout-related task failures.
    """

    def __init__(
        self,
        message: str,
        task_id: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize TaskTimeoutError.

        Args:
            message: Human-readable error description
            task_id: ID of the task that timed out
            timeout_seconds: The timeout value that was exceeded
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if timeout_seconds is not None:
            ctx["timeout_seconds"] = timeout_seconds
        super().__init__(message, task_id, ctx, cause)


class TaskValidationError(TaskError):
    """Exception raised when task validation fails.

    Used when a task's input or parameters are invalid.
    """

    pass


# =============================================================================
# LOCK ERRORS
# =============================================================================

class LockError(OrchestratorError):
    """Exception for lock-related errors.

    Raised when there are issues with file locks, distributed locks,
    or concurrency control.

    Examples:
        - Lock acquisition timeout
        - Deadlock detected
        - Lock file corruption
    """

    def __init__(
        self,
        message: str,
        resource: Optional[str] = None,
        holder_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize LockError.

        Args:
            message: Human-readable error description
            resource: The resource being locked
            holder_id: ID of the lock holder
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if resource:
            ctx["resource"] = resource
        if holder_id:
            ctx["holder_id"] = holder_id
        super().__init__(message, ctx, cause)


class LockAcquisitionError(LockError):
    """Exception raised when lock acquisition fails.

    Specific case for lock acquisition failures (timeout, contention).
    """

    pass


class LockTimeoutError(LockError):
    """Exception raised when lock acquisition times out.

    Specific case for timeout-related lock failures.
    """

    def __init__(
        self,
        message: str,
        resource: Optional[str] = None,
        holder_id: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize LockTimeoutError.

        Args:
            message: Human-readable error description
            resource: The resource being locked
            holder_id: ID of the lock holder
            timeout_seconds: The timeout value that was exceeded
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if timeout_seconds is not None:
            ctx["timeout_seconds"] = timeout_seconds
        super().__init__(message, resource, holder_id, ctx, cause)


class DeadlockError(LockError):
    """Exception raised when a deadlock is detected.

    Used when circular lock dependencies are found.
    """

    pass


class DistributedLockError(LockError):
    """Exception for distributed lock-related errors.

    Raised specifically for Redis-based distributed lock issues.

    Examples:
        - Redis connection failure
        - Redis lock validation failure
        - Fallback to file lock
    """

    def __init__(
        self,
        message: str,
        resource: Optional[str] = None,
        holder_id: Optional[str] = None,
        backend: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize DistributedLockError.

        Args:
            message: Human-readable error description
            resource: The resource being locked
            holder_id: ID of the lock holder
            backend: The lock backend being used ('redis' or 'file')
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if backend:
            ctx["backend"] = backend
        super().__init__(message, resource, holder_id, ctx, cause)


# =============================================================================
# CONFIGURATION ERRORS
# =============================================================================

class ConfigurationError(OrchestratorError):
    """Exception for configuration-related errors.

    Raised when there are issues with loading, parsing, or validating
    configuration files or settings.

    Examples:
        - Config file not found
        - Invalid config format
        - Missing required settings
    """

    def __init__(
        self,
        message: str,
        config_key: Optional[str] = None,
        config_file: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize ConfigurationError.

        Args:
            message: Human-readable error description
            config_key: The configuration key that caused the error
            config_file: The configuration file path
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if config_key:
            ctx["config_key"] = config_key
        if config_file:
            ctx["config_file"] = config_file
        super().__init__(message, ctx, cause)


class ConfigFileNotFoundError(ConfigurationError):
    """Exception raised when a configuration file is not found.

    Specific case for missing config files.
    """

    pass


class ConfigValidationError(ConfigurationError):
    """Exception raised when configuration validation fails.

    Used when config values are invalid or missing required fields.
    """

    pass


# =============================================================================
# ROUTING ERRORS
# =============================================================================

class RoutingError(OrchestratorError):
    """Exception for routing-related errors.

    Raised when there are issues with agent routing, keyword matching,
    or routing table operations.

    Examples:
        - No agent found for task
        - Routing table corruption
        - Keyword index failure
    """

    def __init__(
        self,
        message: str,
        task: Optional[str] = None,
        candidates: Optional[list] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize RoutingError.

        Args:
            message: Human-readable error description
            task: The task description being routed
            candidates: List of candidate agents considered
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if task:
            ctx["task"] = task[:100] if len(task) > 100 else task  # Truncate long tasks
        if candidates:
            ctx["candidates_count"] = len(candidates)
        super().__init__(message, ctx, cause)


class NoAgentFoundError(RoutingError):
    """Exception raised when no suitable agent is found.

    Specific case when routing fails to find any matching agent.
    """

    pass


class RoutingTableError(RoutingError):
    """Exception raised when routing table operations fail.

    Used for routing table loading, parsing, or validation issues.
    """

    pass


# =============================================================================
# CACHE ERRORS
# =============================================================================

class CacheError(OrchestratorError):
    """Exception for cache-related errors.

    Raised when there are issues with caching operations,
    including predictive cache, budget cache, and LRU caches.

    Examples:
        - Cache serialization failure
        - Cache eviction error
        - Cache invalidation failure
    """

    def __init__(
        self,
        message: str,
        cache_name: Optional[str] = None,
        cache_key: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize CacheError.

        Args:
            message: Human-readable error description
            cache_name: Name of the cache that caused the error
            cache_key: The cache key involved
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if cache_name:
            ctx["cache_name"] = cache_name
        if cache_key:
            ctx["cache_key"] = cache_key
        super().__init__(message, ctx, cause)


class CacheSerializationError(CacheError):
    """Exception raised when cache serialization/deserialization fails.

    Specific case for pickle/json serialization issues.
    """

    pass


class CacheEvictionError(CacheError):
    """Exception raised when cache eviction fails.

    Used for LRU eviction or TTL expiration failures.
    """

    pass


# =============================================================================
# DATABASE ERRORS
# =============================================================================

class DatabaseError(OrchestratorError):
    """Exception for database-related errors.

    Raised when there are issues with SQLite operations,
    connection pooling, or metrics storage.

    Examples:
        - Database connection failure
        - Query execution error
        - Migration failure
    """

    def __init__(
        self,
        message: str,
        db_path: Optional[str] = None,
        query: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize DatabaseError.

        Args:
            message: Human-readable error description
            db_path: Path to the database file
            query: The SQL query that caused the error (truncated)
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if db_path:
            ctx["db_path"] = db_path
        if query:
            ctx["query"] = query[:100] if len(query) > 100 else query  # Truncate
        super().__init__(message, ctx, cause)


class DatabaseConnectionError(DatabaseError):
    """Exception raised when database connection fails.

    Specific case for connection pool or SQLite connection issues.
    """

    pass


class DatabaseQueryError(DatabaseError):
    """Exception raised when a database query fails.

    Used for query execution or transaction errors.
    """

    pass


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def wrap_exception(
    original_error: Exception,
    new_error_class: type,
    message: str,
    **context
) -> OrchestratorError:
    """Wrap an exception with proper chaining.

    Utility function to create a new exception with the original
    exception as the cause, following Python best practices.

    Args:
        original_error: The original exception to wrap
        new_error_class: The class of the new exception to create
        message: Message for the new exception
        **context: Additional context for the new exception

    Returns:
        A new exception with proper exception chaining

    Example:
        try:
            result = some_operation()
        except IOError as err:
            raise wrap_exception(
                err,
                ConfigurationError,
                "Failed to load configuration"
            )
    """
    return new_error_class(message, context=context, cause=original_error)


def get_exception_chain(error: Exception) -> list:
    """Get the full chain of exceptions.

    Traverses the exception chain to get all underlying causes.

    Args:
        error: The exception to analyze

    Returns:
        List of exceptions in the chain, from outermost to innermost

    Example:
        try:
            ...
        except Exception as err:
            chain = get_exception_chain(err)
            for i, e in enumerate(chain):
                print(f"{i}: {type(e).__name__}: {e}")
    """
    chain = [error]
    current = error
    while hasattr(current, "__cause__") and current.__cause__ is not None:
        current = current.__cause__
        chain.append(current)
    return chain


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    # Base
    "OrchestratorError",
    # Agent errors
    "AgentError",
    "AgentNotFoundError",
    "AgentExecutionError",
    # Task errors
    "TaskError",
    "TaskTimeoutError",
    "TaskValidationError",
    # Lock errors
    "LockError",
    "LockAcquisitionError",
    "LockTimeoutError",
    "DeadlockError",
    "DistributedLockError",
    # Configuration errors
    "ConfigurationError",
    "ConfigFileNotFoundError",
    "ConfigValidationError",
    # Routing errors
    "RoutingError",
    "NoAgentFoundError",
    "RoutingTableError",
    # Cache errors
    "CacheError",
    "CacheSerializationError",
    "CacheEvictionError",
    # Database errors
    "DatabaseError",
    "DatabaseConnectionError",
    "DatabaseQueryError",
    # Utility functions
    "wrap_exception",
    "get_exception_chain",
]
