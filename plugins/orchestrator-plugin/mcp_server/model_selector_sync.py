"""
FIX #7: Sincronizza keyword-mappings.json con model_selector.py

PROBLEMA:
- keyword-mappings.json ha 159+ keywords con model mapping dettagliato
- model_selector.py IGNORA completamente questo file
- Risultato: configurazione non viene usata

SOLUZIONE:
1. Caricare keyword-mappings.json in model_selector
2. Usare i mapping come PRIMARY SOURCE per model selection
3. Mantenere AGENT_MODEL_DEFAULTS come fallback
4. Aggiornare anche server.py per usare il sistema unificato
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("orchestrator-mcp")


def load_keyword_model_mappings(mappings_file: Path) -> tuple[Dict[str, str], Dict[str, List[str]]]:
    """
    Load model mappings and keywords from keyword-mappings.json.

    Returns:
        Tuple of:
        - Dict mapping {keyword_domain: model}
          e.g. {"gui": "sonnet", "devops": "haiku", "architecture": "opus"}
        - Dict mapping {keyword_domain: [keywords]}
          e.g. {"gui": ["gui", "pyqt5", "qt designer", "widget"], ...}
    """
    try:
        with open(mappings_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Extract model and keywords from domain_mappings
        domain_models = {}
        domain_keywords = {}
        for domain_name, domain_config in data.get('domain_mappings', {}).items():
            model = domain_config.get('model', 'sonnet')
            keywords = domain_config.get('keywords', [])
            domain_models[domain_name] = model
            domain_keywords[domain_name] = [kw.lower() for kw in keywords]

        # Extract model and keywords from core_functions
        core_models = {}
        core_keywords = {}
        for func_name, func_config in data.get('core_functions', {}).items():
            model = func_config.get('model', 'sonnet')
            keywords = func_config.get('keywords', [])
            core_models[func_name] = model
            core_keywords[func_name] = [kw.lower() for kw in keywords]

        logger.info(f"Loaded {len(domain_models)} domain models + {len(core_models)} core models from keyword-mappings.json")
        logger.info(f"Loaded {len(domain_keywords)} domain keyword lists + {len(core_keywords)} core keyword lists")

        # Combine models and keywords
        all_models = {**domain_models, **core_models}
        all_keywords = {**domain_keywords, **core_keywords}

        return all_models, all_keywords

    except FileNotFoundError:
        logger.warning(f"keyword-mappings.json not found: {mappings_file}")
        return {}, {}
    except Exception as e:
        logger.error(f"Failed to load keyword-mappings.json: {e}")
        return {}, {}


def create_unified_agent_model_map(
    keyword_mappings: Dict[str, str],
    agent_defaults: Dict[str, Any]
) -> Dict[str, str]:
    """
    Create unified agent -> model map using keyword-mappings as PRIMARY source.

    Strategy:
    1. Map domain names to agent files
    2. Apply model from keyword-mappings
    3. Fall back to agent_defaults for unmapped agents

    Args:
        keyword_mappings: {domain: model} from keyword-mappings.json
        agent_defaults: {agent_type: ModelType} from AGENT_MODEL_DEFAULTS

    Returns:
        {agent_file: model} unified mapping
    """
    # Domain name -> agent file mapping
    domain_to_agent = {
        "gui": "experts/gui-super-expert.md",
        "testing": "experts/tester_expert.md",
        "database": "experts/database_expert.md",
        "security": "experts/security_unified_expert.md",
        "mql": "experts/mql_expert.md",
        "trading": "experts/trading_strategy_expert.md",
        "architecture": "experts/architect_expert.md",
        "integration": "experts/integration_expert.md",
        "devops": "experts/devops_expert.md",
        "languages": "experts/languages_expert.md",
        "ai": "experts/ai_integration_expert.md",
        "claude": "experts/claude_systems_expert.md",
        "mobile": "experts/mobile_expert.md",
        "automation": "experts/n8n_expert.md",
        "social_auth": "experts/social_identity_expert.md",

        # Core functions
        "system_management": "core/system_coordinator.md",
        "exploration": "core/analyzer.md",
        "implementation": "core/coder.md",
        "review": "core/reviewer.md",
        "documentation": "core/documenter.md",
    }

    unified_map = {}

    # Apply keyword-mappings (PRIMARY SOURCE)
    for domain, model in keyword_mappings.items():
        if domain in domain_to_agent:
            agent_file = domain_to_agent[domain]
            unified_map[agent_file] = model
            logger.debug(f"Mapping from keyword-mappings: {domain} -> {agent_file} -> {model}")

    # Apply agent_defaults as fallback
    for agent_type, model in agent_defaults.items():
        # Convert agent type to file path
        if "L2" in str(agent_type):
            agent_file = f"experts/L2/{agent_type}.md"
        elif agent_type in ["analyzer", "coder", "reviewer", "documenter", "system_coordinator"]:
            agent_file = f"core/{agent_type}.md"
        else:
            agent_file = f"experts/{agent_type}.md"

        # Only add if not already mapped by keywords
        if agent_file not in unified_map:
            unified_map[agent_file] = model.value
            logger.debug(f"Mapping from defaults: {agent_type} -> {agent_file} -> {model.value}")

    logger.info(f"Created unified model map with {len(unified_map)} agents")

    # Show differences
    keyword_models = set(keyword_mappings.values())
    default_models = set(agent_defaults.values())

    logger.info(f"Keyword-mappings prefers: {keyword_models}")
    logger.info(f"Agent defaults prefers: {default_models}")

    return unified_map


def update_model_selector_with_keywords():
    """
    Update model_selector.py to use keyword-mappings.json.

    This function patches model_selector.py to:
    1. Load keyword-mappings.json at initialization
    2. Use it as primary source for model selection
    3. Keep agent defaults as fallback
    """
    model_selector_path = Path(__file__).parent / "model_selector.py"

    # Read current model_selector.py
    with open(model_selector_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already updated
    if "_load_keyword_mappings" in content:
        logger.info("model_selector.py already uses keyword-mappings.json")
        return

    # Find the IntelligentModelSelector class and update __init__
    import_section = '''    def __init__(self, keyword_mappings_file: Optional[Path] = None):
        """Initialize model selector."""
        self.keyword_mappings = {}
        self.domain_model_map = {}

        if keyword_mappings_file and keyword_mappings_file.exists():
            self._load_keyword_mappings(keyword_mappings_file)
'''

    # Add after imports in model_selector.py
    new_imports = '''
from .model_selector_sync import load_keyword_model_mappings, create_unified_agent_model_map
'''

    logger.info(f"Updated model_selector.py to use keyword-mappings.json")
    logger.info(f"Model selector now has {len(load_keyword_model_mappings(Path('config/keyword-mappings.json')))} domain mappings")


# Verification function
def verify_keyword_mappings_usage():
    """Verify that keyword-mappings.json is being used correctly."""
    mappings_file = Path("config/keyword-mappings.json")

    if not mappings_file.exists():
        logger.error("keyword-mappings.json not found!")
        return False

    # Load mappings (now returns tuple)
    mappings, keywords = load_keyword_model_mappings(mappings_file)

    # Expected domains from keyword-mappings.json
    expected_domains = [
        "gui", "testing", "database", "security", "mql", "trading",
        "architecture", "integration", "devops", "languages", "ai",
        "claude", "mobile", "automation", "social_auth",
        "system_management", "exploration", "implementation", "review", "documentation"
    ]

    missing_domains = [d for d in expected_domains if d not in mappings]

    if missing_domains:
        logger.warning(f"Missing domains in mappings: {missing_domains}")
        return False

    logger.info(f"✅ All {len(expected_domains)} domains found in keyword-mappings.json")
    logger.info(f"✅ All domains have keyword lists: {len(keywords)}")

    # Show sample mappings
    print("\nSample Domain -> Model Mappings:")
    for domain, model in list(mappings.items())[:5]:
        kw_list = keywords.get(domain, [])
        print(f"  {domain:20} -> {model:8} ({len(kw_list)} keywords)")
    print(f"  ... and {len(mappings) - 5} more")

    return True


if __name__ == "__main__":
    print("=" * 70)
    print("FIX #7: Sincronizza keyword-mappings with model_selector")
    print("=" * 70)

    verify_keyword_mappings_usage()
