"""
Fine-Grained Streamer - V17

Streaming di parametri tool senza buffering completo.
Supporta partial execution e early termination.

Example:
    >>> from lib.v17 import FineGrainedStreamer
    >>> streamer = FineGrainedStreamer()
    >>>
    >>> async for chunk in streamer.stream_tool_call(
    ...     tool_name="query_api",
    ...     prompt="Query the users endpoint",
    ... ):
    ...     print(f"Received: {chunk.parameter} = {chunk.value}")
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any, AsyncIterator, Callable, Coroutine

if TYPE_CHECKING:
    pass

__all__ = [
    "FineGrainedStreamer",
    "StreamConfig",
    "StreamChunk",
    "StreamState",
    "StreamedToolCall",
    "StreamingMode",
    "StreamingStats",
    "StreamingManager",
]


class StreamState(Enum):
    """Stato dello stream."""

    IDLE = "idle"  # Non iniziato
    STREAMING = "streaming"  # In corso
    PAUSED = "paused"  # In pausa
    COMPLETED = "completed"  # Completato
    ERROR = "error"  # Errore
    CANCELLED = "cancelled"  # Cancellato


class StreamingMode(Enum):
    """Modalita' di streaming."""

    PARTIAL = "partial"  # Streamma solo tool_name + parameters
    FULL = "full"  # Streamma tutto incluso results


@dataclass(slots=True)
class StreamingStats:
    """
    Statistiche streaming.

    Attributes:
        bytes_streamed: Bytes totali streammati
        chunks_sent: Numero di chunk inviati
        avg_chunk_size: Dimensione media chunk
        streams_completed: Stream completati con successo
        streams_cancelled: Stream cancellati
        streams_errored: Stream con errori
        backpressure_events: Eventi di backpressure attivati
        total_duration_ms: Durata totale in millisecondi
    """

    bytes_streamed: int = 0
    chunks_sent: int = 0
    avg_chunk_size: float = 0.0
    streams_completed: int = 0
    streams_cancelled: int = 0
    streams_errored: int = 0
    backpressure_events: int = 0
    total_duration_ms: float = 0.0

    def update_chunk(self, chunk_size: int) -> None:
        """Aggiorna statistiche dopo invio chunk."""
        self.bytes_streamed += chunk_size
        self.chunks_sent += 1
        if self.chunks_sent > 0:
            self.avg_chunk_size = self.bytes_streamed / self.chunks_sent

    def to_dict(self) -> dict[str, Any]:
        """Converte statistiche in dizionario."""
        return {
            "bytes_streamed": self.bytes_streamed,
            "chunks_sent": self.chunks_sent,
            "avg_chunk_size": round(self.avg_chunk_size, 2),
            "streams_completed": self.streams_completed,
            "streams_cancelled": self.streams_cancelled,
            "streams_errored": self.streams_errored,
            "backpressure_events": self.backpressure_events,
            "total_duration_ms": round(self.total_duration_ms, 2),
        }


@dataclass(slots=True)
class StreamConfig:
    """
    Configurazione streaming.

    Attributes:
        buffer_size: Dimensione buffer per chunk (default 1024)
        timeout_ms: Timeout per stream (default 60000ms = 60s)
        enable_partial_execution: Se eseguire con parametri parziali
        max_partial_wait_ms: Max attesa per parametri parziali (default 5000ms)
        cancel_on_error: Se cancellare su errore
        validate_on_stream: Se validare durante streaming
        backpressure_threshold: Soglia per backpressure (default 100 chunks)
        chunk_delay_ms: Delay tra chunk per simulazione streaming (default 10ms)
    """

    buffer_size: int = 1024
    timeout_ms: int = 60000
    enable_partial_execution: bool = False
    max_partial_wait_ms: int = 5000
    cancel_on_error: bool = True
    validate_on_stream: bool = True
    backpressure_threshold: int = 100
    chunk_delay_ms: int = 10


@dataclass(slots=True)
class StreamChunk:
    """
    Chunk di stream.

    Attributes:
        tool_name: Nome del tool
        parameter: Nome parametro
        value: Valore (puo' essere parziale)
        is_complete: Se parametro completo
        is_partial: Se valore parziale
        index: Indice del chunk
        timestamp: Timestamp ricezione
        stream_id: ID univoco dello stream
        chunk_type: Tipo del chunk (parameter, result, error, done)
    """

    tool_name: str
    parameter: str
    value: Any
    is_complete: bool = False
    is_partial: bool = False
    index: int = 0
    timestamp: float = 0.0
    stream_id: str = ""
    chunk_type: str = "parameter"  # parameter, result, error, done

    def to_dict(self) -> dict[str, Any]:
        """Converte chunk in dizionario."""
        return {
            "tool_name": self.tool_name,
            "parameter": self.parameter,
            "value": self.value,
            "is_complete": self.is_complete,
            "is_partial": self.is_partial,
            "index": self.index,
            "timestamp": self.timestamp,
            "stream_id": self.stream_id,
            "chunk_type": self.chunk_type,
        }


class StreamedToolCall:
    """
    Tool call costruito progressivamente.

    Attributes:
        tool_name: Nome del tool
        parameters: Parametri raccolti
        state: Stato dello stream
        chunks: Chunk ricevuti
        start_time: Timestamp inizio
        end_time: Timestamp fine
        error: Errore se presente
        stream_id: ID univoco dello stream
        result: Risultato dell'esecuzione
        mode: Modalita' streaming
    """

    def __init__(
        self,
        tool_name: str = "",
        parameters: dict[str, Any] | None = None,
        state: StreamState = StreamState.IDLE,
        chunks: list[StreamChunk] | None = None,
        start_time: float = 0.0,
        end_time: float = 0.0,
        error: Exception | None = None,
        stream_id: str = "",
        result: Any = None,
        mode: StreamingMode = StreamingMode.PARTIAL,
    ) -> None:
        self.tool_name = tool_name
        self.parameters = parameters if parameters is not None else {}
        self.state = state
        self.chunks = chunks if chunks is not None else []
        self.start_time = start_time
        self.end_time = end_time
        self.error = error
        self.stream_id = stream_id or str(uuid.uuid4())[:8]
        self.result = result
        self.mode = mode
        self._pause_event: asyncio.Event = asyncio.Event()
        self._pause_event.set()  # Non in pausa di default

    def is_ready(self) -> bool:
        """Verifica se tool call e' pronto per esecuzione."""
        return (
            self.state == StreamState.STREAMING
            and len(self.parameters) > 0
            and all(
                chunk.is_complete
                for chunk in self.chunks
                if chunk.chunk_type == "parameter"
            )
        )

    def get_partial_params(self) -> dict[str, Any]:
        """Ottiene parametri parziali."""
        return dict(self.parameters)

    def add_chunk(self, chunk: StreamChunk) -> None:
        """Aggiunge chunk e aggiorna parametri."""
        self.chunks.append(chunk)
        if chunk.chunk_type == "parameter":
            self.parameters[chunk.parameter] = chunk.value

    async def wait_if_paused(self) -> None:
        """Attende se lo stream e' in pausa."""
        await self._pause_event.wait()

    def pause(self) -> None:
        """Mette in pausa lo stream."""
        self._pause_event.clear()
        self.state = StreamState.PAUSED

    def resume(self) -> None:
        """Riprende lo stream dalla pausa."""
        self._pause_event.set()
        self.state = StreamState.STREAMING


@dataclass
class FineGrainedStreamer:
    """
    Streamer per tool calls con fine-grained control.

    Features:
    - Streaming parametri senza buffering completo
    - Partial execution per lunghe operazioni
    - Early termination su errore/timeout
    - Backpressure handling con asyncio.Queue
    - Validation durante streaming
    - Cancellation support

    Example:
        >>> streamer = FineGrainedStreamer()
        >>>
        >>> # Streaming async
        >>> async for chunk in streamer.stream_tool_call(
        ...     tool_name="query_api",
        ...     prompt="Query users endpoint",
        ... ):
        ...     if chunk.is_complete:
        ...         print(f"Complete: {chunk.parameter} = {chunk.value}")
        ...     else:
        ...         print(f"Partial: {chunk.parameter}")
        >>>
        >>> # Con partial execution
        >>> async for event in streamer.stream_with_partial(
        ...     tool_name="long_operation",
        ...     prompt="Process large dataset",
        ... ):
        ...     if event["type"] == "partial_execute":
        ...         result = await execute_partial(event["params"])
    """

    _config: StreamConfig = field(default_factory=StreamConfig)
    _active_streams: dict[str, StreamedToolCall] = field(default_factory=dict)
    _queues: dict[str, asyncio.Queue[StreamChunk | None]] = field(
        default_factory=dict
    )
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    _tool_executor: Callable[[str, dict[str, Any]], Coroutine[Any, Any, Any]] | None = (
        field(default=None, repr=False)
    )
    _initialized: bool = field(default=False, repr=False)

    async def initialize(
        self,
        tool_executor: Callable[[str, dict[str, Any]], Coroutine[Any, Any, Any]]
        | None = None,
    ) -> None:
        """
        Setup iniziale dello streamer.

        Args:
            tool_executor: Funzione async per eseguire tool (opzionale)
        """
        self._tool_executor = tool_executor
        self._initialized = True

    async def stream_tool_call(
        self,
        tool_name: str,
        prompt: str,
        schema: dict[str, Any] | None = None,
        mode: StreamingMode = StreamingMode.PARTIAL,
        parameters: dict[str, Any] | None = None,
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream tool call parameters.

        Yields chunk man mano che parametri arrivano.

        Args:
            tool_name: Nome del tool
            prompt: Prompt per Claude
            schema: JSON Schema opzionale
            mode: Modalita' streaming (PARTIAL o FULL)
            parameters: Parametri pre-impostati (opzionale)

        Yields:
            StreamChunk per ogni parametro/aggiornamento

        Example:
            >>> async for chunk in streamer.stream_tool_call(
            ...     tool_name="query_api",
            ...     prompt="Query the users endpoint",
            ... ):
            ...     print(f"{chunk.parameter}: {chunk.value}")
        """
        if not self._initialized:
            await self.initialize()

        # Crea nuovo stream
        stream = StreamedToolCall(
            tool_name=tool_name,
            mode=mode,
            start_time=time.time(),
            state=StreamState.STREAMING,
        )

        # Registra stream
        async with self._lock:
            self._active_streams[stream.stream_id] = stream
            self._queues[stream.stream_id] = asyncio.Queue(
                maxsize=self._config.backpressure_threshold
            )

        queue = self._queues[stream.stream_id]

        try:
            # Simula streaming parametri (in realta', questi arriverebbero da Claude)
            params_to_stream = parameters or self._extract_params_from_prompt(prompt)

            chunk_index = 0

            # Streamma ogni parametro
            for param_name, param_value in params_to_stream.items():
                # Check cancellation
                if stream.state == StreamState.CANCELLED:
                    break

                # Attende se in pausa
                await stream.wait_if_paused()

                # Streamma parametro (potenzialmente in chunk parziali)
                async for chunk in self._stream_parameter(
                    stream_id=stream.stream_id,
                    tool_name=tool_name,
                    param_name=param_name,
                    param_value=param_value,
                    index_start=chunk_index,
                ):
                    # Validazione durante streaming
                    if self._config.validate_on_stream and schema:
                        if not await self._validate_chunk(chunk, schema):
                            if self._config.cancel_on_error:
                                raise ValueError(
                                    f"Validation failed for {param_name}"
                                )

                    stream.add_chunk(chunk)
                    yield chunk
                    chunk_index += 1

                    # Backpressure handling
                    await self._handle_backpressure(queue)

            # Yield chunk di completamento parametri
            done_chunk = StreamChunk(
                tool_name=tool_name,
                parameter="__done__",
                value=None,
                is_complete=True,
                index=chunk_index,
                timestamp=time.time(),
                stream_id=stream.stream_id,
                chunk_type="done",
            )
            yield done_chunk

            # FULL mode: streamma anche il risultato
            if mode == StreamingMode.FULL and self._tool_executor:
                async for result_chunk in self._stream_result(
                    stream_id=stream.stream_id,
                    tool_name=tool_name,
                    parameters=stream.parameters,
                    index_start=chunk_index + 1,
                ):
                    yield result_chunk

            stream.state = StreamState.COMPLETED
            stream.end_time = time.time()

        except asyncio.CancelledError:
            stream.state = StreamState.CANCELLED
            stream.end_time = time.time()
            yield StreamChunk(
                tool_name=tool_name,
                parameter="__cancelled__",
                value=None,
                timestamp=time.time(),
                stream_id=stream.stream_id,
                chunk_type="error",
            )
            raise

        except Exception as e:
            stream.state = StreamState.ERROR
            stream.error = e
            stream.end_time = time.time()
            yield StreamChunk(
                tool_name=tool_name,
                parameter="__error__",
                value=str(e),
                timestamp=time.time(),
                stream_id=stream.stream_id,
                chunk_type="error",
            )
            if self._config.cancel_on_error:
                raise

        finally:
            # Cleanup
            async with self._lock:
                self._active_streams.pop(stream.stream_id, None)
                self._queues.pop(stream.stream_id, None)

    async def _stream_parameter(
        self,
        stream_id: str,
        tool_name: str,
        param_name: str,
        param_value: Any,
        index_start: int = 0,
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream singolo parametro, potenzialmente in chunk parziali.

        Per valori complessi (liste, dict), streamma elementi singolarmente.
        Per stringhe lunghe, streamma in segmenti.
        """
        timestamp = time.time()

        # Valori semplici: singolo chunk
        if isinstance(param_value, (int, float, bool, type(None))):
            yield StreamChunk(
                tool_name=tool_name,
                parameter=param_name,
                value=param_value,
                is_complete=True,
                is_partial=False,
                index=index_start,
                timestamp=timestamp,
                stream_id=stream_id,
                chunk_type="parameter",
            )

        # Stringhe: streamma in segmenti se lunghe
        elif isinstance(param_value, str):
            if len(param_value) <= self._config.buffer_size:
                yield StreamChunk(
                    tool_name=tool_name,
                    parameter=param_name,
                    value=param_value,
                    is_complete=True,
                    is_partial=False,
                    index=index_start,
                    timestamp=timestamp,
                    stream_id=stream_id,
                    chunk_type="parameter",
                )
            else:
                # Streamma in chunk
                chunks_count = (
                    len(param_value) // self._config.buffer_size
                ) + 1
                for i in range(chunks_count):
                    start = i * self._config.buffer_size
                    end = start + self._config.buffer_size
                    segment = param_value[start:end]
                    is_last = i == chunks_count - 1

                    yield StreamChunk(
                        tool_name=tool_name,
                        parameter=param_name,
                        value=segment,
                        is_complete=is_last,
                        is_partial=not is_last,
                        index=index_start + i,
                        timestamp=time.time(),
                        stream_id=stream_id,
                        chunk_type="parameter",
                    )

                    # Delay per simulare streaming
                    if self._config.chunk_delay_ms > 0:
                        await asyncio.sleep(
                            self._config.chunk_delay_ms / 1000.0
                        )

        # Liste: streamma elementi
        elif isinstance(param_value, list):
            if len(param_value) == 0:
                yield StreamChunk(
                    tool_name=tool_name,
                    parameter=param_name,
                    value=[],
                    is_complete=True,
                    index=index_start,
                    timestamp=timestamp,
                    stream_id=stream_id,
                    chunk_type="parameter",
                )
            else:
                for i, item in enumerate(param_value):
                    is_last = i == len(param_value) - 1
                    yield StreamChunk(
                        tool_name=tool_name,
                        parameter=f"{param_name}[{i}]",
                        value=item,
                        is_complete=is_last,
                        is_partial=not is_last,
                        index=index_start + i,
                        timestamp=time.time(),
                        stream_id=stream_id,
                        chunk_type="parameter",
                    )

                    if self._config.chunk_delay_ms > 0:
                        await asyncio.sleep(
                            self._config.chunk_delay_ms / 1000.0
                        )

        # Dict: streamma chiavi
        elif isinstance(param_value, dict):
            if len(param_value) == 0:
                yield StreamChunk(
                    tool_name=tool_name,
                    parameter=param_name,
                    value={},
                    is_complete=True,
                    index=index_start,
                    timestamp=timestamp,
                    stream_id=stream_id,
                    chunk_type="parameter",
                )
            else:
                for i, (k, v) in enumerate(param_value.items()):
                    is_last = i == len(param_value) - 1
                    yield StreamChunk(
                        tool_name=tool_name,
                        parameter=f"{param_name}.{k}",
                        value=v,
                        is_complete=is_last,
                        is_partial=not is_last,
                        index=index_start + i,
                        timestamp=time.time(),
                        stream_id=stream_id,
                        chunk_type="parameter",
                    )

                    if self._config.chunk_delay_ms > 0:
                        await asyncio.sleep(
                            self._config.chunk_delay_ms / 1000.0
                        )

        # Altri tipi: singolo chunk
        else:
            yield StreamChunk(
                tool_name=tool_name,
                parameter=param_name,
                value=param_value,
                is_complete=True,
                index=index_start,
                timestamp=timestamp,
                stream_id=stream_id,
                chunk_type="parameter",
            )

    async def _stream_result(
        self,
        stream_id: str,
        tool_name: str,
        parameters: dict[str, Any],
        index_start: int = 0,
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream risultato dell'esecuzione tool (FULL mode).
        """
        if not self._tool_executor:
            return

        try:
            # Esegui tool
            result = await self._execute_tool(tool_name, parameters)

            # Streamma risultato
            if result is None:
                yield StreamChunk(
                    tool_name=tool_name,
                    parameter="__result__",
                    value=None,
                    is_complete=True,
                    index=index_start,
                    timestamp=time.time(),
                    stream_id=stream_id,
                    chunk_type="result",
                )
            elif isinstance(result, (list, dict, str)):
                # Riutilizza _stream_parameter per risultati complessi
                async for chunk in self._stream_parameter(
                    stream_id=stream_id,
                    tool_name=tool_name,
                    param_name="__result__",
                    param_value=result,
                    index_start=index_start,
                ):
                    # Cambia chunk_type
                    chunk.chunk_type = "result"
                    yield chunk
            else:
                yield StreamChunk(
                    tool_name=tool_name,
                    parameter="__result__",
                    value=result,
                    is_complete=True,
                    index=index_start,
                    timestamp=time.time(),
                    stream_id=stream_id,
                    chunk_type="result",
                )

        except Exception as e:
            yield StreamChunk(
                tool_name=tool_name,
                parameter="__result_error__",
                value=str(e),
                is_complete=True,
                index=index_start,
                timestamp=time.time(),
                stream_id=stream_id,
                chunk_type="error",
            )

    async def _execute_tool(
        self,
        tool_name: str,
        parameters: dict[str, Any],
    ) -> Any:
        """
        Esecuzione effettiva del tool.

        Args:
            tool_name: Nome del tool
            parameters: Parametri per l'esecuzione

        Returns:
            Risultato dell'esecuzione

        Raises:
            RuntimeError: Se tool_executor non configurato
        """
        if self._tool_executor is None:
            raise RuntimeError(
                "Tool executor not configured. Call initialize() with executor."
            )

        return await self._tool_executor(tool_name, parameters)

    async def stream_with_partial(
        self,
        tool_name: str,
        prompt: str,
        partial_handler: Callable[[dict[str, Any]], Coroutine[Any, Any, Any]]
        | None = None,
        schema: dict[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Stream con partial execution support.

        Permette esecuzione con parametri parziali per
        operazioni lunghe o con dipendenze.

        Args:
            tool_name: Nome del tool
            prompt: Prompt per Claude
            partial_handler: Handler per partial execution
            schema: JSON Schema opzionale

        Yields:
            Event dict con type, params, chunk

        Example:
            >>> async for event in streamer.stream_with_partial(
            ...     tool_name="long_query",
            ...     prompt="Query large dataset",
            ... ):
            ...     if event["type"] == "partial_ready":
            ...         # Esegui con parametri parziali
            ...         await execute_partial(event["params"])
        """
        if not self._config.enable_partial_execution:
            # Fallback a streaming normale
            async for chunk in self.stream_tool_call(
                tool_name=tool_name,
                prompt=prompt,
                schema=schema,
                mode=StreamingMode.PARTIAL,
            ):
                yield {
                    "type": "chunk",
                    "params": {chunk.parameter: chunk.value},
                    "chunk": chunk,
                }
            return

        # Crea stream per partial execution
        stream = StreamedToolCall(
            tool_name=tool_name,
            mode=StreamingMode.PARTIAL,
            start_time=time.time(),
            state=StreamState.STREAMING,
        )

        async with self._lock:
            self._active_streams[stream.stream_id] = stream

        params_to_stream = self._extract_params_from_prompt(prompt)
        partial_params: dict[str, Any] = {}
        last_partial_time = time.time()

        try:
            for param_name, param_value in params_to_stream.items():
                await stream.wait_if_paused()

                if stream.state == StreamState.CANCELLED:
                    break

                # Aggiungi parametro ai parziali
                partial_params[param_name] = param_value
                stream.parameters[param_name] = param_value

                # Yield evento parametro
                yield {
                    "type": "parameter",
                    "params": {param_name: param_value},
                    "partial_params": dict(partial_params),
                }

                # Check se abbiamo abbastanza per partial execution
                current_time = time.time()
                time_since_partial = (
                    current_time - last_partial_time
                ) * 1000

                if (
                    partial_handler
                    and time_since_partial >= self._config.max_partial_wait_ms
                ):
                    # Esegui partial
                    result = await partial_handler(partial_params)
                    yield {
                        "type": "partial_execute",
                        "params": dict(partial_params),
                        "result": result,
                    }
                    last_partial_time = current_time

            # Final execution con tutti i parametri
            if partial_handler:
                result = await partial_handler(partial_params)
                yield {
                    "type": "complete",
                    "params": dict(partial_params),
                    "result": result,
                }

            stream.state = StreamState.COMPLETED

        except asyncio.CancelledError:
            stream.state = StreamState.CANCELLED
            yield {
                "type": "cancelled",
                "params": dict(partial_params),
            }
            raise

        except Exception as e:
            stream.state = StreamState.ERROR
            stream.error = e
            yield {
                "type": "error",
                "params": dict(partial_params),
                "error": str(e),
            }
            raise

        finally:
            async with self._lock:
                self._active_streams.pop(stream.stream_id, None)

    async def cancel(self, stream_id: str) -> bool:
        """
        Cancella streaming.

        Args:
            stream_id: ID dello stream

        Returns:
            True se cancellato, False se non trovato
        """
        async with self._lock:
            stream = self._active_streams.get(stream_id)
            if stream is None:
                return False

            stream.state = StreamState.CANCELLED

            # Svuota queue se presente
            queue = self._queues.get(stream_id)
            if queue:
                while not queue.empty():
                    try:
                        queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break

            return True

    async def cancel_stream(self, stream_id: str) -> bool:
        """Alias per cancel()."""
        return await self.cancel(stream_id)

    def get_state(self) -> dict[str, Any]:
        """
        Ottiene stato corrente dello streamer.

        Returns:
            Dict con stato completo
        """
        return {
            "initialized": self._initialized,
            "active_streams": len(self._active_streams),
            "streams": {
                sid: {
                    "tool_name": s.tool_name,
                    "state": s.state.value,
                    "parameters": list(s.parameters.keys()),
                    "chunks_count": len(s.chunks),
                    "mode": s.mode.value,
                    "error": str(s.error) if s.error else None,
                }
                for sid, s in self._active_streams.items()
            },
            "config": {
                "buffer_size": self._config.buffer_size,
                "timeout_ms": self._config.timeout_ms,
                "enable_partial_execution": self._config.enable_partial_execution,
                "backpressure_threshold": self._config.backpressure_threshold,
            },
        }

    async def get_stream_status(self, stream_id: str) -> dict[str, Any] | None:
        """
        Ottiene stato di stream attivo.

        Args:
            stream_id: ID dello stream

        Returns:
            Dict con state, params, chunks, etc.
        """
        async with self._lock:
            stream = self._active_streams.get(stream_id)
            if stream is None:
                return None

            return {
                "stream_id": stream.stream_id,
                "tool_name": stream.tool_name,
                "state": stream.state.value,
                "mode": stream.mode.value,
                "parameters": dict(stream.parameters),
                "chunks_count": len(stream.chunks),
                "start_time": stream.start_time,
                "end_time": stream.end_time,
                "duration": (stream.end_time or time.time()) - stream.start_time,
                "error": str(stream.error) if stream.error else None,
                "is_ready": stream.is_ready(),
            }

    async def pause_stream(self, stream_id: str) -> bool:
        """
        Mette in pausa stream.

        Args:
            stream_id: ID dello stream

        Returns:
            True se messo in pausa
        """
        async with self._lock:
            stream = self._active_streams.get(stream_id)
            if stream is None:
                return False

            if stream.state != StreamState.STREAMING:
                return False

            stream.pause()
            return True

    async def resume_stream(self, stream_id: str) -> bool:
        """
        Riprende stream in pausa.

        Args:
            stream_id: ID dello stream

        Returns:
            True se ripreso
        """
        async with self._lock:
            stream = self._active_streams.get(stream_id)
            if stream is None:
                return False

            if stream.state != StreamState.PAUSED:
                return False

            stream.resume()
            return True

    def get_active_streams(self) -> list[str]:
        """
        Ottiene lista stream attivi.

        Returns:
            Lista di stream IDs
        """
        return list(self._active_streams.keys())

    async def _validate_chunk(
        self,
        chunk: StreamChunk,
        schema: dict[str, Any],
    ) -> bool:
        """
        Valida chunk contro schema.

        Args:
            chunk: Chunk da validare
            schema: JSON Schema

        Returns:
            True se valido
        """
        if not schema:
            return True

        # Validazione base
        properties = schema.get("properties", {})
        required = schema.get("required", [])

        param_name = chunk.parameter
        param_value = chunk.value

        # Se parametro richiesto, deve avere valore
        if param_name in required:
            if param_value is None and chunk.is_complete:
                return False

        # Check tipo se definito
        if param_name in properties:
            prop_schema = properties[param_name]
            expected_type = prop_schema.get("type")

            if expected_type and chunk.is_complete:
                type_map = {
                    "string": str,
                    "integer": int,
                    "number": (int, float),
                    "boolean": bool,
                    "array": list,
                    "object": dict,
                }
                expected_py_type = type_map.get(expected_type)
                if expected_py_type and not isinstance(
                    param_value, expected_py_type
                ):
                    return False

        return True

    async def _handle_backpressure(
        self,
        queue: asyncio.Queue[StreamChunk | None],
    ) -> None:
        """
        Gestisce backpressure quando consumer e' lento.

        Se la queue e' quasi piena, attende un po'.
        """
        if queue.qsize() >= self._config.backpressure_threshold * 0.8:
            # Backpressure: attendi che si svuoti un po'
            await asyncio.sleep(self._config.chunk_delay_ms / 1000.0 * 5)

    def _merge_partial_params(
        self,
        existing: dict[str, Any],
        chunk: StreamChunk,
    ) -> dict[str, Any]:
        """
        Merge chunk parziale in parametri esistenti.

        Args:
            existing: Parametri esistenti
            chunk: Nuovo chunk

        Returns:
            Parametri merged
        """
        result = dict(existing)

        param_name = chunk.parameter
        param_value = chunk.value

        # Gestione array indicizzati (es. "items[0]")
        if "[" in param_name and param_name.endswith("]"):
            base_name = param_name.split("[")[0]
            index_str = param_name.split("[")[1].rstrip("]")
            try:
                index = int(index_str)
                if base_name not in result:
                    result[base_name] = []
                while len(result[base_name]) <= index:
                    result[base_name].append(None)
                result[base_name][index] = param_value
            except ValueError:
                result[param_name] = param_value

        # Gestione nested (es. "config.timeout")
        elif "." in param_name:
            parts = param_name.split(".")
            current = result
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]
            current[parts[-1]] = param_value

        # Parametro semplice
        else:
            result[param_name] = param_value

        return result

    def _extract_params_from_prompt(self, prompt: str) -> dict[str, Any]:
        """
        Estrae parametri dal prompt (simulazione).

        In produzione, questo verrebbe dalla risposta streaming di Claude.
        Qui simuliamo estrazione base.

        Args:
            prompt: Prompt dell'utente

        Returns:
            Dict di parametri estratti
        """
        # Simulazione: restituisce parametri base
        params: dict[str, Any] = {}

        # Estrazione semplice da prompt
        words = prompt.split()
        if len(words) > 0:
            params["prompt"] = prompt
        if len(words) > 3:
            params["query"] = " ".join(words[:5])

        return params if params else {"prompt": prompt}


class StreamingManager:
    """
    Manager ad alto livello per streaming V17.

    Wrapper di FineGrainedStreamer con API semplificata e statistiche.

    Features:
    - PARTIAL Mode: Streaming parametri parziali
    - FULL Mode: Streaming risposta completa
    - Chunked Transfer: Invio in chunks
    - Backpressure: Controllo flusso automatico

    Example:
        >>> manager = StreamingManager(mode=StreamingMode.PARTIAL)
        >>> await manager.initialize()
        >>>
        >>> # Stream data generico
        >>> async for chunk in manager.stream(data={"key": "value"}):
        ...     process(chunk)
        >>>
        >>> # Stream parametri tool
        >>> async for params in manager.stream_params({"query": "test"}):
        ...     print(params)
        >>>
        >>> # Ottieni statistiche
        >>> stats = manager.get_stats()
        >>> print(f"Chunks sent: {stats.chunks_sent}")
    """

    def __init__(
        self,
        mode: StreamingMode = StreamingMode.FULL,
        config: StreamConfig | None = None,
    ) -> None:
        """
        Inizializza StreamingManager.

        Args:
            mode: Modalita' streaming (PARTIAL o FULL)
            config: Configurazione opzionale
        """
        self._mode = mode
        self._config = config or StreamConfig()
        self._streamer = FineGrainedStreamer(_config=self._config)
        self._stats = StreamingStats()
        self._initialized = False
        self._start_time: float | None = None

    async def initialize(
        self,
        tool_executor: Callable[[str, dict[str, Any]], Coroutine[Any, Any, Any]]
        | None = None,
    ) -> None:
        """
        Setup iniziale del manager.

        Args:
            tool_executor: Funzione async per eseguire tool (opzionale)
        """
        await self._streamer.initialize(tool_executor)
        self._initialized = True
        self._start_time = time.time()

    @property
    def mode(self) -> StreamingMode:
        """Modalita' streaming corrente."""
        return self._mode

    def set_mode(self, mode: StreamingMode) -> None:
        """
        Imposta modalita' streaming.

        Args:
            mode: Nuova modalita' (PARTIAL o FULL)
        """
        self._mode = mode

    def get_stats(self) -> StreamingStats:
        """
        Ottiene statistiche streaming.

        Returns:
            StreamingStats con metriche aggregate
        """
        # Aggiorna durata totale
        if self._start_time:
            self._stats.total_duration_ms = (time.time() - self._start_time) * 1000
        return self._stats

    async def stream(
        self,
        data: Any,
        chunk_size: int = 1024,
    ) -> AsyncIterator[bytes]:
        """
        Stream generico di dati in chunks.

        Args:
            data: Dati da streammare (str, bytes, dict, list)
            chunk_size: Dimensione chunk in bytes (default 1024)

        Yields:
            bytes chunk per chunk

        Example:
            >>> async for chunk in manager.stream(large_json, chunk_size=512):
            ...     socket.send(chunk)
        """
        if not self._initialized:
            await self.initialize()

        # Converti in bytes
        if isinstance(data, str):
            data_bytes = data.encode("utf-8")
        elif isinstance(data, bytes):
            data_bytes = data
        elif isinstance(data, (dict, list)):
            import json
            data_bytes = json.dumps(data).encode("utf-8")
        else:
            data_bytes = str(data).encode("utf-8")

        # Streamma in chunks
        total_size = len(data_bytes)
        offset = 0
        chunk_index = 0

        while offset < total_size:
            chunk_data = data_bytes[offset : offset + chunk_size]
            yield chunk_data

            # Aggiorna statistiche
            self._stats.update_chunk(len(chunk_data))

            offset += chunk_size
            chunk_index += 1

            # Simula delay per backpressure
            if self._config.chunk_delay_ms > 0:
                await asyncio.sleep(self._config.chunk_delay_ms / 1000.0)

    async def stream_params(
        self,
        params: dict[str, Any],
        tool_name: str = "__default__",
        schema: dict[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Stream parametri con modalita' corrente.

        Args:
            params: Parametri da streammare
            tool_name: Nome tool (default "__default__")
            schema: JSON Schema opzionale per validazione

        Yields:
            Dict con parametro chunk

        Example:
            >>> async for param_chunk in manager.stream_params({"a": 1, "b": 2}):
            ...     print(f"Received: {param_chunk}")
        """
        if not self._initialized:
            await self.initialize()

        stream_start = time.time()

        try:
            async for chunk in self._streamer.stream_tool_call(
                tool_name=tool_name,
                prompt="",  # Usiamo parameters diretti
                schema=schema,
                mode=self._mode,
                parameters=params,
            ):
                # Aggiorna statistiche
                chunk_size = len(str(chunk.value)) if chunk.value else 0
                self._stats.update_chunk(chunk_size)

                yield chunk.to_dict()

                # Track backpressure
                queue = self._streamer._queues.get(chunk.stream_id)
                if queue and queue.qsize() >= self._config.backpressure_threshold * 0.8:
                    self._stats.backpressure_events += 1

            self._stats.streams_completed += 1

        except asyncio.CancelledError:
            self._stats.streams_cancelled += 1
            raise

        except Exception:
            self._stats.streams_errored += 1
            raise

        finally:
            # Aggiorna durata
            duration_ms = (time.time() - stream_start) * 1000
            self._stats.total_duration_ms += duration_ms

    async def stream_tool(
        self,
        tool_name: str,
        prompt: str,
        schema: dict[str, Any] | None = None,
        parameters: dict[str, Any] | None = None,
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream tool call con modalita' corrente.

        Args:
            tool_name: Nome del tool
            prompt: Prompt per Claude
            schema: JSON Schema opzionale
            parameters: Parametri pre-impostati

        Yields:
            StreamChunk per ogni aggiornamento

        Example:
            >>> async for chunk in manager.stream_tool("query_api", "Query users"):
            ...     if chunk.is_complete:
            ...         print(f"Complete: {chunk.parameter}")
        """
        if not self._initialized:
            await self.initialize()

        stream_start = time.time()

        try:
            async for chunk in self._streamer.stream_tool_call(
                tool_name=tool_name,
                prompt=prompt,
                schema=schema,
                mode=self._mode,
                parameters=parameters,
            ):
                # Aggiorna statistiche
                chunk_size = len(str(chunk.value)) if chunk.value else 0
                self._stats.update_chunk(chunk_size)

                yield chunk

            self._stats.streams_completed += 1

        except asyncio.CancelledError:
            self._stats.streams_cancelled += 1
            raise

        except Exception:
            self._stats.streams_errored += 1
            raise

        finally:
            duration_ms = (time.time() - stream_start) * 1000
            self._stats.total_duration_ms += duration_ms

    async def stream_with_partial(
        self,
        tool_name: str,
        prompt: str,
        partial_handler: Callable[[dict[str, Any]], Coroutine[Any, Any, Any]]
        | None = None,
        schema: dict[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Stream con supporto partial execution.

        Args:
            tool_name: Nome del tool
            prompt: Prompt per Claude
            partial_handler: Handler per esecuzione parziale
            schema: JSON Schema opzionale

        Yields:
            Event dict con type, params, result

        Example:
            >>> async for event in manager.stream_with_partial(
            ...     "long_query", "Process data",
            ...     partial_handler=handle_partial,
            ... ):
            ...     if event["type"] == "partial_execute":
            ...         print(f"Partial result: {event['result']}")
        """
        if not self._initialized:
            await self.initialize()

        # Abilita partial execution
        original_setting = self._streamer._config.enable_partial_execution
        self._streamer._config.enable_partial_execution = True

        stream_start = time.time()

        try:
            async for event in self._streamer.stream_with_partial(
                tool_name=tool_name,
                prompt=prompt,
                partial_handler=partial_handler,
                schema=schema,
            ):
                yield event

            self._stats.streams_completed += 1

        except asyncio.CancelledError:
            self._stats.streams_cancelled += 1
            raise

        except Exception:
            self._stats.streams_errored += 1
            raise

        finally:
            self._streamer._config.enable_partial_execution = original_setting
            duration_ms = (time.time() - stream_start) * 1000
            self._stats.total_duration_ms += duration_ms

    def get_active_streams(self) -> list[str]:
        """
        Ottiene lista stream attivi.

        Returns:
            Lista di stream IDs
        """
        return self._streamer.get_active_streams()

    async def cancel_stream(self, stream_id: str) -> bool:
        """
        Cancella stream attivo.

        Args:
            stream_id: ID dello stream

        Returns:
            True se cancellato
        """
        result = await self._streamer.cancel(stream_id)
        if result:
            self._stats.streams_cancelled += 1
        return result

    async def pause_stream(self, stream_id: str) -> bool:
        """
        Mette in pausa stream.

        Args:
            stream_id: ID dello stream

        Returns:
            True se messo in pausa
        """
        return await self._streamer.pause_stream(stream_id)

    async def resume_stream(self, stream_id: str) -> bool:
        """
        Riprende stream in pausa.

        Args:
            stream_id: ID dello stream

        Returns:
            True se ripreso
        """
        return await self._streamer.resume_stream(stream_id)

    def get_state(self) -> dict[str, Any]:
        """
        Ottiene stato completo del manager.

        Returns:
            Dict con mode, stats, active_streams
        """
        return {
            "mode": self._mode.value,
            "initialized": self._initialized,
            "stats": self.get_stats().to_dict(),
            "active_streams": self.get_active_streams(),
            "streamer_state": self._streamer.get_state(),
        }

    async def get_stream_status(self, stream_id: str) -> dict[str, Any] | None:
        """
        Ottiene stato di stream specifico.

        Args:
            stream_id: ID dello stream

        Returns:
            Dict con stato o None se non trovato
        """
        return await self._streamer.get_stream_status(stream_id)

    def reset_stats(self) -> None:
        """Resetta statistiche streaming."""
        self._stats = StreamingStats()
        self._start_time = time.time()
