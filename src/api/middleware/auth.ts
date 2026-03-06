import type { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: { id: string; key: string };
  apiKey?: string;
}

// In-memory API key store (in production, use database)
const validApiKeys = new Map<string, { userId: string; rateLimit: number; created: Date }>();

// Initialize with a demo key
validApiKeys.set('demo-api-key-12345', {
  userId: 'demo-user',
  rateLimit: 1000,
  created: new Date(),
});

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];

    let token: string | null = null;
    let authType = 'none';

    // Check Authorization header (Bearer token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      authType = 'bearer';
    }

    // Check X-API-Key header
    if (apiKeyHeader) {
      token = apiKeyHeader as string;
      authType = 'api-key';
    }

    // Allow public endpoints without auth
    const publicEndpoints = [
      '/health',
      '/',
      '/api',
    ];

    if (publicEndpoints.some((path) => req.path.startsWith(path))) {
      return next();
    }

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing authentication token',
        required: 'Authorization header or X-API-Key',
      });
    }

    // Validate token
    const isValid = validateToken(token);
    if (!isValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token',
      });
    }

    // Attach user info to request
    const keyInfo = validApiKeys.get(token);
    if (keyInfo) {
      req.user = {
        id: keyInfo.userId,
        key: token,
      };
      (req as any).rateLimit = keyInfo.rateLimit;
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: 'Authentication error',
      message: (error as Error).message,
    });
  }
}

function validateToken(token: string): boolean {
  // Check if token exists in store
  if (validApiKeys.has(token)) {
    const keyInfo = validApiKeys.get(token);
    if (!keyInfo) return false;

    // Optional: Add token expiration check
    // const expirationTime = 30 * 24 * 60 * 60 * 1000; // 30 days
    // const isExpired = Date.now() - keyInfo.created.getTime() > expirationTime;
    // return !isExpired;

    return true;
  }

  // Allow simple JWT validation (in production, use proper JWT verification)
  if (token.split('.').length === 3) {
    try {
      // Simple JWT format check (not actual validation)
      const parts = token.split('.');
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export function generateApiKey(userId: string): string {
  const key = `api-key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  validApiKeys.set(key, {
    userId,
    rateLimit: 1000,
    created: new Date(),
  });
  return key;
}

export function revokeApiKey(key: string): boolean {
  return validApiKeys.delete(key);
}

export function getValidApiKeys(): Array<{ key: string; userId: string }> {
  return Array.from(validApiKeys.entries()).map(([key, info]) => ({
    key,
    userId: info.userId,
  }));
}

export default authMiddleware;
