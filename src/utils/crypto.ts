/**
 * NexusMind Cryptography Utilities
 * AES-256 encryption/decryption, hashing, and secure random generation
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash, scryptSync } from 'crypto';

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm?: 'aes-256-gcm' | 'aes-256-cbc';
  encoding?: BufferEncoding;
  keyDerivation?: 'scrypt' | 'pbkdf2';
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  algorithm: string;
  iv: string;
  encryptedData: string;
  authTag?: string;
  salt?: string;
}

/**
 * Hash algorithm types
 */
export enum HashAlgorithm {
  SHA256 = 'sha256',
  SHA512 = 'sha512',
  SHA1 = 'sha1',
}

/**
 * Generate a secure random ID
 */
export function generateRandomId(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

/**
 * Generate random bytes
 */
export function generateRandomBytes(size: number = 32): Buffer {
  return randomBytes(size);
}

/**
 * Generate random hex string
 */
export function generateRandomHex(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Derive key from password using scrypt
 */
export function deriveKeyFromPassword(
  password: string,
  salt?: Buffer,
  keyLength: number = 32,
): { key: Buffer; salt: Buffer } {
  const saltBuffer = salt || randomBytes(16);

  const key = scryptSync(password, saltBuffer, keyLength);
  return { key, salt: saltBuffer };
}

/**
 * Hash data using specified algorithm
 */
export function hash(
  data: string | Buffer,
  algorithm: HashAlgorithm = HashAlgorithm.SHA256,
): string {
  const hash = createHash(algorithm);
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Hash password with salt (for comparison)
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const saltBuffer = salt ? Buffer.from(salt, 'hex') : randomBytes(16);
  const hashedPassword = hash(password + saltBuffer.toString('hex'));
  return {
    hash: hashedPassword,
    salt: saltBuffer.toString('hex'),
  };
}

/**
 * Verify password hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: newHash } = hashPassword(password, salt);
  return newHash === hash;
}

/**
 * Encrypt data using AES-256
 */
export function encrypt(
  data: string,
  password: string,
  config: EncryptionConfig = {},
): EncryptedData {
  const algorithm = config.algorithm ?? 'aes-256-gcm';
  const encoding = config.encoding ?? 'hex';

  // Derive key from password
  const { key, salt } = deriveKeyFromPassword(password);

  // Generate IV
  const iv = randomBytes(16);

  if (algorithm === 'aes-256-gcm') {
    const cipher = createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', encoding);
    encrypted += cipher.final(encoding);
    const authTag = cipher.getAuthTag().toString(encoding);

    return {
      algorithm,
      iv: iv.toString(encoding),
      encryptedData: encrypted,
      authTag,
      salt: salt.toString(encoding),
    };
  } else {
    // aes-256-cbc
    const cipher = createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', encoding);
    encrypted += cipher.final(encoding);

    return {
      algorithm,
      iv: iv.toString(encoding),
      encryptedData: encrypted,
      salt: salt.toString(encoding),
    };
  }
}

/**
 * Decrypt data using AES-256
 */
export function decrypt(encrypted: EncryptedData, password: string): string {
  const { algorithm, iv: ivString, encryptedData, authTag, salt } = encrypted;
  const encoding = 'hex' as BufferEncoding;

  // Derive key from password using same salt
  const saltBuffer = Buffer.from(salt || '', encoding);
  const { key } = deriveKeyFromPassword(password, saltBuffer);

  const iv = Buffer.from(ivString, encoding);

  if (algorithm === 'aes-256-gcm' && authTag) {
    const decipher = createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(Buffer.from(authTag, encoding));

    let decrypted = decipher.update(encryptedData, encoding, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } else {
    const decipher = createDecipheriv(algorithm as any, key, iv);
    let decrypted = decipher.update(encryptedData, encoding, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

/**
 * Encrypt object to JSON
 */
export function encryptObject<T extends Record<string, unknown>>(
  obj: T,
  password: string,
  config?: EncryptionConfig,
): string {
  const json = JSON.stringify(obj);
  const encrypted = encrypt(json, password, config);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt object from JSON
 */
export function decryptObject<T extends Record<string, unknown>>(
  encrypted: string,
  password: string,
): T {
  const encryptedData: EncryptedData = JSON.parse(encrypted);
  const json = decrypt(encryptedData, password);
  return JSON.parse(json) as T;
}

/**
 * Compute HMAC-SHA256
 */
export function hmacSHA256(data: string | Buffer, secret: string | Buffer): string {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC-SHA256
 */
export function verifyHmacSHA256(data: string | Buffer, secret: string | Buffer, mac: string): boolean {
  const computed = hmacSHA256(data, secret);
  return computed === mac;
}

/**
 * Generate secure random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('base64').replace(/[+/=]/g, '').slice(0, length);
}

/**
 * Mask sensitive data
 */
export function maskSensitiveData(
  data: string,
  showChars: number = 4,
  maskChar: string = '*',
): string {
  if (data.length <= showChars) return maskChar.repeat(data.length);

  const visibleStart = data.slice(0, Math.ceil(showChars / 2));
  const visibleEnd = data.slice(-Math.floor(showChars / 2));
  const maskLength = data.length - visibleStart.length - visibleEnd.length;

  return visibleStart + maskChar.repeat(maskLength) + visibleEnd;
}

/**
 * Constant-time string comparison
 */
export function safeStringCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Encrypt sensitive object fields
 */
export function encryptSensitiveFields<T extends Record<string, any>>(
  obj: T,
  password: string,
  sensitiveFields: string[],
): T {
  const result = { ...obj };

  for (const field of sensitiveFields) {
    if (field in result && typeof result[field] === 'string') {
      (result as any)[field] = JSON.stringify({
        _encrypted: true,
        data: encrypt(result[field], password),
      });
    }
  }

  return result;
}

/**
 * Decrypt sensitive object fields
 */
export function decryptSensitiveFields<T extends Record<string, any>>(
  obj: T,
  password: string,
): T {
  const result = { ...obj };

  for (const key in result) {
    if (typeof result[key] === 'string') {
      try {
        const parsed = JSON.parse(result[key]);
        if (parsed._encrypted && parsed.data) {
          (result as any)[key] = decrypt(parsed.data, password);
        }
      } catch {
        // Not encrypted, leave as is
      }
    }
  }

  return result;
}
