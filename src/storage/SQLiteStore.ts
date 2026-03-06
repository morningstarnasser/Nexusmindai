import Database from './Database.js';

export class SQLiteStore {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    if (!this.db.isInitialized()) {
      throw new Error('Database not initialized');
    }

    // Create tables if they don't exist
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    // Agents table
    await this.db.createTable(
      'agents',
      `
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        config TEXT,
        skills TEXT,
        status TEXT DEFAULT 'idle',
        created_at TEXT,
        updated_at TEXT
      `
    );

    // Conversations table
    await this.db.createTable(
      'conversations',
      `
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      `
    );

    // Messages table
    await this.db.createTable(
      'messages',
      `
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender TEXT,
        content TEXT,
        metadata TEXT,
        created_at TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      `
    );

    // Skills table
    await this.db.createTable(
      'skills',
      `
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        category TEXT,
        parameters TEXT,
        enabled BOOLEAN DEFAULT 1,
        installed_at TEXT
      `
    );

    // Workflows table
    await this.db.createTable(
      'workflows',
      `
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        steps TEXT,
        trigger TEXT,
        status TEXT DEFAULT 'draft',
        created_at TEXT,
        updated_at TEXT
      `
    );

    // Workflow runs table
    await this.db.createTable(
      'workflow_runs',
      `
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        status TEXT,
        input TEXT,
        result TEXT,
        started_at TEXT,
        completed_at TEXT,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id)
      `
    );

    // Events table
    await this.db.createTable(
      'events',
      `
        id TEXT PRIMARY KEY,
        type TEXT,
        agent_id TEXT,
        data TEXT,
        created_at TEXT
      `
    );

    // API keys table
    await this.db.createTable(
      'api_keys',
      `
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        rate_limit INTEGER DEFAULT 1000,
        created_at TEXT,
        expires_at TEXT
      `
    );

    // Audit log table
    await this.db.createTable(
      'audit_log',
      `
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        user_id TEXT,
        resource_type TEXT,
        resource_id TEXT,
        details TEXT,
        timestamp TEXT
      `
    );
  }

  // Agent operations
  async createAgent(agent: any): Promise<any> {
    const result = await this.db.run(
      `INSERT INTO agents (id, name, config, skills, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        agent.id,
        agent.name,
        JSON.stringify(agent.config),
        JSON.stringify(agent.skills),
        agent.status,
        agent.created_at,
        agent.updated_at,
      ]
    );
    return result;
  }

  async getAgent(id: string): Promise<any> {
    const agent = await this.db.get('SELECT * FROM agents WHERE id = ?', [id]);
    if (agent) {
      agent.config = JSON.parse(agent.config || '{}');
      agent.skills = JSON.parse(agent.skills || '[]');
    }
    return agent;
  }

  async getAllAgents(): Promise<any[]> {
    const agents = await this.db.all('SELECT * FROM agents');
    return agents.map((agent) => ({
      ...agent,
      config: JSON.parse(agent.config || '{}'),
      skills: JSON.parse(agent.skills || '[]'),
    }));
  }

  async updateAgent(id: string, updates: any): Promise<void> {
    const agent = await this.getAgent(id);
    if (!agent) throw new Error('Agent not found');

    const config = { ...agent.config, ...(updates.config || {}) };
    const skills = updates.skills || agent.skills;

    await this.db.run(
      `UPDATE agents SET name = ?, config = ?, skills = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        updates.name || agent.name,
        JSON.stringify(config),
        JSON.stringify(skills),
        updates.status || agent.status,
        new Date().toISOString(),
        id,
      ]
    );
  }

  async deleteAgent(id: string): Promise<void> {
    await this.db.run('DELETE FROM agents WHERE id = ?', [id]);
  }

  // Message operations
  async createMessage(message: any): Promise<any> {
    const result = await this.db.run(
      `INSERT INTO messages (id, conversation_id, sender, content, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.conversation_id,
        message.sender,
        message.content,
        JSON.stringify(message.metadata),
        message.created_at,
      ]
    );
    return result;
  }

  async getMessages(conversationId: string, limit: number = 50): Promise<any[]> {
    return this.db.all(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?`,
      [conversationId, limit]
    );
  }

  // Skill operations
  async installSkill(skill: any): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO skills (id, name, description, category, parameters, enabled, installed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        skill.id,
        skill.name,
        skill.description,
        skill.category,
        JSON.stringify(skill.parameters),
        skill.enabled ? 1 : 0,
        skill.installed_at,
      ]
    );
  }

  async getSkill(id: string): Promise<any> {
    const skill = await this.db.get('SELECT * FROM skills WHERE id = ?', [id]);
    if (skill) {
      skill.parameters = JSON.parse(skill.parameters || '[]');
      skill.enabled = skill.enabled === 1;
    }
    return skill;
  }

  async getAllSkills(): Promise<any[]> {
    const skills = await this.db.all('SELECT * FROM skills');
    return skills.map((skill) => ({
      ...skill,
      parameters: JSON.parse(skill.parameters || '[]'),
      enabled: skill.enabled === 1,
    }));
  }

  async deleteSkill(id: string): Promise<void> {
    await this.db.run('DELETE FROM skills WHERE id = ?', [id]);
  }

  // Workflow operations
  async createWorkflow(workflow: any): Promise<void> {
    await this.db.run(
      `INSERT INTO workflows (id, name, description, steps, trigger, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workflow.id,
        workflow.name,
        workflow.description,
        JSON.stringify(workflow.steps),
        JSON.stringify(workflow.trigger),
        workflow.status,
        workflow.created_at,
        workflow.updated_at,
      ]
    );
  }

  async getWorkflow(id: string): Promise<any> {
    const workflow = await this.db.get('SELECT * FROM workflows WHERE id = ?', [id]);
    if (workflow) {
      workflow.steps = JSON.parse(workflow.steps || '[]');
      workflow.trigger = JSON.parse(workflow.trigger || '{}');
    }
    return workflow;
  }

  async recordEvent(event: any): Promise<void> {
    await this.db.run(
      `INSERT INTO events (id, type, agent_id, data, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [event.id, event.type, event.agent_id, JSON.stringify(event.data), event.created_at]
    );
  }

  async getEvents(limit: number = 100): Promise<any[]> {
    const events = await this.db.all(
      'SELECT * FROM events ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return events.map((event) => ({
      ...event,
      data: JSON.parse(event.data || '{}'),
    }));
  }

  async logAudit(action: string, userId: string, details: any): Promise<void> {
    const id = `audit-${Date.now()}`;
    await this.db.run(
      `INSERT INTO audit_log (id, action, user_id, details, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [id, action, userId, JSON.stringify(details), new Date().toISOString()]
    );
  }

  async getDatabaseStats(): Promise<any> {
    return this.db.getStats();
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

export default SQLiteStore;
