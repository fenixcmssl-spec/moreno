import { UserRole } from './rbac';
import crypto from 'crypto';
import prisma from '../prisma';

export interface AuthSession {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
  tenantSlug?: string;
  expiresAt: string;
}

const memorySessionStore = new Map<string, AuthSession>();

export class SessionService {
  private static SESSION_COOKIE_NAME = 'fenix_session_token';
  private static SESSION_TTL_HOURS = 24 * 7; // 7 days

  /**
   * Hashes a raw token for secure storage in PostgreSQL
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates a persistent session in PostgreSQL and returns the secret client token
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

    const session: AuthSession = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      expiresAt: expiresDate.toISOString()
    };

    // Store in memory cache
    memorySessionStore.set(tokenHash, session);

    try {
      if (process.env.DATABASE_URL && prisma && typeof (prisma as any).session?.create === 'function') {
        await (prisma as any).session.create({
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
    } catch (e) {
      // Prisma error fallback handled gracefully
    }

    return { token: rawToken, session };
  }

  /**
   * Validates a session token against PostgreSQL and memory cache
   */
  static async getSession(token: string | null | undefined): Promise<AuthSession | null> {
    if (!token) return null;
    const tokenHash = this.hashToken(token);

    try {
      if (process.env.DATABASE_URL && prisma && typeof (prisma as any).session?.findUnique === 'function') {
        const sessionRecord = await (prisma as any).session.findUnique({
          where: { tokenHash },
          include: {
            user: true,
            tenant: true
          }
        });

        if (sessionRecord) {
          if (new Date(sessionRecord.expiresAt) < new Date()) {
            await (prisma as any).session.delete({ where: { id: sessionRecord.id } }).catch(() => {});
            memorySessionStore.delete(tokenHash);
            return null;
          }

          (prisma as any).session.update({
            where: { id: sessionRecord.id },
            data: { lastActiveAt: new Date() }
          }).catch(() => {});

          const sess: AuthSession = {
            id: sessionRecord.id,
            userId: sessionRecord.user.id,
            email: sessionRecord.user.email,
            name: sessionRecord.user.name,
            role: sessionRecord.role as UserRole,
            tenantId: sessionRecord.tenantId || undefined,
            tenantSlug: sessionRecord.tenant?.slug || undefined,
            expiresAt: sessionRecord.expiresAt.toISOString()
          };
          memorySessionStore.set(tokenHash, sess);
          return sess;
        }
      }
    } catch (e) {
      // Fall through to memory store
    }

    const cached = memorySessionStore.get(tokenHash);
    if (cached) {
      if (new Date(cached.expiresAt) < new Date()) {
        memorySessionStore.delete(tokenHash);
        return null;
      }
      return cached;
    }

    return null;
  }

  /**
   * Revokes / deletes a session
   */
  static async revokeSession(token: string): Promise<boolean> {
    if (!token) return false;
    const tokenHash = this.hashToken(token);
    memorySessionStore.delete(tokenHash);

    try {
      if (process.env.DATABASE_URL && prisma && typeof (prisma as any).session?.deleteMany === 'function') {
        await (prisma as any).session.deleteMany({
          where: { tokenHash }
        });
      }
    } catch {}

    return true;
  }

  /**
   * Revokes all active sessions for a given user
   */
  static async revokeAllUserSessions(userId: string): Promise<boolean> {
    for (const [hash, sess] of memorySessionStore.entries()) {
      if (sess.userId === userId) {
        memorySessionStore.delete(hash);
      }
    }

    try {
      if (process.env.DATABASE_URL && prisma && typeof (prisma as any).session?.deleteMany === 'function') {
        await (prisma as any).session.deleteMany({
          where: { userId }
        });
      }
    } catch {}

    return true;
  }

  static getCookieName(): string {
    return this.SESSION_COOKIE_NAME;
  }
}
