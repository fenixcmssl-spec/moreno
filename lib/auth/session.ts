import { UserRole } from './rbac';
import crypto from 'crypto';
import { prisma, isPostgresConfigured, isProductionMode, DatabaseConfigurationError } from '../prisma';

export interface AuthSession {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
  tenantSlug?: string;
  avatarUrl?: string;
  expiresAt: string;
  lastActiveAt?: string;
}

/**
 * =========================================================================
 * FenixCMS SaaS Engine — PostgreSQL Persistent Session Service
 * =========================================================================
 * Strict PostgreSQL-backed session management using cryptographically
 * hashed tokens (SHA-256). In production, PostgreSQL is the single source
 * of truth without in-memory persistent fallbacks.
 * =========================================================================
 */
export class SessionService {
  private static readonly SESSION_COOKIE_NAME = 'fenix_session_token';
  private static readonly SESSION_TTL_HOURS = 24 * 7; // 7 days

  /**
   * Hashes a raw token for secure storage in PostgreSQL
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Creates a persistent session in PostgreSQL and returns the raw client token and session
   */
  static async createSession(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenantId?: string;
    tenantSlug?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ token: string; session: AuthSession }> {
    const rawToken = `sess_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = this.hashToken(rawToken);

    const expiresDate = new Date();
    expiresDate.setHours(expiresDate.getHours() + this.SESSION_TTL_HOURS);

    const sessionId = `sid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError(
        'Session creation failed: PostgreSQL is not configured in production mode.'
      );
    }

    if (prisma?.session?.create) {
      await prisma.session.create({
        data: {
          id: sessionId,
          tokenHash,
          userId: user.id,
          tenantId: user.tenantId || null,
          role: user.role,
          ipAddress: user.ipAddress || null,
          userAgent: user.userAgent || null,
          expiresAt: expiresDate
        }
      });
    }

    const session: AuthSession = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      expiresAt: expiresDate.toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    return { token: rawToken, session };
  }

  /**
   * Validates a session token directly against PostgreSQL
   */
  static async getSession(token: string | null | undefined): Promise<AuthSession | null> {
    if (!token) return null;
    const tokenHash = this.hashToken(token);

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError(
        'Session lookup failed: PostgreSQL is not configured in production mode.'
      );
    }

    if (prisma?.session?.findUnique) {
      const sessionRecord = await prisma.session.findUnique({
        where: { tokenHash },
        include: {
          user: true,
          tenant: true
        }
      });

      if (!sessionRecord) {
        return null;
      }

      // Check Expiration
      if (new Date(sessionRecord.expiresAt) < new Date()) {
        await prisma.session.delete({ where: { id: sessionRecord.id } }).catch(() => {});
        return null;
      }

      // Check User Status (account suspended/inactive invalidates session)
      if (sessionRecord.user && sessionRecord.user.status && sessionRecord.user.status !== 'ACTIVE') {
        await prisma.session.delete({ where: { id: sessionRecord.id } }).catch(() => {});
        return null;
      }

      // Touch lastActiveAt
      prisma.session.update({
        where: { id: sessionRecord.id },
        data: { lastActiveAt: new Date() }
      }).catch(() => {});

      return {
        id: sessionRecord.id,
        userId: sessionRecord.userId || sessionRecord.user?.id || '',
        email: sessionRecord.user?.email || '',
        name: sessionRecord.user?.name || '',
        role: sessionRecord.role as UserRole,
        tenantId: sessionRecord.tenantId || undefined,
        tenantSlug: sessionRecord.tenant?.slug || undefined,
        expiresAt: (sessionRecord.expiresAt instanceof Date ? sessionRecord.expiresAt : new Date(sessionRecord.expiresAt)).toISOString(),
        lastActiveAt: (sessionRecord.lastActiveAt instanceof Date ? sessionRecord.lastActiveAt : new Date(sessionRecord.lastActiveAt || Date.now())).toISOString()
      };
    }

    return null;
  }

  /**
   * Validates a session token and returns boolean validation status
   */
  static async validateSession(token: string | null | undefined): Promise<{ valid: boolean; session?: AuthSession; error?: string }> {
    const session = await this.getSession(token);
    if (!session) {
      return { valid: false, error: 'Sesión inválida, expirada o no encontrada' };
    }
    return { valid: true, session };
  }

  /**
   * Refreshes a session expiration date
   */
  static async refreshSession(token: string): Promise<boolean> {
    if (!token) return false;
    const tokenHash = this.hashToken(token);

    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + this.SESSION_TTL_HOURS);

    if (prisma?.session?.updateMany) {
      const result = await prisma.session.updateMany({
        where: { 
          tokenHash,
          expiresAt: { gt: new Date() }
        },
        data: { 
          expiresAt: newExpiresAt,
          lastActiveAt: new Date()
        }
      });
      return result.count > 0;
    }

    return false;
  }

  /**
   * Revokes / deletes a specific session by token
   */
  static async revokeSession(token: string): Promise<boolean> {
    if (!token) return false;
    const tokenHash = this.hashToken(token);

    if (prisma?.session?.deleteMany) {
      await prisma.session.deleteMany({
        where: { tokenHash }
      });
      return true;
    }

    return true;
  }

  static async invalidateSession(token: string): Promise<boolean> {
    return this.revokeSession(token);
  }

  /**
   * Revokes all active sessions for a given user across all devices
   */
  static async revokeAllUserSessions(userId: string): Promise<boolean> {
    if (!userId) return false;

    if (prisma?.session?.deleteMany) {
      await prisma.session.deleteMany({
        where: { userId }
      });
      return true;
    }

    return true;
  }

  /**
   * Switches the active tenant context for an existing authenticated session.
   * Validates membership against PostgreSQL before updating.
   */
  static async switchTenant(token: string, targetTenantId: string): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
    if (!token || !targetTenantId) {
      return { success: false, error: 'Token de sesión y tenantId requeridos' };
    }

    const currentSession = await this.getSession(token);
    if (!currentSession) {
      return { success: false, error: 'Sesión no válida o expirada' };
    }

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenantMembership) {
      // 1. If super admin, allow switching to any tenant
      if (currentSession.role === 'SUPER_ADMIN') {
        const tenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
        if (!tenant) {
          return { success: false, error: 'Comercio destino no encontrado' };
        }

        const tokenHash = this.hashToken(token);
        await prisma.session.updateMany({
          where: { tokenHash },
          data: {
            tenantId: targetTenantId,
            lastActiveAt: new Date()
          }
        });

        const updatedSession = await this.getSession(token);
        return { success: true, session: updatedSession || undefined };
      }

      // 2. For non-superadmin, verify user has ACTIVE membership in targetTenantId
      const membership = await prisma.tenantMembership.findUnique({
        where: {
          tenantId_userId: {
            tenantId: targetTenantId,
            userId: currentSession.userId
          }
        },
        include: {
          tenant: true
        }
      });

      if (!membership || membership.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'Acceso denegado: No posees membresía activa en el comercio seleccionado.'
        };
      }

      if (membership.tenant.status === 'suspended') {
        return {
          success: false,
          error: 'El comercio seleccionado se encuentra suspendido.'
        };
      }

      const tokenHash = this.hashToken(token);
      await prisma.session.updateMany({
        where: { tokenHash },
        data: {
          tenantId: targetTenantId,
          role: membership.role,
          lastActiveAt: new Date()
        }
      });

      const updatedSession = await this.getSession(token);
      return { success: true, session: updatedSession || undefined };
    }

    return { success: false, error: 'Servicio de base de datos no disponible' };
  }

  /**
   * Deletes all expired sessions from the database
   */
  static async deleteExpiredSessions(): Promise<number> {
    if (isPostgresConfigured() && prisma?.session?.deleteMany) {
      const res = await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });
      return res.count;
    }
    return 0;
  }

  static getCookieName(): string {
    return this.SESSION_COOKIE_NAME;
  }
}
