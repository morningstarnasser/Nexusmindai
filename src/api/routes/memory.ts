import type { Request, Response, Router } from 'express';

let memoryRouter: Router;

try {
  const express = await import('express');
  memoryRouter = express.Router();
} catch {
  console.error('Express not installed. Install it with: npm install express');
  throw new Error('Express required for API');
}

// Store memory items
const memoryStore = new Map<string, any>();
const memoryGraph = new Map<string, Set<string>>();

// GET /search - Search memory
memoryRouter.get('/search', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    let results = Array.from(memoryStore.values());

    if (type) {
      results = results.filter((item) => item.type === type);
    }

    results = results.filter((item) =>
      item.content.toLowerCase().includes(query.toLowerCase())
    );

    const paginated = results.slice(0, limit);

    res.json({
      query,
      results: paginated,
      total: results.length,
      limit,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /store - Store memory item
memoryRouter.post('/store', (req: Request, res: Response) => {
  try {
    const { content, type, metadata, ttl } = (req as any).body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const itemId = `mem-${Date.now()}`;
    const item = {
      id: itemId,
      content,
      type: type || 'general',
      metadata: metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ttl: ttl || null,
      accessed: 0,
      last_accessed: null,
    };

    memoryStore.set(itemId, item);

    // Create graph edges if metadata contains references
    if (metadata?.references) {
      const refs = Array.isArray(metadata.references)
        ? metadata.references
        : [metadata.references];
      const edges = memoryGraph.get(itemId) || new Set();
      refs.forEach((ref: string) => edges.add(ref));
      memoryGraph.set(itemId, edges);
    }

    res.status(201).json({
      item,
      message: 'Memory stored successfully',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /graph - Get memory graph/relationships
memoryRouter.get('/graph', (req: Request, res: Response) => {
  try {
    const nodes = Array.from(memoryStore.values()).map((item) => ({
      id: item.id,
      label: item.content.substring(0, 50),
      type: item.type,
    }));

    const edges: any[] = [];
    memoryGraph.forEach((refs, itemId) => {
      refs.forEach((refId) => {
        edges.push({
          source: itemId,
          target: refId,
          type: 'references',
        });
      });
    });

    res.json({
      nodes,
      edges,
      stats: {
        total_nodes: nodes.length,
        total_edges: edges.length,
        node_types: Array.from(new Set(nodes.map((n) => n.type))),
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /stats - Get memory statistics
memoryRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const items = Array.from(memoryStore.values());

    const stats = {
      total_items: items.length,
      by_type: {} as any,
      oldest_item: null as any,
      newest_item: null as any,
      most_accessed: null as any,
      total_accessed: 0,
    };

    items.forEach((item) => {
      if (!stats.by_type[item.type]) {
        stats.by_type[item.type] = 0;
      }
      stats.by_type[item.type]++;
      stats.total_accessed += item.accessed;

      if (!stats.oldest_item || new Date(item.created_at) < new Date(stats.oldest_item.created_at)) {
        stats.oldest_item = { id: item.id, created_at: item.created_at };
      }

      if (!stats.newest_item || new Date(item.created_at) > new Date(stats.newest_item.created_at)) {
        stats.newest_item = { id: item.id, created_at: item.created_at };
      }

      if (!stats.most_accessed || item.accessed > stats.most_accessed.accessed) {
        stats.most_accessed = { id: item.id, accessed: item.accessed };
      }
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default memoryRouter;
