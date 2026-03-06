import { createLogger } from './logger.js';
import { agentManager } from './agents.js';
import type { HeartbeatTask } from './types.js';

const log = createLogger('heartbeat');

function parseInterval(every: string): number {
  const match = every.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 30 * 60 * 1000;
  const [, num, unit] = match;
  const n = parseInt(num);
  switch (unit) {
    case 's': return n * 1000;
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
    default: return 30 * 60 * 1000;
  }
}

export class HeartbeatEngine {
  private tasks: Map<string, ReturnType<typeof setInterval>> = new Map();
  private taskStatus: Map<string, HeartbeatTask> = new Map();
  private onHeartbeat: (agentId: string) => Promise<void>;

  constructor(onHeartbeat: (agentId: string) => Promise<void>) {
    this.onHeartbeat = onHeartbeat;
  }

  start(): void {
    const agents = agentManager.list();
    for (const agent of agents) {
      if (agent.heartbeat.enabled) {
        this.scheduleAgent(agent.id, agent.heartbeat.every);
      }
    }
    log.info(`Heartbeat engine started with ${this.tasks.size} tasks`);
  }

  scheduleAgent(agentId: string, every: string): void {
    this.unscheduleAgent(agentId);

    const interval = parseInterval(every);
    const task = setInterval(async () => {
      const status = this.taskStatus.get(agentId);
      if (status?.status === 'running') {
        log.warn(`Heartbeat for ${agentId} still running, skipping`);
        return;
      }

      this.taskStatus.set(agentId, {
        agentId,
        schedule: every,
        lastRun: new Date(),
        nextRun: new Date(Date.now() + interval),
        status: 'running',
        errorCount: status?.errorCount || 0,
      });

      try {
        await this.onHeartbeat(agentId);
        const s = this.taskStatus.get(agentId)!;
        s.status = 'idle';
        s.errorCount = 0;
        log.info(`Heartbeat completed for ${agentId}`);
      } catch (e) {
        const s = this.taskStatus.get(agentId)!;
        s.status = 'error';
        s.errorCount++;
        log.error(`Heartbeat failed for ${agentId}: ${e}`);
      }
    }, interval);

    this.tasks.set(agentId, task);
    this.taskStatus.set(agentId, {
      agentId,
      schedule: every,
      nextRun: new Date(Date.now() + interval),
      status: 'idle',
      errorCount: 0,
    });

    log.info(`Scheduled heartbeat for ${agentId}: every ${every}`);
  }

  unscheduleAgent(agentId: string): void {
    const existing = this.tasks.get(agentId);
    if (existing) {
      clearInterval(existing);
      this.tasks.delete(agentId);
      this.taskStatus.delete(agentId);
    }
  }

  stop(): void {
    for (const [id, task] of this.tasks) {
      clearInterval(task);
    }
    this.tasks.clear();
    this.taskStatus.clear();
    log.info('Heartbeat engine stopped');
  }

  getStatus(): HeartbeatTask[] {
    return Array.from(this.taskStatus.values());
  }
}
