import EventEmitter from 'events';
import { logger } from '../utils/logger.js';
import { MessageRouter } from './MessageRouter.js';
import { AgentManager } from '../core/AgentManager.js';
import { EventBus } from '../core/EventBus.js';
import type { 
  PlatformAdapter, 
  Message, 
  MessageResponse,
  GatewayConfig
} from '../types/index.js';

/**
 * Gateway - Main gateway for managing platform adapters
 * Routes messages to correct agents and sends responses back through correct platform
 */
export class Gateway extends EventEmitter {
  private adapters: Map<string, PlatformAdapter> = new Map();
  private messageRouter: MessageRouter;
  private agentManager: AgentManager;
  private eventBus: EventBus;
  private isRunning: boolean = false;
  private messageCount: number = 0;

  constructor(
    agentManager: AgentManager,
    eventBus: EventBus,
    config?: GatewayConfig
  ) {
    super();
    this.agentManager = agentManager;
    this.eventBus = eventBus;
    this.messageRouter = new MessageRouter();
    logger.info('Gateway initialized');
  }

  /**
   * Start the gateway
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting Gateway');
      
      // Connect all registered adapters
      for (const [name, adapter] of this.adapters.entries()) {
        await this.connectAdapter(adapter);
      }

      this.isRunning = true;
      this.emit('gateway:started');
      logger.info('Gateway started successfully');
    } catch (error) {
      logger.error('Failed to start Gateway', { error });
      throw error;
    }
  }

  /**
   * Stop the gateway
   */
  async stop(): Promise<void> {
    try {
      logger.info('Stopping Gateway');
      
      // Disconnect all adapters
      for (const [name, adapter] of this.adapters.entries()) {
        await this.disconnectAdapter(adapter);
      }

      this.isRunning = false;
      this.emit('gateway:stopped');
      logger.info('Gateway stopped successfully');
    } catch (error) {
      logger.error('Failed to stop Gateway', { error });
      throw error;
    }
  }

  /**
   * Register a platform adapter
   */
  registerAdapter(name: string, adapter: PlatformAdapter): void {
    try {
      this.adapters.set(name, adapter);
      logger.info(`Adapter registered: ${name}`);

      // Setup message listener if already running
      if (this.isRunning) {
        this.connectAdapter(adapter).catch(error => {
          logger.error(`Failed to connect adapter ${name}`, { error });
        });
      }
    } catch (error) {
      logger.error(`Failed to register adapter ${name}`, { error });
      throw error;
    }
  }

  /**
   * Unregister a platform adapter
   */
  async unregisterAdapter(name: string): Promise<void> {
    try {
      const adapter = this.adapters.get(name);
      if (!adapter) {
        throw new Error(`Adapter ${name} not found`);
      }

      if (this.isRunning) {
        await this.disconnectAdapter(adapter);
      }

      this.adapters.delete(name);
      logger.info(`Adapter unregistered: ${name}`);
    } catch (error) {
      logger.error(`Failed to unregister adapter ${name}`, { error });
      throw error;
    }
  }

  /**
   * Connect a platform adapter
   */
  private async connectAdapter(adapter: PlatformAdapter): Promise<void> {
    try {
      await adapter.connect();
      
      // Setup message handler
      adapter.onMessage(async (message: Message) => {
        await this.handleMessage(message);
      });

      logger.info(`Adapter connected: ${adapter.getPlatformName()}`);
    } catch (error) {
      logger.error(`Failed to connect adapter`, { error });
      throw error;
    }
  }

  /**
   * Disconnect a platform adapter
   */
  private async disconnectAdapter(adapter: PlatformAdapter): Promise<void> {
    try {
      await adapter.disconnect();
      logger.info(`Adapter disconnected: ${adapter.getPlatformName()}`);
    } catch (error) {
      logger.error(`Failed to disconnect adapter`, { error });
      throw error;
    }
  }

  /**
   * Handle incoming message from any platform
   */
  private async handleMessage(message: Message): Promise<void> {
    try {
      this.messageCount++;
      logger.debug(`Message received from ${message.platform}`, {
        messageId: message.id,
        userId: message.userId
      });

      this.eventBus.emit('message:incoming', {
        message,
        timestamp: new Date()
      });

      // Route message to appropriate agent
      const agentId = this.messageRouter.route(message);
      
      if (!agentId) {
        logger.warn('No agent found for message', {
          messageId: message.id,
          platform: message.platform
        });
        return;
      }

      const agent = this.agentManager.getAgent(agentId);
      if (!agent) {
        logger.error('Agent not found', { agentId });
        return;
      }

      // Process message with agent
      const response = await agent.processMessage(message);

      // Send response back through original platform
      await this.sendResponse(response, message.platform);

      this.eventBus.emit('message:processed_gateway', {
        messageId: message.id,
        agentId,
        timestamp: new Date()
      });

      logger.debug(`Message processed by agent ${agentId}`, {
        messageId: message.id
      });
    } catch (error) {
      logger.error('Failed to handle message', { error });
      this.eventBus.emit('gateway:error', {
        error: String(error),
        timestamp: new Date()
      });
    }
  }

  /**
   * Send a response through the appropriate adapter
   */
  private async sendResponse(response: MessageResponse, platform: string): Promise<void> {
    try {
      const adapter = this.adapters.get(platform);
      if (!adapter) {
        throw new Error(`Adapter for platform ${platform} not found`);
      }

      await adapter.send({
        id: response.id,
        platform,
        userId: 'user', // Would come from original message
        content: response.content,
        timestamp: response.timestamp,
        metadata: {
          agentId: response.agentId,
          originalMessageId: response.originalMessageId
        }
      });

      this.eventBus.emit('response:sent', {
        responseId: response.id,
        platform,
        timestamp: new Date()
      });

      logger.debug(`Response sent through ${platform}`, {
        responseId: response.id
      });
    } catch (error) {
      logger.error('Failed to send response', { error, platform });
      throw error;
    }
  }

  /**
   * Get registered adapters
   */
  getAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get an adapter by name
   */
  getAdapter(name: string): PlatformAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get gateway status
   */
  getStatus(): {
    isRunning: boolean;
    adapters: string[];
    messageCount: number;
  } {
    return {
      isRunning: this.isRunning,
      adapters: Array.from(this.adapters.keys()),
      messageCount: this.messageCount
    };
  }

  /**
   * Configure routing rule
   */
  configureRoute(
    platform: string,
    channel: string,
    agentId: string
  ): void {
    try {
      this.messageRouter.addRoute({
        platform,
        channel,
        agentId
      });

      logger.info('Route configured', {
        platform,
        channel,
        agentId
      });
    } catch (error) {
      logger.error('Failed to configure route', { error });
      throw error;
    }
  }

  /**
   * Reset routing rules
   */
  resetRoutes(): void {
    this.messageRouter.clear();
    logger.info('All routes cleared');
  }

  /**
   * Get routing table
   */
  getRoutingTable(): Array<{ platform: string; channel: string; agentId: string }> {
    return this.messageRouter.getRoutes();
  }
}

export default Gateway;
