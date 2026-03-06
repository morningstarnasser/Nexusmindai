/**
 * AuditLogger.ts
 * 
 * Immutable audit trail for all security-relevant events.
 * Supports querying, filtering, and export for compliance.
 */

import { Logger } from '../utils/logger.js';

interface AuditEntry {
  id: string;
  timestamp: Date;
  eventType: string;
  subject?: string;
  action?: string;
  resource?: string;
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>;
  hash?: string; // For immutability verification
}

/**
 * AuditLogger - Immutable security audit trail
 */
export class AuditLogger {
  private logger: Logger;
  private entries: AuditEntry[] = [];
  private maxEntries: number = 50000;
  private entryCounter: number = 0;

  constructor() {
    this.logger = new Logger('AuditLogger');
  }

  /**
   * Initialize audit logger
   */
  async initialize(): Promise<void> {
    this.logger.debug('Initialized AuditLogger');
  }

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEntry, 'id' | 'result' | 'hash'>): Promise<string> {
    try {
      const entry: AuditEntry = {
        id: `audit-${++this.entryCounter}-${Date.now()}`,
        timestamp: event.timestamp || new Date(),
        eventType: event.eventType,
        subject: event.subject,
        action: event.action,
        resource: event.resource,
        metadata: event.metadata,
        result: event.result || 'success',
      };

      // Calculate hash for immutability (simplified)
      entry.hash = this.calculateHash(entry);

      this.entries.push(entry);

      // Maintain max size
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(-this.maxEntries);
      }

      return entry.id;
    } catch (error) {
      this.logger.error('Error logging audit event', error);
      throw error;
    }
  }

  /**
   * Calculate simple hash for entry
   */
  private calculateHash(entry: AuditEntry): string {
    const data = JSON.stringify({
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      subject: entry.subject,
      action: entry.action,
      resource: entry.resource,
    });

    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
    }

    return `hash_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Get audit entry by ID
   */
  getEntry(id: string): AuditEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  /**
   * Query audit log
   */
  query(options: {
    subject?: string;
    eventType?: string;
    action?: string;
    resource?: string;
    since?: Date;
    until?: Date;
    limit?: number;
  }): AuditEntry[] {
    let results = [...this.entries];

    if (options.subject) {
      results = results.filter(e => e.subject === options.subject);
    }

    if (options.eventType) {
      results = results.filter(e => e.eventType === options.eventType);
    }

    if (options.action) {
      results = results.filter(e => e.action === options.action);
    }

    if (options.resource) {
      results = results.filter(e => e.resource === options.resource);
    }

    if (options.since) {
      results = results.filter(e => e.timestamp >= options.since!);
    }

    if (options.until) {
      results = results.filter(e => e.timestamp <= options.until!);
    }

    const limit = options.limit || 1000;
    return results.slice(-limit);
  }

  /**
   * Get entries for subject
   */
  getSubjectHistory(subject: string, limit: number = 100): AuditEntry[] {
    return this.entries
      .filter(e => e.subject === subject)
      .slice(-limit);
  }

  /**
   * Get entries by event type
   */
  getEventsByType(eventType: string, limit: number = 100): AuditEntry[] {
    return this.entries
      .filter(e => e.eventType === eventType)
      .slice(-limit);
  }

  /**
   * Get recent entries
   */
  getRecent(limit: number = 50): AuditEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  /**
   * Verify audit trail integrity
   */
  verifyIntegrity(): {
    valid: boolean;
    invalidEntries: string[];
  } {
    const invalidEntries: string[] = [];

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expectedHash = this.calculateHash(entry);

      if (entry.hash !== expectedHash) {
        invalidEntries.push(entry.id);
      }
    }

    return {
      valid: invalidEntries.length === 0,
      invalidEntries,
    };
  }

  /**
   * Export audit log for compliance
   */
  async export(since?: Date): Promise<AuditEntry[]> {
    try {
      let results = [...this.entries];

      if (since) {
        results = results.filter(e => e.timestamp >= since);
      }

      return results.slice(-10000); // Last 10k entries
    } catch (error) {
      this.logger.error('Error exporting audit log', error);
      throw error;
    }
  }

  /**
   * Export as CSV
   */
  async exportAsCSV(since?: Date): Promise<string> {
    try {
      const entries = await this.export(since);

      const headers = ['ID', 'Timestamp', 'Event Type', 'Subject', 'Action', 'Resource', 'Result'];
      const rows = entries.map(e => [
        e.id,
        e.timestamp.toISOString(),
        e.eventType,
        e.subject || '',
        e.action || '',
        e.resource || '',
        e.result,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      return csv;
    } catch (error) {
      this.logger.error('Error exporting as CSV', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  getStats(): {
    totalEntries: number;
    eventTypes: Record<string, number>;
    subjects: string[];
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const eventTypes: Record<string, number> = {};
    const subjects = new Set<string>();

    for (const entry of this.entries) {
      eventTypes[entry.eventType] = (eventTypes[entry.eventType] || 0) + 1;
      if (entry.subject) subjects.add(entry.subject);
    }

    const timestamps = this.entries.map(e => e.timestamp.getTime());

    return {
      totalEntries: this.entries.length,
      eventTypes,
      subjects: Array.from(subjects),
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined,
    };
  }

  /**
   * Get log count
   */
  getLogCount(): number {
    return this.entries.length;
  }

  /**
   * Clear old entries (keep recent)
   */
  pruneOldEntries(keepDays: number): number {
    const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
    const beforeCount = this.entries.length;

    this.entries = this.entries.filter(e => e.timestamp >= cutoff);

    const removed = beforeCount - this.entries.length;
    this.logger.info(`Pruned ${removed} old audit entries`);

    return removed;
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.entries = [];
    this.entryCounter = 0;
    this.logger.info('Cleared audit log');
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    await this.clear();
    this.logger.info('AuditLogger shutdown');
  }
}

export default AuditLogger;
