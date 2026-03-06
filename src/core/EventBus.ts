import EventEmitter from 'events';
import { logger } from '../utils/logger.js';
import type { CoreEvent, EventHandler, EventFilter } from '../types/index.js';

/**
 * EventBus - Pub/sub event system with wildcard support
 * Supports async event handlers, event history, and event filtering
 */
export class EventBus extends EventEmitter {
  private eventHistory: CoreEvent[] = [];
  private maxHistory: number = 1000;
  private asyncHandlers: boolean = true;
  private eventFilters: EventFilter[] = [];
  private handlerMap: Map<string, EventHandler[]> = new Map();

  constructor(config?: { maxHistory?: number; asyncHandlers?: boolean }) {
    super();
    this.maxHistory = config?.maxHistory || 1000;
    this.asyncHandlers = config?.asyncHandlers !== false;
    logger.info('EventBus initialized', { maxHistory: this.maxHistory });
  }

  /**
   * Subscribe to an event (supports wildcards)
   */
  on(event: string | string[], handler: EventHandler): this {
    if (Array.isArray(event)) {
      for (const e of event) {
        this.registerHandler(e, handler);
        super.on(e, handler);
      }
      return this;
    } else {
      this.registerHandler(event, handler);
      return super.on(event, handler);
    }
  }

  /**
   * Subscribe to an event once
   */
  once(event: string, handler: EventHandler): this {
    const wrappedHandler = (...args: unknown[]) => {
      this.removeHandler(event, handler);
      handler(...args);
    };
    return super.once(event, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: EventHandler): this {
    this.removeHandler(event, handler);
    return super.off(event, handler);
  }

  /**
   * Emit an event
   */
  emit(eventName: string, ...args: unknown[]): boolean {
    try {
      const event: CoreEvent = {
        name: eventName,
        timestamp: new Date(),
        data: args[0] || {},
        source: 'eventbus'
      };

      // Check filters
      if (!this.shouldEmit(event)) {
        logger.debug('Event filtered', { event: eventName });
        return false;
      }

      // Add to history
      this.addToHistory(event);

      // Emit with pattern matching
      const emitted = super.emit(eventName, ...args);
      this.emitWildcardMatches(eventName, args);

      logger.debug('Event emitted', {
        event: eventName,
        listeners: this.listenerCount(eventName)
      });

      return emitted;
    } catch (error) {
      logger.error('Error emitting event', { event: eventName, error });
      return false;
    }
  }

  /**
   * Register an event handler
   */
  private registerHandler(event: string, handler: EventHandler): void {
    if (!this.handlerMap.has(event)) {
      this.handlerMap.set(event, []);
    }
    const handlers = this.handlerMap.get(event)!;
    if (!handlers.includes(handler)) {
      handlers.push(handler);
    }
  }

  /**
   * Remove an event handler
   */
  private removeHandler(event: string, handler: EventHandler): void {
    const handlers = this.handlerMap.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Check if event should be emitted based on filters
   */
  private shouldEmit(event: CoreEvent): boolean {
    for (const filter of this.eventFilters) {
      if (!filter(event)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Add event to history
   */
  private addToHistory(event: CoreEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }
  }

  /**
   * Emit wildcard pattern matches (e.g., 'message.*')
   */
  private emitWildcardMatches(eventName: string, args: unknown[]): void {
    const parts = eventName.split(':');
    
    // Try parent wildcards
    for (let i = parts.length - 1; i > 0; i--) {
      const wildcardEvent = parts.slice(0, i).join(':') + ':*';
      if (this.listenerCount(wildcardEvent) > 0) {
        super.emit(wildcardEvent, ...args);
      }
    }

    // Try wildcard for any event
    if (eventName !== '*' && this.listenerCount('*') > 0) {
      super.emit('*', ...args);
    }
  }

  /**
   * Get event history
   */
  getHistory(filter?: { event?: string; limit?: number }): CoreEvent[] {
    let history = [...this.eventHistory];

    if (filter?.event) {
      history = history.filter(e => e.name === filter.event);
    }

    if (filter?.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    logger.info('Event history cleared');
  }

  /**
   * Add an event filter
   */
  addFilter(filter: EventFilter): void {
    this.eventFilters.push(filter);
    logger.debug('Event filter added');
  }

  /**
   * Remove an event filter
   */
  removeFilter(filter: EventFilter): void {
    const index = this.eventFilters.indexOf(filter);
    if (index > -1) {
      this.eventFilters.splice(index, 1);
      logger.debug('Event filter removed');
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.eventFilters = [];
    logger.debug('All event filters cleared');
  }

  /**
   * Wait for an event with timeout
   */
  async waitFor(eventName: string, timeoutMs: number = 30000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off(eventName, handler);
        reject(new Error(`Event ${eventName} timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const handler = (data: unknown) => {
        clearTimeout(timeout);
        this.off(eventName, handler);
        resolve(data);
      };

      this.once(eventName, handler);
    });
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalEventsEmitted: number;
    historySize: number;
    activeListeners: number;
    registeredPatterns: number;
  } {
    return {
      totalEventsEmitted: this.eventHistory.length,
      historySize: this.eventHistory.length,
      activeListeners: this.eventNames().length,
      registeredPatterns: this.handlerMap.size
    };
  }

  /**
   * Get all registered event patterns
   */
  getPatterns(): string[] {
    return Array.from(this.handlerMap.keys());
  }

  /**
   * Get listeners for an event
   */
  getListenerCount(event: string): number {
    return this.listenerCount(event);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(event?: string | symbol): this {
    this.handlerMap.clear();
    return super.removeAllListeners(event);
  }
}

export default EventBus;
