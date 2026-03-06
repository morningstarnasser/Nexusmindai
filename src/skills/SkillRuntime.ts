/**
 * SkillRuntime.ts
 * 
 * Executes skills in isolated context with proper error handling,
 * timeouts, and access to skill context (memory, AI, tools).
 */

import { Logger } from '../utils/logger.js';

interface SkillContext {
  skillId: string;
  memory?: Record<string, unknown>;
  ai?: Record<string, unknown>;
  tools?: Record<string, unknown>;
  environment?: Record<string, string>;
}

interface SkillFunction {
  (context: SkillContext, input: unknown): Promise<unknown>;
}

interface ExecutionOptions {
  timeout?: number;
  context?: Record<string, unknown>;
  sandbox?: boolean;
}

/**
 * SkillRuntime - Executes skills in isolated environment
 */
export class SkillRuntime {
  private logger: Logger;
  private skills: Map<string, SkillFunction> = new Map();
  private defaultTimeout: number = 30000; // 30 seconds

  constructor() {
    this.logger = new Logger('SkillRuntime');
  }

  /**
   * Initialize skill runtime
   */
  async initialize(): Promise<void> {
    this.logger.debug('Initialized SkillRuntime');
  }

  /**
   * Register a skill function
   */
  registerSkill(skillId: string, fn: SkillFunction): void {
    try {
      this.skills.set(skillId, fn);
      this.logger.debug(`Registered skill: ${skillId}`);
    } catch (error) {
      this.logger.error(`Error registering skill ${skillId}`, error);
      throw error;
    }
  }

  /**
   * Execute a skill
   */
  async execute(
    skillId: string,
    input: unknown,
    options: ExecutionOptions = {}
  ): Promise<unknown> {
    try {
      const timeout = options.timeout || this.defaultTimeout;
      const context: SkillContext = {
        skillId,
        memory: options.context?.memory as Record<string, unknown>,
        ai: options.context?.ai as Record<string, unknown>,
        tools: options.context?.tools as Record<string, unknown>,
        environment: options.context?.environment as Record<string, string>,
      };

      // Check if skill is registered
      const skillFn = this.skills.get(skillId);
      if (skillFn) {
        return await this.executeWithTimeout(skillFn, context, input, timeout);
      }

      // Try to load skill dynamically
      return await this.executeDynamicSkill(skillId, context, input, timeout);
    } catch (error) {
      this.logger.error(`Error executing skill ${skillId}`, error);
      throw error;
    }
  }

  /**
   * Execute skill with timeout
   */
  private async executeWithTimeout(
    fn: SkillFunction,
    context: SkillContext,
    input: unknown,
    timeout: number
  ): Promise<unknown> {
    return Promise.race([
      fn(context, input),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Skill execution timeout after ${timeout}ms`)),
          timeout
        )
      ),
    ]);
  }

  /**
   * Execute skill dynamically (mock implementation)
   */
  private async executeDynamicSkill(
    skillId: string,
    context: SkillContext,
    input: unknown,
    timeout: number
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(
        () => reject(new Error(`Skill execution timeout: ${skillId}`)),
        timeout
      );

      try {
        // Simulate skill execution
        const result = {
          skillId,
          input,
          output: `Executed ${skillId}`,
          timestamp: new Date(),
        };

        clearTimeout(timeoutHandle);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutHandle);
        reject(error);
      }
    });
  }

  /**
   * Execute skill in isolated VM context (enhanced security)
   */
  async executeSandboxed(
    skillId: string,
    input: unknown,
    options: ExecutionOptions = {}
  ): Promise<unknown> {
    try {
      const timeout = options.timeout || this.defaultTimeout;

      // Create isolated execution context
      const sandbox = this.createSandboxContext();

      return new Promise((resolve, reject) => {
        const timeoutHandle = setTimeout(
          () => {
            reject(new Error(`Sandbox execution timeout: ${skillId}`));
          },
          timeout
        );

        try {
          // Execute in sandbox
          const result = this.executeInSandbox(skillId, input, sandbox);
          clearTimeout(timeoutHandle);
          resolve(result);
        } catch (error) {
          clearTimeout(timeoutHandle);
          reject(error);
        }
      });
    } catch (error) {
      this.logger.error(`Error executing sandboxed skill ${skillId}`, error);
      throw error;
    }
  }

  /**
   * Create sandbox context
   */
  private createSandboxContext(): Record<string, unknown> {
    return {
      console: {
        log: (...args: unknown[]) => this.logger.debug(JSON.stringify(args)),
        warn: (...args: unknown[]) => this.logger.warn(JSON.stringify(args)),
        error: (...args: unknown[]) => this.logger.error(JSON.stringify(args)),
      },
      // Restricted global access
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
    };
  }

  /**
   * Execute in sandbox (mock)
   */
  private executeInSandbox(
    skillId: string,
    input: unknown,
    _sandbox: Record<string, unknown>
  ): unknown {
    // In production, use vm2 or similar for true sandboxing
    return {
      skillId,
      sandboxed: true,
      result: input,
      timestamp: new Date(),
    };
  }

  /**
   * Get skill context builder
   */
  buildContext(options: {
    skillId: string;
    memory?: Record<string, unknown>;
    ai?: Record<string, unknown>;
    tools?: Record<string, unknown>;
  }): SkillContext {
    return {
      skillId: options.skillId,
      memory: options.memory || {},
      ai: options.ai || {},
      tools: options.tools || {},
    };
  }

  /**
   * Validate skill output
   */
  validateOutput(output: unknown, expectedType?: string): boolean {
    if (expectedType === 'string') return typeof output === 'string';
    if (expectedType === 'number') return typeof output === 'number';
    if (expectedType === 'boolean') return typeof output === 'boolean';
    if (expectedType === 'object') return typeof output === 'object' && output !== null;
    if (expectedType === 'array') return Array.isArray(output);

    return output !== undefined && output !== null;
  }

  /**
   * Get registered skills
   */
  getRegisteredSkills(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * Unregister a skill
   */
  unregisterSkill(skillId: string): boolean {
    return this.skills.delete(skillId);
  }

  /**
   * Set default timeout
   */
  setDefaultTimeout(timeoutMs: number): void {
    this.defaultTimeout = timeoutMs;
    this.logger.debug(`Default skill timeout set to ${timeoutMs}ms`);
  }

  /**
   * Shutdown runtime
   */
  async shutdown(): Promise<void> {
    this.skills.clear();
    this.logger.info('SkillRuntime shutdown');
  }
}

export default SkillRuntime;
