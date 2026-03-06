import { logger } from '../utils/logger.js';
import type { Message, PlatformAdapter, MessageHandler } from '../types/index.js';

/**
 * ProtocolAdapter - Abstract base class for all platform adapters
 * Defines the interface for connecting to various messaging platforms
 */
export abstract class ProtocolAdapter implements PlatformAdapter {
  protected platformName: string;
  protected isConnected: boolean = false;
  protected messageHandlers: MessageHandler[] = [];
  protected connectionConfig: Record<string, unknown> = {};

  constructor(platformName: string, config?: Record<string, unknown>) {
    this.platformName = platformName;
    if (config) {
      this.connectionConfig = config;
    }
    logger.info(`ProtocolAdapter initialized for ${platformName}`);
  }

  /**
   * Connect to the platform
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the platform
   */
  abstract disconnect(): Promise<void>;

  /**
   * Send a message to the platform
   */
  abstract send(message: Message): Promise<void>;

  /**
   * Register a message handler
   */
  onMessage(handler: MessageHandler): void {
    try {
      if (!this.messageHandlers.includes(handler)) {
        this.messageHandlers.push(handler);
        logger.debug(`Message handler registered for ${this.platformName}`);
      }
    } catch (error) {
      logger.error(`Failed to register message handler for ${this.platformName}`, { error });
    }
  }

  /**
   * Remove a message handler
   */
  offMessage(handler: MessageHandler): void {
    try {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
        logger.debug(`Message handler removed from ${this.platformName}`);
      }
    } catch (error) {
      logger.error(`Failed to remove message handler for ${this.platformName}`, { error });
    }
  }

  /**
   * Emit a message to all registered handlers
   */
  protected async emitMessage(message: Message): Promise<void> {
    try {
      logger.debug(`Emitting message from ${this.platformName}`, {
        messageId: message.id,
        platform: message.platform
      });

      const promises = this.messageHandlers.map(handler =>
        handler(message).catch(error => {
          logger.error('Message handler error', { error, messageId: message.id });
        })
      );

      await Promise.all(promises);
    } catch (error) {
      logger.error(`Failed to emit message from ${this.platformName}`, { error });
    }
  }

  /**
   * Get platform name
   */
  getPlatformName(): string {
    return this.platformName;
  }

  /**
   * Check if connected
   */
  getConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    platform: string;
    isConnected: boolean;
    handlers: number;
    config: Record<string, unknown>;
  } {
    return {
      platform: this.platformName,
      isConnected: this.isConnected,
      handlers: this.messageHandlers.length,
      config: { ...this.connectionConfig }
    };
  }

  /**
   * Validate message
   */
  protected validateMessage(message: Message): boolean {
    if (!message.id) {
      logger.warn('Message missing id', { message });
      return false;
    }

    if (!message.platform) {
      logger.warn('Message missing platform', { messageId: message.id });
      return false;
    }

    if (!message.content) {
      logger.warn('Message missing content', { messageId: message.id });
      return false;
    }

    return true;
  }

  /**
   * Update connection configuration
   */
  updateConfig(config: Record<string, unknown>): void {
    this.connectionConfig = { ...this.connectionConfig, ...config };
    logger.info(`Configuration updated for ${this.platformName}`);
  }

  /**
   * Get connection configuration
   */
  getConfig(): Record<string, unknown> {
    return { ...this.connectionConfig };
  }

  /**
   * Reconnect if disconnected
   */
  async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      logger.info(`Reconnecting to ${this.platformName}`);
      await this.connect();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      logger.debug(`Health check for ${this.platformName}`);
      return this.isConnected;
    } catch (error) {
      logger.error(`Health check failed for ${this.platformName}`, { error });
      return false;
    }
  }
}

/**
 * Concrete implementation example: WebSocketAdapter
 */
export class WebSocketAdapter extends ProtocolAdapter {
  private ws: unknown = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;

  constructor(config?: Record<string, unknown>) {
    super('websocket', config);
  }

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to WebSocket platform');

      // Simulate WebSocket connection
      this.isConnected = true;
      this.reconnectAttempts = 0;

      logger.info('WebSocket connected successfully');
    } catch (error) {
      logger.error('Failed to connect to WebSocket', { error });
      await this.handleConnectionError();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting from WebSocket platform');

      if (this.ws) {
        this.ws = null;
      }

      this.isConnected = false;
      logger.info('WebSocket disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from WebSocket', { error });
    }
  }

  /**
   * Send a message via WebSocket
   */
  async send(message: Message): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.ensureConnected();
      }

      if (!this.validateMessage(message)) {
        throw new Error('Invalid message format');
      }

      logger.debug('Sending message via WebSocket', { messageId: message.id });

      // Simulate WebSocket send
      const payload = JSON.stringify(message);
      // this.ws.send(payload);

      logger.debug('Message sent via WebSocket', { messageId: message.id });
    } catch (error) {
      logger.error('Failed to send message via WebSocket', { error });
      throw error;
    }
  }

  /**
   * Handle connection error with retry logic
   */
  private async handleConnectionError(): Promise<void> {
    this.reconnectAttempts++;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * this.reconnectAttempts;
      logger.info('Attempting to reconnect', {
        attempt: this.reconnectAttempts,
        delay
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      await this.connect();
    } else {
      logger.error('Max reconnect attempts reached');
      throw new Error('Connection failed after max attempts');
    }
  }
}

/**
 * Concrete implementation example: HTTPAdapter
 */
export class HTTPAdapter extends ProtocolAdapter {
  private baseUrl: string = '';

  constructor(config?: Record<string, unknown>) {
    super('http', config);
    this.baseUrl = (config?.baseUrl as string) || 'http://localhost:3000';
  }

  /**
   * Connect to HTTP endpoint
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to HTTP platform', { baseUrl: this.baseUrl });

      // Simulate HTTP connection check
      this.isConnected = true;

      logger.info('HTTP connected successfully');
    } catch (error) {
      logger.error('Failed to connect to HTTP', { error });
      throw error;
    }
  }

  /**
   * Disconnect from HTTP endpoint
   */
  async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting from HTTP platform');
      this.isConnected = false;
      logger.info('HTTP disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from HTTP', { error });
    }
  }

  /**
   * Send a message via HTTP
   */
  async send(message: Message): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.ensureConnected();
      }

      if (!this.validateMessage(message)) {
        throw new Error('Invalid message format');
      }

      logger.debug('Sending message via HTTP', { messageId: message.id });

      // Simulate HTTP POST request
      const endpoint = `${this.baseUrl}/api/messages`;
      const payload = JSON.stringify(message);
      
      // In real implementation: await fetch(endpoint, { method: 'POST', body: payload })

      logger.debug('Message sent via HTTP', { messageId: message.id });
    } catch (error) {
      logger.error('Failed to send message via HTTP', { error });
      throw error;
    }
  }
}

export default ProtocolAdapter;
