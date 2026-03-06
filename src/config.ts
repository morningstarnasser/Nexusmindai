import fs from 'fs';
import path from 'path';
import os from 'os';
import { createLogger } from './logger.js';
import type { NexusMindConfig } from './types.js';

const log = createLogger('config');

const NEXUSMIND_DIR = process.env.NEXUSMIND_HOME || path.join(os.homedir(), '.nexusmind');
const CONFIG_FILE = path.join(NEXUSMIND_DIR, 'nexusmind.json');

const DEFAULT_CONFIG: NexusMindConfig = {
  gateway: {
    port: 4848,
    host: '0.0.0.0',
    mode: 'local',
  },
  agents: {
    defaults: {
      model: 'anthropic/claude-sonnet-4-6',
      heartbeat: { enabled: true, every: '30m' },
      maxConcurrent: 4,
    },
    list: {},
  },
  channels: {
    webhook: { enabled: true, secret: '' },
  },
  models: {
    providers: {
      anthropic: { apiKey: '', enabled: true },
      openai: { apiKey: '', enabled: false },
      google: { apiKey: '', enabled: false },
    },
    default: 'anthropic/claude-sonnet-4-6',
  },
};

export class ConfigManager {
  private config: NexusMindConfig;
  private configPath: string;

  constructor() {
    this.configPath = CONFIG_FILE;
    this.config = this.load();
  }

  get dir(): string {
    return NEXUSMIND_DIR;
  }

  get filePath(): string {
    return this.configPath;
  }

  private ensureDir(): void {
    if (!fs.existsSync(NEXUSMIND_DIR)) {
      fs.mkdirSync(NEXUSMIND_DIR, { recursive: true });
      log.info(`Created NexusMind directory: ${NEXUSMIND_DIR}`);
    }
  }

  private load(): NexusMindConfig {
    this.ensureDir();
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const loaded = JSON.parse(raw);
        return { ...DEFAULT_CONFIG, ...loaded };
      } catch (e) {
        log.error('Failed to load config, using defaults');
        return { ...DEFAULT_CONFIG };
      }
    }
    this.config = { ...DEFAULT_CONFIG };
    this.save();
    return this.config;
  }

  save(): void {
    this.ensureDir();
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  get<T = any>(key: string): T {
    const parts = key.split('.');
    let value: any = this.config;
    for (const part of parts) {
      if (value === undefined || value === null) return undefined as T;
      value = value[part];
    }
    return value as T;
  }

  set(key: string, value: any): void {
    const parts = key.split('.');
    let obj: any = this.config;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in obj)) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    this.save();
    log.info(`Config updated: ${key}`);
  }

  getAll(): NexusMindConfig {
    return { ...this.config };
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
    log.info('Config reset to defaults');
  }
}

export const config = new ConfigManager();
