/**
 * Core type definitions for NexusMind
 */

// System Configuration
export interface NexusCoreConfig {
  configPath: string;
  eventHistorySize?: number;
  maxConcurrentTasks?: number;
  enableRetry?: boolean;
  modelProviders?: ModelProvider[];
  gatewayConfig?: GatewayConfig;
}

export interface SystemConfig extends Record<string, unknown> {
  app?: { name: string; version: string };
  agent?: { configDir: string };
  api?: { port: number };
  logging?: { level: string };
}

export interface GatewayConfig {
  port?: number;
  host?: string;
  adapters?: string[];
}

// Agent Configuration
export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  version?: string;
  defaultModel: string;
  modelName?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  skills?: SkillDefinition[];
  metadata?: Record<string, unknown>;
}

export type AgentStatus = 'initialized' | 'running' | 'idle' | 'busy' | 'paused' | 'stopped' | 'error';

// Agent is an alias for AgentConfig (used in many modules)
export type Agent = AgentConfig;

// Messages
export interface Message {
  id: string;
  platform: string;
  channel?: string;
  userId: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface MessageResponse {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
  originalMessageId: string;
  metadata?: Record<string, unknown>;
}

// Events
export interface CoreEvent {
  name: string;
  timestamp: Date;
  data: unknown;
  source?: string;
}

export interface AgentEvent extends CoreEvent {
  type: 'agent:created' | 'agent:deleted' | 'agent:updated' | 'agent:error';
  agentId: string;
}

export type EventHandler = (...args: unknown[]) => void | Promise<void>;
export type EventFilter = (event: CoreEvent) => boolean;

// Skills
export interface SkillDefinition {
  name: string;
  description?: string;
  type: 'builtin' | 'api' | 'plugin';
  triggers?: string[];
  config?: Record<string, unknown>;
}

// Memory
export interface MemoryStore {
  shortTerm: Message[];
  longTerm: Map<string, unknown>;
  context: Record<string, unknown>;
}

// Task Queue
export interface Task {
  id?: string;
  name: string;
  priority?: TaskPriority;
  data?: unknown;
  handler?: (data: unknown) => Promise<unknown>;
  status?: TaskStatus;
  result?: unknown;
  error?: string;
  retries?: number;
  createdAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';

// Model Router
export interface ModelProvider {
  name: string;
  type: 'completion' | 'embedding' | 'both';
  apiKey?: string;
  baseUrl?: string;
  priority?: number;
}

export interface CompletionRequest {
  provider?: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface CompletionResponse {
  id: string;
  model: string;
  provider: string;
  content?: string;
  usage?: {
    promptTokens: number;
    completionTokens?: number;
    totalTokens: number;
  };
  timestamp?: Date;
}

export interface EmbeddingRequest {
  provider?: string;
  model: string;
  texts: string[];
  dimensions?: number;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface TokenCountRequest {
  messages?: Array<{ role: string; content?: string }>;
  text?: string;
}

export interface CostTracker {
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, { tokens: number; cost: number }>;
}

export interface StreamOptions {
  onChunk?: (chunk: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

// Gateway & Routing
export interface PlatformAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: Message): Promise<void>;
  onMessage(handler: MessageHandler): void;
  getPlatformName(): string;
  getConnected(): boolean;
}

export type MessageHandler = (message: Message) => Promise<void>;

export interface RoutingRule {
  platform: string;
  channel: string;
  agentId: string;
}

// System Status
export interface HeartbeatMetrics {
  uptime: number;
  agentsActive: number;
  tasksProcessed: number;
  eventsEmitted: number;
  errorCount: number;
  memoryUsage: number;
  lastHeartbeat: Date;
}

export interface SystemStatus {
  isRunning: boolean;
  uptime: number;
  startTime: Date | null;
  agents: number;
  pendingTasks: number;
  metrics: HeartbeatMetrics;
}

// Re-export NexusMessage from message types
export type { NexusMessage } from './message.js';

// Adapter Configuration (used by platform adapters)
export interface AdapterConfig {
  credentials?: Record<string, any>;
  [key: string]: unknown;
}

// Memory types used by MemoryManager and memory layers
export type IMemoryTier = 'working' | 'short-term' | 'long-term' | 'deleted';

export interface IMemoryEntry {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  tier: IMemoryTier | string;
  accessCount: number;
}

export interface ISearchResult {
  entryId: string;
  content: string;
  relevanceScore: number;
  sources: string[];
  tier?: string;
}

export interface IMemoryStats {
  timestamp: Date;
  workingMemory: { count: number; sizeBytes: number };
  shortTermMemory: { count: number; sizeBytes: number };
  longTermMemory: { count: number; sizeBytes: number };
  knowledgeGraph: {
    entities: number;
    relationships: number;
  };
  consolidationHistory: {
    total: number;
    lastConsolidation?: Date;
  };
}

export default {
  // Type exports
};
