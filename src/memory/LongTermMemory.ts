/**
 * LongTermMemory.ts
 * 
 * Vector store backed semantic search across all history.
 * Supports embedding generation and similarity matching.
 */

import { Logger } from '../utils/logger.js';
import { IMemoryEntry, ISearchResult } from '../types/index.js';

interface EmbeddedEntry {
  entry: IMemoryEntry;
  embedding: number[];
  normalized: boolean;
}

/**
 * LongTermMemory - Semantic search with embeddings
 */
export class LongTermMemory {
  private logger: Logger;
  private _store: Map<string, EmbeddedEntry> = new Map();
  private embeddingDimension: number = 768;

  constructor() {
    this.logger = new Logger('LongTermMemory');
  }

  /**
   * Initialize long-term memory
   */
  async initialize(): Promise<void> {
    this.logger.debug(`Initialized LongTermMemory with ${this.embeddingDimension}-dim embeddings`);
  }

  /**
   * Store entry with embedding
   */
  async store(entry: IMemoryEntry): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(entry.content);
      
      const embedded: EmbeddedEntry = {
        entry,
        embedding,
        normalized: false,
      };

      this._store.set(entry.id, embedded);
      this.logger.debug(`Stored embedded entry: ${entry.id}`);
    } catch (error) {
      this.logger.error('Error storing in long-term memory', error);
      throw error;
    }
  }

  /**
   * Retrieve entry from long-term memory
   */
  async retrieve(entryId: string): Promise<IMemoryEntry | null> {
    try {
      const embedded = this._store.get(entryId);
      return embedded?.entry || null;
    } catch (error) {
      this.logger.error(`Error retrieving entry ${entryId}`, error);
      throw error;
    }
  }

  /**
   * Semantic search using embeddings
   */
  async search(query: string, limit: number = 10): Promise<ISearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const results: Array<{ id: string; score: number; entry: IMemoryEntry }> = [];

      for (const [id, embedded] of this._store.entries()) {
        const similarity = this.cosineSimilarity(queryEmbedding, embedded.embedding);
        results.push({
          id,
          score: similarity,
          entry: embedded.entry,
        });
      }

      // Sort by similarity score and limit
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => ({
          entryId: r.id,
          content: r.entry.content,
          relevanceScore: r.score,
          sources: [] as string[],
          tier: 'long-term',
        }));
    } catch (error) {
      this.logger.error('Error searching long-term memory', error);
      throw error;
    }
  }

  /**
   * Generate embedding for text (mock implementation)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // In production, use a real embedding model (OpenAI, Hugging Face, etc.)
      // This is a simple mock that generates deterministic embeddings based on text
      const embedding = new Array(this.embeddingDimension).fill(0);
      
      // Hash-based deterministic embedding
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      // Use hash to seed random values
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };

      for (let i = 0; i < this.embeddingDimension; i++) {
        embedding[i] = seededRandom(hash + i);
      }

      return embedding;
    } catch (error) {
      this.logger.error('Error generating embedding', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find similar entries
   */
  async findSimilar(entryId: string, limit: number = 10): Promise<ISearchResult[]> {
    try {
      const embedded = this._store.get(entryId);
      if (!embedded) {
        return [];
      }

      const results: Array<{ id: string; score: number; entry: IMemoryEntry }> = [];

      for (const [id, other] of this._store.entries()) {
        if (id === entryId) continue;

        const similarity = this.cosineSimilarity(embedded.embedding, other.embedding);
        results.push({
          id,
          score: similarity,
          entry: other.entry,
        });
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => ({
          entryId: r.id,
          content: r.entry.content,
          relevanceScore: r.score,
          sources: [] as string[],
          tier: 'long-term',
        }));
    } catch (error) {
      this.logger.error(`Error finding similar entries to ${entryId}`, error);
      throw error;
    }
  }

  /**
   * Delete entry from long-term memory
   */
  async delete(entryId: string): Promise<boolean> {
    try {
      return this._store.delete(entryId);
    } catch (error) {
      this.logger.error(`Error deleting entry ${entryId}`, error);
      throw error;
    }
  }

  /**
   * Get all entries
   */
  async getAll(): Promise<IMemoryEntry[]> {
    return Array.from(this._store.values()).map(e => e.entry);
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    totalEntries: number;
    embeddingSize: number;
    storeSizeBytes: number;
  } {
    const entries = Array.from(this._store.values());
    const embeddingSize = this.embeddingDimension;
    const bytesPerEmbedding = embeddingSize * 8; // 8 bytes per float
    const storeSizeBytes = entries.length * bytesPerEmbedding;

    return {
      totalEntries: entries.length,
      embeddingSize,
      storeSizeBytes,
    };
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this._store.clear();
    this.logger.info('Cleared long-term memory');
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    await this.clear();
    this.logger.info('LongTermMemory shutdown');
  }
}

export default LongTermMemory;
