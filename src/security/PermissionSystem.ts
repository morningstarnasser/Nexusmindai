/**
 * PermissionSystem.ts
 * 
 * Capability-based permission system with time-limited tokens.
 * Supports permission levels from Minimal to Admin.
 */

import { Logger } from '../utils/logger.js';

type PermissionLevel = 'minimal' | 'basic' | 'standard' | 'elevated' | 'admin';

interface Permission {
  id: string;
  name: string;
  description: string;
  level: PermissionLevel;
}

interface SubjectPermissions {
  subject: string;
  permissions: Set<string>;
  roles: Set<string>;
  level: PermissionLevel;
  expiresAt?: Date;
}

interface PermissionGrant {
  subject: string;
  permission: string;
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
  revoked: boolean;
}

/**
 * PermissionSystem - Capability-based permission management
 */
export class PermissionSystem {
  private logger: Logger;
  private permissions: Map<string, Permission> = new Map();
  private subjectPermissions: Map<string, SubjectPermissions> = new Map();
  private permissionGrants: Map<string, PermissionGrant[]> = new Map();

  private levelHierarchy: Record<PermissionLevel, number> = {
    minimal: 1,
    basic: 2,
    standard: 3,
    elevated: 4,
    admin: 5,
  };

  constructor() {
    this.logger = new Logger('PermissionSystem');
  }

  /**
   * Initialize permission system
   */
  async initialize(): Promise<void> {
    this.logger.debug('Initialized PermissionSystem');
    
    // Register built-in permissions
    this.registerBuiltinPermissions();
  }

  /**
   * Register built-in permissions
   */
  private registerBuiltinPermissions(): void {
    const builtins: Permission[] = [
      { id: 'memory:read', name: 'Read Memory', description: 'Access memory storage', level: 'basic' },
      { id: 'memory:write', name: 'Write Memory', description: 'Store to memory', level: 'standard' },
      { id: 'memory:delete', name: 'Delete Memory', description: 'Delete from memory', level: 'elevated' },
      { id: 'network:internet', name: 'Internet Access', description: 'Access external networks', level: 'standard' },
      { id: 'network:internal', name: 'Internal Network', description: 'Access internal network', level: 'elevated' },
      { id: 'filesystem:read', name: 'Read Files', description: 'Read from filesystem', level: 'basic' },
      { id: 'filesystem:write', name: 'Write Files', description: 'Write to filesystem', level: 'standard' },
      { id: 'filesystem:delete', name: 'Delete Files', description: 'Delete files', level: 'elevated' },
      { id: 'sandbox:execute', name: 'Execute Code', description: 'Execute code in sandbox', level: 'elevated' },
      { id: 'admin:grant', name: 'Grant Permissions', description: 'Grant permissions to others', level: 'admin' },
      { id: 'admin:revoke', name: 'Revoke Permissions', description: 'Revoke permissions', level: 'admin' },
      { id: 'security:bypass', name: 'Security Bypass', description: 'Bypass security checks', level: 'admin' },
    ];

    for (const perm of builtins) {
      this.permissions.set(perm.id, perm);
    }

    this.logger.debug(`Registered ${builtins.length} built-in permissions`);
  }

  /**
   * Register custom permission
   */
  registerPermission(id: string, name: string, description: string, level: PermissionLevel): void {
    try {
      const permission: Permission = { id, name, description, level };
      this.permissions.set(id, permission);
      this.logger.debug(`Registered permission: ${id}`);
    } catch (error) {
      this.logger.error(`Error registering permission ${id}`, error);
      throw error;
    }
  }

  /**
   * Grant permission to subject
   */
  async grantPermission(
    subject: string,
    permissionId: string,
    expiresInMinutes?: number,
    grantedBy: string = 'system'
  ): Promise<PermissionGrant> {
    try {
      const permission = this.permissions.get(permissionId);
      if (!permission) {
        throw new Error(`Permission not found: ${permissionId}`);
      }

      // Ensure subject permissions entry exists
      if (!this.subjectPermissions.has(subject)) {
        this.subjectPermissions.set(subject, {
          subject,
          permissions: new Set(),
          roles: new Set(),
          level: 'minimal',
        });
      }

      const subjectPerms = this.subjectPermissions.get(subject)!;
      subjectPerms.permissions.add(permissionId);

      // Update level if necessary
      if (this.levelHierarchy[permission.level] > this.levelHierarchy[subjectPerms.level]) {
        subjectPerms.level = permission.level;
      }

      const expiresAt = expiresInMinutes
        ? new Date(Date.now() + expiresInMinutes * 60 * 1000)
        : undefined;

      const grant: PermissionGrant = {
        subject,
        permission: permissionId,
        grantedAt: new Date(),
        grantedBy,
        expiresAt,
        revoked: false,
      };

      if (!this.permissionGrants.has(subject)) {
        this.permissionGrants.set(subject, []);
      }

      this.permissionGrants.get(subject)!.push(grant);

      this.logger.info(`Granted permission ${permissionId} to ${subject}`);
      return grant;
    } catch (error) {
      this.logger.error(`Error granting permission ${permissionId} to ${subject}`, error);
      throw error;
    }
  }

  /**
   * Revoke permission from subject
   */
  async revokePermission(
    subject: string,
    permissionId: string,
    revokedBy: string = 'system'
  ): Promise<boolean> {
    try {
      const subjectPerms = this.subjectPermissions.get(subject);
      if (!subjectPerms) {
        return false;
      }

      const removed = subjectPerms.permissions.delete(permissionId);

      // Mark grants as revoked
      const grants = this.permissionGrants.get(subject) || [];
      for (const grant of grants) {
        if (grant.permission === permissionId && !grant.revoked) {
          grant.revoked = true;
        }
      }

      if (removed) {
        this.logger.info(`Revoked permission ${permissionId} from ${subject}`);
      }

      return removed;
    } catch (error) {
      this.logger.error(`Error revoking permission ${permissionId} from ${subject}`, error);
      throw error;
    }
  }

  /**
   * Check if subject has permission
   */
  async checkPermission(
    subject: string,
    action: string,
    resource?: string
  ): Promise<boolean> {
    try {
      const subjectPerms = this.subjectPermissions.get(subject);
      if (!subjectPerms) {
        return false;
      }

      // Check if permission is granted
      if (subjectPerms.permissions.has(action)) {
        // Check if expired
        const grants = this.permissionGrants.get(subject) || [];
        const grant = grants.find(g => g.permission === action && !g.revoked);
        
        if (grant && grant.expiresAt && new Date() > grant.expiresAt) {
          await this.revokePermission(subject, action);
          return false;
        }

        return true;
      }

      // Check role-based permissions
      for (const role of subjectPerms.roles) {
        if (await this.roleHasPermission(role, action)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Error checking permission for ${subject}`, error);
      throw error;
    }
  }

  /**
   * Check if role has permission (mock)
   */
  private async roleHasPermission(role: string, permission: string): Promise<boolean> {
    // Mock implementation
    const rolePermissions: Record<string, string[]> = {
      admin: Array.from(this.permissions.keys()),
      user: ['memory:read', 'network:internet', 'filesystem:read'],
      guest: ['memory:read'],
    };

    return rolePermissions[role]?.includes(permission) || false;
  }

  /**
   * Grant role to subject
   */
  async grantRole(subject: string, role: string): Promise<void> {
    try {
      if (!this.subjectPermissions.has(subject)) {
        this.subjectPermissions.set(subject, {
          subject,
          permissions: new Set(),
          roles: new Set(),
          level: 'minimal',
        });
      }

      this.subjectPermissions.get(subject)!.roles.add(role);
      this.logger.info(`Granted role ${role} to ${subject}`);
    } catch (error) {
      this.logger.error(`Error granting role ${role} to ${subject}`, error);
      throw error;
    }
  }

  /**
   * Revoke role from subject
   */
  async revokeRole(subject: string, role: string): Promise<boolean> {
    try {
      const subjectPerms = this.subjectPermissions.get(subject);
      if (!subjectPerms) {
        return false;
      }

      const removed = subjectPerms.roles.delete(role);
      if (removed) {
        this.logger.info(`Revoked role ${role} from ${subject}`);
      }

      return removed;
    } catch (error) {
      this.logger.error(`Error revoking role ${role} from ${subject}`, error);
      throw error;
    }
  }

  /**
   * Get permissions for subject
   */
  getSubjectPermissions(subject: string): {
    permissions: string[];
    roles: string[];
    level: PermissionLevel;
  } | null {
    const perms = this.subjectPermissions.get(subject);
    if (!perms) return null;

    return {
      permissions: Array.from(perms.permissions),
      roles: Array.from(perms.roles),
      level: perms.level,
    };
  }

  /**
   * List all permissions
   */
  listPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get permission details
   */
  getPermission(id: string): Permission | undefined {
    return this.permissions.get(id);
  }

  /**
   * Get permission statistics
   */
  getStats(): {
    totalPermissions: number;
    totalSubjects: number;
    totalGrants: number;
  } {
    let totalGrants = 0;
    for (const grants of this.permissionGrants.values()) {
      totalGrants += grants.length;
    }

    return {
      totalPermissions: this.permissions.size,
      totalSubjects: this.subjectPermissions.size,
      totalGrants,
    };
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.permissions.clear();
    this.subjectPermissions.clear();
    this.permissionGrants.clear();
    this.logger.info('PermissionSystem shutdown');
  }
}

export default PermissionSystem;
