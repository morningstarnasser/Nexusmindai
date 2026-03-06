/**
 * NexusMind Agent Type Definitions
 * Core types for agent configuration and management
 */

/**
 * Agent operational status
 */
export enum AgentStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  PROCESSING = 'processing',
  PAUSED = 'paused',
  ERROR = 'error',
  OFFLINE = 'offline',
  SHUTDOWN = 'shutdown',
}

/**
 * Agent personality and behavior style
 */
export enum AgentPersonality {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FRIENDLY = 'friendly',
  TECHNICAL = 'technical',
  CREATIVE = 'creative',
  FORMAL = 'formal',
  HUMOROUS = 'humorous',
}

/**
 * Agent permissions and access control
 */
export interface AgentPermissions {
  canReadMessages: boolean;
  canWriteMessages: boolean;
  canDeleteMessages: boolean;
  canManageChannels: boolean;
  canManageUsers: boolean;
  canAccessMemory: boolean;
  canModifyMemory: boolean;
  canAccessSecrets: boolean;
  canExecuteSkills: string[];
  customPermissions: Record<string, boolean>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  // Basic identification
  id: string;
  name: string;
  description: string;
  version: string;

  // Behavior
  personality: AgentPersonality;
  systemPrompt: string;
  context: string;
  temperature: number;
  maxTokens: number;

  // Models
  primaryModel: string;
  secondaryModel?: string;
  embeddingModel: string;

  // Platforms
  platforms: string[];
  platformConfig: Record<string, Record<string, unknown>>;

  // Skills
  skills: {
    enabled: string[];
    disabled: string[];
    skillConfig: Record<string, unknown>;
  };

  // Memory
  memorySettings: {
    enabled: boolean;
    maxMemorySize: number;
    retentionDays: number;
    vectorizeMemory: boolean;
  };

  // Performance
  performance: {
    maxConcurrentTasks: number;
    taskTimeout: number;
    rateLimit: number;
  };

  // Security & Permissions
  permissions: AgentPermissions;
  allowedUsers?: string[];
  blockedUsers?: string[];

  // Metadata
  tags: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Agent instance with runtime state
 */
export interface Agent {
  // Identity
  id: string;
  config: AgentConfig;

  // Runtime state
  status: AgentStatus;
  startedAt: Date;
  lastActivityAt: Date;
  uptime: number;

  // Current operations
  activeTaskCount: number;
  taskQueue: string[];
  currentTask?: {
    id: string;
    startedAt: Date;
  };

  // Metrics
  metrics: AgentMetrics;

  // Health
  health: {
    isHealthy: boolean;
    lastHealthCheck: Date;
    issues: string[];
  };

  // Instance-specific
  workspaceId?: string;
  parentAgentId?: string;
  childAgentIds: string[];
}

/**
 * Agent metrics and statistics
 */
export interface AgentMetrics {
  // Usage
  totalMessagesProcessed: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  successRate: number;

  // Models
  modelUsage: Record<string, {
    callCount: number;
    tokenCount: number;
    totalCost: number;
    averageLatency: number;
  }>;

  // Skills
  skillUsage: Record<string, {
    executionCount: number;
    successCount: number;
    failureCount: number;
    averageDuration: number;
  }>;

  // Errors
  errorCount: number;
  warningCount: number;
  lastError?: {
    timestamp: Date;
    message: string;
    stack?: string;
  };

  // Performance
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  cpuUsagePercentage: number;

  // Training/Learning
  learningScore: number;
  adaptabilityScore: number;
  reliabilityScore: number;

  // Timestamps
  metricsCollectedAt: Date;
  metricsResetAt?: Date;
}

/**
 * Agent template for creation
 */
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  baseConfig: AgentConfig;
  presetSkills: string[];
  documentation?: string;
  exampleUsages?: string[];
  popularity?: number;
}

/**
 * Agent creation request
 */
export interface CreateAgentRequest {
  name: string;
  description: string;
  templateId?: string;
  config: Partial<AgentConfig>;
  metadata?: Record<string, unknown>;
}

/**
 * Agent update request
 */
export interface UpdateAgentRequest {
  config?: Partial<AgentConfig>;
  status?: AgentStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Agent cluster for coordinated operation
 */
export interface AgentCluster {
  id: string;
  name: string;
  agents: Agent[];
  coordinator: string;
  communicationMethod: 'direct' | 'message-queue' | 'pubsub';
  loadBalancingStrategy: 'round-robin' | 'least-loaded' | 'weighted' | 'custom';
  metadata?: Record<string, unknown>;
}

/**
 * Agent performance report
 */
export interface AgentPerformanceReport {
  agentId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: AgentMetrics;
  trends: {
    successRateTrend: number;
    responseTimeImprovement: number;
    skillAdoptionTrend: Record<string, number>;
  };
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Agent communication settings
 */
export interface AgentCommunication {
  agentId: string;
  protocol: 'rest' | 'websocket' | 'grpc' | 'amqp';
  endpoint: string;
  authentication?: {
    type: 'apikey' | 'jwt' | 'oauth2';
    credentials: Record<string, string>;
  };
  compression?: boolean;
  timeout: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
}
