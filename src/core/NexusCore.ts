import EventEmitter from 'events';
import { logger } from '../utils/logger.js';
import { AgentManager } from './AgentManager.js';
import { EventBus } from './EventBus.js';
import { TaskQueue } from './TaskQueue.js';
import { ConfigManager } from './ConfigManager.js';
import { ModelRouter } from './ModelRouter.js';
import { Gateway } from '../gateway/Gateway.js';
import type { 
  NexusCoreConfig, 
  SystemStatus, 
  CoreEvent,
  HeartbeatMetrics 
} from '../types/index.js';

/**
 * NexusCore - Main orchestrator for the NexusMind system
 * Initializes and manages all subsystems including Gateway, AgentManager,
 * HeartbeatEngine, MemoryManager, SkillManager, EventBus, and API
 */
export class NexusCore extends EventEmitter {
  private agentManager: AgentManager;
  private eventBus: EventBus;
  private taskQueue: TaskQueue;
  private configManager: ConfigManager;
  private modelRouter: ModelRouter;
  private gateway: Gateway;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private startTime: Date | null = null;
  private systemMetrics: HeartbeatMetrics = {
    uptime: 0,
    agentsActive: 0,
    tasksProcessed: 0,
    eventsEmitted: 0,
    errorCount: 0,
    memoryUsage: 0,
    lastHeartbeat: new Date()
  };

  constructor(config: NexusCoreConfig) {
    super();
    
    logger.info('Initializing NexusCore with configuration', { 
      configPath: config.configPath 
    });

    try {
      this.configManager = new ConfigManager(config.configPath);
      this.eventBus = new EventBus({
        maxHistory: config.eventHistorySize || 1000,
        asyncHandlers: true
      });
      this.taskQueue = new TaskQueue({
        maxConcurrent: config.maxConcurrentTasks || 10,
        enableRetry: config.enableRetry || true
      });
      this.modelRouter = new ModelRouter({
        providers: config.modelProviders || []
      });
      this.agentManager = new AgentManager(
        this.configManager,
        this.eventBus,
        this.modelRouter
      );
      this.gateway = new Gateway(
        this.agentManager,
        this.eventBus,
        config.gatewayConfig
      );

      this.setupEventListeners();
      logger.info('NexusCore initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize NexusCore', { error });
      throw error;
    }
  }

  /**
   * Start the NexusCore system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('NexusCore is already running');
      return;
    }

    try {
      logger.info('Starting NexusCore');
      this.startTime = new Date();
      
      // Initialize and start subsystems
      await this.configManager.load();
      await this.agentManager.initialize();
      await this.gateway.start();
      await this.taskQueue.start();
      
      // Start heartbeat engine
      this.startHeartbeat(5000); // 5 second interval
      
      this.isRunning = true;
      this.emit('core:started');
      logger.info('NexusCore started successfully');
    } catch (error) {
      logger.error('Failed to start NexusCore', { error });
      this.systemMetrics.errorCount++;
      throw error;
    }
  }

  /**
   * Stop the NexusCore system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('NexusCore is not running');
      return;
    }

    try {
      logger.info('Stopping NexusCore');
      
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      await this.gateway.stop();
      await this.taskQueue.stop();
      await this.agentManager.shutdown();
      
      this.isRunning = false;
      this.emit('core:stopped');
      logger.info('NexusCore stopped successfully');
    } catch (error) {
      logger.error('Failed to stop NexusCore', { error });
      this.systemMetrics.errorCount++;
      throw error;
    }
  }

  /**
   * Get current system status
   */
  getStatus(): SystemStatus {
    const uptime = this.startTime 
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    return {
      isRunning: this.isRunning,
      uptime,
      startTime: this.startTime,
      agents: this.agentManager.listAgents().length,
      pendingTasks: this.taskQueue.getQueueSize(),
      metrics: {
        ...this.systemMetrics,
        uptime,
        agentsActive: this.agentManager.getActiveAgentCount(),
        memoryUsage: process.memoryUsage().heapUsed
      }
    };
  }

  /**
   * Get the event bus instance
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get the agent manager instance
   */
  getAgentManager(): AgentManager {
    return this.agentManager;
  }

  /**
   * Get the task queue instance
   */
  getTaskQueue(): TaskQueue {
    return this.taskQueue;
  }

  /**
   * Get the model router instance
   */
  getModelRouter(): ModelRouter {
    return this.modelRouter;
  }

  /**
   * Get the gateway instance
   */
  getGateway(): Gateway {
    return this.gateway;
  }

  /**
   * Start the heartbeat engine
   */
  private startHeartbeat(intervalMs: number): void {
    this.heartbeatInterval = setInterval(() => {
      const status = this.getStatus();
      
      this.systemMetrics = {
        ...this.systemMetrics,
        lastHeartbeat: new Date(),
        memoryUsage: process.memoryUsage().heapUsed,
        agentsActive: status.agents
      };

      this.eventBus.emit('system:heartbeat', {
        timestamp: new Date(),
        metrics: this.systemMetrics,
        status
      });

      logger.debug('Heartbeat emitted', { metrics: this.systemMetrics });
    }, intervalMs);
  }

  /**
   * Setup internal event listeners
   */
  private setupEventListeners(): void {
    // Listen to agent manager events
    this.agentManager.on('agent:created', (event) => {
      this.eventBus.emit('agent:created', event);
    });

    this.agentManager.on('agent:deleted', (event) => {
      this.eventBus.emit('agent:deleted', event);
    });

    this.agentManager.on('agent:error', (event) => {
      this.systemMetrics.errorCount++;
      this.eventBus.emit('agent:error', event);
    });

    // Listen to task queue events
    this.taskQueue.on('task:completed', (event) => {
      this.systemMetrics.tasksProcessed++;
      this.eventBus.emit('task:completed', event);
    });

    this.taskQueue.on('task:failed', (event) => {
      this.systemMetrics.errorCount++;
      this.eventBus.emit('task:failed', event);
    });

    // Listen to event bus events
    this.eventBus.on('*', (..._args: unknown[]) => {
      this.systemMetrics.eventsEmitted++;
    });
  }
}

export default NexusCore;
