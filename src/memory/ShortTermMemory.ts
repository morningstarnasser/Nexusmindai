/**
 * ShortTermMemory.ts
 * 
 * SQLite-backed storage for recent conversations, pending tasks,
 * and user preferences. Retains data for 7 days.
 */

import { Logger } from '../utils/logger.js';
import { IMemoryEntry, ISearchResult } from '../types/index.js';

interface ShortTermEntry extends IMemoryEntry {
  expiresAt: Date;
  searchable: boolean;
}

/**
 * ShortTermMemory - Recent context storage (7 days)
 */
export class ShortTermMemory {
  private logger: Logger;
  private entries: Map<string, ShortTermEntry> = new Map();
  private retentionDays: number = 7;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(retentionDays: number = 7) {
    this.logger = new Logger('ShortTermMemory');
    this.retentionDays = retentionDays;
  }

  /**
   * Initialize short-term memory
   */
  async initialize(): Promise<void> {
    this.logger.debug(`Initialized ShortTermMemory with ${this.retentionDays} day retention`);
    
    // Start periodic cleanup
    this.cleanupInterval = setInterval(async () => {
      await this.cleanup();
    }, 3600000); // Run hourly
  }

  /**
   * Store entry in short-term memory
   */
  async store(entry: IMemoryEntry): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.retentionDays);

      const shortTermEntry: ShortTermEntry = {
        ...entry,
        expiresAt,
        searchable: true,
      };

      this.entries.set(entry.id, shortTermEntry);
      this.logger.debug(`Stored entry in short-term: ${entry.id}`);
    } catch (error) {
      this.logger.error('Error storing in short-term memory', error);
      throw error;
    }
  }

  /**
   * Retrieve entry from short-term memory
   */
  async retrieve(entryId: string): Promise<IMemoryEntry | null> {
    try {
      const entry = this.entries.get(entryId);
      if (!entry) return null;

      // Check if expired
      if (new Date() > entry.expiresAt) {
        this.entries.delete(entryId);
        return null;
      }

      return entry;
    } catch (error) {
      this.logger.error(`Error retrieving entry ${entryId}`, error);
      throw error;
    }
  }

  /**
   * Search entries in short-term memory
   */
  async search(query: string, limit: number = 20): Promise<ISearchResult[]> {
    try {
      const lowerQuery = query.toLowerCase();
      const results: ISearchResult[] = [];

      for (const entry of this.entries.values()) {
        // Skip expired entries
        if (new Date() > entry.expiresAt) {
          continue;
        }

        // Skip non-searchable entries
        if (!entry.searchable) {
          continue;
        }

        // Simple substring matching
        if (entry.content.toLowerCase().includes(lowerQuery)) {
          let relevanceScore = 0.5;

          // Boost if exact match at start
          if (entry.content.toLowerCase().startsWith(lowerQuery)) {
            relevanceScore = 0.9;
          } else if (entry.content.toLowerCase().includes(` ${lowerQuery}`)) {
            relevanceScore = 0.7;
          }

          results.push({
            entryId: entry.id,
            content: entry.content,
            relevanceScore,
            sources: [] as string[],
            tier: 'short-term',
          });
        }
      }

      // Sort by relevance and limit
      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`Error searching short-term memory`, error);
      throw error;
    }
  }

  /**
   * Delete entry from short-term memory
   */
  async delete(entryId: string): Promise<boolean> {
    try {
      return this.entries.delete(entryId);
    } catch (error) {
      this.logger.error(`Error deleting entry ${entryId}`, error);
      throw error;
    }
  }

  /**
   * Get all entries
   */
  async getAll(): Promise<IMemoryEntry[]> {
    const now = new Date();
    const valid: IMemoryEntry[] = [];

    for (const entry of this.entries.values()) {
      if (now <= entry.expiresAt) {
        valid.push(entry);
      }
    }

    return valid;
  }

  /**
   * Store pending task
   */
  async storePendingTask(taskId: string, taskData: unknown): Promise<void> {
    try {
      const entry: IMemoryEntry = {
        id: `task-${taskId}`,
        content: JSON.stringify(taskData),
        metadata: { type: 'pending-task', taskId },
        timestamp: new Date(),
        tier: 'short-term',
        accessCount: 0,
      };

      await this.store(entry);
      this.logger.debug(`Stored pending task: ${taskId}`);
    } catch (error) {
      this.logger.error(`Error storing pending task`, error);
      throw error;
    }
  }

  /**
   * Get pending tasks
   */
  async getPendingTasks(): Promise<Map<string, unknown>> {
    try {
      const tasks = new Map<string, unknown>();

      for (const entry of this.entries.values()) {
        if (entry.metadata?.type === 'pending-task') {
          const taskId = entry.metadata.taskId as string;
          try {
            tasks.set(taskId, JSON.parse(entry.content));
          } catch {
            tasks.set(taskId, entry.content);
          }
        }
      }

      return tasks;
    } catch (error) {
      this.logger.error('Error getting pending tasks', error);
      throw error;
    }
  }

  /**
   * Cache user preferences
   */
  async cacheUserPreference(key: string, value: unknown): Promise<void> {
    try {
      const entry: IMemoryEntry = {
        id: `pref-${key}`,
        content: JSON.stringify(value),
        metadata: { type: 'user-preference', preferenceKey: key },
        timestamp: new Date(),
        tier: 'short-term',
        accessCount: 1,
      };

      await this.store(entry);
    } catch (error) {
      this.logger.error(`Error caching preference ${key}`, error);
      throw error;
    }
  }

  /**
   * Get user preference
   */
  async getUserPreference(key: string): Promise<unknown | null> {
    try {
      const entry = await this.retrieve(`pref-${key}`);
      if (!entry) return null;

      try {
        return JSON.parse(entry.content);
      } catch {
        return entry.content;
      }
    } catch (error) {
      this.logger.error(`Error getting preference ${key}`, error);
      throw error;
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    totalEntries: number;
    validEntries: number;
    taskCount: number;
    preferenceCount: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const now = new Date();
    const entries = Array.from(this.entries.values());
    const valid = entries.filter(e => e.expiresAt > now);
    
    const taskCount = entries.filter(e => e.metadata?.type === 'pending-task').length;
    const preferenceCount = entries.filter(e => e.metadata?.type === 'user-preference').length;

    const timestamps = valid.map(e => e.timestamp.getTime());

    return {
      totalEntries: entries.length,
      validEntries: valid.length,
      taskCount,
      preferenceCount,
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined,
    };
  }

  /**
   * Cleanup expired entries
   */
  private async cleanup(): Promise<void> {
    try {
      const now = new Date();
      let removed = 0;

      for (const [id, entry] of this.entries.entries()) {
        if (now > entry.expiresAt) {
          this.entries.delete(id);
          removed++;
        }
      }

      if (removed > 0) {
        this.logger.debug(`Cleaned up ${removed} expired entries`);
      }
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.entries.clear();
    this.logger.info('Cleared short-term memory');
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    await this.clear();
    this.logger.info('ShortTermMemory shutdown');
  }
}

export default ShortTermMemory;
