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

import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { PluginLogger, LogLevel } from '../../utils/logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Priority levels per i messaggi
 */
export enum MessagePriority {
  CRITICAL = 0,  // Massima priorita
  HIGH = 1,      // Alta priorita
  NORMAL = 2,    // Priorita normale
  LOW = 3,       // Bassa priorita
  BULK = 4       // Operazioni in bulk
}

/**
 * Stati di un messaggio
 */
export enum MessageStatus {
  PENDING = 'pending',       // In attesa di consegna
  DELIVERED = 'delivered',   // Consegnato ma non ancora ACK
  ACKED = 'acked',           // Confermato
  NACKED = 'nacked',         // Rifiutato
  RETRYING = 'retrying',     // In attesa di retry
  DEAD_LETTER = 'dead_letter', // In Dead Letter Queue
  EXPIRED = 'expired'        // Scaduto
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
 * Entry nella Write-Ahead Log
 */
interface WALEntry {
  timestamp: number;
  operation: 'insert' | 'update' | 'delete';
  table: 'messages' | 'dead_letters';
  data: StoredMessage;
}

/**
 * Messaggio nello storage
 */
interface StoredMessage extends CCHMessage {
  status: MessageStatus;
  deliveredAt?: number;
  ackedAt?: number;
  expiresAt?: number;
  nextRetryAt?: number;
  subscriptionId?: string;
  _version: number;
}

/**
 * Database in memoria con persistenza (serializable)
 */
interface SerializableUMQStringDatabase {
  messages: Record<string, StoredMessage>;
  deadLetters: Record<string, StoredMessage>;
  sequences: Record<string, number>;
  idempotencyKeys: string[]; // Serialized as array
}

/**
 * Database in memoria con Set
 */
interface UMQStringDatabase {
  messages: Record<string, StoredMessage>;
  deadLetters: Record<string, StoredMessage>;
  sequences: Record<string, number>;
  idempotencyKeys: Set<string>;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Converti Map a plain object per serializzazione
 */
function mapToObject<K extends string, V>(map: Map<K, V>): Record<K, V> {
  const obj: Record<K, V> = {} as Record<K, V>;
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

/**
 * Converti plain object a Map
 */
function objectToMap<K extends string, V>(obj: Record<K, V> | undefined): Map<K, V> {
  if (!obj) return new Map();
  return new Map(Object.entries(obj)) as Map<K, V>;
}

/**
 * Calcola delay con exponential backoff
 */
function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay; // 30% jitter
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Pattern matching per topic con supporto wildcard
 * Supporta: * (singolo segmento), # (multi-segmento), > (multi-segmento alternativo)
 */
function topicMatchesPattern(topic: string, pattern: string): boolean {
  const patternSegments = pattern.split('.');
  const topicSegments = topic.split('.');

  // Gestione wildcard multi-segmento prima
  if (pattern.includes('#') || pattern.includes('>')) {
    const wildcardIndex = patternSegments.findIndex(s => s === '#' || s === '>');
    if (wildcardIndex >= 0) {
      // Per wildcard multi-segmento, controlla solo il prefisso
      const prefix = patternSegments.slice(0, wildcardIndex).join('.');
      if (wildcardIndex === 0) {
        return true; // '#' matcha tutto
      }
      return topic.startsWith(prefix + '.');
    }
  }

  // Per pattern senza wildcard multi-segmento, numero di segmenti deve matchare
  if (patternSegments.length !== topicSegments.length && !pattern.includes('*')) {
    return false;
  }

  // Converti pattern in regex
  const regexParts: string[] = [];

  for (let i = 0; i < patternSegments.length; i++) {
    const segment = patternSegments[i];

    if (segment === '*') {
      regexParts.push('[^.]+'); // Qualsiasi segmento singolo
    } else if (segment === '#' || segment === '>') {
      // Gestito sopra, non dovrebbe arrivare qui
      regexParts.push('.*');
    } else {
      // Escape caratteri speciali regex
      regexParts.push(segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
  }

  const regexString = `^${regexParts.join('\\.')}$`;
  const regex = new RegExp(regexString);
  return regex.test(topic);
}

/**
 * Genera idempotency key da topic e payload
 */
function generateIdempotencyKey(topic: string, payload: unknown): string {
  const payloadStr = JSON.stringify(payload);
  return `${topic}:${Buffer.from(payloadStr).toString('base64').slice(0, 32)}`;
}

// =============================================================================
// MAIN CLASS - UnifiedMessageQueue
// =============================================================================

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
export class UnifiedMessageQueue {
  // ==========================================================================
  // PRIVATE PROPERTIES
  // ==========================================================================

  /** Database in memoria */
  private db: UMQStringDatabase;
  /** Write-Ahead Log */
  private wal: WALEntry[] = [];
  /** Sottoscrizioni attive */
  private subscriptions: Map<string, Subscription> = new Map();
  /** Lock per operazioni concorrenti */
  private locks: Map<string, Promise<void>> = new Map();
  /** Timer per cleanup */
  private cleanupTimer?: NodeJS.Timeout;
  /** Timer per polling messaggi */
  private pollingTimer?: NodeJS.Timeout;
  /** Statistiche metriche */
  private metrics: {
    publishedInLastSecond: number[];
    processingTimes: number[];
    lastCleanupTime: number;
    startTime: number;
  };
  /** Flag inizializzazione */
  private initialized: boolean = false;
  /** Flag shutdown */
  private shuttingDown: boolean = false;
  /** Lock globale operazioni DB */
  private dbLock: Promise<void> = Promise.resolve();
  /** Contatore sequence numbers */
  private sequenceCounters: Map<string, number> = new Map();

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  private readonly config: Required<UMQConfig>;
  private readonly logger: PluginLogger;
  private readonly dbPath: string;
  private readonly walPath: string;
  private readonly backupPath: string;

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(config: UMQConfig) {
    this.config = {
      storagePath: config.storagePath ?? './umq-data',
      dbName: config.dbName ?? 'umq-db',
      maxRetries: config.maxRetries ?? 3,
      retryBaseDelay: config.retryBaseDelay ?? 1000,
      retryMaxDelay: config.retryMaxDelay ?? 60000,
      cleanupInterval: config.cleanupInterval ?? 300000, // 5 minuti
      defaultTTL: config.defaultTTL ?? 3600000, // 1 ora
      maxBatchSize: config.maxBatchSize ?? 100,
      pollingInterval: config.pollingInterval ?? 100, // 100ms
      logLevel: config.logLevel ?? 'info',
      enableMetrics: config.enableMetrics ?? true,
    };

    this.logger = new PluginLogger('UMQ', this.config.logLevel);

    this.dbPath = join(this.config.storagePath, `${this.config.dbName}.json`);
    this.walPath = join(this.config.storagePath, `${this.config.dbName}.wal`);
    this.backupPath = join(this.config.storagePath, `${this.config.dbName}.bak`);

    // Database iniziale vuoto
    this.db = {
      messages: {},
      deadLetters: {},
      sequences: {},
      idempotencyKeys: new Set(),
    };

    this.metrics = {
      publishedInLastSecond: [],
      processingTimes: [],
      lastCleanupTime: 0,
      startTime: Date.now(),
    };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Inizializza la coda, caricando dati persistenti
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('UMQ already initialized');
      return;
    }

    await this.withLock('init', async () => {
      this.logger.info('Initializing UnifiedMessageQueue', {
        dbPath: this.dbPath,
        config: this.config,
      });

      try {
        // Crea directory se non esiste
        await fs.mkdir(dirname(this.dbPath), { recursive: true });

        // Carica database dal disco
        await this.loadDatabase();

        // Riprendi WAL non processato
        await this.replayWAL();

        // Avvia timer per cleanup automatico
        this.startCleanupTimer();

        // Avvia polling per messaggi
        this.startPolling();

        this.initialized = true;
        this.logger.info('UMQ initialized successfully', {
          messagesCount: Object.keys(this.db.messages).length,
          subscriptionsCount: 0,
        });
      } catch (error) {
        this.logger.error('Failed to initialize UMQ', { error });
        throw error;
      }
    });
  }

  /**
   * Carica il database dal file
   */
  private async loadDatabase(): Promise<void> {
    try {
      const data = await fs.readFile(this.dbPath, 'utf-8');
      const loaded = JSON.parse(data) as SerializableUMQStringDatabase;

      // Ripristina Set da array
      this.db = {
        messages: loaded.messages,
        deadLetters: loaded.deadLetters,
        sequences: loaded.sequences,
        idempotencyKeys: new Set(loaded.idempotencyKeys),
      };

      this.logger.debug('Database loaded', {
        messages: Object.keys(this.db.messages).length,
        deadLetters: Object.keys(this.db.deadLetters).length,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File non esiste, crea nuovo database
        this.logger.info('No existing database found, creating new one');
        await this.saveDatabase();
      } else {
        this.logger.error('Error loading database', { error });
        throw error;
      }
    }
  }

  /**
   * Salva il database su file
   */
  private async saveDatabase(): Promise<void> {
    try {
      const toSave: SerializableUMQStringDatabase = {
        messages: this.db.messages,
        deadLetters: this.db.deadLetters,
        sequences: this.db.sequences,
        idempotencyKeys: Array.from(this.db.idempotencyKeys),
      };

      // Scrivi backup prima
      try {
        await fs.copyFile(this.dbPath, this.backupPath);
      } catch {
        // Backup potrebbe fallire se file non esiste, ok
      }

      await fs.writeFile(this.dbPath, JSON.stringify(toSave, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Error saving database', { error });
      throw error;
    }
  }

  /**
   * Replay del Write-Ahead Log
   */
  private async replayWAL(): Promise<void> {
    try {
      const walData = await fs.readFile(this.walPath, 'utf-8');
      this.wal = JSON.parse(walData) as WALEntry[];

      this.logger.info('Replaying WAL', { entries: this.wal.length });

      for (const entry of this.wal) {
        switch (entry.operation) {
          case 'insert':
          case 'update':
            if (entry.table === 'messages') {
              this.db.messages[entry.data.id] = entry.data;
            } else {
              this.db.deadLetters[entry.data.id] = entry.data;
            }
            break;
          case 'delete':
            if (entry.table === 'messages') {
              delete this.db.messages[entry.data.id];
            } else {
              delete this.db.deadLetters[entry.data.id];
            }
            break;
        }
      }

      // Clear WAL dopo replay
      this.wal = [];
      await this.saveWAL();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // WAL non esiste, ok
        this.wal = [];
      } else {
        this.logger.error('Error replaying WAL', { error });
      }
    }
  }

  /**
   * Salva il WAL su file
   */
  private async saveWAL(): Promise<void> {
    try {
      await fs.writeFile(this.walPath, JSON.stringify(this.wal), 'utf-8');
    } catch (error) {
      this.logger.error('Error saving WAL', { error });
    }
  }

  /**
   * Aggiungi entry al WAL
   */
  private async addToWAL(operation: WALEntry['operation'], table: WALEntry['table'], data: StoredMessage): Promise<void> {
    this.wal.push({
      timestamp: Date.now(),
      operation,
      table,
      data,
    });

    // Limita WAL dimensione
    if (this.wal.length > 10000) {
      await this.saveDatabase();
      this.wal = [];
    }

    await this.saveWAL();
  }

  // ==========================================================================
  // PUBLISH / SUBSCRIBE
  // ==========================================================================

  /**
   * Pubblica un messaggio su un topic
   *
   * @param topic - Topic del messaggio (supporta gerarchia con punti)
   * @param message - Messaggio da pubblicare
   */
  async publish(topic: string, message: CCHMessage): Promise<void> {
    this.ensureInitialized();

    const startTime = Date.now();

    this.logger.debug('Publishing message', { topic, messageId: message.id });

    await this.withDbLock(async () => {
      // Valida input
      if (!topic || topic.trim() === '') {
        throw new Error('Topic cannot be empty');
      }

      // Genera ID se non presente
      const messageId = message.id || uuidv4();

      // Check idempotency
      const idempotencyKey = message.idempotencyKey || generateIdempotencyKey(topic, message.payload);
      if (this.db.idempotencyKeys.has(idempotencyKey)) {
        this.logger.debug('Duplicate message detected, skipping', { idempotencyKey });
        return; // Exactly-once: skip duplicate
      }

      // Calcola TTL
      const ttl = message.ttl ?? this.config.defaultTTL;
      const now = Date.now();

      // Get sequence number
      const sequence = this.getNextSequenceNumber(topic);

      // Crea stored message
      const storedMessage: StoredMessage = {
        ...message,
        id: messageId,
        topic,
        timestamp: message.timestamp || now,
        priority: message.priority ?? MessagePriority.NORMAL,
        retryCount: message.retryCount ?? 0,
        sequence,
        status: MessageStatus.PENDING,
        expiresAt: ttl ? now + ttl : undefined,
        _version: 1,
      };

      // Salva nel database
      this.db.messages[messageId] = storedMessage;
      this.db.idempotencyKeys.add(idempotencyKey);

      // Aggiungi al WAL
      await this.addToWAL('insert', 'messages', storedMessage);

      // Persisti periodicamente
      if (Object.keys(this.db.messages).length % 100 === 0) {
        await this.saveDatabase();
      }

      // Aggiorna metriche
      this.updatePublishMetrics();
    });

    // Notifica subscriber immediati per sincroni
    this.notifySubscribers(topic, message);

    const duration = Date.now() - startTime;
    this.logger.debug('Message published', { topic, messageId: message.id, duration });
  }

  /**
   * Sottoscrivi a un topic con pattern matching
   *
   * @param topicPattern - Pattern del topic (supporta *, #, >)
   * @param handler - Funzione handler per i messaggi
   * @returns Oggetto Subscription con metodo unsubscribe
   */
  subscribe(topicPattern: string, handler: MessageHandler): Subscription {
    this.ensureInitialized();

    const subscriptionId = uuidv4();
    const now = Date.now();

    this.logger.info('Creating subscription', { subscriptionId, topicPattern });

    // Crea unsubscribe function
    const unsubscribe = (): void => {
      this.logger.info('Unsubscribing', { subscriptionId, topicPattern });
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
    };

    const subscription: Subscription = {
      id: subscriptionId,
      topicPattern,
      handler,
      createdAt: now,
      active: true,
      processedCount: 0,
      unsubscribe,
    };

    this.subscriptions.set(subscriptionId, subscription);

    this.logger.info('Subscription created', {
      subscriptionId,
      topicPattern,
      totalSubscriptions: this.subscriptions.size,
    });

    return subscription;
  }

  /**
   * Notifica i sottoscrittori di un topic
   */
  private notifySubscribers(topic: string, message: CCHMessage): void {
    const subscriptionsArray = Array.from(this.subscriptions.values());

    for (const subscription of subscriptionsArray) {
      if (!subscription.active) continue;

      if (topicMatchesPattern(topic, subscription.topicPattern)) {
        // Consegna asincrona
        this.deliverMessage(subscription, message).catch((error) => {
          this.logger.error('Error delivering message', {
            subscriptionId: subscription.id,
            messageId: message.id,
            error,
          });
        });
      }
    }
  }

  /**
   * Consegnna un messaggio a un sottoscrittore
   */
  private async deliverMessage(subscription: Subscription, message: CCHMessage): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.debug('Delivering message', {
        subscriptionId: subscription.id,
        messageId: message.id,
        topic: message.topic,
      });

      // Aggiorna stato a delivered
      await this.updateMessageStatus(message.id, MessageStatus.DELIVERED, subscription.id);

      // Chiama handler
      await subscription.handler(message);

      // Aggiorna stato a acked
      await this.ack(message.id);

      subscription.processedCount++;

      const duration = Date.now() - startTime;
      this.updateProcessingMetrics(duration);

      this.logger.debug('Message delivered successfully', {
        subscriptionId: subscription.id,
        messageId: message.id,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Message handler failed', {
        subscriptionId: subscription.id,
        messageId: message.id,
        error,
        duration,
      });

      // Nack con requeue
      await this.nack(message.id, true);
    }
  }

  // ==========================================================================
  // ACK / NACK / DEAD LETTER
  // ==========================================================================

  /**
   * Conferma la ricezione e elaborazione di un messaggio
   *
   * @param messageId - ID del messaggio da confermare
   */
  ack(messageId: string): void {
    this.ensureInitialized();

    this.logger.debug('Acknowledging message', { messageId });

    const message = this.db.messages[messageId];
    if (!message) {
      this.logger.warn('Message not found for ACK', { messageId });
      return;
    }

    message.status = MessageStatus.ACKED;
    message.ackedAt = Date.now();

    // Rimuovi idempotency key dopo ack
    if (message.idempotencyKey) {
      this.db.idempotencyKeys.delete(message.idempotencyKey);
    }
  }

  /**
   * Rifiuta un messaggio, con opzione di requeue
   *
   * @param messageId - ID del messaggio
   * @param requeue - Se true, rimette in coda per retry
   */
  async nack(messageId: string, requeue: boolean): Promise<void> {
    this.ensureInitialized();

    this.logger.debug('Negative acknowledging message', { messageId, requeue });

    const message = this.db.messages[messageId];
    if (!message) {
      this.logger.warn('Message not found for NACK', { messageId });
      return;
    }

    message.status = MessageStatus.NACKED;

    if (requeue) {
      // Calcola retry delay con exponential backoff
      message.retryCount++;
      const delay = calculateBackoff(
        message.retryCount,
        this.config.retryBaseDelay,
        this.config.retryMaxDelay
      );

      if (message.retryCount >= this.config.maxRetries) {
        // Troppi retry, vai in DLQ
        await this.moveToDeadLetter(messageId, 'Max retries exceeded');
      } else {
        // Requeue con delay
        message.status = MessageStatus.RETRYING;
        message.nextRetryAt = Date.now() + delay;

        this.logger.info('Message requeued', {
          messageId,
          retryCount: message.retryCount,
          nextRetryAt: new Date(message.nextRetryAt).toISOString(),
        });
      }
    } else {
      // Senza requeue, vai direttamente in DLQ
      await this.moveToDeadLetter(messageId, 'NACK without requeue');
    }

    await this.saveDatabase();
  }

  /**
   * Sposta un messaggio nella Dead Letter Queue
   *
   * @param messageId - ID del messaggio
   * @param reason - Motivo del move
   */
  async deadLetter(messageId: string, reason?: string): Promise<void> {
    this.ensureInitialized();

    await this.moveToDeadLetter(messageId, reason ?? 'Manual dead letter');
  }

  /**
   * Implementazione interna del move in DLQ
   */
  private async moveToDeadLetter(messageId: string, reason: string): Promise<void> {
    this.logger.warn('Moving message to DLQ', { messageId, reason });

    const message = this.db.messages[messageId];
    if (!message) {
      this.logger.warn('Message not found for DLQ', { messageId });
      return;
    }

    // Aggiorna headers con motivo
    message.headers['x-dlq-reason'] = reason;
    message.headers['x-dlq-timestamp'] = new Date().toISOString();
    message.status = MessageStatus.DEAD_LETTER;

    // Sposta in DLQ
    this.db.deadLetters[messageId] = message;
    delete this.db.messages[messageId];

    // Aggiorna WAL
    await this.addToWAL('delete', 'messages', message);
    await this.addToWAL('insert', 'dead_letters', message);

    await this.saveDatabase();

    this.logger.warn('Message moved to DLQ', {
      messageId,
      topic: message.topic,
      reason,
      retryCount: message.retryCount,
    });
  }

  // ==========================================================================
  // STATUS UPDATE
  // ==========================================================================

  /**
   * Aggiorna lo stato di un messaggio
   */
  private async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    subscriptionId?: string
  ): Promise<void> {
    const message = this.db.messages[messageId];
    if (!message) {
      this.logger.warn('Message not found for status update', { messageId, status });
      return;
    }

    message.status = status;
    message._version++;

    if (status === MessageStatus.DELIVERED) {
      message.deliveredAt = Date.now();
      message.subscriptionId = subscriptionId;
    }

    await this.addToWAL('update', 'messages', message);
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  /**
   * Ottieni le statistiche della coda
   */
  getStats(): QueueStats {
    this.ensureInitialized();

    const now = Date.now();

    // Conta messaggi per stato
    let pendingCount = 0;
    let deliveredCount = 0;
    let ackedCount = 0;

    for (const message of Object.values(this.db.messages)) {
      switch (message.status) {
        case MessageStatus.PENDING:
        case MessageStatus.RETRYING:
          pendingCount++;
          break;
        case MessageStatus.DELIVERED:
          deliveredCount++;
          break;
        case MessageStatus.ACKED:
          ackedCount++;
          break;
      }
    }

    // Calcola throughput (messaggi al secondo nell'ultimo minuto)
    const oneMinuteAgo = now - 60000;
    const recentMessages = this.metrics.publishedInLastSecond.filter(t => t > oneMinuteAgo);
    const messagesPerSecond = recentMessages.length / 60;

    // Calcola latenza media
    const avgLatency = this.metrics.processingTimes.length > 0
      ? this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length
      : 0;

    // Conta totali
    const totalPublished = Object.keys(this.db.messages).length +
      Object.keys(this.db.deadLetters).length +
      ackedCount;

    return {
      pendingMessages: pendingCount,
      deliveredMessages: deliveredCount,
      ackedMessages: ackedCount,
      deadLetterMessages: Object.keys(this.db.deadLetters).length,
      activeSubscriptions: this.subscriptions.size,
      messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
      averageLatencyMs: Math.round(avgLatency),
      totalPublished,
      totalProcessed: ackedCount,
    };
  }

  /**
   * Aggiorna metriche di pubblicazione
   */
  private updatePublishMetrics(): void {
    if (!this.config.enableMetrics) return;

    this.metrics.publishedInLastSecond.push(Date.now());

    // Mantieni solo ultimo minuto
    const oneMinuteAgo = Date.now() - 60000;
    this.metrics.publishedInLastSecond = this.metrics.publishedInLastSecond.filter(
      t => t > oneMinuteAgo
    );
  }

  /**
   * Aggiorna metriche di processing
   */
  private updateProcessingMetrics(duration: number): void {
    if (!this.config.enableMetrics) return;

    this.metrics.processingTimes.push(duration);

    // Mantieni solo ultime 1000 misurazioni
    if (this.metrics.processingTimes.length > 1000) {
      this.metrics.processingTimes.shift();
    }
  }

  // ==========================================================================
  // POLLING & RETRY
  // ==========================================================================

  /**
   * Avvia il polling per messaggi pronti
   */
  private startPolling(): void {
    this.pollingTimer = setInterval(async () => {
      if (this.shuttingDown) return;

      try {
        await this.processPendingMessages();
      } catch (error) {
        this.logger.error('Error in polling loop', { error });
      }
    }, this.config.pollingInterval);
  }

  /**
   * Processa messaggi pending
   */
  private async processPendingMessages(): Promise<void> {
    const now = Date.now();
    const toProcess: Array<{ message: StoredMessage; subscription: Subscription }> = [];

    // Trova messaggi pronti per essere processati
    for (const message of Object.values(this.db.messages)) {
      if (message.status === MessageStatus.PENDING) {
        // Messaggio nuovo, trova subscribers
        const subscriptionsArray = Array.from(this.subscriptions.values());
        for (const subscription of subscriptionsArray) {
          if (!subscription.active) continue;

          if (topicMatchesPattern(message.topic, subscription.topicPattern)) {
            toProcess.push({ message, subscription });
          }
        }
      } else if (message.status === MessageStatus.RETRYING && message.nextRetryAt) {
        // Messaggio in retry pronto
        if (now >= message.nextRetryAt) {
          message.status = MessageStatus.PENDING;
          message.nextRetryAt = undefined;

          const subscriptionsArray = Array.from(this.subscriptions.values());
          for (const subscription of subscriptionsArray) {
            if (!subscription.active) continue;

            if (topicMatchesPattern(message.topic, subscription.topicPattern)) {
              toProcess.push({ message, subscription });
            }
          }
        }
      }
    }

    // Processa in batch
    const batch = toProcess.slice(0, this.config.maxBatchSize);
    for (const { message, subscription } of batch) {
      try {
        await this.deliverMessage(subscription, message);
      } catch (error) {
        this.logger.error('Error processing message in batch', {
          messageId: message.id,
          error,
        });
      }
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Avvia timer per cleanup automatico
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      if (this.shuttingDown) return;

      try {
        await this.cleanup();
      } catch (error) {
        this.logger.error('Error in cleanup', { error });
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup messaggi scaduti e processati
   */
  private async cleanup(): Promise<void> {
    const startTime = Date.now();
    let cleanedCount = 0;

    this.logger.debug('Starting cleanup');

    const toDelete: string[] = [];

    // Trova messaggi da cancellare
    for (const [id, message] of Object.entries(this.db.messages)) {
      const now = Date.now();

      // Cancella ACKED da piu di 10 minuti
      if (message.status === MessageStatus.ACKED) {
        const ackedAge = now - (message.ackedAt ?? now);
        if (ackedAge > 600000) { // 10 minuti
          toDelete.push(id);
        }
      }

      // Cancella messaggi scaduti non ancora consegnati
      if (message.expiresAt && now > message.expiresAt) {
        message.status = MessageStatus.EXPIRED;
        await this.moveToDeadLetter(id, 'Message expired');
      }
    }

    // Cancella DLQ vecchi (piu di 7 giorni)
    const dlqCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [id, message] of Object.entries(this.db.deadLetters)) {
      if (message.timestamp < dlqCutoff) {
        delete this.db.deadLetters[id];
        await this.addToWAL('delete', 'dead_letters', message);
        cleanedCount++;
      }
    }

    // Cancella messaggi marcati
    for (const id of toDelete) {
      const message = this.db.messages[id];
      delete this.db.messages[id];
      await this.addToWAL('delete', 'messages', message);
      cleanedCount++;
    }

    // Cleanup idempotency keys vecchie
    const keysArray = Array.from(this.db.idempotencyKeys);
    for (const key of keysArray) {
      // Trova messaggio associato
      let found = false;
      for (const message of Object.values(this.db.messages)) {
        if (message.idempotencyKey === key) {
          found = true;
          break;
        }
      }
      if (!found) {
        this.db.idempotencyKeys.delete(key);
      }
    }

    await this.saveDatabase();

    const duration = Date.now() - startTime;
    this.metrics.lastCleanupTime = Date.now();

    this.logger.debug('Cleanup completed', { cleanedCount, duration });
  }

  // ==========================================================================
  // SEQUENCE NUMBERS
  // ==========================================================================

  /**
   * Ottieni il prossimo sequence number per un topic
   */
  private getNextSequenceNumber(topic: string): number {
    const current = this.sequenceCounters.get(topic) ?? 0;
    const next = current + 1;
    this.sequenceCounters.set(topic, next);

    // Salva anche nel DB
    this.db.sequences[topic] = next;

    return next;
  }

  // ==========================================================================
  // SHUTDOWN
  // ==========================================================================

  /**
   * Shutdown graceful della coda
   */
  async shutdown(): Promise<void> {
    if (this.shuttingDown) {
      return;
    }

    this.logger.info('Shutting down UMQ');
    this.shuttingDown = true;

    // Ferma timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    // Final cleanup
    await this.cleanup();
    await this.saveDatabase();

    // Unsubscribe all
    const subscriptionsArray = Array.from(this.subscriptions.values());
    for (const subscription of subscriptionsArray) {
      subscription.unsubscribe();
    }

    this.initialized = false;
    this.logger.info('UMQ shutdown complete');
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Verifica che la coda sia inizializzata
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('UMQ not initialized. Call initialize() first.');
    }
  }

  /**
   * Esegui operazione con lock named
   */
  private async withLock<T>(lockName: string, fn: () => Promise<T>): Promise<T> {
    let lock = this.locks.get(lockName);

    if (!lock) {
      lock = Promise.resolve();
      this.locks.set(lockName, lock);
    }

    const newLock = lock.then(async () => {
      try {
        return await fn();
      } finally {
        // Rimuovi lock se e' il nostro
        if (this.locks.get(lockName) === newLock) {
          this.locks.delete(lockName);
        }
      }
    });

    this.locks.set(lockName, newLock as Promise<void>);
    return newLock;
  }

  /**
   * Esegui operazione con lock DB
   */
  private async withDbLock<T>(fn: () => Promise<T>): Promise<T> {
    const newLock = this.dbLock.then(async () => {
      try {
        return await fn();
      } finally {
        // Non rimuovere mai il dbLock
      }
    });

    this.dbLock = newLock.then(() => undefined);
    return newLock as Promise<T>;
  }

  // ==========================================================================
  // ADMIN METHODS
  // ==========================================================================

  /**
   * Ottieni tutti i messaggi nella DLQ
   */
  getDeadLetterMessages(): CCHMessage[] {
    return Object.values(this.db.deadLetters);
  }

  /**
   * Reprocessa un messaggio dalla DLQ
   *
   * @param messageId - ID del messaggio da riprocessare
   */
  async reprocessFromDeadLetter(messageId: string): Promise<void> {
    this.ensureInitialized();

    const message = this.db.deadLetters[messageId];
    if (!message) {
      throw new Error(`Message ${messageId} not found in DLQ`);
    }

    this.logger.info('Reprocessing message from DLQ', { messageId });

    // Rimuovi da DLQ
    delete this.db.deadLetters[messageId];
    await this.addToWAL('delete', 'dead_letters', message);

    // Reset stato
    message.status = MessageStatus.PENDING;
    message.retryCount = 0;
    delete message.deliveredAt;
    delete message.ackedAt;
    delete message.nextRetryAt;

    // Ripubblica
    this.db.messages[messageId] = message;
    await this.addToWAL('insert', 'messages', message);
    await this.saveDatabase();
  }

  /**
   * Ottieni info su una sottoscrizione
   */
  getSubscriptionInfo(subscriptionId: string): Subscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Ottieni tutte le sottoscrizioni
   */
  getAllSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Ottieni messaggi per topic
   */
  getMessagesByTopic(topic: string, includeDeadLetters = false): CCHMessage[] {
    const messages = Object.values(this.db.messages).filter(m => m.topic === topic);

    if (includeDeadLetters) {
      const dlq = Object.values(this.db.deadLetters).filter(m => m.topic === topic);
      return [...messages, ...dlq];
    }

    return messages;
  }

  /**
   * Purge tutti i messaggi da un topic
   */
  async purgeTopic(topic: string): Promise<void> {
    this.ensureInitialized();

    this.logger.warn('Purging topic', { topic });

    const toDelete: string[] = [];

    for (const [id, message] of Object.entries(this.db.messages)) {
      if (message.topic === topic) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      const message = this.db.messages[id];
      delete this.db.messages[id];
      await this.addToWAL('delete', 'messages', message);
    }

    await this.saveDatabase();

    this.logger.info('Topic purged', { topic, deletedCount: toDelete.length });
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Crea e inizializza un'istanza di UnifiedMessageQueue
 *
 * @param config - Configurazione della coda
 * @returns Istanza inizializzata pronta all'uso
 */
export async function createUMQ(config: UMQConfig): Promise<UnifiedMessageQueue> {
  const umq = new UnifiedMessageQueue(config);
  await umq.initialize();
  return umq;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default UnifiedMessageQueue;
