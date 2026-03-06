/**
 * NexusMind Workflow Type Definitions
 * Core types for workflow orchestration and automation
 */

/**
 * Workflow execution status
 */
export enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ACTIVE = 'active',
  PAUSED = 'paused',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Workflow step status
 */
export enum StepStatus {
  PENDING = 'pending',
  SKIPPED = 'skipped',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  AWAITING_INPUT = 'awaiting_input',
}

/**
 * Trigger condition types
 */
export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT = 'event',
  MESSAGE = 'message',
  WEBHOOK = 'webhook',
  API = 'api',
  CONDITION = 'condition',
}

/**
 * Workflow trigger definition
 */
export interface WorkflowTrigger {
  type: TriggerType;
  enabled: boolean;

  // Scheduled trigger
  schedule?: {
    cron: string;
    timezone: string;
    description: string;
  };

  // Event trigger
  event?: {
    type: string;
    filter?: Record<string, unknown>;
    debounce?: number;
  };

  // Message trigger
  message?: {
    platforms: string[];
    keywords?: string[];
    pattern?: string;
    requiresMention?: boolean;
  };

  // Webhook trigger
  webhook?: {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    requireAuth: boolean;
    rateLimit?: number;
  };

  // Condition trigger
  condition?: {
    variable: string;
    operator: string;
    value: unknown;
  };

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  type: 'skill' | 'decision' | 'parallel' | 'loop' | 'delay' | 'http' | 'human';
  enabled: boolean;
  position: number;

  // Execution configuration
  skill?: {
    skillId: string;
    inputs: Record<string, unknown>;
    timeout?: number;
    retryPolicy?: {
      maxRetries: number;
      backoffMultiplier: number;
      initialDelayMs: number;
    };
  };

  // Decision/Branching
  decision?: {
    variable: string;
    branches: Array<{
      condition: string;
      operator: string;
      value: unknown;
      nextStepId: string;
    }>;
    defaultNextStepId?: string;
  };

  // Parallel execution
  parallel?: {
    stepIds: string[];
    waitForAll: boolean;
    timeout?: number;
  };

  // Loop configuration
  loop?: {
    variable: string;
    collection: string;
    maxIterations: number;
    stepId: string;
  };

  // Delay
  delay?: {
    duration: number;
    unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours';
  };

  // HTTP request
  http?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    timeout?: number;
  };

  // Human interaction
  human?: {
    message: string;
    action: 'approve' | 'input' | 'select';
    options?: Array<{
      label: string;
      value: string;
    }>;
    timeout?: number;
  };

  // Error handling
  errorHandling?: {
    strategy: 'continue' | 'retry' | 'skip' | 'abort';
    onError?: string;
    errorMessage?: string;
  };

  // Variable mapping
  outputMapping?: Record<string, string>;
  inputMapping?: Record<string, unknown>;

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Core Workflow definition
 */
export interface Workflow {
  // Identification
  id: string;
  name: string;
  description?: string;
  version: string;
  status: WorkflowStatus;

  // Structure
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  startStepId: string;

  // Configuration
  timeout?: number;
  maxRetries?: number;
  concurrency?: number;

  // Variables
  variables: Record<string, {
    type: string;
    default?: unknown;
    description?: string;
  }>;

  // Permissions & Access
  ownerUserId: string;
  permissions: {
    canExecute: string[];
    canEdit: string[];
    canDelete: string[];
  };

  // Metadata
  tags?: string[];
  category?: string;
  documentation?: string;
  metadata?: Record<string, unknown>;

  // Lifecycle
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

/**
 * Workflow execution instance
 */
export interface WorkflowRun {
  // Identification
  id: string;
  workflowId: string;
  workflowVersion: string;

  // Execution state
  status: WorkflowStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;

  // Input/Output
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  variables: Record<string, unknown>;

  // Step execution
  steps: Array<{
    id: string;
    status: StepStatus;
    startedAt?: Date;
    completedAt?: Date;
    output?: Record<string, unknown>;
    error?: {
      message: string;
      code: string;
    };
  }>;

  // Trigger info
  triggeredBy: {
    type: TriggerType;
    trigger?: string;
  };

  // Error info
  error?: {
    stepId: string;
    message: string;
    code: string;
    stack?: string;
  };

  // Metadata
  metadata?: Record<string, unknown>;
  logs?: Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
  }>;
}

/**
 * Workflow execution request
 */
export interface WorkflowExecutionRequest {
  workflowId: string;
  inputs?: Record<string, unknown>;
  triggerType?: TriggerType;
  metadata?: Record<string, unknown>;
  timeout?: number;
  skipSteps?: string[];
}

/**
 * Workflow builder/definition request
 */
export interface WorkflowDefinitionRequest {
  name: string;
  description?: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  startStepId: string;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Workflow template
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  baseWorkflow: Workflow;
  presetTriggers: WorkflowTrigger[];
  documentation?: string;
  exampleInputs?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Workflow version
 */
export interface WorkflowVersion {
  workflowId: string;
  version: string;
  workflow: Workflow;
  createdAt: Date;
  createdBy: string;
  changelog?: string;
  isCurrent: boolean;
}

/**
 * Workflow execution statistics
 */
export interface WorkflowStatistics {
  workflowId: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  averageDuration: number;
  averageTokensUsed: number;
  totalCost: number;
  lastRunAt?: Date;
  successRate: number;
  mostCommonErrors: Array<{
    error: string;
    count: number;
  }>;
}
