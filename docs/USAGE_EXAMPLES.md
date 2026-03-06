# NexusMind Core Engine - Usage Examples

This document provides practical examples of how to use the core engine and gateway files.

## 1. Initializing NexusCore

```typescript
import { NexusCore } from './src/core/NexusCore.js';
import type { NexusCoreConfig, ModelProvider } from './src/types/index.js';

// Define Anthropic as a model provider
const providers: ModelProvider[] = [
  {
    name: 'anthropic',
    type: 'both',
    apiKey: process.env.ANTHROPIC_API_KEY,
    priority: 1
  }
];

const config: NexusCoreConfig = {
  configPath: './config',
  eventHistorySize: 1000,
  maxConcurrentTasks: 10,
  enableRetry: true,
  modelProviders: providers,
  gatewayConfig: {
    port: 3000,
    host: 'localhost'
  }
};

const nexusCore = new NexusCore(config);
await nexusCore.start();

// Get access to subsystems
const agentManager = nexusCore.getAgentManager();
const eventBus = nexusCore.getEventBus();
const taskQueue = nexusCore.getTaskQueue();
const modelRouter = nexusCore.getModelRouter();
```

## 2. Creating and Managing Agents

```typescript
import type { AgentConfig } from './src/types/index.js';

// Define an agent configuration
const agentConfig: AgentConfig = {
  id: 'support-agent',
  name: 'Customer Support Agent',
  description: 'Handles customer inquiries',
  version: '1.0.0',
  defaultModel: 'anthropic',
  modelName: 'claude-3-5-sonnet-20241022',
  systemPrompt: 'You are a helpful customer support agent. Be friendly and professional.',
  temperature: 0.7,
  maxTokens: 2048,
  skills: [
    {
      name: 'search-kb',
      description: 'Search knowledge base',
      type: 'api',
      triggers: ['search', 'find', 'look for'],
      config: { endpoint: 'https://kb.example.com/search' }
    },
    {
      name: 'create-ticket',
      description: 'Create support ticket',
      type: 'api',
      triggers: ['ticket', 'issue', 'problem'],
      config: { endpoint: 'https://tickets.example.com/api/create' }
    }
  ]
};

// Create the agent
const agent = await agentManager.createAgent('support-agent', agentConfig);

// List all agents
const agents = agentManager.listAgents();
console.log(`Loaded ${agents.length} agents`);

// Update agent configuration
await agentManager.updateAgent('support-agent', {
  temperature: 0.5,
  maxTokens: 4096
});

// Get agent status
const status = agentManager.getAgentStatus('support-agent');
console.log(`Agent status: ${status}`);

// Delete an agent
await agentManager.deleteAgent('support-agent');
```

## 3. Processing Messages

```typescript
import type { Message } from './src/types/index.js';

// Get an agent
const agent = agentManager.getAgent('support-agent');

// Create a message
const message: Message = {
  id: 'msg-123',
  platform: 'slack',
  channel: 'support',
  userId: 'user-456',
  content: 'I need help with my account',
  timestamp: new Date()
};

// Process the message
const response = await agent.processMessage(message);

console.log('Response:', response.content);
console.log('Agent:', response.agentId);

// Get message history
const history = agent.getMessageHistory();
console.log(`${history.length} messages in history`);

// Add to agent memory
agent.addToMemory('user-456-account-type', 'premium');

// Retrieve from memory
const accountType = agent.getFromMemory('user-456-account-type');
console.log(`User account type: ${accountType}`);
```

## 4. Using the Event Bus

```typescript
// Subscribe to agent events
eventBus.on('agent:created', (event) => {
  console.log(`Agent created: ${event.agentId}`);
});

// Subscribe to message events
eventBus.on('message:*', (event) => {
  console.log(`Message event: ${event.data}`);
});

// Subscribe to specific skill completion
eventBus.on('skill:completed', (event) => {
  console.log(`Skill ${event.skillName} completed for ${event.agentId}`);
});

// Listen once for a specific event
eventBus.once('system:heartbeat', (event) => {
  console.log(`System heartbeat:`, event.metrics);
});

// Wait for an event with timeout
try {
  const result = await eventBus.waitFor('agent:created', 10000);
  console.log('Agent created:', result);
} catch (error) {
  console.error('Timeout waiting for agent creation');
}

// Add event filter
eventBus.addFilter((event) => {
  // Only process events with 'critical' in name
  return event.name.includes('critical') || event.name === 'system:heartbeat';
});

// Get event history
const history = eventBus.getHistory({ event: 'message:*', limit: 10 });
console.log(`Last 10 message events:`, history);

// Get event statistics
const stats = eventBus.getStats();
console.log(`Total events emitted: ${stats.totalEventsEmitted}`);
console.log(`Active listeners: ${stats.activeListeners}`);
```

## 5. Using the Task Queue

```typescript
import type { Task, TaskPriority } from './src/types/index.js';

// Define a task
const task: Task = {
  name: 'process-email',
  priority: 'P1' as TaskPriority,
  data: { emailId: 'email-789' },
  handler: async (data) => {
    console.log('Processing email:', data);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, processed: true };
  }
};

// Enqueue the task
const taskId = taskQueue.enqueue(task);
console.log(`Task enqueued with ID: ${taskId}`);

// Listen to task events
taskQueue.on('task:completed', (event) => {
  console.log(`Task ${event.taskId} completed with result:`, event.result);
});

taskQueue.on('task:failed', (event) => {
  console.log(`Task ${event.taskId} failed:`, event.error);
});

// Get task status
const retrievedTask = taskQueue.getTask(taskId);
console.log(`Task status: ${retrievedTask?.status}`);

// Get queue statistics
const stats = taskQueue.getStats();
console.log(`Queue stats:
  - Queued: ${stats.queued}
  - Processing: ${stats.processing}
  - Completed: ${stats.completed}
  - Failed: ${stats.failed}`);

// Get tasks by status
const completedTasks = taskQueue.getTasksByStatus('completed');
console.log(`${completedTasks.length} tasks completed`);
```

## 6. Using the Model Router

```typescript
import type { CompletionRequest } from './src/types/index.js';

// Make a completion request
const request: CompletionRequest = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful AI assistant.'
    },
    {
      role: 'user',
      content: 'What is the capital of France?'
    }
  ],
  temperature: 0.7,
  maxTokens: 1024
};

const response = await modelRouter.complete(request);
console.log('Response:', response.content);
console.log('Tokens used:', response.usage?.totalTokens);

// Stream a response
for await (const chunk of modelRouter.stream(request, {
  onChunk: (chunk) => process.stdout.write(chunk)
})) {
  // Streaming response
}

// Get embeddings
const embeddingRequest = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  texts: ['Hello world', 'Goodbye world']
};

const embeddings = await modelRouter.embed(embeddingRequest);
console.log(`Generated ${embeddings.embeddings.length} embeddings`);

// Count tokens
const tokenCount = modelRouter.countTokens({
  messages: request.messages
});
console.log(`Estimated tokens: ${tokenCount}`);

// Get cost tracking information
const costTracking = modelRouter.getCostTracking();
console.log(`Total cost: $${costTracking.totalCost}`);
console.log('Cost by provider:', costTracking.byProvider);

// Reset cost tracking
modelRouter.resetCostTracking();
```

## 7. Setting Up Platform Adapters

```typescript
import { Gateway } from './src/gateway/Gateway.js';
import { WebSocketAdapter, HTTPAdapter } from './src/gateway/ProtocolAdapter.js';

const gateway = nexusCore.getGateway();

// Register adapters
const wsAdapter = new WebSocketAdapter();
gateway.registerAdapter('websocket', wsAdapter);

const httpAdapter = new HTTPAdapter({ baseUrl: 'http://localhost:3001' });
gateway.registerAdapter('http', httpAdapter);

// Configure routing
gateway.configureRoute('websocket', 'general', 'support-agent');
gateway.configureRoute('websocket', 'sales', 'sales-agent');
gateway.configureRoute('http', 'api', 'api-agent');

// Get routing table
const routingTable = gateway.getRoutingTable();
console.log('Routing table:', routingTable);

// Get gateway status
const status = gateway.getStatus();
console.log(`Gateway status:
  - Running: ${status.isRunning}
  - Adapters: ${status.adapters.join(', ')}
  - Messages processed: ${status.messageCount}`);
```

## 8. Using the Configuration Manager

```typescript
import { ConfigManager } from './src/core/ConfigManager.js';

const configManager = new ConfigManager('./config');
await configManager.load();

// Get configuration values
const appName = configManager.get('app.name');
const port = configManager.get('api.port', 3000);
const agentDir = configManager.get('agent.configDir');

// Set configuration values
configManager.set('app.version', '1.1.0');
configManager.set('api.timeout', 5000);

// Load a specific agent configuration
const agentConfig = await configManager.loadAgentConfig('./config/agents/support-agent.yaml');

// Watch for configuration changes
configManager.watchFile('./config/default.yaml', () => {
  console.log('Configuration changed');
});

// Validate configuration
const isValid = configManager.validateConfig({
  app: { name: 'Test' },
  api: { port: 3000 }
});

console.log('Configuration valid:', isValid);
```

## 9. Complete Application Lifecycle

```typescript
async function main() {
  try {
    // Initialize core
    const nexusCore = new NexusCore(config);
    console.log('Starting NexusCore...');
    await nexusCore.start();

    const agentManager = nexusCore.getAgentManager();
    const eventBus = nexusCore.getEventBus();
    const gateway = nexusCore.getGateway();

    // Create an agent
    const agent = await agentManager.createAgent('support-agent', agentConfig);
    console.log('Agent created');

    // Setup adapters
    const wsAdapter = new WebSocketAdapter();
    gateway.registerAdapter('websocket', wsAdapter);
    gateway.configureRoute('websocket', 'support', 'support-agent');

    // Listen to system events
    eventBus.on('message:processed', (event) => {
      console.log(`Message processed by ${event.agentId}`);
    });

    // Monitor system status every 10 seconds
    const statusInterval = setInterval(() => {
      const status = nexusCore.getStatus();
      console.log(`System uptime: ${status.uptime}s, Agents: ${status.agents}`);
    }, 10000);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      clearInterval(statusInterval);
      await nexusCore.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
```

## 10. Error Handling and Recovery

```typescript
// Setup error listeners
eventBus.on('agent:error', (event) => {
  logger.error(`Agent ${event.agentId} error:`, event.data.error);
  // Could trigger recovery logic here
});

eventBus.on('task:failed', (event) => {
  logger.error(`Task ${event.taskId} failed:`, event.error);
  // Could retry or escalate
});

// Task with retry handling
const criticalTask: Task = {
  name: 'backup-data',
  priority: 'P0',
  data: { backup: true },
  handler: async (data) => {
    try {
      // Attempt backup
      return { success: true };
    } catch (error) {
      throw new Error(`Backup failed: ${error}`);
    }
  }
};

taskQueue.enqueue(criticalTask);

// Provider health checks
const providers = modelRouter.getAvailableProviders();
for (const provider of providers) {
  const isHealthy = await modelRouter.checkProviderHealth(provider);
  if (!isHealthy) {
    logger.warn(`Provider ${provider} is unhealthy`);
  }
}
```

## Configuration File Example

Create `config/default.yaml`:

```yaml
app:
  name: NexusMind
  version: 1.0.0

agent:
  configDir: ./config/agents

api:
  port: 3000
  timeout: 30000

logging:
  level: info

database:
  url: ${DATABASE_URL}
  pool: 10
```

Create `config/agents/support-agent.yaml`:

```yaml
id: support-agent
name: Support Agent
description: Handles customer support inquiries
version: 1.0.0

defaultModel: anthropic
modelName: claude-3-5-sonnet-20241022
temperature: 0.7
maxTokens: 2048

systemPrompt: |
  You are a helpful customer support agent.
  Be professional and empathetic.
  Escalate complex issues to specialists.

skills:
  - name: search-kb
    type: api
    triggers:
      - search
      - find
      - look for
    config:
      endpoint: https://kb.example.com/search

  - name: create-ticket
    type: api
    triggers:
      - ticket
      - issue
      - problem
```

These examples demonstrate the core functionality of the NexusMind system and how to use all the major components together.
