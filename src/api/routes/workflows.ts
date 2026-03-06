import type { Request, Response, Router } from 'express';

let workflowsRouter: Router;

try {
  const express = await import('express');
  workflowsRouter = express.Router();
} catch {
  console.error('Express not installed. Install it with: npm install express');
  throw new Error('Express required for API');
}

// Store workflows in memory
const workflows = new Map<string, any>();
const workflowRuns = new Map<string, any>();

// GET / - List all workflows
workflowsRouter.get('/', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const workflowList = Array.from(workflows.values());
    const total = workflowList.length;
    const paginated = workflowList.slice(offset, offset + limit);

    res.json({
      workflows: paginated,
      total,
      limit,
      offset,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST / - Create new workflow
workflowsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, steps, trigger } = (req as any).body;

    if (!name) {
      res.status(400).json({ error: 'Workflow name is required' });
      return;
    }

    const workflowId = `workflow-${Date.now()}`;
    const workflow = {
      id: workflowId,
      name,
      description: description || '',
      steps: steps || [],
      trigger: trigger || {},
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      executions: 0,
      last_executed: null,
    };

    workflows.set(workflowId, workflow);

    res.status(201).json({
      workflow,
      message: 'Workflow created successfully',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /:id/run - Execute workflow
workflowsRouter.post('/:id/run', (req: Request, res: Response) => {
  try {
    const workflowId = req.params.id as string;
    const workflow = workflows.get(workflowId);

    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    const runId = `run-${Date.now()}`;
    const { input } = (req as any).body;

    const run: {
      id: string;
      workflow_id: string;
      input: any;
      status: string;
      started_at: string;
      completed_at: string | null;
      result: any;
      errors: any[];
    } = {
      id: runId,
      workflow_id: workflowId,
      input: input || {},
      status: 'running',
      started_at: new Date().toISOString(),
      completed_at: null,
      result: null,
      errors: [],
    };

    workflowRuns.set(runId, run);
    workflow.executions++;
    workflow.last_executed = new Date().toISOString();

    // Simulate execution
    setTimeout(() => {
      run.status = 'completed';
      run.completed_at = new Date().toISOString();
      run.result = { success: true, data: input };
    }, 1000);

    res.status(202).json({
      run,
      message: 'Workflow execution started',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /:id/history - Get workflow execution history
workflowsRouter.get('/:id/history', (req: Request, res: Response) => {
  try {
    const workflowId = req.params.id as string;
    if (!workflows.has(workflowId)) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const history = Array.from(workflowRuns.values())
      .filter((run) => run.workflow_id === workflowId)
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      )
      .slice(0, limit);

    res.json({
      workflow_id: workflowId,
      executions: history,
      total: history.length,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /:id/status - Get workflow execution status
workflowsRouter.get('/:id/status', (req: Request, res: Response) => {
  try {
    const workflowId = req.params.id as string;
    const workflow = workflows.get(workflowId);

    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    // Get latest run
    const runs = Array.from(workflowRuns.values())
      .filter((run) => run.workflow_id === workflowId)
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );

    const latestRun = runs[0] || null;

    res.json({
      workflow_id: workflowId,
      name: workflow.name,
      status: workflow.status,
      executions: workflow.executions,
      last_executed: workflow.last_executed,
      latest_run: latestRun,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default workflowsRouter;
