"""
Test per WebSocket Server V17

Test unitari per websocket_server.py con focus su:
- Configurazione server
- Client management
- Broadcast functionality
- Heartbeat handling
- Subscription management
"""

import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from dataclasses import asdict

# Skip tutti i test se websockets non disponibile
pytest.importorskip("websockets")

from lib.v17.websocket_server import (
    WebSocketServer,
    WebSocketConfig,
    WebSocketClient,
    MessageType,
    create_websocket_server,
)


class TestWebSocketConfig:
    """Test per WebSocketConfig dataclass."""

    def test_default_config(self):
        """Verifica valori di default."""
        config = WebSocketConfig()

        assert config.host == "localhost"
        assert config.port == 8765
        assert config.heartbeat_interval == 30.0
        assert config.heartbeat_timeout == 60.0
        assert config.max_clients == 1000
        assert config.message_queue_size == 1000

    def test_custom_config(self):
        """Verifica configurazione personalizzata."""
        config = WebSocketConfig(
            host="0.0.0.0",
            port=9000,
            max_clients=500
        )

        assert config.host == "0.0.0.0"
        assert config.port == 9000
        assert config.max_clients == 500


class TestWebSocketClient:
    """Test per WebSocketClient dataclass."""

    def test_client_creation(self):
        """Verifica creazione client."""
        mock_ws = MagicMock()
        client = WebSocketClient(
            client_id="test-123",
            websocket=mock_ws
        )

        assert client.client_id == "test-123"
        assert client.websocket == mock_ws
        assert len(client.subscriptions) == 0
        assert client.last_heartbeat > 0

    def test_update_heartbeat(self):
        """Verifica aggiornamento heartbeat."""
        mock_ws = MagicMock()
        client = WebSocketClient(
            client_id="test-123",
            websocket=mock_ws
        )

        old_heartbeat = client.last_heartbeat
        client.update_heartbeat()

        assert client.last_heartbeat >= old_heartbeat

    def test_is_alive(self):
        """Verifica controllo client attivo."""
        mock_ws = MagicMock()
        client = WebSocketClient(
            client_id="test-123",
            websocket=mock_ws
        )

        # Client appena creato e vivo
        assert client.is_alive(timeout_seconds=60.0) is True

        # Simula client inattivo modificando last_heartbeat
        client.last_heartbeat = client.last_heartbeat - 120
        assert client.is_alive(timeout_seconds=60.0) is False

    def test_connection_duration(self):
        """Verifica calcolo durata connessione."""
        mock_ws = MagicMock()
        client = WebSocketClient(
            client_id="test-123",
            websocket=mock_ws
        )

        import time
        time.sleep(0.1)

        assert client.connection_duration >= 0.1


class TestWebSocketServer:
    """Test per WebSocketServer."""

    def test_server_creation_default(self):
        """Verifica creazione server con default."""
        server = WebSocketServer()

        assert server.host == "localhost"
        assert server.port == 8765
        assert server.running is False
        assert server.get_connected_clients() == 0

    def test_server_creation_custom_config(self):
        """Verifica creazione server con config custom."""
        config = WebSocketConfig(
            host="127.0.0.1",
            port=9000,
            max_clients=100
        )
        server = WebSocketServer(config)

        assert server.host == "127.0.0.1"
        assert server.port == 9000
        assert server.config.max_clients == 100

    def test_get_client_ids_empty(self):
        """Verifica get_client_ids con server vuoto."""
        server = WebSocketServer()
        assert server.get_client_ids() == []

    def test_get_client_info_not_found(self):
        """Verifica get_client_info per client inesistente."""
        server = WebSocketServer()
        assert server.get_client_info("non-existent") is None

    def test_get_stats_not_running(self):
        """Verifica statistiche server non avviato."""
        server = WebSocketServer()
        stats = server.get_stats()

        assert stats["running"] is False
        assert stats["host"] == "localhost"
        assert stats["port"] == 8765
        assert stats["connected_clients"] == 0

    @pytest.mark.asyncio
    async def test_start_stop_server(self):
        """Verifica avvio e arresto server."""
        server = WebSocketServer()

        # Avvia in background
        start_task = asyncio.create_task(server.start())

        # Attendi un po per far partire il server
        await asyncio.sleep(0.1)

        assert server.running is True

        # Arresta server
        await server.stop()
        assert server.running is False

        # Cleanup task
        start_task.cancel()
        try:
            await start_task
        except asyncio.CancelledError:
            pass

    @pytest.mark.asyncio
    async def test_broadcast_not_running(self):
        """Verifica broadcast con server non avviato."""
        server = WebSocketServer()

        result = await server.broadcast({"test": "data"})
        assert result == 0

    @pytest.mark.asyncio
    async def test_send_to_client_not_found(self):
        """Verifica invio a client inesistente."""
        server = WebSocketServer()

        result = await server.send_to_client("non-existent", {"test": "data"})
        assert result is False

    @pytest.mark.asyncio
    async def test_subscribe_client(self):
        """Verifica sottoscrizione client a topic."""
        server = WebSocketServer()
        mock_ws = MagicMock()

        result = await server.subscribe(
            "client-1",
            mock_ws,
            ["topic1", "topic2"]
        )

        assert result is True
        assert server.get_connected_clients() == 1
        assert "client-1" in server.get_client_ids()

    @pytest.mark.asyncio
    async def test_unsubscribe_client(self):
        """Verifica rimozione sottoscrizione client."""
        server = WebSocketServer()
        mock_ws = MagicMock()

        # Sottoscrivi
        await server.subscribe("client-1", mock_ws, ["topic1"])

        # Rimuovi sottoscrizione
        await server.unsubscribe("client-1", ["topic1"])

        # Verifica rimozione
        client = server._clients.get("client-1")
        assert client is not None
        assert "topic1" not in client.subscriptions

    @pytest.mark.asyncio
    async def test_on_message_callback(self):
        """Verifica callback on_message."""
        server = WebSocketServer()

        received_messages = []

        async def message_handler(client_id, data):
            received_messages.append((client_id, data))

        server.on_message(message_handler)

        # Aggiungi client mock
        mock_ws = AsyncMock()
        await server.subscribe("client-1", mock_ws, [])

        # Simula messaggio
        await server._handle_message(
            "client-1",
            json.dumps({"type": "custom", "data": "test"})
        )

        assert len(received_messages) == 1
        assert received_messages[0][0] == "client-1"
        assert received_messages[0][1]["type"] == "custom"

    @pytest.mark.asyncio
    async def test_heartbeat_handling(self):
        """Verifica gestione heartbeat."""
        server = WebSocketServer()
        mock_ws = AsyncMock()

        await server.subscribe("client-1", mock_ws, [])

        # Simula heartbeat
        await server._handle_message(
            "client-1",
            json.dumps({"type": MessageType.HEARTBEAT.value})
        )

        # Verifica risposta inviata
        mock_ws.send.assert_called_once()
        call_args = mock_ws.send.call_args[0][0]
        response = json.loads(call_args)

        assert response["type"] == MessageType.HEARTBEAT_ACK.value
        assert "timestamp" in response

    @pytest.mark.asyncio
    async def test_max_clients_limit(self):
        """Verifica limite massimo client."""
        config = WebSocketConfig(max_clients=2)
        server = WebSocketServer(config)

        # Aggiungi 2 client (limite)
        mock_ws1 = MagicMock()
        mock_ws2 = MagicMock()

        result1 = await server.subscribe("client-1", mock_ws1, [])
        result2 = await server.subscribe("client-2", mock_ws2, [])

        assert result1 is True
        assert result2 is True
        assert server.get_connected_clients() == 2

        # Tenta aggiungere terzo client (sopra limite)
        mock_ws3 = MagicMock()
        result3 = await server.subscribe("client-3", mock_ws3, [])

        assert result3 is False
        assert server.get_connected_clients() == 2


class TestMessageType:
    """Test per MessageType enum."""

    def test_message_types(self):
        """Verifica tipi di messaggio disponibili."""
        assert MessageType.METRIC.value == "metric"
        assert MessageType.HEARTBEAT.value == "heartbeat"
        assert MessageType.HEARTBEAT_ACK.value == "heartbeat_ack"
        assert MessageType.SUBSCRIBE.value == "subscribe"
        assert MessageType.UNSUBSCRIBE.value == "unsubscribe"
        assert MessageType.ERROR.value == "error"
        assert MessageType.STATUS.value == "status"


class TestFactoryFunction:
    """Test per factory function."""

    def test_create_websocket_server(self):
        """Verifica factory function."""
        server = create_websocket_server(
            host="0.0.0.0",
            port=9999,
            max_clients=500
        )

        assert isinstance(server, WebSocketServer)
        assert server.host == "0.0.0.0"
        assert server.port == 9999
        assert server.config.max_clients == 500


class TestBroadcast:
    """Test per funzionalita broadcast."""

    @pytest.mark.asyncio
    async def test_broadcast_to_queue(self):
        """Verifica che broadcast aggiunga alla coda."""
        server = WebSocketServer()

        # Avvia server (senza attendere connessioni reali)
        server._running = True

        result = await server.broadcast({"metric": "cpu", "value": 75})

        # Verifica messaggio in coda
        assert server._message_queue.qsize() == 1

        # Cleanup
        server._running = False

    @pytest.mark.asyncio
    async def test_broadcast_with_topic(self):
        """Verifica broadcast con topic specifico."""
        server = WebSocketServer()
        server._running = True

        await server.broadcast(
            {"metric": "memory", "value": 50},
            topic="system"
        )

        # Estrai messaggio dalla coda
        message = server._message_queue.get_nowait()

        assert message["topic"] == "system"
        assert message["data"]["metric"] == "memory"

        # Cleanup
        server._running = False

    @pytest.mark.asyncio
    async def test_broadcast_queue_full(self):
        """Verifica comportamento con coda piena."""
        config = WebSocketConfig(message_queue_size=1)
        server = WebSocketServer(config)
        server._running = True

        # Riempi la coda
        await server.broadcast({"test": 1})

        # Tenta broadcast con coda piena
        result = await server.broadcast({"test": 2})

        # Il secondo broadcast dovrebbe fallire (coda piena)
        assert result == 0

        # Cleanup
        server._running = False


# Fixtures
@pytest.fixture
def websocket_server():
    """Fixture per WebSocketServer."""
    return WebSocketServer()


@pytest.fixture
def websocket_config():
    """Fixture per WebSocketConfig."""
    return WebSocketConfig()


@pytest.fixture
def websocket_client():
    """Fixture per WebSocketClient."""
    mock_ws = MagicMock()
    return WebSocketClient(client_id="test-client", websocket=mock_ws)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
