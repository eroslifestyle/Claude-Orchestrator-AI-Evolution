"""
WebSocket Server V17 - Real-time Metric Broadcasting

WebSocket server per broadcasting metriche in tempo reale.
Supporta subscription management, heartbeat/ping-pong, e JSON messaging.

Usage:
    server = WebSocketServer(host="localhost", port=8765)
    await server.start()

    # Broadcast metriche
    await server.broadcast({"type": "metric", "value": 42})

    # Stop server
    await server.stop()
"""

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set

try:
    import websockets
    from websockets.server import serve, WebSocketServerProtocol
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    WebSocketServerProtocol = Any

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """Tipi di messaggi WebSocket."""
    METRIC = "metric"
    HEARTBEAT = "heartbeat"
    HEARTBEAT_ACK = "heartbeat_ack"
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    ERROR = "error"
    STATUS = "status"


@dataclass
class WebSocketClient:
    """Rappresenta un client connesso."""
    client_id: str
    websocket: WebSocketServerProtocol
    subscriptions: Set[str] = field(default_factory=set)
    last_heartbeat: float = field(default_factory=time.time)
    connected_at: float = field(default_factory=time.time)

    def update_heartbeat(self) -> None:
        """Aggiorna timestamp ultimo heartbeat."""
        self.last_heartbeat = time.time()

    def is_alive(self, timeout_seconds: float = 60.0) -> bool:
        """Verifica se client e ancora attivo."""
        return (time.time() - self.last_heartbeat) < timeout_seconds

    @property
    def connection_duration(self) -> float:
        """Durata connessione in secondi."""
        return time.time() - self.connected_at


@dataclass
class WebSocketConfig:
    """Configurazione WebSocket server."""
    host: str = "localhost"
    port: int = 8765
    heartbeat_interval: float = 30.0  # secondi
    heartbeat_timeout: float = 60.0   # secondi
    max_clients: int = 1000
    message_queue_size: int = 1000
    ping_interval: float = 20.0
    ping_timeout: float = 20.0
    close_timeout: float = 10.0


class WebSocketServer:
    """
    WebSocket Server per real-time metric broadcasting.

    Features:
    - Asyncio-based con websockets library
    - Real-time metric broadcasting
    - Client subscription management
    - Heartbeat/ping-pong per connection health
    - JSON message format standardizzato
    - Graceful shutdown

    Example:
        >>> server = WebSocketServer()
        >>> await server.start()
        >>> await server.broadcast({"type": "metric", "name": "cpu", "value": 75})
        >>> await server.stop()
    """

    def __init__(self, config: Optional[WebSocketConfig] = None):
        """
        Inizializza WebSocket server.

        Args:
            config: Configurazione server (usa default se None)
        """
        if not WEBSOCKETS_AVAILABLE:
            raise ImportError(
                "websockets library non installata. "
                "Installare con: pip install websockets"
            )

        self.config = config or WebSocketConfig()
        self._clients: Dict[str, WebSocketClient] = {}
        self._subscriptions: Dict[str, Set[str]] = {}  # topic -> client_ids
        self._server = None
        self._running = False
        self._message_queue: asyncio.Queue = asyncio.Queue(
            maxsize=self.config.message_queue_size
        )
        self._broadcast_task: Optional[asyncio.Task] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._on_message: Optional[Callable] = None
        self._on_connect: Optional[Callable] = None
        self._on_disconnect: Optional[Callable] = None

        # Lock per thread-safe operations
        self._lock = asyncio.Lock()

    @property
    def host(self) -> str:
        """Host del server."""
        return self.config.host

    @property
    def port(self) -> int:
        """Porta del server."""
        return self.config.port

    @property
    def running(self) -> bool:
        """Se il server e in esecuzione."""
        return self._running

    def get_connected_clients(self) -> int:
        """
        Ritorna numero di client connessi.

        Returns:
            Numero di client attualmente connessi
        """
        return len(self._clients)

    def get_client_ids(self) -> List[str]:
        """
        Ritorna lista degli ID dei client connessi.

        Returns:
            Lista di client_id
        """
        return list(self._clients.keys())

    def get_client_info(self, client_id: str) -> Optional[Dict[str, Any]]:
        """
        Ottiene informazioni su un client specifico.

        Args:
            client_id: ID del client

        Returns:
            Dict con info client o None se non trovato
        """
        client = self._clients.get(client_id)
        if not client:
            return None

        return {
            "client_id": client.client_id,
            "subscriptions": list(client.subscriptions),
            "last_heartbeat": client.last_heartbeat,
            "connection_duration": client.connection_duration,
            "is_alive": client.is_alive(self.config.heartbeat_timeout)
        }

    async def start(self) -> None:
        """
        Avvia il WebSocket server.

        Raises:
            OSError: Se la porta e gia in uso
        """
        if self._running:
            logger.warning("Server gia in esecuzione")
            return

        logger.info(f"Avvio WebSocket server su {self.host}:{self.port}")

        # Avvia server
        self._server = await serve(
            self._handle_connection,
            self.host,
            self.port,
            ping_interval=self.config.ping_interval,
            ping_timeout=self.config.ping_timeout,
            close_timeout=self.config.close_timeout
        )

        self._running = True

        # Avvia task background
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        self._broadcast_task = asyncio.create_task(self._broadcast_loop())

        logger.info(f"WebSocket server avviato su ws://{self.host}:{self.port}")

    async def stop(self) -> None:
        """Ferma il WebSocket server con graceful shutdown."""
        if not self._running:
            return

        logger.info("Arresto WebSocket server...")
        self._running = False

        # Cancella task background
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass

        if self._broadcast_task:
            self._broadcast_task.cancel()
            try:
                await self._broadcast_task
            except asyncio.CancelledError:
                pass

        # Chiudi tutte le connessioni client
        async with self._lock:
            for client in list(self._clients.values()):
                try:
                    await client.websocket.close(code=1001, reason="Server shutting down")
                except Exception as e:
                    logger.debug(f"Errore chiusura client {client.client_id}: {e}")

            self._clients.clear()
            self._subscriptions.clear()

        # Chiudi server
        if self._server:
            self._server.close()
            await self._server.wait_closed()

        logger.info("WebSocket server arrestato")

    async def broadcast(
        self,
        metric: Dict[str, Any],
        topic: Optional[str] = None
    ) -> int:
        """
        Invia metrica a tutti i client (o solo quelli sottoscritti a topic).

        Args:
            metric: Dati metrica da inviare
            topic: Topic specifico (se None, broadcast a tutti)

        Returns:
            Numero di client a cui e stato inviato il messaggio
        """
        if not self._running:
            logger.warning("Server non in esecuzione, broadcast ignorato")
            return 0

        message = {
            "type": MessageType.METRIC.value,
            "timestamp": time.time(),
            "data": metric
        }

        if topic:
            message["topic"] = topic

        try:
            self._message_queue.put_nowait(message)
        except asyncio.QueueFull:
            logger.warning("Coda messaggi piena, broadcast scartato")
            return 0

        return self.get_connected_clients()

    async def send_to_client(
        self,
        client_id: str,
        message: Dict[str, Any]
    ) -> bool:
        """
        Invia messaggio a un client specifico.

        Args:
            client_id: ID del client destinatario
            message: Messaggio da inviare

        Returns:
            True se inviato con successo, False altrimenti
        """
        client = self._clients.get(client_id)
        if not client:
            logger.warning(f"Client {client_id} non trovato")
            return False

        try:
            await client.websocket.send(json.dumps(message))
            return True
        except Exception as e:
            logger.error(f"Errore invio a {client_id}: {e}")
            return False

    async def subscribe(
        self,
        client_id: str,
        websocket: WebSocketServerProtocol,
        topics: List[str]
    ) -> bool:
        """
        Sottoscrive un client a uno o piu topic.

        Args:
            client_id: ID del client
            websocket: Connessione WebSocket
            topics: Lista di topic a cui sottoscrivere

        Returns:
            True se sottoscrizione riuscita
        """
        async with self._lock:
            # Crea o aggiorna client
            if client_id not in self._clients:
                if len(self._clients) >= self.config.max_clients:
                    logger.warning("Limite massimo client raggiunto")
                    return False

                self._clients[client_id] = WebSocketClient(
                    client_id=client_id,
                    websocket=websocket
                )

            client = self._clients[client_id]

            # Aggiungi sottoscrizioni
            for topic in topics:
                client.subscriptions.add(topic)
                if topic not in self._subscriptions:
                    self._subscriptions[topic] = set()
                self._subscriptions[topic].add(client_id)

            logger.debug(f"Client {client_id} sottoscritto a: {topics}")
            return True

    async def unsubscribe(
        self,
        client_id: str,
        topics: Optional[List[str]] = None
    ) -> None:
        """
        Rimuove sottoscrizioni di un client.

        Args:
            client_id: ID del client
            topics: Topic specifici (se None, rimuove tutte)
        """
        async with self._lock:
            client = self._clients.get(client_id)
            if not client:
                return

            if topics is None:
                # Rimuovi tutte le sottoscrizioni
                topics_to_remove = list(client.subscriptions)
            else:
                topics_to_remove = topics

            for topic in topics_to_remove:
                client.subscriptions.discard(topic)
                if topic in self._subscriptions:
                    self._subscriptions[topic].discard(client_id)
                    if not self._subscriptions[topic]:
                        del self._subscriptions[topic]

            logger.debug(f"Client {client_id} rimosso da: {topics_to_remove}")

    def on_message(self, callback: Callable) -> None:
        """Registra callback per messaggi ricevuti dai client."""
        self._on_message = callback

    def on_connect(self, callback: Callable) -> None:
        """Registra callback per nuove connessioni."""
        self._on_connect = callback

    def on_disconnect(self, callback: Callable) -> None:
        """Registra callback per disconnessioni."""
        self._on_disconnect = callback

    async def _handle_connection(
        self,
        websocket: WebSocketServerProtocol,
        path: str
    ) -> None:
        """
        Gestisce una nuova connessione client.

        Args:
            websocket: Connessione WebSocket
            path: Path della connessione
        """
        client_id = str(uuid.uuid4())[:8]
        remote_addr = websocket.remote_address

        logger.info(f"Nuova connessione: {client_id} da {remote_addr}")

        try:
            # Registra client
            async with self._lock:
                if len(self._clients) >= self.config.max_clients:
                    await websocket.close(code=1013, reason="Server at capacity")
                    return

                self._clients[client_id] = WebSocketClient(
                    client_id=client_id,
                    websocket=websocket
                )

            # Callback connect
            if self._on_connect:
                try:
                    await self._on_connect(client_id, websocket)
                except Exception as e:
                    logger.error(f"Errore callback on_connect: {e}")

            # Invia conferma connessione
            await websocket.send(json.dumps({
                "type": MessageType.STATUS.value,
                "client_id": client_id,
                "message": "Connected",
                "timestamp": time.time()
            }))

            # Loop ricezione messaggi
            async for message in websocket:
                await self._handle_message(client_id, message)

        except websockets.exceptions.ConnectionClosed as e:
            logger.debug(f"Connessione chiusa da {client_id}: {e}")
        except Exception as e:
            logger.error(f"Errore connessione {client_id}: {e}")
        finally:
            # Cleanup client
            await self._remove_client(client_id)

    async def _handle_message(
        self,
        client_id: str,
        message: str
    ) -> None:
        """
        Gestisce messaggio ricevuto da client.

        Args:
            client_id: ID del client
            message: Messaggio ricevuto (JSON string)
        """
        client = self._clients.get(client_id)
        if not client:
            return

        try:
            data = json.loads(message)
            msg_type = data.get("type", "")

            if msg_type == MessageType.HEARTBEAT.value:
                # Rispondi a heartbeat
                client.update_heartbeat()
                await client.websocket.send(json.dumps({
                    "type": MessageType.HEARTBEAT_ACK.value,
                    "timestamp": time.time()
                }))

            elif msg_type == MessageType.SUBSCRIBE.value:
                # Sottoscrivi a topic
                topics = data.get("topics", [])
                if topics:
                    await self.subscribe(client_id, client.websocket, topics)
                    await client.websocket.send(json.dumps({
                        "type": MessageType.STATUS.value,
                        "message": f"Subscribed to {len(topics)} topics",
                        "topics": topics
                    }))

            elif msg_type == MessageType.UNSUBSCRIBE.value:
                # Rimuovi sottoscrizioni
                topics = data.get("topics")
                await self.unsubscribe(client_id, topics)
                await client.websocket.send(json.dumps({
                    "type": MessageType.STATUS.value,
                    "message": "Unsubscribed"
                }))

            else:
                # Callback messaggio personalizzato
                if self._on_message:
                    try:
                        await self._on_message(client_id, data)
                    except Exception as e:
                        logger.error(f"Errore callback on_message: {e}")

        except json.JSONDecodeError as e:
            logger.warning(f"Messaggio JSON non valido da {client_id}: {e}")
            await client.websocket.send(json.dumps({
                "type": MessageType.ERROR.value,
                "message": "Invalid JSON format"
            }))

    async def _remove_client(self, client_id: str) -> None:
        """
        Rimuove client e cleanup.

        Args:
            client_id: ID del client da rimuovere
        """
        async with self._lock:
            client = self._clients.pop(client_id, None)
            if client:
                # Rimuovi da tutte le sottoscrizioni
                for topic in client.subscriptions:
                    if topic in self._subscriptions:
                        self._subscriptions[topic].discard(client_id)
                        if not self._subscriptions[topic]:
                            del self._subscriptions[topic]

                # Callback disconnect
                if self._on_disconnect:
                    try:
                        await self._on_disconnect(client_id)
                    except Exception as e:
                        logger.error(f"Errore callback on_disconnect: {e}")

                logger.info(f"Client {client_id} rimosso")

    async def _heartbeat_loop(self) -> None:
        """Loop background per verificare health dei client."""
        while self._running:
            try:
                await asyncio.sleep(self.config.heartbeat_interval)

                # Controlla client inattivi
                dead_clients = []
                async with self._lock:
                    for client_id, client in list(self._clients.items()):
                        if not client.is_alive(self.config.heartbeat_timeout):
                            dead_clients.append(client_id)

                # Rimuovi client morti
                for client_id in dead_clients:
                    logger.warning(f"Client {client_id} non risponde, rimozione")
                    await self._remove_client(client_id)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Errore heartbeat loop: {e}")

    async def _broadcast_loop(self) -> None:
        """Loop background per processare coda messaggi."""
        while self._running:
            try:
                message = await asyncio.wait_for(
                    self._message_queue.get(),
                    timeout=1.0
                )

                await self._do_broadcast(message)

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Errore broadcast loop: {e}")

    async def _do_broadcast(self, message: Dict[str, Any]) -> int:
        """
        Esegue broadcast effettivo del messaggio.

        Args:
            message: Messaggio da inviare

        Returns:
            Numero di client raggiunti
        """
        topic = message.get("topic")
        message_json = json.dumps(message)
        sent_count = 0

        async with self._lock:
            if topic and topic in self._subscriptions:
                # Invia solo a client sottoscritti
                client_ids = list(self._subscriptions[topic])
            else:
                # Broadcast a tutti
                client_ids = list(self._clients.keys())

        for client_id in client_ids:
            client = self._clients.get(client_id)
            if client:
                try:
                    await client.websocket.send(message_json)
                    sent_count += 1
                except Exception as e:
                    logger.debug(f"Errore invio a {client_id}: {e}")

        return sent_count

    def get_stats(self) -> Dict[str, Any]:
        """
        Ottiene statistiche del server.

        Returns:
            Dict con statistiche
        """
        return {
            "running": self._running,
            "host": self.host,
            "port": self.port,
            "connected_clients": self.get_connected_clients(),
            "max_clients": self.config.max_clients,
            "topics": list(self._subscriptions.keys()),
            "queue_size": self._message_queue.qsize(),
            "uptime": time.time() - min(
                (c.connected_at for c in self._clients.values()),
                default=time.time()
            ) if self._clients else 0
        }


# Factory function
def create_websocket_server(
    host: str = "localhost",
    port: int = 8765,
    **kwargs
) -> WebSocketServer:
    """
    Crea WebSocket server con configurazione semplificata.

    Args:
        host: Host del server
        port: Porta del server
        **kwargs: Altri parametri di configurazione

    Returns:
        Istanza WebSocketServer configurata
    """
    config = WebSocketConfig(host=host, port=port, **kwargs)
    return WebSocketServer(config)


__all__ = [
    "WebSocketServer",
    "WebSocketConfig",
    "WebSocketClient",
    "MessageType",
    "create_websocket_server",
]
