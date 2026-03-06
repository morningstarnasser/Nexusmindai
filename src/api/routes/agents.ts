import type { Request, Response, Router } from 'express';

let agentsRouter: Router;

try {
  const express = await import('express');
  agentsRouter = express.Router();
} catch {
  console.error('Express not installed. Install it with: npm install express');
  throw new Error('Express required for API');
}

// Store agents in memory (in production, use database)
const agents = new Map<string, any>();

// GET / - List all agents
agentsRouter.get('/', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    let agentList = Array.from(agents.values());

    if (status) {
      agentList = agentList.filter((a) => a.status === status);
    }

    const total = agentList.length;
    const paginated = agentList.slice(offset, offset + limit);

    res.json({
      agents: paginated,
      total,
      limit,
      offset,
    });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
});

// POST / - Create new agent
agentsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, config, skills } = (req as any).body;

    if (!name) {
      res.status(400).json({ error: 'Agent name is required' });
      return;
    }

    const agentId = `agent-${Date.now()}`;
    const agent = {
      id: agentId,
      name,
      config: config || {},
      skills: skills || [],
      status: 'idle',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metrics: {
        messages_processed: 0,
        tasks_completed: 0,
        errors: 0,
      },
    };

    agents.set(agentId, agent);

    res.status(201).json({
      agent,
      message: 'Agent created successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
});

// GET /:id - Get agent details
agentsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const agent = agents.get(req.params.id as string);

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json(agent);
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
});

// PUT /:id - Update agent
agentsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const agentId = req.params.id as string;
    const agent = agents.get(agentId);

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const { name, config, skills, status } = (req as any).body;

    if (name) agent.name = name;
    if (config) agent.config = { ...agent.config, ...config };
    if (skills) agent.skills = skills;
    if (status) agent.status = status;
    agent.updated_at = new Date().toISOString();

    agents.set(agentId, agent);

    res.json({
      agent,
      message: 'Agent updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
});

// DELETE /:id - Delete agent
agentsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const agentId = req.params.id as string;
    if (!agents.has(agentId)) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    agents.delete(agentId);

    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
});

// POST /:id/message - Send message to agent
agentsRouter.post('/:id/message', (req: Request, res: Response) => {
  try {
    const agentId = req.params.id as string;
    const agent = agents.get(agentId);

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const { message, context } = (req as any).body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    agent.metrics.messages_processed++;
    agent.status = 'processing';

    // Simulate processing
    const messageId = `msg-${Date.now()}`;
    const response = {
      id: messageId,
      agent_id: agentId,
      message,
      response: `Processed by ${agent.name}`,
      context: context || {},
      timestamp: new Date().toISOString(),
    };

    agent.status = 'idle';

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
});

// GET /:id/history - Get agent conversation history
agentsRouter.get('/:id/history', (req: Request, res: Response) => {
  try {
    const agentId = req.params.id as string;
    const agent = agents.get(agentId);

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;

    // Return mock history
    const history = [
      {
        id: 'conv-1',
        agent_id: agentId,
        messages: [],
        created_at: new Date().toISOString(),
      },
    ];

    res.json({
      agent_id: agentId,
      conversations: history.slice(0, limit),
      total: history.length,
    });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
});

// GET /:id/metrics - Get agent performance metrics
agentsRouter.get('/:id/metrics', (req: Request, res: Response) => {
  try {
    const agentId = req.params.id as string;
    const agent = agents.get(agentId);

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const metrics = {
      agent_id: agentId,
      ...agent.metrics,
      uptime_seconds: Math.random() * 10000,
      avg_response_time_ms: Math.random() * 1000,
      error_rate: (agent.metrics.errors / (agent.metrics.messages_processed || 1)) * 100,
      timestamp: new Date().toISOString(),
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
});

export default agentsRouter;
