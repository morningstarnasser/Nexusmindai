/**
 * NexusMind Message Formatters
 * Format messages for different platforms and content types
 */

import { Platform } from '../types/message.js';

// NexusMessage extends the base Message with platform-specific fields
type NexusMessage = any;

/**
 * Markdown formatter options
 */
export interface MarkdownFormatterOptions {
  includeAuthor?: boolean;
  includeTimestamp?: boolean;
  includeReactions?: boolean;
  codeBlockLanguage?: string;
}

/**
 * HTML formatter options
 */
export interface HTMLFormatterOptions {
  includeStyles?: boolean;
  includeAuthor?: boolean;
  includeTimestamp?: boolean;
  includeReactions?: boolean;
  containerClass?: string;
}

/**
 * Text formatter options
 */
export interface TextFormatterOptions {
  includeAuthor?: boolean;
  includeTimestamp?: boolean;
  includeMetadata?: boolean;
  lineLength?: number;
}

/**
 * Format message as Markdown
 */
export function formatAsMarkdown(
  message: NexusMessage,
  options: MarkdownFormatterOptions = {},
): string {
  const {
    includeAuthor = true,
    includeTimestamp = true,
    includeReactions = true,
    codeBlockLanguage = 'text',
  } = options;

  let markdown = '';

  // Header with author and timestamp
  if (includeAuthor || includeTimestamp) {
    markdown += '---\n';
    if (includeAuthor) {
      markdown += `**Author**: ${message.author.displayName} (@${message.author.username})\n`;
    }
    if (includeTimestamp) {
      markdown += `**Sent**: ${message.timestamp.toISOString()}\n`;
    }
    markdown += '---\n\n';
  }

  // Main content
  markdown += message.content + '\n';

  // Embeds
  if (message.embeds.length > 0) {
    markdown += '\n';
    for (const embed of message.embeds) {
      if (embed.title) {
        markdown += `\n### ${embed.title}\n`;
      }
      if (embed.description) {
        markdown += `${embed.description}\n`;
      }
      if (embed.fields) {
        for (const field of embed.fields) {
          markdown += `\n**${field.name}**: ${field.value}\n`;
        }
      }
    }
  }

  // Attachments
  if (message.attachments.length > 0) {
    markdown += '\n#### Attachments\n';
    for (const attachment of message.attachments) {
      markdown += `- [${attachment.filename}](${attachment.url}) (${attachment.mimeType})\n`;
    }
  }

  // Reactions
  if (includeReactions && message.reactions.length > 0) {
    markdown += '\n#### Reactions\n';
    for (const reaction of message.reactions) {
      markdown += `${reaction.emoji} ×${reaction.count} `;
    }
    markdown += '\n';
  }

  // Metadata
  if (message.tags.length > 0) {
    markdown += `\n**Tags**: ${message.tags.map((tag) => `\`${tag}\``).join(', ')}\n`;
  }

  return markdown;
}

/**
 * Format message as HTML
 */
export function formatAsHTML(
  message: NexusMessage,
  options: HTMLFormatterOptions = {},
): string {
  const {
    includeStyles = true,
    includeAuthor = true,
    includeTimestamp = true,
    includeReactions = true,
    containerClass = 'nexus-message',
  } = options;

  let html = '';

  // Styles
  if (includeStyles) {
    html += `
<style>
  .${containerClass} { padding: 16px; border-radius: 8px; background: #f5f5f5; font-family: system-ui; }
  .${containerClass}-header { margin-bottom: 12px; font-size: 12px; color: #666; }
  .${containerClass}-author { font-weight: bold; color: #333; }
  .${containerClass}-content { margin: 8px 0; }
  .${containerClass}-embeds { margin: 8px 0; }
  .${containerClass}-embed { padding: 8px; background: white; border-left: 4px solid #0099ff; margin: 4px 0; }
  .${containerClass}-attachments { margin: 8px 0; }
  .${containerClass}-reactions { margin: 8px 0; }
</style>
`;
  }

  html += `<div class="${containerClass}">`;

  // Header
  if (includeAuthor || includeTimestamp) {
    html += `<div class="${containerClass}-header">`;
    if (includeAuthor) {
      html += `<span class="${containerClass}-author">${escapeHTML(message.author.displayName)}</span>`;
      html += ` @${escapeHTML(message.author.username)}`;
    }
    if (includeTimestamp) {
      html += ` · ${message.timestamp.toLocaleString()}`;
    }
    html += '</div>';
  }

  // Content
  html += `<div class="${containerClass}-content">${escapeHTML(message.content)}</div>`;

  // Embeds
  if (message.embeds.length > 0) {
    html += `<div class="${containerClass}-embeds">`;
    for (const embed of message.embeds) {
      html += `<div class="${containerClass}-embed">`;
      if (embed.title) {
        html += `<h4>${escapeHTML(embed.title)}</h4>`;
      }
      if (embed.description) {
        html += `<p>${escapeHTML(embed.description)}</p>`;
      }
      if (embed.fields) {
        for (const field of embed.fields) {
          html += `<div><strong>${escapeHTML(field.name)}:</strong> ${escapeHTML(field.value)}</div>`;
        }
      }
      html += '</div>';
    }
    html += '</div>';
  }

  // Attachments
  if (message.attachments.length > 0) {
    html += `<div class="${containerClass}-attachments"><strong>Attachments:</strong>`;
    for (const attachment of message.attachments) {
      html += `<a href="${escapeHTML(attachment.url)}" target="_blank">${escapeHTML(attachment.filename)}</a> `;
    }
    html += '</div>';
  }

  // Reactions
  if (includeReactions && message.reactions.length > 0) {
    html += `<div class="${containerClass}-reactions">`;
    for (const reaction of message.reactions) {
      html += `<span title="${reaction.users.map((u) => u.username).join(', ')}">${reaction.emoji}×${reaction.count}</span> `;
    }
    html += '</div>';
  }

  html += '</div>';

  return html;
}

/**
 * Format message as plain text
 */
export function formatAsPlainText(
  message: NexusMessage,
  options: TextFormatterOptions = {},
): string {
  const {
    includeAuthor = true,
    includeTimestamp = true,
    includeMetadata = true,
    lineLength = 80,
  } = options;

  let text = '';

  // Header
  if (includeAuthor || includeTimestamp) {
    if (includeAuthor) {
      text += `From: ${message.author.displayName} (@${message.author.username})\n`;
    }
    if (includeTimestamp) {
      text += `Date: ${message.timestamp.toLocaleString()}\n`;
    }
    text += '\n';
  }

  // Content
  text += wrapText(message.content, lineLength) + '\n';

  // Embeds
  if (message.embeds.length > 0) {
    text += '\n--- Embeds ---\n';
    for (const embed of message.embeds) {
      if (embed.title) {
        text += `\n${embed.title}\n`;
      }
      if (embed.description) {
        text += wrapText(embed.description, lineLength) + '\n';
      }
      if (embed.fields) {
        for (const field of embed.fields) {
          text += `${field.name}: ${field.value}\n`;
        }
      }
    }
  }

  // Attachments
  if (message.attachments.length > 0) {
    text += '\n--- Attachments ---\n';
    for (const attachment of message.attachments) {
      text += `${attachment.filename} (${attachment.mimeType})\n`;
    }
  }

  // Reactions
  if (message.reactions.length > 0) {
    text += '\n--- Reactions ---\n';
    for (const reaction of message.reactions) {
      text += `${reaction.emoji} (${reaction.count})\n`;
    }
  }

  // Metadata
  if (includeMetadata && message.metadata && Object.keys(message.metadata).length > 0) {
    text += '\n--- Metadata ---\n';
    for (const [key, value] of Object.entries(message.metadata)) {
      text += `${key}: ${JSON.stringify(value)}\n`;
    }
  }

  return text;
}

/**
 * Format message for specific platform
 */
export function formatForPlatform(message: NexusMessage, platform?: Platform): string {
  const targetPlatform = platform ?? message.platform;

  switch (targetPlatform) {
    case Platform.DISCORD:
      return formatForDiscord(message);
    case Platform.TELEGRAM:
      return formatForTelegram(message);
    case Platform.SLACK:
      return formatForSlack(message);
    case Platform.TWITTER:
      return formatForTwitter(message);
    default:
      return message.content;
  }
}

/**
 * Format message for Discord
 */
function formatForDiscord(message: NexusMessage): string {
  let content = message.content;

  // Add mentions
  if (message.mentions.users.length > 0) {
    content = message.mentions.users.map((u) => `<@${u.id}>`).join(' ') + ' ' + content;
  }

  return content;
}

/**
 * Format message for Telegram
 */
function formatForTelegram(message: NexusMessage): string {
  let content = '';

  if (message.author) {
    content += `<b>${escapeHTML(message.author.displayName)}</b>\n`;
  }

  content += message.content + '\n';

  if (message.attachments.length > 0) {
    content += '\n<b>Attachments:</b>\n';
    for (const attachment of message.attachments) {
      content += `<a href="${attachment.url}">${escapeHTML(attachment.filename)}</a>\n`;
    }
  }

  return content;
}

/**
 * Format message for Slack
 */
function formatForSlack(message: NexusMessage): string {
  const slack = {
    text: message.content,
    attachments: [] as any[],
  };

  // Format embeds as attachments
  for (const embed of message.embeds) {
    slack.attachments.push({
      title: embed.title,
      text: embed.description,
      color: embed.color ?? '#0099ff',
      fields: embed.fields?.map((f) => ({
        title: f.name,
        value: f.value,
        short: f.inline,
      })),
    });
  }

  return JSON.stringify(slack);
}

/**
 * Format message for Twitter
 */
function formatForTwitter(message: NexusMessage): string {
  // Twitter has a 280 character limit
  const maxLength = 280;
  let content = message.content;

  if (content.length > maxLength) {
    content = content.substring(0, maxLength - 3) + '...';
  }

  // Add hashtags if available
  if (message.tags.length > 0) {
    const hashtags = message.tags.map((tag) => `#${tag}`).join(' ');
    if (content.length + hashtags.length + 1 <= maxLength) {
      content += ' ' + hashtags;
    }
  }

  return content;
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Wrap text to specified line length
 */
export function wrapText(text: string, lineLength: number = 80): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 > lineLength) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join('\n');
}

/**
 * Convert message to JSON
 */
export function toJSON(message: NexusMessage): string {
  return JSON.stringify(message, null, 2);
}

/**
 * Create summary of message
 */
export function createSummary(message: NexusMessage, maxLength: number = 100): string {
  let summary = message.content;

  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + '...';
  }

  if (message.attachments.length > 0) {
    summary += ` (+${message.attachments.length} attachment${message.attachments.length !== 1 ? 's' : ''})`;
  }

  return summary;
}
