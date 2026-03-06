import { logger } from '../utils/logger.js';
import type { Message, RoutingRule } from '../types/index.js';

/**
 * MessageRouter - Routes incoming messages to the correct agent
 * Routes based on platform, channel, user, and custom rules
 */
export class MessageRouter {
  private routes: RoutingRule[] = [];
  private defaultAgentId: string = 'default-agent';
  private userAgentMap: Map<string, string> = new Map();
  private channelAgentMap: Map<string, Map<string, string>> = new Map();

  /**
   * Add a routing rule
   */
  addRoute(rule: RoutingRule): void {
    try {
      // Check for duplicate route
      const exists = this.routes.some(r =>
        r.platform === rule.platform &&
        r.channel === rule.channel &&
        r.agentId === rule.agentId
      );

      if (!exists) {
        this.routes.push(rule);
        
        // Add to channel map for faster lookup
        if (!this.channelAgentMap.has(rule.platform)) {
          this.channelAgentMap.set(rule.platform, new Map());
        }
        this.channelAgentMap.get(rule.platform)!.set(rule.channel, rule.agentId);

        logger.debug('Route added', rule);
      }
    } catch (error) {
      logger.error('Failed to add route', { error, rule });
      throw error;
    }
  }

  /**
   * Remove a routing rule
   */
  removeRoute(platform: string, channel: string): void {
    try {
      this.routes = this.routes.filter(r =>
        !(r.platform === platform && r.channel === channel)
      );

      const channelMap = this.channelAgentMap.get(platform);
      if (channelMap) {
        channelMap.delete(channel);
      }

      logger.debug('Route removed', { platform, channel });
    } catch (error) {
      logger.error('Failed to remove route', { error, platform, channel });
      throw error;
    }
  }

  /**
   * Route a message to an agent
   */
  route(message: Message): string | null {
    try {
      // Check user-specific routing first
      if (message.userId) {
        const userAgent = this.userAgentMap.get(message.userId);
        if (userAgent) {
          logger.debug('Routed by user mapping', {
            userId: message.userId,
            agentId: userAgent
          });
          return userAgent;
        }
      }

      // Check channel-specific routing
      if (message.platform && message.channel) {
        const channelMap = this.channelAgentMap.get(message.platform);
        if (channelMap) {
          const agentId = channelMap.get(message.channel);
          if (agentId) {
            logger.debug('Routed by channel mapping', {
              platform: message.platform,
              channel: message.channel,
              agentId
            });
            return agentId;
          }
        }
      }

      // Check platform-wide routing
      if (message.platform) {
        const channelMap = this.channelAgentMap.get(message.platform);
        if (channelMap) {
          const agentId = channelMap.get('*');
          if (agentId) {
            logger.debug('Routed by platform mapping', {
              platform: message.platform,
              agentId
            });
            return agentId;
          }
        }
      }

      // Use default agent
      logger.debug('Using default agent routing', {
        messageId: message.id,
        agentId: this.defaultAgentId
      });

      return this.defaultAgentId;
    } catch (error) {
      logger.error('Message routing failed', { error, messageId: message.id });
      return this.defaultAgentId;
    }
  }

  /**
   * Set default agent
   */
  setDefaultAgent(agentId: string): void {
    this.defaultAgentId = agentId;
    logger.info('Default agent set', { agentId });
  }

  /**
   * Map a user to an agent
   */
  mapUserToAgent(userId: string, agentId: string): void {
    this.userAgentMap.set(userId, agentId);
    logger.debug('User mapped to agent', { userId, agentId });
  }

  /**
   * Unmap a user
   */
  unmapUser(userId: string): void {
    this.userAgentMap.delete(userId);
    logger.debug('User unmapped', { userId });
  }

  /**
   * Get user to agent mappings
   */
  getUserMappings(): Record<string, string> {
    const mappings: Record<string, string> = {};
    this.userAgentMap.forEach((agentId, userId) => {
      mappings[userId] = agentId;
    });
    return mappings;
  }

  /**
   * Get all routing rules
   */
  getRoutes(): RoutingRule[] {
    return [...this.routes];
  }

  /**
   * Get routes for a platform
   */
  getPlatformRoutes(platform: string): RoutingRule[] {
    return this.routes.filter(r => r.platform === platform);
  }

  /**
   * Get routes for a channel
   */
  getChannelRoutes(platform: string, channel: string): RoutingRule[] {
    return this.routes.filter(r =>
      r.platform === platform && r.channel === channel
    );
  }

  /**
   * Check if a route exists
   */
  hasRoute(platform: string, channel: string): boolean {
    return this.routes.some(r =>
      r.platform === platform && r.channel === channel
    );
  }

  /**
   * Clear all routing rules
   */
  clear(): void {
    this.routes = [];
    this.userAgentMap.clear();
    this.channelAgentMap.clear();
    logger.info('All routing rules cleared');
  }

  /**
   * Get routing statistics
   */
  getStats(): {
    totalRoutes: number;
    userMappings: number;
    platformCount: number;
  } {
    return {
      totalRoutes: this.routes.length,
      userMappings: this.userAgentMap.size,
      platformCount: this.channelAgentMap.size
    };
  }

  /**
   * Validate routing configuration
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.routes.length === 0 && this.userAgentMap.size === 0) {
      errors.push('No routing rules configured');
    }

    for (const rule of this.routes) {
      if (!rule.platform) {
        errors.push('Route missing platform');
      }
      if (!rule.channel) {
        errors.push('Route missing channel');
      }
      if (!rule.agentId) {
        errors.push('Route missing agentId');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default MessageRouter;
