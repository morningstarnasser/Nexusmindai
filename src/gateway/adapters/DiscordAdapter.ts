import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig, Message } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * DiscordAdapter - Connects to Discord via discord.js library
 * Required npm packages: discord.js
 */
export class DiscordAdapter extends ProtocolAdapter {
  private client: any;
  private discordToken: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 1000; // ms between messages
  private lastMessageTime = 0;

  constructor(config: AdapterConfig) {
    super('discord', config as Record<string, unknown>);
    this.discordToken = config.credentials?.token || '';
    if (!this.discordToken) {
      throw new Error('Discord adapter requires token in credentials');
    }
  }

  async connect(): Promise<void> {
    try {
      const { Client, GatewayIntentBits, ChannelType } = await import('discord.js');
      
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.MessageContent,
        ],
      });

      this.client.on('ready', () => {
        logger.info(`Discord bot logged in as ${this.client.user.tag}`);
        this.reconnectAttempts = 0;
        this.isConnected = true;
        this.flushMessageQueue();
      });

      this.client.on('messageCreate', async (msg: any) => {
        await this.handleIncomingMessage(msg);
      });

      this.client.on('error', (error: any) => {
        logger.error('Discord client error:', error);
        this.handleConnectionError();
      });

      this.client.on('disconnect', () => {
        logger.warn('Discord client disconnected');
        this.handleConnectionError();
      });

      await this.client.login(this.discordToken);
    } catch (error) {
      logger.error('Failed to connect to Discord:', error);
      this.handleConnectionError();
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.destroy();
        logger.info('Discord adapter disconnected');
      }
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from Discord:', error);
    }
  }

  async send(message: Message): Promise<void> {
    const channelId = message.channel || '';
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.applyRateLimit();

      const channel = await this.client.channels.fetch(channelId);
      if (!channel) {
        throw new Error(`Discord channel ${channelId} not found`);
      }

      await channel.send(message.content);
      logger.debug(`Message sent to Discord channel ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to Discord channel ${channelId}:`, error);
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

      const channel = await this.client.channels.fetch(channelId);
      if (!channel) {
        throw new Error(`Discord channel ${channelId} not found`);
      }

      const discordMessage = this.convertToDiscordMessage(message);
      const msg = message as any;
      const mediaList = msg.media || message.attachments;

      if (mediaList && mediaList.length > 0) {
        const { AttachmentBuilder } = await import('discord.js');
        const attachments = (mediaList as any[]).map((media: any) =>
          new AttachmentBuilder(media.url, { name: media.name || 'attachment' })
        );
        
        await channel.send({
          content: discordMessage,
          files: attachments,
        });
      } else {
        await channel.send(discordMessage);
      }

      logger.debug(`Message sent to Discord channel ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to Discord channel ${channelId}:`, error);
      throw error;
    }
  }

  private async handleIncomingMessage(msg: any): Promise<void> {
    try {
      // Ignore bot messages
      if (msg.author.bot) return;

      const message = this.convertFromDiscordMessage(msg);

      await this.emitMessage(message as any);
    } catch (error) {
      logger.error('Error handling incoming Discord message:', error);
    }
  }

  private convertToDiscordMessage(message: NexusMessage): string {
    const msg = message as any;
    let content = msg.text || message.content || '';
    
    if (message.metadata?.mentions) {
      content = (message.metadata.mentions as any[]).reduce((acc: string, mention: string) => {
        return acc.replace(mention, `**${mention}**`);
      }, content);
    }

    if (message.metadata?.bold) {
      content = `**${content}**`;
    }

    if (message.metadata?.italic) {
      content = `*${content}*`;
    }

    if (message.metadata?.code) {
      content = `\`\`\`${message.metadata.language || ''}\n${content}\n\`\`\``;
    }

    // Discord message limit is 2000 characters
    if (content.length > 2000) {
      content = content.substring(0, 1997) + '...';
    }

    return content;
  }

  private convertFromDiscordMessage(msg: any): NexusMessage {
    const mediaAttachments = msg.attachments.map((attachment: any) => ({
      id: attachment.id || '',
      url: attachment.url,
      type: this.detectMediaType(attachment.contentType),
      filename: attachment.name || 'attachment',
      mimeType: attachment.contentType || 'application/octet-stream',
      size: attachment.size || 0,
    }));

    return {
      id: msg.id,
      platform: 'discord' as any,
      channel: { id: msg.channelId, name: '', type: 'text', isPrivate: false } as any,
      author: {
        id: msg.author.id,
        username: msg.author.username,
        displayName: msg.author.displayName || msg.author.username,
        avatar: msg.author.displayAvatarURL(),
        roles: [],
        permissions: [],
        isBot: msg.author.bot || false,
        isModerator: false,
      },
      content: msg.content,
      contentType: 'text' as any,
      attachments: mediaAttachments,
      embeds: [],
      components: [],
      reactions: [],
      mentions: { users: [], roles: [], channels: [] },
      processed: false,
      timestamp: msg.createdAt,
      metadata: {
        messageType: msg.type,
        isReply: msg.reference !== null,
        isPinned: msg.pinned,
      },
    } as NexusMessage;
  }

  private detectMediaType(contentType: string): string {
    if (!contentType) return 'file';
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.startsWith('audio/')) return 'audio';
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
        `Discord reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max Discord reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
