# NexusMind Dashboard

A production-ready, single-file web dashboard for managing AI agents through the NexusMind Gateway API.

## Features

- Single HTML file - no build process needed
- Real-time WebSocket connection for live updates
- Dark theme with responsive design
- Full agent management (create, read, delete)
- Chat interface for agent communication
- System status monitoring
- Heartbeat task management
- Configuration viewer

## Quick Start

### Using Python HTTP Server (Recommended)

```bash
cd dashboard
python3 -m http.server 3000
```

Then open your browser to: `http://localhost:3000`

### Using the Provided Script

From the NexusMind directory:

```bash
./serve-dashboard.sh
```

### Direct File Opening

Simply open `index.html` in your web browser. The dashboard will attempt to connect to the NexusMind Gateway at `http://localhost:4848`.

## Requirements

- NexusMind Gateway running at `http://localhost:4848`
- Modern web browser with ES6+ support
- WebSocket support for real-time updates

## Architecture

### Single HTML File
- **Size**: ~1,069 lines
- **Dependencies**: Tailwind CSS CDN, Vanilla JavaScript
- **No Build Tools**: Zero configuration needed

### Technology Stack
- Vanilla JavaScript (ES6+)
- Tailwind CSS (CDN)
- WebSocket API
- Fetch API

## Pages/Sections

### Dashboard (Home)
- System status card (version, uptime, connections)
- Quick statistics (active agents, channels, API calls, errors)
- Agent overview cards
- Real-time activity feed

### Agents
- List all agents with status badges
- Create agent modal (ID, name, emoji, model)
- View detailed agent information
- Delete agents with confirmation
- Display SOUL.md and HEARTBEAT.md files

### Chat
- Select agent from dropdown
- Real-time chat interface
- Message history with sender information
- Send messages via WebSocket
- Display agent emoji and metadata

### Heartbeat
- List all configured heartbeat tasks
- Show task status (idle, running, error)
- Last run timestamps
- Manual trigger button

### Settings
- View gateway configuration
- Display model provider settings
- Show API configuration status
- Gateway port and environment info

## API Endpoints Used

```
GET  /status                    - System status
GET  /agents                    - List all agents
POST /agents                    - Create agent
GET  /agents/{id}               - Get agent details
DELETE /agents/{id}             - Delete agent
POST /agents/{id}/chat          - Send message
GET  /config                    - Get gateway config
GET  /heartbeat                 - Get heartbeat tasks
POST /heartbeat/run             - Run heartbeat
WS   /ws                        - WebSocket connection
```

## WebSocket Events

The dashboard listens for these WebSocket events:

- `agent_created` - New agent created
- `agent_deleted` - Agent removed
- `message` - Chat message received
- `status_update` - System status update

## Error Handling

- Try/catch blocks on all API calls
- Graceful fallbacks when API is unavailable
- Automatic WebSocket reconnection (3-second retry)
- User-friendly error notifications
- Timeout handling (5-10 seconds per request)

## Features in Detail

### Real-Time Updates
- WebSocket connection for live agent events
- Activity feed showing all system events
- Auto-reconnect on disconnect
- Status indicators (green/red) for connections

### Agent Management
- Create agents with custom emoji and model
- View detailed agent information with files
- Delete agents with confirmation
- Quick status indicators

### Chat System
- Select agent from dropdown
- Real-time message exchange
- Message history persistence during session
- User-friendly message bubbles

### Dashboard Analytics
- Real-time system statistics
- Uptime tracking
- Connection count monitoring
- Message count statistics

## Customization

Edit the API_BASE and WS_BASE constants at the top of the script:

```javascript
const API_BASE = 'http://localhost:4848';
const WS_BASE = 'ws://localhost:4848';
```

## Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Production Deployment

For production use:

1. Replace `localhost:4848` with your actual Gateway URL
2. Use HTTPS (change to `https://` and `wss://`)
3. Configure CORS headers on the Gateway
4. Enable proper authentication if needed
5. Serve behind a reverse proxy (nginx, Apache)

## Performance

- Lightweight single file (~50KB uncompressed)
- No external dependencies (only CDN resources)
- Efficient DOM updates
- Minimal memory footprint
- WebSocket for real-time efficiency

## Troubleshooting

### Dashboard Won't Connect
1. Verify Gateway is running on port 4848
2. Check browser console for CORS errors
3. Ensure WebSocket support is enabled
4. Check network connection

### No Real-Time Updates
1. Check WebSocket connection status indicator
2. Verify Gateway WebSocket endpoint is working
3. Check browser console for errors
4. Try reconnecting (refresh page)

### Agent Creation Fails
1. Verify all form fields are filled
2. Check that agent ID is unique
3. Review API logs on Gateway

## Files

- `index.html` - Main dashboard application (1,069 lines)
- `README.md` - This documentation

## Support

For issues or feature requests, check the NexusMind Gateway logs and browser console for error messages.

---

Built with vanilla JavaScript and Tailwind CSS. Zero build steps, maximum simplicity.
