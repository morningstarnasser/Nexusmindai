import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from './config.js';
import { createLogger } from './logger.js';
import type { AgentConfig, AgentWorkspace, AgentSession, SessionMessage } from './types.js';

const log = createLogger('agents');

export class AgentManager {
  private sessions: Map<string, AgentSession> = new Map();

  get agentsDir(): string {
    return path.join(config.dir, 'agents');
  }

  private ensureAgentDir(agentId: string): string {
    const agentDir = path.join(this.agentsDir, agentId);
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }
    const memoryDir = path.join(agentDir, 'memory');
    const skillsDir = path.join(agentDir, 'skills');
    const sessionsDir = path.join(agentDir, 'sessions');
    for (const dir of [memoryDir, skillsDir, sessionsDir]) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
    return agentDir;
  }

  create(opts: {
    id: string;
    name: string;
    emoji?: string;
    model?: string;
    heartbeatEnabled?: boolean;
    heartbeatEvery?: string;
  }): AgentConfig {
    const defaults = config.get<any>('agents.defaults');
    const agentDir = this.ensureAgentDir(opts.id);

    const agentConfig: AgentConfig = {
      name: opts.name,
      emoji: opts.emoji || '🤖',
      workspace: agentDir,
      model: opts.model || defaults.model,
      heartbeat: {
        enabled: opts.heartbeatEnabled ?? defaults.heartbeat.enabled,
        every: opts.heartbeatEvery || defaults.heartbeat.every,
      },
      channels: [],
      createdAt: new Date().toISOString(),
    };

    config.set(`agents.list.${opts.id}`, agentConfig);

    const soulContent = `# ${opts.emoji} ${opts.name}\n\nYou are ${opts.name}, a helpful AI assistant powered by NexusMind.\n\n## Personality\n- Be helpful, concise, and friendly\n- Use the user's preferred language\n- Be proactive about suggesting improvements\n`;

    const heartbeatContent = `# Heartbeat Instructions\n\nOn each heartbeat tick:\n1. Check if there are any pending reminders or tasks\n2. If nothing needs attention, respond with HEARTBEAT_OK\n3. Only send messages when there is something genuinely important\n`;

    const userContent = `# User Profile\n\n- Name: (set with nexusmind agents set-identity)\n- Language: auto-detect\n- Timezone: auto-detect\n`;

    fs.writeFileSync(path.join(agentDir, 'SOUL.md'), soulContent);
    fs.writeFileSync(path.join(agentDir, 'HEARTBEAT.md'), heartbeatContent);
    fs.writeFileSync(path.join(agentDir, 'USER.md'), userContent);

    log.info(`Agent created: ${opts.id} (${opts.name} ${opts.emoji})`);
    return agentConfig;
  }

  delete(agentId: string): boolean {
    const agents = config.get<Record<string, AgentConfig>>('agents.list') || {};
    if (!(agentId in agents)) return false;
    
    const agentDir = path.join(this.agentsDir, agentId);
    if (fs.existsSync(agentDir)) {
      fs.rmSync(agentDir, { recursive: true, force: true });
    }

    delete agents[agentId];
    config.set('agents.list', agents);
    log.info(`Agent deleted: ${agentId}`);
    return true;
  }

  list(): Array<{ id: string } & AgentConfig> {
    const agents = config.get<Record<string, AgentConfig>>('agents.list') || {};
    return Object.entries(agents).map(([id, cfg]) => ({ id, ...cfg }));
  }

  get(agentId: string): (AgentConfig & { id: string }) | null {
    const agents = config.get<Record<string, AgentConfig>>('agents.list') || {};
    if (!(agentId in agents)) return null;
    return { id: agentId, ...agents[agentId] };
  }

  getWorkspace(agentId: string): AgentWorkspace | null {
    const agent = this.get(agentId);
    if (!agent) return null;
    const dir = agent.workspace;

    const readFile = (name: string) => {
      const p = path.join(dir, name);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : undefined;
    };

    const memoryDir = path.join(dir, 'memory');
    const memoryFiles = fs.existsSync(memoryDir)
      ? fs.readdirSync(memoryDir).filter(f => f.endsWith('.md')).map(f =>
          fs.readFileSync(path.join(memoryDir, f), 'utf-8')
        )
      : [];

    return {
      path: dir,
      soul: readFile('SOUL.md'),
      heartbeat: readFile('HEARTBEAT.md'),
      user: readFile('USER.md'),
      tools: readFile('TOOLS.md'),
      memory: memoryFiles,
    };
  }

  bind(agentId: string, channel: string): boolean {
    const agents = config.get<Record<string, AgentConfig>>('agents.list') || {};
    if (!(agentId in agents)) return false;
    if (!agents[agentId].channels.includes(channel)) {
      agents[agentId].channels.push(channel);
      config.set('agents.list', agents);
      log.info(`Agent ${agentId} bound to channel: ${channel}`);
    }
    return true;
  }

  unbind(agentId: string, channel: string): boolean {
    const agents = config.get<Record<string, AgentConfig>>('agents.list') || {};
    if (!(agentId in agents)) return false;
    agents[agentId].channels = agents[agentId].channels.filter(c => c !== channel);
    config.set('agents.list', agents);
    return true;
  }

  getOrCreateSession(agentId: string, channelKey: string): AgentSession {
    const sessionKey = `${agentId}:${channelKey}`;
    let session = this.sessions.get(sessionKey);
    if (!session) {
      session = {
        id: randomUUID(),
        agentId,
        channelKey,
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      this.sessions.set(sessionKey, session);
    }
    return session;
  }

  addMessage(agentId: string, channelKey: string, msg: SessionMessage): void {
    const session = this.getOrCreateSession(agentId, channelKey);
    session.messages.push(msg);
    session.lastActivity = new Date();
  }

  getStats(): { total: number; active: number; totalMessages: number; totalSessions: number } {
    const agents = this.list();
    let totalMessages = 0;
    let totalSessions = 0;
    for (const [, session] of this.sessions) {
      totalSessions++;
      totalMessages += session.messages.length;
    }
    return {
      total: agents.length,
      active: agents.filter(a => a.channels.length > 0).length,
      totalMessages,
      totalSessions,
    };
  }

  resolveAgent(platform: string, channelId: string): (AgentConfig & { id: string }) | null {
    const agents = this.list();
    if (agents.length > 0) {
      return agents[0];
    }
    return null;
  }
}

export const agentManager = new AgentManager();
