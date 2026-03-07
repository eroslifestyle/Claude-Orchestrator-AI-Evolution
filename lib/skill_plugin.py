"""Skill Plugin System for Orchestrator V13.0.

Dynamic skill loading with hot-reload capability.
"""

import importlib
import inspect
import json
import logging
import re
import time
from datetime import datetime
from pathlib import Path
from collections import deque
from typing import Dict, Optional, Type, List, Any
import sys

logger = logging.getLogger(__name__)

from .skill_interface import SkillInterface, SkillResult


class SkillMdWrapper(SkillInterface):
    """Wrapper per skill definite in SKILL.md.

    Incapsula una skill basata su file SKILL.md, fornendo
    un'interfaccia compatibile con SkillInterface.
    """

    def __init__(self, skill_id: str, skill_dir: Path, metadata: Dict[str, Any]):
        """Inizializza il wrapper per skill SKILL.md.

        Args:
            skill_id: Identificatore univoco della skill
            skill_dir: Directory contenente SKILL.md
            metadata: Metadati estratti dal parsing di SKILL.md
        """
        super().__init__()
        self._skill_id = skill_id
        self._skill_dir = skill_dir
        self._metadata = metadata
        self._skill_name = metadata.get("name", skill_id)
        self._description = metadata.get("description", "")
        self._instructions = metadata.get("instructions", "")
        self._algorithm = metadata.get("algorithm", "")

    @property
    def skill_id(self) -> str:
        """ID univoco della skill."""
        return self._skill_id

    @property
    def skill_name(self) -> str:
        """Nome leggibile della skill."""
        return self._skill_name

    @property
    def description(self) -> str:
        """Descrizione della skill."""
        return self._description

    @property
    def enabled(self) -> bool:
        """Stato abilitato/disabilitato."""
        return self._enabled

    @enabled.setter
    def enabled(self, value: bool) -> None:
        """Imposta stato enabled."""
        self._enabled = value

    def validate_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Valida il context per l'esecuzione.

        Args:
            context: Context con user_request e parametri opzionali

        Returns:
            Dict con valid (bool) ed error (str opzionale)
        """
        required = self._metadata.get("required_context", ["user_request"])
        missing = [k for k in required if k not in context]
        if missing:
            return {"valid": False, "error": f"Missing required context: {missing}"}
        return {"valid": True, "error": None}

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Esegue la skill ritornando le istruzioni per l'orchestrator.

        Args:
            context: Context di esecuzione

        Returns:
            Dict con success, skill_id, instructions, algorithm, context
        """
        return {
            "success": True,
            "skill_id": self._skill_id,
            "skill_name": self._skill_name,
            "instructions": self._instructions,
            "algorithm": self._algorithm,
            "description": self._description,
            "context": context
        }

    def get_help(self) -> str:
        """Help text esteso con descrizione."""
        return f"{self._skill_name} (v{self.version})\n{self._description}"


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
        self._cleanup_failures: deque = deque(maxlen=100)
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

                except (ImportError, ModuleNotFoundError, AttributeError) as e:
                    # Fall through to skill file loading
                    pass

        # Load from SKILL.md based skill
        skill_file = skill_dir / "SKILL.md"
        if skill_file.exists():
            metadata = self._parse_skill_md(skill_dir)
            if metadata:
                instance = SkillMdWrapper(skill_id, skill_dir, metadata)
                self._instances[skill_id] = instance
                return instance

        return None

    def _parse_skill_md(self, skill_dir: Path) -> Optional[Dict[str, Any]]:
        """Parse SKILL.md file and extract metadata.

        Estrae dal file SKILL.md:
        - Titolo dal primo heading #
        - Descrizione dal primo paragrafo
        - Algoritmo dalla sezione ## ALGORITHM
        - Istruzioni complete del file

        Args:
            skill_dir: Directory contenente SKILL.md

        Returns:
            Dict con name, description, algorithm, instructions
        """
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            return None

        try:
            content = skill_file.read_text(encoding="utf-8")
        except (IOError, OSError):
            return None

        metadata: Dict[str, Any] = {
            "name": skill_dir.name,
            "description": "",
            "algorithm": "",
            "instructions": content,
            "required_context": ["user_request"]
        }

        # Estrai titolo dal primo heading # (es. "# ORCHESTRATOR V13.0")
        title_match = re.search(r'^#\s+(.+?)$', content, re.MULTILINE)
        if title_match:
            metadata["name"] = title_match.group(1).strip()

        # Estrai descrizione dal primo paragrafo dopo il titolo
        # (righe non vuote tra il titolo e il prossimo heading)
        if title_match:
            start_pos = title_match.end()
            after_title = content[start_pos:].strip()
            # Trova il primo paragrafo (fino a doppio newline o heading)
            desc_match = re.search(
                r'^(.+?)(?=\n\n|\n#|\Z)',
                after_title,
                re.DOTALL
            )
            if desc_match:
                desc = desc_match.group(1).strip()
                # Rimuovi eventuali linee di separatori
                desc = re.sub(r'^---+$', '', desc, flags=re.MULTILINE).strip()
                if desc:
                    metadata["description"] = desc

        # Estrai algoritmo dalla sezione ## ALGORITHM
        # Match dal heading ## ALGORITHM fino al prossimo heading ## o fine file
        algo_match = re.search(
            r'^##\s+ALGORITHM\s*$(.*?)(?=^##\s|\Z)',
            content,
            re.MULTILINE | re.DOTALL
        )
        if algo_match:
            algorithm = algo_match.group(1).strip()
            metadata["algorithm"] = algorithm

        return metadata

    def reload_skill(self, skill_id: str) -> Optional[SkillInterface]:
        """Hot-reload a skill.

        Calls cleanup on old instance before unloading to release resources.

        Args:
            skill_id: Skill identifier

        Returns:
            Reloaded skill instance or None
        """
        # Cleanup and unload existing instance
        if skill_id in self._instances:
            old_instance = self._instances[skill_id]
            # Call cleanup on old instance if available
            try:
                if hasattr(old_instance, 'cleanup'):
                    old_instance.cleanup()
                elif hasattr(old_instance, 'shutdown'):
                    old_instance.shutdown()
            except Exception as e:
                # Log cleanup failure but don't fail reload
                logger.warning(
                    f"Skill cleanup failed during reload: {skill_id}, error: {e}"
                )
                # Track failed cleanup for potential manual cleanup
                self._cleanup_failures.append({
                    "skill_id": skill_id,
                    "error": str(e),
                    "timestamp": time.time()
                })
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
            "registered_at": datetime.now().isoformat()
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

    def get_cleanup_failures(self) -> List[Dict]:
        """Get list of cleanup failures for manual review.

        Returns:
            List of dicts with skill_id, error, timestamp
        """
        return self._cleanup_failures.copy()

    def clear_cleanup_failures(self) -> None:
        """Clear cleanup failure log."""
        self._cleanup_failures.clear()


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
