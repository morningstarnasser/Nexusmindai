import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig, Message } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * IRCAdapter - Connects to IRC servers via irc or node-irc library
 * Required npm packages: irc or node-irc
 */
export class IRCAdapter extends ProtocolAdapter {
  private client: any;
  private host: string;
  private nick: string;
  private port: number;
  private channels: string[];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 100;
  private lastMessageTime = 0;

  constructor(config: AdapterConfig) {
    super('irc', config as Record<string, unknown>);
    this.host = config.credentials?.host || 'irc.libera.chat';
    this.nick = config.credentials?.nick || 'NexusBot';
    this.port = config.credentials?.port || 6667;
    this.channels = config.credentials?.channels || ['#general'];
  }

  async connect(): Promise<void> {
    try {
      const irc = await import('irc');

      this.client = new irc.default.Client(this.host, this.nick, {
        channels: this.channels,
        port: this.port,
        autoRejoin: true,
        secure: this.port === 6697,
      });

      this.setupEventHandlers();

      this.client.addListener('error', (message: any) => {
        logger.error('IRC client error:', message);
        this.handleConnectionError();
      });

      this.reconnectAttempts = 0;
      logger.info('IRC adapter connecting...');
    } catch (error) {
      logger.error('Failed to connect to IRC:', error);
      this.handleConnectionError();
    }
  }

  private setupEventHandlers(): void {
    this.client.addListener('registered', () => {
      logger.info(`IRC connected as ${this.nick}`);
      this.isConnected = true;
      this.flushMessageQueue();
    });

    this.client.addListener('message', async (from: string, to: string, text: string) => {
      await this.handleIncomingMessage(from, to, text);
    });

    this.client.addListener('pm', async (from: string, text: string) => {
      await this.handleIncomingMessage(from, from, text, true);
    });

    this.client.addListener('join', (channel: string, nick: string) => {
      if (nick === this.nick) {
        logger.info(`Joined IRC channel ${channel}`);
      }
    });

    this.client.addListener('part', (channel: string, nick: string) => {
      if (nick === this.nick) {
        logger.info(`Parted IRC channel ${channel}`);
      }
    });

    this.client.addListener('quit', () => {
      logger.warn('Disconnected from IRC server');
      this.isConnected = false;
    });

    this.client.addListener('kick', (channel: string, who: string) => {
      if (who === this.nick) {
        logger.warn(`Kicked from IRC channel ${channel}`);
      }
    });
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        this.client.disconnect('Goodbye', () => {
          logger.info('IRC adapter disconnected');
        });
      }
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from IRC:', error);
    }
  }

  async send(message: Message): Promise<void> {
    const channelId = message.channel || '';
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.applyRateLimit();
      const target = channelId.startsWith('#') ? channelId : `#${channelId}`;
      this.client.say(target, message.content);
      logger.debug(`Message sent to IRC ${target}`);
    } catch (error) {
      logger.error(`Failed to send message to IRC ${channelId}:`, error);
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

      const ircMessage = this.convertToIrcMessage(message);

      // IRC messages to channels start with #
      const target = channelId.startsWith('#') ? channelId : `#${channelId}`;

      this.client.say(target, ircMessage);
      logger.debug(`Message sent to IRC ${target}`);
    } catch (error) {
      logger.error(`Failed to send message to IRC ${channelId}:`, error);
      throw error;
    }
  }

  private async handleIncomingMessage(
    from: string,
    to: string,
    text: string,
    isPm: boolean = false
  ): Promise<void> {
    try {
      // Ignore bot's own messages
      if (from === this.nick) return;

      const message = this.convertFromIrcMessage(from, to, text, isPm);

      await this.emitMessage(message as any);
    } catch (error) {
      logger.error('Error handling incoming IRC message:', error);
    }
  }

  private convertToIrcMessage(message: NexusMessage): string {
    const msg = message as any;
    let content = msg.text || message.content || '';

    // IRC formatting codes
    if (message.metadata?.bold) {
      content = `\u0002${content}\u0002`; // Bold
    }

    if (message.metadata?.italic) {
      content = `\u001D${content}\u001D`; // Italic
    }

    if (message.metadata?.underline) {
      content = `\u001F${content}\u001F`; // Underline
    }

    if (message.metadata?.color) {
      const colorCode = this.getIrcColorCode(message.metadata.color as string);
      content = `\u0003${colorCode}${content}\u0003`;
    }

    // IRC line length is typically limited to 512 bytes
    if (content.length > 400) {
      content = content.substring(0, 397) + '...';
    }

    return content;
  }

  private getIrcColorCode(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      white: '00',
      black: '01',
      blue: '02',
      green: '03',
      red: '04',
      brown: '05',
      purple: '06',
      orange: '07',
      yellow: '08',
      lightgreen: '09',
      cyan: '10',
      lightcyan: '11',
      lightblue: '12',
      pink: '13',
      gray: '14',
      lightgray: '15',
    };
    return colorMap[colorName.toLowerCase()] || '00';
  }

  private convertFromIrcMessage(
    from: string,
    to: string,
    text: string,
    isPm: boolean
  ): NexusMessage {
    // Parse IRC formatting codes
    const metadata: any = {};

    if (text.includes('\u0002')) {
      metadata.bold = true;
    }
    if (text.includes('\u001D')) {
      metadata.italic = true;
    }
    if (text.includes('\u001F')) {
      metadata.underline = true;
    }

    // Remove IRC formatting codes for display
    const cleanText = text
      .replace(/\u0002/g, '')
      .replace(/\u001D/g, '')
      .replace(/\u001F/g, '')
      .replace(/\u0003\d{2}/g, '')
      .replace(/\u0003/g, '');

    return {
      id: `irc-${Date.now()}-${Math.random()}`,
      platform: 'irc' as any,
      channel: { id: isPm ? from : to, name: '', type: isPm ? 'dm' : 'text', isPrivate: isPm } as any,
      author: {
        id: from,
        username: from,
        displayName: from,
        roles: [],
        permissions: [],
        isBot: false,
        isModerator: false,
      },
      content: cleanText,
      contentType: 'text' as any,
      attachments: [],
      embeds: [],
      components: [],
      reactions: [],
      mentions: { users: [], roles: [], channels: [] },
      processed: false,
      timestamp: new Date(),
      metadata: {
        messageType: isPm ? 'private' : 'channel',
        isPrivate: isPm,
        ...metadata,
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
        `IRC reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max IRC reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
