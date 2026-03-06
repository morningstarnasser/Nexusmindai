import { ProtocolAdapter } from '../ProtocolAdapter.js';
import { NexusMessage, AdapterConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * EmailAdapter - Sends messages via SMTP email
 * Required npm packages: nodemailer, imap-simple
 */
export class EmailAdapter extends ProtocolAdapter {
  private transporter: any;
  private imapClient: any;
  private smtpConfig: any;
  private imapConfig: any;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private messageQueue: Map<string, NexusMessage[]> = new Map();
  private rateLimitDelay = 100; // ms between messages
  private lastMessageTime = 0;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(config: AdapterConfig) {
    super(config);
    this.smtpConfig = config.credentials?.smtp || {};
    this.imapConfig = config.credentials?.imap || {};

    if (!this.smtpConfig.host || !this.smtpConfig.user || !this.smtpConfig.password) {
      throw new Error('Email adapter requires SMTP configuration in credentials');
    }
  }

  async connect(): Promise<void> {
    try {
      const nodemailer = await import('nodemailer');
      
      this.transporter = nodemailer.default.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port || 587,
        secure: this.smtpConfig.secure || false,
        auth: {
          user: this.smtpConfig.user,
          pass: this.smtpConfig.password,
        },
      });

      // Verify SMTP connection
      await this.transporter.verify();
      logger.info('Email SMTP connection verified');

      // Start polling for incoming emails if IMAP configured
      if (this.imapConfig.host) {
        await this.startImapPolling();
      }

      this.reconnectAttempts = 0;
      logger.info('Email adapter connected successfully');
      this.isConnected = true;
      this.flushMessageQueue();
    } catch (error) {
      logger.error('Failed to connect to Email:', error);
      this.handleConnectionError();
    }
  }

  private async startImapPolling(): Promise<void> {
    try {
      const imapSimple = await import('imap-simple');
      
      const config = {
        imap: {
          user: this.imapConfig.user,
          password: this.imapConfig.password,
          host: this.imapConfig.host,
          port: this.imapConfig.port || 993,
          tls: this.imapConfig.tls !== false,
          authTimeout: 3000,
        },
      };

      this.imapClient = await imapSimple.default.connect(config);

      // Poll for new emails every 30 seconds
      this.pollInterval = setInterval(() => {
        this.checkForNewEmails();
      }, 30000);

      logger.info('IMAP polling started for incoming emails');
    } catch (error) {
      logger.warn('Failed to setup IMAP for incoming emails:', error);
      // Continue without incoming email support
    }
  }

  private async checkForNewEmails(): Promise<void> {
    try {
      if (!this.imapClient) return;

      await this.imapClient.openBox('INBOX', false);
      
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { bodies: '' };
      
      const messages = await this.imapClient.search(searchCriteria, fetchOptions);

      for (const message of messages) {
        const msg = this.convertFromEmailMessage(message);
        
        if (this.onMessage) {
          await this.onMessage(msg);
        }
      }

      // Mark as read
      if (messages.length > 0) {
        await this.imapClient.setFlags(
          messages.map((m: any) => m.attributes.uid),
          '\\Seen'
        );
      }
    } catch (error) {
      logger.error('Error checking for new emails:', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }

      if (this.imapClient) {
        await this.imapClient.closeBox();
        await this.imapClient.end();
      }

      if (this.transporter) {
        await this.transporter.close();
      }

      logger.info('Email adapter disconnected');
      this.isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting from Email:', error);
    }
  }

  async sendMessage(channelId: string, message: NexusMessage): Promise<void> {
    if (!this.isConnected || !this.transporter) {
      this.messageQueue.set(channelId, [
        ...(this.messageQueue.get(channelId) || []),
        message,
      ]);
      return;
    }

    try {
      await this.applyRateLimit();

      const emailMessage = this.convertToEmailMessage(channelId, message);

      if (message.media && message.media.length > 0) {
        emailMessage.attachments = await Promise.all(
          message.media.map(async (media: any) => {
            const response = await fetch(media.url);
            const buffer = await response.arrayBuffer();
            return {
              filename: media.name || 'attachment',
              content: Buffer.from(buffer),
              contentType: media.mimeType || 'application/octet-stream',
            };
          })
        );
      }

      const info = await this.transporter.sendMail(emailMessage);
      logger.debug(`Email sent to ${channelId}, message ID: ${info.messageId}`);
    } catch (error) {
      logger.error(`Failed to send email to ${channelId}:`, error);
      throw error;
    }
  }

  private convertToEmailMessage(recipientEmail: string, message: NexusMessage): any {
    let htmlContent = `<p>${this.escapeHtml(message.text || '')}</p>`;

    if (message.metadata?.senderName) {
      htmlContent = `<p><strong>From:</strong> ${this.escapeHtml(message.metadata.senderName)}</p>\n${htmlContent}`;
    }

    if (message.metadata?.context) {
      htmlContent += `<p><em>${this.escapeHtml(message.metadata.context)}</em></p>`;
    }

    return {
      from: this.smtpConfig.user,
      to: recipientEmail,
      subject: message.metadata?.subject || 'Message from NexusMind',
      html: htmlContent,
      text: message.text,
      messageId: `<${message.id}@nexusmind.local>`,
      date: message.timestamp || new Date(),
      headers: {
        'X-NexusMind-Platform': 'email',
        'X-NexusMind-MessageID': message.id,
      },
    };
  }

  private convertFromEmailMessage(emailMsg: any): NexusMessage {
    const parts = emailMsg.parts || [];
    let textContent = '';

    // Extract text from email parts
    for (const part of parts) {
      if (part.which === 'TEXT' || part.which === 'HTML') {
        textContent = part.body || '';
        break;
      }
    }

    return {
      id: emailMsg.id || `email-${Date.now()}`,
      platform: 'email',
      channelId: emailMsg.from?.[0] || 'unknown',
      sender: {
        id: emailMsg.from?.[0] || 'unknown',
        username: emailMsg.from?.[0] || 'Unknown',
        displayName: emailMsg.from?.[0] || 'Unknown',
      },
      text: textContent,
      timestamp: emailMsg.date || new Date(),
      metadata: {
        subject: emailMsg.subject || '',
        from: emailMsg.from?.[0],
        to: emailMsg.to,
        cc: emailMsg.cc,
        messageType: 'email',
      },
    };
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
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
        `Email reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      logger.error('Max Email reconnection attempts reached');
      this.isConnected = false;
    }
  }
}
