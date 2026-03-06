/**
 * EpisodicMemory.ts
 * 
 * Markdown file-based storage for detailed interaction logs,
 * decision rationales, and human-readable audit trails.
 */

import { Logger } from '../utils/logger.js';
import { IMemoryEntry } from '../types/index.js';

interface EpisodicEntry {
  timestamp: Date;
  type: 'interaction' | 'decision' | 'action' | 'error' | 'milestone';
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  relatedEntries?: string[];
}

/**
 * EpisodicMemory - Human-readable episodic logs
 */
export class EpisodicMemory {
  private logger: Logger;
  private entries: EpisodicEntry[] = [];
  private maxEntries: number = 5000;

  constructor() {
    this.logger = new Logger('EpisodicMemory');
  }

  /**
   * Initialize episodic memory
   */
  async initialize(): Promise<void> {
    this.logger.debug('Initialized EpisodicMemory');
  }

  /**
   * Log an entry
   */
  async logEntry(entry: IMemoryEntry): Promise<void> {
    try {
      const episodic: EpisodicEntry = {
        timestamp: entry.timestamp,
        type: (entry.metadata?.entryType as any) || 'interaction',
        title: entry.metadata?.title as string || `Entry ${entry.id}`,
        content: entry.content,
        metadata: entry.metadata || {},
      };

      this.entries.push(episodic);

      // Maintain max size
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(-this.maxEntries);
      }

      this.logger.debug(`Logged episodic entry: ${episodic.title}`);
    } catch (error) {
      this.logger.error('Error logging episodic entry', error);
      throw error;
    }
  }

  /**
   * Log a decision with rationale
   */
  async logDecision(
    title: string,
    rationale: string,
    decision: string,
    alternatives: string[] = [],
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const content = this.formatDecisionLog(decision, rationale, alternatives);

      const entry: EpisodicEntry = {
        timestamp: new Date(),
        type: 'decision',
        title,
        content,
        metadata: {
          ...metadata,
          decision,
          alternatives,
        },
      };

      this.entries.push(entry);
      this.logger.debug(`Logged decision: ${title}`);
    } catch (error) {
      this.logger.error('Error logging decision', error);
      throw error;
    }
  }

  /**
   * Format decision log in markdown
   */
  private formatDecisionLog(
    decision: string,
    rationale: string,
    alternatives: string[]
  ): string {
    let md = `## Decision\n\n${decision}\n\n`;
    md += `## Rationale\n\n${rationale}\n\n`;
    
    if (alternatives.length > 0) {
      md += `## Alternatives Considered\n\n`;
      alternatives.forEach((alt, i) => {
        md += `- ${alt}\n`;
      });
    }

    return md;
  }

  /**
   * Log an action with outcome
   */
  async logAction(
    title: string,
    action: string,
    outcome: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const content = `### Action\n${action}\n\n### Outcome\n${outcome}`;

      const entry: EpisodicEntry = {
        timestamp: new Date(),
        type: 'action',
        title,
        content,
        metadata: { ...metadata, action, outcome },
      };

      this.entries.push(entry);
      this.logger.debug(`Logged action: ${title}`);
    } catch (error) {
      this.logger.error('Error logging action', error);
      throw error;
    }
  }

  /**
   * Log an error
   */
  async logError(
    title: string,
    error: Error,
    context: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const content = `### Error\n\n${error.message}\n\n### Stack\n\n\`\`\`\n${error.stack}\n\`\`\``;

      const entry: EpisodicEntry = {
        timestamp: new Date(),
        type: 'error',
        title,
        content,
        metadata: { ...context, errorMessage: error.message, errorStack: error.stack },
      };

      this.entries.push(entry);
      this.logger.debug(`Logged error: ${title}`);
    } catch (error) {
      this.logger.error('Error logging error', error);
    }
  }

  /**
   * Log a milestone
   */
  async logMilestone(
    title: string,
    description: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const content = `### Milestone\n\n${description}`;

      const entry: EpisodicEntry = {
        timestamp: new Date(),
        type: 'milestone',
        title,
        content,
        metadata,
      };

      this.entries.push(entry);
      this.logger.debug(`Logged milestone: ${title}`);
    } catch (error) {
      this.logger.error('Error logging milestone', error);
      throw error;
    }
  }

  /**
   * Get entries by type
   */
  getEntriesByType(type: EpisodicEntry['type'], limit: number = 100): EpisodicEntry[] {
    return this.entries
      .filter(e => e.type === type)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get recent entries
   */
  getRecent(limit: number = 50): EpisodicEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  /**
   * Search entries
   */
  search(query: string, limit: number = 50): EpisodicEntry[] {
    const lowerQuery = query.toLowerCase();
    
    return this.entries
      .filter(e => 
        e.title.toLowerCase().includes(lowerQuery) ||
        e.content.toLowerCase().includes(lowerQuery)
      )
      .slice(-limit)
      .reverse();
  }

  /**
   * Export entries as markdown
   */
  async exportAsMarkdown(): Promise<string> {
    try {
      let md = `# NexusMind Episodic Memory\n\n`;
      md += `Generated: ${new Date().toISOString()}\n\n`;
      md += `Total Entries: ${this.entries.length}\n\n`;
      md += `---\n\n`;

      for (const entry of this.entries.slice(-1000).reverse()) {
        md += `## ${entry.title}\n\n`;
        md += `**Type**: ${entry.type}\n`;
        md += `**Time**: ${entry.timestamp.toISOString()}\n\n`;
        md += entry.content;
        md += '\n\n---\n\n';
      }

      return md;
    } catch (error) {
      this.logger.error('Error exporting markdown', error);
      throw error;
    }
  }

  /**
   * Export entries as JSON
   */
  async exportAsJSON(): Promise<EpisodicEntry[]> {
    return this.entries.slice(-1000).reverse();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    byType: Record<string, number>;
    oldestEntry?: Date;
    newestEntry?: Date;
    averageEntriesPerDay: number;
  } {
    const byType: Record<string, number> = {
      interaction: 0,
      decision: 0,
      action: 0,
      error: 0,
      milestone: 0,
    };

    for (const entry of this.entries) {
      byType[entry.type]++;
    }

    const now = Date.now();
    const oldestTime = Math.min(...this.entries.map(e => e.timestamp.getTime()));
    const daysSinceOldest = (now - oldestTime) / (1000 * 60 * 60 * 24);

    return {
      totalEntries: this.entries.length,
      byType,
      oldestEntry: this.entries.length > 0 ? new Date(oldestTime) : undefined,
      newestEntry: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : undefined,
      averageEntriesPerDay: daysSinceOldest > 0 ? this.entries.length / daysSinceOldest : 0,
    };
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.entries = [];
    this.logger.info('Cleared episodic memory');
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    await this.clear();
    this.logger.info('EpisodicMemory shutdown');
  }
}

export default EpisodicMemory;
