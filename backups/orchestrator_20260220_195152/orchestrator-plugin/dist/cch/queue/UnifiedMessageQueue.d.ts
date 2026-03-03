/**
 * UnifiedMessageQueue (UMQ)
 *
 * Componente centrale del Communication Hub per la gestione dei messaggi.
 *
 * Caratteristiche:
 * - Message Queue persistente con storage JSON + WAL (Write-Ahead Logging)
 * - Pub/Sub pattern per comunicazione asincrona
 * - Exactly-once delivery guarantee tramite idempotency keys
 * - Message ordering per sequence numbers
 * - Dead Letter Queue per messaggi falliti
 * - Ack/Nack mechanism per conferma ricezione
 * - Retry con exponential backoff
 * - Cleanup automatico messaggi processati
 * - Pattern matching sui topic (es. "agent.*" matcha "agent.task")
 *
 * @module CCH/Queue
 */
import { LogLevel } from '../../utils/logger';
/**
 * Priority levels per i messaggi
 */
export declare enum MessagePriority {
    CRITICAL = 0,// Massima priorita
    HIGH = 1,// Alta priorita
    NORMAL = 2,// Priorita normale
    LOW = 3,// Bassa priorita
    BULK = 4
}
/**
 * Stati di un messaggio
 */
export declare enum MessageStatus {
    PENDING = "pending",// In attesa di consegna
    DELIVERED = "delivered",// Consegnato ma non ancora ACK
    ACKED = "acked",// Confermato
    NACKED = "nacked",// Rifiutato
    RETRYING = "retrying",// In attesa di retry
    DEAD_LETTER = "dead_letter",// In Dead Letter Queue
    EXPIRED = "expired"
}
/**
 * Header di un messaggio con metadata
 */
export interface MessageHeader {
    [key: string]: string;
}
/**
 * Messaggio CCH completo
 */
export interface CCHMessage {
    /** Identificativo univoco del messaggio */
    id: string;
    /** Topic del messaggio */
    topic: string;
    /** Payload del messaggio (any type JSON serializable) */
    payload: unknown;
    /** Timestamp di creazione */
    timestamp: number;
    /** Priorita del messaggio */
    priority: MessagePriority;
    /** Numero di retry tentati */
    retryCount: number;
    /** Header aggiuntivi */
    headers: MessageHeader;
    /** Idempotency key per exactly-once delivery */
    idempotencyKey?: string;
    /** Sequence number per ordinamento */
    sequence?: number;
    /** TTL del messaggio in millisecondi */
    ttl?: number;
}
/**
 * Handler per elaborazione messaggi
 */
export interface MessageHandler {
    (message: CCHMessage): Promise<void> | void;
}
/**
 * Sottoscrizione a un topic
 */
export interface Subscription {
    /** Identificativo univoco sottoscrizione */
    id: string;
    /** Topic pattern (supporta wildcard) */
    topicPattern: string;
    /** Handler del messaggio */
    handler: MessageHandler;
    /** Data creazione */
    createdAt: number;
    /** Flag attivo */
    active: boolean;
    /** Numero messaggi elaborati */
    processedCount: number;
    /** Unsubscribe function */
    unsubscribe: () => void;
}
/**
 * Statistiche della coda
 */
export interface QueueStats {
    /** Numero totale messaggi pending */
    pendingMessages: number;
    /** Numero totale messaggi consegnati */
    deliveredMessages: number;
    /** Numero totale messaggi confermati */
    ackedMessages: number;
    /** Numero messaggi in Dead Letter Queue */
    deadLetterMessages: number;
    /** Numero totale sottoscrizioni attive */
    activeSubscriptions: number;
    /** Throughput messaggi al secondo */
    messagesPerSecond: number;
    /** Latenza media di elaborazione */
    averageLatencyMs: number;
    /** Numero totale messaggi pubblicati */
    totalPublished: number;
    /** Numero totale messaggi processati */
    totalProcessed: number;
}
/**
 * Configurazione UMQ
 */
export interface UMQConfig {
    /** Directory per la persistenza */
    storagePath?: string;
    /** Nome del database */
    dbName?: string;
    /** Massimo retry prima di DLQ */
    maxRetries?: number;
    /** Base delay per exponential backoff (ms) */
    retryBaseDelay?: number;
    /** Max delay per exponential backoff (ms) */
    retryMaxDelay?: number;
    /** Intervallo cleanup (ms) */
    cleanupInterval?: number;
    /** TTL default messaggi (ms) */
    defaultTTL?: number;
    /** Dimensione max batch per elaborazione */
    maxBatchSize?: number;
    /** Intervallo polling messaggi (ms) */
    pollingInterval?: number;
    /** Livello log */
    logLevel?: LogLevel;
    /** Enable metrics */
    enableMetrics?: boolean;
}
/**
 * UnifiedMessageQueue - Message Queue con Pub/Sub e persistenza
 *
 * Implementa una message queue production-ready con:
 * - Persistenza su file con WAL
 * - Exactly-once delivery
 * - Pattern matching sui topic
 * - Dead Letter Queue
 * - Retry con exponential backoff
 */
export declare class UnifiedMessageQueue {
    /** Database in memoria */
    private db;
    /** Write-Ahead Log */
    private wal;
    /** Sottoscrizioni attive */
    private subscriptions;
    /** Lock per operazioni concorrenti */
    private locks;
    /** Timer per cleanup */
    private cleanupTimer?;
    /** Timer per polling messaggi */
    private pollingTimer?;
    /** Statistiche metriche */
    private metrics;
    /** Flag inizializzazione */
    private initialized;
    /** Flag shutdown */
    private shuttingDown;
    /** Lock globale operazioni DB */
    private dbLock;
    /** Contatore sequence numbers */
    private sequenceCounters;
    private readonly config;
    private readonly logger;
    private readonly dbPath;
    private readonly walPath;
    private readonly backupPath;
    constructor(config: UMQConfig);
    /**
     * Inizializza la coda, caricando dati persistenti
     */
    initialize(): Promise<void>;
    /**
     * Carica il database dal file
     */
    private loadDatabase;
    /**
     * Salva il database su file
     */
    private saveDatabase;
    /**
     * Replay del Write-Ahead Log
     */
    private replayWAL;
    /**
     * Salva il WAL su file
     */
    private saveWAL;
    /**
     * Aggiungi entry al WAL
     */
    private addToWAL;
    /**
     * Pubblica un messaggio su un topic
     *
     * @param topic - Topic del messaggio (supporta gerarchia con punti)
     * @param message - Messaggio da pubblicare
     */
    publish(topic: string, message: CCHMessage): Promise<void>;
    /**
     * Sottoscrivi a un topic con pattern matching
     *
     * @param topicPattern - Pattern del topic (supporta *, #, >)
     * @param handler - Funzione handler per i messaggi
     * @returns Oggetto Subscription con metodo unsubscribe
     */
    subscribe(topicPattern: string, handler: MessageHandler): Subscription;
    /**
     * Notifica i sottoscrittori di un topic
     */
    private notifySubscribers;
    /**
     * Consegnna un messaggio a un sottoscrittore
     */
    private deliverMessage;
    /**
     * Conferma la ricezione e elaborazione di un messaggio
     *
     * @param messageId - ID del messaggio da confermare
     */
    ack(messageId: string): void;
    /**
     * Rifiuta un messaggio, con opzione di requeue
     *
     * @param messageId - ID del messaggio
     * @param requeue - Se true, rimette in coda per retry
     */
    nack(messageId: string, requeue: boolean): Promise<void>;
    /**
     * Sposta un messaggio nella Dead Letter Queue
     *
     * @param messageId - ID del messaggio
     * @param reason - Motivo del move
     */
    deadLetter(messageId: string, reason?: string): Promise<void>;
    /**
     * Implementazione interna del move in DLQ
     */
    private moveToDeadLetter;
    /**
     * Aggiorna lo stato di un messaggio
     */
    private updateMessageStatus;
    /**
     * Ottieni le statistiche della coda
     */
    getStats(): QueueStats;
    /**
     * Aggiorna metriche di pubblicazione
     */
    private updatePublishMetrics;
    /**
     * Aggiorna metriche di processing
     */
    private updateProcessingMetrics;
    /**
     * Avvia il polling per messaggi pronti
     */
    private startPolling;
    /**
     * Processa messaggi pending
     */
    private processPendingMessages;
    /**
     * Avvia timer per cleanup automatico
     */
    private startCleanupTimer;
    /**
     * Cleanup messaggi scaduti e processati
     */
    private cleanup;
    /**
     * Ottieni il prossimo sequence number per un topic
     */
    private getNextSequenceNumber;
    /**
     * Shutdown graceful della coda
     */
    shutdown(): Promise<void>;
    /**
     * Verifica che la coda sia inizializzata
     */
    private ensureInitialized;
    /**
     * Esegui operazione con lock named
     */
    private withLock;
    /**
     * Esegui operazione con lock DB
     */
    private withDbLock;
    /**
     * Ottieni tutti i messaggi nella DLQ
     */
    getDeadLetterMessages(): CCHMessage[];
    /**
     * Reprocessa un messaggio dalla DLQ
     *
     * @param messageId - ID del messaggio da riprocessare
     */
    reprocessFromDeadLetter(messageId: string): Promise<void>;
    /**
     * Ottieni info su una sottoscrizione
     */
    getSubscriptionInfo(subscriptionId: string): Subscription | undefined;
    /**
     * Ottieni tutte le sottoscrizioni
     */
    getAllSubscriptions(): Subscription[];
    /**
     * Ottieni messaggi per topic
     */
    getMessagesByTopic(topic: string, includeDeadLetters?: boolean): CCHMessage[];
    /**
     * Purge tutti i messaggi da un topic
     */
    purgeTopic(topic: string): Promise<void>;
}
/**
 * Crea e inizializza un'istanza di UnifiedMessageQueue
 *
 * @param config - Configurazione della coda
 * @returns Istanza inizializzata pronta all'uso
 */
export declare function createUMQ(config: UMQConfig): Promise<UnifiedMessageQueue>;
export default UnifiedMessageQueue;
//# sourceMappingURL=UnifiedMessageQueue.d.ts.map