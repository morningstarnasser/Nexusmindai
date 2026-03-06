import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * SignalAdapter - Connects to Signal via signal-cli or signal-sdk
 * Required npm packages: signal-cli (CLI wrapper) or signal-sdk
 */
export class SignalAdapter extends ProtocolAdapter {
  private phoneNumber: string;
  private signalCliPath: string = 'signal-cli';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 500; // ms between messages
  private lastMessageTime = 0;
  private isInitialized = false;

  constructor(config: AdapterConfig) {
    super(config);
    this.phoneNumber = config.credentials?.phoneNumber || '';
    this.signalCliPath = config.credentials?.signalCliPath || 'signal-cli';

    if (!this.phoneNumber) {
      throw new Error('Signal adapter requires phoneNumber in credentials');
    }
  }

  async connect(): Promise<void> {
    try {
      // Verify signal-cli is available
      const { spawn } = await import('child_process');
      
      // Check if signal-cli is installed
      try {
        const version = await this.executeSignalCli(['--version']);
        logger.info(`Signal CLI version: ${version}`);
      } catch (error) {
        throw new Error(
          'signal-cli not found. Please install it: https://github.com/AsamK/signal-cli'
        );
      }

      // Register phone number if not already done
      await this.ensureRegistered();

      this.isInitialized = true;
      this.reconnectAttempts = 0;
      logger.info('Signal adapter connected successfully');
      this.isConnected = true;
      this.flushMessageQueue();
    } catch (error) {
      logger.error('Failed to connect to Signal:', error);
      this.handleConnectionError();
    }
  }

  async disconnect(): Promise<void> {
    try {
      logger.info('Signal adapter disconnected');
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from Signal:', error);
    }
  }

  async sendMessage(channelId: string, message: NexusMessage): Promise<void> {
    if (!this.isConnected || !this.isInitialized) {
      this.messageQueue.set(channelId, [
        ...(this.messageQueue.get(channelId) || []),
        message,
      ]);
      return;
    }

    try {
      await this.applyRateLimit();

      const signalMessage = this.convertToSignalMessage(message);
      const args = [
        '-u',
        this.phoneNumber,
        'send',
        '-m',
        signalMessage,
      ];

      // Add attachment for media
      if (message.media && message.media.length > 0) {
        for (const media of message.media) {
          args.push('-a', media.url);
        }
      }

      args.push(channelId);

      await this.executeSignalCli(args);
      logger.debug(`Message sent to Signal ${channelId}`);
    } catch (error) {
      logger.error(`Failed to send message to Signal ${channelId}:`, error);
      throw error;
    }
  }

  private async ensureRegistered(): Promise<void> {
    try {
      // Check if number is already registered
      await this.executeSignalCli(['-u', this.phoneNumber, 'listIdentities']);
    } catch (error) {
      logger.info('Registering phone number with Signal...');
      try {
        await this.executeSignalCli(['register', '-u', this.phoneNumber]);
      } catch (regError) {
        logger.warn('Could not auto-register. Manual registration may be needed.');
      }
    }
  }

  private async executeSignalCli(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      
      const command = `${this.signalCliPath} ${args.join(' ')}`;
      exec(command, (error: any, stdout: string, stderr: string) => {
        if (error) {
          reject(new Error(`Signal CLI error: ${stderr || error.message}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  private convertToSignalMessage(message: NexusMessage): string {
    let content = message.text || '';
    
    if (message.metadata?.bold) {
      // Signal supports markdown-style formatting
      content = `**${content}**`;
    }

    if (message.metadata?.italic) {
      content = `_${content}_`;
    }

    if (message.metadata?.code) {
      content = `\`${content}\``;
    }

    return content;
  }

  private convertFromSignalMessage(signalMsg: any): NexusMessage {
    return {
      id: signalMsg.id || `signal-${Date.now()}`,
      platform: 'signal',
      channelId: signalMsg.source,
      sender: {
        id: signalMsg.source,
        username: signalMsg.source,
        displayName: signalMsg.sourceName || signalMsg.source,
      },
      text: signalMsg.message || '',
      timestamp: new Date(signalMsg.timestamp),
      media: signalMsg.attachments
        ? signalMsg.attachments.map((att: any) => ({
            url: att.url || att.path,
            type: att.type || 'file',
            name: att.filename,
          }))
        : undefined,
      metadata: {
        messageType: 'message',
        isGroupMessage: signalMsg.isGroupMessage || false,
        groupId: signalMsg.groupId,
      },
    };
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
        `Signal reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max Signal reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
