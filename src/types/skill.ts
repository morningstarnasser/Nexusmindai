/**
 * NexusMind Skill Type Definitions
 * Core types for skill definition and execution
 */

/**
 * Skill categories
 */
export enum SkillCategory {
  COMMUNICATION = 'communication',
  ANALYSIS = 'analysis',
  GENERATION = 'generation',
  TRANSFORMATION = 'transformation',
  INTEGRATION = 'integration',
  AUTOMATION = 'automation',
  RETRIEVAL = 'retrieval',
  PLANNING = 'planning',
  VALIDATION = 'validation',
  SECURITY = 'security',
}

/**
 * Skill execution status
 */
export enum SkillStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

/**
 * Permission level for skill access
 */
export enum SkillPermissionLevel {
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  AGENT_ONLY = 'agent_only',
  ADMIN_ONLY = 'admin_only',
  CUSTOM = 'custom',
}

/**
 * Skill input parameter definition
 */
export interface SkillInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'file';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: unknown[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  example?: unknown;
  validation?: {
    custom?: (value: unknown) => boolean;
    errorMessage?: string;
  };
}

/**
 * Skill output specification
 */
export interface SkillOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'stream';
  description: string;
  schema?: Record<string, unknown>;
  example?: unknown;
}

/**
 * Permission configuration for skill
 */
export interface SkillPermission {
  level: SkillPermissionLevel;
  allowedRoles?: string[];
  allowedUsers?: string[];
  requiredPermissions?: string[];
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  costLimit?: {
    maxTokensPerExecution: number;
    maxCostPerMonth: number;
  };
}

/**
 * Skill context during execution
 */
export interface SkillContext {
  skillId: string;
  agentId: string;
  executionId: string;
  userId: string;
  inputs: Record<string, unknown>;
  previousOutputs?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  abortSignal?: AbortSignal;
}

/**
 * Skill execution result
 */
export interface SkillExecutionResult {
  skillId: string;
  executionId: string;
  status: SkillStatus;
  output?: Record<string, unknown>;
  error?: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
  metadata: {
    startTime: Date;
    endTime: Date;
    duration: number;
    tokensUsed?: number;
    costIncurred?: number;
  };
}

/**
 * Skill metadata
 */
export interface SkillMetadata {
  author: string;
  version: string;
  license: string;
  homepage?: string;
  repository?: string;
  documentation?: string;
  changelog?: string;
  tags: string[];
  dependencies: Array<{
    skillId: string;
    minVersion: string;
  }>;
  compatibility: {
    minNodeVersion: string;
    platforms: string[];
  };
}

/**
 * Core Skill definition
 */
export interface NexusSkill {
  // Identification
  id: string;
  name: string;
  description: string;
  category: SkillCategory;

  // Function
  handler: (context: SkillContext) => Promise<Record<string, unknown>>;
  inputs: SkillInput[];
  outputs: SkillOutput[];

  // Configuration
  enabled: boolean;
  version: string;
  metadata: SkillMetadata;

  // Permissions
  permissions: SkillPermission;

  // Performance
  timeout: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };

  // Integration
  dependencies: string[];
  integrations: Record<string, unknown>;

  // Lifecycle hooks
  onInit?: () => Promise<void>;
  onShutdown?: () => Promise<void>;
  beforeExecute?: (context: SkillContext) => Promise<void>;
  afterExecute?: (result: SkillExecutionResult) => Promise<void>;
  onError?: (error: Error, context: SkillContext) => Promise<void>;

  // Custom metadata
  customData?: Record<string, unknown>;
}

/**
 * Skill registration entry
 */
export interface SkillRegistry {
  skill: NexusSkill;
  registeredAt: Date;
  executionStats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    totalCost: number;
  };
  lastUsedAt?: Date;
  isHealthy: boolean;
  healthCheckResult?: Record<string, unknown>;
}

/**
 * Skill composition (chaining multiple skills)
 */
export interface SkillComposition {
  id: string;
  name: string;
  description: string;
  skills: Array<{
    skillId: string;
    position: number;
    passthrough: string[];
    errorHandling: 'continue' | 'abort' | 'retry';
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Skill batch execution
 */
export interface SkillBatchExecution {
  executionId: string;
  skillId: string;
  items: Array<{
    id: string;
    inputs: Record<string, unknown>;
  }>;
  options?: {
    parallel?: boolean;
    maxConcurrency?: number;
    timeout?: number;
    stopOnError?: boolean;
  };
  results?: SkillExecutionResult[];
}

/**
 * Skill validation request
 */
export interface SkillValidationRequest {
  skill: NexusSkill;
  inputs: Record<string, unknown>;
  validateIO?: boolean;
  validatePermissions?: boolean;
}

/**
 * Skill validation result
 */
export interface SkillValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  inputValidation: Record<string, string[]>;
}
