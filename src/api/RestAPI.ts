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
  <title>NexusMind &mdash; Autonomous AI Agent Platform</title>
  <meta name="description" content="Deploy intelligent AI agents across 12+ messaging platforms. Unified orchestration, tiered memory, autonomous scheduling.">
  <meta property="og:title" content="NexusMind AI Platform">
  <meta property="og:description" content="The AI agent platform that actually does things. Deploy across Telegram, Discord, Slack, WhatsApp and more.">
  <meta property="og:type" content="website">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20h6v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z'/><path d='M12 2v4'/><path d='m4.93 4.93 2.83 2.83'/><path d='m16.24 7.76 2.83-2.83'/></svg>">
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#0a0a0f;--surface:rgba(30,30,46,.5);--surface-hover:rgba(30,30,46,.8);--border:rgba(99,102,241,.1);--border-hover:rgba(99,102,241,.3);--accent:#6366f1;--accent-light:#818cf8;--accent-lighter:#a78bfa;--accent-lightest:#c7d2fe;--text:#e2e8f0;--text-muted:#94a3b8;--text-dim:#64748b;--text-dimmer:#475569;--green:#22c55e;--radius:16px;--radius-sm:10px;--radius-xs:8px}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;line-height:1.6}
    a{color:var(--accent-light);text-decoration:none;transition:color .2s}
    a:hover{color:var(--accent-lighter)}

    /* Background */
    .bg{position:fixed;inset:0;z-index:0}
    .bg::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(ellipse at 30% 20%,rgba(99,102,241,.12) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(139,92,246,.08) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(99,102,241,.05) 0%,transparent 70%);animation:drift 25s ease-in-out infinite}
    @keyframes drift{0%,100%{transform:translate(0,0)}33%{transform:translate(-1.5%,1%)}66%{transform:translate(1%,-1.5%)}}
    .grid-bg{position:fixed;inset:0;background-image:linear-gradient(rgba(99,102,241,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.025) 1px,transparent 1px);background-size:64px 64px;z-index:0}
    .page{position:relative;z-index:1}

    /* Navigation */
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;backdrop-filter:blur(20px);background:rgba(10,10,15,.8);border-bottom:1px solid var(--border)}
    .nav-inner{max-width:1200px;margin:0 auto;padding:14px 32px;display:flex;align-items:center;justify-content:space-between}
    .nav-brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:1.1rem;color:var(--text)}
    .nav-brand i{width:24px;height:24px;color:var(--accent-light)}
    .nav-badge{font-size:.65rem;padding:2px 8px;border-radius:999px;background:rgba(99,102,241,.15);color:var(--accent-light);font-weight:600;letter-spacing:.5px}
    .nav-links{display:flex;align-items:center;gap:8px}
    .nav-link{padding:8px 16px;border-radius:var(--radius-xs);font-size:.85rem;color:var(--text-muted);transition:all .2s;display:flex;align-items:center;gap:6px}
    .nav-link:hover{color:var(--text);background:rgba(99,102,241,.08)}
    .nav-link i{width:15px;height:15px}
    .nav-cta{padding:8px 20px;border-radius:var(--radius-xs);font-size:.85rem;font-weight:600;background:var(--accent);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s}
    .nav-cta:hover{background:#5558e6;transform:translateY(-1px);box-shadow:0 4px 16px rgba(99,102,241,.4)}
    .nav-cta i{width:15px;height:15px;color:#fff}

    /* Hero */
    .hero{text-align:center;padding:160px 24px 80px;max-width:800px;margin:0 auto}
    .hero-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:999px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);font-size:.8rem;color:var(--accent-lighter);margin-bottom:32px}
    .hero-badge .dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 8px rgba(34,197,94,.5);animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .hero h1{font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:24px}
    .hero h1 .gradient{background:linear-gradient(135deg,#818cf8,#a78bfa,#c084fc,#e879f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .hero-desc{color:var(--text-muted);font-size:1.2rem;max-width:600px;margin:0 auto 40px;line-height:1.7}
    .hero-actions{display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:48px}
    .btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:var(--radius-sm);font-size:.95rem;font-weight:600;text-decoration:none;transition:all .25s;cursor:pointer;border:none}
    .btn i{width:18px;height:18px}
    .btn-primary{background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;box-shadow:0 4px 20px rgba(99,102,241,.35)}
    .btn-primary:hover{box-shadow:0 8px 32px rgba(99,102,241,.5);transform:translateY(-2px);color:#fff}
    .btn-secondary{border:1px solid var(--border-hover);color:var(--accent-lightest);background:transparent}
    .btn-secondary:hover{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.5);color:#fff}
    .hero-stats{display:flex;justify-content:center;gap:48px;flex-wrap:wrap}
    .hero-stat{text-align:center}
    .hero-stat-value{font-size:1.8rem;font-weight:800;color:var(--accent-lighter)}
    .hero-stat-label{font-size:.8rem;color:var(--text-dim);margin-top:2px}

    /* Section layout */
    .section{padding:80px 24px}
    .section-inner{max-width:1100px;margin:0 auto}
    .section-header{text-align:center;margin-bottom:56px}
    .section-header h2{font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:700;margin-bottom:12px;letter-spacing:-.02em}
    .section-header p{color:var(--text-muted);font-size:1.05rem;max-width:560px;margin:0 auto}
    .section-label{display:inline-flex;align-items:center;gap:6px;font-size:.75rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--accent-light);margin-bottom:16px}
    .section-label i{width:14px;height:14px}

    /* Install Section */
    .install{background:rgba(15,15,25,.6);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
    .install-inner{max-width:720px;margin:0 auto}
    .install-tabs{display:flex;gap:4px;margin-bottom:20px;background:rgba(30,30,46,.5);border-radius:var(--radius-xs);padding:4px;border:1px solid var(--border);flex-wrap:wrap}
    .install-tab{padding:8px 18px;border-radius:6px;font-size:.82rem;font-weight:500;color:var(--text-dim);cursor:pointer;transition:all .2s;border:none;background:none;flex:1;text-align:center}
    .install-tab:hover{color:var(--text-muted)}
    .install-tab.active{background:rgba(99,102,241,.15);color:var(--accent-lightest);box-shadow:0 1px 4px rgba(0,0,0,.2)}
    .install-code{position:relative;background:rgba(10,10,20,.8);border:1px solid var(--border);border-radius:var(--radius-sm);padding:20px 24px;font-family:'SF Mono',Monaco,Consolas,monospace;font-size:.9rem;color:var(--accent-lightest);overflow-x:auto}
    .install-code .comment{color:var(--text-dimmer)}
    .install-code .cmd{color:#22c55e}
    .install-copy{position:absolute;top:12px;right:12px;background:rgba(99,102,241,.15);border:1px solid var(--border);border-radius:6px;padding:6px 10px;cursor:pointer;color:var(--text-muted);font-size:.75rem;display:flex;align-items:center;gap:4px;transition:all .2s}
    .install-copy:hover{background:rgba(99,102,241,.25);color:var(--text)}
    .install-copy i{width:13px;height:13px}
    .install-panel{display:none}
    .install-panel.active{display:block}

    /* Feature cards */
    .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
    .feature-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:32px 28px;transition:all .3s;backdrop-filter:blur(10px)}
    .feature-card:hover{border-color:var(--border-hover);transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.3)}
    .feature-icon{width:48px;height:48px;border-radius:12px;background:rgba(99,102,241,.1);display:flex;align-items:center;justify-content:center;margin-bottom:16px}
    .feature-icon i{width:24px;height:24px;color:var(--accent-lighter)}
    .feature-card h3{font-size:1.05rem;font-weight:600;margin-bottom:8px;color:var(--accent-lightest)}
    .feature-card p{font-size:.85rem;color:var(--text-dim);line-height:1.65}
    .feature-tag{display:inline-block;font-size:.7rem;padding:2px 10px;border-radius:999px;background:rgba(99,102,241,.08);color:var(--accent-light);margin-top:12px;font-weight:500}

    /* Platform grid */
    .platforms-section{background:rgba(15,15,25,.4)}
    .platform-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}
    .platform-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);transition:all .3s;cursor:default}
    .platform-card:hover{border-color:var(--border-hover);background:var(--surface-hover);transform:translateY(-2px)}
    .platform-card i{width:28px;height:28px;color:var(--accent-lighter)}
    .platform-card span{font-size:.78rem;color:var(--text-muted);font-weight:500}
    .platform-card .p-status{font-size:.65rem;color:var(--green);font-weight:600}

    /* API Reference */
    .api-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
    .api-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:24px;transition:all .3s}
    .api-card:hover{border-color:var(--border-hover)}
    .api-card-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .api-card-head i{width:20px;height:20px;color:var(--accent-lighter)}
    .api-card h3{font-size:.95rem;font-weight:600;color:var(--accent-lightest)}
    .api-card p{font-size:.8rem;color:var(--text-dim);margin-bottom:10px;line-height:1.5}
    .api-endpoint{font-family:'SF Mono',Monaco,Consolas,monospace;font-size:.75rem;color:var(--accent-light);background:rgba(99,102,241,.08);padding:4px 10px;border-radius:4px;display:inline-block}
    .api-method{font-size:.65rem;font-weight:700;padding:2px 6px;border-radius:3px;margin-right:4px}
    .api-method.get{color:#22c55e;background:rgba(34,197,94,.1)}
    .api-method.post{color:#3b82f6;background:rgba(59,130,246,.1)}
    .api-method.put{color:#f59e0b;background:rgba(245,158,11,.1)}
    .api-method.delete{color:#ef4444;background:rgba(239,68,68,.1)}

    /* Architecture */
    .arch-section{background:rgba(15,15,25,.6);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
    .arch-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
    .arch-card{text-align:center;padding:28px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);transition:all .3s}
    .arch-card:hover{border-color:var(--border-hover);transform:translateY(-2px)}
    .arch-card i{width:32px;height:32px;color:var(--accent-lighter);margin-bottom:12px}
    .arch-card h4{font-size:.9rem;font-weight:600;color:var(--accent-lightest);margin-bottom:6px}
    .arch-card p{font-size:.75rem;color:var(--text-dim);line-height:1.5}

    /* Stats bar */
    .stats-bar{display:flex;justify-content:center;gap:56px;padding:48px 24px;flex-wrap:wrap}
    .stat-item{text-align:center}
    .stat-value{font-size:2.2rem;font-weight:800;background:linear-gradient(135deg,var(--accent-light),var(--accent-lighter));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .stat-label{font-size:.8rem;color:var(--text-dim);margin-top:4px}

    /* Testimonial */
    .testimonial-section{background:rgba(15,15,25,.4)}
    .testimonial-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
    .testimonial{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;transition:all .3s}
    .testimonial:hover{border-color:var(--border-hover)}
    .testimonial-text{font-size:.9rem;color:var(--text-muted);line-height:1.7;margin-bottom:16px;font-style:italic}
    .testimonial-author{display:flex;align-items:center;gap:10px}
    .testimonial-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-lighter));display:flex;align-items:center;justify-content:center}
    .testimonial-avatar i{width:18px;height:18px;color:#fff}
    .testimonial-name{font-size:.82rem;font-weight:600;color:var(--text)}
    .testimonial-role{font-size:.72rem;color:var(--text-dim)}

    /* CTA */
    .cta-section{text-align:center;padding:100px 24px}
    .cta-section h2{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;margin-bottom:16px;letter-spacing:-.02em}
    .cta-section p{color:var(--text-muted);font-size:1.1rem;max-width:500px;margin:0 auto 36px}

    /* Footer */
    .footer{border-top:1px solid var(--border);padding:60px 24px 32px}
    .footer-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr repeat(3,1fr);gap:48px}
    .footer-brand{display:flex;flex-direction:column;gap:12px}
    .footer-brand-name{display:flex;align-items:center;gap:8px;font-weight:700;font-size:1rem}
    .footer-brand-name i{width:20px;height:20px;color:var(--accent-light)}
    .footer-brand p{font-size:.82rem;color:var(--text-dim);line-height:1.6;max-width:280px}
    .footer-col h4{font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:16px}
    .footer-col a{display:block;font-size:.82rem;color:var(--text-dim);padding:4px 0;transition:color .2s}
    .footer-col a:hover{color:var(--accent-light)}
    .footer-bottom{max-width:1100px;margin:32px auto 0;padding-top:24px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    .footer-bottom p{font-size:.75rem;color:var(--text-dimmer)}
    .footer-socials{display:flex;gap:12px}
    .footer-socials a{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--border);color:var(--text-dim);transition:all .2s}
    .footer-socials a:hover{border-color:var(--border-hover);color:var(--accent-light);background:rgba(99,102,241,.08)}
    .footer-socials a i{width:15px;height:15px}

    /* Responsive */
    @media(max-width:900px){
      .features-grid{grid-template-columns:repeat(2,1fr)}
      .arch-grid{grid-template-columns:repeat(2,1fr)}
      .api-grid{grid-template-columns:1fr}
      .testimonial-grid{grid-template-columns:1fr}
      .footer-inner{grid-template-columns:1fr 1fr}
    }
    @media(max-width:600px){
      .features-grid{grid-template-columns:1fr}
      .arch-grid{grid-template-columns:1fr 1fr}
      .hero-stats{gap:24px}
      .stats-bar{gap:24px}
      .platform-grid{grid-template-columns:repeat(3,1fr)}
      .nav-links .nav-link span{display:none}
      .footer-inner{grid-template-columns:1fr}
    }
  </style>
</head>
<body>
  <div class="bg"></div>
  <div class="grid-bg"></div>
  <div class="page">

  <!-- Navigation -->
  <nav class="nav">
    <div class="nav-inner">
      <div class="nav-brand">
        <i data-lucide="brain-circuit"></i>
        NexusMind
        <span class="nav-badge">BETA</span>
      </div>
      <div class="nav-links">
        <a href="https://github.com/morningstarnasser/Nexusmindai" class="nav-link" target="_blank"><i data-lucide="book-open"></i> <span>Docs</span></a>
        <a href="https://github.com/morningstarnasser/Nexusmindai" class="nav-link" target="_blank"><i data-lucide="github"></i> <span>GitHub</span></a>
        <a href="https://github.com/morningstarnasser/Nexusmindai" class="nav-cta" target="_blank"><i data-lucide="star"></i> Star on GitHub</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="hero">
    <div class="hero-badge">
      <span class="dot"></span>
      v1.0.0 &mdash; System Online &mdash; Uptime: ${uptimeStr}
    </div>
    <h1>The AI that <span class="gradient">actually orchestrates things.</span></h1>
    <p class="hero-desc">Deploy autonomous AI agents across 12+ messaging platforms. One codebase. One command. Infinite possibilities.</p>
    <div class="hero-actions">
      <a href="https://github.com/morningstarnasser/Nexusmindai" class="btn btn-primary" target="_blank"><i data-lucide="github"></i> Get Started</a>
      <a href="https://github.com/morningstarnasser/Nexusmindai#readme" class="btn btn-secondary" target="_blank"><i data-lucide="book-open"></i> Documentation</a>
    </div>
    <div class="hero-stats">
      <div class="hero-stat"><div class="hero-stat-value">12+</div><div class="hero-stat-label">Platforms</div></div>
      <div class="hero-stat"><div class="hero-stat-value">6</div><div class="hero-stat-label">API Modules</div></div>
      <div class="hero-stat"><div class="hero-stat-value">${memMB}MB</div><div class="hero-stat-label">Memory</div></div>
      <div class="hero-stat"><div class="hero-stat-value">AES-256</div><div class="hero-stat-label">Encrypted</div></div>
    </div>
  </section>

  <!-- Install -->
  <section class="section install">
    <div class="install-inner">
      <div class="section-header">
        <div class="section-label"><i data-lucide="terminal"></i> Quick Start</div>
        <h2>Works everywhere. Deploys anything.</h2>
        <p>Get NexusMind running in seconds with one command.</p>
      </div>
      <div class="install-tabs">
        <button class="install-tab active" onclick="switchTab('npm')">npm</button>
        <button class="install-tab" onclick="switchTab('clone')">Git Clone</button>
        <button class="install-tab" onclick="switchTab('docker')">Docker</button>
        <button class="install-tab" onclick="switchTab('oneliner')">One-liner</button>
      </div>
      <div id="tab-npm" class="install-panel active">
        <div class="install-code">
          <button class="install-copy" onclick="copyCode('npm')"><i data-lucide="clipboard"></i> Copy</button>
          <span class="comment"># Install and run NexusMind</span><br>
          <span class="cmd">npx</span> create-nexusmind@latest my-agents<br>
          <span class="cmd">cd</span> my-agents<br>
          <span class="cmd">npm</span> run dev
        </div>
      </div>
      <div id="tab-clone" class="install-panel">
        <div class="install-code">
          <button class="install-copy" onclick="copyCode('clone')"><i data-lucide="clipboard"></i> Copy</button>
          <span class="comment"># Clone and setup</span><br>
          <span class="cmd">git</span> clone https://github.com/morningstarnasser/Nexusmindai.git<br>
          <span class="cmd">cd</span> Nexusmindai<br>
          <span class="cmd">npm</span> install && npm run build<br>
          <span class="cmd">npm</span> run dev
        </div>
      </div>
      <div id="tab-docker" class="install-panel">
        <div class="install-code">
          <button class="install-copy" onclick="copyCode('docker')"><i data-lucide="clipboard"></i> Copy</button>
          <span class="comment"># Run with Docker</span><br>
          <span class="cmd">docker</span> compose up -d
        </div>
      </div>
      <div id="tab-oneliner" class="install-panel">
        <div class="install-code">
          <button class="install-copy" onclick="copyCode('oneliner')"><i data-lucide="clipboard"></i> Copy</button>
          <span class="comment"># Works everywhere. Installs everything.</span><br>
          <span class="cmd">curl</span> -fsSL https://nexusmind.dev/install.sh | bash
        </div>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="section">
    <div class="section-inner">
      <div class="section-header">
        <div class="section-label"><i data-lucide="sparkles"></i> Core Features</div>
        <h2>Everything you need to build AI agents</h2>
        <p>A complete platform for creating, deploying, and orchestrating autonomous AI agents at scale.</p>
      </div>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon"><i data-lucide="bot"></i></div>
          <h3>Agent Management</h3>
          <p>Create, configure, and deploy AI agents with custom personalities, skills, and platform bindings. Hot-reload without downtime.</p>
          <span class="feature-tag">Multi-Agent</span>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i data-lucide="git-branch"></i></div>
          <h3>Workflow Engine</h3>
          <p>Design complex multi-step workflows with conditional branching, parallel execution, and automatic error recovery.</p>
          <span class="feature-tag">DAG Pipelines</span>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i data-lucide="brain"></i></div>
          <h3>Tiered Memory</h3>
          <p>Three-layer memory architecture: short-term context, long-term vector storage, and episodic recall with semantic search.</p>
          <span class="feature-tag">Vector + SQL</span>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i data-lucide="heart-pulse"></i></div>
          <h3>Heartbeat Engine</h3>
          <p>Autonomous task scheduling with 5 heartbeat types: Pulse, Rhythm, Cycle, Season, and Reactive event triggers.</p>
          <span class="feature-tag">Cron + Events</span>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i data-lucide="shield-check"></i></div>
          <h3>Security Layer</h3>
          <p>AES-256 encryption, role-based access control, audit logging, rate limiting, and input sanitization built in.</p>
          <span class="feature-tag">Enterprise-Ready</span>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i data-lucide="puzzle"></i></div>
          <h3>Skill System</h3>
          <p>Modular plugin architecture for agent capabilities. Install, remove, and compose skills at runtime without restarts.</p>
          <span class="feature-tag">Hot-Pluggable</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Platforms -->
  <section class="section platforms-section">
    <div class="section-inner">
      <div class="section-header">
        <div class="section-label"><i data-lucide="radio-tower"></i> Platform Adapters</div>
        <h2>One codebase. Every platform.</h2>
        <p>Deploy your agents to any messaging platform through our unified gateway protocol.</p>
      </div>
      <div class="platform-grid">
        <div class="platform-card"><i data-lucide="send"></i><span>Telegram</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="message-circle"></i><span>Discord</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="hash"></i><span>Slack</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="phone"></i><span>WhatsApp</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="users"></i><span>Teams</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="grid-3x3"></i><span>Matrix</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="terminal"></i><span>IRC</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="mail"></i><span>Email</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="smartphone"></i><span>SMS</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="lock"></i><span>Signal</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="webhook"></i><span>Webhook</span><span class="p-status">Active</span></div>
        <div class="platform-card"><i data-lucide="plus-circle"></i><span>Custom</span><span class="p-status">SDK</span></div>
      </div>
    </div>
  </section>

  <!-- Architecture -->
  <section class="section arch-section">
    <div class="section-inner">
      <div class="section-header">
        <div class="section-label"><i data-lucide="layers"></i> Architecture</div>
        <h2>Built for scale. Designed for developers.</h2>
        <p>A modular, event-driven architecture that separates concerns and scales independently.</p>
      </div>
      <div class="arch-grid">
        <div class="arch-card">
          <i data-lucide="radio-tower"></i>
          <h4>Gateway</h4>
          <p>Protocol-agnostic message routing with 12+ adapter implementations</p>
        </div>
        <div class="arch-card">
          <i data-lucide="cpu"></i>
          <h4>Core Engine</h4>
          <p>Agent lifecycle management, event bus, and orchestration layer</p>
        </div>
        <div class="arch-card">
          <i data-lucide="database"></i>
          <h4>Memory</h4>
          <p>Short-term, long-term, and episodic memory with Neon PostgreSQL</p>
        </div>
        <div class="arch-card">
          <i data-lucide="activity"></i>
          <h4>Monitoring</h4>
          <p>Real-time metrics, health checks, WebSocket streaming</p>
        </div>
      </div>
    </div>
  </section>

  <!-- API Reference -->
  <section class="section">
    <div class="section-inner">
      <div class="section-header">
        <div class="section-label"><i data-lucide="code"></i> API Reference</div>
        <h2>RESTful API with real-time WebSocket</h2>
        <p>Full CRUD operations for every resource, plus live event streaming.</p>
      </div>
      <div class="api-grid">
        <div class="api-card">
          <div class="api-card-head"><i data-lucide="bot"></i><h3>Agents</h3></div>
          <p>Create, list, update, and delete AI agents. Configure personality, skills, and platform bindings.</p>
          <span class="api-endpoint"><span class="api-method get">GET</span>/api/agents</span>
          <span class="api-endpoint"><span class="api-method post">POST</span>/api/agents</span>
        </div>
        <div class="api-card">
          <div class="api-card-head"><i data-lucide="git-branch"></i><h3>Workflows</h3></div>
          <p>Design and execute multi-step agent workflows with conditional logic and error handling.</p>
          <span class="api-endpoint"><span class="api-method get">GET</span>/api/workflows</span>
          <span class="api-endpoint"><span class="api-method post">POST</span>/api/workflows</span>
        </div>
        <div class="api-card">
          <div class="api-card-head"><i data-lucide="puzzle"></i><h3>Skills</h3></div>
          <p>Manage modular agent capabilities. Install, remove, and query available skills.</p>
          <span class="api-endpoint"><span class="api-method get">GET</span>/api/skills</span>
          <span class="api-endpoint"><span class="api-method post">POST</span>/api/skills</span>
        </div>
        <div class="api-card">
          <div class="api-card-head"><i data-lucide="brain"></i><h3>Memory</h3></div>
          <p>Store, search, and retrieve agent memories across short-term and long-term tiers.</p>
          <span class="api-endpoint"><span class="api-method get">GET</span>/api/memory/stats</span>
          <span class="api-endpoint"><span class="api-method post">POST</span>/api/memory/store</span>
        </div>
        <div class="api-card">
          <div class="api-card-head"><i data-lucide="heart-pulse"></i><h3>Heartbeat</h3></div>
          <p>Monitor and control the autonomous task scheduler. View jobs, execution history, and metrics.</p>
          <span class="api-endpoint"><span class="api-method get">GET</span>/api/heartbeat</span>
          <span class="api-endpoint"><span class="api-method put">PUT</span>/api/heartbeat/jobs</span>
        </div>
        <div class="api-card">
          <div class="api-card-head"><i data-lucide="activity"></i><h3>System</h3></div>
          <p>Health monitoring, system metrics, backup management, and configuration.</p>
          <span class="api-endpoint"><span class="api-method get">GET</span>/api/system/health</span>
          <span class="api-endpoint"><span class="api-method post">POST</span>/api/system/backup</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <div class="stats-bar">
    <div class="stat-item"><div class="stat-value">TypeScript</div><div class="stat-label">100% Type-Safe</div></div>
    <div class="stat-item"><div class="stat-value">Node 22</div><div class="stat-label">Runtime</div></div>
    <div class="stat-item"><div class="stat-value">Express</div><div class="stat-label">API Framework</div></div>
    <div class="stat-item"><div class="stat-value">Next.js</div><div class="stat-label">Dashboard</div></div>
  </div>

  <!-- Testimonials -->
  <section class="section testimonial-section">
    <div class="section-inner">
      <div class="section-header">
        <div class="section-label"><i data-lucide="quote"></i> What developers say</div>
        <h2>Built by developers, for developers</h2>
      </div>
      <div class="testimonial-grid">
        <div class="testimonial">
          <p class="testimonial-text">"NexusMind replaced our entire chatbot infrastructure. One TypeScript codebase now powers agents on Telegram, Discord, and Slack simultaneously."</p>
          <div class="testimonial-author">
            <div class="testimonial-avatar"><i data-lucide="user"></i></div>
            <div><div class="testimonial-name">Platform Engineer</div><div class="testimonial-role">AI Startup</div></div>
          </div>
        </div>
        <div class="testimonial">
          <p class="testimonial-text">"The heartbeat engine is a game-changer. Our agents now proactively monitor systems and take action without human intervention."</p>
          <div class="testimonial-author">
            <div class="testimonial-avatar"><i data-lucide="user"></i></div>
            <div><div class="testimonial-name">DevOps Lead</div><div class="testimonial-role">SaaS Company</div></div>
          </div>
        </div>
        <div class="testimonial">
          <p class="testimonial-text">"Memory tiers with semantic search mean our agents actually remember context. The vector search integration with Neon is blazing fast."</p>
          <div class="testimonial-author">
            <div class="testimonial-avatar"><i data-lucide="user"></i></div>
            <div><div class="testimonial-name">ML Engineer</div><div class="testimonial-role">Research Lab</div></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta-section">
    <h2>Ready to deploy your first agent?</h2>
    <p>Get NexusMind running in under 60 seconds. Open source, MIT licensed, forever free.</p>
    <div class="hero-actions">
      <a href="https://github.com/morningstarnasser/Nexusmindai" class="btn btn-primary" target="_blank"><i data-lucide="rocket"></i> Get Started Free</a>
      <a href="https://github.com/morningstarnasser/Nexusmindai" class="btn btn-secondary" target="_blank"><i data-lucide="github"></i> View on GitHub</a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="footer-brand-name"><i data-lucide="brain-circuit"></i> NexusMind</div>
        <p>Autonomous AI Agent Orchestration Platform. Deploy intelligent agents across 12+ messaging platforms from a single unified system.</p>
      </div>
      <div class="footer-col">
        <h4>Product</h4>
        <a href="https://github.com/morningstarnasser/Nexusmindai#features">Features</a>
        <a href="https://github.com/morningstarnasser/Nexusmindai#api-reference">API Reference</a>
        <a href="https://github.com/morningstarnasser/Nexusmindai#deployment">Deployment</a>
        <a href="https://github.com/morningstarnasser/Nexusmindai/releases">Changelog</a>
      </div>
      <div class="footer-col">
        <h4>Resources</h4>
        <a href="https://github.com/morningstarnasser/Nexusmindai#readme">Documentation</a>
        <a href="https://github.com/morningstarnasser/Nexusmindai#quick-start">Quick Start</a>
        <a href="https://github.com/morningstarnasser/Nexusmindai/tree/main/src">Source Code</a>
        <a href="https://github.com/morningstarnasser/Nexusmindai/blob/main/LICENSE">MIT License</a>
      </div>
      <div class="footer-col">
        <h4>Community</h4>
        <a href="https://github.com/morningstarnasser/Nexusmindai/issues">Issues</a>
        <a href="https://github.com/morningstarnasser/Nexusmindai/pulls">Pull Requests</a>
        <a href="https://github.com/morningstarnasser/Nexusmindai/discussions">Discussions</a>
        <a href="https://github.com/morningstarnasser/Nexusmindai/graphs/contributors">Contributors</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 NexusMind. Built with TypeScript, Express &amp; Next.js. MIT Licensed.</p>
      <div class="footer-socials">
        <a href="https://github.com/morningstarnasser/Nexusmindai" target="_blank" title="GitHub"><i data-lucide="github"></i></a>
        <a href="https://github.com/morningstarnasser" target="_blank" title="Profile"><i data-lucide="user-circle"></i></a>
      </div>
    </div>
  </footer>

  </div><!-- .page -->

  <script>
    lucide.createIcons();

    function switchTab(tab) {
      document.querySelectorAll('.install-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.install-panel').forEach(p => p.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
      lucide.createIcons();
    }

    function copyCode(tab) {
      const codes = {
        npm: 'npx create-nexusmind@latest my-agents && cd my-agents && npm run dev',
        clone: 'git clone https://github.com/morningstarnasser/Nexusmindai.git && cd Nexusmindai && npm install && npm run build && npm run dev',
        docker: 'docker compose up -d',
        oneliner: 'curl -fsSL https://nexusmind.dev/install.sh | bash'
      };
      navigator.clipboard.writeText(codes[tab] || '');
      const btn = event.target.closest('.install-copy');
      const orig = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="check"></i> Copied!';
      lucide.createIcons();
      setTimeout(() => { btn.innerHTML = orig; lucide.createIcons(); }, 2000);
    }

    // Smooth scroll animation for elements
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .platform-card, .arch-card, .api-card, .testimonial').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
  </script>
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
