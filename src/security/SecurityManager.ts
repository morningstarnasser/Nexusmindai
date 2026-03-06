/**
 * SecurityManager.ts
 * 
 * Zero-trust security model with permission checking, capability tokens,
 * rate limiting, and audit logging integration.
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
import { PermissionSystem } from './PermissionSystem.js';
import { AuditLogger } from './AuditLogger.js';

interface CapabilityToken {
  id: string;
  subject: string;
  permissions: string[];
  expiresAt: Date;
  issuedAt: Date;
  issuer: string;
  metadata?: Record<string, unknown>;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface SecurityCheckRequest {
  subject: string;
  action: string;
  resource?: string;
  context?: Record<string, unknown>;
}

interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  requiresMFA?: boolean;
  riskScore: number;
  timestamp: Date;
}

/**
 * SecurityManager - Zero-trust security enforcement
 */
export class SecurityManager extends EventEmitter {
  private logger: Logger;
  private permissionSystem: PermissionSystem;
  private auditLogger: AuditLogger;
  
  private tokens: Map<string, CapabilityToken> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private blockedSubjects: Set<string> = new Set();
  
  private rateLimitConfig: RateLimitConfig = {
    maxRequests: 1000,
    windowMs: 60000, // 1 minute
  };

  private tokenCounter: number = 0;

  constructor() {
    super();
    this.logger = new Logger('SecurityManager');
    this.permissionSystem = new PermissionSystem();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Initialize security manager
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing SecurityManager');

      await Promise.all([
        this.permissionSystem.initialize?.(),
        this.auditLogger.initialize?.(),
      ]);

      this.logger.info('SecurityManager initialized');
      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize SecurityManager', error);
      throw error;
    }
  }

  /**
   * Perform security check (zero-trust)
   */
  async checkSecurity(request: SecurityCheckRequest): Promise<SecurityCheckResult> {
    try {
      const startTime = Date.now();

      // Check if subject is blocked
      if (this.blockedSubjects.has(request.subject)) {
        await this.auditLogger.log({
          eventType: 'security_check_failed',
          subject: request.subject,
          action: request.action,
          timestamp: new Date(),
          metadata: { reason: 'Subject is blocked' },
        } as any);

        return {
          allowed: false,
          reason: 'Subject is blocked',
          riskScore: 1.0,
          timestamp: new Date(),
        };
      }

      // Check rate limits
      if (!this.checkRateLimit(request.subject)) {
        await this.auditLogger.log({
          eventType: 'rate_limit_exceeded',
          subject: request.subject,
          action: request.action,
          timestamp: new Date(),
        } as any);

        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          riskScore: 0.8,
          timestamp: new Date(),
        };
      }

      // Check permissions
      const hasPermission = await this.permissionSystem.checkPermission(
        request.subject,
        request.action,
        request.resource
      );

      if (!hasPermission) {
        await this.auditLogger.log({
          eventType: 'permission_denied',
          subject: request.subject,
          action: request.action,
          resource: request.resource,
          timestamp: new Date(),
        } as any);

        return {
          allowed: false,
          reason: 'Permission denied',
          riskScore: 0.6,
          timestamp: new Date(),
        };
      }

      // Calculate risk score
      const riskScore = this.calculateRiskScore(request);

      // Require MFA for high-risk operations
      const requiresMFA = riskScore > 0.7;

      await this.auditLogger.log({
        eventType: 'security_check_passed',
        subject: request.subject,
        action: request.action,
        resource: request.resource,
        timestamp: new Date(),
        metadata: { riskScore, requiresMFA, duration: Date.now() - startTime },
      } as any);

      return {
        allowed: true,
        requiresMFA,
        riskScore,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error during security check', error);
      throw error;
    }
  }

  /**
   * Issue capability token
   */
  async issueToken(
    subject: string,
    permissions: string[],
    expiresInMinutes: number = 60,
    metadata?: Record<string, unknown>
  ): Promise<CapabilityToken> {
    try {
      const token: CapabilityToken = {
        id: `token-${++this.tokenCounter}-${Date.now()}`,
        subject,
        permissions,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
        issuer: 'SecurityManager',
        metadata,
      };

      this.tokens.set(token.id, token);

      await this.auditLogger.log({
        eventType: 'token_issued',
        subject,
        timestamp: new Date(),
        metadata: { tokenId: token.id, permissions, expiresAt: token.expiresAt },
      } as any);

      this.logger.info(`Issued token for ${subject}`);
      this.emit('tokenIssued', { tokenId: token.id, subject });

      return token;
    } catch (error) {
      this.logger.error('Error issuing token', error);
      throw error;
    }
  }

  /**
   * Verify token
   */
  async verifyToken(tokenId: string): Promise<CapabilityToken | null> {
    try {
      const token = this.tokens.get(tokenId);
      if (!token) return null;

      // Check if expired
      if (new Date() > token.expiresAt) {
        this.tokens.delete(tokenId);
        return null;
      }

      return token;
    } catch (error) {
      this.logger.error(`Error verifying token ${tokenId}`, error);
      throw error;
    }
  }

  /**
   * Revoke token
   */
  async revokeToken(tokenId: string): Promise<boolean> {
    try {
      const token = this.tokens.get(tokenId);
      if (!token) return false;

      this.tokens.delete(tokenId);

      await this.auditLogger.log({
        eventType: 'token_revoked',
        subject: token.subject,
        timestamp: new Date(),
        metadata: { tokenId },
      } as any);

      this.logger.info(`Revoked token ${tokenId}`);
      this.emit('tokenRevoked', { tokenId, subject: token.subject });

      return true;
    } catch (error) {
      this.logger.error(`Error revoking token ${tokenId}`, error);
      throw error;
    }
  }

  /**
   * Block a subject
   */
  async blockSubject(subject: string, reason: string): Promise<void> {
    try {
      this.blockedSubjects.add(subject);

      await this.auditLogger.log({
        eventType: 'subject_blocked',
        subject,
        timestamp: new Date(),
        metadata: { reason },
      } as any);

      this.logger.warn(`Blocked subject: ${subject}`);
      this.emit('subjectBlocked', { subject, reason });
    } catch (error) {
      this.logger.error(`Error blocking subject ${subject}`, error);
      throw error;
    }
  }

  /**
   * Unblock a subject
   */
  async unblockSubject(subject: string): Promise<void> {
    try {
      this.blockedSubjects.delete(subject);

      await this.auditLogger.log({
        eventType: 'subject_unblocked',
        subject,
        timestamp: new Date(),
      } as any);

      this.logger.info(`Unblocked subject: ${subject}`);
      this.emit('subjectUnblocked', { subject });
    } catch (error) {
      this.logger.error(`Error unblocking subject ${subject}`, error);
      throw error;
    }
  }

  /**
   * Check rate limit for subject
   */
  private checkRateLimit(subject: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(subject);

    if (!entry || now > entry.resetTime) {
      // New window
      this.rateLimits.set(subject, {
        count: 1,
        resetTime: now + this.rateLimitConfig.windowMs,
      });
      return true;
    }

    if (entry.count >= this.rateLimitConfig.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Calculate risk score for operation
   */
  private calculateRiskScore(request: SecurityCheckRequest): number {
    let score = 0.0;

    // High-risk actions
    const highRiskActions = ['delete', 'admin:grant', 'security:bypass', 'system:shutdown'];
    if (highRiskActions.includes(request.action)) {
      score += 0.5;
    }

    // Sensitive resources
    const sensitiveResources = ['secrets', 'credentials', 'encryption_keys', 'admin'];
    if (request.resource && sensitiveResources.some(r => request.resource?.includes(r))) {
      score += 0.3;
    }

    // Unusual context
    if (request.context?.ipAddress && this.isUnusualIP(request.context.ipAddress as string)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check for unusual IP (mock)
   */
  private isUnusualIP(ip: string): boolean {
    // In production, check against known locations/patterns
    return false;
  }

  /**
   * Set rate limit configuration
   */
  setRateLimitConfig(config: Partial<RateLimitConfig>): void {
    this.rateLimitConfig = { ...this.rateLimitConfig, ...config };
    this.logger.debug(`Rate limit config updated: ${JSON.stringify(this.rateLimitConfig)}`);
  }

  /**
   * Get security statistics
   */
  getStats(): {
    activeTokens: number;
    blockedSubjects: number;
    auditLogSize: number;
  } {
    // Cleanup expired tokens
    const now = new Date();
    for (const [id, token] of this.tokens.entries()) {
      if (now > token.expiresAt) {
        this.tokens.delete(id);
      }
    }

    return {
      activeTokens: this.tokens.size,
      blockedSubjects: this.blockedSubjects.size,
      auditLogSize: this.auditLogger.getLogCount?.() || 0,
    };
  }

  /**
   * Export security audit log
   */
  async exportAuditLog(since?: Date): Promise<Record<string, unknown>[]> {
    return (this.auditLogger.export?.(since) || []) as unknown as Record<string, unknown>[];
  }

  /**
   * Clear all rate limits
   */
  clearRateLimits(): void {
    this.rateLimits.clear();
    this.logger.info('Cleared all rate limits');
  }

  /**
   * Shutdown security manager
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down SecurityManager');

      await Promise.all([
        this.permissionSystem.shutdown?.(),
        this.auditLogger.shutdown?.(),
      ]);

      this.tokens.clear();
      this.rateLimits.clear();
      this.blockedSubjects.clear();

      this.logger.info('SecurityManager shutdown complete');
      this.emit('shutdown');
    } catch (error) {
      this.logger.error('Error during SecurityManager shutdown', error);
      throw error;
    }
  }
}

export default SecurityManager;
