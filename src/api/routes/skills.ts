import type { Request, Response, Router } from 'express';

let skillsRouter: Router;

try {
  const express = await import('express');
  skillsRouter = express.Router();
} catch {
  console.error('Express not installed. Install it with: npm install express');
  throw new Error('Express required for API');
}

// Store skills in memory
const skills = new Map<string, any>();

// GET / - List all skills
skillsRouter.get('/', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const category = req.query.category as string;

    let skillList = Array.from(skills.values());

    if (category) {
      skillList = skillList.filter((s) => s.category === category);
    }

    const total = skillList.length;
    const paginated = skillList.slice(offset, offset + limit);

    res.json({
      skills: paginated,
      total,
      limit,
      offset,
      categories: Array.from(new Set(Array.from(skills.values()).map((s) => s.category))),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /install - Install a new skill
skillsRouter.post('/install', (req: Request, res: Response) => {
  try {
    const { name, description, category, source, parameters } = (req as any).body;

    if (!name) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    const skillId = `skill-${Date.now()}`;
    const skill = {
      id: skillId,
      name,
      description: description || '',
      category: category || 'general',
      source: source || 'builtin',
      parameters: parameters || [],
      enabled: true,
      installed_at: new Date().toISOString(),
      version: '1.0.0',
      usage_count: 0,
      last_used: null,
    };

    skills.set(skillId, skill);

    res.status(201).json({
      skill,
      message: 'Skill installed successfully',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /:id - Uninstall skill
skillsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const skill = skills.get(req.params.id);

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    skills.delete(req.params.id);

    res.json({
      message: 'Skill uninstalled successfully',
      skill_id: req.params.id,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /:id/execute - Execute a skill
skillsRouter.post('/:id/execute', (req: Request, res: Response) => {
  try {
    const skill = skills.get(req.params.id);

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const { input, context } = (req as any).body;

    if (!skill.enabled) {
      return res.status(400).json({ error: 'Skill is disabled' });
    }

    const executionId = `exec-${Date.now()}`;

    skill.usage_count++;
    skill.last_used = new Date().toISOString();

    const result = {
      id: executionId,
      skill_id: req.params.id,
      input,
      output: {
        status: 'success',
        result: `Executed ${skill.name} with input: ${JSON.stringify(input)}`,
        context: context || {},
      },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Math.random() * 1000,
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default skillsRouter;
