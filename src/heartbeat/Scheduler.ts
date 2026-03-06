/**
 * Scheduler.ts
 * 
 * Cron-based scheduler for NexusMind. Parses and validates cron expressions,
 * manages scheduled jobs, and calculates next execution times.
 */

import { Logger } from '../utils/logger.js';

interface CronPattern {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

interface ScheduledJobInfo {
  id: string;
  cronExpression: string;
  nextRunTime: Date;
  lastRunTime?: Date;
  isRunning: boolean;
}

/**
 * Scheduler - Manages cron-based job scheduling
 */
export class Scheduler {
  private logger: Logger;
  private jobs: Map<string, ScheduledJobInfo> = new Map();

  constructor() {
    this.logger = new Logger('Scheduler');
  }

  /**
   * Validate cron expression format.
   * Format: minute hour day month dayOfWeek
   * Example: "0 (star)/4 * * *" means every 4 hours
   */
  isValidCron(expression: string): boolean {
    try {
      const parts = expression.trim().split(/\s+/);
      
      if (parts.length !== 5) {
        return false;
      }

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      return (
        this.isValidField(minute, 0, 59) &&
        this.isValidField(hour, 0, 23) &&
        this.isValidField(dayOfMonth, 1, 31) &&
        this.isValidField(month, 1, 12) &&
        this.isValidField(dayOfWeek, 0, 6)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate individual cron field
   */
  private isValidField(field: string, min: number, max: number): boolean {
    if (field === '*') return true;
    if (field === '?') return true;

    // Handle step values (e.g., */5)
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      if (isNaN(Number(step)) || Number(step) <= 0) return false;
      if (range === '*') return true;
      return this.isValidField(range, min, max);
    }

    // Handle ranges (e.g., 1-5)
    if (field.includes('-')) {
      const [start, end] = field.split('-');
      const startNum = Number(start);
      const endNum = Number(end);
      return (
        !isNaN(startNum) && !isNaN(endNum) &&
        startNum >= min && startNum <= max &&
        endNum >= min && endNum <= max &&
        startNum <= endNum
      );
    }

    // Handle lists (e.g., 1,2,3)
    if (field.includes(',')) {
      return field.split(',').every(f => this.isValidField(f, min, max));
    }

    // Single number
    const num = Number(field);
    return !isNaN(num) && num >= min && num <= max;
  }

  /**
   * Parse cron expression into a pattern
   */
  private parseCronExpression(expression: string): CronPattern {
    const parts = expression.trim().split(/\s+/);
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    return {
      minute: this.parseField(minute, 0, 59),
      hour: this.parseField(hour, 0, 23),
      dayOfMonth: this.parseField(dayOfMonth, 1, 31),
      month: this.parseField(month, 1, 12),
      dayOfWeek: this.parseField(dayOfWeek, 0, 6),
    };
  }

  /**
   * Parse individual cron field into array of values
   */
  private parseField(field: string, min: number, max: number): number[] {
    const values: Set<number> = new Set();

    if (field === '*' || field === '?') {
      for (let i = min; i <= max; i++) {
        values.add(i);
      }
      return Array.from(values);
    }

    // Handle step values
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = Number(step);
      const start = range === '*' ? min : Number(range);
      
      for (let i = start; i <= max; i += stepNum) {
        if (i >= min && i <= max) {
          values.add(i);
        }
      }
      return Array.from(values).sort((a, b) => a - b);
    }

    // Handle ranges
    if (field.includes('-')) {
      const [start, end] = field.split('-');
      const startNum = Number(start);
      const endNum = Number(end);
      
      for (let i = startNum; i <= endNum; i++) {
        values.add(i);
      }
      return Array.from(values).sort((a, b) => a - b);
    }

    // Handle lists
    if (field.includes(',')) {
      return field.split(',')
        .map(f => this.parseField(f, min, max))
        .flat()
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .sort((a, b) => a - b);
    }

    // Single number
    return [Number(field)];
  }

  /**
   * Check if a date matches the cron pattern
   */
  private matchesPattern(date: Date, pattern: CronPattern): boolean {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1; // getMonth returns 0-11
    const dayOfWeek = date.getDay();

    return (
      pattern.minute.includes(minute) &&
      pattern.hour.includes(hour) &&
      pattern.dayOfMonth.includes(dayOfMonth) &&
      pattern.month.includes(month) &&
      pattern.dayOfWeek.includes(dayOfWeek)
    );
  }

  /**
   * Calculate next run time for a cron expression
   */
  getNextRunTime(cronExpression: string, fromDate: Date = new Date()): Date {
    try {
      if (!this.isValidCron(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      const pattern = this.parseCronExpression(cronExpression);
      let current = new Date(fromDate);
      current.setSeconds(0);
      current.setMilliseconds(0);
      current.setMinutes(current.getMinutes() + 1);

      // Search up to 4 years into the future
      const maxDate = new Date(current);
      maxDate.setFullYear(maxDate.getFullYear() + 4);

      while (current <= maxDate) {
        if (this.matchesPattern(current, pattern)) {
          return current;
        }
        current.setMinutes(current.getMinutes() + 1);
      }

      throw new Error(`Could not find next run time for cron: ${cronExpression}`);
    } catch (error) {
      this.logger.error(`Error calculating next run time for cron: ${cronExpression}`, error);
      throw error;
    }
  }

  /**
   * Register a scheduled job
   */
  registerJob(id: string, cronExpression: string): Date {
    try {
      if (!this.isValidCron(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      const nextRunTime = this.getNextRunTime(cronExpression);
      
      this.jobs.set(id, {
        id,
        cronExpression,
        nextRunTime,
        isRunning: false,
      });

      this.logger.debug(`Registered job ${id}: ${cronExpression} -> next run: ${nextRunTime}`);
      return nextRunTime;
    } catch (error) {
      this.logger.error(`Failed to register job ${id}`, error);
      throw error;
    }
  }

  /**
   * Unregister a scheduled job
   */
  unregisterJob(id: string): boolean {
    return this.jobs.delete(id);
  }

  /**
   * Get job information
   */
  getJob(id: string): ScheduledJobInfo | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ScheduledJobInfo[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Start a job (mark as running)
   */
  startJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    job.isRunning = true;
    job.lastRunTime = new Date();
    return true;
  }

  /**
   * Stop a job (mark as not running)
   */
  stopJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    job.isRunning = false;
    return true;
  }

  /**
   * Update next run time after execution
   */
  updateNextRunTime(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    try {
      job.nextRunTime = this.getNextRunTime(job.cronExpression);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update next run time for job ${id}`, error);
      return false;
    }
  }

  /**
   * Get jobs that are due to run
   */
  getJobsDue(asOfDate: Date = new Date()): string[] {
    return Array.from(this.jobs.values())
      .filter(job => job.nextRunTime <= asOfDate && !job.isRunning)
      .map(job => job.id);
  }

  /**
   * Get next scheduled run time across all jobs
   */
  getNextScheduledTime(): Date | null {
    const jobs = Array.from(this.jobs.values());
    if (jobs.length === 0) return null;

    return jobs.reduce((earliest, job) => 
      job.nextRunTime < earliest.nextRunTime ? job : earliest
    ).nextRunTime;
  }

  /**
   * Clear all jobs
   */
  clearAllJobs(): void {
    this.jobs.clear();
    this.logger.info('Cleared all scheduled jobs');
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    totalJobs: number;
    runningJobs: number;
    nextRunTime: Date | null;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      totalJobs: jobs.length,
      runningJobs: jobs.filter(j => j.isRunning).length,
      nextRunTime: this.getNextScheduledTime(),
    };
  }
}

export default Scheduler;
