"""Skill Plugin System for Orchestrator V13.0.

Dynamic skill loading with hot-reload capability.
"""

import importlib
import inspect
import json
from pathlib import Path
from typing import Dict, Optional, Type, List
import sys

from skill_interface import SkillInterface


class SkillPluginLoader:
    """Dynamic skill loader with hot-reload support."""

    def __init__(self, skills_dir: Optional[str] = None,
                 manifest_path: Optional[str] = None):
        """Initialize skill plugin loader.

        Args:
            skills_dir: Directory containing skill modules
            manifest_path: Path to skills manifest JSON
        """
        if skills_dir is None:
            skills_dir = Path.home() / ".claude/skills"
        self.skills_dir = Path(skills_dir)

        if manifest_path is None:
            manifest_path = Path.home() / ".claude/skills/skills_manifest.json"
        self.manifest_path = Path(manifest_path)

        self._loaded_skills: Dict[str, Type[SkillInterface]] = {}
        self._instances: Dict[str, SkillInterface] = {}
        self._manifest: Dict = {}
        self._load_manifest()

    def _load_manifest(self) -> None:
        """Load skills manifest from disk."""
        if self.manifest_path.exists():
            with open(self.manifest_path) as f:
                self._manifest = json.load(f)
        else:
            self._manifest = {"skills": {}, "version": "1.0.0"}
            self._save_manifest()

    def _save_manifest(self) -> None:
        """Save skills manifest to disk."""
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.manifest_path, "w") as f:
            json.dump(self._manifest, f, indent=2)

    def discover_skills(self) -> List[str]:
        """Discover available skills in skills directory.

        Returns:
            List of skill IDs found
        """
        discovered = []

        # Search for skill directories with SKILL.md
        for skill_dir in self.skills_dir.iterdir():
            if skill_dir.is_dir() and not skill_dir.name.startswith("."):
                skill_file = skill_dir / "SKILL.md"
                if skill_file.exists():
                    discovered.append(skill_dir.name)

        return discovered

    def load_skill(self, skill_id: str) -> Optional[SkillInterface]:
        """Load a skill by ID.

        Args:
            skill_id: Skill identifier

        Returns:
            Skill instance or None if not found
        """
        # Check if already loaded
        if skill_id in self._instances:
            return self._instances[skill_id]

        # Find skill directory
        skill_dir = self.skills_dir / skill_id
        if not skill_dir.exists():
            return None

        # Check manifest for registration info
        reg_info = self._manifest.get("skills", {}).get(skill_id, {})

        if reg_info:
            # Load from registered module
            module_name = reg_info.get("module")
            class_name = reg_info.get("class_name", "Skill")

            if module_name:
                try:
                    module = importlib.import_module(module_name)
                    skill_class = getattr(module, class_name)

                    instance = skill_class()
                    if isinstance(instance, SkillInterface):
                        self._instances[skill_id] = instance
                        return instance

                except (ImportError, AttributeError) as e:
                    # Fall through to skill file loading
                    pass

        # Load from SKILL.md based skill
        # This is a simplified version - full implementation would
        # parse SKILL.md and create a wrapper skill
        return None

    def reload_skill(self, skill_id: str) -> Optional[SkillInterface]:
        """Hot-reload a skill.

        Args:
            skill_id: Skill identifier

        Returns:
            Reloaded skill instance or None
        """
        # Unload existing
        if skill_id in self._instances:
            del self._instances[skill_id]

        if skill_id in self._loaded_skills:
            # Reload module
            module_name = self._loaded_skills[skill_id].__module__
            if module_name in sys.modules:
                importlib.reload(sys.modules[module_name])

        # Reload fresh
        return self.load_skill(skill_id)

    def register_skill(self, skill_id: str, module: str,
                      class_name: str = "Skill") -> bool:
        """Register a skill in the manifest.

        Args:
            skill_id: Unique skill identifier
            module: Python module path (e.g., "skills.my_skill")
            class_name: Class name in module (default: "Skill")

        Returns:
            True if registered successfully
        """
        if "skills" not in self._manifest:
            self._manifest["skills"] = {}

        self._manifest["skills"][skill_id] = {
            "module": module,
            "class_name": class_name,
            "registered_at": Path.cwd().as_posix()
        }

        self._save_manifest()
        return True

    def unregister_skill(self, skill_id: str) -> bool:
        """Unregister a skill from the manifest.

        Args:
            skill_id: Skill identifier

        Returns:
            True if unregistered
        """
        if skill_id in self._manifest.get("skills", {}):
            del self._manifest["skills"][skill_id]
            self._save_manifest()

            # Unload instance
            if skill_id in self._instances:
                del self._instances[skill_id]

            return True
        return False

    def get_manifest(self) -> Dict:
        """Get the full skills manifest.

        Returns:
            Manifest dictionary
        """
        return self._manifest.copy()

    def list_loaded(self) -> List[str]:
        """List currently loaded skills.

        Returns:
            List of skill IDs
        """
        return list(self._instances.keys())

    def list_available(self) -> List[str]:
        """List all available skills.

        Returns:
            List of skill IDs
        """
        return list(self._manifest.get("skills", {}).keys())

    def is_loaded(self, skill_id: str) -> bool:
        """Check if a skill is loaded.

        Args:
            skill_id: Skill identifier

        Returns:
            True if skill is loaded
        """
        return skill_id in self._instances

    def get_skill(self, skill_id: str) -> Optional[SkillInterface]:
        """Get a loaded skill instance.

        Args:
            skill_id: Skill identifier

        Returns:
            Skill instance or None
        """
        return self._instances.get(skill_id)


def create_skill_plugin(skill_id: str, skill_name: str,
                       execute_fn) -> Type[SkillInterface]:
    """Factory function to create a skill from a function.

    Args:
        skill_id: Unique skill identifier
        skill_name: Human-readable name
        execute_fn: Function to execute (signature: execute(context) -> dict)

    Returns:
        SkillInterface subclass
    """

    class FunctionSkill(SkillInterface):
        @property
        def skill_id(self) -> str:
            return skill_id

        @property
        def skill_name(self) -> str:
            return skill_name

        def execute(self, context: Dict) -> Dict:
            return execute_fn(context)

    return FunctionSkill
