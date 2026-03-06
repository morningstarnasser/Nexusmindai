import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * TeamsAdapter - Connects to Microsoft Teams via Bot Framework SDK
 * Required npm packages: botbuilder, botbuilder-teams
 */
export class TeamsAdapter extends ProtocolAdapter {
  private client: any;
  private adapter: any;
  private botId: string;
  private botPassword: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 100;
  private lastMessageTime = 0;
  private server: any;
  private port: number;

  constructor(config: AdapterConfig) {
    super(config);
    this.botId = config.credentials?.botId || '';
    this.botPassword = config.credentials?.botPassword || '';
    this.port = config.credentials?.port || 3978;

    if (!this.botId || !this.botPassword) {
      throw new Error('Teams adapter requires botId and botPassword in credentials');
    }
  }

  async connect(): Promise<void> {
    try {
      const { BotFrameworkAdapter } = await import('botbuilder');
      const express = await import('express');

      this.adapter = new BotFrameworkAdapter({
        appId: this.botId,
        appPassword: this.botPassword,
      });

      // Error handler
      this.adapter.onTurnError = async (context: any, error: any) => {
        logger.error('Teams adapter turn error:', error);
        await context.sendActivity('Sorry, I encountered an error processing your message.');
      };

      // Message handler
      this.adapter.processActivity(async (context: any) => {
        if (context.activity.type === 'message') {
          await this.handleIncomingMessage(context);
        }
      });

      // Setup Express server for receiving webhooks
      const app = express.default();
      app.use(express.default.json());
      app.use(express.default.urlencoded({ extended: true }));

      // Teams bot endpoint
      app.post('/api/messages', async (req: any, res: any) => {
        try {
          await this.adapter.processActivity(req, res, async (context: any) => {
            if (context.activity.type === 'message') {
              await this.handleIncomingMessage(context);
            }
          });
        } catch (error) {
          logger.error('Error processing Teams activity:', error);
          res.status(500).json({ error: 'Error processing activity' });
        }
      });

      // Health check
      app.get('/health', (req: any, res: any) => {
        res.json({ status: 'ok' });
      });

      this.server = app.listen(this.port, () => {
        logger.info(`Teams adapter listening on port ${this.port}`);
      });

      this.reconnectAttempts = 0;
      logger.info('Teams adapter connected successfully');
      this.isConnected = true;
      this.flushMessageQueue();
    } catch (error) {
      logger.error('Failed to connect to Teams:', error);
      this.handleConnectionError();
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.server) {
        this.server.close();
      }
      logger.info('Teams adapter disconnected');
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from Teams:', error);
    }
  }

  async sendMessage(channelId: string, message: NexusMessage): Promise<void> {
    if (!this.isConnected || !this.adapter) {
      this.messageQueue.set(channelId, [
        ...(this.messageQueue.get(channelId) || []),
        message,
      ]);
      return;
    }

    try {
      await this.applyRateLimit();

      const teamsMessage = this.convertToTeamsMessage(message);

      // Send proactive message
      const { ConversationReference } = await import('botbuilder');
      const conversationRef = {
        channelId: 'msteams',
        user: { id: channelId, name: 'NexusMind' },
        conversation: { id: channelId },
        channelData: { teamsChannelId: channelId },
      };

      await this.adapter.continueConversationAsync(
        this.botId,
        conversationRef,
        async (context: any) => {
          await context.sendActivity(teamsMessage);
        }
      );

      logger.debug(`Message sent to Teams channel ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to Teams channel ${channelId}:`, error);
      throw error;
    }
  }

  private async handleIncomingMessage(context: any): Promise<void> {
    try {
      const activity = context.activity;
      const message = this.convertFromTeamsMessage(activity);

      if (this.onMessage) {
        await this.onMessage(message);
      }
    } catch (error) {
      logger.error('Error handling incoming Teams message:', error);
    }
  }

  private convertToTeamsMessage(message: NexusMessage): any {
    const { CardFactory } = require('botbuilder');

    // Use Adaptive Card for rich formatting
    const card = {
      type: 'message',
      from: {
        id: 'NexusMind',
        name: 'NexusMind Bot',
      },
      text: message.text,
      attachments: [],
    };

    // Add rich content if available
    if (message.metadata?.useCard) {
      const adaptiveCard = {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: message.text,
            wrap: true,
            weight: message.metadata?.bold ? 'bolder' : 'normal',
            style: message.metadata?.italic ? 'emphasis' : undefined,
          },
        ],
      };

      card.attachments.push(CardFactory.adaptiveCard(adaptiveCard));
    }

    if (message.media && message.media.length > 0) {
      for (const media of message.media) {
        card.attachments.push({
          contentType: media.mimeType || 'application/octet-stream',
          contentUrl: media.url,
          name: media.name,
        });
      }
    }

    return card;
  }

  private convertFromTeamsMessage(activity: any): NexusMessage {
    return {
      id: activity.id,
      platform: 'teams',
      channelId: activity.channelData?.teamsChannelId || activity.conversation?.id || activity.from?.id,
      sender: {
        id: activity.from?.id,
        username: activity.from?.name || 'Unknown',
        displayName: activity.from?.name || 'Unknown',
      },
      text: activity.text || '',
      timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
      media: activity.attachments
        ? activity.attachments.map((att: any) => ({
            url: att.contentUrl,
            type: this.parseContentType(att.contentType),
            name: att.name,
          }))
        : undefined,
      metadata: {
        messageType: activity.type,
        isTeamsChannelMessage: !!activity.channelData?.teamsChannelId,
        mentions: activity.entities?.filter((e: any) => e.type === 'mention'),
      },
    };
  }

  private parseContentType(contentType: string): string {
    if (!contentType) return 'file';
    if (contentType.includes('image')) return 'image';
    if (contentType.includes('video')) return 'video';
    if (contentType.includes('audio')) return 'audio';
    return 'file';
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
        `Teams reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max Teams reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
