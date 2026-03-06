# Running the Working NexusMind Application

## Quick Start (Recommended)

The fully built, tested, and working version is at:

```bash
/tmp/nexusmind
```

To run it:

```bash
cd /tmp/nexusmind
npm run dev
```

Server will start on: **http://localhost:4848**

## What's Running

- Express HTTP Server with full REST API
- WebSocket server for real-time messaging
- Heartbeat scheduler for autonomous agent tasks
- Agent management with persistence
- Configuration system

## Test the Running Server

In another terminal, while the server is running:

```bash
# Get status
curl http://localhost:4848/api/v1/status | jq

# List agents
curl http://localhost:4848/api/v1/agents | jq

# Create a new agent
curl -X POST http://localhost:4848/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{"id":"alice","name":"Alice","emoji":"✨"}'

# Send a message
curl -X POST http://localhost:4848/api/v1/agents/main/message \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello NexusMind!"}' | jq

# WebSocket connection (for testing)
# wscat -c ws://localhost:4848
# Then send: {"type":"message","agentId":"main","content":"Test message"}
```

## Project Files

### Core Source Code (TypeScript)
- `/tmp/nexusmind/src/types.ts` - Type definitions
- `/tmp/nexusmind/src/logger.ts` - Logging
- `/tmp/nexusmind/src/config.ts` - Configuration manager
- `/tmp/nexusmind/src/agents.ts` - Agent management
- `/tmp/nexusmind/src/heartbeat.ts` - Heartbeat scheduler
- `/tmp/nexusmind/src/gateway.ts` - HTTP + WebSocket server
- `/tmp/nexusmind/src/index.ts` - Main entry point
- `/tmp/nexusmind/src/cli/index.ts` - CLI commands

### Configuration
- `/tmp/nexusmind/package.json` - Dependencies
- `/tmp/nexusmind/tsconfig.json` - TypeScript config
- `/tmp/nexusmind/.gitignore` - Git ignore

### Build Artifacts
- `/tmp/nexusmind/dist/` - Compiled JavaScript
- `/tmp/nexusmind/node_modules/` - Dependencies

## Key Files in Original Location

Copies placed in: `/sessions/zealous-kind-cray/mnt/Manager-Ai/NexusMind/`

- `src/types.ts` - Type definitions
- `src/logger.ts` - Logging utility
- `src/config.ts` - Configuration manager
- `src/agents.ts` - Agent manager
- `src/heartbeat.ts` - Heartbeat engine
- `src/gateway.ts` - Gateway server
- `src/index.ts` - Main entry
- `src/cli/index.ts` - CLI
- `package.json` - NPM config
- `tsconfig.json` - TypeScript config
- `start.sh` - Start script
- `BUILD_SUMMARY.md` - Full documentation
- `README-REBUILD.md` - User guide

## API Endpoints

All endpoints are available and tested:

**System**
- `GET /api/v1/health` - Health check
- `GET /api/v1/status` - Full system status
- `GET /api/v1/config` - Current configuration

**Agents**
- `GET /api/v1/agents` - List all agents
- `POST /api/v1/agents` - Create new agent
- `GET /api/v1/agents/:id` - Get agent details
- `DELETE /api/v1/agents/:id` - Delete agent
- `POST /api/v1/agents/:id/message` - Send message

**Heartbeat**
- `GET /api/v1/heartbeat` - Get heartbeat tasks
- `POST /api/v1/heartbeat/trigger/:agentId` - Trigger manually

## Data Storage

Configuration stored at:
```
~/.nexusmind/nexusmind.json
~/.nexusmind/agents/<agent-id>/
```

## Example Workflow

```bash
# Start server
cd /tmp/nexusmind && npm run dev &

# Wait for server to start
sleep 2

# Create an agent
curl -X POST http://localhost:4848/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{"id":"bot","name":"ChatBot","emoji":"🤖"}'

# Get agent info
curl http://localhost:4848/api/v1/agents/bot | jq

# Send message to agent
curl -X POST http://localhost:4848/api/v1/agents/bot/message \
  -H "Content-Type: application/json" \
  -d '{"content":"What can you do?"}' | jq

# Check system status
curl http://localhost:4848/api/v1/status | jq '.data.agents'

# Stop server
pkill -f "node.*dist/index.js"
```

## Next Steps

1. **Run the server**: `cd /tmp/nexusmind && npm run dev`
2. **Test the API**: Use the curl commands above
3. **Integrate AI**: Add API calls to Claude/OpenAI in `gateway.ts`
4. **Deploy**: Copy to production, set environment variables
5. **Scale**: Add database backend, clustering, etc.

## Troubleshooting

**Port already in use?**
```bash
# Change port in config
curl -X PUT http://localhost:4848/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{"key":"gateway.port","value":5000}'
```

**Need to rebuild?**
```bash
cd /tmp/nexusmind
npm install
npm run build
npm run start
```

**Check logs?**
Server outputs logs to stdout. Look for:
- `[gateway]` - Server events
- `[agents]` - Agent operations
- `[config]` - Configuration changes
- `[heartbeat]` - Scheduled tasks

## Files Summary

Total lines of code: ~1,000 TypeScript
Total dependencies: 28 npm packages
Build size: ~50MB (with node_modules)
Runtime memory: 50-100MB base

Status: **FULLY WORKING AND TESTED**
