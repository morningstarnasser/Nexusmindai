/**
 * NexusMind Event Type Definitions
 * Core types for event system and event-driven architecture
 */

/**
 * Event types throughout the system
 */
export enum EventType {
  // System events
  SYSTEM_STARTUP = 'system:startup',
  SYSTEM_SHUTDOWN = 'system:shutdown',
  SYSTEM_ERROR = 'system:error',
  SYSTEM_HEARTBEAT = 'system:heartbeat',
  SYSTEM_HEALTH_CHECK = 'system:health_check',

  // Agent events
  AGENT_CREATED = 'agent:created',
  AGENT_UPDATED = 'agent:updated',
  AGENT_DELETED = 'agent:deleted',
  AGENT_STARTED = 'agent:started',
  AGENT_STOPPED = 'agent:stopped',
  AGENT_ERROR = 'agent:error',
  AGENT_STATUS_CHANGED = 'agent:status_changed',
  AGENT_METRICS_UPDATE = 'agent:metrics_update',

  // Message events
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_SENT = 'message:sent',
  MESSAGE_PROCESSED = 'message:processed',
  MESSAGE_FAILED = 'message:failed',
  MESSAGE_DELETED = 'message:deleted',

  // Skill events
  SKILL_REGISTERED = 'skill:registered',
  SKILL_UNREGISTERED = 'skill:unregistered',
  SKILL_ENABLED = 'skill:enabled',
  SKILL_DISABLED = 'skill:disabled',
  SKILL_EXECUTION_START = 'skill:execution_start',
  SKILL_EXECUTION_END = 'skill:execution_end',
  SKILL_EXECUTION_ERROR = 'skill:execution_error',

  // Workflow events
  WORKFLOW_CREATED = 'workflow:created',
  WORKFLOW_UPDATED = 'workflow:updated',
  WORKFLOW_DELETED = 'workflow:deleted',
  WORKFLOW_STARTED = 'workflow:started',
  WORKFLOW_COMPLETED = 'workflow:completed',
  WORKFLOW_FAILED = 'workflow:failed',
  WORKFLOW_PAUSED = 'workflow:paused',
  WORKFLOW_RESUMED = 'workflow:resumed',

  // Memory events
  MEMORY_ENTRY_CREATED = 'memory:entry_created',
  MEMORY_ENTRY_UPDATED = 'memory:entry_updated',
  MEMORY_ENTRY_DELETED = 'memory:entry_deleted',
  MEMORY_CONSOLIDATED = 'memory:consolidated',
  MEMORY_THRESHOLD_EXCEEDED = 'memory:threshold_exceeded',

  // User/Platform events
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',
  USER_AUTHENTICATED = 'user:authenticated',
  CHANNEL_CREATED = 'channel:created',
  CHANNEL_DELETED = 'channel:deleted',

  // Integration events
  INTEGRATION_CONNECTED = 'integration:connected',
  INTEGRATION_DISCONNECTED = 'integration:disconnected',
  INTEGRATION_ERROR = 'integration:error',
  INTEGRATION_SYNC = 'integration:sync',

  // Custom event
  CUSTOM = 'custom',
}

/**
 * Event severity level
 */
export enum EventSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Core event structure
 */
export interface NexusEvent {
  // Identification
  id: string;
  type: EventType;
  source: string;

  // Content
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  // Severity and status
  severity: EventSeverity;
  success: boolean;

  // Temporal
  timestamp: Date;
  processingStartTime?: Date;
  processingEndTime?: Date;

  // Relationships
  correlationId?: string;
  causedBy?: string;
  parentEventId?: string;
  relatedEventIds?: string[];

  // Error information
  error?: {
    message: string;
    code: string;
    stack?: string;
    details?: Record<string, unknown>;
  };

  // Processing state
  processed: boolean;
  handlerCount?: number;
  retryCount?: number;
}

/**
 * Event handler function type
 */
export type EventHandler = (event: NexusEvent) => Promise<void>;

/**
 * Event handler registration
 */
export interface EventHandlerRegistration {
  id: string;
  eventType: EventType | EventType[];
  handler: EventHandler;
  priority?: number;
  async?: boolean;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
  timeout?: number;
  errorHandler?: (error: Error, event: NexusEvent) => Promise<void>;
  filter?: EventFilter;
}

/**
 * Event filter for selective handling
 */
export interface EventFilter {
  eventTypes?: EventType[];
  severity?: EventSeverity[];
  source?: string | string[];
  dataMatch?: Record<string, unknown>;
  timeRange?: {
    startDate: Date;
    endDate: Date;
  };
  customFilter?: (event: NexusEvent) => boolean;
}

/**
 * Event listener options
 */
export interface EventListenerOptions {
  once?: boolean;
  filter?: EventFilter;
  priority?: number;
  timeout?: number;
  errorHandling?: 'throw' | 'suppress' | 'callback';
}

/**
 * Event emission options
 */
export interface EventEmissionOptions {
  async?: boolean;
  broadcast?: boolean;
  persistToLog?: boolean;
  notifySubscribers?: boolean;
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
}

/**
 * Event payload for emission
 */
export interface EventPayload {
  type: EventType;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  severity?: EventSeverity;
  source?: string;
}

/**
 * Event statistics
 */
export interface EventStatistics {
  eventType: EventType;
  totalCount: number;
  countBySeverity: Record<EventSeverity, number>;
  successCount: number;
  failureCount: number;
  averageHandlingTime: number;
  lastOccurrence?: Date;
  handlerStats: Array<{
    handlerId: string;
    invokedCount: number;
    successCount: number;
    failureCount: number;
    averageTime: number;
  }>;
}

/**
 * Event batch operation
 */
export interface EventBatch {
  id: string;
  events: NexusEvent[];
  batchedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
}

/**
 * Event subscription
 */
export interface EventSubscription {
  id: string;
  eventTypes: EventType[];
  subscriberUrl: string;
  filter?: EventFilter;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
  active: boolean;
  createdAt: Date;
}

/**
 * Event store query
 */
export interface EventStoreQuery {
  eventTypes?: EventType[];
  severity?: EventSeverity[];
  source?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Event processing result
 */
export interface EventProcessingResult {
  eventId: string;
  success: boolean;
  handlersExecuted: number;
  handlersSucceeded: number;
  handlersFailedCount: number;
  totalDuration: number;
  errors: Array<{
    handlerId: string;
    error: string;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  maxEventQueueSize: number;
  enableEventPersistence: boolean;
  persistencePath?: string;
  retentionDays: number;
  maxHandlersPerEvent: number;
  timeoutMs: number;
  asyncMode: boolean;
  batching?: {
    enabled: boolean;
    batchSize: number;
    flushInterval: number;
  };
}
