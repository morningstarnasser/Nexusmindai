```
 _   _            _   _     _   _ ___    _         _ 
| \ | |          | | | |   | | | |_ | | |  __| |
|  \| | ___  ____| | | | __| | | | | | | |__ |/ _ \
| |\  |/ _ \|_  /| | | |/ _ | | | | | |  __| | | | |
| | \ |  __/ / / | |_| | (_| | |_| | |_| |   |  __/
|_|  \_|___/___| |_____|\__,_|___/|_|_|_|   \___|

     AI AGENT ORCHESTRATION & MANAGEMENT PLATFORM
```

# NexusMind - Enterprise AI Agent Platform

**NexusMind** is an advanced AI agent orchestration and management platform designed for building, deploying, and monitoring intelligent agents across multiple communication platforms. It provides a comprehensive dashboard, powerful API, and flexible skill system for creating sophisticated AI-driven automation solutions.

## Features

### Core Capabilities
- **Multi-Platform Agent Support**: Deploy agents on Telegram, Slack, Discord, Email, and more
- **Intelligent Task Orchestration**: Create complex workflows that chain multiple agents
- **Advanced Memory System**: Persistent knowledge graphs with vector embeddings for semantic search
- **Modular Skill System**: Install, manage, and develop custom agent capabilities
- **Real-time Analytics**: Monitor token usage, message volumes, and cost metrics
- **Enterprise Security**: 2FA, API key rotation, activity logging, and IP whitelisting

### Dashboard Features
- System health monitoring with real-time status indicators
- Agent management with live performance metrics
- Workflow builder and execution tracking
- Memory explorer with knowledge graph visualization
- Skills marketplace and installer
- Comprehensive analytics and cost tracking
- Settings and integration management
- Real-time activity feeds and logs

### Backend Infrastructure
- FastAPI-based REST API with WebSocket support
- PostgreSQL for persistent data storage
- Redis for caching and rate limiting
- Vector embeddings with Pinecone/Weaviate
- Distributed task processing with Celery
- Telegram, Slack, Discord, and Email integrations
- LLM support: OpenAI, Anthropic, Ollama

## Quick Start

### Prerequisites
- Python 3.10+
- Docker & Docker Compose
- 4GB RAM minimum
- Node.js 18+ (for dashboard development)

### Option 1: Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/nexusmind/nexusmind.git
cd NexusMind

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env

# Start all services
docker-compose up -d

# Access dashboard
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

```bash
# Backend setup
cd src/gateway
pip install -r requirements.txt
python main.py --dev

# Dashboard setup (new terminal)
cd dashboard
npm install
npm run dev

# Access dashboard at http://localhost:3000
```

## Configuration

### Environment Variables

Create `.env` file with:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/nexusmind

# Cache & Message Queue
REDIS_URL=redis://localhost:6379

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434

# Platform Tokens
TELEGRAM_BOT_TOKEN=123456:ABC...
SLACK_BOT_TOKEN=xoxb-...
DISCORD_BOT_TOKEN=token...

# Vector Database
PINECONE_API_KEY=...
PINECONE_ENV=us-west-2

# API Configuration
API_PORT=8000
DEBUG=false
LOG_LEVEL=INFO
WORKERS=4
```

## Synology NAS Installation

NexusMind is optimized for Synology NAS with Docker support.

### Quick Setup

1. **Install Docker** via Synology Package Center
2. **Create directories**:
   ```
   /volume1/docker/nexusmind/
   ├── postgres/
   ├── redis/
   ├── data/
   ├── logs/
   └── skills/
   ```

3. **Download compose file**:
   ```bash
   wget https://raw.githubusercontent.com/nexusmind/nexusmind/main/deploy/synology/docker-compose.synology.yml
   ```

4. **Configure environment**:
   ```bash
   cat > .env << EOF
   DB_PASSWORD=YourSecurePassword
   TELEGRAM_BOT_TOKEN=your_token
   OPENAI_API_KEY=your_key
   BACKEND_PORT=8000
   FRONTEND_PORT=3000
   EOF
   ```

5. **Start services**:
   ```bash
   docker-compose -f docker-compose.synology.yml up -d
   ```

6. **Enable auto-start**:
   - DSM → Systemsteuerung → Planung
   - Benutzerdefiniertes Script bei System-Start
   - Script: `/volume1/docker/nexusmind/synology-task.sh`

For detailed instructions, see `deploy/synology/INSTALL_GUIDE.md`.

## Docker Compose Structure

```yaml
Services:
- PostgreSQL: Database (512MB RAM limit)
- Redis: Caching & Queue (256MB RAM limit)
- Backend: FastAPI application (1GB RAM limit)
- Frontend: Next.js dashboard (512MB RAM limit)
- Watchtower: Auto-updates containers daily

Networks:
- Internal bridge network for service communication
- PostgreSQL and Redis are not exposed to host
- Backend on port 8000, Frontend on port 3000
```

## API Reference

### Agent Endpoints

```bash
# List agents
GET /api/agents

# Get agent details
GET /api/agents/{agent_id}

# Create agent
POST /api/agents
{
  "name": "Support Bot",
  "platform": "slack",
  "model": "gpt-4",
  "system_prompt": "..."
}

# Update agent
PUT /api/agents/{agent_id}

# Delete agent
DELETE /api/agents/{agent_id}

# Start/Stop agent
POST /api/agents/{agent_id}/start
POST /api/agents/{agent_id}/stop

# Get agent logs
GET /api/agents/{agent_id}/logs
```

### Workflow Endpoints

```bash
# List workflows
GET /api/workflows

# Execute workflow
POST /api/workflows/{workflow_id}/run

# Get execution results
GET /api/workflows/{workflow_id}/runs/{run_id}
```

### Memory Endpoints

```bash
# Search memories
GET /api/memory/search?q=query

# Create memory
POST /api/memory
{
  "type": "knowledge_base",
  "content": "...",
  "agent_id": "..."
}

# Get memory stats
GET /api/memory/stats
```

### Analytics Endpoints

```bash
# Dashboard metrics
GET /api/analytics/dashboard

# Token usage
GET /api/analytics/tokens?period=week

# Message volumes
GET /api/analytics/messages?period=month

# Cost breakdown
GET /api/analytics/costs?period=month
```

### Full API documentation available at: `/docs` (Swagger UI)

## Skill Development

### Creating a Custom Skill

1. **Create skill directory**:
```bash
mkdir skills/my_skill
cd skills/my_skill
```

2. **Define skill.json**:
```json
{
  "name": "My Custom Skill",
  "version": "1.0.0",
  "description": "Does something amazing",
  "author": "Your Name",
  "capabilities": ["process", "analyze"],
  "required_env": ["API_KEY"],
  "dependencies": ["requests>=2.28.0"]
}
```

3. **Implement handler**:
```python
# skill.py
from nexusmind.skill import BaseSkill

class MySkill(BaseSkill):
    async def process(self, input_text: str) -> str:
        # Your implementation
        return result
    
    async def analyze(self, data: dict) -> dict:
        # Your analysis logic
        return analysis
```

4. **Install skill**:
```bash
curl -X POST http://localhost:8000/api/skills/install \
  -F "skill_file=@my_skill.zip"
```

## Architecture

```
NexusMind/
├── src/
│   ├── gateway/          # FastAPI backend
│   │   ├── adapters/     # Platform integrations
│   │   ├── agents/       # Agent implementations
│   │   ├── memory/       # Memory system
│   │   ├── skills/       # Skill manager
│   │   └── workflows/    # Workflow orchestration
│   ├── shared/           # Shared utilities & types
│   └── monitoring/       # Prometheus metrics
├── dashboard/            # Next.js frontend
│   ├── src/
│   │   ├── app/         # Page components
│   │   ├── components/  # Reusable components
│   │   ├── lib/         # API client
│   │   └── stores/      # Zustand state
│   └── package.json
├── deploy/
│   ├── docker-compose.yml
│   └── synology/        # Synology-specific configs
└── README.md
```

## Performance Optimization

### Memory Management
- PostgreSQL: 512MB limit
- Redis: 256MB limit (configurable)
- Backend: 1GB soft limit
- Frontend: 512MB limit

### Scaling Considerations
- Increase WORKERS environment variable for parallel processing
- Use Redis for distributed caching
- Consider separate database replica for read-heavy operations
- Deploy multiple backend instances behind a load balancer

### Monitoring
```bash
# Monitor container resources
docker stats

# View logs
docker logs -f nexusmind_backend

# Health check
curl http://localhost:8000/health
```

## Contributing Guidelines

1. **Fork & Clone**
   ```bash
   git clone https://github.com/yourusername/NexusMind.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Development Setup**
   ```bash
   # Backend
   cd src/gateway && pip install -e ".[dev]"
   
   # Frontend
   cd dashboard && npm install
   ```

4. **Testing**
   ```bash
   # Backend tests
   pytest tests/ -v
   
   # Frontend tests
   npm run test
   ```

5. **Code Quality**
   ```bash
   # Linting
   black . && flake8 .
   npm run lint
   
   # Type checking
   mypy src/
   npm run type-check
   ```

6. **Submit Pull Request**
   - Describe changes clearly
   - Include test coverage
   - Reference related issues

## Troubleshooting

### Dashboard doesn't load
- Check browser console for errors
- Verify backend is running: `curl http://localhost:8000/health`
- Check CORS settings in backend configuration

### Agents not responding
- Check Telegram/Slack bot tokens in `.env`
- Review agent logs: `docker logs nexusmind_backend`
- Verify agent status in dashboard

### High memory usage
- Check for memory leaks: `docker stats`
- Increase Redis memory limits
- Review active agents and workflows

### Database connection errors
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check connectivity
docker exec nexusmind_postgres pg_isready -U nexusmind
```

## Performance Benchmarks

Tested on Synology DS920+ with following resources:
- CPU: 4 cores shared
- RAM: 4GB (system) + 2GB allocated to NexusMind
- Storage: 2GB active containers + 5GB data

Results:
- API Response time: ~50-100ms
- Concurrent agents: 50+
- Webhook processing: 1000+ per minute
- Memory footprint: ~600MB base + 50MB per agent
- Dashboard load time: <2s

## Security Considerations

### Best Practices
1. **API Keys**: Store in secure environment variables, not in code
2. **Database**: Use strong passwords, enable SSL/TLS
3. **Firewall**: Restrict backend access to frontend only
4. **Updates**: Keep Docker images updated with Watchtower
5. **Backups**: Regular PostgreSQL backups to external storage
6. **Access Control**: Use 2FA for admin accounts

### Compliance
- GDPR: Memory data is stored locally on your NAS
- SOC 2: Ready for enterprise deployments
- Data Retention: Configurable retention policies

## License

NexusMind is licensed under the MIT License. See LICENSE file for details.

## Support & Community

- **Documentation**: https://docs.nexusmind.io
- **GitHub Issues**: https://github.com/nexusmind/nexusmind/issues
- **Discord Community**: https://discord.gg/nexusmind
- **Email Support**: support@nexusmind.io

## Roadmap

### Upcoming Features
- [ ] Multi-language support
- [ ] Advanced workflow UI builder
- [ ] Real-time collaboration features
- [ ] Kubernetes deployment support
- [ ] Mobile app for monitoring
- [ ] Advanced A/B testing framework
- [ ] Multi-tenant support for SaaS

### In Development
- [ ] Integration marketplace
- [ ] Advanced billing system
- [ ] Custom webhook builders
- [ ] AI prompt optimization

## Acknowledgments

NexusMind is built with:
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Next.js](https://nextjs.org/) - React framework
- [PostgreSQL](https://www.postgresql.org/) - Reliable database
- [Redis](https://redis.io/) - In-memory data store
- [OpenAI](https://openai.com/) - LLM provider
- [Recharts](https://recharts.org/) - Data visualization

---

**Built with ♥ by the NexusMind Team**

*Transform your business with intelligent agent automation*
