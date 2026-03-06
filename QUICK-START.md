# NexusMind - Quick Start Guide

## Start the Server (30 seconds)

```bash
cd /tmp/nexusmind
npm run dev
```

You should see:
```
🧠 NexusMind Gateway running on http://0.0.0.0:4848
   WebSocket: ws://0.0.0.0:4848
   API: http://localhost:4848/api/v1/
```

## Test It Works (in another terminal)

```bash
# Get health check
curl http://localhost:4848/api/v1/health

# Get system status
curl http://localhost:4848/api/v1/status | jq '.data.agents'

# List agents (should show default "main" agent)
curl http://localhost:4848/api/v1/agents | jq
```

## Create Your First Agent

```bash
curl -X POST http://localhost:4848/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "myagent",
    "name": "My Agent",
    "emoji": "🤖"
  }'
```

Response:
```json
{
  "ok": true,
  "data": {
    "id": "myagent",
    "name": "My Agent",
    "emoji": "🤖",
    ...
  }
}
```

## Send a Message

```bash
curl -X POST http://localhost:4848/api/v1/agents/myagent/message \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, NexusMind!"}'
```

## Check Agent Details

```bash
curl http://localhost:4848/api/v1/agents/myagent | jq
```

## WebSocket Testing

Install wscat if you don't have it:
```bash
npm install -g wscat
```

Connect to WebSocket:
```bash
wscat -c ws://localhost:4848
```

Send a message:
```json
{"type":"message","agentId":"myagent","content":"Test message"}
```

## View Configuration

```bash
curl http://localhost:4848/api/v1/config | jq
```

## Use the CLI

```bash
# List agents
npm run cli -- agents list

# Create agent via CLI
npm run cli -- agents create mybot "My Bot"

# Get agent info
npm run cli -- agents info mybot

# View config
npm run cli -- config view

# Set config value
npm run cli -- config set gateway.port 5000
```

## Stop the Server

Press Ctrl+C in the terminal where the server is running.

## File Locations

### Working Application
```
/tmp/nexusmind/
├── src/
│   ├── types.ts
│   ├── logger.ts
│   ├── config.ts
│   ├── agents.ts
│   ├── heartbeat.ts
│   ├── gateway.ts
│   ├── index.ts
│   └── cli/index.ts
├── dist/                    (compiled JavaScript)
├── node_modules/            (dependencies)
├── package.json
└── tsconfig.json
```

### Configuration & Data
```
~/.nexusmind/
├── nexusmind.json           (main config file)
└── agents/
    ├── main/                (default agent)
    │   ├── SOUL.md
    │   ├── HEARTBEAT.md
    │   ├── USER.md
    │   ├── memory/
    │   ├── skills/
    │   └── sessions/
    └── myagent/
        └── ...
```

## Full API Reference

### System Endpoints
- `GET /api/v1/health` - Health check
- `GET /api/v1/status` - Full system status
- `GET /api/v1/config` - Get configuration

### Agent Endpoints
- `GET /api/v1/agents` - List all agents
- `POST /api/v1/agents` - Create new agent
- `GET /api/v1/agents/:id` - Get agent details
- `DELETE /api/v1/agents/:id` - Delete agent
- `POST /api/v1/agents/:id/message` - Send message

### Heartbeat Endpoints
- `GET /api/v1/heartbeat` - Get heartbeat tasks
- `POST /api/v1/heartbeat/trigger/:id` - Trigger heartbeat

## Response Format

All API responses follow this format:

```json
{
  "ok": true,
  "data": { ... }
}
```

Or on error:
```json
{
  "ok": false,
  "error": "Error message"
}
```

## Example: Full Workflow

```bash
#!/bin/bash

# 1. Start server in background
cd /tmp/nexusmind
npm run dev &
SERVER_PID=$!

# 2. Wait for startup
sleep 2

# 3. Create agent
AGENT=$(curl -s -X POST http://localhost:4848/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{"id":"demo","name":"Demo Bot","emoji":"✨"}')
echo "Created: $AGENT"

# 4. Send message
MSG=$(curl -s -X POST http://localhost:4848/api/v1/agents/demo/message \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello!"}')
echo "Response: $MSG"

# 5. Get status
STATUS=$(curl -s http://localhost:4848/api/v1/status)
echo "Status: $(echo $STATUS | jq '.data.agents.total')"

# 6. Cleanup
kill $SERVER_PID
```

## Common Issues

### Port Already in Use
```bash
# Change the port
curl -X PUT http://localhost:4848/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{"key":"gateway.port","value":5000}'
```

### Need to Rebuild
```bash
cd /tmp/nexusmind
npm install
npm run build
npm run start
```

### Check Configuration
```bash
cat ~/.nexusmind/nexusmind.json
```

### View Logs
```bash
# Server logs go to stdout
# Look for lines starting with [gateway], [agents], [config], [heartbeat]
```

## Next Steps

1. **Integrate AI Model**: Update `src/gateway.ts` to call Claude/OpenAI API
2. **Add Tools**: Create skill/tool execution system
3. **Database**: Add PostgreSQL or MongoDB for persistence
4. **Authentication**: Add user/API key authentication
5. **Monitoring**: Add metrics collection
6. **Scaling**: Add multiple process support

## Documentation Files

- **BUILD_SUMMARY.md** - Full technical documentation
- **README-REBUILD.md** - Complete user guide
- **WORKING-VERSION.md** - Details about the working version
- **QUICK-START.md** - This file

## Support

The application includes built-in logging. Check the console output for diagnostic information:

```
[timestamp] [module] message
[2:30:30 PM] [gateway] 🧠 NexusMind Gateway running on http://0.0.0.0:4848
[2:30:30 PM] [agents] Agent created: myagent (My Agent ✨)
```

## Production Deployment

For production:

1. Set environment variables:
   ```bash
   export NEXUSMIND_HOME=/var/nexusmind
   export NODE_ENV=production
   export LOG_LEVEL=info
   ```

2. Build and run:
   ```bash
   npm run build
   npm run start
   ```

3. Use a process manager (PM2, systemd, etc.)

4. Set up reverse proxy (nginx, etc.)

5. Configure SSL/TLS

## All Set!

Your NexusMind application is ready to go.

Start it: `cd /tmp/nexusmind && npm run dev`

Enjoy building autonomous AI agents!
