"""Skill Interface for Orchestrator V14.0.3 Plugin System.

Abstract base class for all skills.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class SkillInterface(ABC):
    """Abstract base class for orchestrator skills.

    All skills must inherit from this interface and implement
    the required methods.
    """

    def __init__(self):
        """Initialize the skill."""
        self._enabled = True

    @property
    @abstractmethod
    def skill_id(self) -> str:
        """Unique identifier for this skill.

        Returns:
            Skill ID string (e.g., "code-review", "testing-strategy")
        """
        pass

    @property
    @abstractmethod
    def skill_name(self) -> str:
        """Human-readable name for this skill.

        Returns:
            Skill name (e.g., "Code Review", "Testing Strategy")
        """
        pass

    @property
    def version(self) -> str:
        """Skill version string.

        Returns:
            Version in semver format (default: "1.0.0")
        """
        return "1.0.0"

    @property
    def enabled(self) -> bool:
        """Check if skill is enabled.

        Returns:
            True if skill is enabled
        """
        return self._enabled

    def enable(self) -> None:
        """Enable the skill."""
        self._enabled = True

    def disable(self) -> None:
        """Disable the skill."""
        self._enabled = False

    @abstractmethod
    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the skill with given context.

        Args:
            context: Execution context containing:
                - user_request: str (the original user request)
                - project_path: str (path to project)
                - agent_context: dict (additional context from orchestrator)

        Returns:
            Result dictionary containing:
                - success: bool
                - result: Any (skill-specific result)
                - message: str (human-readable message)
                - metadata: dict (additional metadata)
        """
        pass

    def validate_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that context has required fields.

        Args:
            context: Context dictionary

        Returns:
            Dict with:
                - valid: bool (True if context is valid)
                - error: str (error message if invalid, None if valid)
        """
        required = ["user_request"]
        missing = [k for k in required if k not in context]
        if missing:
            return {
                "valid": False,
                "error": f"Missing required fields: {', '.join(missing)}"
            }
        return {"valid": True, "error": None}

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute skill with automatic context validation.

        This method wraps execute() with validation and error handling.
        Subclasses should override execute(), not this method.

        Args:
            context: Execution context

        Returns:
            Result dictionary (success, validation error, or execution error)
        """
        # Validate context first
        validation = self.validate_context(context)
        if not validation.get("valid", True):
            return SkillResult.error_result(
                message=validation.get("error", "Invalid context"),
                metadata={"error_type": "ValidationError"}
            ).to_dict()

        # Check if skill is enabled
        if not self.enabled:
            return SkillResult.error_result(
                message=f"Skill '{self.skill_id}' is disabled",
                metadata={"error_type": "SkillDisabledError"}
            ).to_dict()

        # Execute the skill with error handling
        try:
            return self.execute(context)
        except Exception as e:
            return SkillResult.error_result(
                message=f"Skill execution failed: {str(e)}",
                metadata={
                    "error_type": "ExecutionError",
                    "exception_type": type(e).__name__
                }
            ).to_dict()

    def get_help(self) -> str:
        """Get help text for this skill.

        Returns:
            Help text string
        """
        return f"{self.skill_name} (v{self.version})\n{self.skill_id}"

    def get_manifest(self) -> Dict[str, Any]:
        """Get skill manifest for registration.

        Returns:
            Manifest dictionary
        """
        return {
            "skill_id": self.skill_id,
            "name": self.skill_name,
            "version": self.version,
            "enabled": self.enabled,
            "interface": "SkillInterface",
            "help": self.get_help()
        }


class SkillResult:
    """Standardized skill result container."""

    def __init__(self, success: bool, result: Any = None,
                 message: str = "", metadata: Optional[Dict] = None):
        """Initialize skill result.

        Args:
            success: Whether execution was successful
            result: Skill-specific result data
            message: Human-readable message
            metadata: Additional metadata
        """
        self.success = success
        self.result = result
        self.message = message
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary.

        Returns:
            Dictionary representation
        """
        return {
            "success": self.success,
            "result": self.result,
            "message": self.message,
            "metadata": self.metadata
        }

    @classmethod
    def success_result(cls, result: Any = None, message: str = "",
                      metadata: Optional[Dict] = None) -> "SkillResult":
        """Create a successful result.

        Args:
            result: Result data
            message: Success message
            metadata: Additional metadata

        Returns:
            SkillResult with success=True
        """
        return cls(success=True, result=result, message=message, metadata=metadata)

    @classmethod
    def error_result(cls, message: str, result: Any = None,
                    metadata: Optional[Dict] = None) -> "SkillResult":
        """Create an error result.

        Args:
            message: Error message
            result: Optional result data
            metadata: Additional metadata

        Returns:
            SkillResult with success=False
        """
        return cls(success=False, result=result, message=message, metadata=metadata)
