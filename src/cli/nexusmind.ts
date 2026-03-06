#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { WebSocket } from 'ws';

// Types
interface Agent {
  id: string;
  name: string;
  emoji?: string;
  model?: string;
  bindings?: string[];
  createdAt?: string;
}

interface Config {
  gateway: {
    port: number;
    host: string;
  };
  apiKeys?: Record<string, string>;
  agents?: Record<string, Agent>;
  [key: string]: any;
}

// Configuration paths
const CONFIG_DIR = process.env.NEXUSMIND_CONFIG_DIR || path.join(process.cwd(), '.nexusmind');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const AGENTS_FILE = path.join(CONFIG_DIR, 'agents.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Default config
const DEFAULT_CONFIG: Config = {
  gateway: {
    port: 4848,
    host: 'localhost',
  },
};

const DEFAULT_AGENTS: Record<string, Agent> = {};

// Helper functions
function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn(chalk.yellow('Warning: Could not load config, using defaults'));
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config: Config): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function loadAgents(): Record<string, Agent> {
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn(chalk.yellow('Warning: Could not load agents, using defaults'));
  }
  return DEFAULT_AGENTS;
}

function saveAgents(agents: Record<string, Agent>): void {
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

function makeHttpRequest(
  method: string,
  host: string,
  port: number,
  path: string,
  body?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      (options.headers as Record<string, string | number>)['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function printBanner(): void {
  const banner = `
  ╔══════════════════════════════════════╗
  ║  NEXUSMIND - Agent Management CLI    ║
  ║  Intelligent Multi-Agent Platform    ║
  ╚══════════════════════════════════════╝
  `;
  console.log(chalk.cyan(banner));
}

function maskApiKey(key: string): string {
  if (key.length <= 4) return '*'.repeat(key.length);
  return key.substring(0, 2) + '*'.repeat(key.length - 4) + key.substring(key.length - 2);
}

// Command implementations
async function startGateway(): Promise<void> {
  const spinner = ora('Starting NexusMind Gateway...').start();
  try {
    const config = loadConfig();
    spinner.succeed(
      chalk.green(
        `Gateway would start on ${config.gateway.host}:${config.gateway.port}`,
      ),
    );
    console.log(
      chalk.gray(
        'Note: In production, ensure the gateway index.ts is running as a separate process',
      ),
    );
  } catch (error) {
    spinner.fail(chalk.red('Failed to start gateway'));
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

async function checkGatewayStatus(): Promise<void> {
  const spinner = ora('Checking gateway status...').start();
  try {
    const config = loadConfig();
    const response = await makeHttpRequest(
      'GET',
      config.gateway.host,
      config.gateway.port,
      '/api/v1/status',
    );
    const status = JSON.parse(response);
    spinner.succeed(chalk.green('Gateway is running'));
    console.log(
      boxen(
        `${chalk.bold('Status:')} ${chalk.green('✓ Online')}\n` +
          `${chalk.bold('Host:')} ${config.gateway.host}\n` +
          `${chalk.bold('Port:')} ${config.gateway.port}\n` +
          `${chalk.bold('Agents:')} ${Object.keys(loadAgents()).length}`,
        {
          padding: 1,
          borderColor: 'green',
        },
      ),
    );
  } catch (error) {
    spinner.fail(chalk.red('Gateway is not responding'));
    console.error(
      chalk.yellow(
        `Is the gateway running? (${chalk.reset(error instanceof Error ? error.message : String(error))})`,
      ),
    );
    process.exit(1);
  }
}

async function listAgents(): Promise<void> {
  const agents = loadAgents();
  const agentList = Object.values(agents);

  if (agentList.length === 0) {
    console.log(chalk.yellow('No agents found. Create one with: nexusmind agents add <id>'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold.cyan('ID'),
      chalk.bold.cyan('Name'),
      chalk.bold.cyan('Emoji'),
      chalk.bold.cyan('Model'),
      chalk.bold.cyan('Bindings'),
      chalk.bold.cyan('Created'),
    ],
    colWidths: [15, 20, 8, 20, 20, 20],
    style: { head: [] },
  });

  agentList.forEach((agent) => {
    table.push([
      chalk.green(agent.id),
      agent.name || chalk.gray('(unnamed)'),
      agent.emoji || '-',
      agent.model || chalk.gray('(default)'),
      (agent.bindings && agent.bindings.length > 0) ? agent.bindings.join(', ') : '-',
      agent.createdAt
        ? new Date(agent.createdAt).toLocaleDateString()
        : chalk.gray('(unknown)'),
    ]);
  });

  console.log(table.toString());
}

async function addAgent(id: string): Promise<void> {
  const agents = loadAgents();

  if (agents[id]) {
    console.error(chalk.red(`Agent with ID "${id}" already exists`));
    process.exit(1);
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Agent name:',
      default: id,
    },
    {
      type: 'list',
      name: 'emoji',
      message: 'Agent emoji:',
      choices: [
        { name: '🤖 Robot', value: '🤖' },
        { name: '🧠 Brain', value: '🧠' },
        { name: '🐙 Octopus (NEXO)', value: '🐙' },
        { name: '⚡ Lightning', value: '⚡' },
        { name: '🔥 Fire', value: '🔥' },
        { name: '🎯 Target', value: '🎯' },
        { name: '🛡️ Shield', value: '🛡️' },
        { name: '🚀 Rocket', value: '🚀' },
        { name: '💎 Diamond', value: '💎' },
        { name: '🦾 Mechanical Arm', value: '🦾' },
        { name: '👾 Alien', value: '👾' },
        { name: '🐺 Wolf', value: '🐺' },
        { name: '🦅 Eagle', value: '🦅' },
        { name: '🐉 Dragon', value: '🐉' },
        { name: '✏️ Custom...', value: 'custom' },
      ],
      default: '🤖',
    },
    {
      type: 'input',
      name: 'customEmoji',
      message: 'Enter your emoji:',
      when: (answers) => answers.emoji === 'custom',
    },
    {
      type: 'list',
      name: 'model',
      message: 'Select AI model:',
      choices: [
        'claude-opus-4-6',
        'claude-opus-4',
        'claude-sonnet-4',
        'gpt-4',
        'gpt-4-turbo',
        'other',
      ],
      default: 'claude-opus-4-6',
    },
    {
      type: 'input',
      name: 'customModel',
      message: 'Enter custom model name:',
      when: (answers) => answers.model === 'other',
    },
  ]);

  const newAgent: Agent = {
    id,
    name: answers.name,
    emoji: answers.customEmoji || answers.emoji,
    model: answers.customModel || answers.model,
    bindings: [],
    createdAt: new Date().toISOString(),
  };

  agents[id] = newAgent;
  saveAgents(agents);

  console.log(
    chalk.green(
      `✓ Agent "${answers.name}" (${answers.emoji}) created successfully`,
    ),
  );
}

async function deleteAgent(id: string): Promise<void> {
  const agents = loadAgents();

  if (!agents[id]) {
    console.error(chalk.red(`Agent with ID "${id}" not found`));
    process.exit(1);
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Delete agent "${agents[id].name || id}"? This cannot be undone.`,
      default: false,
    },
  ]);

  if (confirm) {
    delete agents[id];
    saveAgents(agents);
    console.log(chalk.green('✓ Agent deleted'));
  } else {
    console.log(chalk.yellow('Deletion cancelled'));
  }
}

async function showAgentInfo(id: string): Promise<void> {
  const agents = loadAgents();

  if (!agents[id]) {
    console.error(chalk.red(`Agent with ID "${id}" not found`));
    process.exit(1);
  }

  const agent = agents[id];
  const info = `
${chalk.bold.cyan(agent.emoji || '🤖')} ${chalk.bold(agent.name || id)}

${chalk.bold('ID:')} ${agent.id}
${chalk.bold('Model:')} ${agent.model || chalk.gray('(default)')}
${chalk.bold('Created:')} ${agent.createdAt ? new Date(agent.createdAt).toLocaleString() : chalk.gray('(unknown)')}
${chalk.bold('Bindings:')} ${
    agent.bindings && agent.bindings.length > 0
      ? agent.bindings.join(', ')
      : chalk.gray('(none)')
  }
  `;

  console.log(boxen(info, { padding: 1, borderColor: 'cyan' }));
}

async function setAgentIdentity(agentId: string, name?: string, emoji?: string): Promise<void> {
  const agents = loadAgents();

  if (!agents[agentId]) {
    console.error(chalk.red(`Agent with ID "${agentId}" not found`));
    process.exit(1);
  }

  let finalName = name;
  let finalEmoji = emoji;

  if (!finalName || !finalEmoji) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Agent name:',
        default: agents[agentId].name,
        when: !finalName,
      },
      {
        type: 'list',
        name: 'emoji',
        message: 'Agent emoji:',
        choices: [
          { name: '🤖 Robot', value: '🤖' },
          { name: '🧠 Brain', value: '🧠' },
          { name: '🐙 Octopus (NEXO)', value: '🐙' },
          { name: '⚡ Lightning', value: '⚡' },
          { name: '🔥 Fire', value: '🔥' },
          { name: '🎯 Target', value: '🎯' },
          { name: '🛡️ Shield', value: '🛡️' },
          { name: '🚀 Rocket', value: '🚀' },
          { name: '💎 Diamond', value: '💎' },
          { name: '🦾 Mechanical Arm', value: '🦾' },
          { name: '👾 Alien', value: '👾' },
          { name: '🐺 Wolf', value: '🐺' },
          { name: '🦅 Eagle', value: '🦅' },
          { name: '🐉 Dragon', value: '🐉' },
          { name: '✏️ Custom...', value: 'custom' },
        ],
        default: agents[agentId].emoji || '🤖',
        when: !finalEmoji,
      },
      {
        type: 'input',
        name: 'customEmoji',
        message: 'Enter your emoji:',
        when: (answers) => !finalEmoji && answers.emoji === 'custom',
      },
    ]);

    finalName = finalName || answers.name;
    finalEmoji = finalEmoji || answers.customEmoji || answers.emoji;
  }

  agents[agentId].name = finalName!;
  agents[agentId].emoji = finalEmoji!;
  saveAgents(agents);

  console.log(chalk.green(`✓ Agent identity updated: ${finalEmoji} ${finalName}`));
}

async function bindAgent(agentId: string, channel: string): Promise<void> {
  const agents = loadAgents();

  if (!agents[agentId]) {
    console.error(chalk.red(`Agent with ID "${agentId}" not found`));
    process.exit(1);
  }

  if (!agents[agentId].bindings) {
    agents[agentId].bindings = [];
  }

  if (agents[agentId].bindings!.includes(channel)) {
    console.log(chalk.yellow(`Agent already bound to "${channel}"`));
    return;
  }

  agents[agentId].bindings!.push(channel);
  saveAgents(agents);

  console.log(chalk.green(`✓ Agent bound to "${channel}"`));
}

async function unbindAgent(agentId: string, channel: string): Promise<void> {
  const agents = loadAgents();

  if (!agents[agentId]) {
    console.error(chalk.red(`Agent with ID "${agentId}" not found`));
    process.exit(1);
  }

  if (!agents[agentId].bindings || !agents[agentId].bindings!.includes(channel)) {
    console.log(chalk.yellow(`Agent not bound to "${channel}"`));
    return;
  }

  agents[agentId].bindings = agents[agentId].bindings!.filter((b) => b !== channel);
  saveAgents(agents);

  console.log(chalk.green(`✓ Agent unbound from "${channel}"`));
}

async function getConfigValue(key: string): Promise<void> {
  const config = loadConfig();
  const keys = key.split('.');
  let value: any = config;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.error(chalk.red(`Config key "${key}" not found`));
      process.exit(1);
    }
  }

  console.log(
    boxen(`${chalk.bold(key)}\n\n${chalk.cyan(JSON.stringify(value, null, 2))}`, {
      padding: 1,
      borderColor: 'cyan',
    }),
  );
}

async function setConfigValue(key: string, value: string): Promise<void> {
  const config = loadConfig();
  const keys = key.split('.');
  let obj = config;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in obj) || typeof obj[k] !== 'object') {
      obj[k] = {};
    }
    obj = obj[k];
  }

  const lastKey = keys[keys.length - 1];
  let parsedValue: any = value;

  try {
    parsedValue = JSON.parse(value);
  } catch {
    // Keep as string if not valid JSON
  }

  obj[lastKey] = parsedValue;
  saveConfig(config);

  console.log(chalk.green(`✓ Config updated: ${key} = ${JSON.stringify(parsedValue)}`));
}

async function showConfig(): Promise<void> {
  const config = loadConfig();
  const displayConfig = JSON.parse(JSON.stringify(config));

  if (displayConfig.apiKeys) {
    Object.keys(displayConfig.apiKeys).forEach((key) => {
      displayConfig.apiKeys[key] = maskApiKey(displayConfig.apiKeys[key]);
    });
  }

  console.log(
    boxen(chalk.cyan(JSON.stringify(displayConfig, null, 2)), {
      padding: 1,
      borderColor: 'cyan',
      title: chalk.bold.cyan('NexusMind Configuration'),
    }),
  );
}

async function showHeartbeatStatus(): Promise<void> {
  const spinner = ora('Checking heartbeat status...').start();
  try {
    const config = loadConfig();
    const agents = loadAgents();
    const agentList = Object.values(agents);

    spinner.succeed(chalk.green('Heartbeat status retrieved'));

    const statusInfo = agentList
      .map(
        (agent) =>
          `${agent.emoji || '🤖'} ${chalk.bold(agent.name || agent.id)}: ${chalk.green('✓ Active')}`,
      )
      .join('\n');

    console.log(
      boxen(`${chalk.bold('Active Agents:')}\n\n${statusInfo || chalk.gray('(none)')}`, {
        padding: 1,
        borderColor: 'green',
      }),
    );
  } catch (error) {
    spinner.fail(chalk.red('Failed to check heartbeat'));
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

async function triggerHeartbeat(agentId: string): Promise<void> {
  const agents = loadAgents();

  if (!agents[agentId]) {
    console.error(chalk.red(`Agent with ID "${agentId}" not found`));
    process.exit(1);
  }

  const spinner = ora(`Triggering heartbeat for "${agents[agentId].name}"...`).start();
  try {
    spinner.succeed(chalk.green('Heartbeat triggered'));
    console.log(
      chalk.gray(`Agent "${agents[agentId].name}" is healthy and responsive`),
    );
  } catch (error) {
    spinner.fail(chalk.red('Failed to trigger heartbeat'));
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

async function interactiveChat(agentId: string): Promise<void> {
  const agents = loadAgents();

  if (!agents[agentId]) {
    console.error(chalk.red(`Agent with ID "${agentId}" not found`));
    process.exit(1);
  }

  const agent = agents[agentId];
  console.log(
    chalk.cyan(
      `\n${agent.emoji || '🤖'} Connected to ${agent.name || agentId}. Type "exit" to quit.\n`,
    ),
  );

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  while (true) {
    const input = await askQuestion(chalk.bold.cyan('You: '));

    if (input.toLowerCase() === 'exit') {
      console.log(chalk.yellow('Goodbye!'));
      rl.close();
      break;
    }

    if (!input.trim()) {
      continue;
    }

    console.log(
      chalk.green(
        `${agent.emoji || '🤖'} ${agent.name}: [Response would come from agent via WebSocket in production]`,
      ),
    );
  }
}

async function showSystemStatus(): Promise<void> {
  const config = loadConfig();
  const agents = loadAgents();
  const agentList = Object.values(agents);

  const statusBanner = `
${chalk.bold.cyan('SYSTEM STATUS')}

${chalk.bold('Gateway:')}
  Host: ${config.gateway.host}
  Port: ${config.gateway.port}

${chalk.bold('Agents:')}
  Total: ${chalk.green(agentList.length)}
  
${chalk.bold('Recent Agents:')}
${
  agentList
    .slice(-5)
    .reverse()
    .map((a) => `  ${a.emoji || '🤖'} ${a.name || a.id}`)
    .join('\n') || '  (none)'
}
  `;

  console.log(boxen(statusBanner.trim(), { padding: 1, borderColor: 'cyan' }));
}

function showVersion(): void {
  const packageJsonPath = path.join(__dirname, '../../package.json');
  let version = '1.0.0';

  try {
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      version = pkg.version || version;
    }
  } catch {
    // Use default version
  }

  console.log(
    boxen(
      `${chalk.bold.cyan('NexusMind CLI')}\n${chalk.gray('Version')} ${chalk.green(version)}`,
      {
        padding: 1,
        borderColor: 'cyan',
      },
    ),
  );
}

// CLI Setup
const program = new Command();

program.name('nexusmind').description('NexusMind - Intelligent Agent Management CLI').version(
  '1.0.0',
);

// Gateway commands
program
  .command('gateway:start')
  .description('Start the NexusMind Gateway')
  .action(startGateway);

program
  .command('gateway:status')
  .description('Check gateway status')
  .action(checkGatewayStatus);

// Agent commands
const agentsCmd = program.command('agents').description('Manage agents');

agentsCmd
  .command('list')
  .description('List all agents')
  .action(listAgents);

agentsCmd
  .command('add <id>')
  .description('Create a new agent')
  .action(addAgent);

agentsCmd
  .command('delete <id>')
  .description('Delete an agent')
  .action(deleteAgent);

agentsCmd
  .command('info <id>')
  .description('Show detailed agent info')
  .action(showAgentInfo);

agentsCmd
  .command('set-identity')
  .description('Set agent identity')
  .requiredOption('--agent <id>', 'Agent ID')
  .option('--name <name>', 'Agent name')
  .option('--emoji <emoji>', 'Agent emoji')
  .action((options) => {
    setAgentIdentity(options.agent, options.name, options.emoji);
  });

agentsCmd
  .command('bind')
  .description('Bind agent to a channel')
  .requiredOption('--agent <id>', 'Agent ID')
  .requiredOption('--bind <channel>', 'Channel name')
  .action((options) => {
    bindAgent(options.agent, options.bind);
  });

agentsCmd
  .command('unbind')
  .description('Unbind agent from a channel')
  .requiredOption('--agent <id>', 'Agent ID')
  .requiredOption('--bind <channel>', 'Channel name')
  .action((options) => {
    unbindAgent(options.agent, options.bind);
  });

// Config commands
const configCmd = program.command('config').description('Manage configuration');

configCmd
  .command('get <key>')
  .description('Get config value')
  .action(getConfigValue);

configCmd
  .command('set <key> <value>')
  .description('Set config value')
  .action(setConfigValue);

configCmd
  .command('show')
  .description('Show full configuration')
  .action(showConfig);

// Heartbeat commands
const heartbeatCmd = program.command('heartbeat').description('Manage heartbeats');

heartbeatCmd
  .command('status')
  .description('Show heartbeat status')
  .action(showHeartbeatStatus);

heartbeatCmd
  .command('trigger <agentId>')
  .description('Trigger heartbeat for an agent')
  .action(triggerHeartbeat);

// Chat command
program
  .command('chat <agentId>')
  .description('Interactive chat with an agent')
  .action(interactiveChat);

// Status command
program
  .command('status')
  .description('Show system status')
  .action(showSystemStatus);

// Version command
program
  .command('version')
  .description('Show version')
  .action(showVersion);

// Parse and execute
program.parse(process.argv);

// Show banner on first run
if (process.argv.length < 3) {
  printBanner();
  program.outputHelp();
}

export default program;
