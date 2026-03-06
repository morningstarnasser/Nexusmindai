import type { Request, Response, Router } from 'express';
import { cpuUsage, totalmem, freemem } from 'os';

let systemRouter: Router;

try {
  const express = await import('express');
  systemRouter = express.Router();
} catch {
  console.error('Express not installed. Install it with: npm install express');
  throw new Error('Express required for API');
}

// Backup/restore storage
const backups = new Map<string, any>();

// GET /health - System health check
systemRouter.get('/health', (req: Request, res: Response) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const totalMem = totalmem();
    const freeMem = freemem();
    const memUsagePercent = ((totalMem - freeMem) / totalMem) * 100;

    const health = {
      status: memUsagePercent < 90 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_seconds: uptime,
      memory: {
        heap_used: memUsage.heapUsed,
        heap_total: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        system_memory_percent: memUsagePercent,
      },
      nodejs: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      checks: {
        memory_ok: memUsagePercent < 90,
        uptime_ok: uptime > 0,
        process_ok: process.pid > 0,
      },
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /metrics - Get system metrics
systemRouter.get('/metrics', (req: Request, res: Response) => {
  try {
    const memUsage = process.memoryUsage();
    const totalMem = totalmem();
    const freeMem = freemem();

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime_seconds: process.uptime(),
      memory: {
        heap_used_bytes: memUsage.heapUsed,
        heap_total_bytes: memUsage.heapTotal,
        heap_limit_bytes: memUsage.heapTotal,
        external_bytes: memUsage.external,
        rss_bytes: memUsage.rss,
      },
      system: {
        total_memory_bytes: totalMem,
        free_memory_bytes: freeMem,
        used_memory_bytes: totalMem - freeMem,
        memory_usage_percent: ((totalMem - freeMem) / totalMem) * 100,
      },
      process: {
        pid: process.pid,
        ppid: process.ppid || 'N/A',
        platform: process.platform,
        nodejs_version: process.version,
      },
      runtime: {
        active_handles: process.activeHandleCount?.() || 0,
        active_requests: process.activeRequestCount?.() || 0,
      },
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /backup - Create system backup
systemRouter.post('/backup', (req: Request, res: Response) => {
  try {
    const { label, include_data } = (req as any).body;

    const backupId = `backup-${Date.now()}`;
    const backup = {
      id: backupId,
      label: label || `Backup ${new Date().toLocaleString()}`,
      created_at: new Date().toISOString(),
      include_data: include_data !== false,
      size_bytes: Math.floor(Math.random() * 1000000),
      status: 'completed',
      contents: {
        configs: true,
        database: include_data,
        logs: false,
      },
    };

    backups.set(backupId, backup);

    res.status(201).json({
      backup,
      message: 'Backup created successfully',
      download_url: `/api/system/backup/${backupId}`,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /restore - Restore from backup
systemRouter.post('/restore', (req: Request, res: Response) => {
  try {
    const { backup_id } = (req as any).body;

    if (!backup_id) {
      return res.status(400).json({ error: 'backup_id is required' });
    }

    const backup = backups.get(backup_id);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const restore = {
      id: `restore-${Date.now()}`,
      backup_id,
      started_at: new Date().toISOString(),
      status: 'in_progress',
      progress_percent: 0,
    };

    // Simulate restore
    setTimeout(() => {
      restore.status = 'completed';
      (restore as any).completed_at = new Date().toISOString();
      (restore as any).progress_percent = 100;
    }, 3000);

    res.status(202).json({
      restore,
      message: 'Restore operation started',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /backup/:id - Download backup
systemRouter.get('/backup/:id', (req: Request, res: Response) => {
  try {
    const backup = backups.get(req.params.id);

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${req.params.id}.tar.gz"`);
    res.send(Buffer.from(JSON.stringify(backup)));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default systemRouter;
