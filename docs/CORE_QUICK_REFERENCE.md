# NexusMind Core System - Quick Reference Guide

## System Overview

NexusMind consists of 4 core subsystems implemented in 15 TypeScript files:

### 1. Heartbeat System (Proactive Autonomy)
Enables autonomous task execution with intelligent scheduling.

**Key Classes:**
- `HeartbeatEngine` - Main autonomy engine with 5 heartbeat types
- `Scheduler` - Cron-based task scheduling
- `TaskPlanner` - Resource-aware task planning

**Usage:**
```typescript
import { HeartbeatEngine } from './heartbeat/HeartbeatEngine.js';

const heartbeat = new HeartbeatEngine(config);
await heartbeat.initialize();
heartbeat.pauseAll(); // Pause autonomous execution
```

---

### 2. Memory System (Persistent Context)
5-layer memory architecture for comprehensive context retention.

**Memory Layers:**
1. **WorkingMemory** - Fast ring buffer (100 entries, in-process)
2. **ShortTermMemory** - SQLite-backed (7 days, conversations)
3. **LongTermMemory** - Vector store (semantic search)
4. **KnowledgeGraph** - Entity relationships (pathfinding)
5. **EpisodicMemory** - Audit trail (markdown logs)

**Key Classes:**
- `MemoryManager` - Unified interface for all layers
- `WorkingMemory` - Fast in-process cache
- `ShortTermMemory` - Recent conversations
- `LongTermMemory` - Semantic search
- `KnowledgeGraph` - Entity relationships
- `EpisodicMemory` - Audit logs

**Usage:**
```typescript
import { MemoryManager } from './memory/MemoryManager.js';

const memory = new MemoryManager();
await memory.initialize();

// Store information
const entryId = await memory.store('User said hello', { user: 'alice' });

// Recall information
const entry = await memory.recall(entryId);

// Search across all layers
const results = await memory.search('hello', 10);

// Find relationships
const related = await memory.relate('alice');
```

---

### 3. Skills System (Capability Execution)
Framework for loading, managing, and executing skills/plugins.

**Key Classes:**
- `SkillManager` - Lifecycle management (install/enable/disable/execute)
- `SkillRuntime` - Isolated skill execution with timeouts

**Built-in Skills:**
- `memory-recall` - Access memory system
- `web-search` - Search the internet
- `code-execution` - Execute code safely
- `file-operations` - Read/write files
- `planning` - Complex task planning

**Usage:**
```typescript
import { SkillManager } from './skills/SkillManager.js';

const skills = new SkillManager();
await skills.initialize();

// Execute a skill
const result = await skills.execute('memory-recall', {
  query: 'previous conversations'
});

// Execute multiple skills in sequence
const results = await skills.executeSequence(
  ['memory-recall', 'planning'],
  initialInput
);
```

---

### 4. Security System (Zero-Trust Protection)
Multi-layer security with permissions, tokens, rate limiting, and audit logs.

**Key Classes:**
- `SecurityManager` - Zero-trust enforcement with tokens
- `PermissionSystem` - Capability-based permissions
- `AuditLogger` - Immutable audit trail
- `Encryption` - AES-256 encryption & secret management

**Usage:**
```typescript
import { SecurityManager } from './security/SecurityManager.js';

const security = new SecurityManager();
await security.initialize();

// Check security
const check = await security.checkSecurity({
  subject: 'user-123',
  action: 'delete',
  resource: 'document-456'
});

if (check.allowed) {
  if (check.requiresMFA) {
    // Prompt for MFA
  }
  // Execute action
}

// Issue capability token
const token = await security.issueToken(
  'user-123',
  ['memory:read', 'memory:write'],
  60 // expires in 60 minutes
);

// Encrypt secrets
const encrypted = security.encrypt('api-key-secret');
const decrypted = security.decrypt(encrypted);
```

---

## Integration Points

### With Agent System
```typescript
// In AgentRuntime
this.heartbeat = new HeartbeatEngine(agentConfig);
this.memory = new MemoryManager();
this.skills = new SkillManager();
this.security = new SecurityManager();
```

### With API System
```typescript
// In REST API
app.post('/memory/store', async (req, res) => {
  const entryId = await memoryManager.store(req.body.content);
  res.json({ entryId });
});

app.post('/skills/execute', async (req, res) => {
  const result = await skillManager.execute(req.body.skillId, req.body.input);
  res.json(result);
});
```

### Event Listening
```typescript
heartbeat.on('taskCompleted', (event) => {
  console.log('Task completed:', event.taskId);
});

memory.on('consolidated', (event) => {
  console.log('Memory consolidated:', event.jobs);
});

skills.on('skillExecutionCompleted', (result) => {
  console.log('Skill result:', result);
});

security.on('tokenIssued', (event) => {
  console.log('Token issued:', event.tokenId);
});
```

---

## Configuration

### HeartbeatEngine Config
```typescript
const config: IHeartbeatConfig = {
  agentConfigs: [
    {
      id: 'agent-1',
      heartbeatTasks: [
        {
          id: 'check-mail',
          name: 'Check Mail',
          type: 'rhythm',
          cronExpression: '*/5 * * * *', // Every 5 minutes
          priority: 'normal',
          timeout: 30000
        }
      ]
    }
  ]
};
```

### PermissionSystem Levels
```
minimal   -> Read-only access
basic     -> Read + internet
standard  -> Read/write + network
elevated  -> Delete + execution
admin     -> Full access + grant/revoke
```

---

## Performance Characteristics

| Component | Capacity | Retention | Speed |
|-----------|----------|-----------|-------|
| WorkingMemory | 100 entries | Current session | O(1) |
| ShortTermMemory | Unlimited | 7 days | O(n) |
| LongTermMemory | Unlimited | Forever | O(n) semantic |
| KnowledgeGraph | Unlimited | Forever | O(V+E) |
| EpisodicMemory | 5000 entries | Forever | O(n) |
| TaskQueue | 500 tasks | Session | O(1) |
| Audit Log | 50000 entries | Forever | O(n) |

---

## Error Handling

All systems use consistent error patterns:

```typescript
try {
  const result = await manager.operation();
} catch (error) {
  // Logged automatically
  // Events emitted for critical errors
  // Graceful degradation
}
```

---

## Monitoring & Statistics

All systems provide statistics:

```typescript
const hbStats = heartbeat.getSystemMetrics();
// { cpuLoad, memoryUsage, taskQueueLength, activeTaskCount }

const memStats = await memory.getStats();
// { timestamp, workingMemory, shortTermMemory, ... }

const skillStats = skills.getStats();
// { totalSkills, enabledSkills, totalExecutions, ... }

const secStats = security.getStats();
// { activeTokens, blockedSubjects, auditLogSize }
```

---

## Shutdown Sequence

```typescript
// Graceful shutdown
await heartbeat.shutdown();    // Stop all scheduled tasks
await skills.shutdown();        // Cleanup skill runtime
await memory.shutdown();        // Consolidate and save
await security.shutdown();      // Wipe sensitive data
```

---

## File Locations

```
/sessions/zealous-kind-cray/mnt/Manager-Ai/NexusMind/src/

heartbeat/
├── HeartbeatEngine.ts     (494 lines)
├── Scheduler.ts           (354 lines)
└── TaskPlanner.ts         (398 lines)

memory/
├── MemoryManager.ts       (492 lines)
├── WorkingMemory.ts       (174 lines)
├── ShortTermMemory.ts     (322 lines)
├── LongTermMemory.ts      (255 lines)
├── KnowledgeGraph.ts      (400 lines)
└── EpisodicMemory.ts      (317 lines)

skills/
├── SkillManager.ts        (459 lines)
└── SkillRuntime.ts        (283 lines)

security/
├── SecurityManager.ts     (450 lines)
├── PermissionSystem.ts    (365 lines)
├── AuditLogger.ts         (311 lines)
└── Encryption.ts          (375 lines)
```

Total: **15 files, 5,449 lines of production-quality TypeScript**
