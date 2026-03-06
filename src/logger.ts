export class Logger {
  constructor(private module: string) {}

  info(msg: string) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${this.module}] ${msg}`);
  }

  error(msg: string) {
    const time = new Date().toLocaleTimeString();
    console.error(`[${time}] [${this.module}] ERROR: ${msg}`);
  }

  warn(msg: string) {
    const time = new Date().toLocaleTimeString();
    console.warn(`[${time}] [${this.module}] WARN: ${msg}`);
  }

  debug(msg: string) {
    if (process.env.DEBUG) {
      const time = new Date().toLocaleTimeString();
      console.log(`[${time}] [${this.module}] DEBUG: ${msg}`);
    }
  }
}

export function createLogger(module: string) {
  return new Logger(module);
}
