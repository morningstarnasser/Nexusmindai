export const migration = {
  version: 1,
  name: '001_initial',
  up: async (db: any): Promise<void> => {
    // Create agents table
    await db.run(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        config TEXT,
        skills TEXT,
        status TEXT DEFAULT 'idle',
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT
      )
    `);

    // Create conversations table
    await db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT,
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )
    `);

    // Create messages table
    await db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender TEXT,
        content TEXT,
        metadata TEXT,
        created_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      )
    `);

    // Create skills table
    await db.run(`
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        category TEXT,
        parameters TEXT,
        enabled BOOLEAN DEFAULT 1,
        installed_at TEXT,
        deleted_at TEXT
      )
    `);

    // Create workflows table
    await db.run(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        steps TEXT,
        trigger TEXT,
        status TEXT DEFAULT 'draft',
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT
      )
    `);

    // Create workflow_runs table
    await db.run(`
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        status TEXT,
        input TEXT,
        result TEXT,
        errors TEXT,
        started_at TEXT,
        completed_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id)
      )
    `);

    // Create events table
    await db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT,
        agent_id TEXT,
        data TEXT,
        created_at TEXT,
        deleted_at TEXT
      )
    `);

    // Create api_keys table
    await db.run(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        rate_limit INTEGER DEFAULT 1000,
        created_at TEXT,
        expires_at TEXT,
        deleted_at TEXT
      )
    `);

    // Create audit_log table
    await db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        user_id TEXT,
        resource_type TEXT,
        resource_id TEXT,
        details TEXT,
        timestamp TEXT,
        deleted_at TEXT
      )
    `);

    // Create indices for performance
    await db.run(`CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)`);
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id)`
    );
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`
    );
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)`
    );
    await db.run(`CREATE INDEX IF NOT EXISTS idx_skills_enabled ON skills(enabled)`);
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id)`
    );
    await db.run(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)`);
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC)`
    );

    console.log('Migration 001_initial: up completed');
  },

  down: async (db: any): Promise<void> => {
    // Drop indices
    await db.run(`DROP INDEX IF EXISTS idx_agents_status`);
    await db.run(`DROP INDEX IF EXISTS idx_conversations_agent_id`);
    await db.run(`DROP INDEX IF EXISTS idx_messages_conversation_id`);
    await db.run(`DROP INDEX IF EXISTS idx_messages_created_at`);
    await db.run(`DROP INDEX IF EXISTS idx_skills_enabled`);
    await db.run(`DROP INDEX IF EXISTS idx_workflow_runs_workflow_id`);
    await db.run(`DROP INDEX IF EXISTS idx_events_type`);
    await db.run(`DROP INDEX IF EXISTS idx_events_created_at`);
    await db.run(`DROP INDEX IF EXISTS idx_audit_log_action`);
    await db.run(`DROP INDEX IF EXISTS idx_audit_log_timestamp`);

    // Drop tables
    await db.run(`DROP TABLE IF EXISTS audit_log`);
    await db.run(`DROP TABLE IF EXISTS api_keys`);
    await db.run(`DROP TABLE IF EXISTS events`);
    await db.run(`DROP TABLE IF EXISTS workflow_runs`);
    await db.run(`DROP TABLE IF EXISTS workflows`);
    await db.run(`DROP TABLE IF EXISTS skills`);
    await db.run(`DROP TABLE IF EXISTS messages`);
    await db.run(`DROP TABLE IF EXISTS conversations`);
    await db.run(`DROP TABLE IF EXISTS agents`);

    console.log('Migration 001_initial: down completed');
  },
};

export default migration;
