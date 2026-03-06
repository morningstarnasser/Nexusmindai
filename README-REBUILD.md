# NexusMind - Fully Working Implementation

This is a complete, working implementation of NexusMind - an autonomous AI agent platform with a Gateway, WebSocket/HTTP API, and agent management system.

## Architecture

- **Single Gateway Process**: HTTP and WebSocket server on port 4848
- **Agent Management**: Create, delete, bind agents to channels
- **Session Persistence**: Memory-based sessions with message history
- **Heartbeat System**: Scheduled heartbeats for agents (configurable)
- **Configuration**: JSON-based nexusmind.json stored in ~/.nexusmind

## Quick Start

### Option 1: Run the Working Version (Recommended)

```bash
# Use the pre-built working version from /tmp/nexusmind
cd /tmp/nexusmind
npm run dev
# Server starts on http://localhost:4848
```

### Option 2: Rebuild Locally

```bash
cd /sessions/zealous-kind-cray/mnt/Manager-Ai/NexusMind

# Install dependencies (already done)
npm install

# Build TypeScript
npm run build

# Run the compiled version
npm run start

# Or run in dev mode with tsx
npm run dev
```

## Features

### API Endpoints

- `GET /api/v1/status` - System status and metrics
- `GET /api/v1/health` - Health check
- `GET /api/v1/agents` - List all agents
- `POST /api/v1/agents` - Create new agent
- `GET /api/v1/agents/:id` - Get agent details
- `DELETE /api/v1/agents/:id` - Delete agent
- `POST /api/v1/agents/:id/message` - Send message to agent
- `GET /api/v1/config` - Get configuration
- `GET /api/v1/heartbeat` - Get heartbeat tasks

### WebSocket Events

Connect to `ws://localhost:4848`:
- `message` - Send a message to an agent
- `status` - Get current system status
- `ping` - Keep-alive heartbeat

### CLI Commands

```bash
# List agents
npm run cli -- agents list

# Create agent
npm run cli -- agents create <id> <name> [--emoji 🤖]

# Delete agent
npm run cli -- agents delete <id>

# Get agent info
npm run cli -- agents info <id>

# Bind agent to channel
npm run cli -- agents bind <id> <channel>

# View config
npm run cli -- config view

# Set config value
npm run cli -- config set gateway.port 5000
```

## File Structure

```
src/
├── types.ts              # TypeScript interfaces
├── logger.ts             # Logging utility
├── config.ts             # Configuration manager (nexusmind.json)
├── agents.ts             # Agent manager and session storage
├── heartbeat.ts          # Heartbeat scheduling engine
├── gateway.ts            # HTTP/WebSocket server
├── index.ts              # Main entry point
└── cli/
    └── index.ts          # CLI commands
```

## Configuration

Configuration is stored in `~/.nexusmind/nexusmind.json`:

```json
{
  "gateway": {
    "port": 4848,
    "host": "0.0.0.0",
    "mode": "local"
  },
  "agents": {
    "defaults": {
      "model": "anthropic/claude-sonnet-4-6",
      "heartbeat": {
        "enabled": true,
        "every": "30m"
      }
    },
    "list": {
      "main": { ... }
    }
  }
}
```

## Testing

```bash
# Get status
curl http://localhost:4848/api/v1/status

# Create agent
curl -X POST http://localhost:4848/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{"id":"test","name":"Test Agent","emoji":"✨"}'

# Send message
curl -X POST http://localhost:4848/api/v1/agents/main/message \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, NexusMind!"}'
```

## What's Working

✓ Full TypeScript implementation
✓ Express HTTP server with CORS
✓ WebSocket server with real-time messaging
✓ Agent creation, deletion, management
✓ Session persistence (in-memory with file persistence structure)
✓ Heartbeat scheduling system
✓ Configuration management
✓ RESTful API endpoints
✓ CLI command interface
✓ Graceful shutdown handling
✓ Proper logging throughout

## Next Steps (For Full AI Integration)

To add AI model integration:

1. Add API key configuration for Claude/OpenAI/etc
2. Create message handler in gateway.ts that calls the model API
3. Stream responses back through WebSocket
4. Add support for tool calls and function execution
5. Implement RAG with vector databases
6. Add memory augmentation with tools

## Known Limitations

- In-memory session storage (persists to JSON on demand)
- No database backend (can be added)
- Placeholder AI responses (configure API keys for real responses)
- Single-process mode (clustering TBD)

## Build Info

- Node.js >= 20.0.0
- TypeScript 5.7.0
- Express 4.21.0
- WebSocket (ws) 8.18.0
- pino for logging

Generated: 2026-03-06
