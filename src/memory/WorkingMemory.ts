/**
 * WorkingMemory.ts
 * 
 * In-process memory with ring buffer for recent messages.
 * Provides fast access to current task state and recent context.
 */

import { Logger } from '../utils/logger.js';
import { IMemoryEntry } from '../types/index.js';

interface TaskState {
  id: string;
  name: string;
  startTime: Date;
  context: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * WorkingMemory - In-process ring buffer memory
 */
export class WorkingMemory {
  private logger: Logger;
  private buffer: IMemoryEntry[] = [];
  private taskStates: Map<string, TaskState> = new Map();
  private maxSize: number;
  private currentIndex: number = 0;

  constructor(maxSize: number = 100) {
    this.logger = new Logger('WorkingMemory');
    this.maxSize = maxSize;
  }

  /**
   * Initialize working memory
   */
  async initialize(): Promise<void> {
    this.logger.debug(`Initialized WorkingMemory with capacity ${this.maxSize}`);
  }

  /**
   * Add entry to working memory (ring buffer)
   */
  async add(entry: IMemoryEntry): Promise<void> {
    try {
      if (this.buffer.length < this.maxSize) {
        this.buffer.push(entry);
      } else {
        this.buffer[this.currentIndex] = entry;
        this.currentIndex = (this.currentIndex + 1) % this.maxSize;
      }
      this.logger.debug(`Added entry to working memory: ${entry.id}`);
    } catch (error) {
      this.logger.error('Error adding to working memory', error);
      throw error;
    }
  }

  /**
   * Get entry from working memory
   */
  async get(entryId: string): Promise<IMemoryEntry | null> {
    try {
      return this.buffer.find(e => e.id === entryId) || null;
    } catch (error) {
      this.logger.error(`Error getting entry ${entryId}`, error);
      throw error;
    }
  }

  /**
   * Get all entries
   */
  async getAll(): Promise<IMemoryEntry[]> {
    return [...this.buffer];
  }

  /**
   * Remove entry from working memory
   */
  async remove(entryId: string): Promise<boolean> {
    try {
      const index = this.buffer.findIndex(e => e.id === entryId);
      if (index > -1) {
        this.buffer.splice(index, 1);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error removing entry ${entryId}`, error);
      throw error;
    }
  }

  /**
   * Get recent entries (N most recent)
   */
  async getRecent(count: number = 10): Promise<IMemoryEntry[]> {
    return this.buffer.slice(-count);
  }

  /**
   * Set current task state
   */
  setTaskState(taskId: string, state: Partial<TaskState>): void {
    const existing = this.taskStates.get(taskId);
    this.taskStates.set(taskId, {
      id: taskId,
      name: state.name || existing?.name || '',
      startTime: state.startTime || existing?.startTime || new Date(),
      context: { ...existing?.context, ...state.context },
      status: state.status || existing?.status || 'pending',
    });
  }

  /**
   * Get current task state
   */
  getTaskState(taskId: string): TaskState | null {
    return this.taskStates.get(taskId) || null;
  }

  /**
   * Get all active task states
   */
  getActiveTaskStates(): TaskState[] {
    return Array.from(this.taskStates.values())
      .filter(t => t.status === 'running' || t.status === 'pending');
  }

  /**
   * Clear task state
   */
  clearTaskState(taskId: string): boolean {
    return this.taskStates.delete(taskId);
  }

  /**
   * Get buffer statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    usage: number;
    activeTaskCount: number;
  } {
    return {
      size: this.buffer.length,
      maxSize: this.maxSize,
      usage: (this.buffer.length / this.maxSize) * 100,
      activeTaskCount: this.getActiveTaskStates().length,
    };
  }

  /**
   * Clear all working memory
   */
  async clear(): Promise<void> {
    this.buffer = [];
    this.taskStates.clear();
    this.currentIndex = 0;
    this.logger.info('Cleared working memory');
  }

  /**
   * Shutdown working memory
   */
  async shutdown(): Promise<void> {
    await this.clear();
    this.logger.info('WorkingMemory shutdown');
  }
}

export default WorkingMemory;
