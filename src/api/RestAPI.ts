import type { Express, Request, Response, NextFunction } from 'express';
import type { Server as HTTPServer } from 'http';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { validationMiddleware } from './middleware/validation.js';
import agentsRouter from './routes/agents.js';
import workflowsRouter from './routes/workflows.js';
import skillsRouter from './routes/skills.js';
import memoryRouter from './routes/memory.js';
import heartbeatRouter from './routes/heartbeat.js';
import systemRouter from './routes/system.js';

interface RestAPIConfig {
  port: number;
  host: string;
  corsOrigin: string | string[];
  enableRateLimit: boolean;
  enableAuth: boolean;
}

interface APIError extends Error {
  status?: number;
  code?: string;
}

export class RestAPI {
  private app: Express | null = null;
  private server: HTTPServer | null = null;
  private config: RestAPIConfig;

  constructor(config: RestAPIConfig) {
    this.config = config;
  }

  async initialize(expressApp: Express): Promise<void> {
    this.app = expressApp;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    if (!this.app) throw new Error('Express app not initialized');

    // CORS middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin as string;
      const allowedOrigins = Array.isArray(this.config.corsOrigin)
        ? this.config.corsOrigin
        : [this.config.corsOrigin];

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }

      next();
    });

    // JSON parsing middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        if (data && req.headers['content-type']?.includes('application/json')) {
          try {
            (req as any).body = JSON.parse(data);
          } catch (error) {
            return res.status(400).json({
              error: 'Invalid JSON in request body',
              details: (error as Error).message,
            });
          }
        }
        next();
      });
    });

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      (req as any).id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', (req as any).id);
      next();
    });

    // Logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
        );
      });
      next();
    });

    // Authentication middleware (if enabled)
    if (this.config.enableAuth) {
      this.app.use('/api', authMiddleware);
    }

    // Rate limiting middleware (if enabled)
    if (this.config.enableRateLimit) {
      this.app.use(rateLimitMiddleware);
    }

    // Validation middleware
    this.app.use(validationMiddleware);
  }

  private setupRoutes(): void {
    if (!this.app) throw new Error('Express app not initialized');

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    });

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'NexusMind API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          agents: '/api/agents',
          workflows: '/api/workflows',
          skills: '/api/skills',
          memory: '/api/memory',
          heartbeat: '/api/heartbeat',
          system: '/api/system',
        },
      });
    });

    // API routes
    this.app.use('/api/agents', agentsRouter);
    this.app.use('/api/workflows', workflowsRouter);
    this.app.use('/api/skills', skillsRouter);
    this.app.use('/api/memory', memoryRouter);
    this.app.use('/api/heartbeat', heartbeatRouter);
    this.app.use('/api/system', systemRouter);

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        path: req.path,
        method: req.method,
      });
    });
  }

  private setupErrorHandling(): void {
    if (!this.app) throw new Error('Express app not initialized');

    this.app.use((error: APIError, req: Request, res: Response, next: NextFunction) => {
      const status = error.status || 500;
      const code = error.code || 'INTERNAL_ERROR';

      console.error(`[Error] ${code}:`, error.message);

      res.status(status).json({
        error: error.message || 'An error occurred',
        code,
        requestId: (req as any).id,
        timestamp: new Date().toISOString(),
      });
    });
  }

  async start(): Promise<void> {
    if (!this.app) throw new Error('Express app not initialized');

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app!.listen(this.config.port, this.config.host, () => {
          console.log(
            `REST API listening on http://${this.config.host}:${this.config.port}`
          );
          resolve();
        });

        this.server.on('error', (error) => {
          console.error('Server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error) => {
          if (error) {
            console.error('Error closing server:', error);
            reject(error);
          } else {
            console.log('REST API stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getApp(): Express | null {
    return this.app;
  }

  getServer(): HTTPServer | null {
    return this.server;
  }
}

export default RestAPI;
