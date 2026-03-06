import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig, Message } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * MatrixAdapter - Connects to Matrix/Synapse homeserver
 * Required npm packages: matrix-js-sdk
 */
export class MatrixAdapter extends ProtocolAdapter {
  private client: any;
  private homeserverUrl: string;
  private userId: string;
  private password: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 100;
  private lastMessageTime = 0;

  constructor(config: AdapterConfig) {
    super('matrix', config as Record<string, unknown>);
    this.homeserverUrl = config.credentials?.homeserverUrl || 'https://matrix.org';
    this.userId = config.credentials?.userId || '';
    this.password = config.credentials?.password || '';

    if (!this.userId || !this.password) {
      throw new Error('Matrix adapter requires userId and password in credentials');
    }
  }

  async connect(): Promise<void> {
    try {
      const matrixSdk = await import('matrix-js-sdk');
      
      this.client = matrixSdk.createClient({
        baseUrl: this.homeserverUrl,
      });

      // Login
      const loginResponse = await this.client.loginWithUser(this.userId, this.password);
      logger.info(`Matrix login successful for ${this.userId}`);

      // Set up event handlers
      this.client.on('Room.timeline', async (event: any) => {
        await this.handleIncomingMessage(event);
      });

      this.client.on('sync', (state: string) => {
        if (state === 'PREPARED') {
          logger.info('Matrix sync completed');
          this.isConnected = true;
          this.flushMessageQueue();
        }
      });

      this.client.on('error', (error: any) => {
        logger.error('Matrix client error:', error);
        this.handleConnectionError();
      });

      // Start client
      await this.client.startClient({
        initialSyncLimit: 50,
      });

      this.reconnectAttempts = 0;
      logger.info('Matrix adapter connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Matrix:', error);
      this.handleConnectionError();
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.stopClient();
        logger.info('Matrix adapter disconnected');
      }
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from Matrix:', error);
    }
  }

  async send(message: Message): Promise<void> {
    const channelId = message.channel || '';
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.applyRateLimit();

      await this.client.sendMessage(channelId, {
        msgtype: 'm.text',
        body: message.content,
      });

      logger.debug(`Message sent to Matrix room ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to Matrix room ${channelId}:`, error);
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

      const room = this.client.getRoom(channelId);
      if (!room) {
        throw new Error(`Matrix room ${channelId} not found`);
      }

      const matrixMessage = this.convertToMatrixMessage(message);
      const msg = message as any;
      const mediaList = msg.media || message.attachments;

      if (mediaList && mediaList.length > 0) {
        for (const media of mediaList) {
          await this.sendMediaMessage(channelId, media, msg.text || message.content);
        }
      } else {
        await this.client.sendMessage(channelId, matrixMessage);
      }

      logger.debug(`Message sent to Matrix room ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to Matrix room ${channelId}:`, error);
      throw error;
    }
  }

  private async handleIncomingMessage(event: any): Promise<void> {
    try {
      // Filter for text messages only
      if (event.getType() !== 'm.room.message') return;
      if (event.getSender() === this.client.getUserId()) return; // Ignore own messages

      const message = this.convertFromMatrixMessage(event);

      await this.emitMessage(message as any);
    } catch (error) {
      logger.error('Error handling incoming Matrix message:', error);
    }
  }

  private convertToMatrixMessage(message: NexusMessage): any {
    const msg = message as any;
    let content = msg.text || message.content || '';

    if (message.metadata?.bold) {
      content = `<b>${content}</b>`;
    }

    if (message.metadata?.italic) {
      content = `<i>${content}</i>`;
    }

    if (message.metadata?.code) {
      content = `<code>${content}</code>`;
    }

    return {
      msgtype: 'm.text',
      body: msg.text || message.content || '',
      format: 'org.matrix.custom.html',
      formatted_body: content,
    };
  }

  private convertFromMatrixMessage(event: any): NexusMessage {
    const content = event.getContent();
    const sender = event.getSender();

    return {
      id: event.getId(),
      platform: 'matrix' as any,
      channel: { id: event.getRoomId(), name: '', type: 'text', isPrivate: false } as any,
      author: {
        id: sender,
        username: sender.split(':')[0].substring(1), // Remove @ and domain
        displayName: event.sender?.displayName || sender,
        avatar: event.sender?.avatarUrl,
        roles: [],
        permissions: [],
        isBot: false,
        isModerator: false,
      },
      content: content.body || '',
      contentType: 'text' as any,
      attachments: content.url
        ? [
            {
              id: '',
              url: this.client.mxcUrlToHttp(content.url),
              type: content.msgtype === 'm.image' ? 'image' : 'file',
              filename: content.filename || 'attachment',
              mimeType: content.info?.mimetype || 'application/octet-stream',
              size: content.info?.size || 0,
            },
          ]
        : [],
      embeds: [],
      components: [],
      reactions: [],
      mentions: { users: [], roles: [], channels: [] },
      processed: false,
      timestamp: new Date(event.getTs()),
      metadata: {
        messageType: content.msgtype,
        isEdited: event.isEdited(),
        replyTo: content['m.relates_to']?.['m.in_reply_to'],
      },
    } as NexusMessage;
  }

  private async sendMediaMessage(
    channelId: string,
    media: any,
    caption?: string
  ): Promise<void> {
    try {
      const response = await fetch(media.url);
      const buffer = await response.arrayBuffer();

      // Upload media to Matrix server
      const uploadResponse = await this.client.uploadContent(
        new Blob([buffer]),
        {
          name: media.name || 'attachment',
          type: media.mimeType || 'application/octet-stream',
        }
      );

      const contentUri = uploadResponse.content_uri;

      // Send media message
      if (media.type === 'image' || media.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        await this.client.sendMessage(channelId, {
          msgtype: 'm.image',
          url: contentUri,
          body: media.name || 'Image',
          info: {
            size: media.size,
            mimetype: media.mimeType || 'image/jpeg',
          },
        });
      } else {
        await this.client.sendMessage(channelId, {
          msgtype: 'm.file',
          url: contentUri,
          body: media.name || 'File',
          info: {
            size: media.size,
            mimetype: media.mimeType || 'application/octet-stream',
          },
        });
      }

      logger.debug(`Media sent to Matrix room ${channelId}`);
    } catch (error) {
      logger.error('Error sending media to Matrix:', error);
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
        `Matrix reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max Matrix reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
