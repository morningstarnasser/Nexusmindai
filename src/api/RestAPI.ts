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

    // Root endpoint — Landing Page
    this.app.get('/', (req: Request, res: Response) => {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const uptimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      const mem = process.memoryUsage();
      const memMB = (mem.rss / 1024 / 1024).toFixed(1);

      res.setHeader('Content-Type', 'text/html');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexusMind AI Platform</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20h6v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z'/><path d='M12 2v4'/><path d='m4.93 4.93 2.83 2.83'/><path d='m16.24 7.76 2.83-2.83'/></svg>">
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e2e8f0;min-height:100vh;overflow-x:hidden}
    .bg{position:fixed;inset:0;z-index:0}
    .bg::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(ellipse at 30% 20%,rgba(99,102,241,.15) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(139,92,246,.1) 0%,transparent 50%);animation:drift 20s ease-in-out infinite}
    @keyframes drift{0%,100%{transform:translate(0,0)}50%{transform:translate(-2%,2%)}}
    .grid-bg{position:fixed;inset:0;background-image:linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px);background-size:60px 60px;z-index:0}
    .container{position:relative;z-index:1;max-width:900px;margin:0 auto;padding:40px 24px;min-height:100vh;display:flex;flex-direction:column;justify-content:center}
    .hero{text-align:center;margin-bottom:48px}
    .logo{margin-bottom:16px;display:flex;justify-content:center;filter:drop-shadow(0 0 30px rgba(99,102,241,.4))}
    .logo i{width:64px;height:64px;color:#818cf8}
    h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;background:linear-gradient(135deg,#818cf8,#a78bfa,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.02em;margin-bottom:8px}
    .tagline{color:#94a3b8;font-size:1.1rem;max-width:500px;margin:0 auto;line-height:1.6}
    .status-bar{display:flex;justify-content:center;gap:24px;margin:32px 0;flex-wrap:wrap}
    .status-item{display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(30,30,46,.6);border:1px solid rgba(99,102,241,.15);border-radius:999px;font-size:.85rem}
    .status-item i{width:14px;height:14px;color:#94a3b8}
    .dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,.5);animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-bottom:48px}
    .card{background:rgba(30,30,46,.5);border:1px solid rgba(99,102,241,.1);border-radius:16px;padding:24px;transition:all .3s;backdrop-filter:blur(10px)}
    .card:hover{border-color:rgba(99,102,241,.3);transform:translateY(-2px);box-shadow:0 8px 32px rgba(99,102,241,.1)}
    .card-icon{margin-bottom:12px;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:rgba(99,102,241,.1)}
    .card-icon i{width:22px;height:22px;color:#a78bfa}
    .card h3{font-size:1rem;font-weight:600;margin-bottom:4px;color:#c7d2fe}
    .card p{font-size:.8rem;color:#64748b;line-height:1.5}
    .card code{font-size:.75rem;color:#818cf8;background:rgba(99,102,241,.1);padding:2px 8px;border-radius:4px;display:inline-block;margin-top:8px}
    .metrics{display:flex;justify-content:center;gap:32px;margin-bottom:48px;flex-wrap:wrap}
    .metric{text-align:center}
    .metric-icon{display:flex;justify-content:center;margin-bottom:4px}
    .metric-icon i{width:18px;height:18px;color:#64748b}
    .metric-value{font-size:1.5rem;font-weight:700;color:#a78bfa}
    .metric-label{font-size:.75rem;color:#64748b;margin-top:2px}
    .links{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
    .btn{display:inline-flex;align-items:center;gap:8px;padding:10px 24px;border-radius:10px;font-size:.9rem;font-weight:500;text-decoration:none;transition:all .2s}
    .btn i{width:16px;height:16px}
    .btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 4px 16px rgba(99,102,241,.3)}
    .btn-primary:hover{box-shadow:0 6px 24px rgba(99,102,241,.5);transform:translateY(-1px)}
    .btn-ghost{border:1px solid rgba(99,102,241,.2);color:#a5b4fc;background:transparent}
    .btn-ghost:hover{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.4)}
    footer{text-align:center;padding:24px 0;color:#475569;font-size:.75rem;border-top:1px solid rgba(99,102,241,.08)}
    footer a{color:#818cf8;text-decoration:none}
    @media(max-width:600px){.status-bar{gap:12px}.metrics{gap:20px}.cards{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="bg"></div>
  <div class="grid-bg"></div>
  <div class="container">
    <div class="hero">
      <div class="logo"><i data-lucide="brain-circuit"></i></div>
      <h1>NexusMind</h1>
      <p class="tagline">Autonomous AI Agent Orchestration Platform &mdash; deploy intelligent agents across 12+ messaging platforms from a single unified system.</p>
    </div>

    <div class="status-bar">
      <div class="status-item"><span class="dot"></span> System Online</div>
      <div class="status-item"><i data-lucide="clock"></i> Uptime: ${uptimeStr}</div>
      <div class="status-item"><i data-lucide="hard-drive"></i> Memory: ${memMB} MB</div>
      <div class="status-item"><i data-lucide="radio-tower"></i> v1.0.0</div>
    </div>

    <div class="cards">
      <div class="card">
        <div class="card-icon"><i data-lucide="bot"></i></div>
        <h3>Agents</h3>
        <p>Create, deploy and manage AI agents across platforms</p>
        <code>GET /api/agents</code>
      </div>
      <div class="card">
        <div class="card-icon"><i data-lucide="git-branch"></i></div>
        <h3>Workflows</h3>
        <p>Orchestrate multi-step agent workflows</p>
        <code>GET /api/workflows</code>
      </div>
      <div class="card">
        <div class="card-icon"><i data-lucide="puzzle"></i></div>
        <h3>Skills</h3>
        <p>Install and manage modular agent capabilities</p>
        <code>GET /api/skills</code>
      </div>
      <div class="card">
        <div class="card-icon"><i data-lucide="database"></i></div>
        <h3>Memory</h3>
        <p>Tiered memory with semantic search</p>
        <code>GET /api/memory/stats</code>
      </div>
      <div class="card">
        <div class="card-icon"><i data-lucide="heart-pulse"></i></div>
        <h3>Heartbeat</h3>
        <p>Autonomous task scheduling engine</p>
        <code>GET /api/heartbeat</code>
      </div>
      <div class="card">
        <div class="card-icon"><i data-lucide="activity"></i></div>
        <h3>System</h3>
        <p>Health monitoring, metrics and backups</p>
        <code>GET /api/system/health</code>
      </div>
    </div>

    <div class="metrics">
      <div class="metric"><div class="metric-icon"><i data-lucide="globe"></i></div><div class="metric-value">12+</div><div class="metric-label">Platforms</div></div>
      <div class="metric"><div class="metric-icon"><i data-lucide="layers"></i></div><div class="metric-value">6</div><div class="metric-label">API Modules</div></div>
      <div class="metric"><div class="metric-icon"><i data-lucide="shield-check"></i></div><div class="metric-value">AES-256</div><div class="metric-label">Encryption</div></div>
      <div class="metric"><div class="metric-icon"><i data-lucide="radio"></i></div><div class="metric-value">WS</div><div class="metric-label">Real-Time</div></div>
    </div>

    <div class="links">
      <a href="https://github.com/morningstarnasser/Nexusmindai" class="btn btn-primary" target="_blank"><i data-lucide="github"></i> GitHub Repository</a>
      <a href="/api/system/health" class="btn btn-ghost"><i data-lucide="heart-pulse"></i> Health Check</a>
      <a href="/health" class="btn btn-ghost"><i data-lucide="server"></i> API Status</a>
    </div>
  </div>

  <footer>
    <p>Built with TypeScript, Express & Next.js &mdash; <a href="https://github.com/morningstarnasser/Nexusmindai" target="_blank">NexusMind</a> &copy; 2026</p>
  </footer>

  <script>lucide.createIcons();</script>
</body>
</html>`);
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
