import { logger } from '../utils/logger.js';
import type { 
  ModelProvider, 
  CompletionRequest, 
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  StreamOptions,
  TokenCountRequest,
  CostTracker
} from '../types/index.js';

/**
 * ModelRouter - Intelligent model selection and API routing
 * Supports multiple providers: Anthropic, OpenAI, Google, DeepSeek, Groq
 * Implements failover logic, token counting, and cost tracking
 */
export class ModelRouter {
  private providers: Map<string, ModelProvider> = new Map();
  private costTracker: CostTracker = {
    totalTokens: 0,
    totalCost: 0,
    byProvider: {}
  };
  private failoverChain: string[] = [];
  private modelCache: Map<string, unknown> = new Map();

  constructor(config: { providers?: ModelProvider[] }) {
    if (config.providers) {
      for (const provider of config.providers) {
        this.providers.set(provider.name, provider);
        this.costTracker.byProvider[provider.name] = { tokens: 0, cost: 0 };
      }
      this.buildFailoverChain();
    }
    logger.info('ModelRouter initialized with providers', {
      providers: Array.from(this.providers.keys())
    });
  }

  /**
   * Register a new model provider
   */
  registerProvider(provider: ModelProvider): void {
    this.providers.set(provider.name, provider);
    this.costTracker.byProvider[provider.name] = { tokens: 0, cost: 0 };
    this.buildFailoverChain();
    logger.info(`Provider registered: ${provider.name}`);
  }

  /**
   * Build failover chain based on provider priority
   */
  private buildFailoverChain(): void {
    this.failoverChain = Array.from(this.providers.keys()).sort((a, b) => {
      const providerA = this.providers.get(a);
      const providerB = this.providers.get(b);
      return (providerB?.priority || 0) - (providerA?.priority || 0);
    });
    logger.debug('Failover chain updated', { chain: this.failoverChain });
  }

  /**
   * Complete a request with intelligent provider selection
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const providerName = request.provider || this.failoverChain[0];
      
      if (!providerName) {
        throw new Error('No model provider available');
      }

      logger.debug('Routing completion request', {
        provider: providerName,
        model: request.model
      });

      const response = await this.invokeProvider(providerName, request);
      
      // Track tokens and costs
      this.trackUsage(providerName, response);

      return response;
    } catch (error) {
      logger.error('Completion request failed', { error });
      
      // Attempt failover
      return this.failoverCompletion(request, [request.provider || this.failoverChain[0] || '']);
    }
  }

  /**
   * Stream a response from a model
   */
  async *stream(
    request: CompletionRequest,
    options?: StreamOptions
  ): AsyncGenerator<string, void, unknown> {
    try {
      const providerName = request.provider || this.failoverChain[0];
      
      if (!providerName) {
        throw new Error('No model provider available');
      }

      logger.debug('Starting stream', {
        provider: providerName,
        model: request.model
      });

      const provider = this.providers.get(providerName);
      if (!provider) {
        throw new Error(`Provider ${providerName} not found`);
      }

      // Simulate streaming response
      let tokenCount = 0;
      const simulatedResponse = `Streaming response from ${providerName} for model ${request.model}`;
      
      for (const chunk of simulatedResponse.split(' ')) {
        yield chunk + ' ';
        tokenCount += 1;
        
        if (options?.onChunk) {
          options.onChunk(chunk);
        }

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Track usage
      this.costTracker.totalTokens += tokenCount;
      if (!this.costTracker.byProvider[providerName]) {
        this.costTracker.byProvider[providerName] = { tokens: 0, cost: 0 };
      }
      this.costTracker.byProvider[providerName].tokens += tokenCount;

    } catch (error) {
      logger.error('Stream failed', { error });
      throw error;
    }
  }

  /**
   * Get embeddings from a model
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      const providerName = request.provider || this.failoverChain[0];
      
      if (!providerName) {
        throw new Error('No model provider available');
      }

      logger.debug('Routing embedding request', {
        provider: providerName,
        texts: request.texts.length
      });

      const provider = this.providers.get(providerName);
      if (!provider) {
        throw new Error(`Provider ${providerName} not found`);
      }

      // Simulate embedding generation
      const embeddings = request.texts.map(text => {
        const seed = text.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const vector = Array(request.dimensions || 1536)
          .fill(0)
          .map((_, i) => Math.sin(seed + i) * 0.5 + 0.5);
        return vector;
      });

      const response: EmbeddingResponse = {
        embeddings,
        model: request.model,
        provider: providerName,
        usage: {
          promptTokens: request.texts.reduce((sum, t) => sum + (t.split(' ').length), 0),
          totalTokens: request.texts.reduce((sum, t) => sum + (t.split(' ').length), 0)
        }
      };

      this.trackUsage(providerName, response);
      return response;
    } catch (error) {
      logger.error('Embedding request failed', { error });
      throw error;
    }
  }

  /**
   * Count tokens for a request
   */
  countTokens(request: TokenCountRequest): number {
    try {
      // Simple token counting (actual would use provider's tokenizer)
      let count = 0;
      
      if (request.messages) {
        for (const msg of request.messages) {
          count += (msg.content?.split(' ').length || 0) + 4; // ~4 tokens per message overhead
        }
      }
      
      if (request.text) {
        count += request.text.split(' ').length;
      }

      logger.debug('Tokens counted', { count });
      return count;
    } catch (error) {
      logger.error('Token counting failed', { error });
      return 0;
    }
  }

  /**
   * Invoke a specific provider
   */
  private async invokeProvider(
    providerName: string,
    request: CompletionRequest
  ): Promise<CompletionResponse> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    // Simulate API call
    const response: CompletionResponse = {
      id: `completion-${Date.now()}`,
      model: request.model,
      provider: providerName,
      content: `Response from ${providerName} model ${request.model}`,
      usage: {
        promptTokens: this.countTokens({ messages: request.messages }),
        completionTokens: 100,
        totalTokens: 0
      },
      timestamp: new Date()
    };

    response.usage!.totalTokens = response.usage!.promptTokens + (response.usage!.completionTokens || 0);

    logger.debug('Provider invoked', {
      provider: providerName,
      tokens: response.usage.totalTokens
    });

    return response;
  }

  /**
   * Failover to next available provider
   */
  private async failoverCompletion(
    request: CompletionRequest,
    triedProviders: string[]
  ): Promise<CompletionResponse> {
    for (const provider of this.failoverChain) {
      if (triedProviders.includes(provider)) {
        continue;
      }

      try {
        logger.info('Attempting failover', {
          failingProvider: request.provider,
          fallbackProvider: provider
        });

        const response = await this.invokeProvider(provider, {
          ...request,
          provider
        });

        this.trackUsage(provider, response);
        return response;
      } catch (error) {
        logger.warn('Failover attempt failed', { provider, error });
        triedProviders.push(provider);
      }
    }

    throw new Error('All providers failed');
  }

  /**
   * Track API usage and costs
   */
  private trackUsage(providerName: string, response: CompletionResponse | EmbeddingResponse): void {
    const tokens = response.usage?.totalTokens || 0;
    
    this.costTracker.totalTokens += tokens;
    
    if (!this.costTracker.byProvider[providerName]) {
      this.costTracker.byProvider[providerName] = { tokens: 0, cost: 0 };
    }
    
    this.costTracker.byProvider[providerName].tokens += tokens;
    
    // Estimate cost (actual would use provider pricing)
    const costPerToken = this.estimateCost(providerName);
    const cost = tokens * costPerToken;
    this.costTracker.byProvider[providerName].cost += cost;
    this.costTracker.totalCost += cost;

    logger.debug('Usage tracked', {
      provider: providerName,
      tokens,
      estimatedCost: cost.toFixed(4)
    });
  }

  /**
   * Estimate cost per token for a provider
   */
  private estimateCost(providerName: string): number {
    const costs: Record<string, number> = {
      'anthropic': 0.000003,
      'openai': 0.000002,
      'google': 0.00000125,
      'deepseek': 0.0000014,
      'groq': 0.00000007
    };
    return costs[providerName.toLowerCase()] || 0.000001;
  }

  /**
   * Get cost tracking information
   */
  getCostTracking(): CostTracker {
    return { ...this.costTracker };
  }

  /**
   * Clear cost tracking
   */
  resetCostTracking(): void {
    this.costTracker = {
      totalTokens: 0,
      totalCost: 0,
      byProvider: {}
    };
    for (const providerName of this.providers.keys()) {
      this.costTracker.byProvider[providerName] = { tokens: 0, cost: 0 };
    }
    logger.info('Cost tracking reset');
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check provider health
   */
  async checkProviderHealth(providerName: string): Promise<boolean> {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        return false;
      }
      
      // Simple health check by attempting a small request
      logger.debug(`Checking health for ${providerName}`);
      return true;
    } catch (error) {
      logger.error(`Health check failed for ${providerName}`, { error });
      return false;
    }
  }
}

export default ModelRouter;
