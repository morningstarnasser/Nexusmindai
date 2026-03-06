import type { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  byKey: boolean;
  byIp: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitRequest extends Request {
  rateLimit?: { current: number; limit: number; resetTime: number };
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  byKey: true,
  byIp: true,
};

const rateLimitStore: RateLimitStore = {};

export function rateLimitMiddleware(
  req: RateLimitRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const config = defaultConfig;
    const now = Date.now();

    // Determine the identifier (API key or IP)
    let identifier = '';

    if (config.byKey && (req as any).apiKey) {
      identifier = `key-${(req as any).apiKey}`;
    } else if (config.byIp) {
      identifier = `ip-${req.ip || 'unknown'}`;
    } else {
      identifier = 'global';
    }

    // Get or create rate limit record
    if (!rateLimitStore[identifier]) {
      rateLimitStore[identifier] = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }

    const record = rateLimitStore[identifier];

    // Check if window has expired
    if (now >= record.resetTime) {
      record.count = 0;
      record.resetTime = now + config.windowMs;
    }

    // Check rate limit
    if (record.count >= config.maxRequests) {
      const resetIn = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', resetIn.toString());
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Reset in ${resetIn} seconds`,
        retryAfter: resetIn,
      });
      return;
    }

    // Increment counter
    record.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (config.maxRequests - record.count).toString());
    res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

    // Attach rate limit info to request
    req.rateLimit = {
      current: record.count,
      limit: config.maxRequests,
      resetTime: record.resetTime,
    };

    next();
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    next();
  }
}

export function createRouteRateLimit(options: Partial<RateLimitConfig>) {
  return (req: RateLimitRequest, res: Response, next: NextFunction): void => {
    try {
      const config: RateLimitConfig = { ...defaultConfig, ...options };
      const now = Date.now();

      let identifier = `route-${req.path}-${req.ip || 'unknown'}`;

      if (!rateLimitStore[identifier]) {
        rateLimitStore[identifier] = {
          count: 0,
          resetTime: now + config.windowMs,
        };
      }

      const record = rateLimitStore[identifier];

      if (now >= record.resetTime) {
        record.count = 0;
        record.resetTime = now + config.windowMs;
      }

      if (record.count >= config.maxRequests) {
        const resetIn = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader('Retry-After', resetIn.toString());

        res.status(429).json({
          error: 'Too Many Requests',
          message: `This endpoint is rate limited to ${config.maxRequests} requests per minute`,
          retryAfter: resetIn,
        });
        return;
      }

      record.count++;

      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (config.maxRequests - record.count).toString());
      res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

      next();
    } catch (error) {
      console.error('Route rate limit error:', error);
      next();
    }
  };
}

export function resetRateLimit(identifier: string): void {
  delete rateLimitStore[identifier];
}

export function getRateLimitStats() {
  return {
    tracked_identifiers: Object.keys(rateLimitStore).length,
    limits: Object.entries(rateLimitStore).map(([identifier, record]) => ({
      identifier,
      count: record.count,
      resetTime: record.resetTime,
      resetIn: Math.ceil((record.resetTime - Date.now()) / 1000),
    })),
  };
}

export default rateLimitMiddleware;
