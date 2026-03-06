/**
 * HeartbeatEngine.ts
 * 
 * The proactive autonomy engine for NexusMind. Manages multiple heartbeat schedules
 * (Pulse, Rhythm, Cycle, Season, Reactive) with intelligent task execution.
 * 
 * Heartbeat types:
 * - Pulse: Immediate/frequent (seconds to minutes)
 * - Rhythm: Regular (minutes to hours)
 * - Cycle: Daily/Weekly (hours to days)
 * - Season: Long-term (weeks to months)
 * - Reactive: Event-triggered
 */

import { EventEmitter } from 'events';
import cron from 'node-cron';
import { Logger } from '../utils/logger.js';
import { Scheduler } from './Scheduler.js';
import { TaskPlanner } from './TaskPlanner.js';
import {
  IHeartbeatConfig,
  ITask,
  IHeartbeatType,
  IExecutionHistory,
} from '../types/index.js';

interface ScheduledJob {
  id: string;
  type: IHeartbeatType;
  cronExpression: string;
  task: ITask;
  enabled: boolean;
  nextRun?: Date;
  cronTask?: cron.ScheduledTask;
}

interface SystemMetrics {
  cpuLoad: number;
  memoryUsage: number;
  taskQueueLength: number;
  activeTaskCount: number;
}

interface ExecutionState {
  jobId: string;
  taskId: string;
  startTime: Date;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: Error;
  executionTime: number;
}

/**
 * HeartbeatEngine - Manages autonomous execution of scheduled tasks
 */
export class HeartbeatEngine extends EventEmitter {
  private scheduler: Scheduler;
  private taskPlanner: TaskPlanner;
  private logger: Logger;
  private config: IHeartbeatConfig;
  
  private jobs: Map<string, ScheduledJob> = new Map();
  private executionHistory: IExecutionHistory[] = [];
  private taskQueue: ITask[] = [];
  private activeExecutions: Map<string, ExecutionState> = new Map();
  
  private systemMetrics: SystemMetrics = {
    cpuLoad: 0,
    memoryUsage: 0,
    taskQueueLength: 0,
    activeTaskCount: 0,
  };

  private maxHistorySize = 10000;
  private maxQueueSize = 500;
  private maxConcurrentTasks = 5;

  constructor(config: IHeartbeatConfig) {
    super();
    this.config = config;
    this.logger = new Logger('HeartbeatEngine');
    this.scheduler = new Scheduler();
    this.taskPlanner = new TaskPlanner();
  }

  /**
   * Initialize the heartbeat engine with agent configurations
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing HeartbeatEngine');
      
      // Load agent configs and schedule tasks
      if (this.config.agentConfigs && this.config.agentConfigs.length > 0) {
        for (const agentConfig of this.config.agentConfigs) {
          await this.loadAgentTasks(agentConfig);
        }
      }

      // Start system metrics collection
      this.startMetricsCollection();
      
      this.logger.info(`HeartbeatEngine initialized with ${this.jobs.size} jobs`);
      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize HeartbeatEngine', error);
      throw error;
    }
  }

  /**
   * Load tasks from agent configuration
   */
  private async loadAgentTasks(agentConfig: any): Promise<void> {
    try {
      if (!agentConfig.heartbeatTasks || agentConfig.heartbeatTasks.length === 0) {
        return;
      }

      for (const taskConfig of agentConfig.heartbeatTasks) {
        const job: ScheduledJob = {
          id: `${agentConfig.id}-${taskConfig.id}`,
          type: taskConfig.type || 'rhythm',
          cronExpression: taskConfig.cronExpression || '*/5 * * * *', // Default: every 5 minutes
          task: {
            id: taskConfig.id,
            name: taskConfig.name,
            description: taskConfig.description,
            priority: taskConfig.priority || 'normal',
            timeout: taskConfig.timeout || 30000,
            dependencies: taskConfig.dependencies || [],
            resourceRequirements: taskConfig.resourceRequirements,
          },
          enabled: taskConfig.enabled !== false,
        };

        this.jobs.set(job.id, job);
        
        if (job.enabled) {
          this.scheduleJob(job);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to load tasks for agent config`, error);
      throw error;
    }
  }

  /**
   * Schedule a job with cron expression
   */
  private scheduleJob(job: ScheduledJob): void {
    try {
      // Validate cron expression
      if (!this.scheduler.isValidCron(job.cronExpression)) {
        this.logger.warn(`Invalid cron expression for job ${job.id}: ${job.cronExpression}`);
        return;
      }

      // Create scheduled cron task
      const cronTask = cron.schedule(job.cronExpression, async () => {
        await this.executeTaskWithLoad(job);
      }, {
        scheduled: true,
      });

      job.cronTask = cronTask;
      job.nextRun = this.scheduler.getNextRunTime(job.cronExpression);
      
      this.logger.debug(`Scheduled job ${job.id}: ${job.cronExpression}`);
      this.emit('jobScheduled', { jobId: job.id, nextRun: job.nextRun });
    } catch (error) {
      this.logger.error(`Failed to schedule job ${job.id}`, error);
    }
  }

  /**
   * Execute a task with intelligent load-based scheduling
   */
  private async executeTaskWithLoad(job: ScheduledJob): Promise<void> {
    try {
      // Check system load
      this.updateSystemMetrics();
      
      // Skip execution if system is overloaded
      if (this.systemMetrics.cpuLoad > 0.9 || this.systemMetrics.memoryUsage > 0.85) {
        this.logger.debug(`Skipping task ${job.id} due to high system load`);
        this.recordExecution(job.id, job.task.id, 'skipped', null, 0);
        this.emit('taskSkipped', { jobId: job.id, reason: 'highSystemLoad' });
        return;
      }

      // Check if max concurrent tasks reached
      if (this.activeExecutions.size >= this.maxConcurrentTasks) {
        this.logger.debug(`Queuing task ${job.id} - max concurrent tasks reached`);
        await this.queueTask(job.task);
        return;
      }

      // Plan task execution
      const plannedTasks = await this.taskPlanner.planExecution([job.task]);
      
      if (plannedTasks.length === 0) {
        this.logger.debug(`Task ${job.id} planning resulted in no executable tasks`);
        this.recordExecution(job.id, job.task.id, 'skipped', null, 0);
        return;
      }

      // Execute task
      await this.executeTask(job, (plannedTasks[0] as any).task || plannedTasks[0]);
    } catch (error) {
      this.logger.error(`Error in executeTaskWithLoad for job ${job.id}`, error);
      this.recordExecution(job.id, job.task.id, 'failed', null, 0, error as Error);
    }
  }

  /**
   * Execute a single task in sandbox
   */
  private async executeTask(job: ScheduledJob, task: ITask): Promise<void> {
    const startTime = Date.now();
    const executionState: ExecutionState = {
      jobId: job.id,
      taskId: task.id,
      startTime: new Date(),
      status: 'running',
      executionTime: 0,
    };

    this.activeExecutions.set(executionState.jobId, executionState);
    
    try {
      this.logger.info(`Executing task ${task.name} (${job.type})`);
      this.emit('taskStarted', { jobId: job.id, taskId: task.id });

      // Simulate sandbox execution
      const result = await this.executeSandboxTask(task);
      
      const executionTime = Date.now() - startTime;
      executionState.status = 'completed';
      executionState.result = result;
      executionState.executionTime = executionTime;

      this.recordExecution(job.id, task.id, 'completed', result, executionTime);
      
      this.logger.info(`Task ${task.name} completed in ${executionTime}ms`);
      this.emit('taskCompleted', { jobId: job.id, taskId: task.id, result });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      executionState.status = 'failed';
      executionState.error = error as Error;
      executionState.executionTime = executionTime;

      this.recordExecution(job.id, task.id, 'failed', null, executionTime, error as Error);
      
      this.logger.error(`Task ${task.name} failed after ${executionTime}ms`, error);
      this.emit('taskFailed', { jobId: job.id, taskId: task.id, error });
    } finally {
      this.activeExecutions.delete(executionState.jobId);
      
      // Process queued tasks
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        if (nextTask) {
          const correspondingJob = Array.from(this.jobs.values())
            .find(j => j.task.id === nextTask.id);
          if (correspondingJob) {
            await this.executeTask(correspondingJob, nextTask);
          }
        }
      }
    }
  }

  /**
   * Execute task in isolated sandbox environment
   */
  private async executeSandboxTask(task: ITask): Promise<unknown> {
    return new Promise((resolve) => {
      // Simulate sandbox execution
      setTimeout(() => {
        resolve({
          taskId: task.id,
          timestamp: new Date(),
          status: 'completed',
        });
      }, Math.random() * 1000); // Simulate execution time
    });
  }

  /**
   * Queue a task for later execution
   */
  private async queueTask(task: ITask): Promise<void> {
    if (this.taskQueue.length < this.maxQueueSize) {
      this.taskQueue.push(task);
      this.systemMetrics.taskQueueLength = this.taskQueue.length;
      this.emit('taskQueued', { taskId: task.id, queueSize: this.taskQueue.length });
    } else {
      this.logger.warn(`Task queue full, discarding task ${task.id}`);
      this.emit('taskQueueFull', { taskId: task.id });
    }
  }

  /**
   * Record execution history
   */
  private recordExecution(
    jobId: string,
    taskId: string,
    status: 'completed' | 'failed' | 'skipped',
    result: unknown,
    executionTime: number,
    error?: Error
  ): void {
    const record: IExecutionHistory = {
      jobId,
      taskId,
      status,
      result,
      executionTime,
      timestamp: new Date(),
      error: error?.message,
    };

    this.executionHistory.push(record);
    
    // Maintain max history size
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }

    this.emit('executionRecorded', record);
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(): void {
    const cpus = require('os').cpus();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();

    const avgLoad = require('os').loadavg()[0] / cpus.length;
    this.systemMetrics.cpuLoad = Math.min(avgLoad, 1.0);
    this.systemMetrics.memoryUsage = 1 - (freeMemory / totalMemory);
    this.systemMetrics.taskQueueLength = this.taskQueue.length;
    this.systemMetrics.activeTaskCount = this.activeExecutions.size;
  }

  /**
   * Start continuous metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateSystemMetrics();
      this.emit('metricsUpdated', this.systemMetrics);
    }, 5000); // Update every 5 seconds
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Enable a job
   */
  enableJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (!job.enabled) {
      job.enabled = true;
      this.scheduleJob(job);
      this.logger.info(`Enabled job ${jobId}`);
    }
    return true;
  }

  /**
   * Disable a job
   */
  disableJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.enabled && job.cronTask) {
      job.enabled = false;
      job.cronTask.stop();
      this.logger.info(`Disabled job ${jobId}`);
    }
    return true;
  }

  /**
   * Pause all jobs
   */
  pauseAll(): void {
    for (const job of this.jobs.values()) {
      if (job.enabled && job.cronTask) {
        job.cronTask.stop();
      }
    }
    this.logger.info('Paused all jobs');
    this.emit('allJobsPaused');
  }

  /**
   * Resume all jobs
   */
  resumeAll(): void {
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }
    this.logger.info('Resumed all jobs');
    this.emit('allJobsResumed');
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit: number = 100): IExecutionHistory[] {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get execution history for specific job
   */
  getJobExecutionHistory(jobId: string, limit: number = 50): IExecutionHistory[] {
    return this.executionHistory
      .filter(h => h.jobId === jobId)
      .slice(-limit);
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): ExecutionState[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
    this.logger.info('Cleared execution history');
    this.emit('historyCleared');
  }

  /**
   * Shutdown the heartbeat engine
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down HeartbeatEngine');
      
      // Stop all scheduled jobs
      for (const job of this.jobs.values()) {
        if (job.cronTask) {
          job.cronTask.stop();
        }
      }

      this.logger.info('HeartbeatEngine shutdown complete');
      this.emit('shutdown');
    } catch (error) {
      this.logger.error('Error during HeartbeatEngine shutdown', error);
      throw error;
    }
  }
}

export default HeartbeatEngine;
