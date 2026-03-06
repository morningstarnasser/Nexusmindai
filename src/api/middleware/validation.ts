import type { Request, Response, NextFunction } from 'express';

interface ValidationSchema {
  [key: string]: {
    type: string;
    required?: boolean;
    pattern?: RegExp;
    min?: number;
    max?: number;
    enum?: string[];
  };
}

interface SchemaMap {
  [path: string]: {
    [method: string]: ValidationSchema;
  };
}

const schemas: SchemaMap = {
  '/api/agents': {
    POST: {
      name: { type: 'string', required: true },
      config: { type: 'object' },
      skills: { type: 'array' },
    },
    PUT: {
      name: { type: 'string' },
      config: { type: 'object' },
      skills: { type: 'array' },
      status: { type: 'string', enum: ['idle', 'processing', 'error'] },
    },
  },
  '/api/workflows': {
    POST: {
      name: { type: 'string', required: true },
      description: { type: 'string' },
      steps: { type: 'array', required: true },
      trigger: { type: 'object' },
    },
  },
  '/api/skills/install': {
    POST: {
      name: { type: 'string', required: true },
      description: { type: 'string' },
      category: { type: 'string' },
      source: { type: 'string' },
      parameters: { type: 'array' },
    },
  },
  '/api/memory/store': {
    POST: {
      content: { type: 'string', required: true },
      type: { type: 'string' },
      metadata: { type: 'object' },
      ttl: { type: 'number' },
    },
  },
};

export async function validationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const path = normalizePath(req.path);
    const method = req.method;

    // Check if we have schema for this route
    const routeSchemas = schemas[path];
    if (!routeSchemas || !routeSchemas[method]) {
      return next();
    }

    const schema = routeSchemas[method];
    const body = (req as any).body || {};

    // Validate each field
    const errors: string[] = [];

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const value = body[fieldName];

      // Check required
      if (fieldSchema.required && (value === undefined || value === null)) {
        errors.push(`${fieldName} is required`);
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Check type
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== fieldSchema.type) {
        errors.push(`${fieldName} must be of type ${fieldSchema.type}, got ${actualType}`);
      }

      // Check pattern
      if (fieldSchema.pattern && typeof value === 'string') {
        if (!fieldSchema.pattern.test(value)) {
          errors.push(`${fieldName} does not match required pattern`);
        }
      }

      // Check min
      if (fieldSchema.min !== undefined) {
        if (typeof value === 'number' && value < fieldSchema.min) {
          errors.push(`${fieldName} must be at least ${fieldSchema.min}`);
        }
        if (typeof value === 'string' && value.length < fieldSchema.min) {
          errors.push(`${fieldName} must be at least ${fieldSchema.min} characters`);
        }
      }

      // Check max
      if (fieldSchema.max !== undefined) {
        if (typeof value === 'number' && value > fieldSchema.max) {
          errors.push(`${fieldName} must be at most ${fieldSchema.max}`);
        }
        if (typeof value === 'string' && value.length > fieldSchema.max) {
          errors.push(`${fieldName} must be at most ${fieldSchema.max} characters`);
        }
      }

      // Check enum
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        errors.push(
          `${fieldName} must be one of: ${fieldSchema.enum.join(', ')}`
        );
      }
    }

    // Return validation errors
    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation Failed',
        details: errors,
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: 'Validation error',
      message: (error as Error).message,
    });
  }
}

function normalizePath(path: string): string {
  // Remove trailing slashes and query strings
  const normalized = path.split('?')[0].replace(/\/$/, '');
  // For nested routes like /api/agents/123/message, return base path
  const parts = normalized.split('/');
  if (parts.length > 3) {
    return parts.slice(0, 3).join('/');
  }
  return normalized;
}

export function registerSchema(path: string, method: string, schema: ValidationSchema): void {
  if (!schemas[path]) {
    schemas[path] = {};
  }
  schemas[path][method] = schema;
}

export function getSchemas(): SchemaMap {
  return schemas;
}

export default validationMiddleware;
