export interface NexusMindConfig {
  gateway: {
    port: number;
    host: string;
    mode: 'local' | 'network';
  };
  agents: {
    defaults: {
      model: string;
      heartbeat: {
        enabled: boolean;
        every: string;
      };
      maxConcurrent: number;
    };
    list: Record<string, AgentConfig>;
  };
  channels: {
    telegram?: { enabled: boolean; botToken: string };
    discord?: { enabled: boolean; botToken: string };
    whatsapp?: { enabled: boolean };
    slack?: { enabled: boolean; botToken: string; appToken: string };
    webhook?: { enabled: boolean; secret: string };
  };
  models: {
    providers: Record<string, { apiKey: string; enabled: boolean }>;
    default: string;
  };
}

export interface AgentConfig {
  name: string;
  emoji: string;
  workspace: string;
  model: string;
  heartbeat: {
    enabled: boolean;
    every: string;
  };
  channels: string[];
  createdAt: string;
}

export interface AgentWorkspace {
  path: string;
  soul?: string;
  heartbeat?: string;
  user?: string;
  tools?: string;
  memory: string[];
}

export interface AgentSession {
  id: string;
  agentId: string;
  channelKey: string;
  messages: SessionMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenCount?: number;
  model?: string;
}

export interface HeartbeatTask {
  agentId: string;
  schedule: string;
  lastRun?: Date;
  nextRun: Date;
  status: 'idle' | 'running' | 'error';
  errorCount: number;
}

export interface SystemStatus {
  version: string;
  uptime: number;
  startedAt: Date;
  agents: {
    total: number;
    active: number;
    list: Array<{
      id: string;
      name: string;
      emoji: string;
      status: string;
      channels: string[];
      messageCount: number;
      lastActivity?: Date;
    }>;
  };
  gateway: {
    port: number;
    connections: number;
    messagesTotal: number;
  };
  heartbeat: {
    enabled: boolean;
    tasks: HeartbeatTask[];
  };
  memory: {
    sessionsCount: number;
    totalMessages: number;
  };
}
