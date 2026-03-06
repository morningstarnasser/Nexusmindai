/**
 * Encryption.ts
 * 
 * AES-256 encryption for data at rest, TLS configuration helpers,
 * and secret management utilities.
 */

import { Logger } from '../utils/logger.js';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  tagLength: number;
}

interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  tag?: string;
  algorithm: string;
}

interface Secret {
  id: string;
  name: string;
  value: string;
  encrypted: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

/**
 * Encryption - Data encryption and secret management
 */
export class Encryption {
  private logger: Logger;
  private config: EncryptionConfig;
  private masterKey?: Buffer;
  private secrets: Map<string, Secret> = new Map();

  constructor() {
    this.logger = new Logger('Encryption');
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32, // 256 bits
      ivLength: 16,
      saltLength: 16,
      tagLength: 16,
    };
  }

  /**
   * Initialize encryption module
   */
  async initialize(masterPassword?: string): Promise<void> {
    try {
      this.logger.info('Initializing Encryption');

      if (masterPassword) {
        // Derive key from password
        const salt = randomBytes(this.config.saltLength);
        this.masterKey = scryptSync(masterPassword, salt, this.config.keyLength);
      } else {
        // Use random key
        this.masterKey = randomBytes(this.config.keyLength);
      }

      this.logger.info('Encryption initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Encryption', error);
      throw error;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(plaintext: string): EncryptedData {
    try {
      if (!this.masterKey) {
        throw new Error('Encryption not initialized. Call initialize() first.');
      }

      const iv = randomBytes(this.config.ivLength);
      const salt = randomBytes(this.config.saltLength);

      // Create cipher
      const cipher = createCipheriv(this.config.algorithm, this.masterKey, iv);

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.config.algorithm,
      };
    } catch (error) {
      this.logger.error('Error encrypting data', error);
      throw error;
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      if (!this.masterKey) {
        throw new Error('Encryption not initialized. Call initialize() first.');
      }

      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag || '', 'hex');
      const encrypted = encryptedData.encrypted;

      // Create decipher
      const decipher = createDecipheriv(this.config.algorithm, this.masterKey, iv);

      if (tag.length > 0) {
        decipher.setAuthTag(tag);
      }

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Error decrypting data', error);
      throw error;
    }
  }

  /**
   * Store encrypted secret
   */
  async storeSecret(
    name: string,
    value: string,
    expiresInDays?: number
  ): Promise<Secret> {
    try {
      const secret: Secret = {
        id: `secret-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        value: this.encrypt(value).encrypted,
        encrypted: true,
        createdAt: new Date(),
      };

      if (expiresInDays) {
        secret.expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      }

      this.secrets.set(secret.id, secret);
      this.logger.debug(`Stored secret: ${name}`);

      return { ...secret, value: '***REDACTED***' };
    } catch (error) {
      this.logger.error(`Error storing secret ${name}`, error);
      throw error;
    }
  }

  /**
   * Retrieve secret
   */
  async getSecret(secretId: string): Promise<Secret | null> {
    try {
      const secret = this.secrets.get(secretId);
      if (!secret) return null;

      // Check expiration
      if (secret.expiresAt && new Date() > secret.expiresAt) {
        this.secrets.delete(secretId);
        return null;
      }

      // Decrypt value
      const decrypted = this.decrypt({
        encrypted: secret.value,
        iv: '', // Simplified - in production, store IV with encrypted data
        salt: '',
        algorithm: this.config.algorithm,
      });

      return {
        ...secret,
        value: decrypted,
      };
    } catch (error) {
      this.logger.error(`Error retrieving secret ${secretId}`, error);
      throw error;
    }
  }

  /**
   * Delete secret
   */
  async deleteSecret(secretId: string): Promise<boolean> {
    try {
      const deleted = this.secrets.delete(secretId);
      if (deleted) {
        this.logger.debug(`Deleted secret: ${secretId}`);
      }
      return deleted;
    } catch (error) {
      this.logger.error(`Error deleting secret ${secretId}`, error);
      throw error;
    }
  }

  /**
   * Get secret metadata (without decrypting value)
   */
  getSecretMetadata(secretId: string): Omit<Secret, 'value'> | null {
    try {
      const secret = this.secrets.get(secretId);
      if (!secret) return null;

      return {
        id: secret.id,
        name: secret.name,
        encrypted: secret.encrypted,
        expiresAt: secret.expiresAt,
        createdAt: secret.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error getting secret metadata ${secretId}`, error);
      throw error;
    }
  }

  /**
   * List all secret names
   */
  listSecrets(): Array<{ id: string; name: string; expiresAt?: Date }> {
    return Array.from(this.secrets.values()).map(s => ({
      id: s.id,
      name: s.name,
      expiresAt: s.expiresAt,
    }));
  }

  /**
   * Generate TLS configuration
   */
  generateTLSConfig(): Record<string, unknown> {
    return {
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      cipherSuites: [
        'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
        'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
        'TLS_AES_256_GCM_SHA384',
      ],
      ecdhCurves: ['prime256v1', 'secp384r1', 'secp521r1'],
      requireClientCert: false,
    };
  }

  /**
   * Hash password for storage
   */
  hashPassword(password: string): string {
    try {
      const salt = randomBytes(this.config.saltLength);
      const hash = scryptSync(password, salt, this.config.keyLength);
      return `${salt.toString('hex')}$${hash.toString('hex')}`;
    } catch (error) {
      this.logger.error('Error hashing password', error);
      throw error;
    }
  }

  /**
   * Verify password
   */
  verifyPassword(password: string, hash: string): boolean {
    try {
      const [saltHex, hashHex] = hash.split('$');
      const salt = Buffer.from(saltHex, 'hex');
      const computed = scryptSync(password, salt, this.config.keyLength);
      return computed.toString('hex') === hashHex;
    } catch (error) {
      this.logger.error('Error verifying password', error);
      return false;
    }
  }

  /**
   * Generate secure random string
   */
  generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Get encryption statistics
   */
  getStats(): {
    secretCount: number;
    expiredSecrets: number;
    algorithm: string;
    keyLength: number;
  } {
    let expiredCount = 0;
    const now = new Date();

    for (const secret of this.secrets.values()) {
      if (secret.expiresAt && now > secret.expiresAt) {
        expiredCount++;
      }
    }

    return {
      secretCount: this.secrets.size,
      expiredSecrets: expiredCount,
      algorithm: this.config.algorithm,
      keyLength: this.config.keyLength,
    };
  }

  /**
   * Cleanup expired secrets
   */
  cleanupExpiredSecrets(): number {
    const now = new Date();
    let removed = 0;

    for (const [id, secret] of this.secrets.entries()) {
      if (secret.expiresAt && now > secret.expiresAt) {
        this.secrets.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} expired secrets`);
    }

    return removed;
  }

  /**
   * Shutdown encryption module
   */
  async shutdown(): Promise<void> {
    try {
      // Clear sensitive data
      if (this.masterKey) {
        this.masterKey.fill(0);
      }

      this.secrets.clear();
      this.logger.info('Encryption shutdown');
    } catch (error) {
      this.logger.error('Error during Encryption shutdown', error);
      throw error;
    }
  }
}

export default Encryption;
