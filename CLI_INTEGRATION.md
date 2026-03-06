# NexusMind CLI Integration Guide

## File Location
```
/sessions/zealous-kind-cray/mnt/Manager-Ai/NexusMind/src/cli/index.ts
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd /sessions/zealous-kind-cray/mnt/Manager-Ai/NexusMind
npm install commander chalk boxen ora inquirer cli-table3 ws
npm install --save-dev @types/node typescript
```

### 2. Make CLI Executable (Optional)
```bash
chmod +x src/cli/index.ts
```

### 3. Add bin Script to package.json
```json
{
  "bin": {
    "nexusmind": "src/cli/index.ts"
  },
  "scripts": {
    "cli": "ts-node src/cli/index.ts"
  }
}
```

### 4. Link for Development (Optional)
```bash
npm link
nexusmind --help
```

## Architecture Overview

### Data Storage
- **Config**: `.nexusmind/config.json` - Gateway settings and API keys
- **Agents**: `.nexusmind/agents.json` - All registered agents with bindings

### Command Groups

```
nexusmind
├── gateway
│   ├── start      (Start gateway server)
│   └── status     (Check gateway health)
├── agents
│   ├── list       (Show all agents in table)
│   ├── add        (Create new agent interactively)
│   ├── delete     (Remove agent)
│   ├── info       (Show agent details)
│   ├── set-identity (Configure name/emoji)
│   ├── bind       (Bind to channel)
│   └── unbind     (Remove channel binding)
├── config
│   ├── show       (Display full config)
│   ├── get        (Read specific value)
│   └── set        (Update value)
├── heartbeat
│   ├── status     (Check agent health)
│   └── trigger    (Force heartbeat)
├── chat           (Interactive agent chat)
├── status         (System overview)
└── version        (Show version)
```

## Key Features

### Beautiful UI
- ASCII art banner on startup
- Colored output with chalk
- Boxed information panels
- Loading spinners for operations
- Formatted tables for listings

### Robust Error Handling
- Validates agent existence before operations
- Graceful fallback for missing configs
- Helpful error messages
- HTTP error handling for gateway status

### Interactive Prompts
- Agent creation with model selection
- Deletion confirmation dialogs
- Guided identity setup
- Interactive chat with agents

### Persistent Storage
- Automatic config directory creation
- JSON-based storage (no database needed)
- Automatic defaults on first run
- Environment variable configuration

### Security
- API keys masked in config display
- Configurable settings
- Per-agent bindings management

## Example Workflow

### 1. Initialize Configuration
```bash
nexusmind config show  # Creates default config if needed
```

### 2. Create an Agent
```bash
nexusmind agents add assistant1
# Interactive prompts for:
# - Name: "My Assistant"
# - Emoji: "🤖"
# - Model: "claude-opus-4-6"
```

### 3. Bind to Channel
```bash
nexusmind agents bind --agent assistant1 --bind "#general"
nexusmind agents bind --agent assistant1 --bind "#support"
```

### 4. View Configuration
```bash
nexusmind agents list
nexusmind agents info assistant1
```

### 5. Start Gateway
```bash
nexusmind gateway:start
nexusmind gateway:status
```

### 6. Chat with Agent
```bash
nexusmind chat assistant1
# Type messages and receive responses
# Type "exit" to quit
```

## Integration with Gateway

The CLI communicates with the gateway at:
- **Default**: `http://localhost:4848`
- **Configurable**: `nexusmind config set gateway.port 5000`

Status endpoint: `GET /api/v1/status`

## Environment Variables

```bash
# Change config storage directory
export NEXUSMIND_CONFIG_DIR=/custom/path/.nexusmind
nexusmind agents list
```

## Command Examples

### List all agents in formatted table
```bash
nexusmind agents list
```

Output:
```
ID              Name                 Emoji    Model                Bindings             Created             
assistant1      My Assistant         🤖       claude-opus-4-6      #general, #support   3/6/2026
assistant2      Support Bot          🛠        gpt-4                #support             3/6/2026
```

### Get nested config value
```bash
nexusmind config get gateway.host
# Output: localhost
```

### Check system status
```bash
nexusmind status
```

Output:
```
╭─────────────────────────────╮
│                             │
│  SYSTEM STATUS              │
│                             │
│  Gateway:                   │
│    Host: localhost          │
│    Port: 4848              │
│                             │
│  Agents:                    │
│    Total: 2                │
│                             │
│  Recent Agents:             │
│    🛠 Support Bot            │
│    🤖 My Assistant           │
│                             │
╰─────────────────────────────╯
```

## Extending the CLI

To add new commands, follow this pattern:

```typescript
program
  .command('newcommand <arg>')
  .description('Description')
  .option('--flag', 'Flag description')
  .action(async (arg, options) => {
    const spinner = ora('Working...').start();
    try {
      // Your logic here
      spinner.succeed(chalk.green('Success'));
    } catch (error) {
      spinner.fail(chalk.red('Failed'));
      process.exit(1);
    }
  });
```

## Notes

- All data is stored locally in JSON files
- No database required
- Configuration persists between sessions
- Agent bindings support multiple channels
- Interactive mode provides guided workflows
- Errors are clearly displayed with suggestions
