/**
 * NexusMind Message Type Definitions
 * Core types for message handling across platforms
 */

/**
 * Supported messaging platforms
 */
export enum Platform {
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  SLACK = 'slack',
  TWITTER = 'twitter',
  WEBHOOK = 'webhook',
  INTERNAL = 'internal',
  EMAIL = 'email',
  IRC = 'irc',
  MATRIX = 'matrix',
  SMS = 'sms',
  SIGNAL = 'signal',
  WHATSAPP = 'whatsapp',
  TEAMS = 'teams',
}

/**
 * Message types for different content
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  EMBED = 'embed',
  INTERACTIVE = 'interactive',
  SYSTEM = 'system',
}

/**
 * User information embedded in messages
 */
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  isBot: boolean;
  isModerator: boolean;
}

/**
 * Channel information
 */
export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'dm' | 'group';
  topic?: string;
  description?: string;
  isPrivate: boolean;
  memberCount?: number;
  settings?: Record<string, unknown>;
}

/**
 * Media attachment in message
 */
export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'document';
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Embedded content (rich embeds)
 */
export interface Embed {
  title?: string;
  description?: string;
  url?: string;
  color?: string;
  thumbnail?: {
    url: string;
    width?: number;
    height?: number;
  };
  image?: {
    url: string;
    width?: number;
    height?: number;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
    iconUrl?: string;
  };
  author?: {
    name: string;
    iconUrl?: string;
    url?: string;
  };
  timestamp?: Date;
}

/**
 * Message reaction (emoji response)
 */
export interface Reaction {
  emoji: string;
  count: number;
  users: User[];
}

/**
 * Interactive components in messages
 */
export interface MessageComponent {
  type: 'button' | 'select' | 'text_input' | 'row';
  id?: string;
  label?: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
  placeholder?: string;
  options?: Array<{
    label: string;
    value: string;
    description?: string;
    default?: boolean;
  }>;
  components?: MessageComponent[];
}

/**
 * Core NexusMessage interface
 */
export interface NexusMessage {
  // Identification
  id: string;
  threadId?: string;
  parentMessageId?: string;

  // Content
  content: string;
  contentType: MessageType;
  attachments: MediaAttachment[];
  embeds: Embed[];
  components: MessageComponent[];

  // Metadata
  platform: Platform;
  channel: Channel;
  author: User;
  timestamp: Date;
  editedAt?: Date;

  // Reactions
  reactions: Reaction[];
  mentions: {
    users: User[];
    roles: string[];
    channels: Channel[];
  };

  // Processing
  processed: boolean;
  processedAt?: Date;
  processingDuration?: number;

  // References
  webhook?: {
    id: string;
    url: string;
  };

  // Custom metadata
  metadata?: Record<string, unknown>;
  tags?: string[];

  // Raw platform data
  rawPayload?: Record<string, unknown>;

  // Compatibility aliases
  text?: string;
  media?: MediaAttachment[];
  sender?: User;
}

/**
 * Message creation/update payload
 */
export interface MessagePayload {
  content: string;
  contentType?: MessageType;
  attachments?: MediaAttachment[];
  embeds?: Embed[];
  components?: MessageComponent[];
  metadata?: Record<string, unknown>;
  replyTo?: string;
  threadId?: string;
}

/**
 * Message filter for queries
 */
export interface MessageFilter {
  platform?: Platform;
  channelId?: string;
  authorId?: string;
  startDate?: Date;
  endDate?: Date;
  contentType?: MessageType;
  tags?: string[];
  processed?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Message processing result
 */
export interface MessageProcessingResult {
  messageId: string;
  success: boolean;
  response?: NexusMessage;
  error?: string;
  duration: number;
  modelUsed?: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

/**
 * Message context for processing
 */
export interface MessageContext {
  message: NexusMessage;
  history: NexusMessage[];
  agentId: string;
  skillsEnabled: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Batch message operation
 */
export interface BatchMessageOperation {
  operationType: 'create' | 'update' | 'delete' | 'process';
  messages: NexusMessage[];
  options?: {
    parallel?: boolean;
    timeout?: number;
    onProgress?: (completed: number, total: number) => void;
  };
}
