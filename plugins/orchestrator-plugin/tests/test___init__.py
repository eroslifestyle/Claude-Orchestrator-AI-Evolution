"""
Tests for mcp_server.__init__.py - Package Initialization
"""

from __future__ import annotations

import pytest

from mcp_server import (
    main,
    __version__,
    __skill_version__,
    get_version,
    get_server_info,
    __author__
)


class TestPackageExports:
    """Tests for package-level exports."""

    def test_main_function_exported(self) -> None:
        """Test that main function is exported."""
        assert callable(main)

    def test_version_exports(self) -> None:
        """Test that version attributes are exported."""
        assert isinstance(__version__, str)
        assert isinstance(__skill_version__, str)
        assert __skill_version__.startswith("V")
        assert __skill_version__[1:] == __version__

    def test_get_version_function(self) -> None:
        """Test that get_version function works."""
        version = get_version()
        assert isinstance(version, str)
        assert len(version.split(".")) >= 2

    def test_author_attribute(self) -> None:
        """Test that author attribute is set."""
        assert __author__ == "LeoDg"


class TestGetServerInfo:
    """Tests for get_server_info function."""

    def test_returns_dict(self) -> None:
        """Test that get_server_info returns a dictionary."""
        info = get_server_info()
        assert isinstance(info, dict)

    def test_has_name_field(self) -> None:
        """Test that server info has name field."""
        info = get_server_info()
        assert "name" in info
        assert info["name"] == "orchestrator-v12"

    def test_has_version_field(self) -> None:
        """Test that server info has version field."""
        info = get_server_info()
        assert "version" in info
        assert isinstance(info["version"], str)

    def test_has_skill_version_field(self) -> None:
        """Test that server info has skill_version field."""
        info = get_server_info()
        assert "skill_version" in info
        assert info["skill_version"].startswith("V")

    def test_has_description_field(self) -> None:
        """Test that server info has description field."""
        info = get_server_info()
        assert "description" in info
        assert isinstance(info["description"], str)
        assert "orchestrator" in info["description"].lower()

    def test_has_author_field(self) -> None:
        """Test that server info has author field."""
        info = get_server_info()
        assert "author" in info
        assert info["author"] == "LeoDg"

    def test_has_fixes_list(self) -> None:
        """Test that server info has fixes list."""
        info = get_server_info()
        assert "fixes" in info
        assert isinstance(info["fixes"], list)
        assert len(info["fixes"]) > 0
        # All fixes should start with "FIX #"
        for fix in info["fixes"]:
            assert fix.startswith("FIX #")

    def test_fixes_count(self) -> None:
        """Test that all 9 fixes are listed."""
        info = get_server_info()
        assert len(info["fixes"]) == 9


class TestPackageDocstring:
    """Tests for package documentation."""

    def test_has_docstring(self) -> None:
        """Test that package has docstring."""
        import mcp_server
        assert mcp_server.__doc__ is not None
        assert len(mcp_server.__doc__) > 0

    def test_docstring_mentions_orchestrator(self) -> None:
        """Test that docstring mentions orchestrator."""
        import mcp_server
        assert "orchestrator" in mcp_server.__doc__.lower()

    def test_docstring_mentions_mcp(self) -> None:
        """Test that docstring mentions MCP."""
        import mcp_server
        assert "mcp" in mcp_server.__doc__.lower()


class TestModuleAttributes:
    """Tests for module-level attributes."""

    def test_docformat_attribute(self) -> None:
        """Test that __docformat__ is set."""
        import mcp_server
        assert hasattr(mcp_server, "__docformat__")
        assert mcp_server.__docformat__ == "google"

    def test_all_attribute(self) -> None:
        """Test that __all__ is properly defined."""
        import mcp_server
        assert hasattr(mcp_server, "__all__")
        assert "main" in mcp_server.__all__
        assert "__version__" in mcp_server.__all__
        assert "__skill_version__" in mcp_server.__all__
        assert "get_version" in mcp_server.__all__
