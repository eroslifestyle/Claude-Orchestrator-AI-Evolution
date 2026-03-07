"""Tests for skill_interface.py - V14.0.3.

Comprehensive test coverage for SkillInterface and SkillResult classes.
"""

import pytest
from abc import ABC
from typing import Dict, Any

from lib.skill_interface import SkillInterface, SkillResult


# ============================================================================
# Concrete Implementation for Testing
# ============================================================================

class MockSkill(SkillInterface):
    """Concrete skill implementation for testing."""

    def __init__(self, skill_id_val: str = "test-skill", skill_name_val: str = "Test Skill"):
        super().__init__()
        self._skill_id = skill_id_val
        self._skill_name = skill_name_val
        self.execute_called = False
        self.last_context = None

    @property
    def skill_id(self) -> str:
        return self._skill_id

    @property
    def skill_name(self) -> str:
        return self._skill_name

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.execute_called = True
        self.last_context = context
        return SkillResult.success_result(
            result={"processed": True},
            message="Execution successful",
            metadata={"test": True}
        ).to_dict()


class FailingSkill(SkillInterface):
    """Skill that raises exception on execute."""

    @property
    def skill_id(self) -> str:
        return "failing-skill"

    @property
    def skill_name(self) -> str:
        return "Failing Skill"

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        raise RuntimeError("Intentional failure for testing")


# ============================================================================
# SkillInterface Tests
# ============================================================================

class TestSkillInterfaceAbstract:
    """Test abstract properties and methods."""

    def test_cannot_instantiate_abstract_class(self):
        """SkillInterface should not be directly instantiable."""
        with pytest.raises(TypeError):
            SkillInterface()

    def test_is_abstract(self):
        """SkillInterface should be abstract."""
        assert issubclass(SkillInterface, ABC)

    def test_subclass_must_implement_skill_id(self):
        """Subclass must implement skill_id property."""
        class IncompleteSkill(SkillInterface):
            @property
            def skill_name(self) -> str:
                return "Incomplete"

            def execute(self, context):
                return {}

        with pytest.raises(TypeError):
            IncompleteSkill()

    def test_subclass_must_implement_skill_name(self):
        """Subclass must implement skill_name property."""
        class IncompleteSkill(SkillInterface):
            @property
            def skill_id(self) -> str:
                return "incomplete"

            def execute(self, context):
                return {}

        with pytest.raises(TypeError):
            IncompleteSkill()

    def test_subclass_must_implement_execute(self):
        """Subclass must implement execute method."""
        class IncompleteSkill(SkillInterface):
            @property
            def skill_id(self) -> str:
                return "incomplete"

            @property
            def skill_name(self) -> str:
                return "Incomplete"

        with pytest.raises(TypeError):
            IncompleteSkill()


class TestSkillInterfaceProperties:
    """Test skill properties."""

    def test_skill_id(self):
        """Test skill_id property returns correct value."""
        skill = MockSkill(skill_id_val="my-skill-id")
        assert skill.skill_id == "my-skill-id"

    def test_skill_name(self):
        """Test skill_name property returns correct value."""
        skill = MockSkill(skill_name_val="My Custom Skill")
        assert skill.skill_name == "My Custom Skill"

    def test_version_default(self):
        """Test default version is 1.0.0."""
        skill = MockSkill()
        assert skill.version == "1.0.0"

    def test_enabled_default(self):
        """Test skill is enabled by default."""
        skill = MockSkill()
        assert skill.enabled is True


class TestSkillInterfaceEnableDisable:
    """Test enable/disable functionality."""

    def test_disable_skill(self):
        """Test disabling a skill."""
        skill = MockSkill()
        skill.disable()
        assert skill.enabled is False

    def test_enable_skill(self):
        """Test enabling a skill."""
        skill = MockSkill()
        skill.disable()
        skill.enable()
        assert skill.enabled is True

    def test_enable_already_enabled(self):
        """Test enabling an already enabled skill."""
        skill = MockSkill()
        skill.enable()
        assert skill.enabled is True

    def test_disable_already_disabled(self):
        """Test disabling an already disabled skill."""
        skill = MockSkill()
        skill.disable()
        skill.disable()
        assert skill.enabled is False

    def test_toggle_multiple_times(self):
        """Test toggling enabled state multiple times."""
        skill = MockSkill()
        skill.disable()
        assert skill.enabled is False
        skill.enable()
        assert skill.enabled is True
        skill.disable()
        assert skill.enabled is False
        skill.enable()
        assert skill.enabled is True


class TestSkillInterfaceValidateContext:
    """Test context validation."""

    def test_validate_context_with_user_request(self):
        """Context with user_request is valid."""
        skill = MockSkill()
        result = skill.validate_context({"user_request": "test"})
        assert result["valid"] is True
        assert result["error"] is None

    def test_validate_context_without_user_request(self):
        """Context without user_request is invalid."""
        skill = MockSkill()
        result = skill.validate_context({"other_field": "value"})
        assert result["valid"] is False
        assert "user_request" in result["error"]

    def test_validate_context_empty(self):
        """Empty context is invalid."""
        skill = MockSkill()
        result = skill.validate_context({})
        assert result["valid"] is False

    def test_validate_context_with_extra_fields(self):
        """Extra fields don't invalidate context."""
        skill = MockSkill()
        result = skill.validate_context({
            "user_request": "test",
            "extra": "field",
            "another": 123
        })
        assert result["valid"] is True


class TestSkillInterfaceRun:
    """Test run method with validation."""

    def test_run_with_valid_context(self):
        """Run with valid context executes successfully."""
        skill = MockSkill()
        result = skill.run({"user_request": "test"})
        assert result["success"] is True
        assert skill.execute_called is True

    def test_run_with_invalid_context(self):
        """Run with invalid context returns error."""
        skill = MockSkill()
        result = skill.run({})
        assert result["success"] is False
        assert "ValidationError" in result["metadata"].get("error_type", "")
        assert skill.execute_called is False

    def test_run_when_disabled(self):
        """Run when skill is disabled returns error."""
        skill = MockSkill()
        skill.disable()
        result = skill.run({"user_request": "test"})
        assert result["success"] is False
        assert "disabled" in result["message"].lower()
        assert skill.execute_called is False

    def test_run_passes_context_to_execute(self):
        """Run passes context to execute method."""
        skill = MockSkill()
        context = {"user_request": "test", "extra": "data"}
        skill.run(context)
        assert skill.last_context == context

    def test_run_handles_exception(self):
        """Run catches exceptions and returns error."""
        skill = FailingSkill()
        result = skill.run({"user_request": "test"})
        assert result["success"] is False
        assert "ExecutionError" in result["metadata"].get("error_type", "")
        assert "RuntimeError" in result["metadata"].get("exception_type", "")


class TestSkillInterfaceGetHelp:
    """Test get_help method."""

    def test_get_help_format(self):
        """Test help text format."""
        skill = MockSkill(skill_name_val="My Skill")
        help_text = skill.get_help()
        assert "My Skill" in help_text
        assert "1.0.0" in help_text

    def test_get_help_includes_skill_id(self):
        """Test help text includes skill ID."""
        skill = MockSkill(skill_id_val="my-skill-id")
        help_text = skill.get_help()
        assert "my-skill-id" in help_text


class TestSkillInterfaceGetManifest:
    """Test get_manifest method."""

    def test_get_manifest_structure(self):
        """Test manifest has required fields."""
        skill = MockSkill(skill_id_val="test-id", skill_name_val="Test Name")
        manifest = skill.get_manifest()

        assert manifest["skill_id"] == "test-id"
        assert manifest["name"] == "Test Name"
        assert manifest["version"] == "1.0.0"
        assert manifest["enabled"] is True
        assert manifest["interface"] == "SkillInterface"
        assert "help" in manifest

    def test_get_manifest_reflects_disabled_state(self):
        """Test manifest reflects disabled state."""
        skill = MockSkill()
        skill.disable()
        manifest = skill.get_manifest()
        assert manifest["enabled"] is False

    def test_get_manifest_reflects_enabled_state(self):
        """Test manifest reflects enabled state."""
        skill = MockSkill()
        manifest = skill.get_manifest()
        assert manifest["enabled"] is True


# ============================================================================
# SkillResult Tests
# ============================================================================

class TestSkillResultInit:
    """Test SkillResult initialization."""

    def test_init_success_true(self):
        """Test init with success=True."""
        result = SkillResult(success=True)
        assert result.success is True
        assert result.result is None
        assert result.message == ""
        assert result.metadata == {}

    def test_init_success_false(self):
        """Test init with success=False."""
        result = SkillResult(success=False)
        assert result.success is False

    def test_init_with_result(self):
        """Test init with result data."""
        result = SkillResult(success=True, result={"data": 123})
        assert result.result == {"data": 123}

    def test_init_with_message(self):
        """Test init with message."""
        result = SkillResult(success=True, message="Test message")
        assert result.message == "Test message"

    def test_init_with_metadata(self):
        """Test init with metadata."""
        result = SkillResult(success=True, metadata={"key": "value"})
        assert result.metadata == {"key": "value"}

    def test_init_metadata_defaults_to_empty_dict(self):
        """Test metadata defaults to empty dict."""
        result = SkillResult(success=True)
        assert result.metadata == {}


class TestSkillResultToDict:
    """Test to_dict method."""

    def test_to_dict_basic(self):
        """Test to_dict with basic values."""
        result = SkillResult(success=True, message="test")
        d = result.to_dict()
        assert d["success"] is True
        assert d["result"] is None
        assert d["message"] == "test"
        assert d["metadata"] == {}

    def test_to_dict_with_all_fields(self):
        """Test to_dict with all fields populated."""
        result = SkillResult(
            success=True,
            result={"processed": True},
            message="Success",
            metadata={"duration_ms": 100}
        )
        d = result.to_dict()
        assert d["success"] is True
        assert d["result"] == {"processed": True}
        assert d["message"] == "Success"
        assert d["metadata"]["duration_ms"] == 100

    def test_to_dict_with_none_result(self):
        """Test to_dict with None result."""
        result = SkillResult(success=False, result=None)
        d = result.to_dict()
        assert d["result"] is None


class TestSkillResultSuccessResult:
    """Test success_result factory method."""

    def test_success_result_basic(self):
        """Test success_result with no args."""
        result = SkillResult.success_result()
        assert result.success is True
        assert result.result is None
        assert result.message == ""

    def test_success_result_with_result(self):
        """Test success_result with result data."""
        result = SkillResult.success_result(result={"data": 123})
        assert result.result == {"data": 123}

    def test_success_result_with_message(self):
        """Test success_result with message."""
        result = SkillResult.success_result(message="Operation succeeded")
        assert result.message == "Operation succeeded"

    def test_success_result_with_metadata(self):
        """Test success_result with metadata."""
        result = SkillResult.success_result(metadata={"count": 5})
        assert result.metadata == {"count": 5}

    def test_success_result_with_all_args(self):
        """Test success_result with all arguments."""
        result = SkillResult.success_result(
            result={"id": 1},
            message="Created",
            metadata={"status": "created"}
        )
        assert result.success is True
        assert result.result == {"id": 1}
        assert result.message == "Created"
        assert result.metadata["status"] == "created"


class TestSkillResultErrorResult:
    """Test error_result factory method."""

    def test_error_result_basic(self):
        """Test error_result with message only."""
        result = SkillResult.error_result(message="Something failed")
        assert result.success is False
        assert result.message == "Something failed"
        assert result.result is None

    def test_error_result_with_result(self):
        """Test error_result with partial result."""
        result = SkillResult.error_result(
            message="Partial failure",
            result={"partial": True}
        )
        assert result.success is False
        assert result.result == {"partial": True}

    def test_error_result_with_metadata(self):
        """Test error_result with metadata."""
        result = SkillResult.error_result(
            message="Error",
            metadata={"error_code": "E001"}
        )
        assert result.metadata == {"error_code": "E001"}

    def test_error_result_with_all_args(self):
        """Test error_result with all arguments."""
        result = SkillResult.error_result(
            message="Validation failed",
            result={"errors": ["field1", "field2"]},
            metadata={"error_type": "ValidationError"}
        )
        assert result.success is False
        assert result.message == "Validation failed"
        assert result.result == {"errors": ["field1", "field2"]}
        assert result.metadata["error_type"] == "ValidationError"


class TestSkillResultEdgeCases:
    """Test edge cases."""

    def test_result_with_complex_types(self):
        """Test result with complex data types."""
        data = {
            "list": [1, 2, 3],
            "nested": {"a": {"b": {"c": 1}}},
            "mixed": [1, "two", {"three": 3}]
        }
        result = SkillResult.success_result(result=data)
        assert result.result == data

    def test_metadata_with_complex_types(self):
        """Test metadata with complex types."""
        metadata = {
            "list": [1, 2, 3],
            "dict": {"key": "value"},
            "nested": {"a": [1, 2, {"b": 3}]}
        }
        result = SkillResult.success_result(metadata=metadata)
        assert result.metadata == metadata

    def test_empty_string_message(self):
        """Test with empty string message."""
        result = SkillResult(success=True, message="")
        assert result.message == ""

    def test_long_message(self):
        """Test with long message."""
        long_msg = "A" * 1000
        result = SkillResult(success=True, message=long_msg)
        assert result.message == long_msg
