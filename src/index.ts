import { Gateway } from './gateway.js';
import { config } from './config.js';
import { agentManager } from './agents.js';
import { createLogger } from './logger.js';

const log = createLogger('main');

async function main() {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  🧠 NexusMind v0.1.0                        ║
  ║  The Ultimate Autonomous AI Agent Platform   ║
  ╚══════════════════════════════════════════════╝
  `);

  log.info(`Config: ${config.filePath}`);
  log.info(`Data: ${config.dir}`);

  const agents = agentManager.list();
  if (agents.length === 0) {
    log.info('No agents found, creating default agent...');
    agentManager.create({
      id: 'main',
      name: 'NexusMind',
      emoji: '🧠',
    });
  }

  const gateway = new Gateway();
  await gateway.start();

  const shutdown = () => {
    log.info('Shutting down...');
    gateway.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  createLogger('main').error(`Fatal: ${e}`);
  process.exit(1);
});
