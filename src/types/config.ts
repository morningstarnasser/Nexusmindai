/**
 * NexusMind Configuration Type Definitions
 * Comprehensive configuration interfaces for the entire system
 */

/**
 * Server configuration settings
 */
export interface ServerConfig {
  host: string;
  port: number;
  nodeEnv: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
  timezone: string;
  corsOrigins: string[];
  requestTimeout: number;
  maxBodySize: string;
  enableDebugLogging: boolean;
}

/**
 * AI Model provider configuration
 */
export interface ModelProviderConfig {
  name: string;
  apiKey: string;
  baseUrl?: string;
  timeout: number;
  maxRetries: number;
  rateLimitPerMinute: number;
  costPerMillion: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * AI Models configuration
 */
export interface ModelsConfig {
  primary: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  secondary: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  embedding: {
    provider: string;
    model: string;
    dimensions: number;
  };
  providers: Record<string, ModelProviderConfig>;
}

/**
 * Memory system configuration
 */
export interface MemoryConfig {
  type: 'redis' | 'in-memory' | 'hybrid';
  maxSize: number;
  ttl: number;
  vectorDimension: number;
  indexType: 'hnsw' | 'ivf' | 'flat';
  compressionEnabled: boolean;
  persistenceEnabled: boolean;
  persistencePath: string;
}

/**
 * Heartbeat configuration for agent health monitoring
 */
export interface HeartbeatConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  maxMissedBeats: number;
  checkStorageHealth: boolean;
  checkModelHealth: boolean;
  checkMemoryHealth: boolean;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  encryptionEnabled: boolean;
  encryptionAlgorithm: 'aes-256-gcm' | 'aes-256-cbc';
  jwtSecret: string;
  jwtExpiry: string;
  apiKeyRequired: boolean;
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    enabled: boolean;
    credentials: boolean;
  };
  https: {
    enabled: boolean;
    certPath?: string;
    keyPath?: string;
  };
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  enabled: boolean;
  port: number;
  host: string;
  publicPath: string;
  socketIO: {
    enabled: boolean;
    transports: ('websocket' | 'polling')[];
  };
  refreshInterval: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  prettyPrint: boolean;
  format: 'json' | 'text';
  outputFiles: {
    enabled: boolean;
    directory: string;
    maxSize: string;
    maxFiles: number;
  };
  errorTracking: {
    enabled: boolean;
    serviceName?: string;
  };
}

/**
 * Gateway configuration for multi-platform support
 */
export interface GatewayConfig {
  discord?: {
    enabled: boolean;
    token: string;
    intents: number;
  };
  telegram?: {
    enabled: boolean;
    token: string;
    webhookUrl?: string;
  };
  slack?: {
    enabled: boolean;
    botToken: string;
    appToken: string;
  };
  twitter?: {
    enabled: boolean;
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  };
  webhook?: {
    enabled: boolean;
    port: number;
  };
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  type: 'local' | 's3' | 'gcs' | 'azure';
  local?: {
    basePath: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  gcs?: {
    projectId: string;
    keyFile: string;
    bucket: string;
  };
}

/**
 * Main NexusMind Configuration
 */
export interface NexusMindConfig {
  server: ServerConfig;
  models: ModelsConfig;
  memory: MemoryConfig;
  heartbeat: HeartbeatConfig;
  security: SecurityConfig;
  dashboard: DashboardConfig;
  logging: LoggingConfig;
  gateway: GatewayConfig;
  storage: StorageConfig;
}

/**
 * Config loading options
 */
export interface ConfigLoadOptions {
  configPath?: string;
  overrides?: Partial<NexusMindConfig>;
  environment?: NodeJS.ProcessEnv;
  validateOnLoad?: boolean;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
