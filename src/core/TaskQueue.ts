import EventEmitter from 'events';
import { logger } from '../utils/logger.js';
import type { Task, TaskPriority, TaskStatus } from '../types/index.js';

/**
 * TaskQueue - Priority-based task queue with concurrency control
 * Supports P0-P4 priority levels, task timeouts, and retry logic
 */
export class TaskQueue extends EventEmitter {
  private queue: Task[] = [];
  private processing: Map<string, Task> = new Map();
  private completed: Map<string, Task> = new Map();
  private failed: Map<string, Task> = new Map();
  private maxConcurrent: number = 10;
  private enableRetry: boolean = true;
  private maxRetries: number = 3;
  private taskTimeout: number = 30000; // 30 seconds
  private isRunning: boolean = false;
  private priorityLevels = new Map<TaskPriority, number>([
    ['P0', 0],
    ['P1', 1],
    ['P2', 2],
    ['P3', 3],
    ['P4', 4]
  ]);

  constructor(config?: {
    maxConcurrent?: number;
    enableRetry?: boolean;
    maxRetries?: number;
    taskTimeout?: number;
  }) {
    super();
    this.maxConcurrent = config?.maxConcurrent || 10;
    this.enableRetry = config?.enableRetry !== false;
    this.maxRetries = config?.maxRetries || 3;
    this.taskTimeout = config?.taskTimeout || 30000;
    logger.info('TaskQueue initialized', {
      maxConcurrent: this.maxConcurrent,
      enableRetry: this.enableRetry
    });
  }

  /**
   * Enqueue a task
   */
  enqueue(task: Task): string {
    try {
      const taskId = task.id || `task-${Date.now()}-${Math.random()}`;
      const queuedTask: Task = {
        ...task,
        id: taskId,
        status: 'queued' as TaskStatus,
        priority: task.priority || 'P2',
        createdAt: new Date(),
        retries: 0
      };

      this.queue.push(queuedTask);
      this.sortQueue();

      this.emit('task:queued', {
        taskId,
        priority: queuedTask.priority,
        queueSize: this.queue.length
      });

      logger.debug(`Task enqueued: ${taskId}`, {
        priority: queuedTask.priority,
        queueSize: this.queue.length
      });

      return taskId;
    } catch (error) {
      logger.error('Failed to enqueue task', { error });
      throw error;
    }
  }

  /**
   * Dequeue a task (used internally)
   */
  private dequeue(): Task | undefined {
    if (this.queue.length === 0) {
      return undefined;
    }
    return this.queue.shift();
  }

  /**
   * Start processing the queue
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('TaskQueue is already running');
      return;
    }

    this.isRunning = true;
    logger.info('TaskQueue started');
    this.processQueue();
  }

  /**
   * Stop processing the queue
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Wait for all current tasks to complete
    while (this.processing.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('TaskQueue stopped');
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we can process more tasks
        if (this.processing.size < this.maxConcurrent) {
          const task = this.dequeue();
          
          if (task) {
            this.processTask(task);
          }
        }

        // Small delay to prevent busy waiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error('Error in processQueue', { error });
      }
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: Task): Promise<void> {
    const taskId = task.id!;

    try {
      task.status = 'processing' as TaskStatus;
      task.startedAt = new Date();
      this.processing.set(taskId, task);

      this.emit('task:started', { taskId, priority: task.priority });

      logger.debug(`Processing task: ${taskId}`, {
        priority: task.priority
      });

      // Execute task with timeout
      const result = await Promise.race([
        this.executeTask(task),
        this.createTimeout(taskId, this.taskTimeout)
      ]);

      task.status = 'completed' as TaskStatus;
      task.result = result;
      task.completedAt = new Date();

      this.processing.delete(taskId);
      this.completed.set(taskId, task);

      this.emit('task:completed', {
        taskId,
        result,
        duration: task.completedAt.getTime() - task.startedAt!.getTime()
      });

      logger.info(`Task completed: ${taskId}`, {
        duration: task.completedAt.getTime() - task.startedAt!.getTime()
      });
    } catch (error) {
      await this.handleTaskError(task, error);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: Task): Promise<unknown> {
    if (task.handler) {
      return await task.handler(task.data);
    }

    // Simulate task execution
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(`Task ${task.id} executed successfully`);
      }, Math.random() * 1000);
    });
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(taskId: string, timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task ${taskId} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Handle task errors with retry logic
   */
  private async handleTaskError(task: Task, error: unknown): Promise<void> {
    const taskId = task.id!;
    task.error = String(error);
    task.retries = (task.retries || 0) + 1;

    logger.error(`Task error: ${taskId}`, {
      error,
      attempt: task.retries,
      maxRetries: this.maxRetries
    });

    if (this.enableRetry && task.retries < this.maxRetries) {
      // Retry with exponential backoff
      const backoffMs = Math.pow(2, task.retries - 1) * 1000;
      
      task.status = 'retrying' as TaskStatus;
      this.processing.delete(taskId);

      this.emit('task:retrying', {
        taskId,
        attempt: task.retries,
        backoffMs
      });

      logger.info(`Retrying task: ${taskId}`, {
        attempt: task.retries,
        backoffMs
      });

      await new Promise(resolve => setTimeout(resolve, backoffMs));
      this.queue.unshift(task); // Re-queue at front
      this.sortQueue();
    } else {
      // Task failed permanently
      task.status = 'failed' as TaskStatus;
      task.failedAt = new Date();
      this.processing.delete(taskId);
      this.failed.set(taskId, task);

      this.emit('task:failed', {
        taskId,
        error: task.error,
        attempts: task.retries
      });

      logger.error(`Task failed permanently: ${taskId}`, {
        error: task.error,
        attempts: task.retries
      });
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityA = this.priorityLevels.get(a.priority || 'P2') || 2;
      const priorityB = this.priorityLevels.get(b.priority || 'P2') || 2;
      return priorityA - priorityB;
    });
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    const queued = this.queue.find(t => t.id === taskId);
    if (queued) return queued;

    const processing = this.processing.get(taskId);
    if (processing) return processing;

    const completed = this.completed.get(taskId);
    if (completed) return completed;

    return this.failed.get(taskId);
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get processing tasks count
   */
  getProcessingCount(): number {
    return this.processing.size;
  }

  /**
   * Get completed tasks count
   */
  getCompletedCount(): number {
    return this.completed.size;
  }

  /**
   * Get failed tasks count
   */
  getFailedCount(): number {
    return this.failed.size;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      completed: this.completed.size,
      failed: this.failed.size,
      total: this.queue.length + this.processing.size + this.completed.size + this.failed.size
    };
  }

  /**
   * Clear completed tasks
   */
  clearCompleted(): void {
    this.completed.clear();
    logger.info('Cleared completed tasks');
  }

  /**
   * Clear failed tasks
   */
  clearFailed(): void {
    this.failed.clear();
    logger.info('Cleared failed tasks');
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    const tasks: Task[] = [];

    if (status === 'queued') {
      return [...this.queue];
    } else if (status === 'processing') {
      return Array.from(this.processing.values());
    } else if (status === 'completed') {
      return Array.from(this.completed.values());
    } else if (status === 'failed') {
      return Array.from(this.failed.values());
    }

    return tasks;
  }
}

export default TaskQueue;
