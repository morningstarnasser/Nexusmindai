import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * TelegramAdapter - Connects to Telegram via Telegraf library
 * Required npm packages: telegraf, node-fetch
 */
export class TelegramAdapter extends ProtocolAdapter {
  private bot: any;
  private telegramToken: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 30; // ms between messages
  private lastMessageTime = 0;

  constructor(config: AdapterConfig) {
    super('telegram', config as Record<string, unknown>);
    this.telegramToken = config.credentials?.token || '';
    if (!this.telegramToken) {
      throw new Error('Telegram adapter requires token in credentials');
    }
  }

  async connect(): Promise<void> {
    try {
      const { Telegraf } = await import('telegraf');
      this.bot = new Telegraf(this.telegramToken);

      // Register message handler
      this.bot.on('message', async (ctx: any) => {
        await this.handleIncomingMessage(ctx);
      });

      // Start polling
      await this.bot.launch({
        polling: {
          timeout: 30,
          limit: 100,
          allowedUpdates: ['message', 'edited_message'],
        },
      });

      this.reconnectAttempts = 0;
      logger.info('Telegram adapter connected successfully');
      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to connect to Telegram:', error);
      this.handleConnectionError();
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.bot) {
        await this.bot.stop('SIGINT');
        logger.info('Telegram adapter disconnected');
      }
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from Telegram:', error);
    }
  }

  async sendMessage(channelId: string, message: NexusMessage): Promise<void> {
    if (!this.isConnected || !this.bot) {
      this.messageQueue.set(channelId, [
        ...(this.messageQueue.get(channelId) || []),
        message,
      ]);
      return;
    }

    try {
      // Apply rate limiting
      await this.applyRateLimit();

      const telegramMessage = this.convertToTelegramMessage(message);

      if (message.media && message.media.length > 0) {
        // Handle media attachments
        for (const media of message.media) {
          await this.sendMediaMessage(channelId, media, message.text);
        }
      } else {
        // Send text message
        await this.bot.telegram.sendMessage(channelId, telegramMessage, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        });
      }

      logger.debug(`Message sent to Telegram channel ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to Telegram channel ${channelId}:`, error);
      throw error;
    }
  }

  private async handleIncomingMessage(ctx: any): Promise<void> {
    try {
      const message = this.convertFromTelegramMessage(ctx.message, ctx.from);
      
      if (this.onMessage) {
        await this.onMessage(message);
      }

      // Acknowledge receipt
      ctx.reply('Message received');
    } catch (error) {
      logger.error('Error handling incoming Telegram message:', error);
    }
  }

  private convertToTelegramMessage(message: NexusMessage): string {
    let content = message.text || '';
    
    if (message.metadata?.mentions) {
      content = message.metadata.mentions.reduce((acc: string, mention: string) => {
        return acc.replace(mention, `<b>${mention}</b>`);
      }, content);
    }

    if (message.metadata?.bold) {
      content = `<b>${content}</b>`;
    }

    if (message.metadata?.italic) {
      content = `<i>${content}</i>`;
    }

    return content;
  }

  private convertFromTelegramMessage(telegramMsg: any, sender: any): NexusMessage {
    return {
      id: `telegram-${telegramMsg.message_id}`,
      platform: 'telegram',
      channelId: telegramMsg.chat.id.toString(),
      sender: {
        id: sender.id.toString(),
        username: sender.username || sender.first_name || 'Unknown',
        displayName: `${sender.first_name} ${sender.last_name || ''}`.trim(),
      },
      text: telegramMsg.text || telegramMsg.caption || '',
      timestamp: new Date(telegramMsg.date * 1000),
      metadata: {
        messageType: telegramMsg.photo ? 'photo' : 'text',
        isBot: sender.is_bot || false,
      },
    };
  }

  private async sendMediaMessage(
    channelId: string,
    media: any,
    caption?: string
  ): Promise<void> {
    try {
      if (media.type === 'image' || media.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        await this.bot.telegram.sendPhoto(channelId, media.url, {
          caption: caption,
          parse_mode: 'HTML',
        });
      } else if (media.type === 'video' || media.url.match(/\.(mp4|mov|avi)$/i)) {
        await this.bot.telegram.sendVideo(channelId, media.url, {
          caption: caption,
          parse_mode: 'HTML',
        });
      } else if (media.type === 'file' || media.url.match(/\.(pdf|doc|docx)$/i)) {
        await this.bot.telegram.sendDocument(channelId, media.url, {
          caption: caption,
          parse_mode: 'HTML',
        });
      }
    } catch (error) {
      logger.error('Error sending media to Telegram:', error);
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
        `Telegram reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max Telegram reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
