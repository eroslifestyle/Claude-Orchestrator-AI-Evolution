"""Tests for skill_plugin.py - V14.0.3.

Comprehensive test coverage for SkillPluginLoader and SkillMdWrapper.
"""

import pytest
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock
import time

from lib.skill_plugin import (
    SkillPluginLoader,
    SkillMdWrapper,
    create_skill_plugin
)
from lib.skill_interface import SkillInterface, SkillResult


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def temp_skills_dir(tmp_path):
    """Create a temporary skills directory."""
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()
    return skills_dir


@pytest.fixture
def temp_manifest_path(tmp_path):
    """Create a temporary manifest path."""
    return tmp_path / "skills_manifest.json"


@pytest.fixture
def sample_skill_dir(temp_skills_dir):
    """Create a sample skill directory with SKILL.md."""
    skill_dir = temp_skills_dir / "test-skill"
    skill_dir.mkdir()

    skill_md = """# TEST SKILL V1.0

This is a test skill for unit testing.

## ALGORITHM

1. Step one
2. Step two
3. Step three

## CONFIGURATION

| Setting | Default | Description |
|---------|---------|-------------|
| debug | false | Debug mode |
"""
    (skill_dir / "SKILL.md").write_text(skill_md)
    return skill_dir


@pytest.fixture
def loader(temp_skills_dir, temp_manifest_path):
    """Create a SkillPluginLoader with temporary directories."""
    return SkillPluginLoader(
        skills_dir=str(temp_skills_dir),
        manifest_path=str(temp_manifest_path)
    )


# ============================================================================
# SkillMdWrapper Tests
# ============================================================================

class TestSkillMdWrapperInit:
    """Test SkillMdWrapper initialization."""

    def test_init_basic(self, sample_skill_dir):
        """Test basic initialization."""
        metadata = {"name": "Test", "description": "Test skill"}
        wrapper = SkillMdWrapper("test-skill", sample_skill_dir, metadata)
        assert wrapper.skill_id == "test-skill"
        assert wrapper._skill_dir == sample_skill_dir

    def test_skill_id_property(self, sample_skill_dir):
        """Test skill_id property."""
        metadata = {}
        wrapper = SkillMdWrapper("my-skill-id", sample_skill_dir, metadata)
        assert wrapper.skill_id == "my-skill-id"

    def test_skill_name_from_metadata(self, sample_skill_dir):
        """Test skill_name from metadata."""
        metadata = {"name": "My Custom Skill"}
        wrapper = SkillMdWrapper("test", sample_skill_dir, metadata)
        assert wrapper.skill_name == "My Custom Skill"

    def test_skill_name_default_to_id(self, sample_skill_dir):
        """Test skill_name defaults to skill_id."""
        metadata = {}
        wrapper = SkillMdWrapper("test-skill", sample_skill_dir, metadata)
        assert wrapper.skill_name == "test-skill"

    def test_description_from_metadata(self, sample_skill_dir):
        """Test description from metadata."""
        metadata = {"description": "A test skill"}
        wrapper = SkillMdWrapper("test", sample_skill_dir, metadata)
        assert wrapper.description == "A test skill"

    def test_instructions_from_metadata(self, sample_skill_dir):
        """Test instructions from metadata."""
        metadata = {"instructions": "Do this, then that"}
        wrapper = SkillMdWrapper("test", sample_skill_dir, metadata)
        assert wrapper._instructions == "Do this, then that"


class TestSkillMdWrapperEnabled:
    """Test SkillMdWrapper enable/disable."""

    def test_enabled_default(self, sample_skill_dir):
        """Test enabled by default."""
        wrapper = SkillMdWrapper("test", sample_skill_dir, {})
        assert wrapper.enabled is True

    def test_enabled_setter(self, sample_skill_dir):
        """Test enabled setter."""
        wrapper = SkillMdWrapper("test", sample_skill_dir, {})
        wrapper.enabled = False
        assert wrapper.enabled is False

    def test_enabled_toggle(self, sample_skill_dir):
        """Test toggling enabled."""
        wrapper = SkillMdWrapper("test", sample_skill_dir, {})
        wrapper.enabled = False
        assert wrapper.enabled is False
        wrapper.enabled = True
        assert wrapper.enabled is True


class TestSkillMdWrapperValidateContext:
    """Test SkillMdWrapper validate_context."""

    def test_validate_context_with_user_request(self, sample_skill_dir):
        """Test valid context with user_request."""
        wrapper = SkillMdWrapper("test", sample_skill_dir, {})
        result = wrapper.validate_context({"user_request": "test"})
        assert result["valid"] is True
        assert result["error"] is None

    def test_validate_context_without_user_request(self, sample_skill_dir):
        """Test invalid context without user_request."""
        wrapper = SkillMdWrapper("test", sample_skill_dir, {})
        result = wrapper.validate_context({})
        assert result["valid"] is False
        assert "user_request" in result["error"].lower()

    def test_validate_context_with_custom_required(self, sample_skill_dir):
        """Test custom required fields."""
        metadata = {"required_context": ["user_request", "project_path"]}
        wrapper = SkillMdWrapper("test", sample_skill_dir, metadata)
        result = wrapper.validate_context({"user_request": "test"})
        assert result["valid"] is False
        assert "project_path" in result["error"]


class TestSkillMdWrapperExecute:
    """Test SkillMdWrapper execute."""

    def test_execute_returns_success(self, sample_skill_dir):
        """Test execute returns success."""
        metadata = {"instructions": "Test instructions"}
        wrapper = SkillMdWrapper("test-skill", sample_skill_dir, metadata)
        result = wrapper.execute({"user_request": "test"})

        assert result["success"] is True
        assert result["skill_id"] == "test-skill"
        assert "instructions" in result

    def test_execute_includes_skill_name(self, sample_skill_dir):
        """Test execute includes skill name."""
        metadata = {"name": "My Skill"}
        wrapper = SkillMdWrapper("test", sample_skill_dir, metadata)
        result = wrapper.execute({"user_request": "test"})

        assert result["skill_name"] == "My Skill"

    def test_execute_includes_context(self, sample_skill_dir):
        """Test execute includes context."""
        wrapper = SkillMdWrapper("test", sample_skill_dir, {})
        context = {"user_request": "test", "extra": "data"}
        result = wrapper.execute(context)

        assert result["context"] == context

    def test_execute_includes_description(self, sample_skill_dir):
        """Test execute includes description."""
        metadata = {"description": "Test description"}
        wrapper = SkillMdWrapper("test", sample_skill_dir, metadata)
        result = wrapper.execute({"user_request": "test"})

        assert result["description"] == "Test description"

    def test_execute_includes_algorithm(self, sample_skill_dir):
        """Test execute includes algorithm."""
        metadata = {"algorithm": "1. Do this\n2. Do that"}
        wrapper = SkillMdWrapper("test", sample_skill_dir, metadata)
        result = wrapper.execute({"user_request": "test"})

        assert result["algorithm"] == "1. Do this\n2. Do that"


class TestSkillMdWrapperGetHelp:
    """Test SkillMdWrapper get_help."""

    def test_get_help_includes_name(self, sample_skill_dir):
        """Test help includes skill name."""
        metadata = {"name": "Test Skill"}
        wrapper = SkillMdWrapper("test", sample_skill_dir, metadata)
        help_text = wrapper.get_help()

        assert "Test Skill" in help_text

    def test_get_help_includes_description(self, sample_skill_dir):
        """Test help includes description."""
        metadata = {"name": "Test", "description": "A test skill"}
        wrapper = SkillMdWrapper("test", sample_skill_dir, metadata)
        help_text = wrapper.get_help()

        assert "A test skill" in help_text


# ============================================================================
# SkillPluginLoader Tests
# ============================================================================

class TestSkillPluginLoaderInit:
    """Test SkillPluginLoader initialization."""

    def test_init_with_paths(self, temp_skills_dir, temp_manifest_path):
        """Test initialization with explicit paths."""
        loader = SkillPluginLoader(
            skills_dir=str(temp_skills_dir),
            manifest_path=str(temp_manifest_path)
        )
        assert loader.skills_dir == temp_skills_dir
        assert loader.manifest_path == temp_manifest_path

    def test_init_default_paths(self):
        """Test initialization with default paths."""
        loader = SkillPluginLoader()
        assert loader.skills_dir.name == "skills"
        assert loader.manifest_path.name == "skills_manifest.json"

    def test_init_creates_manifest_if_missing(self, temp_skills_dir, temp_manifest_path):
        """Test creates manifest file if missing."""
        assert not temp_manifest_path.exists()
        SkillPluginLoader(
            skills_dir=str(temp_skills_dir),
            manifest_path=str(temp_manifest_path)
        )
        assert temp_manifest_path.exists()

    def test_init_loads_existing_manifest(self, temp_skills_dir, temp_manifest_path):
        """Test loads existing manifest."""
        manifest_data = {
            "version": "2.0.0",
            "skills": {"existing-skill": {"module": "test"}}
        }
        temp_manifest_path.write_text(json.dumps(manifest_data))

        loader = SkillPluginLoader(
            skills_dir=str(temp_skills_dir),
            manifest_path=str(temp_manifest_path)
        )
        assert loader.get_manifest()["version"] == "2.0.0"


class TestSkillPluginLoaderDiscoverSkills:
    """Test discover_skills method."""

    def test_discover_empty_dir(self, loader):
        """Test discovery in empty directory."""
        discovered = loader.discover_skills()
        assert discovered == []

    def test_discover_single_skill(self, loader, sample_skill_dir):
        """Test discovery of single skill."""
        discovered = loader.discover_skills()
        assert "test-skill" in discovered

    def test_discover_multiple_skills(self, loader, temp_skills_dir):
        """Test discovery of multiple skills."""
        # Create multiple skill directories
        for name in ["skill-a", "skill-b", "skill-c"]:
            skill_dir = temp_skills_dir / name
            skill_dir.mkdir()
            (skill_dir / "SKILL.md").write_text(f"# {name}")

        discovered = loader.discover_skills()
        assert len(discovered) == 3
        assert "skill-a" in discovered
        assert "skill-b" in discovered
        assert "skill-c" in discovered

    def test_discover_ignores_hidden_dirs(self, loader, temp_skills_dir):
        """Test ignores hidden directories."""
        hidden_dir = temp_skills_dir / ".hidden"
        hidden_dir.mkdir()
        (hidden_dir / "SKILL.md").write_text("# Hidden")

        discovered = loader.discover_skills()
        assert ".hidden" not in discovered

    def test_discover_ignores_dirs_without_skill_md(self, loader, temp_skills_dir):
        """Test ignores directories without SKILL.md."""
        no_skill_dir = temp_skills_dir / "no-skill"
        no_skill_dir.mkdir()

        discovered = loader.discover_skills()
        assert "no-skill" not in discovered


class TestSkillPluginLoaderLoadSkill:
    """Test load_skill method."""

    def test_load_skill_from_skill_md(self, loader, sample_skill_dir):
        """Test loading skill from SKILL.md."""
        skill = loader.load_skill("test-skill")
        assert skill is not None
        assert skill.skill_id == "test-skill"

    def test_load_skill_nonexistent(self, loader):
        """Test loading nonexistent skill returns None."""
        skill = loader.load_skill("nonexistent")
        assert skill is None

    def test_load_skill_caches_instance(self, loader, sample_skill_dir):
        """Test loading same skill returns cached instance."""
        skill1 = loader.load_skill("test-skill")
        skill2 = loader.load_skill("test-skill")
        assert skill1 is skill2

    def test_load_skill_is_loaded(self, loader, sample_skill_dir):
        """Test is_loaded reflects skill state."""
        assert not loader.is_loaded("test-skill")
        loader.load_skill("test-skill")
        assert loader.is_loaded("test-skill")


class TestSkillPluginLoaderParseSkillMd:
    """Test _parse_skill_md method."""

    def test_parse_extracts_title(self, loader, temp_skills_dir):
        """Test extracts title from heading."""
        skill_dir = temp_skills_dir / "parse-test"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("# MY SKILL V1.0\n\nDescription here.")

        metadata = loader._parse_skill_md(skill_dir)
        assert metadata["name"] == "MY SKILL V1.0"

    def test_parse_extracts_description(self, loader, temp_skills_dir):
        """Test extracts description after title."""
        skill_dir = temp_skills_dir / "parse-test"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(
            "# Title\n\nThis is the description.\n\n## Section"
        )

        metadata = loader._parse_skill_md(skill_dir)
        assert "This is the description" in metadata["description"]

    def test_parse_extracts_algorithm(self, loader, temp_skills_dir):
        """Test extracts ALGORITHM section."""
        skill_dir = temp_skills_dir / "parse-test"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(
            "# Title\n\nDescription\n\n## ALGORITHM\n\n1. Step one\n2. Step two\n\n## OTHER"
        )

        metadata = loader._parse_skill_md(skill_dir)
        assert "Step one" in metadata["algorithm"]
        assert "Step two" in metadata["algorithm"]

    def test_parse_handles_missing_algorithm(self, loader, temp_skills_dir):
        """Test handles missing ALGORITHM section."""
        skill_dir = temp_skills_dir / "parse-test"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("# Title\n\nDescription")

        metadata = loader._parse_skill_md(skill_dir)
        assert metadata["algorithm"] == ""

    def test_parse_handles_io_error(self, loader, temp_skills_dir):
        """Test handles IO errors gracefully."""
        skill_dir = temp_skills_dir / "parse-test"
        skill_dir.mkdir()
        # Create SKILL.md as a directory to cause IO error
        (skill_dir / "SKILL.md").mkdir()

        metadata = loader._parse_skill_md(skill_dir)
        assert metadata is None

    def test_parse_missing_skill_md(self, loader, temp_skills_dir):
        """Test returns None for missing SKILL.md."""
        skill_dir = temp_skills_dir / "parse-test"
        skill_dir.mkdir()
        # No SKILL.md created

        metadata = loader._parse_skill_md(skill_dir)
        assert metadata is None


class TestSkillPluginLoaderReloadSkill:
    """Test reload_skill method."""

    def test_reload_skill(self, loader, sample_skill_dir):
        """Test reloading a skill."""
        skill1 = loader.load_skill("test-skill")
        skill2 = loader.reload_skill("test-skill")
        assert skill2 is not None
        # Should be different instances after reload
        assert skill1 is not skill2

    def test_reload_nonexistent_skill(self, loader):
        """Test reloading nonexistent skill returns None."""
        result = loader.reload_skill("nonexistent")
        assert result is None

    def test_reload_calls_cleanup(self, loader, sample_skill_dir):
        """Test reload calls cleanup on old instance."""
        skill = loader.load_skill("test-skill")
        # Add cleanup method to track calls
        skill.cleanup_called = False
        def mock_cleanup():
            skill.cleanup_called = True
        skill.cleanup = mock_cleanup

        loader.reload_skill("test-skill")
        assert skill.cleanup_called is True

    def test_reload_handles_cleanup_exception(self, loader, sample_skill_dir):
        """Test reload handles cleanup exceptions."""
        skill = loader.load_skill("test-skill")
        def failing_cleanup():
            raise RuntimeError("Cleanup failed")
        skill.cleanup = failing_cleanup

        # Should not raise
        result = loader.reload_skill("test-skill")
        assert result is not None

    def test_reload_tracks_cleanup_failures(self, loader, sample_skill_dir):
        """Test reload tracks cleanup failures."""
        skill = loader.load_skill("test-skill")
        def failing_cleanup():
            raise RuntimeError("Cleanup failed")
        skill.cleanup = failing_cleanup

        loader.reload_skill("test-skill")
        failures = loader.get_cleanup_failures()
        assert len(failures) == 1
        assert failures[0]["skill_id"] == "test-skill"


class TestSkillPluginLoaderRegisterSkill:
    """Test register_skill method."""

    def test_register_skill(self, loader):
        """Test registering a skill."""
        result = loader.register_skill(
            skill_id="new-skill",
            module="skills.new_skill",
            class_name="NewSkill"
        )
        assert result is True

        manifest = loader.get_manifest()
        assert "new-skill" in manifest["skills"]
        assert manifest["skills"]["new-skill"]["module"] == "skills.new_skill"

    def test_register_skill_default_class_name(self, loader):
        """Test registering with default class name."""
        loader.register_skill("test", "module.path")
        manifest = loader.get_manifest()
        assert manifest["skills"]["test"]["class_name"] == "Skill"

    def test_register_skill_includes_timestamp(self, loader):
        """Test registration includes timestamp."""
        loader.register_skill("test", "module")
        manifest = loader.get_manifest()
        assert "registered_at" in manifest["skills"]["test"]

    def test_register_skill_persists(self, loader, temp_manifest_path):
        """Test registration persists to disk."""
        loader.register_skill("persistent", "module.path")

        # Create new loader to test persistence
        loader2 = SkillPluginLoader(
            skills_dir=str(loader.skills_dir),
            manifest_path=str(temp_manifest_path)
        )
        manifest = loader2.get_manifest()
        assert "persistent" in manifest["skills"]


class TestSkillPluginLoaderUnregisterSkill:
    """Test unregister_skill method."""

    def test_unregister_skill(self, loader):
        """Test unregistering a skill."""
        loader.register_skill("to-remove", "module")
        result = loader.unregister_skill("to-remove")
        assert result is True

        manifest = loader.get_manifest()
        assert "to-remove" not in manifest["skills"]

    def test_unregister_nonexistent(self, loader):
        """Test unregistering nonexistent skill."""
        result = loader.unregister_skill("nonexistent")
        assert result is False

    def test_unregister_unloads_instance(self, loader, sample_skill_dir):
        """Test unregister unloads cached instance."""
        loader.load_skill("test-skill")
        loader.register_skill("test-skill", "module")
        loader.unregister_skill("test-skill")

        assert not loader.is_loaded("test-skill")


class TestSkillPluginLoaderListMethods:
    """Test list methods."""

    def test_list_loaded_empty(self, loader):
        """Test list_loaded when empty."""
        result = loader.list_loaded()
        assert result == []

    def test_list_loaded_with_skills(self, loader, sample_skill_dir):
        """Test list_loaded with loaded skills."""
        loader.load_skill("test-skill")
        result = loader.list_loaded()
        assert "test-skill" in result

    def test_list_available_empty(self, loader):
        """Test list_available when empty."""
        result = loader.list_available()
        assert result == []

    def test_list_available_with_registered(self, loader):
        """Test list_available with registered skills."""
        loader.register_skill("skill-a", "module")
        loader.register_skill("skill-b", "module")
        result = loader.list_available()
        assert "skill-a" in result
        assert "skill-b" in result


class TestSkillPluginLoaderGetMethods:
    """Test get methods."""

    def test_get_skill_loaded(self, loader, sample_skill_dir):
        """Test get_skill for loaded skill."""
        loaded = loader.load_skill("test-skill")
        result = loader.get_skill("test-skill")
        assert result is loaded

    def test_get_skill_not_loaded(self, loader):
        """Test get_skill for not loaded skill."""
        result = loader.get_skill("nonexistent")
        assert result is None

    def test_get_manifest_copy(self, loader):
        """Test get_manifest returns copy."""
        manifest1 = loader.get_manifest()
        manifest1["modified"] = True
        manifest2 = loader.get_manifest()
        assert "modified" not in manifest2


class TestSkillPluginLoaderCleanupFailures:
    """Test cleanup failure tracking."""

    def test_get_cleanup_failures_empty(self, loader):
        """Test get_cleanup_failures when empty."""
        result = list(loader.get_cleanup_failures())
        assert result == []

    def test_clear_cleanup_failures(self, loader, sample_skill_dir):
        """Test clear_cleanup_failures."""
        skill = loader.load_skill("test-skill")
        skill.cleanup = lambda: (_ for _ in ()).throw(RuntimeError("fail"))
        loader.reload_skill("test-skill")

        assert len(loader.get_cleanup_failures()) == 1
        loader.clear_cleanup_failures()
        assert len(loader.get_cleanup_failures()) == 0


# ============================================================================
# create_skill_plugin Factory Tests
# ============================================================================

class TestCreateSkillPlugin:
    """Test create_skill_plugin factory function."""

    def test_creates_skill_class(self):
        """Test creates a skill class."""
        def execute_fn(context):
            return {"success": True, "result": "done"}

        SkillClass = create_skill_plugin("test-id", "Test Skill", execute_fn)
        assert issubclass(SkillClass, SkillInterface)

    def test_skill_id(self):
        """Test skill_id is set correctly."""
        def execute_fn(context):
            return {}

        SkillClass = create_skill_plugin("my-id", "My Skill", execute_fn)
        skill = SkillClass()
        assert skill.skill_id == "my-id"

    def test_skill_name(self):
        """Test skill_name is set correctly."""
        def execute_fn(context):
            return {}

        SkillClass = create_skill_plugin("id", "My Skill Name", execute_fn)
        skill = SkillClass()
        assert skill.skill_name == "My Skill Name"

    def test_execute_calls_function(self):
        """Test execute calls the provided function."""
        call_log = []
        def execute_fn(context):
            call_log.append(context)
            return {"success": True}

        SkillClass = create_skill_plugin("id", "Name", execute_fn)
        skill = SkillClass()
        result = skill.execute({"test": "data"})

        assert len(call_log) == 1
        assert call_log[0] == {"test": "data"}
        assert result["success"] is True

    def test_execute_returns_function_result(self):
        """Test execute returns function result directly."""
        def execute_fn(context):
            return {"custom": "result", "data": 123}

        SkillClass = create_skill_plugin("id", "Name", execute_fn)
        skill = SkillClass()
        result = skill.execute({})

        assert result == {"custom": "result", "data": 123}


# ============================================================================
# Integration Tests
# ============================================================================

class TestSkillPluginLoaderIntegration:
    """Integration tests for SkillPluginLoader."""

    def test_full_lifecycle(self, loader, temp_skills_dir):
        """Test full skill lifecycle: discover, load, use, unload."""
        # Create skill
        skill_dir = temp_skills_dir / "lifecycle-test"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text(
            "# Lifecycle Skill\n\nA skill for testing.\n\n## ALGORITHM\n\n1. Test"
        )

        # Discover
        discovered = loader.discover_skills()
        assert "lifecycle-test" in discovered

        # Load
        skill = loader.load_skill("lifecycle-test")
        assert skill is not None
        assert skill.skill_name == "Lifecycle Skill"

        # Execute
        result = skill.execute({"user_request": "test"})
        assert result["success"] is True

        # Unload via reload with cleanup (simulates unload)
        loader.reload_skill("lifecycle-test")
        # Skill should still be loaded (reload loads fresh)
        assert loader.is_loaded("lifecycle-test")

    def test_multiple_skills_concurrent(self, loader, temp_skills_dir):
        """Test handling multiple skills concurrently."""
        # Create multiple skills
        for i in range(5):
            skill_dir = temp_skills_dir / f"skill-{i}"
            skill_dir.mkdir()
            (skill_dir / "SKILL.md").write_text(f"# Skill {i}\n\nSkill number {i}.")

        # Load all
        for i in range(5):
            skill = loader.load_skill(f"skill-{i}")
            assert skill is not None

        # Check all loaded
        loaded = loader.list_loaded()
        assert len(loaded) == 5

    def test_reload_preserves_manifest(self, loader, sample_skill_dir):
        """Test reload doesn't affect manifest registrations."""
        # Load SKILL.md based skill
        loader.load_skill("test-skill")

        # Register a module-based skill
        loader.register_skill("module-skill", "some.module")

        # Reload the SKILL.md skill
        loader.reload_skill("test-skill")

        # Module skill should still be in manifest
        assert "module-skill" in loader.list_available()
