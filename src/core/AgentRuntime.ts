import EventEmitter from 'events';
import { logger } from '../utils/logger.js';
import { ModelRouter } from './ModelRouter.js';
import { EventBus } from './EventBus.js';
import type { 
  AgentConfig, 
  Message, 
  MessageResponse,
  SkillDefinition,
  MemoryStore
} from '../types/index.js';

/**
 * AgentRuntime - Runtime environment for a single agent
 * Handles message processing, model invocation, skill execution, and memory access
 */
export class AgentRuntime extends EventEmitter {
  private agentId: string;
  private config: AgentConfig;
  private modelRouter: ModelRouter;
  private eventBus: EventBus;
  private memory: MemoryStore = {
    shortTerm: [],
    longTerm: new Map(),
    context: {}
  };
  private skills: Map<string, SkillDefinition> = new Map();
  private isInitialized: boolean = false;
  private messageHistory: Message[] = [];
  private maxMessageHistory: number = 100;

  constructor(
    config: AgentConfig,
    modelRouter: ModelRouter,
    eventBus: EventBus
  ) {
    super();
    this.agentId = config.id;
    this.config = config;
    this.modelRouter = modelRouter;
    this.eventBus = eventBus;
    logger.info(`AgentRuntime created for agent ${this.agentId}`);
  }

  /**
   * Initialize the runtime
   */
  async initialize(): Promise<void> {
    try {
      logger.info(`Initializing runtime for agent ${this.agentId}`);
      
      // Load skills
      if (this.config.skills && this.config.skills.length > 0) {
        for (const skill of this.config.skills) {
          this.skills.set(skill.name, skill);
        }
        logger.debug(`Loaded ${this.skills.size} skills for ${this.agentId}`);
      }

      // Initialize memory
      this.memory.context = {
        agentId: this.agentId,
        agentName: this.config.name,
        model: this.config.defaultModel,
        initialized: new Date()
      };

      this.isInitialized = true;
      this.emit('runtime:initialized');
      logger.info(`Runtime initialized for agent ${this.agentId}`);
    } catch (error) {
      logger.error(`Failed to initialize runtime for ${this.agentId}`, { error });
      throw error;
    }
  }

  /**
   * Process an incoming message
   */
  async processMessage(message: Message): Promise<MessageResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error(`Agent ${this.agentId} runtime not initialized`);
      }

      logger.debug(`Processing message for ${this.agentId}`, { messageId: message.id });

      // Add to message history
      this.messageHistory.push(message);
      if (this.messageHistory.length > this.maxMessageHistory) {
        this.messageHistory = this.messageHistory.slice(-this.maxMessageHistory);
      }

      // Add to short-term memory
      this.memory.shortTerm.push(message);
      if (this.memory.shortTerm.length > 50) {
        this.memory.shortTerm = this.memory.shortTerm.slice(-50);
      }

      this.eventBus.emit('message:received', {
        agentId: this.agentId,
        message,
        timestamp: new Date()
      });

      // Determine if skill execution is needed
      const skillMatch = this.matchSkill(message.content);
      let result: string;

      if (skillMatch) {
        result = await this.executeSkill(skillMatch.name, message.content);
      } else {
        result = await this.think(message);
      }

      const response: MessageResponse = {
        id: `response-${Date.now()}`,
        agentId: this.agentId,
        content: result,
        timestamp: new Date(),
        originalMessageId: message.id
      };

      this.eventBus.emit('message:processed', {
        agentId: this.agentId,
        message,
        response,
        timestamp: new Date()
      });

      logger.debug(`Message processed for ${this.agentId}`, { 
        messageId: message.id,
        responseId: response.id 
      });

      return response;
    } catch (error) {
      logger.error(`Failed to process message for ${this.agentId}`, { error });
      this.eventBus.emit('agent:error', {
        agentId: this.agentId,
        error: String(error),
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Execute a skill
   */
  async executeSkill(skillName: string, input: string): Promise<string> {
    try {
      const skill = this.skills.get(skillName);
      if (!skill) {
        throw new Error(`Skill ${skillName} not found`);
      }

      logger.info(`Executing skill ${skillName} for ${this.agentId}`, { input });

      this.eventBus.emit('skill:executing', {
        agentId: this.agentId,
        skillName,
        timestamp: new Date()
      });

      // Simulate skill execution
      let result: string;
      
      if (skill.type === 'builtin') {
        result = await this.executeBuiltinSkill(skillName, input);
      } else if (skill.type === 'api') {
        result = await this.executeApiSkill(skill, input);
      } else {
        result = `Skill ${skillName} executed with input: ${input}`;
      }

      this.eventBus.emit('skill:completed', {
        agentId: this.agentId,
        skillName,
        timestamp: new Date()
      });

      logger.debug(`Skill ${skillName} completed for ${this.agentId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to execute skill ${skillName}`, { error });
      this.eventBus.emit('skill:failed', {
        agentId: this.agentId,
        skillName,
        error: String(error),
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Think - invoke the model for reasoning
   */
  async think(message: Message): Promise<string> {
    try {
      logger.debug(`Agent ${this.agentId} thinking`, { messageId: message.id });

      const systemPrompt = this.config.systemPrompt || 
        `You are ${this.config.name}, an intelligent AI agent. Respond helpfully to the user.`;

      const response = await this.modelRouter.complete({
        provider: this.config.defaultModel,
        model: this.config.modelName || 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message.content
          }
        ],
        temperature: this.config.temperature || 0.7,
        maxTokens: this.config.maxTokens || 2048
      });

      const result = typeof response === 'string' ? response : response.content || '';
      
      this.eventBus.emit('agent:thought', {
        agentId: this.agentId,
        messageId: message.id,
        result,
        timestamp: new Date()
      });

      return result;
    } catch (error) {
      logger.error(`Failed to think for ${this.agentId}`, { error });
      throw error;
    }
  }

  /**
   * Match a skill based on message content
   */
  private matchSkill(content: string): { name: string } | null {
    for (const [skillName, skill] of this.skills.entries()) {
      if (skill.triggers && skill.triggers.some(trigger => 
        content.toLowerCase().includes(trigger.toLowerCase())
      )) {
        return { name: skillName };
      }
    }
    return null;
  }

  /**
   * Execute a builtin skill
   */
  private async executeBuiltinSkill(skillName: string, input: string): Promise<string> {
    // Implement builtin skill execution logic
    return `Builtin skill ${skillName} executed with result: processed "${input}"`;
  }

  /**
   * Execute an API skill
   */
  private async executeApiSkill(skill: SkillDefinition, input: string): Promise<string> {
    // Implement API skill execution logic
    return `API skill ${skill.name} called with result: processed "${input}"`;
  }

  /**
   * Get memory content
   */
  getMemory(): MemoryStore {
    return this.memory;
  }

  /**
   * Add to long-term memory
   */
  addToMemory(key: string, value: unknown): void {
    this.memory.longTerm.set(key, value);
    logger.debug(`Added to memory for ${this.agentId}`, { key });
  }

  /**
   * Retrieve from long-term memory
   */
  getFromMemory(key: string): unknown {
    return this.memory.longTerm.get(key);
  }

  /**
   * Get message history
   */
  getMessageHistory(): Message[] {
    return [...this.messageHistory];
  }

  /**
   * Update agent configuration
   */
  async updateConfig(newConfig: AgentConfig): Promise<void> {
    this.config = newConfig;
    logger.info(`Updated configuration for ${this.agentId}`);
  }

  /**
   * Shutdown the runtime
   */
  async shutdown(): Promise<void> {
    try {
      logger.info(`Shutting down runtime for ${this.agentId}`);
      this.isInitialized = false;
      this.messageHistory = [];
      this.memory.shortTerm = [];
      this.emit('runtime:shutdown');
    } catch (error) {
      logger.error(`Error shutting down runtime for ${this.agentId}`, { error });
    }
  }
}

export default AgentRuntime;
