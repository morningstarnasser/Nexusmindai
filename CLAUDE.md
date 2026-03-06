# Nexusmindai — Project Documentation

> The Ultimate Autonomous AI Agent Platform
> Created by Ali Nasser Morningstar

## Overview

Nexusmindai is a multi-agent AI platform with a gateway server, real-time dashboard, CLI tool, and 12+ messaging platform adapters. Mascot: NEXO (pink octopus).

## Tech Stack

- **Runtime:** Node.js >= 20.0.0
- **Language:** TypeScript 5.x
- **Server:** Express + WebSocket (ws)
- **Dashboard:** Single HTML file + Tailwind CSS + Clerk Auth
- **Auth:** Clerk (pk_test / sk_test keys in .env)
- **Deployment:** Railway, Docker, Synology NAS
- **License:** MIT

## Quick Start

```bash
git clone https://github.com/morningstarnasser/Nexusmindai.git
cd Nexusmindai
npm install
cp .env.example .env   # Add your API keys
npm run dev             # Starts gateway + opens dashboard at http://localhost:4848
```

## Architecture

```
Nexusmindai/
├── src/
│   ├── index.ts              # Entry point — starts Gateway
│   ├── gateway.ts            # HTTP + WebSocket server + static dashboard
│   ├── agents.ts             # Agent lifecycle management (SQLite)
│   ├── config.ts             # JSON config manager (~/.nexusmind/)
│   ├── heartbeat.ts          # Autonomous heartbeat engine (node-cron)
│   ├── logger.ts             # Structured logging (pino)
│   ├── types.ts              # TypeScript interfaces
│   ├── cli/
│   │   ├── index.ts          # CLI entry point (commander)
│   │   └── nexusmind.ts      # All CLI commands (17 commands)
│   ├── gateway/adapters/     # 12 platform adapters
│   ├── memory/               # 5-layer memory system
│   ├── skills/               # Skill runtime & manager
│   ├── security/             # Encryption, permissions, audit
│   └── api/                  # REST routes & middleware
├── dashboard/
│   ├── index.html            # Full dashboard (single file, Tailwind + Clerk)
│   ├── nexo-logo.png         # NEXO mascot (transparent PNG)
│   ├── favicon.ico           # Browser favicon
│   └── nexo-mascot.svg       # Original SVG mascot
├── deploy/synology/          # Synology NAS deployment
├── .env                      # API keys (not in git)
├── .env.example              # Template for .env
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript config (strict, ES2022)
└── CLAUDE.md                 # This file
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start gateway with tsx (development) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled version (production) |
| `npm run cli` | Run CLI tool |

## API Endpoints

### System
```
GET  /health                    # Root health check (Railway)
GET  /api/v1/health             # Health check
GET  /api/v1/status             # Full system status
GET  /api/v1/config             # Configuration
```

### Agents
```
GET    /api/v1/agents           # List all agents
POST   /api/v1/agents           # Create agent {id, name, emoji}
GET    /api/v1/agents/:id       # Get agent details
DELETE /api/v1/agents/:id       # Delete agent
POST   /api/v1/agents/:id/message  # Send message to agent
```

### API Keys
```
GET  /api/v1/config/keys        # Get masked API keys
PUT  /api/v1/config/keys        # Save API keys {provider: key}
```

### Heartbeat
```
GET  /api/v1/heartbeat          # List heartbeat tasks
```

### WebSocket
```
ws://localhost:4848             # Real-time event stream
Message types: message, status, ping/pong, heartbeat, activity
```

## CLI Commands

```bash
nexusmind gateway start          # Start the gateway
nexusmind gateway status         # Check health
nexusmind agents list            # List all agents
nexusmind agents add <id>        # Create agent (interactive, emoji picker)
nexusmind agents delete <id>     # Delete an agent
nexusmind agents info <id>       # Show agent details
nexusmind agents set-identity    # Set name, emoji
nexusmind agents bind            # Bind agent to channel
nexusmind agents unbind          # Unbind from channel
nexusmind config show            # Show configuration
nexusmind config get <key>       # Get config value
nexusmind config set <key> <val> # Set config value
nexusmind heartbeat status       # Show heartbeat tasks
nexusmind heartbeat trigger <id> # Manually trigger heartbeat
nexusmind chat <agentId>         # Interactive terminal chat
nexusmind status                 # Quick system overview
```

## Dashboard Features

- **System Overview:** Real-time stats, uptime, version, connections
- **Agent Management:** Create, view, delete agents with emoji picker
- **Live Chat:** WebSocket-powered chat with any agent
- **Heartbeat Monitor:** View scheduled tasks and their status
- **Settings:** API key management (Anthropic, OpenAI, Google, Groq, Mistral, Ollama)
- **Auth:** Clerk login required (dark theme)
- **User Button:** Profile/logout in header

## Supported AI Providers

- Anthropic (Claude) — `ANTHROPIC_API_KEY`
- OpenAI (GPT) — `OPENAI_API_KEY`
- Google (Gemini) — `GOOGLE_AI_API_KEY`
- Groq — `GROQ_API_KEY`
- Mistral — `MISTRAL_API_KEY`
- DeepSeek — `DEEPSEEK_API_KEY`
- Ollama (local) — `http://localhost:11434`

## Messaging Platforms (12+)

Telegram, Discord, Slack, WhatsApp, Microsoft Teams, Signal, Matrix, IRC, Email (IMAP/SMTP), SMS (Twilio), Webhooks, Custom

## Agent System

- Agents have: id, name, emoji, model, channels, bindings
- Personality via SOUL.md files
- Heartbeat Engine: 5 frequency types (Pulse, Rhythm, Cycle, Season, Reactive)
- 5-Layer Memory: Working, Short-Term, Long-Term (Vector), Knowledge Graph, Episodic

## NEXO Character

NEXO is a cosmic Neuro-Octopus — the mascot of Nexusmindai. 8 tentacles represent:
Communication, Thinking, Memory, Action, Heartbeat, Security, Observation, Creation

## Deployment

### Railway
- Uses `npm run build` then `npm start`
- Health check: `/health`
- Set `PORT` env var (auto by Railway)
- Set Clerk keys in Railway env vars

### Docker
```bash
docker-compose up -d
```

### Synology NAS
```bash
cd deploy/synology
docker-compose -f docker-compose.synology.yml up -d
```

## Environment Variables (.env)

```
PORT=4848
NODE_ENV=development
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_FRONTEND_API=https://fast-bat-24.clerk.accounts.dev
```

## Git Remote

- **Origin:** github.com/morningstarnasser/Nexusmindai
- **Branch:** main

## Author

Ali Nasser Morningstar — https://github.com/morningstarnasser
