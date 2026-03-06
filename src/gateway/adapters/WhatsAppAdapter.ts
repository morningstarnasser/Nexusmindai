import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig, Message } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * WhatsAppAdapter - Connects to WhatsApp via Twilio or Baileys library
 * Required npm packages: twilio or whatsapp-web.js
 */
export class WhatsAppAdapter extends ProtocolAdapter {
  private client: any;
  private apiKey: string;
  private phoneNumber: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 100; // ms between messages
  private lastMessageTime = 0;
  private useWhatsAppWeb: boolean;

  constructor(config: AdapterConfig) {
    super('whatsapp', config as Record<string, unknown>);
    this.apiKey = config.credentials?.apiKey || '';
    this.phoneNumber = config.credentials?.phoneNumber || '';
    this.useWhatsAppWeb = config.credentials?.useWhatsAppWeb !== false;

    if (!this.apiKey && !this.useWhatsAppWeb) {
      throw new Error('WhatsApp adapter requires apiKey or whatsapp-web.js');
    }
  }

  async connect(): Promise<void> {
    try {
      if (this.useWhatsAppWeb) {
        await this.connectWithWhatsAppWeb();
      } else {
        await this.connectWithTwilio();
      }

      this.reconnectAttempts = 0;
      logger.info('WhatsApp adapter connected successfully');
      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to connect to WhatsApp:', error);
      this.handleConnectionError();
    }
  }

  private async connectWithWhatsAppWeb(): Promise<void> {
    try {
      const { Client, LocalAuth } = await import('whatsapp-web.js');
      
      this.client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox'],
        },
      });

      this.client.on('qr', (qr: string) => {
        logger.info('WhatsApp QR code ready for scanning');
      });

      this.client.on('authenticated', () => {
        logger.info('WhatsApp authenticated');
      });

      this.client.on('message', async (msg: any) => {
        await this.handleIncomingMessage(msg);
      });

      this.client.on('disconnected', () => {
        logger.warn('WhatsApp disconnected');
        this.isConnected = false;
      });

      await this.client.initialize();
    } catch (error) {
      logger.error('Failed to connect with whatsapp-web.js:', error);
      throw error;
    }
  }

  private async connectWithTwilio(): Promise<void> {
    try {
      const twilio = await import('twilio');
      this.client = twilio.default(this.apiKey, this.phoneNumber);
      logger.info('Connected to WhatsApp via Twilio');
    } catch (error) {
      logger.error('Failed to connect with Twilio:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.useWhatsAppWeb) {
        await this.client.destroy();
        logger.info('WhatsApp adapter disconnected');
      }
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from WhatsApp:', error);
    }
  }

  async send(message: Message): Promise<void> {
    const channelId = message.channel || message.userId;
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.applyRateLimit();

      if (this.useWhatsAppWeb) {
        await this.client.sendMessage(channelId, message.content);
      } else {
        await this.client.messages.create({
          from: `whatsapp:${this.phoneNumber}`,
          to: `whatsapp:${channelId}`,
          body: message.content,
        });
      }

      logger.debug(`Message sent to WhatsApp ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to WhatsApp ${channelId}:`, error);
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

      const whatsappMessage = this.convertToWhatsAppMessage(message);
      const msg = message as any;
      const mediaList = msg.media || message.attachments;

      if (mediaList && mediaList.length > 0) {
        for (const media of mediaList) {
          await this.sendMediaMessage(channelId, media, msg.text || message.content);
        }
      } else {
        if (this.useWhatsAppWeb) {
          await this.client.sendMessage(channelId, whatsappMessage);
        } else {
          // Twilio API call
          await this.client.messages.create({
            from: `whatsapp:${this.phoneNumber}`,
            to: `whatsapp:${channelId}`,
            body: whatsappMessage,
          });
        }
      }

      logger.debug(`Message sent to WhatsApp ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to WhatsApp ${channelId}:`, error);
      throw error;
    }
  }

  private async handleIncomingMessage(msg: any): Promise<void> {
    try {
      const message = this.convertFromWhatsAppMessage(msg);

      await this.emitMessage(message as any);
    } catch (error) {
      logger.error('Error handling incoming WhatsApp message:', error);
    }
  }

  private convertToWhatsAppMessage(message: NexusMessage): string {
    const msg = message as any;
    let content = msg.text || message.content || '';
    
    if (message.metadata?.bold) {
      content = `*${content}*`;
    }

    if (message.metadata?.italic) {
      content = `_${content}_`;
    }

    if (message.metadata?.strikethrough) {
      content = `~${content}~`;
    }

    if (message.metadata?.code) {
      content = `\`\`\`${content}\`\`\``;
    }

    return content;
  }

  private convertFromWhatsAppMessage(msg: any): NexusMessage {
    return {
      id: msg.id.id || msg.id,
      platform: 'whatsapp' as any,
      channel: { id: msg.from, name: '', type: 'text', isPrivate: false } as any,
      author: {
        id: msg.from,
        username: msg.author?.pushname || 'Unknown',
        displayName: msg.author?.pushname || 'Unknown',
        roles: [],
        permissions: [],
        isBot: false,
        isModerator: false,
      },
      content: msg.body,
      contentType: 'text' as any,
      attachments: msg.hasMedia
        ? [
            {
              id: '',
              url: msg.mediaUrl || '',
              type: msg.type || 'file',
              filename: 'attachment',
              mimeType: 'application/octet-stream',
              size: msg.mediaData?.filesize || 0,
            },
          ]
        : [],
      embeds: [],
      components: [],
      reactions: [],
      mentions: { users: [], roles: [], channels: [] },
      processed: false,
      timestamp: new Date(msg.timestamp * 1000),
      metadata: {
        messageType: msg.type,
        isGroup: msg.isGroupMsg,
        isForwarded: msg.isForwarded,
        mentions: msg.mentionedIds || [],
      },
    } as NexusMessage;
  }

  private async sendMediaMessage(
    channelId: string,
    media: any,
    caption?: string
  ): Promise<void> {
    try {
      if (this.useWhatsAppWeb) {
        const { MessageMedia } = await import('whatsapp-web.js');
        
        const response = await fetch(media.url);
        const buffer = await response.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');
        
        const messageMedia = new MessageMedia(media.type || 'image/jpeg', base64Data);
        await this.client.sendMessage(channelId, messageMedia, {
          caption: caption,
        });
      }
    } catch (error) {
      logger.error('Error sending media to WhatsApp:', error);
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
        `WhatsApp reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max WhatsApp reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
