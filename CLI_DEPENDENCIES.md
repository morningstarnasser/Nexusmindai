# NexusMind CLI - Required Dependencies

To use the CLI tool at `src/cli/index.ts`, ensure your `package.json` includes these dependencies:

## Required npm packages:

```json
{
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "boxen": "^7.1.1",
    "ora": "^7.0.1",
    "inquirer": "^8.2.5",
    "cli-table3": "^0.6.3",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Installation:

```bash
npm install commander chalk boxen ora inquirer cli-table3 ws
npm install --save-dev @types/node typescript
```

## Making the CLI executable:

```bash
chmod +x src/cli/index.ts
```

## Usage examples:

### Gateway commands
```bash
nexusmind gateway:start
nexusmind gateway:status
```

### Agent management
```bash
nexusmind agents list
nexusmind agents add my-agent
nexusmind agents info my-agent
nexusmind agents delete my-agent
nexusmind agents set-identity --agent my-agent --name "Assistant" --emoji "🤖"
nexusmind agents bind --agent my-agent --bind "#general"
nexusmind agents unbind --agent my-agent --bind "#general"
```

### Configuration
```bash
nexusmind config show
nexusmind config get gateway.port
nexusmind config set gateway.port 5000
```

### Heartbeat monitoring
```bash
nexusmind heartbeat status
nexusmind heartbeat trigger my-agent
```

### Interactive chat
```bash
nexusmind chat my-agent
```

### System status
```bash
nexusmind status
nexusmind version
```

## Features Implemented

✓ 17 total commands across 6 command groups
✓ Interactive prompts for agent creation (inquirer)
✓ Beautiful colored output (chalk)
✓ Boxed status displays (boxen)
✓ Loading spinners (ora)
✓ Tabular agent listings (cli-table3)
✓ ASCII art banner on startup
✓ Persistent JSON-based config/agents storage
✓ Masked API key display in config
✓ Interactive chat interface (readline-based)
✓ HTTP status checking to localhost:4848
✓ Full error handling with helpful messages
✓ Self-contained in single file (782 lines)

## Configuration Storage

The CLI automatically creates configuration files in:
- Default: `.nexusmind/config.json` and `.nexusmind/agents.json` in current directory
- Configurable via: `NEXUSMIND_CONFIG_DIR` environment variable

Configuration is automatically created with defaults on first run.
