import type { Express } from 'express';
import RestAPI from './api/RestAPI.js';
import WebSocketAPI from './api/WebSocketAPI.js';
import Database from './storage/Database.js';
import SQLiteStore from './storage/SQLiteStore.js';
import MetricsCollector from './monitoring/MetricsCollector.js';
import HealthCheck from './monitoring/HealthCheck.js';

const NEXUS_BANNER = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║                     NexusMind AI Gateway                  ║
║                       Version 1.0.0                       ║
║                                                           ║
║        Advanced AI Agent Management & Orchestration       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

interface NexusMindConfig {
  port: number;
  host: string;
  dbPath: string;
  enableWebSocket: boolean;
  enableMetrics: boolean;
  corsOrigin: string | string[];
  enableRateLimit: boolean;
  enableAuth: boolean;
}

const defaultConfig: NexusMindConfig = {
  port: parseInt(process.env.API_PORT || '3000'),
  host: process.env.API_HOST || '0.0.0.0',
  dbPath: process.env.DB_PATH || './nexusmind.db',
  enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
  enableMetrics: process.env.ENABLE_METRICS !== 'false',
  corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
  enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
  enableAuth: process.env.ENABLE_AUTH !== 'false',
};

export class NexusMind {
  private config: NexusMindConfig;
  private restAPI: RestAPI | null = null;
  private wsAPI: WebSocketAPI | null = null;
  private database: Database | null = null;
  private store: SQLiteStore | null = null;
  private metrics: MetricsCollector | null = null;
  private healthCheck: HealthCheck | null = null;
  private expressApp: Express | null = null;

  constructor(config: Partial<NexusMindConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async initialize(): Promise<void> {
    console.log(NEXUS_BANNER);
    console.log(`Starting NexusMind on ${this.config.host}:${this.config.port}`);
    console.log(`Database: ${this.config.dbPath}`);

    // Initialize Express
    try {
      const expressModule = await import('express');
      const express = (expressModule.default || expressModule) as any;
      this.expressApp = express() as Express;
    } catch (error) {
      console.error(
        'Express not installed. Install it with: npm install express @types/express'
      );
      throw error;
    }

    // Initialize Database
    try {
      this.database = new Database();
      await this.database.initialize(this.config.dbPath);
      this.store = new SQLiteStore(this.database);
      await this.store.initialize();
      console.log('Storage layer initialized');
    } catch (error) {
      console.warn('Database initialization skipped:', (error as Error).message);
    }

    // Initialize REST API
    this.restAPI = new RestAPI({
      port: this.config.port,
      host: this.config.host,
      corsOrigin: this.config.corsOrigin,
      enableRateLimit: this.config.enableRateLimit,
      enableAuth: this.config.enableAuth,
    });

    if (this.expressApp) {
      await this.restAPI.initialize(this.expressApp);
    }

    // Initialize WebSocket API
    if (this.config.enableWebSocket) {
      this.wsAPI = new WebSocketAPI();
      const httpServer = this.restAPI.getServer();
      if (httpServer) {
        await this.wsAPI.initialize(httpServer);
        console.log('WebSocket API initialized');
      }
    }

    // Initialize Metrics Collector
    if (this.config.enableMetrics) {
      this.metrics = new MetricsCollector();
      this.metrics.initialize();
    }

    // Initialize Health Check
    this.healthCheck = new HealthCheck();
    this.healthCheck.initialize({
      database: this.database,
    });
    await this.healthCheck.startPeriodicHealthCheck();

    console.log('NexusMind initialized successfully');
  }

  async start(): Promise<void> {
    if (!this.restAPI) {
      throw new Error('NexusMind not initialized');
    }

    try {
      await this.restAPI.start();
      console.log('NexusMind started successfully');
      console.log(`REST API: http://${this.config.host}:${this.config.port}`);
      if (this.config.enableWebSocket) {
        console.log(`WebSocket: ws://${this.config.host}:${this.config.port}`);
      }
    } catch (error) {
      console.error('Failed to start NexusMind:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('Shutting down NexusMind...');

    if (this.healthCheck) {
      await this.healthCheck.stop();
    }

    if (this.metrics) {
      await this.metrics.stop();
    }

    if (this.wsAPI) {
      await this.wsAPI.stop();
    }

    if (this.restAPI) {
      await this.restAPI.stop();
    }

    if (this.store) {
      await this.store.close();
    }

    if (this.database) {
      await this.database.close();
    }

    console.log('NexusMind shutdown complete');
  }

  getRestAPI(): RestAPI | null {
    return this.restAPI;
  }

  getWebSocketAPI(): WebSocketAPI | null {
    return this.wsAPI;
  }

  getDatabase(): Database | null {
    return this.database;
  }

  getStore(): SQLiteStore | null {
    return this.store;
  }

  getMetrics(): MetricsCollector | null {
    return this.metrics;
  }

  getHealthCheck(): HealthCheck | null {
    return this.healthCheck;
  }
}

// Main entry point
async function main(): Promise<void> {
  const nexusMind = new NexusMind();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await nexusMind.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await nexusMind.stop();
    process.exit(0);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  try {
    await nexusMind.initialize();
    await nexusMind.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Only run main if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Startup failed:', error);
    process.exit(1);
  });
}

export default NexusMind;
