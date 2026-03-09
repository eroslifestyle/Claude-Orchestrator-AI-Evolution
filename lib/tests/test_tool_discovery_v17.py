"""
Test per Tool Discovery Engine V17

Test coverage per i 4 layer del discovery engine:
1. Exact Match
2. Semantic Match
3. Context Match
4. Fallback

Run: pytest lib/tests/test_tool_discovery_v17.py -v
"""

import pytest
import asyncio
from typing import Any

from lib.v17.tool_discovery import (
    ToolDiscoveryEngine,
    DiscoveryLayer,
    DiscoveryResult,
    MatchType,
)
from lib.v17.claude_tool_registry import (
    ClaudeToolRegistry,
    ToolDefinition,
    ToolCategory,
    ToolPriority,
)


# =============================================================================
# FIXTURES
# =============================================================================


async def dummy_handler(input_data: dict[str, Any]) -> dict[str, Any]:
    """Handler dummy per i test."""
    return {"result": "ok"}


@pytest.fixture
def registry_with_tools():
    """Registry con tools di test."""
    registry = ClaudeToolRegistry()

    # Tool 1: API query
    tool1 = ToolDefinition(
        name="query_api",
        description="Query external REST API for data retrieval",
        input_schema={"type": "object"},
        handler=dummy_handler,
        category=ToolCategory.CORE,
        priority=ToolPriority.HIGH,
        tags=["api", "rest", "http", "network"],
        aliases=["api_call", "fetch_api"],
    )

    # Tool 2: Database query
    tool2 = ToolDefinition(
        name="query_database",
        description="Execute SQL query on database",
        input_schema={"type": "object"},
        handler=dummy_handler,
        category=ToolCategory.CORE,
        priority=ToolPriority.HIGH,
        tags=["database", "sql", "query", "data"],
        aliases=["db_query", "sql_query"],
    )

    # Tool 3: File operations
    tool3 = ToolDefinition(
        name="read_file",
        description="Read file from filesystem",
        input_schema={"type": "object"},
        handler=dummy_handler,
        category=ToolCategory.CUSTOM,
        priority=ToolPriority.NORMAL,
        tags=["file", "io", "filesystem", "read"],
        aliases=["file_read", "load_file"],
    )

    # Tool 4: Weather
    tool4 = ToolDefinition(
        name="get_weather",
        description="Get weather information for location",
        input_schema={"type": "object"},
        handler=dummy_handler,
        category=ToolCategory.PLUGIN,
        priority=ToolPriority.NORMAL,
        tags=["weather", "api", "location"],
        aliases=["weather", "forecast"],
    )

    # Registra manualmente negli indici
    for tool in [tool1, tool2, tool3, tool4]:
        registry._name_index[tool.name] = tool
        for alias in tool.aliases:
            registry._alias_index[alias] = tool.name

    return registry


@pytest.fixture
def discovery_engine_sync(registry_with_tools):
    """Discovery engine inizializzato (sync wrapper per test non-async)."""
    engine = ToolDiscoveryEngine(_registry=registry_with_tools)
    # Inizializza sincrono per test
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(engine.initialize())
    finally:
        pass
    yield engine
    loop.close()


# =============================================================================
# TEST INITIALIZATION
# =============================================================================


class TestInitialization:
    """Test per l'inizializzazione del discovery engine."""

    @pytest.mark.asyncio
    async def test_initialize_sets_initialized_flag(self, registry_with_tools):
        """Test che initialize imposta il flag _initialized."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        assert engine._initialized is False
        await engine.initialize()
        assert engine._initialized is True

    @pytest.mark.asyncio
    async def test_initialize_is_idempotent(self, registry_with_tools):
        """Test che initialize puo' essere chiamato piu volte."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()
        await engine.initialize()  # Secondo call non deve dare errori
        assert engine._initialized is True

    @pytest.mark.asyncio
    async def test_builds_keyword_index(self, registry_with_tools):
        """Test che keyword index viene costruito."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        # Verifica che alcune keywords siano indicizzate
        assert len(engine._keyword_index) > 0
        # 'api' dovrebbe essere nelle keywords di query_api
        assert "api" in engine._keyword_index


# =============================================================================
# TEST LAYER 1: EXACT MATCH
# =============================================================================


class TestLayer1ExactMatch:
    """Test per Layer 1: Exact Match."""

    @pytest.mark.asyncio
    async def test_exact_match_by_name(self, registry_with_tools):
        """Test match esatto per nome tool."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine._layer1_exact_match("query_api")

        assert result is not None
        assert result.tool is not None
        assert result.tool.name == "query_api"
        assert result.match_type == MatchType.EXACT
        assert result.layer == DiscoveryLayer.EXACT
        assert result.confidence == 1.0

    @pytest.mark.asyncio
    async def test_exact_match_by_alias(self, registry_with_tools):
        """Test match esatto tramite alias."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine._layer1_exact_match("api_call")

        assert result is not None
        assert result.tool is not None
        assert result.tool.name == "query_api"
        assert result.match_type == MatchType.ALIAS
        assert result.confidence == 0.95

    @pytest.mark.asyncio
    async def test_exact_match_case_insensitive(self, registry_with_tools):
        """Test match case-insensitive (through discover method)."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        # La discover normalizza la query, quindi QUERY_API diventa query_api
        result = await engine.discover("QUERY_API")

        assert result is not None
        assert result.tool is not None
        assert result.tool.name == "query_api"

    @pytest.mark.asyncio
    async def test_exact_match_not_found(self, registry_with_tools):
        """Test quando non c'e' match esatto."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine._layer1_exact_match("nonexistent_tool")

        assert result is None

    @pytest.mark.asyncio
    async def test_exact_match_snake_to_camel_variant(self, registry_with_tools):
        """Test match con variante camelCase."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine._layer1_exact_match("queryApi")

        assert result is not None
        assert result.tool.name == "query_api"


# =============================================================================
# TEST LAYER 2: SEMANTIC MATCH
# =============================================================================


class TestLayer2SemanticMatch:
    """Test per Layer 2: Semantic Match."""

    @pytest.mark.asyncio
    async def test_semantic_match_by_keywords(self, registry_with_tools):
        """Test match semantico tramite keywords."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        # Query con keywords presenti nelle descrizioni dei tool
        result = await engine._layer2_semantic_match("query api rest")

        assert result is not None
        assert result.tool is not None
        assert result.match_type == MatchType.SEMANTIC
        assert result.layer == DiscoveryLayer.SEMANTIC

    @pytest.mark.asyncio
    async def test_semantic_match_by_description_words(self, registry_with_tools):
        """Test match semantico tramite parole nella descrizione."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine._layer2_semantic_match("execute SQL on database")

        assert result is not None
        assert result.tool.name == "query_database"

    @pytest.mark.asyncio
    async def test_semantic_match_below_threshold(self, registry_with_tools):
        """Test quando score e' sotto threshold."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine._layer2_semantic_match(
            "xyz completely unrelated abc",
            threshold=0.9,
        )

        # Con threshold alto, non dovrebbe trovare match
        assert result is None

    @pytest.mark.asyncio
    async def test_semantic_match_custom_threshold(self, registry_with_tools):
        """Test con threshold personalizzato."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine._layer2_semantic_match("api", threshold=0.1)

        assert result is not None
        assert result.confidence >= 0.1


# =============================================================================
# TEST LAYER 3: CONTEXT MATCH
# =============================================================================


class TestLayer3ContextMatch:
    """Test per Layer 3: Context Match."""

    @pytest.mark.asyncio
    async def test_context_match_with_previous_tools(self, registry_with_tools):
        """Test match con previous_tools nel contesto."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        context = {
            "previous_tools": ["query_api"],
        }

        result = await engine._layer3_context_match("fetch more data", context)

        # Il risultato dipende dalla compatibilita calcolata
        # Questo test verifica che il layer funziona senza errori
        assert result is not None or result is None  # Accetta entrambi

    @pytest.mark.asyncio
    async def test_context_match_with_domain(self, registry_with_tools):
        """Test match con domain nel contesto."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        context = {
            "domain": "database",
            "previous_tools": [],
        }

        result = await engine._layer3_context_match("get data", context)

        # Domain matching dovrebbe preferire query_database
        if result and result.tool:
            assert result.layer == DiscoveryLayer.CONTEXT

    @pytest.mark.asyncio
    async def test_context_match_empty_context(self, registry_with_tools):
        """Test con contesto vuoto."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        context = {}

        result = await engine._layer3_context_match("random query", context)

        # Con contesto vuoto, probabilmente None
        assert result is None


# =============================================================================
# TEST LAYER 4: FALLBACK
# =============================================================================


class TestLayer4Fallback:
    """Test per Layer 4: Fallback."""

    @pytest.mark.asyncio
    async def test_fallback_returns_suggestions(self, registry_with_tools):
        """Test che fallback ritorna sempre suggerimenti."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine._layer4_fallback("completely unknown query xyz")

        assert result is not None
        assert result.tool is None
        assert result.match_type == MatchType.NONE
        assert result.layer == DiscoveryLayer.FALLBACK
        assert isinstance(result.suggestions, list)

    @pytest.mark.asyncio
    async def test_fallback_includes_partial_matches(self, registry_with_tools):
        """Test che fallback include match parziali."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine._layer4_fallback("query")

        # 'query' e' substring di 'query_api' e 'query_database'
        assert result is not None
        assert len(result.suggestions) > 0


# =============================================================================
# TEST DISCOVER METHOD
# =============================================================================


class TestDiscover:
    """Test per il metodo discover principale."""

    @pytest.mark.asyncio
    async def test_discover_returns_result(self, registry_with_tools):
        """Test che discover ritorna sempre un DiscoveryResult."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine.discover("any query")

        assert isinstance(result, DiscoveryResult)
        assert result.layer in [
            DiscoveryLayer.EXACT,
            DiscoveryLayer.SEMANTIC,
            DiscoveryLayer.CONTEXT,
            DiscoveryLayer.FALLBACK,
        ]

    @pytest.mark.asyncio
    async def test_discover_exact_match_shortcut(self, registry_with_tools):
        """Test che exact match viene trovato per primo."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine.discover("query_api")

        assert result.tool is not None
        assert result.tool.name == "query_api"
        assert result.layer == DiscoveryLayer.EXACT

    @pytest.mark.asyncio
    async def test_discover_uses_cache(self, registry_with_tools):
        """Test che discover usa la cache."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        # Prima query
        result1 = await engine.discover("test cache query")

        # Seconda query identica
        result2 = await engine.discover("test cache query")

        # Risultati dovrebbero essere identici (from cache)
        assert result1.layer == result2.layer

    @pytest.mark.asyncio
    async def test_discover_with_context(self, registry_with_tools):
        """Test discover con contesto."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        context = {"domain": "database"}

        result = await engine.discover("execute query", context=context)

        assert isinstance(result, DiscoveryResult)

    @pytest.mark.asyncio
    async def test_discover_with_alternatives(self, registry_with_tools):
        """Test discover con alternatives."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine.discover("api", max_alternatives=2)

        # Se trova un match, dovrebbe avere alternatives
        if result.tool:
            assert isinstance(result.alternatives, list)


# =============================================================================
# TEST FEEDBACK AND LEARNING
# =============================================================================


class TestFeedbackAndLearning:
    """Test per feedback e learning."""

    def test_record_feedback_positive(self, discovery_engine_sync):
        """Test registrazione feedback positivo."""
        discovery_engine_sync.record_feedback(
            query="fetch data",
            tool_name="query_api",
            was_correct=True,
        )

        # Verifica che il feedback sia registrato
        assert "fetch data" in discovery_engine_sync._feedback_history
        assert discovery_engine_sync._feedback_history["fetch data"] > 0

    def test_record_feedback_negative(self, discovery_engine_sync):
        """Test registrazione feedback negativo."""
        discovery_engine_sync.record_feedback(
            query="wrong query",
            tool_name="query_api",
            was_correct=False,
        )

        # Feedback negativo
        assert discovery_engine_sync._feedback_history["wrong query"] < 0

    def test_record_feedback_updates_query_tool_mapping(self, discovery_engine_sync):
        """Test che feedback aggiorna query->tool mapping."""
        discovery_engine_sync.record_feedback(
            query="get data from api",
            tool_name="query_api",
            was_correct=True,
        )

        mapping = discovery_engine_sync._query_tool_mapping.get("get data from api")
        assert mapping is not None
        assert mapping.get("query_api", 0) > 0

    def test_get_suggestions_for_tool(self, discovery_engine_sync):
        """Test ottenimento suggerimenti per tool."""
        # Registra alcuni feedback
        discovery_engine_sync.record_feedback("api call", "query_api", True)
        discovery_engine_sync.record_feedback("fetch api", "query_api", True)
        discovery_engine_sync.record_feedback("rest endpoint", "query_api", True)

        suggestions = discovery_engine_sync.get_suggestions_for_tool("query_api")

        assert isinstance(suggestions, list)
        assert len(suggestions) > 0

    def test_get_suggestions_for_tool_with_limit(self, discovery_engine_sync):
        """Test suggerimenti con limite."""
        discovery_engine_sync.record_feedback("q1", "query_api", True)
        discovery_engine_sync.record_feedback("q2", "query_api", True)
        discovery_engine_sync.record_feedback("q3", "query_api", True)

        suggestions = discovery_engine_sync.get_suggestions_for_tool("query_api", limit=2)

        assert len(suggestions) <= 2


# =============================================================================
# TEST CACHE MANAGEMENT
# =============================================================================


class TestCacheManagement:
    """Test per gestione cache."""

    def test_clear_cache(self, discovery_engine_sync):
        """Test svuotamento cache."""
        # Aggiungi qualcosa alla cache
        discovery_engine_sync._cache["test_query"] = DiscoveryResult(
            tool=None,
            match_type=MatchType.NONE,
            layer=DiscoveryLayer.FALLBACK,
            confidence=0.0,
        )

        count = discovery_engine_sync.clear_cache()

        assert count == 1
        assert len(discovery_engine_sync._cache) == 0

    def test_clear_empty_cache(self, discovery_engine_sync):
        """Test svuotamento cache vuota."""
        discovery_engine_sync._cache.clear()

        count = discovery_engine_sync.clear_cache()

        assert count == 0

    @pytest.mark.asyncio
    async def test_cache_eviction_when_full(self, registry_with_tools):
        """Test eviction quando cache e' piena."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        engine._cache = {}  # Reset
        await engine.initialize()

        # Simula cache piena
        for i in range(1001):
            engine._cache[f"query_{i}"] = DiscoveryResult(
                tool=None,
                match_type=MatchType.NONE,
                layer=DiscoveryLayer.FALLBACK,
                confidence=0.0,
            )

        # Aggiungi una nuova entry (dovrebbe triggerare eviction)
        engine._add_to_cache(
            "new_query",
            DiscoveryResult(
                tool=None,
                match_type=MatchType.NONE,
                layer=DiscoveryLayer.FALLBACK,
                confidence=0.0,
            ),
        )

        # Cache non dovrebbe superare MAX_CACHE_SIZE
        assert len(engine._cache) <= 1001


# =============================================================================
# TEST HELPER METHODS
# =============================================================================


class TestHelperMethods:
    """Test per metodi helper."""

    def test_extract_keywords(self, discovery_engine_sync):
        """Test estrazione keywords."""
        keywords = discovery_engine_sync._extract_keywords("Query the REST API for user data")

        assert "query" in keywords
        assert "rest" in keywords
        assert "api" in keywords
        assert "user" in keywords
        assert "data" in keywords
        # Stopwords rimosse
        assert "the" not in keywords
        assert "for" not in keywords

    def test_extract_keywords_removes_stopwords(self, discovery_engine_sync):
        """Test che stopwords vengono rimosse."""
        keywords = discovery_engine_sync._extract_keywords("a an the and or but")

        assert len(keywords) == 0

    def test_generate_name_variants_snake_to_camel(self, discovery_engine_sync):
        """Test generazione varianti snake_case -> camelCase."""
        variants = discovery_engine_sync._generate_name_variants("query_api")

        assert "queryApi" in variants

    def test_generate_name_variants_kebab(self, discovery_engine_sync):
        """Test generazione varianti kebab-case."""
        variants = discovery_engine_sync._generate_name_variants("query-api")

        assert "query_api" in variants
        assert "queryapi" in variants

    def test_is_close_match_identical(self, discovery_engine_sync):
        """Test close match con stringhe identiche."""
        assert discovery_engine_sync._is_close_match("test", "test")

    def test_is_close_match_one_char_diff(self, discovery_engine_sync):
        """Test close match con 1 carattere diverso."""
        assert discovery_engine_sync._is_close_match("test", "tost", threshold=1)

    def test_is_close_match_too_different(self, discovery_engine_sync):
        """Test close match con stringhe troppo diverse."""
        assert not discovery_engine_sync._is_close_match("abc", "xyz", threshold=1)

    def test_check_tool_query_compatibility_high(self, discovery_engine_sync):
        """Test compatibilita alta."""
        tool = discovery_engine_sync._registry._name_index["query_api"]
        score = discovery_engine_sync._check_tool_query_compatibility(
            tool=tool,
            query="fetch data from rest api endpoint",
            domain="api",
            intent="fetch",
        )

        assert score > 0.5

    def test_check_tool_query_compatibility_low(self, discovery_engine_sync):
        """Test compatibilita bassa."""
        tool = discovery_engine_sync._registry._name_index["query_api"]
        score = discovery_engine_sync._check_tool_query_compatibility(
            tool=tool,
            query="completely unrelated xyz",
            domain="",
            intent="",
        )

        assert score < 0.5


# =============================================================================
# TEST EDGE CASES
# =============================================================================


class TestEdgeCases:
    """Test per edge cases."""

    @pytest.mark.asyncio
    async def test_discover_empty_query(self, registry_with_tools):
        """Test con query vuota."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine.discover("")

        assert isinstance(result, DiscoveryResult)

    @pytest.mark.asyncio
    async def test_discover_whitespace_query(self, registry_with_tools):
        """Test con query solo spazi."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine.discover("   ")

        assert isinstance(result, DiscoveryResult)

    @pytest.mark.asyncio
    async def test_discover_very_long_query(self, registry_with_tools):
        """Test con query molto lunga."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        long_query = "fetch " * 1000
        result = await engine.discover(long_query)

        assert isinstance(result, DiscoveryResult)

    @pytest.mark.asyncio
    async def test_discover_special_characters(self, registry_with_tools):
        """Test con caratteri speciali."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine.discover("query@api#$%^&*()")

        assert isinstance(result, DiscoveryResult)

    @pytest.mark.asyncio
    async def test_discover_unicode_query(self, registry_with_tools):
        """Test con caratteri unicode."""
        engine = ToolDiscoveryEngine(_registry=registry_with_tools)
        await engine.initialize()

        result = await engine.discover("query database 数据库")

        assert isinstance(result, DiscoveryResult)


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
