import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import type { AgentConfig, SystemConfig } from '../types/index.js';

/**
 * ConfigManager - YAML config loading with env var interpolation
 * Loads default.yaml and agent configs, supports hot-reload and validation
 */
export class ConfigManager {
  private configPath: string;
  private systemConfig: SystemConfig = {};
  private agentConfigs: Map<string, AgentConfig> = new Map();
  private fileWatchers: Map<string, NodeJS.Timeout> = new Map();
  private lastModified: Map<string, number> = new Map();

  constructor(configPath: string) {
    this.configPath = configPath;
    logger.info('ConfigManager initialized', { configPath });
  }

  /**
   * Load configuration files
   */
  async load(): Promise<void> {
    try {
      logger.info('Loading configuration');

      // Load default configuration
      const defaultConfigPath = path.join(this.configPath, 'default.yaml');
      await this.loadSystemConfig(defaultConfigPath);

      logger.info('Configuration loaded successfully');
    } catch (error) {
      logger.error('Failed to load configuration', { error });
      throw error;
    }
  }

  /**
   * Load system configuration from YAML
   */
  private async loadSystemConfig(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Simple YAML parsing (in production, use a proper YAML parser)
      const config = this.parseYaml(content);
      this.systemConfig = config as SystemConfig;
      this.lastModified.set(filePath, Date.now());

      logger.debug('System config loaded', { filePath });
    } catch (error) {
      logger.warn('Could not load system config, using defaults', { filePath, error });
      this.systemConfig = this.getDefaultSystemConfig();
    }
  }

  /**
   * Load an agent configuration from YAML
   */
  async loadAgentConfig(filePath: string): Promise<AgentConfig | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const config = this.parseYaml(content) as AgentConfig;
      
      if (!config.id) {
        logger.warn('Agent config missing id', { filePath });
        return null;
      }

      // Interpolate environment variables
      this.interpolateEnvVars(config);
      
      this.lastModified.set(filePath, Date.now());
      logger.debug('Agent config loaded', { filePath, agentId: config.id });

      return config;
    } catch (error) {
      logger.error('Failed to load agent config', { filePath, error });
      return null;
    }
  }

  /**
   * Parse YAML content (simple implementation)
   */
  private parseYaml(content: string): Record<string, unknown> {
    const lines = content.split('\n');
    const result: Record<string, unknown> = {};
    let currentSection: Record<string, unknown> = result;
    const stack: Array<{ key: string; obj: Record<string, unknown> }> = [];

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        continue;
      }

      const indentation = line.match(/^(\s*)/)?.[1].length || 0;
      const content = line.trim();

      // Handle key: value pairs
      if (content.includes(':')) {
        const [key, value] = content.split(':').map(s => s.trim());
        const parsedValue = this.parseValue(value);

        // Adjust nesting based on indentation
        while (stack.length > 0 && indentation <= stack[stack.length - 1].key.length * 2) {
          stack.pop();
        }

        if (stack.length > 0) {
          currentSection = stack[stack.length - 1].obj;
        } else {
          currentSection = result;
        }

        currentSection[key] = parsedValue;
      }
    }

    return result;
  }

  /**
   * Parse a YAML value
   */
  private parseValue(value: string): unknown {
    value = value.trim();

    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (!isNaN(Number(value))) return Number(value);
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }

    return value;
  }

  /**
   * Interpolate environment variables in config
   */
  private interpolateEnvVars(config: unknown): void {
    if (typeof config === 'string') {
      const match = config.match(/\$\{([^}]+)\}/g);
      if (match) {
        for (const placeholder of match) {
          const envVar = placeholder.slice(2, -1);
          const value = process.env[envVar] || '';
          return value as unknown;
        }
      }
    } else if (typeof config === 'object' && config !== null) {
      for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
        if (typeof value === 'string') {
          const match = value.match(/\$\{([^}]+)\}/);
          if (match) {
            const envVar = match[1];
            (config as Record<string, unknown>)[key] = process.env[envVar] || value;
          }
        } else if (typeof value === 'object') {
          this.interpolateEnvVars(value);
        }
      }
    }
  }

  /**
   * Get configuration value
   */
  get(key: string, defaultValue?: unknown): unknown {
    const parts = key.split('.');
    let current: unknown = this.systemConfig;

    for (const part of parts) {
      if (typeof current === 'object' && current !== null && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return defaultValue !== undefined ? defaultValue : null;
      }
    }

    return current;
  }

  /**
   * Set configuration value
   */
  set(key: string, value: unknown): void {
    const parts = key.split('.');
    let current: unknown = this.systemConfig;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in (current as Record<string, unknown>))) {
        (current as Record<string, unknown>)[part] = {};
      }
      current = (current as Record<string, unknown>)[part];
    }

    (current as Record<string, unknown>)[parts[parts.length - 1]] = value;
  }

  /**
   * Get default system configuration
   */
  private getDefaultSystemConfig(): SystemConfig {
    return {
      app: {
        name: 'NexusMind',
        version: '1.0.0'
      },
      agent: {
        configDir: './config/agents'
      },
      api: {
        port: 3000
      },
      logging: {
        level: 'info'
      }
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config: unknown): boolean {
    try {
      if (typeof config !== 'object' || config === null) {
        return false;
      }

      logger.debug('Configuration validated');
      return true;
    } catch (error) {
      logger.error('Configuration validation failed', { error });
      return false;
    }
  }

  /**
   * Watch a config file for changes
   */
  watchFile(filePath: string, callback: () => void): void {
    try {
      const watcher = setInterval(async () => {
        try {
          const stats = await fs.stat(filePath);
          const lastMod = this.lastModified.get(filePath) || 0;

          if (stats.mtimeMs > lastMod) {
            logger.info('Config file changed, reloading', { filePath });
            if (filePath.includes('agent')) {
              const config = await this.loadAgentConfig(filePath);
              if (config) {
                this.agentConfigs.set(config.id, config);
              }
            } else {
              await this.loadSystemConfig(filePath);
            }
            callback();
          }
        } catch (error) {
          logger.error('Error watching config file', { filePath, error });
        }
      }, 5000); // Check every 5 seconds

      this.fileWatchers.set(filePath, watcher);
      logger.info('Started watching config file', { filePath });
    } catch (error) {
      logger.error('Failed to watch config file', { filePath, error });
    }
  }

  /**
   * Stop watching a file
   */
  unwatchFile(filePath: string): void {
    const watcher = this.fileWatchers.get(filePath);
    if (watcher) {
      clearInterval(watcher);
      this.fileWatchers.delete(filePath);
      logger.info('Stopped watching config file', { filePath });
    }
  }

  /**
   * Stop all file watchers
   */
  stopAllWatchers(): void {
    for (const [filePath, watcher] of this.fileWatchers.entries()) {
      clearInterval(watcher);
    }
    this.fileWatchers.clear();
    logger.info('Stopped all config file watchers');
  }

  /**
   * Get all system configuration
   */
  getSystemConfig(): SystemConfig {
    return { ...this.systemConfig };
  }

  /**
   * Get all agent configurations
   */
  getAgentConfigs(): Map<string, AgentConfig> {
    return new Map(this.agentConfigs);
  }
}

export default ConfigManager;
