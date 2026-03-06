# NexusMind Messaging Platform Adapters

This directory contains platform-specific adapter implementations for integrating various messaging platforms with NexusMind.

## Adapters Implemented

### 1. TelegramAdapter.ts (207 lines)
- Connects via Telegraf library
- Handles polling for incoming messages
- Supports media uploads (photos, videos, documents)
- Rate limiting (30ms between messages)
- Automatic reconnection with exponential backoff
- HTML formatting support
- Message queue for offline support

**Required packages**: `telegraf`, `node-fetch`

### 2. DiscordAdapter.ts (237 lines)
- Connects via discord.js library
- Supports Guild, DM, and message content intents
- Media attachment support
- Markdown formatting (bold, italic, code blocks)
- Message queue for offline support
- 2000 character message limit handling
- Pin status tracking
- Reply detection

**Required packages**: `discord.js`

### 3. WhatsAppAdapter.ts (257 lines)
- Supports both whatsapp-web.js and Twilio provider
- QR code scanning support
- Media message handling with base64 encoding
- WhatsApp-specific formatting (bold, italic, strikethrough, code)
- Message threading
- Automatic reconnection
- Group message detection

**Required packages**: `whatsapp-web.js` or `twilio`

### 4. SlackAdapter.ts (246 lines)
- Connects via @slack/bolt framework
- Socket mode support for real-time events
- Block kit support for rich messaging
- File upload/download support
- Thread reply detection
- Emoji reaction tracking
- Message queue for offline messages

**Required packages**: `@slack/bolt`, `@slack/web-api`

### 5. SignalAdapter.ts (217 lines)
- Uses signal-cli command-line tool
- Signal group message support
- Media attachment support
- Markdown-style formatting
- Automatic phone number registration
- Secure messaging compliance
- CLI-based implementation

**Required packages**: `signal-cli` (external tool)

### 6. EmailAdapter.ts (289 lines)
- SMTP support for sending emails
- IMAP polling for incoming emails
- HTML email formatting
- Attachment support with MIME types
- Email header handling
- Auto-reconnection logic
- Unread email polling (30-second intervals)

**Required packages**: `nodemailer`, `imap-simple`

### 7. WebhookAdapter.ts (248 lines)
- Generic webhook handler for any platform
- Express server for receiving webhooks
- Bearer token authentication
- Health check endpoint
- Custom metadata support
- JSON payload conversion
- Both inbound and outbound support

**Required packages**: `express`, `node-fetch`

### 8. MatrixAdapter.ts (280 lines)
- Connects to Matrix/Synapse homeservers
- User authentication with credentials
- Media upload support
- Markdown formatting support
- Room timeline event handling
- mxc:// URL conversion for media
- Edit tracking
- Reply-to support

**Required packages**: `matrix-js-sdk`

### 9. SMSAdapter.ts (232 lines)
- Supports Twilio or AWS SNS providers
- SMS character limit handling (160 chars)
- Status tracking
- Configurable rate limiting (500ms)
- Multi-part message support
- Message metadata tracking

**Required packages**: `twilio` or `@aws-sdk/client-sns`

### 10. IRCAdapter.ts (286 lines)
- Connects to IRC servers via irc library
- Channel join/part events
- Private message handling
- IRC formatting support (bold, italic, underline, color)
- Multi-channel support
- Automatic rejoin on disconnect
- TLS/SSL support (port 6697)
- Kick/ban event handling

**Required packages**: `irc`

### 11. TeamsAdapter.ts (276 lines)
- Microsoft Teams Bot Framework integration
- Adaptive Card support for rich messaging
- Proactive messaging capability
- Express webhook server
- Media attachment support
- Mention detection
- Channel-specific messaging

**Required packages**: `botbuilder`, `botbuilder-teams`

## Common Features Across All Adapters

### Core Functionality
- ✅ `connect(): Promise<void>` - Platform connection with error handling
- ✅ `disconnect(): Promise<void>` - Graceful disconnection
- ✅ `sendMessage(channelId, message): Promise<void>` - Send platform-specific messages
- ✅ `onMessage` callback - Handle incoming messages

### Message Handling
- ✅ Platform-specific format conversion (to/from NexusMessage)
- ✅ Media upload/download support where applicable
- ✅ Rich text formatting (bold, italic, code, etc.)
- ✅ Metadata preservation and conversion

### Reliability
- ✅ Automatic reconnection logic with exponential backoff
- ✅ Message queue for offline support
- ✅ Error handling with proper logging
- ✅ Rate limit enforcement to prevent API throttling
- ✅ Dynamic imports with try/catch for missing packages

### Configuration
Each adapter accepts an `AdapterConfig` object with:
```typescript
{
  platform: string;           // Platform name
  credentials: {              // Platform-specific credentials
    [key: string]: any;
  };
}
```

## Usage Example

```typescript
import { TelegramAdapter } from './adapters/TelegramAdapter.js';
import { NexusMessage } from '../types/index.js';

const adapter = new TelegramAdapter({
  platform: 'telegram',
  credentials: {
    token: 'YOUR_TELEGRAM_BOT_TOKEN'
  }
});

await adapter.connect();

const message: NexusMessage = {
  id: 'msg-123',
  platform: 'telegram',
  channelId: '12345',
  sender: { id: 'bot', username: 'nexusbot', displayName: 'NexusBot' },
  text: 'Hello from NexusMind!',
  timestamp: new Date(),
};

await adapter.sendMessage('12345', message);

adapter.onMessage = async (msg) => {
  console.log('Received:', msg);
};

await adapter.disconnect();
```

## Rate Limiting

Each adapter implements platform-specific rate limiting:
- Telegram: 30ms between messages
- Discord: 1000ms between messages
- Slack: 50ms between messages
- Email: 100ms between messages
- SMS: 500ms between messages
- Others: 50-100ms based on platform requirements

## Error Handling

All adapters include:
- Try/catch blocks for all async operations
- Automatic reconnection with max attempts limit
- Detailed error logging
- Message queue for failed sends
- Graceful degradation when packages are missing

## Type Imports

All adapters import types from `../../types/index.js`:
- `NexusMessage` - Unified message format
- `AdapterConfig` - Adapter configuration interface

Logger imported from `../../utils/logger.js` for consistent logging across the platform.
