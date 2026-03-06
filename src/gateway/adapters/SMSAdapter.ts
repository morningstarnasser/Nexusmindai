import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * SMSAdapter - Sends SMS messages via Twilio or AWS SNS
 * Required npm packages: twilio or aws-sdk
 */
export class SMSAdapter extends ProtocolAdapter {
  private client: any;
  private provider: string; // 'twilio' or 'aws'
  private fromNumber: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 5000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 500; // SMS rate limiting
  private lastMessageTime = 0;

  constructor(config: AdapterConfig) {
    super(config);
    this.provider = config.credentials?.provider || 'twilio';
    this.fromNumber = config.credentials?.fromNumber || '';

    if (!this.fromNumber) {
      throw new Error('SMS adapter requires fromNumber in credentials');
    }
  }

  async connect(): Promise<void> {
    try {
      if (this.provider === 'twilio') {
        await this.connectTwilio();
      } else if (this.provider === 'aws') {
        await this.connectAWS();
      } else {
        throw new Error(`Unknown SMS provider: ${this.provider}`);
      }

      this.reconnectAttempts = 0;
      logger.info('SMS adapter connected successfully');
      this.isConnected = true;
      this.flushMessageQueue();
    } catch (error) {
      logger.error('Failed to connect to SMS:', error);
      this.handleConnectionError();
    }
  }

  private async connectTwilio(): Promise<void> {
    try {
      const twilio = await import('twilio');
      const accountSid = this.config.credentials?.accountSid;
      const authToken = this.config.credentials?.authToken;

      if (!accountSid || !authToken) {
        throw new Error('Twilio requires accountSid and authToken');
      }

      this.client = twilio.default(accountSid, authToken);
      logger.info('Connected to Twilio SMS service');
    } catch (error) {
      logger.error('Failed to connect to Twilio:', error);
      throw error;
    }
  }

  private async connectAWS(): Promise<void> {
    try {
      const { SNSClient } = await import('@aws-sdk/client-sns');
      
      this.client = new SNSClient({
        region: this.config.credentials?.awsRegion || 'us-east-1',
      });
      logger.info('Connected to AWS SNS service');
    } catch (error) {
      logger.error('Failed to connect to AWS SNS:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.provider === 'aws' && this.client) {
        await this.client.destroy();
      }
      logger.info('SMS adapter disconnected');
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from SMS:', error);
    }
  }

  async sendMessage(phoneNumber: string, message: NexusMessage): Promise<void> {
    if (!this.isConnected || !this.client) {
      this.messageQueue.set(phoneNumber, [
        ...(this.messageQueue.get(phoneNumber) || []),
        message,
      ]);
      return;
    }

    try {
      await this.applyRateLimit();

      const smsContent = this.convertToSmsMessage(message);

      if (this.provider === 'twilio') {
        await this.sendViaTwilio(phoneNumber, smsContent);
      } else if (this.provider === 'aws') {
        await this.sendViaAWS(phoneNumber, smsContent);
      }

      logger.debug(`SMS sent to ${phoneNumber}`);
    } catch (error) {
      logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      throw error;
    }
  }

  private async sendViaTwilio(phoneNumber: string, content: string): Promise<void> {
    try {
      const message = await this.client.messages.create({
        body: content,
        from: this.fromNumber,
        to: phoneNumber,
      });

      logger.debug(`Twilio SMS sent: ${message.sid}`);
    } catch (error) {
      logger.error('Twilio SMS send failed:', error);
      throw error;
    }
  }

  private async sendViaAWS(phoneNumber: string, content: string): Promise<void> {
    try {
      const { PublishCommand } = await import('@aws-sdk/client-sns');

      const command = new PublishCommand({
        Message: content,
        PhoneNumber: phoneNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'NexusMind',
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      });

      const response = await this.client.send(command);
      logger.debug(`AWS SNS SMS sent: ${response.MessageId}`);
    } catch (error) {
      logger.error('AWS SNS SMS send failed:', error);
      throw error;
    }
  }

  private convertToSmsMessage(message: NexusMessage): string {
    let content = message.text || '';

    // SMS character limit is typically 160 or 320 (for longer messages)
    // Keep it simple - no formatting in SMS
    if (content.length > 160) {
      // For longer messages, use multiple SMS parts
      content = content.substring(0, 157) + '...';
    }

    return content;
  }

  private convertFromSmsMessage(smsData: any): NexusMessage {
    return {
      id: smsData.sid || `sms-${Date.now()}`,
      platform: 'sms',
      channelId: smsData.from,
      sender: {
        id: smsData.from,
        username: smsData.from,
        displayName: smsData.from,
      },
      text: smsData.body || smsData.Message || '',
      timestamp: smsData.dateCreated ? new Date(smsData.dateCreated) : new Date(),
      metadata: {
        messageType: 'sms',
        status: smsData.status,
        numMedia: smsData.numMedia || 0,
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
    for (const [phoneNumber, messages] of this.messageQueue.entries()) {
      for (const message of messages) {
        try {
          await this.sendMessage(phoneNumber, message);
        } catch (error) {
          logger.error(`Failed to flush queued message for phone ${phoneNumber}:`, error);
        }
      }
      this.messageQueue.delete(phoneNumber);
    }
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.warn(
        `SMS reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max SMS reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
