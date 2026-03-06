#!/usr/bin/env node

import { Command } from 'commander';
import { agentManager } from '../agents.js';
import { config } from '../config.js';

const program = new Command();

program.name('nexusmind').description('NexusMind CLI').version('0.1.0');

// Agents commands
const agents = program.command('agents').description('Manage agents');

agents.command('list').description('List agents').action(() => {
  const list = agentManager.list();
  if (list.length === 0) {
    console.log('No agents');
    return;
  }
  console.table(list.map(a => ({ ID: a.id, Name: a.name, Emoji: a.emoji, Channels: a.channels.length })));
});

agents
  .command('create <id> <name>')
  .description('Create agent')
  .option('-e, --emoji <e>', 'Emoji', '🤖')
  .action((id, name, opts) => {
    if (agentManager.get(id)) {
      console.error(`Agent ${id} exists`);
      process.exit(1);
    }
    const agent = agentManager.create({ id, name, emoji: opts.emoji });
    console.log(`Created: ${id}`);
  });

agents.command('delete <id>').description('Delete agent').action((id) => {
  if (!agentManager.delete(id)) {
    console.error(`Not found: ${id}`);
    process.exit(1);
  }
  console.log(`Deleted: ${id}`);
});

agents.command('info <id>').description('Agent info').action((id) => {
  const a = agentManager.get(id);
  if (!a) {
    console.error(`Not found: ${id}`);
    process.exit(1);
  }
  console.log(`\nAgent: ${a.emoji} ${a.name}\nID: ${a.id}\nModel: ${a.model}\nChannels: ${a.channels.join(', ') || 'None'}\nWorkspace: ${a.workspace}`);
});

agents.command('bind <id> <ch>').description('Bind to channel').action((id, ch) => {
  if (!agentManager.bind(id, ch)) {
    console.error(`Not found: ${id}`);
    process.exit(1);
  }
  console.log(`Bound ${id} to ${ch}`);
});

// Config
const cfg = program.command('config').description('Config');
cfg.command('view').description('View').action(() => {
  console.log(JSON.stringify(config.getAll(), null, 2));
});

cfg.command('set <key> <val>').description('Set').action((key, val) => {
  let v = val;
  try { v = JSON.parse(val); } catch {}
  config.set(key, v);
  console.log(`Set: ${key}`);
});

program.parse();
