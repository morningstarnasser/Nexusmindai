import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { config } from './config.js';
import { agentManager } from './agents.js';
import { HeartbeatEngine } from './heartbeat.js';
import { createLogger } from './logger.js';
import type { SystemStatus } from './types.js';

const log = createLogger('gateway');

export class Gateway {
  private app: express.Express;
  private server: http.Server;
  private wss: WebSocketServer;
  private heartbeat: HeartbeatEngine;
  private clients: Set<WebSocket> = new Set();
  private startedAt: Date = new Date();
  private messagesTotal: number = 0;

  constructor() {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.heartbeat = new HeartbeatEngine(async (agentId) => {
      await this.handleHeartbeat(agentId);
    });

    // Serve dashboard static files (works from both src/ and dist/)
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const dashboardPath = path.join(__dirname, '..', 'dashboard');
    const dashboardPathAlt = path.join(process.cwd(), 'dashboard');
    this.app.use(express.static(dashboardPath));
    this.app.use(express.static(dashboardPathAlt));

    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      log.info(`WebSocket connected from ${req.socket.remoteAddress}`);
      this.clients.add(ws);

      ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          await this.handleWebSocketMessage(ws, msg);
        } catch (e) {
          ws.send(JSON.stringify({ ok: false, error: 'Invalid message' }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        log.info('WebSocket disconnected');
      });

      ws.send(JSON.stringify({
        type: 'welcome',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      }));
    });
  }

  private async handleWebSocketMessage(ws: WebSocket, msg: any): Promise<void> {
    switch (msg.type) {
      case 'message': {
        const { agentId, content, channel } = msg;
        const agent = agentId ? agentManager.get(agentId) : agentManager.list()[0];
        if (!agent) {
          ws.send(JSON.stringify({ type: 'error', error: 'No agent found' }));
          return;
        }

        this.messagesTotal++;
        const channelKey = channel || 'ws:direct';

        agentManager.addMessage(agent.id, channelKey, {
          role: 'user',
          content,
          timestamp: new Date(),
        });

        const response = `${agent.emoji} **${agent.name}**: I received your message. [AI model integration pending]`;

        agentManager.addMessage(agent.id, channelKey, {
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        });

        ws.send(JSON.stringify({
          type: 'response',
          agentId: agent.id,
          agentName: agent.name,
          content: response,
          timestamp: new Date().toISOString(),
        }));

        this.broadcast({
          type: 'activity',
          event: 'message',
          agentId: agent.id,
          channel: channelKey,
        }, ws);
        break;
      }

      case 'status':
        ws.send(JSON.stringify({ type: 'status', data: this.getStatus() }));
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  private broadcast(data: any, exclude?: WebSocket): void {
    const msg = JSON.stringify(data);
    for (const client of this.clients) {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  private async handleHeartbeat(agentId: string): Promise<void> {
    log.info(`Running heartbeat for agent ${agentId}`);
    this.broadcast({
      type: 'heartbeat',
      agentId,
      timestamp: new Date().toISOString(),
    });
  }

  private setupRoutes(): void {
    // Health check (root level for Railway/deployment)
    this.app.get('/health', (req, res) => {
      res.json({ ok: true, uptime: process.uptime() });
    });

    // System
    this.app.get('/api/v1/status', (req, res) => {
      res.json({ ok: true, data: this.getStatus() });
    });

    this.app.get('/api/v1/health', (req, res) => {
      res.json({ ok: true, uptime: process.uptime() });
    });

    // Agents
    this.app.get('/api/v1/agents', (req, res) => {
      const agents = agentManager.list();
      res.json({ ok: true, data: agents });
    });

    this.app.post('/api/v1/agents', (req, res) => {
      try {
        const { id, name, emoji, model } = req.body;
        if (!id || !name) {
          res.status(400).json({ ok: false, error: 'id and name required' });
          return;
        }
        const existing = agentManager.get(id);
        if (existing) {
          res.status(409).json({ ok: false, error: 'Agent exists' });
          return;
        }
        const agent = agentManager.create({ id, name, emoji, model });
        res.json({ ok: true, data: { id, ...agent } });
        this.broadcast({ type: 'activity', event: 'agent.created', agentId: id });
      } catch (e: any) {
        res.status(500).json({ ok: false, error: e.message });
      }
    });

    this.app.get('/api/v1/agents/:id', (req, res) => {
      const agent = agentManager.get(req.params.id);
      if (!agent) {
        res.status(404).json({ ok: false, error: 'Not found' });
        return;
      }
      const workspace = agentManager.getWorkspace(req.params.id);
      res.json({ ok: true, data: { ...agent, workspace } });
    });

    this.app.delete('/api/v1/agents/:id', (req, res) => {
      const ok = agentManager.delete(req.params.id);
      res.json({ ok });
    });

    this.app.post('/api/v1/agents/:id/message', async (req, res) => {
      const agent = agentManager.get(req.params.id);
      if (!agent) {
        res.status(404).json({ ok: false, error: 'Not found' });
        return;
      }
      const { content, channel } = req.body;
      if (!content) {
        res.status(400).json({ ok: false, error: 'content required' });
        return;
      }
      this.messagesTotal++;
      const channelKey = channel || 'api:direct';

      agentManager.addMessage(agent.id, channelKey, {
        role: 'user', content, timestamp: new Date(),
      });

      const response = `${agent.emoji} ${agent.name}: Message received.`;

      agentManager.addMessage(agent.id, channelKey, {
        role: 'assistant', content: response, timestamp: new Date(),
      });

      res.json({ ok: true, data: { response, agentId: agent.id } });
    });

    // Config
    this.app.get('/api/v1/config', (req, res) => {
      const cfg = config.getAll();
      res.json({ ok: true, data: cfg });
    });

    // API Keys
    this.app.get('/api/v1/config/keys', (req, res) => {
      const keys = config.get<Record<string, string>>('apiKeys') || {};
      const masked: Record<string, string> = {};
      for (const [provider, key] of Object.entries(keys)) {
        if (key && key.length > 8) {
          masked[provider] = key.slice(0, 4) + '****' + key.slice(-4);
        } else if (key) {
          masked[provider] = '****';
        }
      }
      res.json({ ok: true, data: masked });
    });

    this.app.put('/api/v1/config/keys', (req, res) => {
      const keys = req.body;
      if (!keys || typeof keys !== 'object') {
        res.status(400).json({ ok: false, error: 'Invalid keys' });
        return;
      }
      const existing = config.get<Record<string, string>>('apiKeys') || {};
      for (const [provider, key] of Object.entries(keys)) {
        if (typeof key === 'string' && key.trim()) {
          existing[provider] = key.trim();
        }
      }
      config.set('apiKeys', existing);
      log.info(`API keys updated for: ${Object.keys(keys).join(', ')}`);
      res.json({ ok: true, message: 'Keys saved' });
    });

    // Heartbeat
    this.app.get('/api/v1/heartbeat', (req, res) => {
      res.json({ ok: true, data: this.heartbeat.getStatus() });
    });

    this.app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ ok: false, error: 'Not found' });
      } else {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const file = path.join(__dirname, '..', 'dashboard', 'index.html');
        const fileAlt = path.join(process.cwd(), 'dashboard', 'index.html');
        import('fs').then(fs => {
          const target = fs.existsSync(file) ? file : fileAlt;
          res.sendFile(target);
        });
      }
    });
  }

  getStatus(): SystemStatus {
    const agents = agentManager.list();
    const stats = agentManager.getStats();
    return {
      version: '0.1.0',
      uptime: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      startedAt: this.startedAt,
      agents: {
        total: agents.length,
        active: stats.active,
        list: agents.map(a => ({
          id: a.id,
          name: a.name,
          emoji: a.emoji,
          status: 'active',
          channels: a.channels,
          messageCount: 0,
        })),
      },
      gateway: {
        port: config.get<number>('gateway.port') || 4848,
        connections: this.clients.size,
        messagesTotal: this.messagesTotal,
      },
      heartbeat: {
        enabled: true,
        tasks: this.heartbeat.getStatus(),
      },
      memory: {
        sessionsCount: stats.totalSessions,
        totalMessages: stats.totalMessages,
      },
    };
  }

  async start(): Promise<void> {
    const port = Number(process.env.PORT) || config.get<number>('gateway.port') || 4848;
    const host = config.get<string>('gateway.host') || '0.0.0.0';

    return new Promise((resolve) => {
      this.server.listen(port, host, () => {
        const url = `http://localhost:${port}`;
        log.info(`NexusMind Gateway running on ${url}`);
        log.info(`   WebSocket: ws://${host}:${port}`);
        log.info(`   API: ${url}/api/v1/`);
        log.info(`   Dashboard: ${url}`);
        this.heartbeat.start();

        // Auto-open dashboard in browser (only locally, not on Railway/production)
        if (!process.env.RAILWAY_ENVIRONMENT && !process.env.PORT) {
          const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
          exec(`${cmd} ${url}`);
        }

        resolve();
      });
    });
  }

  stop(): void {
    this.heartbeat.stop();
    this.wss.close();
    this.server.close();
    log.info('Gateway stopped');
  }
}
