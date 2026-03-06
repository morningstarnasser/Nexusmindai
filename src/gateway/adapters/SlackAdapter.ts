import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig, Message } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * SlackAdapter - Connects to Slack via @slack/bolt framework
 * Required npm packages: @slack/bolt, @slack/web-api
 */
export class SlackAdapter extends ProtocolAdapter {
  private app: any;
  private client: any;
  private slackToken: string;
  private signingSecret: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 50; // ms between messages
  private lastMessageTime = 0;

  constructor(config: AdapterConfig) {
    super('slack', config as Record<string, unknown>);
    this.slackToken = config.credentials?.token || '';
    this.signingSecret = config.credentials?.signingSecret || '';

    if (!this.slackToken) {
      throw new Error('Slack adapter requires token in credentials');
    }
  }

  async connect(): Promise<void> {
    try {
      const { App } = await import('@slack/bolt');
      const { WebClient } = await import('@slack/web-api');

      this.app = new App({
        token: this.slackToken,
        signingSecret: this.signingSecret,
        socketMode: true,
        appToken: this.slackToken,
      });

      this.client = new WebClient(this.slackToken);

      // Register message handler
      this.app.message(async ({ message, say, client }: any) => {
        await this.handleIncomingMessage(message, say);
      });

      this.app.start();
      this.reconnectAttempts = 0;
      logger.info('Slack adapter connected successfully');
      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to connect to Slack:', error);
      this.handleConnectionError();
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.app) {
        await this.app.stop();
        logger.info('Slack adapter disconnected');
      }
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from Slack:', error);
    }
  }

  async send(message: Message): Promise<void> {
    const channelId = message.channel || '';
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.applyRateLimit();

      await this.client.chat.postMessage({
        channel: channelId,
        text: message.content,
        mrkdwn: true,
      });

      logger.debug(`Message sent to Slack channel ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to Slack channel ${channelId}:`, error);
      throw error;
    }
  }

  async sendMessage(channelId: string, message: NexusMessage): Promise<void> {
    if (!this.isConnected || !this.client) {
      this.messageQueue.set(channelId, [
        ...(this.messageQueue.get(channelId) || []),
        message,
      ]);
      return;
    }

    try {
      await this.applyRateLimit();

      const slackMessage = this.convertToSlackMessage(message);
      const msg = message as any;
      const mediaList = msg.media || message.attachments;

      if (mediaList && mediaList.length > 0) {
        for (const media of mediaList) {
          await this.uploadMedia(channelId, media);
        }
      }

      await this.client.chat.postMessage({
        channel: channelId,
        ...slackMessage,
      });

      logger.debug(`Message sent to Slack channel ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to Slack channel ${channelId}:`, error);
      throw error;
    }
  }

  private async handleIncomingMessage(slackMsg: any, say: any): Promise<void> {
    try {
      // Ignore bot messages
      if (slackMsg.bot_id) return;

      const message = this.convertFromSlackMessage(slackMsg);

      await this.emitMessage(message as any);
    } catch (error) {
      logger.error('Error handling incoming Slack message:', error);
    }
  }

  private convertToSlackMessage(message: NexusMessage): any {
    const msg = message as any;
    const textContent = msg.text || message.content || '';
    const blocks: any[] = [];

    // Add text section
    if (textContent) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: this.formatSlackText(textContent, message.metadata),
        },
      });
    }

    // Add context if metadata present
    if (message.metadata?.context) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: message.metadata.context,
          },
        ],
      });
    }

    return {
      blocks,
      text: textContent,
      mrkdwn: true,
    };
  }

  private formatSlackText(text: string, metadata?: any): string {
    let formatted = text;

    if (metadata?.bold) {
      formatted = `*${formatted}*`;
    }

    if (metadata?.italic) {
      formatted = `_${formatted}_`;
    }

    if (metadata?.code) {
      formatted = `\`${formatted}\``;
    }

    if (metadata?.mentions) {
      metadata.mentions.forEach((mention: string) => {
        formatted = formatted.replace(mention, `<@${mention}>`);
      });
    }

    return formatted;
  }

  private convertFromSlackMessage(slackMsg: any): NexusMessage {
    return {
      id: slackMsg.ts,
      platform: 'slack' as any,
      channel: { id: slackMsg.channel, name: '', type: 'text', isPrivate: false } as any,
      author: {
        id: slackMsg.user,
        username: slackMsg.username || slackMsg.user,
        displayName: slackMsg.username || slackMsg.user,
        roles: [],
        permissions: [],
        isBot: false,
        isModerator: false,
      },
      content: slackMsg.text || '',
      contentType: 'text' as any,
      attachments: slackMsg.files
        ? slackMsg.files.map((file: any) => ({
            id: file.id || '',
            url: file.url_private || file.url,
            type: file.mimetype?.split('/')[0] || 'file',
            filename: file.name || 'attachment',
            mimeType: file.mimetype || 'application/octet-stream',
            size: file.size || 0,
          }))
        : [],
      embeds: [],
      components: [],
      reactions: [],
      mentions: { users: [], roles: [], channels: [] },
      processed: false,
      timestamp: new Date(parseInt(slackMsg.ts) * 1000),
      metadata: {
        messageType: slackMsg.subtype || 'message',
        isThreadReply: !!slackMsg.thread_ts,
        threadTs: slackMsg.thread_ts,
        reactions: slackMsg.reactions?.map((r: any) => r.name) || [],
      },
    } as NexusMessage;
  }

  private async uploadMedia(channelId: string, media: any): Promise<void> {
    try {
      const response = await fetch(media.url);
      const buffer = await response.arrayBuffer();

      await this.client.files.upload({
        channels: channelId,
        file: Buffer.from(buffer),
        filename: media.name || 'attachment',
        title: media.name,
      });
    } catch (error) {
      logger.error('Error uploading media to Slack:', error);
      throw error;
    }
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

  private handleConnectionError(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.warn(
        `Slack reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max Slack reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
