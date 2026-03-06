import type { Database as SqliteDatabase, Statement } from 'sqlite3';

interface QueryResult {
  lastID?: number;
  changes?: number;
  rows?: any[];
}

interface TransactionCallback {
  (): Promise<void>;
}

export class Database {
  private db: SqliteDatabase | null = null;
  private initialized = false;

  async initialize(dbPath: string): Promise<void> {
    try {
      const sqlite3Module = await import('sqlite3');
      const sqlite3 = sqlite3.default || sqlite3;

      this.db = new sqlite3.Database(dbPath, (error: Error | null) => {
        if (error) {
          console.error('Database connection error:', error);
        } else {
          console.log(`Database initialized at ${dbPath}`);
        }
      });

      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      await this.run('PRAGMA journal_mode = WAL');

      this.initialized = true;
    } catch (error) {
      console.warn(
        'SQLite not available. Install sqlite3: npm install sqlite3 better-sqlite3'
      );
    }
  }

  async run(sql: string, params: any[] = []): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function (error: Error | null) {
        if (error) {
          reject(error);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes,
          });
        }
      });
    });
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (error: Error | null, row: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (error: Error | null, rows: any[]) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async transaction(callback: TransactionCallback): Promise<void> {
    try {
      await this.run('BEGIN TRANSACTION');
      await callback();
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK').catch(() => {
        /* ignore rollback errors */
      });
      throw error;
    }
  }

  async exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.exec(sql, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          this.db = null;
          console.log('Database closed');
          resolve();
        }
      });
    });
  }

  isInitialized(): boolean {
    return this.initialized && this.db !== null;
  }

  async createTable(name: string, schema: string): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${name} (
        ${schema}
      )
    `;
    await this.run(sql);
  }

  async dropTable(name: string): Promise<void> {
    await this.run(`DROP TABLE IF EXISTS ${name}`);
  }

  async tableExists(name: string): Promise<boolean> {
    const result = await this.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [name]
    );
    return !!result;
  }

  async getTableInfo(name: string): Promise<any[]> {
    return this.all(`PRAGMA table_info(${name})`);
  }

  async vacuum(): Promise<void> {
    await this.run('VACUUM');
  }

  async getStats(): Promise<any> {
    const tables = await this.all(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    const stats: any = {
      tables: {},
      total_rows: 0,
    };

    for (const table of tables) {
      const count = await this.get(
        `SELECT COUNT(*) as count FROM ${table.name}`
      );
      stats.tables[table.name] = count.count;
      stats.total_rows += count.count;
    }

    return stats;
  }
}

export default Database;
