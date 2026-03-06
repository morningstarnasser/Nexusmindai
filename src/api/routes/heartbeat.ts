import type { Request, Response, Router } from 'express';

let heartbeatRouter: Router;

try {
  const express = await import('express');
  heartbeatRouter = express.Router();
} catch {
  console.error('Express not installed. Install it with: npm install express');
  throw new Error('Express required for API');
}

// Heartbeat tracking
const heartbeats = new Map<string, any>();
const schedules = new Map<string, any>();
let lastCheck = new Date().toISOString();

// GET /status - Get heartbeat status
heartbeatRouter.get('/status', (req: Request, res: Response) => {
  try {
    const entityId = req.query.entity as string;

    if (entityId) {
      const hb = heartbeats.get(entityId);
      if (!hb) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      const timeSinceHb = Date.now() - new Date(hb.last_heartbeat).getTime();
      const isAlive = timeSinceHb < hb.timeout;

      return res.json({
        entity_id: entityId,
        ...hb,
        alive: isAlive,
        time_since_last_ms: timeSinceHb,
      });
    }

    // Return all heartbeats
    const allHeartbeats = Array.from(heartbeats.entries()).map(([id, hb]) => {
      const timeSinceHb = Date.now() - new Date(hb.last_heartbeat).getTime();
      return {
        entity_id: id,
        ...hb,
        alive: timeSinceHb < hb.timeout,
        time_since_last_ms: timeSinceHb,
      };
    });

    res.json({
      timestamp: new Date().toISOString(),
      last_check: lastCheck,
      total_entities: allHeartbeats.length,
      entities: allHeartbeats,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /trigger - Trigger a heartbeat
heartbeatRouter.post('/trigger', (req: Request, res: Response) => {
  try {
    const { entity_id, timeout, metadata } = (req as any).body;

    if (!entity_id) {
      return res.status(400).json({ error: 'Entity ID is required' });
    }

    const hb = {
      entity_id,
      last_heartbeat: new Date().toISOString(),
      timeout: timeout || 30000, // 30 seconds default
      metadata: metadata || {},
      count: (heartbeats.get(entity_id)?.count || 0) + 1,
    };

    heartbeats.set(entity_id, hb);

    res.json({
      message: 'Heartbeat received',
      entity_id,
      heartbeat: hb,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /schedule - Get heartbeat schedules
heartbeatRouter.get('/schedule', (req: Request, res: Response) => {
  try {
    const scheduleList = Array.from(schedules.values());

    res.json({
      schedules: scheduleList,
      total: scheduleList.length,
      next_check: new Date(Date.now() + 60000).toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Add heartbeat schedule endpoint
heartbeatRouter.post('/schedule', (req: Request, res: Response) => {
  try {
    const { entity_id, interval, timeout, enabled } = (req as any).body;

    if (!entity_id || !interval) {
      return res.status(400).json({
        error: 'Entity ID and interval are required',
      });
    }

    const scheduleId = `schedule-${Date.now()}`;
    const schedule = {
      id: scheduleId,
      entity_id,
      interval,
      timeout: timeout || 30000,
      enabled: enabled !== false,
      created_at: new Date().toISOString(),
      last_run: null,
    };

    schedules.set(scheduleId, schedule);

    res.status(201).json({
      schedule,
      message: 'Heartbeat schedule created',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default heartbeatRouter;
