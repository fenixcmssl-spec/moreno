import { UserRole } from './rbac';
import crypto from 'crypto';

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

// In-memory session store for server routes / Next.js server actions
const SESSIONS_CACHE = new Map<string, AuthSession>();

export class SessionService {
  private static SESSION_COOKIE_NAME = 'fenix_session_token';
  private static SESSION_TTL_HOURS = 24 * 7; // 7 days

  static createSession(user: { id: string; email: string; name: string; role: UserRole; tenantId?: string; tenantSlug?: string }): { token: string; session: AuthSession } {
    const token = `sess_${crypto.randomBytes(32).toString('hex')}`;
    const expiresDate = new Date();
    expiresDate.setHours(expiresDate.getHours() + this.SESSION_TTL_HOURS);

    const session: AuthSession = {
      id: `sid_${Date.now()}`,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      expiresAt: expiresDate.toISOString()
    };

    SESSIONS_CACHE.set(token, session);
    return { token, session };
  }

  static getSession(token: string | null | undefined): AuthSession | null {
    if (!token) return null;
    const session = SESSIONS_CACHE.get(token);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      SESSIONS_CACHE.delete(token);
      return null;
    }
    return session;
  }

  static revokeSession(token: string): boolean {
    return SESSIONS_CACHE.delete(token);
  }

  static getCookieName(): string {
    return this.SESSION_COOKIE_NAME;
  }
}
