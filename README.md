<p align="center">
  <img src="https://img.shields.io/badge/NexusMind-AI%20Agent%20Platform-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQyIDAtOC0zLjU4LTgtOHMzLjU4LTggOC04IDggMy41OCA4IDgtMy41OCA4LTggOHoiLz48L3N2Zz4=" alt="NexusMind">
</p>

<h1 align="center">NexusMind</h1>

<p align="center">
  <strong>Autonomous AI Agent Orchestration & Management Platform</strong>
</p>

<p align="center">
  <a href="https://github.com/morningstarnasser/Nexusmindai/actions"><img src="https://img.shields.io/github/actions/workflow/status/morningstarnasser/Nexusmindai/ci.yml?branch=main&style=flat-square&logo=github&label=CI" alt="CI"></a>
  <a href="https://github.com/morningstarnasser/Nexusmindai"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=flat-square&logo=node.js" alt="Node.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://github.com/morningstarnasser/Nexusmindai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/morningstarnasser/Nexusmindai?style=flat-square&color=blue" alt="MIT License"></a>
  <a href="https://github.com/morningstarnasser/Nexusmindai"><img src="https://img.shields.io/github/last-commit/morningstarnasser/Nexusmindai?style=flat-square&color=orange" alt="Last Commit"></a>
  <a href="https://github.com/morningstarnasser/Nexusmindai/stargazers"><img src="https://img.shields.io/github/stars/morningstarnasser/Nexusmindai?style=flat-square&color=yellow" alt="Stars"></a>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#api-reference">API</a> &bull;
  <a href="#deployment">Deployment</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

---

## What is NexusMind?

**NexusMind** is a self-hosted, open-source platform for building, deploying, and orchestrating autonomous AI agents across 12+ messaging platforms. It combines a powerful Node.js/TypeScript backend with a real-time Next.js dashboard for full visibility and control.

Deploy intelligent agents on Telegram, Discord, Slack, WhatsApp, Teams, Matrix, IRC, Email, SMS, and more — all from a single unified platform.

---

## Features

### Multi-Platform Agents
Deploy and manage agents across **12 communication platforms** simultaneously:

| Platform | Adapter | Status |
|----------|---------|--------|
| Telegram | `TelegramAdapter` | Ready |
| Discord | `DiscordAdapter` | Ready |
| Slack | `SlackAdapter` | Ready |
| WhatsApp | `WhatsAppAdapter` | Ready |
| Microsoft Teams | `TeamsAdapter` | Ready |
| Matrix | `MatrixAdapter` | Ready |
| IRC | `IRCAdapter` | Ready |
| Email (IMAP/SMTP) | `EmailAdapter` | Ready |
| SMS (Twilio) | `SMSAdapter` | Ready |
| Signal | `SignalAdapter` | Ready |
| Webhooks | `WebhookAdapter` | Ready |

### Core Capabilities
- **Autonomous Heartbeat Engine** — Proactive task scheduling with cron-based triggers
- **Tiered Memory System** — Short-term, long-term, and episodic memory with semantic search
- **Modular Skill System** — Install, execute, and chain reusable agent capabilities
- **Workflow Orchestration** — Build complex multi-step agent workflows
- **Real-Time WebSocket API** — Live updates for agent status, messages, and metrics
- **AES-256 Encryption** — Secure credentials, secrets, and sensitive agent data
- **Role-Based Access Control** — API key auth, rate limiting, input validation

### Dashboard
A full-featured **Next.js 15** dashboard with:
- System health monitoring and real-time metrics
- Agent management with live status indicators
- Workflow builder and execution tracker
- Memory explorer and knowledge browser
- Skills marketplace and installer
- Analytics with token usage and cost tracking
- Settings and integration management

---

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 9
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/morningstarnasser/Nexusmindai.git
cd Nexusmindai

# Install backend dependencies
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your API keys and credentials
```

### Configuration

Edit `.env` with your credentials:

```bash
# Database (Neon PostgreSQL or local)
DATABASE_URL=postgresql://user:password@host/dbname

# AI Providers
DEEPSEEK_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
NVIDIA_API_KEY=nvapi-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Messaging Platforms
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_BOT_NAME=mybotname
DISCORD_BOT_TOKEN=...
SLACK_BOT_TOKEN=xoxb-...

# Server
PORT=3001
API_PORT=3002
NODE_ENV=development
```

### Run

```bash
# Start backend (port 3001/3002)
npm run dev

# Start dashboard (port 3000) — in a separate terminal
npm run dashboard
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard.

### Build for Production

```bash
npm run build
npm start
```

---

## Architecture

```
NexusMind/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── core/                    # Core engine
│   │   ├── AgentManager.ts      # Agent lifecycle management
│   │   ├── ConfigManager.ts     # YAML config with env interpolation
│   │   └── EventBus.ts          # Event-driven communication
│   ├── gateway/                 # Multi-platform messaging gateway
│   │   ├── GatewayManager.ts    # Adapter orchestration
│   │   └── adapters/            # 12 platform adapters
│   ├── heartbeat/               # Autonomous scheduling engine
│   │   └── Scheduler.ts         # Cron-based heartbeat system
│   ├── memory/                  # Tiered memory system
│   │   └── MemoryManager.ts     # Short/long-term + episodic memory
│   ├── skills/                  # Skill execution engine
│   │   └── SkillsManager.ts     # Install, execute, chain skills
│   ├── workflows/               # Workflow orchestration
│   │   └── WorkflowEngine.ts    # Multi-step workflow execution
│   ├── security/                # Security layer
│   │   ├── Encryption.ts        # AES-256-GCM encryption
│   │   └── SecurityManager.ts   # Auth, audit, access control
│   ├── api/                     # REST + WebSocket API
│   │   ├── server.ts            # Express server
│   │   ├── websocket.ts         # Real-time WebSocket server
│   │   ├── routes/              # API route handlers
│   │   └── middleware/          # Auth, rate limit, validation
│   ├── storage/                 # Database layer
│   │   └── Database.ts          # SQLite + PostgreSQL support
│   ├── utils/                   # Shared utilities
│   │   ├── logger.ts            # Structured logging
│   │   ├── crypto.ts            # Hashing, HMAC, tokens
│   │   ├── helpers.ts           # Retry, debounce, throttle
│   │   └── formatters.ts        # Data formatting
│   └── types/                   # TypeScript type definitions
├── dashboard/                   # Next.js 15 frontend
│   ├── src/app/                 # App router pages
│   ├── src/components/          # Reusable UI components
│   ├── src/lib/                 # API client & utilities
│   └── src/stores/              # Zustand state management
├── config/                      # YAML configuration files
├── deploy/                      # Docker & deployment configs
└── docs/                        # Documentation
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20+ with TypeScript 5 |
| **Backend** | Express.js + WebSocket (ws) |
| **Frontend** | Next.js 15, React 19, Tailwind CSS |
| **State** | Zustand (dashboard), EventBus (backend) |
| **Database** | PostgreSQL (Neon) + SQLite |
| **Messaging** | Telegraf, Discord.js, @slack/bolt, whatsapp-web.js, matrix-js-sdk, botbuilder, Twilio, imap-simple, irc |
| **Security** | AES-256-GCM, scrypt, HMAC-SHA256 |
| **Scheduling** | node-cron |
| **UI Components** | Radix UI, Recharts, Lucide Icons |

---

## API Reference

### System
```
GET  /api/system/health          # Health check + memory stats
GET  /api/system/metrics         # System metrics (CPU, memory, uptime)
POST /api/system/backup          # Create system backup
POST /api/system/restore         # Restore from backup
```

### Agents
```
GET    /api/agents               # List all agents
POST   /api/agents               # Create agent
GET    /api/agents/:id           # Get agent details
PUT    /api/agents/:id           # Update agent
DELETE /api/agents/:id           # Delete agent
POST   /api/agents/:id/start    # Start agent
POST   /api/agents/:id/stop     # Stop agent
```

### Workflows
```
GET    /api/workflows            # List workflows
POST   /api/workflows            # Create workflow
POST   /api/workflows/:id/run   # Execute workflow
GET    /api/workflows/:id/runs  # Get execution history
```

### Skills
```
GET    /api/skills               # List installed skills
POST   /api/skills/install      # Install skill
DELETE /api/skills/:id          # Uninstall skill
POST   /api/skills/:id/execute  # Execute skill
```

### Memory
```
GET  /api/memory/search?q=query  # Semantic memory search
POST /api/memory                 # Store memory entry
GET  /api/memory/stats           # Memory statistics
```

### WebSocket
```
ws://localhost:3002/ws           # Real-time event stream
```

Events: `agent:status`, `message:received`, `workflow:progress`, `system:metrics`

---

## Deployment

### Docker Compose

```bash
docker-compose up -d
```

Services: Node.js backend, Next.js dashboard, PostgreSQL, optional Redis.

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway up
```

### Synology NAS

See [`deploy/synology/INSTALL_GUIDE.md`](deploy/synology/INSTALL_GUIDE.md) for detailed Synology Docker setup.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `TELEGRAM_BOT_TOKEN` | No | Telegram Bot API token |
| `TELEGRAM_BOT_NAME` | No | Telegram bot username |
| `DISCORD_BOT_TOKEN` | No | Discord bot token |
| `SLACK_BOT_TOKEN` | No | Slack Bot OAuth token |
| `DEEPSEEK_API_KEY` | No | DeepSeek AI API key |
| `GOOGLE_AI_API_KEY` | No | Google AI (Gemini) API key |
| `NVIDIA_API_KEY` | No | Nvidia AI API key |
| `OPENAI_API_KEY` | No | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | Anthropic API key |
| `TWILIO_ACCOUNT_SID` | No | Twilio account SID for SMS |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `PORT` | No | Backend port (default: 3001) |
| `API_PORT` | No | API port (default: 3002) |
| `NODE_ENV` | No | Environment (development/production) |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Install dependencies: `npm install`
4. Make your changes and ensure tests pass: `npm test`
5. Lint your code: `npm run lint`
6. Submit a Pull Request

---

## License

[MIT](LICENSE) &copy; 2026 NexusMind Contributors

---

<p align="center">
  <sub>Built with TypeScript, Express, Next.js, and a lot of caffeine.</sub>
</p>
