import EventEmitter from 'events';
import { logger } from '../utils/logger.js';
import { AgentRuntime } from './AgentRuntime.js';
import { ConfigManager } from './ConfigManager.js';
import { EventBus } from './EventBus.js';
import { ModelRouter } from './ModelRouter.js';
import type { 
  Agent, 
  AgentConfig, 
  AgentStatus,
  AgentEvent
} from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * AgentManager - Manages agent lifecycle and state
 * Handles creation, deletion, updating, and tracking of agents
 */
export class AgentManager extends EventEmitter {
  private agents: Map<string, AgentRuntime> = new Map();
  private agentConfigs: Map<string, AgentConfig> = new Map();
  private configManager: ConfigManager;
  private eventBus: EventBus;
  private modelRouter: ModelRouter;
  private agentStatusMap: Map<string, AgentStatus> = new Map();

  constructor(
    configManager: ConfigManager,
    eventBus: EventBus,
    modelRouter: ModelRouter
  ) {
    super();
    this.configManager = configManager;
    this.eventBus = eventBus;
    this.modelRouter = modelRouter;
    logger.info('AgentManager initialized');
  }

  /**
   * Initialize the agent manager and load all agent configs
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing AgentManager');
      
      // Load agent configs from configured directory
      const agentConfigDir = this.configManager.get('agent.configDir') || './config/agents';
      await this.loadAgentConfigs(agentConfigDir);
      
      logger.info(`Loaded ${this.agentConfigs.size} agent configurations`);
    } catch (error) {
      logger.error('Failed to initialize AgentManager', { error });
      throw error;
    }
  }

  /**
   * Load agent configurations from YAML files
   */
  private async loadAgentConfigs(dirPath: string): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      for (const file of yamlFiles) {
        const filePath = path.join(dirPath, file);
        const config = await this.configManager.loadAgentConfig(filePath);
        
        if (config && config.id) {
          this.agentConfigs.set(config.id, config);
          logger.debug(`Loaded agent config: ${config.id}`, { file });
        }
      }
    } catch (error) {
      logger.warn('Failed to load agent configs from directory', { dirPath, error });
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(agentId: string, config?: AgentConfig): Promise<AgentRuntime> {
    try {
      if (this.agents.has(agentId)) {
        throw new Error(`Agent ${agentId} already exists`);
      }

      const agentConfig = config || this.agentConfigs.get(agentId);
      if (!agentConfig) {
        throw new Error(`No configuration found for agent ${agentId}`);
      }

      const agentRuntime = new AgentRuntime(
        agentConfig,
        this.modelRouter,
        this.eventBus
      );

      await agentRuntime.initialize();
      this.agents.set(agentId, agentRuntime);
      this.agentStatusMap.set(agentId, 'initialized');

      const event: AgentEvent = {
        type: 'agent:created',
        agentId,
        timestamp: new Date(),
        data: { config: agentConfig }
      };

      this.emit('agent:created', event);
      this.eventBus.emit('agent:created', event);

      logger.info(`Agent created: ${agentId}`, { config: agentConfig });
      return agentRuntime;
    } catch (error) {
      logger.error(`Failed to create agent ${agentId}`, { error });
      const event: AgentEvent = {
        type: 'agent:error',
        agentId,
        timestamp: new Date(),
        data: { error: String(error) }
      };
      this.emit('agent:error', event);
      throw error;
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      await agent.shutdown();
      this.agents.delete(agentId);
      this.agentStatusMap.delete(agentId);

      const event: AgentEvent = {
        type: 'agent:deleted',
        agentId,
        timestamp: new Date(),
        data: {}
      };

      this.emit('agent:deleted', event);
      this.eventBus.emit('agent:deleted', event);

      logger.info(`Agent deleted: ${agentId}`);
    } catch (error) {
      logger.error(`Failed to delete agent ${agentId}`, { error });
      throw error;
    }
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): AgentRuntime | undefined {
    return this.agents.get(agentId);
  }

  /**
   * List all agents
   */
  listAgents(): AgentRuntime[] {
    return Array.from(this.agents.values());
  }

  /**
   * List agent IDs
   */
  listAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Update an agent's configuration
   */
  async updateAgent(agentId: string, updates: Partial<AgentConfig>): Promise<void> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const currentConfig = this.agentConfigs.get(agentId);
      if (!currentConfig) {
        throw new Error(`No configuration found for agent ${agentId}`);
      }

      const updatedConfig = { ...currentConfig, ...updates };
      this.agentConfigs.set(agentId, updatedConfig);
      
      await agent.updateConfig(updatedConfig);

      const event: AgentEvent = {
        type: 'agent:updated',
        agentId,
        timestamp: new Date(),
        data: { updates }
      };

      this.emit('agent:updated', event);
      this.eventBus.emit('agent:updated', event);

      logger.info(`Agent updated: ${agentId}`, { updates });
    } catch (error) {
      logger.error(`Failed to update agent ${agentId}`, { error });
      throw error;
    }
  }

  /**
   * Get the status of an agent
   */
  getAgentStatus(agentId: string): AgentStatus | undefined {
    return this.agentStatusMap.get(agentId);
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(): Record<string, AgentStatus> {
    const statuses: Record<string, AgentStatus> = {};
    this.agentStatusMap.forEach((status, id) => {
      statuses[id] = status;
    });
    return statuses;
  }

  /**
   * Get the count of active agents
   */
  getActiveAgentCount(): number {
    let count = 0;
    this.agentStatusMap.forEach(status => {
      if (status === 'running' || status === 'idle') {
        count++;
      }
    });
    return count;
  }

  /**
   * Update agent status
   */
  setAgentStatus(agentId: string, status: AgentStatus): void {
    this.agentStatusMap.set(agentId, status);
    this.eventBus.emit('agent:status_changed', {
      agentId,
      status,
      timestamp: new Date()
    });
  }

  /**
   * Shutdown all agents
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down all agents');
      
      const shutdownPromises = Array.from(this.agents.values()).map(agent =>
        agent.shutdown().catch(error => {
          logger.error('Error shutting down agent', { error });
        })
      );

      await Promise.all(shutdownPromises);
      this.agents.clear();
      this.agentStatusMap.clear();

      logger.info('All agents shut down successfully');
    } catch (error) {
      logger.error('Failed to shutdown agents', { error });
      throw error;
    }
  }
}

export default AgentManager;
