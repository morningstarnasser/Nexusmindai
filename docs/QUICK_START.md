# NexusMind API Layer - Quick Start Guide

## Installation

```bash
# Install dependencies
npm install express ws sqlite3 @types/express @types/node @types/ws

# Or with yarn
yarn add express ws sqlite3 @types/express @types/node @types/ws
```

## Starting the Server

### Option 1: Direct Import
```typescript
import NexusMind from './src/index.js';

const nexusMind = new NexusMind({
  port: 3000,
  host: '0.0.0.0',
  dbPath: './nexusmind.db',
  enableWebSocket: true,
  enableMetrics: true,
  enableAuth: true,
  enableRateLimit: true,
});

await nexusMind.initialize();
await nexusMind.start();
```

### Option 2: Environment Variables
```bash
export API_PORT=3000
export API_HOST=0.0.0.0
export DB_PATH=./nexusmind.db
export ENABLE_WEBSOCKET=true
export ENABLE_METRICS=true
export ENABLE_AUTH=true
export ENABLE_RATE_LIMIT=true
export CORS_ORIGIN=http://localhost:3000

node --loader ts-node/esm src/index.ts
```

## API Examples

### Create an Agent
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-api-key-12345" \
  -d '{
    "name": "MyAgent",
    "config": {"model": "gpt-4"},
    "skills": ["search", "summarize"]
  }'
```

### List Agents
```bash
curl http://localhost:3000/api/agents \
  -H "X-API-Key: demo-api-key-12345"
```

### Send Message to Agent
```bash
curl -X POST http://localhost:3000/api/agents/agent-123/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-api-key-12345" \
  -d '{
    "message": "Hello, how are you?",
    "context": {}
  }'
```

### Create Workflow
```bash
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-api-key-12345" \
  -d '{
    "name": "DataProcessing",
    "description": "Process and analyze data",
    "steps": [
      {"name": "fetch", "action": "get_data"},
      {"name": "process", "action": "transform"},
      {"name": "store", "action": "save"}
    ],
    "trigger": {"type": "schedule", "cron": "0 * * * *"}
  }'
```

### Execute Workflow
```bash
curl -X POST http://localhost:3000/api/workflows/workflow-123/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-api-key-12345" \
  -d '{"input": {"data": "test"}}'
```

### Install Skill
```bash
curl -X POST http://localhost:3000/api/skills/install \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-api-key-12345" \
  -d '{
    "name": "WebSearch",
    "description": "Search the web",
    "category": "search",
    "parameters": [
      {"name": "query", "type": "string", "required": true},
      {"name": "limit", "type": "number", "default": 10}
    ]
  }'
```

### Execute Skill
```bash
curl -X POST http://localhost:3000/api/skills/skill-123/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-api-key-12345" \
  -d '{
    "input": {"query": "machine learning"},
    "context": {}
  }'
```

### Store Memory
```bash
curl -X POST http://localhost:3000/api/memory/store \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-api-key-12345" \
  -d '{
    "content": "User prefers concise responses",
    "type": "user_preference",
    "metadata": {"user_id": "user-123"},
    "ttl": 86400
  }'
```

### Search Memory
```bash
curl "http://localhost:3000/api/memory/search?q=preferences&type=user_preference" \
  -H "X-API-Key: demo-api-key-12345"
```

### Get System Health
```bash
curl http://localhost:3000/api/system/health
```

### Get System Metrics
```bash
curl http://localhost:3000/api/system/metrics \
  -H "X-API-Key: demo-api-key-12345"
```

### Create Backup
```bash
curl -X POST http://localhost:3000/api/system/backup \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-api-key-12345" \
  -d '{
    "label": "Daily Backup",
    "include_data": true
  }'
```

## WebSocket Examples

### Connect and Subscribe
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  // Subscribe to agent status updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'agent:agent-123'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Listen to Agent Status
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'agent:agent-123'
}));

// Will receive messages like:
// {
//   type: 'agent_status',
//   agentId: 'agent-123',
//   status: 'processing',
//   timestamp: '2026-03-06T12:00:00Z'
// }
```

### Listen to Conversation Updates
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'conversation:conv-456'
}));

// Will receive messages like:
// {
//   type: 'conversation_update',
//   conversationId: 'conv-456',
//   update: { new_message: ... },
//   timestamp: '2026-03-06T12:00:00Z'
// }
```

### Subscribe to Stream Events
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'stream:agent-123'
}));
```

## Authentication

### API Keys
Demo API key: `demo-api-key-12345`

#### Generate New API Key
```typescript
import { generateApiKey } from './src/api/middleware/auth.js';

const apiKey = generateApiKey('user-123');
console.log('New API Key:', apiKey);
```

#### Use in Requests
```bash
curl http://localhost:3000/api/agents \
  -H "X-API-Key: your-api-key-here"

# Or with Bearer token (JWT)
curl http://localhost:3000/api/agents \
  -H "Authorization: Bearer your-jwt-token"
```

## Environment Configuration

### Default Configuration
```env
API_PORT=3000
API_HOST=0.0.0.0
DB_PATH=./nexusmind.db
ENABLE_WEBSOCKET=true
ENABLE_METRICS=true
ENABLE_AUTH=true
ENABLE_RATE_LIMIT=true
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### Rate Limiting
- Default: 100 requests per minute per IP
- API Key users: 1000 requests per minute
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Testing

### Health Check
```bash
# Should return 200 if healthy
curl http://localhost:3000/health

# Should return 503 if degraded
curl http://localhost:3000/api/system/health
```

### API Root
```bash
curl http://localhost:3000
# Returns API info and available endpoints
```

## Debugging

### Enable Verbose Logging
```typescript
const nexusMind = new NexusMind({
  port: 3000,
  // Enable by setting NODE_DEBUG
});

process.env.DEBUG = 'nexusmind:*';
```

### View Request IDs
All API responses include `X-Request-ID` header for tracing:
```bash
curl -v http://localhost:3000/api/agents \
  -H "X-API-Key: demo-api-key-12345"

# Response headers:
# X-Request-ID: 1709804400123-abc123def
```

## Common Error Codes

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Validation Failed | Invalid request body |
| 401 | Unauthorized | Missing or invalid auth token |
| 404 | Not Found | Resource does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Server error |
| 503 | Service Unavailable | System health check failed |

## Database

### View Database File
```bash
# SQLite database created at specified path
ls -lh nexusmind.db

# Browse with sqlite3 CLI
sqlite3 nexusmind.db
sqlite> .tables
sqlite> SELECT COUNT(*) FROM agents;
```

## File Locations

All source files at:
```
/sessions/zealous-kind-cray/mnt/Manager-Ai/NexusMind/src/
```

Key directories:
- `api/` - REST API and WebSocket implementation
- `storage/` - Database layer
- `monitoring/` - Health checks and metrics
- `index.ts` - Main entry point

## Next Steps

1. Customize API routes in `api/routes/`
2. Add authentication middleware
3. Connect to your AI models in agent handlers
4. Implement custom skills in skills route
5. Add database migrations for your schema
6. Deploy with Docker or systemd

## Support

For issues or questions:
- Check logs in console output
- Verify environment variables are set
- Ensure required packages are installed
- Test endpoints with curl before integration
