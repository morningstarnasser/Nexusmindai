# NexusMind API Layer - Code Structure & Key Components

## RestAPI Core Architecture

### Request Flow
```
HTTP Request
    ↓
CORS Middleware
    ↓
JSON Parser
    ↓
Request ID Assignment
    ↓
Logging Middleware
    ↓
Authentication (if enabled)
    ↓
Rate Limiting (if enabled)
    ↓
Request Validation
    ↓
Route Handler
    ↓
Response + Headers
```

### Middleware Stack (api/RestAPI.ts)
- **CORS**: Configurable origins with credentials support
- **JSON Parsing**: Automatic request body parsing
- **Request ID**: Unique tracking ID per request (X-Request-ID header)
- **Logging**: Automatic request/response logging with duration
- **Auth**: JWT token and API key validation
- **Rate Limit**: IP/key-based request throttling
- **Validation**: Request schema validation

## API Routes Overview

### Agents Route (api/routes/agents.ts)
```typescript
GET  /api/agents                    // List all agents with pagination
POST /api/agents                    // Create new agent
GET  /api/agents/:id                // Get specific agent details
PUT  /api/agents/:id                // Update agent config/skills/status
DELETE /api/agents/:id              // Delete agent
POST /api/agents/:id/message        // Send message to agent
GET  /api/agents/:id/history        // Get conversation history
GET  /api/agents/:id/metrics        // Get agent performance metrics
```

### Workflows Route (api/routes/workflows.ts)
```typescript
GET  /api/workflows                 // List all workflows
POST /api/workflows                 // Create new workflow
POST /api/workflows/:id/run         // Execute workflow
GET  /api/workflows/:id/history     // View execution history
GET  /api/workflows/:id/status      // Get current status
```

### Skills Route (api/routes/skills.ts)
```typescript
GET    /api/skills                  // List installed skills
POST   /api/skills/install          // Install new skill
DELETE /api/skills/:id              // Uninstall skill
POST   /api/skills/:id/execute      // Execute skill with input
```

### Memory Route (api/routes/memory.ts)
```typescript
GET  /api/memory/search             // Search memory by query
POST /api/memory/store              // Store memory item
GET  /api/memory/graph              // Get memory relationships
GET  /api/memory/stats              // Get memory statistics
```

### Heartbeat Route (api/routes/heartbeat.ts)
```typescript
GET  /api/heartbeat/status          // Get heartbeat status
POST /api/heartbeat/trigger         // Trigger heartbeat signal
GET  /api/heartbeat/schedule        // View heartbeat schedules
POST /api/heartbeat/schedule        // Create heartbeat schedule
```

### System Route (api/routes/system.ts)
```typescript
GET  /api/system/health             // System health check
GET  /api/system/metrics            // Detailed system metrics
POST /api/system/backup             // Create backup
POST /api/system/restore            // Restore from backup
GET  /api/system/backup/:id         // Download backup file
```

## WebSocket Real-Time Features

### Event Subscriptions (api/WebSocketAPI.ts)
```typescript
// Subscribe to agent status updates
subscribe('agent:agent-123')

// Subscribe to conversation updates
subscribe('conversation:conv-456')

// Subscribe to live stream
subscribe('stream:agent-123')
```

### Broadcast Methods
```typescript
broadcastAgentStatus(agentId, status)        // Agent state change
broadcastConversationUpdate(convId, update)  // Message update
broadcastStreamEvent(agentId, event)         // Real-time stream
broadcastToAll(data)                         // System-wide message
```

## Authentication & Security

### API Key Management (api/middleware/auth.ts)
```typescript
// Generate API key for user
generateApiKey(userId)        // Returns: 'api-key-...'

// Revoke API key
revokeApiKey(key)             // Returns: boolean

// Get all valid keys
getValidApiKeys()             // Returns: Array of {key, userId}

// Token validation
validateToken(token)          // Checks JWT or API key store
```

### Rate Limiting (api/middleware/rateLimit.ts)
```typescript
// Per-IP rate limiting (100 req/min default)
IP 192.168.1.1 → 100 requests per minute

// Per-API-Key limiting
api-key-123 → 1000 requests per minute

// Per-Route limiting
POST /api/agents → 10 requests per minute
```

### Request Validation (api/middleware/validation.ts)
```typescript
// Define schema for route
registerSchema('/api/agents', 'POST', {
  name: { type: 'string', required: true },
  config: { type: 'object' },
  skills: { type: 'array' }
})

// Automatic validation before handler
```

## Database Schema (storage/migrations/001_initial.ts)

### Core Tables
```
agents
  ├─ id (PRIMARY KEY)
  ├─ name
  ├─ config (JSON)
  ├─ skills (JSON)
  ├─ status
  ├─ created_at
  └─ updated_at

conversations
  ├─ id (PRIMARY KEY)
  ├─ agent_id (FOREIGN KEY)
  ├─ title
  ├─ created_at
  └─ updated_at

messages
  ├─ id (PRIMARY KEY)
  ├─ conversation_id (FOREIGN KEY)
  ├─ sender
  ├─ content
  ├─ metadata (JSON)
  └─ created_at

workflows
  ├─ id (PRIMARY KEY)
  ├─ name
  ├─ steps (JSON)
  ├─ trigger (JSON)
  ├─ status
  ├─ created_at
  └─ updated_at

skills
  ├─ id (PRIMARY KEY)
  ├─ name (UNIQUE)
  ├─ parameters (JSON)
  ├─ enabled
  └─ installed_at

events
  ├─ id (PRIMARY KEY)
  ├─ type
  ├─ agent_id
  ├─ data (JSON)
  └─ created_at

audit_log
  ├─ id (PRIMARY KEY)
  ├─ action
  ├─ user_id
  ├─ resource_type
  ├─ details (JSON)
  └─ timestamp
```

### Indices for Performance
- agents(status)
- conversations(agent_id)
- messages(conversation_id, created_at DESC)
- skills(enabled)
- workflow_runs(workflow_id)
- events(type, created_at DESC)
- audit_log(action, timestamp DESC)

## Monitoring & Metrics

### System Metrics Collection (monitoring/MetricsCollector.ts)
```
Every 10 seconds:
├─ CPU Usage Percentage
├─ Memory Used/Total (MB)
├─ Memory Usage Percentage
├─ Disk Usage (GB)
├─ Request Count & Rate
├─ Response Time (avg, p95, p99)
├─ Error Rate
└─ Active Connections

Storage: Last 144 data points (24 hours)
```

### Health Checks (monitoring/HealthCheck.ts)
```
Periodic health check (30-second intervals):
├─ Database connectivity
├─ API provider connectivity
├─ Platform adapter status
├─ Memory usage (warning if > 90%)
├─ Disk space availability
└─ Overall status: healthy/degraded/unhealthy
```

## Main Entry Point

### Initialization Flow (index.ts)
```
1. Display ASCII banner
2. Load configuration from env vars
3. Create Express app
4. Initialize SQLite database
5. Create SQLiteStore
6. Initialize RestAPI
7. Initialize WebSocketAPI
8. Initialize MetricsCollector
9. Initialize HealthCheck
10. Start REST server
11. Setup graceful shutdown handlers
```

### Configuration (Environment Variables)
```
API_PORT=3000                           # Express server port
API_HOST=0.0.0.0                        # Bind address
DB_PATH=./nexusmind.db                  # SQLite database file
ENABLE_WEBSOCKET=true                   # WebSocket support
ENABLE_METRICS=true                     # Metrics collection
CORS_ORIGIN=http://localhost:3000       # CORS allowed origins
ENABLE_RATE_LIMIT=true                  # Rate limiting
ENABLE_AUTH=true                        # Authentication
```

### Graceful Shutdown
```
SIGINT (Ctrl+C) or SIGTERM:
1. Stop health checks
2. Stop metrics collection
3. Stop WebSocket server
4. Stop REST API server
5. Close database connection
6. Exit with code 0
```

## Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "requestId": "12345-abcde",
  "timestamp": "2026-03-06T12:00:00Z",
  "details": {}
}
```

### HTTP Status Codes
- 200 OK - Success
- 201 Created - Resource created
- 202 Accepted - Async operation started
- 400 Bad Request - Invalid input
- 401 Unauthorized - Auth required
- 404 Not Found - Resource not found
- 429 Too Many Requests - Rate limited
- 500 Internal Server Error - Server error
- 503 Service Unavailable - Health check failed

## Performance Optimizations

1. **Database Indices** - Fast lookups on frequently queried fields
2. **Connection Pooling** - Reuse database connections
3. **Metrics Caching** - Store last N measurements in memory
4. **Request Logging** - Async logging to avoid blocking
5. **Rate Limit Bucketing** - Efficient per-identifier tracking
6. **JSON Parsing** - Stream-based parsing for large payloads

## Extensibility Points

1. **Add New Routes** - Create new file in api/routes/
2. **Add Middleware** - Register in RestAPI.setupMiddleware()
3. **Custom Validation** - Use registerSchema() in validation.ts
4. **Database Migrations** - Create new migration files
5. **Metrics Collection** - Extend MetricsCollector class
6. **Health Checks** - Add new checks in HealthCheck class

