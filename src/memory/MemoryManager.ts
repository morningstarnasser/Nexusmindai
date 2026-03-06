/**
 * MemoryManager.ts
 * 
 * Orchestrates all 5 memory layers (Working, Short-Term, Long-Term, Knowledge Graph, Episodic).
 * Provides unified store(), recall(), search(), relate(), and forget() interfaces.
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
import { WorkingMemory } from './WorkingMemory.js';
import { ShortTermMemory } from './ShortTermMemory.js';
import { LongTermMemory } from './LongTermMemory.js';
import { KnowledgeGraph } from './KnowledgeGraph.js';
import { EpisodicMemory } from './EpisodicMemory.js';
import {
  IMemoryEntry,
  ISearchResult,
  IMemoryStats,
  IMemoryTier,
} from '../types/index.js';

interface ConsolidationConfig {
  enableAutoConsolidation: boolean;
  consolidationInterval: number; // ms
  thresholdAge: number; // ms
  thresholdAccessCount: number;
}

interface ConsolidationJob {
  fromTier: IMemoryTier;
  toTier: IMemoryTier;
  entries: IMemoryEntry[];
  timestamp: Date;
}

/**
 * MemoryManager - Unified interface for all memory layers
 */
export class MemoryManager extends EventEmitter {
  private logger: Logger;
  private workingMemory: WorkingMemory;
  private shortTermMemory: ShortTermMemory;
  private longTermMemory: LongTermMemory;
  private knowledgeGraph: KnowledgeGraph;
  private episodicMemory: EpisodicMemory;

  private consolidationConfig: ConsolidationConfig;
  private consolidationHistory: ConsolidationJob[] = [];
  private consolidationTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.logger = new Logger('MemoryManager');
    this.workingMemory = new WorkingMemory();
    this.shortTermMemory = new ShortTermMemory();
    this.longTermMemory = new LongTermMemory();
    this.knowledgeGraph = new KnowledgeGraph();
    this.episodicMemory = new EpisodicMemory();

    this.consolidationConfig = {
      enableAutoConsolidation: true,
      consolidationInterval: 60000, // 1 minute
      thresholdAge: 3600000, // 1 hour
      thresholdAccessCount: 5,
    };
  }

  /**
   * Initialize memory manager
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing MemoryManager');

      // Initialize all memory layers
      await Promise.all([
        this.workingMemory.initialize?.(),
        this.shortTermMemory.initialize?.(),
        this.longTermMemory.initialize?.(),
        this.knowledgeGraph.initialize?.(),
        this.episodicMemory.initialize?.(),
      ]);

      // Start consolidation if enabled
      if (this.consolidationConfig.enableAutoConsolidation) {
        this.startAutoConsolidation();
      }

      this.logger.info('MemoryManager initialized');
      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize MemoryManager', error);
      throw error;
    }
  }

  /**
   * Store information across appropriate memory layers
   */
  async store(
    content: string,
    metadata: Record<string, unknown> = {},
    tier: IMemoryTier = 'short-term'
  ): Promise<string> {
    try {
      const entry: IMemoryEntry = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content,
        metadata,
        timestamp: new Date(),
        tier,
        accessCount: 0,
      };

      // Store in appropriate layers
      if (tier === 'working' || tier === 'short-term') {
        await this.workingMemory.add(entry);
      }

      if (tier === 'short-term' || tier === 'long-term') {
        await this.shortTermMemory.store(entry);
      }

      if (tier === 'long-term') {
        // Extract entities and relationships for knowledge graph
        await this.extractAndStoreKnowledge(entry);
        await this.longTermMemory.store(entry);
      }

      // Always store in episodic memory for audit trail
      await this.episodicMemory.logEntry(entry);

      this.emit('stored', { entryId: entry.id, tier });
      return entry.id;
    } catch (error) {
      this.logger.error('Error storing memory', error);
      throw error;
    }
  }

  /**
   * Recall information from memory
   */
  async recall(
    entryId: string,
    updateAccessCount: boolean = true
  ): Promise<IMemoryEntry | null> {
    try {
      // Try working memory first
      let entry = await this.workingMemory.get(entryId);
      if (entry) {
        if (updateAccessCount) entry.accessCount++;
        return entry;
      }

      // Try short-term memory
      entry = await this.shortTermMemory.retrieve(entryId);
      if (entry) {
        if (updateAccessCount) entry.accessCount++;
        return entry;
      }

      // Try long-term memory
      entry = await this.longTermMemory.retrieve(entryId);
      if (entry) {
        if (updateAccessCount) entry.accessCount++;
        return entry;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error recalling memory ${entryId}`, error);
      throw error;
    }
  }

  /**
   * Search across all memory layers
   */
  async search(
    query: string,
    limit: number = 10,
    threshold: number = 0.5
  ): Promise<ISearchResult[]> {
    try {
      const results: Map<string, ISearchResult> = new Map();

      // Search short-term memory
      const shortTermResults = await this.shortTermMemory.search(query, limit);
      shortTermResults.forEach(result => {
        results.set(result.entryId, {
          ...result,
          sources: [...(result.sources || []), 'short-term'],
        });
      });

      // Search long-term memory (semantic)
      const longTermResults = await this.longTermMemory.search(query, limit);
      longTermResults.forEach(result => {
        const existing = results.get(result.entryId);
        if (existing) {
          existing.relevanceScore = Math.max(existing.relevanceScore, result.relevanceScore);
          existing.sources = [...new Set([...(existing.sources || []), 'long-term'])];
        } else {
          results.set(result.entryId, {
            ...result,
            sources: ['long-term'],
          });
        }
      });

      // Filter by threshold and sort
      const sortedResults = Array.from(results.values())
        .filter(r => r.relevanceScore >= threshold)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      this.emit('searched', { query, resultCount: sortedResults.length });
      return sortedResults;
    } catch (error) {
      this.logger.error(`Error searching memory for query: ${query}`, error);
      throw error;
    }
  }

  /**
   * Find relationships and related information
   */
  async relate(entityId: string, limit: number = 20): Promise<ISearchResult[]> {
    try {
      const neighbors = await this.knowledgeGraph.getNeighbors(entityId, limit);
      
      const results: ISearchResult[] = neighbors.map(neighbor => ({
        entryId: neighbor.targetId,
        content: neighbor.relationship,
        relevanceScore: 0.8,
        sources: ['knowledge-graph'],
        tier: 'long-term',
      }));

      return results;
    } catch (error) {
      this.logger.error(`Error finding relationships for ${entityId}`, error);
      throw error;
    }
  }

  /**
   * Forget or remove information
   */
  async forget(
    entryId: string,
    deletePermanently: boolean = false
  ): Promise<boolean> {
    try {
      const entry = await this.recall(entryId, false);
      if (!entry) {
        return false;
      }

      if (deletePermanently) {
        // Remove from all layers
        await this.workingMemory.remove(entryId);
        await this.shortTermMemory.delete(entryId);
        await this.longTermMemory.delete(entryId);

        // Log deletion
        await this.episodicMemory.logEntry({
          ...entry,
          tier: 'deleted',
          metadata: { ...entry.metadata, deletedAt: new Date() },
        });

        this.emit('forgotten', { entryId, permanent: true });
      } else {
        // Archive instead of delete
        await this.workingMemory.remove(entryId);
        this.emit('forgotten', { entryId, permanent: false });
      }

      return true;
    } catch (error) {
      this.logger.error(`Error forgetting memory ${entryId}`, error);
      throw error;
    }
  }

  /**
   * Extract entities and relationships for knowledge graph
   */
  private async extractAndStoreKnowledge(entry: IMemoryEntry): Promise<void> {
    try {
      // Simple entity extraction (in production, use NLP)
      const words = entry.content.split(/\s+/).filter(w => w.length > 3);
      
      // Add entities as nodes
      for (const word of words.slice(0, 5)) {
        await this.knowledgeGraph.addNode(word, 'concept', {
          sourceEntry: entry.id,
        });
      }

      // Add relationships
      if (words.length > 1) {
        for (let i = 0; i < words.length - 1; i++) {
          await this.knowledgeGraph.addEdge(words[i], words[i + 1], 'adjacent', {
            sourceEntry: entry.id,
          });
        }
      }
    } catch (error) {
      this.logger.debug('Error extracting knowledge', error);
    }
  }

  /**
   * Start automatic consolidation
   */
  private startAutoConsolidation(): void {
    this.consolidationTimer = setInterval(async () => {
      try {
        await this.consolidateMemory();
      } catch (error) {
        this.logger.error('Error during auto-consolidation', error);
      }
    }, this.consolidationConfig.consolidationInterval);
  }

  /**
   * Consolidate memory across tiers
   */
  async consolidateMemory(): Promise<ConsolidationJob[]> {
    try {
      const jobs: ConsolidationJob[] = [];
      const now = Date.now();
      const threshold = this.consolidationConfig.thresholdAge;

      // Get old entries from working memory
      const workingEntries = await this.workingMemory.getAll?.() || [];
      const oldWorking = workingEntries.filter(e => {
        const age = now - e.timestamp.getTime();
        return age > threshold;
      });

      // Consolidate working to short-term
      if (oldWorking.length > 0) {
        const job: ConsolidationJob = {
          fromTier: 'working',
          toTier: 'short-term',
          entries: oldWorking,
          timestamp: new Date(),
        };

        for (const entry of oldWorking) {
          await this.shortTermMemory.store(entry);
          await this.workingMemory.remove(entry.id);
        }

        jobs.push(job);
        this.logger.debug(`Consolidated ${oldWorking.length} entries from working to short-term`);
      }

      // Consolidate short-term to long-term based on access patterns
      const shortTermEntries = await this.shortTermMemory.getAll?.() || [];
      const frequentlyAccessed = shortTermEntries.filter(e =>
        e.accessCount >= this.consolidationConfig.thresholdAccessCount
      );

      if (frequentlyAccessed.length > 0) {
        const job: ConsolidationJob = {
          fromTier: 'short-term',
          toTier: 'long-term',
          entries: frequentlyAccessed,
          timestamp: new Date(),
        };

        for (const entry of frequentlyAccessed) {
          await this.longTermMemory.store(entry);
          await this.extractAndStoreKnowledge(entry);
        }

        jobs.push(job);
        this.logger.debug(`Consolidated ${frequentlyAccessed.length} entries from short-term to long-term`);
      }

      this.consolidationHistory.push(...jobs);
      this.emit('consolidated', { jobs });

      return jobs;
    } catch (error) {
      this.logger.error('Error consolidating memory', error);
      throw error;
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<IMemoryStats> {
    try {
      const workingCount = (await this.workingMemory.getAll?.())?.length || 0;
      const shortTermCount = (await this.shortTermMemory.getAll?.())?.length || 0;
      const longTermCount = (await this.longTermMemory.getAll?.())?.length || 0;
      const entityCount = await this.knowledgeGraph.getEntityCount?.() || 0;
      const relationshipCount = await this.knowledgeGraph.getEdgeCount?.() || 0;

      return {
        timestamp: new Date(),
        workingMemory: { count: workingCount, sizeBytes: workingCount * 1024 },
        shortTermMemory: { count: shortTermCount, sizeBytes: shortTermCount * 2048 },
        longTermMemory: { count: longTermCount, sizeBytes: longTermCount * 4096 },
        knowledgeGraph: {
          entities: entityCount,
          relationships: relationshipCount,
        },
        consolidationHistory: {
          total: this.consolidationHistory.length,
          lastConsolidation: this.consolidationHistory[this.consolidationHistory.length - 1]?.timestamp,
        },
      };
    } catch (error) {
      this.logger.error('Error getting memory stats', error);
      throw error;
    }
  }

  /**
   * Export all memory
   */
  async exportMemory(): Promise<Record<string, unknown>> {
    try {
      return {
        timestamp: new Date(),
        workingMemory: await this.workingMemory.getAll?.(),
        shortTermMemory: await this.shortTermMemory.getAll?.(),
        knowledgeGraph: await this.knowledgeGraph.export?.(),
        consolidationHistory: this.consolidationHistory.slice(-100),
      };
    } catch (error) {
      this.logger.error('Error exporting memory', error);
      throw error;
    }
  }

  /**
   * Clear all memory
   */
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        this.workingMemory.clear?.(),
        this.shortTermMemory.clear?.(),
        this.longTermMemory.clear?.(),
        this.knowledgeGraph.clear?.(),
      ]);

      this.consolidationHistory = [];
      this.logger.info('All memory cleared');
      this.emit('cleared');
    } catch (error) {
      this.logger.error('Error clearing memory', error);
      throw error;
    }
  }

  /**
   * Shutdown memory manager
   */
  async shutdown(): Promise<void> {
    try {
      if (this.consolidationTimer) {
        clearInterval(this.consolidationTimer);
      }

      await Promise.all([
        this.workingMemory.shutdown?.(),
        this.shortTermMemory.shutdown?.(),
        this.longTermMemory.shutdown?.(),
        this.knowledgeGraph.shutdown?.(),
        this.episodicMemory.shutdown?.(),
      ]);

      this.logger.info('MemoryManager shutdown');
      this.emit('shutdown');
    } catch (error) {
      this.logger.error('Error shutting down MemoryManager', error);
      throw error;
    }
  }
}

export default MemoryManager;
