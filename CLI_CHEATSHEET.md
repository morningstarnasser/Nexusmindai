# NexusMind CLI - Quick Reference Cheatsheet

## Installation
```bash
npm install commander chalk boxen ora inquirer cli-table3 ws
```

## Basic Commands

### Gateway Management
```bash
nexusmind gateway:start      # Start the gateway
nexusmind gateway:status     # Check gateway health
```

### Agent Management
```bash
nexusmind agents list                           # List all agents
nexusmind agents add <id>                       # Create new agent (interactive)
nexusmind agents delete <id>                    # Delete an agent
nexusmind agents info <id>                      # Show agent details
nexusmind agents set-identity --agent <id> --name "Name" --emoji "🤖"  # Set identity
nexusmind agents bind --agent <id> --bind <channel>                    # Bind to channel
nexusmind agents unbind --agent <id> --bind <channel>                  # Unbind from channel
```

### Configuration Management
```bash
nexusmind config show                   # Display all config (masked API keys)
nexusmind config get <key>             # Get specific value (e.g., gateway.port)
nexusmind config set <key> <value>     # Set configuration value
```

### Heartbeat & Health
```bash
nexusmind heartbeat status              # Check all agent heartbeats
nexusmind heartbeat trigger <agentId>   # Force heartbeat check
```

### Interactive Features
```bash
nexusmind chat <agentId>               # Chat with an agent
nexusmind status                        # Show system overview
nexusmind version                       # Display version
```

## Common Workflows

### Create and Configure Agent
```bash
# 1. Add agent
nexusmind agents add my-agent
# (Prompts for name, emoji, model)

# 2. Bind to channels
nexusmind agents bind --agent my-agent --bind "#general"
nexusmind agents bind --agent my-agent --bind "#support"

# 3. Verify
nexusmind agents info my-agent
nexusmind agents list
```

### Check System Health
```bash
# 1. Show status
nexusmind gateway:status

# 2. Check heartbeats
nexusmind heartbeat status

# 3. System overview
nexusmind status
```

### Modify Configuration
```bash
# Get current port
nexusmind config get gateway.port

# Change port
nexusmind config set gateway.port 5000

# View all settings
nexusmind config show
```

## Configuration Structure

Default location: `.nexusmind/` in current directory

### config.json
```json
{
  "gateway": {
    "port": 4848,
    "host": "localhost"
  },
  "apiKeys": {
    "openai": "sk-...",
    "anthropic": "sk-ant-..."
  }
}
```

### agents.json
```json
{
  "my-agent": {
    "id": "my-agent",
    "name": "My Assistant",
    "emoji": "🤖",
    "model": "claude-opus-4-6",
    "bindings": ["#general", "#support"],
    "createdAt": "2026-03-06T12:00:00Z"
  }
}
```

## Tips & Tricks

### Use config path environment variable
```bash
export NEXUSMIND_CONFIG_DIR=/custom/path/.nexusmind
nexusmind agents list
```

### Agent deletion requires confirmation
```bash
nexusmind agents delete my-agent
# Prompts: "Delete agent 'My Assistant'? (y/N)"
```

### Chat uses readline interface
```bash
nexusmind chat my-agent
# Type messages, press Enter
# Type "exit" to quit
```

### Interactive agent creation
```bash
nexusmind agents add new-agent
# Prompts:
# - Agent name
# - Emoji
# - Model (predefined list or custom)
```

### View masked API keys
```bash
nexusmind config show
# API keys shown as: sk-*****...**
```

## Command Syntax Reference

### With required options
```bash
nexusmind agents set-identity \
  --agent <id> \
  --name "<name>" \
  --emoji "<emoji>"
```

### With channel bindings
```bash
nexusmind agents bind \
  --agent <id> \
  --bind "<channel>"
```

### Config with nested keys
```bash
nexusmind config get gateway.port
nexusmind config set gateway.host 0.0.0.0
```

## Table Output Format

```
ID              Name                 Emoji    Model                Bindings             Created             
assistant1      My Assistant         🤖       claude-opus-4-6      #general, #support   3/6/2026
assistant2      Support Bot          🛠        gpt-4                #support             3/6/2026
```

## Exit Codes

- `0` - Success
- `1` - Error (agent not found, config issue, etc.)

## Output Formatting

- Green text = Success messages
- Red text = Errors
- Yellow text = Warnings
- Cyan text = Information/Headers
- Boxed output = Important information
- Spinners = Ongoing operations

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Agent not found" | Agent ID doesn't exist | Check with `nexusmind agents list` |
| "Gateway not responding" | Gateway not running | Run `nexusmind gateway:start` |
| "Config key not found" | Wrong nested path | Use dots for nesting: `gateway.port` |
| "Already bound to channel" | Agent already bound | Use `unbind` first if needed |

## File Locations

| Item | Path |
|------|------|
| CLI Source | `src/cli/index.ts` |
| Config | `.nexusmind/config.json` |
| Agents | `.nexusmind/agents.json` |
| Custom Config Dir | `$NEXUSMIND_CONFIG_DIR` |

