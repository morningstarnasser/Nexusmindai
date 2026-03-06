/**
 * SkillManager.ts
 * 
 * Manages skill lifecycle: install, uninstall, enable, disable, execute.
 * Loads built-in and user skills from registry.
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
import { SkillRuntime } from './SkillRuntime.js';

interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  installed: boolean;
  source: 'builtin' | 'user' | 'external';
  entry: string; // Path or module name
  dependencies?: string[];
  requiredPermissions?: string[];
  metadata?: Record<string, unknown>;
}

interface SkillRegistry {
  skills: Map<string, Skill>;
  builtins: Set<string>;
  installed: Set<string>;
}

interface SkillExecutionOptions {
  timeout?: number;
  context?: Record<string, unknown>;
  sandbox?: boolean;
}

interface SkillExecutionResult {
  skillId: string;
  success: boolean;
  result?: unknown;
  error?: Error;
  executionTime: number;
  timestamp: Date;
}

/**
 * SkillManager - Manages skill lifecycle and execution
 */
export class SkillManager extends EventEmitter {
  private logger: Logger;
  private registry: SkillRegistry = {
    skills: new Map(),
    builtins: new Set(),
    installed: new Set(),
  };
  private runtime: SkillRuntime;
  private executionHistory: SkillExecutionResult[] = [];

  constructor() {
    super();
    this.logger = new Logger('SkillManager');
    this.runtime = new SkillRuntime();
  }

  /**
   * Initialize skill manager
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing SkillManager');
      
      // Initialize runtime
      await this.runtime.initialize?.();

      // Load built-in skills
      await this.loadBuiltinSkills();

      this.logger.info(`SkillManager initialized with ${this.registry.skills.size} skills`);
      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize SkillManager', error);
      throw error;
    }
  }

  /**
   * Load built-in skills
   */
  private async loadBuiltinSkills(): Promise<void> {
    try {
      const builtins: Skill[] = [
        {
          id: 'memory-recall',
          name: 'Memory Recall',
          version: '1.0.0',
          description: 'Retrieve information from memory',
          enabled: true,
          installed: true,
          source: 'builtin',
          entry: 'skills/builtin/memoryRecall.js',
          requiredPermissions: ['memory:read'],
        },
        {
          id: 'web-search',
          name: 'Web Search',
          version: '1.0.0',
          description: 'Search the web for information',
          enabled: true,
          installed: true,
          source: 'builtin',
          entry: 'skills/builtin/webSearch.js',
          requiredPermissions: ['network:internet'],
        },
        {
          id: 'code-execution',
          name: 'Code Execution',
          version: '1.0.0',
          description: 'Execute code snippets safely',
          enabled: true,
          installed: true,
          source: 'builtin',
          entry: 'skills/builtin/codeExecution.js',
          requiredPermissions: ['sandbox:execute'],
        },
        {
          id: 'file-operations',
          name: 'File Operations',
          version: '1.0.0',
          description: 'Read/write files',
          enabled: true,
          installed: true,
          source: 'builtin',
          entry: 'skills/builtin/fileOperations.js',
          requiredPermissions: ['filesystem:read', 'filesystem:write'],
        },
        {
          id: 'planning',
          name: 'Task Planning',
          version: '1.0.0',
          description: 'Plan complex tasks',
          enabled: true,
          installed: true,
          source: 'builtin',
          entry: 'skills/builtin/planning.js',
          requiredPermissions: ['planning:execute'],
        },
      ];

      for (const skill of builtins) {
        this.registry.skills.set(skill.id, skill);
        this.registry.builtins.add(skill.id);
        this.registry.installed.add(skill.id);
      }

      this.logger.debug(`Loaded ${builtins.length} built-in skills`);
    } catch (error) {
      this.logger.error('Error loading built-in skills', error);
      throw error;
    }
  }

  /**
   * Install a skill
   */
  async install(skillId: string, source: string): Promise<Skill> {
    try {
      if (this.registry.skills.has(skillId)) {
        const skill = this.registry.skills.get(skillId)!;
        this.registry.installed.add(skillId);
        this.logger.info(`Skill ${skillId} already exists, marked as installed`);
        this.emit('skillInstalled', { skillId });
        return skill;
      }

      const skill: Skill = {
        id: skillId,
        name: skillId,
        version: '1.0.0',
        description: '',
        enabled: true,
        installed: true,
        source: 'user',
        entry: source,
      };

      this.registry.skills.set(skillId, skill);
      this.registry.installed.add(skillId);

      this.logger.info(`Installed skill: ${skillId}`);
      this.emit('skillInstalled', { skillId, skill });

      return skill;
    } catch (error) {
      this.logger.error(`Error installing skill ${skillId}`, error);
      throw error;
    }
  }

  /**
   * Uninstall a skill
   */
  async uninstall(skillId: string): Promise<boolean> {
    try {
      const skill = this.registry.skills.get(skillId);
      if (!skill) {
        return false;
      }

      // Cannot uninstall built-in skills
      if (skill.source === 'builtin') {
        this.logger.warn(`Cannot uninstall built-in skill: ${skillId}`);
        return false;
      }

      this.registry.skills.delete(skillId);
      this.registry.installed.delete(skillId);

      this.logger.info(`Uninstalled skill: ${skillId}`);
      this.emit('skillUninstalled', { skillId });

      return true;
    } catch (error) {
      this.logger.error(`Error uninstalling skill ${skillId}`, error);
      throw error;
    }
  }

  /**
   * Enable a skill
   */
  enable(skillId: string): boolean {
    try {
      const skill = this.registry.skills.get(skillId);
      if (!skill) {
        return false;
      }

      if (!skill.enabled) {
        skill.enabled = true;
        this.logger.info(`Enabled skill: ${skillId}`);
        this.emit('skillEnabled', { skillId });
      }

      return true;
    } catch (error) {
      this.logger.error(`Error enabling skill ${skillId}`, error);
      throw error;
    }
  }

  /**
   * Disable a skill
   */
  disable(skillId: string): boolean {
    try {
      const skill = this.registry.skills.get(skillId);
      if (!skill) {
        return false;
      }

      if (skill.enabled) {
        skill.enabled = false;
        this.logger.info(`Disabled skill: ${skillId}`);
        this.emit('skillDisabled', { skillId });
      }

      return true;
    } catch (error) {
      this.logger.error(`Error disabling skill ${skillId}`, error);
      throw error;
    }
  }

  /**
   * Execute a skill
   */
  async execute(
    skillId: string,
    input: unknown,
    options: SkillExecutionOptions = {}
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();

    try {
      const skill = this.registry.skills.get(skillId);
      if (!skill) {
        throw new Error(`Skill not found: ${skillId}`);
      }

      if (!skill.enabled) {
        throw new Error(`Skill is disabled: ${skillId}`);
      }

      this.logger.info(`Executing skill: ${skillId}`);
      this.emit('skillExecutionStarted', { skillId });

      const result = await this.runtime.execute(skillId, input, options);

      const executionTime = Date.now() - startTime;
      const execResult: SkillExecutionResult = {
        skillId,
        success: true,
        result,
        executionTime,
        timestamp: new Date(),
      };

      this.recordExecution(execResult);
      this.logger.info(`Skill ${skillId} executed successfully in ${executionTime}ms`);
      this.emit('skillExecutionCompleted', execResult);

      return execResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const execResult: SkillExecutionResult = {
        skillId,
        success: false,
        error: error as Error,
        executionTime,
        timestamp: new Date(),
      };

      this.recordExecution(execResult);
      this.logger.error(`Skill ${skillId} execution failed`, error);
      this.emit('skillExecutionFailed', execResult);

      return execResult;
    }
  }

  /**
   * Execute multiple skills in sequence
   */
  async executeSequence(
    skillIds: string[],
    initialInput: unknown,
    options: SkillExecutionOptions = {}
  ): Promise<SkillExecutionResult[]> {
    try {
      const results: SkillExecutionResult[] = [];
      let currentInput = initialInput;

      for (const skillId of skillIds) {
        const result = await this.execute(skillId, currentInput, options);
        results.push(result);

        if (!result.success) {
          this.logger.warn(`Sequence stopped at skill ${skillId} due to error`);
          break;
        }

        currentInput = result.result;
      }

      return results;
    } catch (error) {
      this.logger.error('Error executing skill sequence', error);
      throw error;
    }
  }

  /**
   * Record execution in history
   */
  private recordExecution(result: SkillExecutionResult): void {
    this.executionHistory.push(result);

    // Keep only last 1000 executions
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-1000);
    }
  }

  /**
   * Get skill by ID
   */
  getSkill(skillId: string): Skill | undefined {
    return this.registry.skills.get(skillId);
  }

  /**
   * Get all skills
   */
  getAllSkills(filter?: { enabled?: boolean; source?: Skill['source'] }): Skill[] {
    let skills = Array.from(this.registry.skills.values());

    if (filter?.enabled !== undefined) {
      skills = skills.filter(s => s.enabled === filter.enabled);
    }

    if (filter?.source) {
      skills = skills.filter(s => s.source === filter.source);
    }

    return skills;
  }

  /**
   * Get skill execution history
   */
  getExecutionHistory(skillId?: string, limit: number = 100): SkillExecutionResult[] {
    let history = this.executionHistory;

    if (skillId) {
      history = history.filter(h => h.skillId === skillId);
    }

    return history.slice(-limit);
  }

  /**
   * Get skill statistics
   */
  getStats(): {
    totalSkills: number;
    enabledSkills: number;
    builtinSkills: number;
    userSkills: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  } {
    const skills = Array.from(this.registry.skills.values());
    const enabledCount = skills.filter(s => s.enabled).length;
    const builtinCount = skills.filter(s => s.source === 'builtin').length;
    const userCount = skills.filter(s => s.source === 'user').length;

    const successful = this.executionHistory.filter(h => h.success).length;
    const failed = this.executionHistory.filter(h => !h.success).length;

    return {
      totalSkills: skills.length,
      enabledSkills: enabledCount,
      builtinSkills: builtinCount,
      userSkills: userCount,
      totalExecutions: this.executionHistory.length,
      successfulExecutions: successful,
      failedExecutions: failed,
    };
  }

  /**
   * Shutdown skill manager
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down SkillManager');
      await this.runtime.shutdown?.();
      this.logger.info('SkillManager shutdown complete');
      this.emit('shutdown');
    } catch (error) {
      this.logger.error('Error during SkillManager shutdown', error);
      throw error;
    }
  }
}

export default SkillManager;
