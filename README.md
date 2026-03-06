<p align="center">
  <img src="dashboard/nexo-logo.png" alt="NEXO — Nexusmindai Mascot" width="200" height="200" style="border-radius: 20px;">
</p>

<h1 align="center">🐙 Nexusmindai</h1>

<p align="center">
  <strong>The Ultimate Autonomous AI Agent Platform — 1000x Beyond OpenClaw</strong>
</p>

<p align="center">
  <em>Created by <a href="https://github.com/morningstarnasser">Ali Nasser Morningstar</a></em>
</p>

<p align="center">
  <a href="https://github.com/morningstarnasser/Nexusmindai"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=flat-square&logo=node.js" alt="Node.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://github.com/morningstarnasser/Nexusmindai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/morningstarnasser/Nexusmindai?style=flat-square&color=blue" alt="MIT License"></a>
  <a href="https://github.com/morningstarnasser/Nexusmindai/stargazers"><img src="https://img.shields.io/github/stars/morningstarnasser/Nexusmindai?style=flat-square&color=yellow" alt="Stars"></a>
</p>

<p align="center">
  <a href="#-meet-nexo">Meet NEXO</a> &bull;
  <a href="#-features">Features</a> &bull;
  <a href="#-quick-start">Quick Start</a> &bull;
  <a href="#-cli-commands">CLI</a> &bull;
  <a href="#-api-reference">API</a> &bull;
  <a href="#-deployment">Deployment</a>
</p>

---

## 🐙 Meet NEXO

**NEXO** is Nexusmindai's mascot — a cosmic Neuro-Octopus born from the fusion of an octopus mind with a neural network. Like a real octopus with 9 brains and 3 hearts, NEXO represents Nexusmindai's multi-agent architecture, redundant systems, and unmatched intelligence.

> *OpenClaw has the Lobster 🦞 — Nexusmindai has NEXO 🐙*

Each of NEXO's 8 tentacles represents a core capability: Communication, Thinking, Memory, Action, Heartbeat, Security, Observation, and Creation.

---

## ✨ Features

### Multi-Platform Messaging Gateway
Deploy agents across **12+ communication platforms** simultaneously:

| Platform | Status | Platform | Status |
|----------|--------|----------|--------|
| Telegram | ✅ Ready | Signal | ✅ Ready |
| Discord | ✅ Ready | Matrix | ✅ Ready |
| Slack | ✅ Ready | IRC | ✅ Ready |
| WhatsApp | ✅ Ready | Email (IMAP/SMTP) | ✅ Ready |
| Microsoft Teams | ✅ Ready | SMS (Twilio) | ✅ Ready |
| Webhooks | ✅ Ready | Custom | ✅ Ready |

### Core Capabilities

- **🧠 Intelligent Agent System** — Create agents with personalities (SOUL.md), memory, and skills
- **💓 Heartbeat Engine** — Proactive autonomy with 5 frequency types (Pulse, Rhythm, Cycle, Season, Reactive)
- **🧬 5-Layer Memory** — Working, Short-Term, Long-Term (Vector), Knowledge Graph, Episodic
- **⚡ Skill System** — 500+ built-in skills with sandboxed execution
- **🔄 Workflow Engine** — Visual workflow builder with event triggers
- **🤖 Multi-Agent Swarms** — Teams of agents collaborating on complex tasks
- **🔒 Zero-Trust Security** — AES-256 encryption, capability-based permissions, audit logging
- **📊 Real-Time Dashboard** — Full web UI for monitoring and control
- **🎯 Smart Model Router** — Automatic routing to best AI model per task
- **📱 CLI Tool** — Full command-line management (like OpenClaw)

### What Makes Nexusmindai Different from OpenClaw

| Feature | OpenClaw 🦞 | Nexusmindai 🐙 |
|---------|-------------|--------------|
| Messaging | 6 platforms | 12+ platforms |
| Heartbeat | 30min cron | 5 frequency types + smart scheduling |
| Memory | Markdown files | 5-layer hybrid (Vector + Graph + Markdown) |
| Agents | Isolated workspaces | Agent Swarms with collaboration |
| Security | Basic | Zero-trust with E2E encryption |
| UI | Chat only | Full web dashboard + CLI + chat |
| Models | 4 providers | 20+ providers + local (Ollama) |
| Skills | ~100 | 500+ with visual builder |

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/morningstarnasser/Nexusmindai.git
cd Nexusmindai

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Start Gateway
npm run dev
```

The gateway starts on `http://localhost:4848` with the dashboard included.

Open `dashboard/index.html` in your browser to access the full web UI with real-time monitoring, agent management, and chat.

### Create Your First Agent

```bash
# Via CLI
npx tsx src/cli/index.ts agents add mybot

# Or via API
curl -X POST http://localhost:4848/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{"id": "mybot", "name": "My Bot", "emoji": "🤖"}'
```

---

## 🖥️ CLI Commands

Nexusmindai has a full CLI inspired by OpenClaw:

```bash
# Gateway
nexusmind gateway start          # Start the gateway
nexusmind gateway status         # Check gateway health

# Agents
nexusmind agents list            # List all agents
nexusmind agents add <id>        # Create agent (interactive)
nexusmind agents delete <id>     # Delete an agent
nexusmind agents info <id>       # Show agent details
nexusmind agents set-identity    # Set name, emoji
nexusmind agents bind            # Bind agent to channel
nexusmind agents unbind          # Unbind from channel

# Config
nexusmind config show            # Show configuration
nexusmind config get <key>       # Get config value
nexusmind config set <key> <val> # Set config value

# Heartbeat
nexusmind heartbeat status       # Show heartbeat tasks
nexusmind heartbeat trigger <id> # Manually trigger heartbeat

# Chat & Status
nexusmind chat <agentId>         # Interactive terminal chat
nexusmind status                 # Quick system overview
```

---

## 📡 API Reference

### System
```
GET  /api/v1/health              # Health check
GET  /api/v1/status              # Full system status
GET  /api/v1/config              # Configuration (masked keys)
PUT  /api/v1/config              # Update configuration
```

### Agents
```
GET    /api/v1/agents            # List all agents
POST   /api/v1/agents            # Create agent
GET    /api/v1/agents/:id        # Get agent + workspace
DELETE /api/v1/agents/:id        # Delete agent
PUT    /api/v1/agents/:id/identity  # Set name/emoji
POST   /api/v1/agents/:id/bind     # Bind to channel
POST   /api/v1/agents/:id/unbind   # Unbind from channel
POST   /api/v1/agents/:id/message  # Send message to agent
```

### Heartbeat
```
GET  /api/v1/heartbeat           # List heartbeat tasks
POST /api/v1/heartbeat/trigger/:id  # Manually trigger
```

### WebSocket
```
ws://localhost:4848              # Real-time event stream
```

Message types: `message`, `status`, `ping/pong`, `heartbeat`, `activity`

---

## 📊 Dashboard

Nexusmindai includes a full web dashboard (`dashboard/index.html`) — a single-file HTML app with Tailwind CSS, no build step required.

| Feature | Description |
|---------|-------------|
| 📊 System Overview | Real-time stats, uptime, version, connections |
| 🤖 Agent Management | Create, view, delete agents with live status |
| 💬 Live Chat | WebSocket-powered chat with any agent |
| ❤️ Heartbeat Monitor | View scheduled tasks and their status |
| ⚙️ Settings | Gateway config and model provider overview |

The dashboard connects to your local gateway via REST API and WebSocket for real-time updates. The NEXO 🐙 mascot greets you in the header, and the footer credits the creator.

---

## 🐳 Deployment

### Docker
```bash
docker-compose up -d
```

### Synology NAS
Nexusmindai runs perfectly on Synology NAS (DS220+, DS720+, DS920+):
```bash
cd deploy/synology
docker-compose -f docker-compose.synology.yml up -d
```
See [`deploy/synology/INSTALL_GUIDE.md`](deploy/synology/INSTALL_GUIDE.md) for the full German setup guide.

---

## 🏗️ Architecture

```
Nexusmindai/
├── src/
│   ├── index.ts              # Entry point — starts Gateway
│   ├── gateway.ts            # HTTP + WebSocket server
│   ├── agents.ts             # Agent lifecycle management
│   ├── config.ts             # JSON config manager
│   ├── heartbeat.ts          # Autonomous heartbeat engine
│   ├── logger.ts             # Structured logging (pino)
│   ├── types.ts              # TypeScript types
│   ├── cli/                  # CLI tool (17 commands)
│   ├── gateway/adapters/     # 12 platform adapters
│   ├── memory/               # 5-layer memory system
│   ├── skills/               # Skill runtime & manager
│   ├── security/             # Encryption, permissions, audit
│   └── api/                  # REST routes & middleware
├── dashboard/                # Web dashboard (HTML + Tailwind)
├── deploy/synology/          # Synology NAS deployment
├── config/                   # Configuration files
├── docs/                     # Documentation
└── tests/                    # Test suites
```

---

## 👤 Author

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/morningstarnasser">
        <img src="https://github.com/morningstarnasser.png" width="100px;" alt="Ali Nasser Morningstar"/>
        <br />
        <sub><b>Ali Nasser Morningstar</b></sub>
      </a>
      <br />
      <sub>Creator & Lead Developer</sub>
      <br />
      <a href="https://github.com/morningstarnasser">GitHub</a>
    </td>
  </tr>
</table>

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Submit a Pull Request

All contributions welcome — from bug fixes to new platform adapters to skill packs.

---

## 📄 License

[MIT](LICENSE) &copy; 2026 [Ali Nasser Morningstar](https://github.com/morningstarnasser)

---

<p align="center">
  <img src="dashboard/nexo-logo.png" alt="NEXO" width="60" height="60" style="border-radius: 12px;">
  <br />
  <sub>🐙 <strong>Nexusmindai</strong> — Your Mind, Amplified. Built by <a href="https://github.com/morningstarnasser">Morningstar</a></sub>
</p>
