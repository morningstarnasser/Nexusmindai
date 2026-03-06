import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig, Message } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * WebhookAdapter - Generic webhook handler for receiving and sending messages
 * Required npm packages: express (if using as server), node-fetch
 */
export class WebhookAdapter extends ProtocolAdapter {
  private webhookUrl: string;
  private callbackUrl: string;
  private apiKey: string;
  private server: any;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 5000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 50;
  private lastMessageTime = 0;
  private port: number;

  constructor(config: AdapterConfig) {
    super('webhook', config as Record<string, unknown>);
    this.webhookUrl = config.credentials?.webhookUrl || '';
    this.callbackUrl = config.credentials?.callbackUrl || '';
    this.apiKey = config.credentials?.apiKey || '';
    this.port = config.credentials?.port || 3000;

    if (!this.webhookUrl && !this.callbackUrl) {
      throw new Error('Webhook adapter requires webhookUrl or callbackUrl in credentials');
    }
  }

  async connect(): Promise<void> {
    try {
      if (this.callbackUrl) {
        await this.setupWebhookServer();
      }

      this.reconnectAttempts = 0;
      logger.info('Webhook adapter connected successfully');
      this.isConnected = true;
      this.flushMessageQueue();
    } catch (error) {
      logger.error('Failed to connect to Webhook:', error);
      this.handleConnectionError();
    }
  }

  private async setupWebhookServer(): Promise<void> {
    try {
      const express = await import('express');
      const app = express.default();

      app.use(express.default.json());

      // Receive webhook callbacks
      app.post('/webhook', async (req: any, res: any) => {
        try {
          const message = this.convertFromWebhookMessage(req.body);

          await this.emitMessage(message as any);

          res.json({ status: 'received' });
        } catch (error) {
          logger.error('Error processing webhook:', error);
          res.status(400).json({ error: 'Invalid webhook format' });
        }
      });

      // Health check endpoint
      app.get('/health', (req: any, res: any) => {
        res.json({ status: 'ok' });
      });

      this.server = app.listen(this.port, () => {
        logger.info(`Webhook server listening on port ${this.port}`);
      });

      // Register callback URL with webhook provider if needed
      if (this.webhookUrl && this.apiKey) {
        await this.registerWebhook();
      }
    } catch (error) {
      logger.error('Failed to setup webhook server:', error);
      throw error;
    }
  }

  private async registerWebhook(): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          url: this.callbackUrl,
          events: ['message.received', 'message.delivered'],
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook registration failed: ${response.statusText}`);
      }

      logger.info('Webhook registered successfully');
    } catch (error) {
      logger.warn('Could not register webhook:', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.server) {
        this.server.close();
      }
      logger.info('Webhook adapter disconnected');
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from Webhook:', error);
    }
  }

  async send(message: Message): Promise<void> {
    const channelId = message.channel || message.userId;
    if (!this.isConnected || !this.webhookUrl) {
      return;
    }

    try {
      await this.applyRateLimit();

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-NexusMind-MessageID': message.id,
          'X-NexusMind-Platform': 'webhook',
        },
        body: JSON.stringify({
          to: channelId,
          id: message.id,
          text: message.content,
          timestamp: message.timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.statusText}`);
      }

      logger.debug(`Message sent via webhook to ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message via webhook to ${channelId}:`, error);
      throw error;
    }
  }

  async sendMessage(channelId: string, message: NexusMessage): Promise<void> {
    if (!this.isConnected || !this.webhookUrl) {
      this.messageQueue.set(channelId, [
        ...(this.messageQueue.get(channelId) || []),
        message,
      ]);
      return;
    }

    try {
      await this.applyRateLimit();

      const webhookMessage = this.convertToWebhookMessage(message);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-NexusMind-MessageID': message.id,
          'X-NexusMind-Platform': 'webhook',
        },
        body: JSON.stringify({
          to: channelId,
          ...webhookMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.statusText}`);
      }

      logger.debug(`Message sent via webhook to ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message via webhook to ${channelId}:`, error);
      throw error;
    }
  }

  private convertToWebhookMessage(message: NexusMessage): any {
    const msg = message as any;
    const payload: any = {
      id: message.id,
      text: msg.text || message.content || '',
      timestamp: message.timestamp,
      sender: msg.sender || message.author,
    };
    const mediaList = msg.media || message.attachments;

    if (mediaList && mediaList.length > 0) {
      payload.attachments = (mediaList as any[]).map((media: any) => ({
        url: media.url,
        type: media.type,
        name: media.name,
        size: media.size,
      }));
    }

    if (message.metadata) {
      payload.metadata = message.metadata;
    }

    return payload;
  }

  private convertFromWebhookMessage(webhookData: any): NexusMessage {
    const senderData = webhookData.sender || {
      id: webhookData.from || 'unknown',
      username: webhookData.from || 'Unknown',
      displayName: webhookData.senderName || webhookData.from || 'Unknown',
    };

    return {
      id: webhookData.id || `webhook-${Date.now()}`,
      platform: (webhookData.platform || 'webhook') as any,
      channel: { id: webhookData.channelId || webhookData.from || 'unknown', name: '', type: 'text', isPrivate: false } as any,
      author: {
        id: senderData.id || 'unknown',
        username: senderData.username || 'Unknown',
        displayName: senderData.displayName || 'Unknown',
        roles: [],
        permissions: [],
        isBot: false,
        isModerator: false,
      },
      content: webhookData.text || webhookData.message || '',
      contentType: 'text' as any,
      attachments: webhookData.attachments || webhookData.media || [],
      embeds: [],
      components: [],
      reactions: [],
      mentions: { users: [], roles: [], channels: [] },
      processed: false,
      timestamp: webhookData.timestamp ? new Date(webhookData.timestamp) : new Date(),
      metadata: webhookData.metadata || {
        messageType: 'webhook',
        source: webhookData.source,
        customData: webhookData.customData,
      },
    } as NexusMessage;
  }

  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;
    if (timeSinceLastMessage < this.rateLimitDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastMessage)
      );
    }
    this.lastMessageTime = Date.now();
  }

  private async flushMessageQueue(): Promise<void> {
    for (const [channelId, messages] of this.messageQueue.entries()) {
      for (const message of messages) {
        try {
          await this.sendMessage(channelId, message);
        } catch (error) {
          logger.error(`Failed to flush queued message for channel ${channelId}:`, error);
        }
      }
      this.messageQueue.delete(channelId);
    }
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.warn(
        `Webhook reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max Webhook reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
