"""
Test per FineGrainedStreamer V17.

Covers:
- PARTIAL mode streaming
- FULL mode streaming with results
- Backpressure handling
- Cancellation support
- Pause/Resume
- Validation
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from lib.v17.streaming import (
    FineGrainedStreamer,
    StreamChunk,
    StreamConfig,
    StreamState,
    StreamingMode,
    StreamedToolCall,
)


# Fixtures
@pytest.fixture
def config() -> StreamConfig:
    """Configurazione di test."""
    return StreamConfig(
        buffer_size=100,
        timeout_ms=5000,
        enable_partial_execution=True,
        max_partial_wait_ms=100,
        cancel_on_error=True,
        validate_on_stream=True,
        backpressure_threshold=10,
        chunk_delay_ms=1,
    )


def make_streamer(config: StreamConfig) -> FineGrainedStreamer:
    """Crea streamer con executor mock."""
    s = FineGrainedStreamer(_config=config)

    async def mock_executor(
        tool_name: str, params: dict[str, Any]
    ) -> dict[str, Any]:
        return {"executed": tool_name, "params": params}

    # Set executor directly
    s._tool_executor = mock_executor
    s._initialized = True
    return s


# Test StreamConfig
class TestStreamConfig:
    """Test per StreamConfig."""

    def test_default_values(self) -> None:
        """Verifica valori di default."""
        config = StreamConfig()
        assert config.buffer_size == 1024
        assert config.timeout_ms == 60000
        assert config.enable_partial_execution is False
        assert config.max_partial_wait_ms == 5000
        assert config.cancel_on_error is True
        assert config.validate_on_stream is True
        assert config.backpressure_threshold == 100
        assert config.chunk_delay_ms == 10

    def test_custom_values(self) -> None:
        """Verifica valori custom."""
        config = StreamConfig(
            buffer_size=512,
            timeout_ms=30000,
            enable_partial_execution=True,
        )
        assert config.buffer_size == 512
        assert config.timeout_ms == 30000
        assert config.enable_partial_execution is True


# Test StreamChunk
class TestStreamChunk:
    """Test per StreamChunk."""

    def test_chunk_creation(self) -> None:
        """Verifica creazione chunk."""
        chunk = StreamChunk(
            tool_name="test_tool",
            parameter="query",
            value="SELECT *",
            is_complete=True,
            index=0,
            timestamp=123.45,
            stream_id="abc123",
        )
        assert chunk.tool_name == "test_tool"
        assert chunk.parameter == "query"
        assert chunk.value == "SELECT *"
        assert chunk.is_complete is True
        assert chunk.is_partial is False
        assert chunk.chunk_type == "parameter"

    def test_chunk_to_dict(self) -> None:
        """Verifica conversione dict."""
        chunk = StreamChunk(
            tool_name="test_tool",
            parameter="limit",
            value=10,
        )
        d = chunk.to_dict()
        assert d["tool_name"] == "test_tool"
        assert d["parameter"] == "limit"
        assert d["value"] == 10


# Test StreamedToolCall
class TestStreamedToolCall:
    """Test per StreamedToolCall."""

    def test_tool_call_creation(self) -> None:
        """Verifica creazione tool call."""
        call = StreamedToolCall(tool_name="test_tool")
        assert call.tool_name == "test_tool"
        assert call.state == StreamState.IDLE
        assert call.parameters == {}
        assert call.chunks == []

    def test_is_ready(self) -> None:
        """Verifica is_ready()."""
        call = StreamedToolCall(
            tool_name="test_tool",
            state=StreamState.STREAMING,
        )
        assert call.is_ready() is False  # No parameters

        call.parameters = {"query": "test"}
        call.chunks = [
            StreamChunk(
                tool_name="test_tool",
                parameter="query",
                value="test",
                is_complete=True,
                chunk_type="parameter",
            )
        ]
        assert call.is_ready() is True

    def test_get_partial_params(self) -> None:
        """Verifica get_partial_params()."""
        call = StreamedToolCall(
            tool_name="test_tool",
            parameters={"a": 1, "b": 2},
        )
        params = call.get_partial_params()
        assert params == {"a": 1, "b": 2}

    def test_add_chunk(self) -> None:
        """Verifica add_chunk()."""
        call = StreamedToolCall(tool_name="test_tool")
        chunk = StreamChunk(
            tool_name="test_tool",
            parameter="query",
            value="test",
            chunk_type="parameter",
        )
        call.add_chunk(chunk)
        assert len(call.chunks) == 1
        assert call.parameters["query"] == "test"

    def test_pause_resume(self) -> None:
        """Verifica pause/resume."""
        call = StreamedToolCall(tool_name="test_tool")
        call.state = StreamState.STREAMING

        call.pause()
        assert call.state == StreamState.PAUSED

        call.resume()
        assert call.state == StreamState.STREAMING


# Test FineGrainedStreamer
class TestFineGrainedStreamer:
    """Test per FineGrainedStreamer."""

    @pytest.mark.asyncio
    async def test_initialize(self) -> None:
        """Verifica initialize()."""
        streamer = FineGrainedStreamer()
        assert streamer._initialized is False

        await streamer.initialize()
        assert streamer._initialized is True

    @pytest.mark.asyncio
    async def test_initialize_with_executor(self) -> None:
        """Verifica initialize con executor."""

        async def executor(tool: str, params: dict) -> dict:
            return {"result": "ok"}

        streamer = FineGrainedStreamer()
        await streamer.initialize(tool_executor=executor)
        assert streamer._tool_executor is not None

    @pytest.mark.asyncio
    async def test_stream_tool_call_partial_mode(self, config: StreamConfig) -> None:
        """Verifica streaming in PARTIAL mode."""
        streamer = make_streamer(config)
        chunks = []
        async for chunk in streamer.stream_tool_call(
            tool_name="test_tool",
            prompt="Test query",
            parameters={"query": "SELECT 1", "limit": 10},
            mode=StreamingMode.PARTIAL,
        ):
            chunks.append(chunk)

        # Verifica chunk ricevuti
        assert len(chunks) >= 2  # Almeno 2 parametri + done

        # Verifica chunk done
        done_chunks = [c for c in chunks if c.chunk_type == "done"]
        assert len(done_chunks) == 1

    @pytest.mark.asyncio
    async def test_stream_tool_call_full_mode(self, config: StreamConfig) -> None:
        """Verifica streaming in FULL mode con results."""
        streamer = make_streamer(config)
        chunks = []
        async for chunk in streamer.stream_tool_call(
            tool_name="test_tool",
            prompt="Test query",
            parameters={"query": "SELECT 1"},
            mode=StreamingMode.FULL,
        ):
            chunks.append(chunk)

        # Verifica chunk risultato
        result_chunks = [c for c in chunks if c.chunk_type == "result"]
        assert len(result_chunks) >= 1

    @pytest.mark.asyncio
    async def test_stream_string_chunks(self, config: StreamConfig) -> None:
        """Verifica streaming stringa lunga in chunk."""
        config.buffer_size = 10
        streamer = FineGrainedStreamer(_config=config)
        await streamer.initialize()

        long_string = "A" * 50  # 50 chars, buffer 10 = 5 chunks
        chunks = []
        async for chunk in streamer.stream_tool_call(
            tool_name="test_tool",
            prompt="Test",
            parameters={"text": long_string},
        ):
            if chunk.parameter == "text":
                chunks.append(chunk)

        # Verifica chunk multipli
        partial_chunks = [c for c in chunks if c.is_partial]
        complete_chunks = [c for c in chunks if c.is_complete]
        assert len(partial_chunks) >= 1
        assert len(complete_chunks) >= 1

    @pytest.mark.asyncio
    async def test_stream_list_chunks(self, config: StreamConfig) -> None:
        """Verifica streaming lista."""
        streamer = make_streamer(config)
        chunks = []
        async for chunk in streamer.stream_tool_call(
            tool_name="test_tool",
            prompt="Test",
            parameters={"items": [1, 2, 3, 4, 5]},
        ):
            chunks.append(chunk)

        # Verifica chunk per ogni elemento
        item_chunks = [c for c in chunks if c.parameter.startswith("items[")]
        assert len(item_chunks) == 5

    @pytest.mark.asyncio
    async def test_stream_dict_chunks(self, config: StreamConfig) -> None:
        """Verifica streaming dict."""
        streamer = make_streamer(config)
        chunks = []
        async for chunk in streamer.stream_tool_call(
            tool_name="test_tool",
            prompt="Test",
            parameters={"config": {"timeout": 30, "retries": 3}},
        ):
            chunks.append(chunk)

        # Verifica chunk per ogni chiave
        config_chunks = [c for c in chunks if c.parameter.startswith("config.")]
        assert len(config_chunks) == 2

    @pytest.mark.asyncio
    async def test_cancel_stream(self, config: StreamConfig) -> None:
        """Verifica cancellazione stream."""
        streamer = make_streamer(config)
        stream_id = None
        chunks = []

        async for chunk in streamer.stream_tool_call(
            tool_name="test_tool",
            prompt="Test",
            parameters={"a": 1, "b": 2, "c": 3, "d": 4, "e": 5},
        ):
            chunks.append(chunk)
            if stream_id is None:
                stream_id = chunk.stream_id
            # Cancella dopo primo chunk
            if len(chunks) == 1:
                await streamer.cancel(stream_id)

        # Verifica stato cancellato
        status = await streamer.get_stream_status(stream_id)
        assert status is None  # Rimosso dopo cancellazione

    @pytest.mark.asyncio
    async def test_get_state(self, config: StreamConfig) -> None:
        """Verifica get_state()."""
        streamer = make_streamer(config)
        state = streamer.get_state()
        assert state["initialized"] is True
        assert state["active_streams"] == 0
        assert "config" in state

    @pytest.mark.asyncio
    async def test_get_stream_status(self, config: StreamConfig) -> None:
        """Verifica get_stream_status()."""
        streamer = make_streamer(config)
        stream_id = None

        async for chunk in streamer.stream_tool_call(
            tool_name="test_tool",
            prompt="Test",
            parameters={"query": "test"},
        ):
            if stream_id is None:
                stream_id = chunk.stream_id
                status = await streamer.get_stream_status(stream_id)
                assert status is not None
                assert status["tool_name"] == "test_tool"
                assert status["state"] in ["streaming", "completed"]

    @pytest.mark.asyncio
    async def test_get_stream_status_not_found(self, config: StreamConfig) -> None:
        """Verifica get_stream_status() per stream inesistente."""
        streamer = make_streamer(config)
        status = await streamer.get_stream_status("nonexistent")
        assert status is None

    @pytest.mark.asyncio
    async def test_pause_resume_stream(self, config: StreamConfig) -> None:
        """Verifica pause/resume stream."""
        streamer = make_streamer(config)
        stream_id = None
        paused = False
        resumed = False

        async for chunk in streamer.stream_tool_call(
            tool_name="test_tool",
            prompt="Test",
            parameters={"a": 1, "b": 2, "c": 3},
        ):
            if stream_id is None:
                stream_id = chunk.stream_id

            if not paused and stream_id:
                await streamer.pause_stream(stream_id)
                paused = True
                # Verifica pausa
                status = await streamer.get_stream_status(stream_id)
                assert status is not None

                # Riprendi
                await streamer.resume_stream(stream_id)
                resumed = True

        assert paused is True
        assert resumed is True

    @pytest.mark.asyncio
    async def test_get_active_streams(self, config: StreamConfig) -> None:
        """Verifica get_active_streams()."""
        streamer = make_streamer(config)
        # All'inizio vuoto
        assert streamer.get_active_streams() == []

    @pytest.mark.asyncio
    async def test_validate_chunk(self, config: StreamConfig) -> None:
        """Verifica validazione chunk."""
        streamer = make_streamer(config)
        schema = {
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer"},
            },
            "required": ["query"],
        }

        # Chunk valido
        valid_chunk = StreamChunk(
            tool_name="test",
            parameter="query",
            value="SELECT *",
            is_complete=True,
        )
        assert await streamer._validate_chunk(valid_chunk, schema) is True

        # Chunk tipo sbagliato
        invalid_chunk = StreamChunk(
            tool_name="test",
            parameter="limit",
            value="not_a_number",
            is_complete=True,
        )
        assert await streamer._validate_chunk(invalid_chunk, schema) is False

    @pytest.mark.asyncio
    async def test_merge_partial_params_simple(self, config: StreamConfig) -> None:
        """Verifica merge parametri semplici."""
        streamer = make_streamer(config)
        existing = {"a": 1}
        chunk = StreamChunk(
            tool_name="test",
            parameter="b",
            value=2,
        )
        result = streamer._merge_partial_params(existing, chunk)
        assert result == {"a": 1, "b": 2}

    @pytest.mark.asyncio
    async def test_merge_partial_params_nested(self, config: StreamConfig) -> None:
        """Verifica merge parametri nested."""
        streamer = make_streamer(config)
        existing: dict[str, Any] = {}
        chunk = StreamChunk(
            tool_name="test",
            parameter="config.timeout",
            value=30,
        )
        result = streamer._merge_partial_params(existing, chunk)
        assert result == {"config": {"timeout": 30}}

    @pytest.mark.asyncio
    async def test_merge_partial_params_array(self, config: StreamConfig) -> None:
        """Verifica merge parametri array."""
        streamer = make_streamer(config)
        existing: dict[str, Any] = {}
        chunk = StreamChunk(
            tool_name="test",
            parameter="items[0]",
            value="first",
        )
        result = streamer._merge_partial_params(existing, chunk)
        assert result == {"items": ["first"]}

    @pytest.mark.asyncio
    async def test_stream_with_partial_disabled(self, config: StreamConfig) -> None:
        """Verifica stream_with_partial con partial disabilitato."""
        config.enable_partial_execution = False
        streamer = FineGrainedStreamer(_config=config)
        await streamer.initialize()

        events = []
        async for event in streamer.stream_with_partial(
            tool_name="test_tool",
            prompt="Test query",
        ):
            events.append(event)

        # Verifica eventi chunk (non partial)
        assert len(events) >= 1
        assert events[0]["type"] == "chunk"

    @pytest.mark.asyncio
    async def test_stream_with_partial_enabled(self, config: StreamConfig) -> None:
        """Verifica stream_with_partial con partial abilitato."""
        streamer = make_streamer(config)
        events = []

        async def partial_handler(params: dict) -> dict:
            return {"partial": True, "params": params}

        async for event in streamer.stream_with_partial(
            tool_name="test_tool",
            prompt="Test query with multiple parameters",
            partial_handler=partial_handler,
        ):
            events.append(event)

        # Verifica eventi
        assert len(events) >= 1
        event_types = [e["type"] for e in events]
        assert "parameter" in event_types

    @pytest.mark.asyncio
    async def test_backpressure_handling(self, config: StreamConfig) -> None:
        """Verifica backpressure handling."""
        config.backpressure_threshold = 5
        config.chunk_delay_ms = 0
        streamer = FineGrainedStreamer(_config=config)
        await streamer.initialize()

        # Stream con molti parametri
        params = {f"param_{i}": i for i in range(20)}
        chunks = []
        async for chunk in streamer.stream_tool_call(
            tool_name="test_tool",
            prompt="Test",
            parameters=params,
        ):
            chunks.append(chunk)

        # Tutti i chunk dovrebbero essere ricevuti
        assert len(chunks) >= 20

    @pytest.mark.asyncio
    async def test_error_handling(self, config: StreamConfig) -> None:
        """Verifica gestione errori."""

        async def failing_executor(tool: str, params: dict) -> None:
            raise ValueError("Test error")

        config.cancel_on_error = True
        streamer = FineGrainedStreamer(_config=config)
        streamer._tool_executor = failing_executor
        streamer._initialized = True

        chunks = []
        with pytest.raises(ValueError):
            async for chunk in streamer.stream_tool_call(
                tool_name="test_tool",
                prompt="Test",
                parameters={"query": "test"},
                mode=StreamingMode.FULL,
            ):
                chunks.append(chunk)

        # Verifica chunk errore
        error_chunks = [c for c in chunks if c.chunk_type == "error"]
        assert len(error_chunks) >= 1


# Test integrazione
class TestIntegration:
    """Test di integrazione."""

    @pytest.mark.asyncio
    async def test_full_workflow(self, config: StreamConfig) -> None:
        """Verifica workflow completo."""
        streamer = FineGrainedStreamer(_config=config)

        execution_log = []

        async def tracked_executor(tool: str, params: dict) -> dict[str, Any]:
            execution_log.append((tool, params))
            return {"status": "success", "tool": tool}

        await streamer.initialize(tool_executor=tracked_executor)

        # Esegui streaming
        chunks = []
        async for chunk in streamer.stream_tool_call(
            tool_name="query_api",
            prompt="Query the users endpoint",
            parameters={"endpoint": "/users", "method": "GET"},
            mode=StreamingMode.FULL,
        ):
            chunks.append(chunk)

        # Verifica esecuzione
        assert len(execution_log) == 1
        assert execution_log[0][0] == "query_api"

        # Verifica chunk
        result_chunks = [c for c in chunks if c.chunk_type == "result"]
        assert len(result_chunks) >= 1

    @pytest.mark.asyncio
    async def test_multiple_concurrent_streams(self, config: StreamConfig) -> None:
        """Verifica stream concorrenti."""
        config.chunk_delay_ms = 5
        streamer = FineGrainedStreamer(_config=config)
        await streamer.initialize()

        async def stream_one() -> list[StreamChunk]:
            chunks = []
            async for chunk in streamer.stream_tool_call(
                tool_name="tool_1",
                prompt="Stream 1",
                parameters={"id": 1},
            ):
                chunks.append(chunk)
            return chunks

        async def stream_two() -> list[StreamChunk]:
            chunks = []
            async for chunk in streamer.stream_tool_call(
                tool_name="tool_2",
                prompt="Stream 2",
                parameters={"id": 2},
            ):
                chunks.append(chunk)
            return chunks

        # Esegui concorrentemente
        results = await asyncio.gather(stream_one(), stream_two())

        assert len(results[0]) >= 1
        assert len(results[1]) >= 1
