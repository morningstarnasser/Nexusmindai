/**
 * NexusMind Validation Utilities
 * Simple manual validation helpers for configuration and data validation
 */

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    public value: unknown,
    public reason: string,
  ) {
    super(`Validation failed for field "${field}": ${reason}`);
    this.name = 'ValidationError';
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validator function type
 */
export type ValidatorFn<T> = (value: unknown) => value is T;

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (isNullOrUndefined(value)) return true;
  if (isString(value)) return value.length === 0;
  if (isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if string matches pattern
 */
export function matchesPattern(value: string, pattern: RegExp | string): boolean {
  if (typeof pattern === 'string') {
    return new RegExp(pattern).test(value);
  }
  return pattern.test(value);
}

/**
 * Check if string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return isString(email) && emailRegex.test(email);
}

/**
 * Check if string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return isString(uuid) && uuidRegex.test(uuid);
}

/**
 * Check if string is a valid JSON
 */
export function isValidJSON(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string is a valid cron expression
 */
export function isValidCron(cron: string): boolean {
  // Simple validation - checks for 5 or 6 parts
  const parts = cron.split(/\s+/);
  return parts.length === 5 || parts.length === 6;
}

/**
 * Check if number is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return isNumber(value) && value >= min && value <= max;
}

/**
 * Check if string length is within range
 */
export function isLengthInRange(value: string, min: number, max: number): boolean {
  return isString(value) && value.length >= min && value.length <= max;
}

/**
 * Check if array length is within range
 */
export function isArrayLengthInRange(value: unknown[], min: number, max: number): boolean {
  return isArray(value) && value.length >= min && value.length <= max;
}

/**
 * Check if all elements in array match predicate
 */
export function allMatch<T>(array: T[], predicate: (item: T) => boolean): boolean {
  return isArray(array) && array.every(predicate);
}

/**
 * Check if any element in array matches predicate
 */
export function anyMatch<T>(array: T[], predicate: (item: T) => boolean): boolean {
  return isArray(array) && array.some(predicate);
}

/**
 * Check if value is one of allowed values
 */
export function isOneOf<T>(value: unknown, allowed: T[]): value is T {
  return allowed.includes(value as T);
}

/**
 * Validate required fields in object
 */
export function validateRequiredFields(
  obj: Record<string, unknown>,
  requiredFields: string[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of requiredFields) {
    if (!(field in obj) || isEmpty(obj[field])) {
      errors.push(new ValidationError(field, obj[field], 'Field is required'));
    }
  }

  return errors;
}

/**
 * Validate field type
 */
export function validateFieldType(
  obj: Record<string, unknown>,
  field: string,
  expectedType: string,
): ValidationError | null {
  if (!(field in obj)) return null;

  const value = obj[field];
  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (actualType !== expectedType) {
    return new ValidationError(field, value, `Expected ${expectedType}, got ${actualType}`);
  }

  return null;
}

/**
 * Validate object schema
 */
export function validateSchema<T extends Record<string, unknown>>(
  obj: unknown,
  schema: Record<string, {
    type: string;
    required?: boolean;
    validate?: (value: unknown) => boolean;
  }>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (!isObject(obj)) {
    return {
      valid: false,
      errors: [new ValidationError('root', obj, 'Expected an object')],
      warnings,
    };
  }

  // Check required fields and types
  for (const field in schema) {
    const fieldSchema = schema[field];

    if (fieldSchema.required && !(field in obj)) {
      errors.push(new ValidationError(field, undefined, 'Field is required'));
      continue;
    }

    if (field in obj) {
      const value = obj[field];
      const error = validateFieldType(obj as Record<string, unknown>, field, fieldSchema.type);

      if (error) {
        errors.push(error);
        continue;
      }

      if (fieldSchema.validate && !fieldSchema.validate(value)) {
        errors.push(new ValidationError(field, value, 'Custom validation failed'));
      }
    }
  }

  // Check for extra fields
  for (const field in obj) {
    if (!(field in schema)) {
      warnings.push(`Unknown field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Deep validate nested object
 */
export function deepValidate<T extends Record<string, any>>(
  obj: T,
  rules: Record<string, ValidatorFn<any>>,
  depth: number = 10,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (depth <= 0) {
    warnings.push('Maximum validation depth reached');
    return { valid: false, errors, warnings };
  }

  for (const field in rules) {
    const validator = rules[field];
    const value = obj[field];

    if (!validator(value)) {
      errors.push(new ValidationError(field, value, 'Validation failed'));
    }

    // Recursively validate nested objects
    if (isObject(value) && !isEmpty(value)) {
      const nestedResult = deepValidate(value as Record<string, any>, rules, depth - 1);
      errors.push(...nestedResult.errors);
      warnings.push(...nestedResult.warnings);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  if (!isString(input)) return '';

  return input
    .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'))
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validate and sanitize object
 */
export function validateAndSanitize<T extends Record<string, any>>(
  obj: T,
  sanitizeStrings: boolean = true,
): T {
  const result = { ...obj };

  for (const key in result) {
    const value = result[key];

    if (sanitizeStrings && isString(value)) {
      result[key] = sanitizeString(value) as any;
    }

    if (isObject(value)) {
      result[key] = validateAndSanitize(value, sanitizeStrings) as any;
    }
  }

  return result;
}
