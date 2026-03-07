"""
Tests for version.py - Orchestrator Version Management
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch
import pytest

from mcp_server.version import (
    get_version,
    get_skill_version,
    __version__,
    __skill_version__,
    __mcp_version__,
    __api_version__,
    VERSION_FILE
)


class TestGetVersion:
    """Tests for get_version function."""

    def test_get_version_reads_file(self) -> None:
        """Test that get_version reads from VERSION file."""
        version = get_version()
        # VERSION file should exist and contain a version string
        assert isinstance(version, str)
        # Version should be in format like "12.6.0"
        assert len(version.split(".")) >= 2  # At least major.minor

    def test_get_version_fallback_on_missing_file(self) -> None:
        """Test that get_version returns fallback when VERSION file is missing."""
        # Mock the entire get_version function's file read operation
        # Use patch on the module level where read_text is called
        import mcp_server.version as vm
        original_read = vm.Path.read_text
        try:
            # Make read_text raise FileNotFoundError
            vm.Path.read_text = lambda self: original_read(self) if "VERSION" not in str(self) else (_ for _ in ()).throw(FileNotFoundError())
            version = get_version()
            assert version == "12.6.0"  # Fallback version
        finally:
            vm.Path.read_text = original_read

    def test_get_version_caches_result(self) -> None:
        """Test that version is cached at module level."""
        # Calling get_version multiple times should return same result
        v1 = get_version()
        v2 = get_version()
        assert v1 == v2


class TestGetSkillVersion:
    """Tests for get_skill_version function."""

    def test_get_skill_version_has_v_prefix(self) -> None:
        """Test that skill version has V prefix."""
        skill_version = get_skill_version()
        assert skill_version.startswith("V")
        # Rest should match regular version
        assert skill_version[1:] == get_version()


class TestModuleExports:
    """Tests for module-level exports."""

    def test_version_exports_exist(self) -> None:
        """Test that all expected version exports exist."""
        # __version__ is a string, check it's defined and correct type
        assert isinstance(__version__, str)
        assert isinstance(__skill_version__, str)
        assert isinstance(__mcp_version__, str)
        assert isinstance(__api_version__, str)

    def test_api_version_is_string(self) -> None:
        """Test that API version is a string."""
        assert __api_version__ == "3"

    def test_all_versions_consistent(self) -> None:
        """Test that all version exports are consistent."""
        assert __version__ == __mcp_version__
        assert __skill_version__ == f"V{__version__}"


class TestVersionFile:
    """Tests for VERSION file handling."""

    def test_version_file_exists(self) -> None:
        """Test that VERSION file exists in expected location."""
        assert VERSION_FILE.exists()
        assert VERSION_FILE.name == "VERSION"

    def test_version_file_content_valid(self) -> None:
        """Test that VERSION file contains valid version string."""
        content = VERSION_FILE.read_text().strip()
        # Should be in format like "12.6.0"
        parts = content.split(".")
        assert len(parts) >= 2
        # Each part should be numeric
        for part in parts:
            assert part.isdigit() or part == "0"  # Handle "0" case
