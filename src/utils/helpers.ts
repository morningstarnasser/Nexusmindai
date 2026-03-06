/**
 * NexusMind Helper Utilities
 * Common utility functions for promises, timing, and data manipulation
 */

/**
 * Sleep/delay function
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffMultiplier?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    backoffMultiplier = 2,
    maxDelayMs = 10000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delayMs = Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await sleep(delayMs);
    }
  }

  throw lastError!;
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out',
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWaitMs?: number;
  } = {},
): (...args: Parameters<T>) => void {
  const { leading = false, trailing = true, maxWaitMs } = options;

  let timeoutHandle: NodeJS.Timeout;
  let lastCallTime = 0;
  let lastRunTime = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (leading && now - lastRunTime >= delayMs) {
      fn(...args);
      lastRunTime = now;
    }

    clearTimeout(timeoutHandle);

    if (maxWaitMs && now - lastCallTime >= maxWaitMs) {
      fn(...args);
      lastRunTime = now;
      lastCallTime = now;
    } else {
      lastCallTime = now;
      timeoutHandle = setTimeout(() => {
        if (trailing) {
          fn(...args);
          lastRunTime = Date.now();
        }
      }, delayMs);
    }
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = {},
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = false } = options;

  let lastRunTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let timeoutHandle: NodeJS.Timeout | null = null;

  const clearTimeout = () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  };

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunTime;

    if (leading && lastRunTime === 0) {
      fn(...args);
      lastRunTime = now;
    } else if (timeSinceLastRun >= intervalMs) {
      fn(...args);
      lastRunTime = now;
      clearTimeout();
    } else if (trailing) {
      lastArgs = args;
      clearTimeout();

      timeoutHandle = setTimeout(() => {
        if (lastArgs) {
          fn(...lastArgs);
          lastRunTime = Date.now();
          lastArgs = null;
        }
      }, intervalMs - timeSinceLastRun);
    }
  };
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Check if value is object
 */
function isObject(obj: unknown): obj is Record<string, any> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format duration to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Flatten nested object
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix: string = '',
  result: Record<string, any> = {},
): Record<string, any> {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Group array by key
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string | number): Record<string | number, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<string | number, T[]>);
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Deduplicate array
 */
export function deduplicate<T>(array: T[], keyFn?: (item: T) => any): T[] {
  if (!keyFn) {
    return [...new Set(array)];
  }

  const seen = new Set();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Merge arrays
 */
export function mergeArrays<T>(...arrays: T[][]): T[] {
  return arrays.reduce((result, arr) => [...result, ...arr], []);
}

/**
 * Create range of numbers
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Parse environment variable safely
 */
export function parseEnvVar(
  name: string,
  defaultValue?: string,
  parser?: (value: string) => any,
): any {
  const value = process.env[name] ?? defaultValue;

  if (value === undefined) {
    throw new Error(`Environment variable ${name} is not defined`);
  }

  if (!parser) return value;

  try {
    return parser(value);
  } catch (error) {
    throw new Error(`Failed to parse environment variable ${name}: ${(error as Error).message}`);
  }
}

/**
 * Get nested property safely
 */
export function getNestedProperty<T = unknown>(
  obj: Record<string, any>,
  path: string,
  defaultValue?: T,
): T | undefined {
  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current?.[key] === undefined) {
      return defaultValue;
    }
    current = current[key];
  }

  return current as T;
}

/**
 * Set nested property
 */
export function setNestedProperty(
  obj: Record<string, any>,
  path: string,
  value: any,
): Record<string, any> {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * Wait for condition
 */
export async function waitForCondition(
  condition: () => boolean,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
    timeoutMessage?: string;
  } = {},
): Promise<void> {
  const { timeoutMs = 5000, intervalMs = 100, timeoutMessage = 'Condition timeout' } = options;
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(timeoutMessage);
    }
    await sleep(intervalMs);
  }
}
