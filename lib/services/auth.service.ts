import { PasswordService } from '../auth/password';
import { SessionService, AuthSession } from '../auth/session';
import { UserRole } from '../auth/rbac';
import { AuditService } from './audit.service';
import prisma from '../prisma';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  tenantId?: string;
  tenantSlug?: string;
  avatarUrl?: string;
  createdAt: string;
}

export class AuthService {
  /**
   * Performs server-side login validation against PostgreSQL and session creation
   */
  static async login(params: {
    email: string;
    password: string;
    tenantSlug?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; session?: AuthSession; token?: string; error?: string }> {
    const cleanEmail = params.email.trim().toLowerCase();

    try {
      if (prisma && typeof (prisma as any).user?.findUnique === 'function') {
        const user = await (prisma as any).user.findUnique({
          where: { email: cleanEmail },
          include: {
            memberships: {
              include: {
                tenant: true
              }
            }
          }
        });

        if (!user) {
          return { success: false, error: 'Credenciales inválidas o usuario no encontrado' };
        }

        if (user.status !== 'ACTIVE') {
          return { success: false, error: 'Tu cuenta se encuentra suspendida o inactiva' };
        }

        const isMatch = PasswordService.verifyPassword(params.password, user.passwordHash);
        if (!isMatch) {
          return { success: false, error: 'Contraseña incorrecta' };
        }

        // Determine tenant association
        let effectiveTenantId: string | undefined = undefined;
        let effectiveTenantSlug: string | undefined = undefined;
        let effectiveRole: UserRole = user.role as UserRole;

        if (user.role === 'SUPER_ADMIN') {
          // Super admin has global privileges
          effectiveRole = 'SUPER_ADMIN';
        } else {
          // Check tenant membership
          const userMemberships = user.memberships || [];
          if (params.tenantSlug) {
            const matchedMembership = userMemberships.find((m: any) => m.tenant?.slug === params.tenantSlug);
            if (!matchedMembership) {
              return { success: false, error: 'Este usuario no tiene membresía en este comercio' };
            }
            effectiveTenantId = matchedMembership.tenantId;
            effectiveTenantSlug = matchedMembership.tenant?.slug;
            effectiveRole = matchedMembership.role as UserRole;
          } else if (userMemberships.length > 0) {
            effectiveTenantId = userMemberships[0].tenantId;
            effectiveTenantSlug = userMemberships[0].tenant?.slug;
            effectiveRole = userMemberships[0].role as UserRole;
          }
        }

        const { token, session } = await SessionService.createSession({
          id: user.id,
          email: user.email,
          name: user.name,
          role: effectiveRole,
          tenantId: effectiveTenantId,
          tenantSlug: effectiveTenantSlug,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent
        });

        AuditService.log({
          tenantId: effectiveTenantId,
          userId: user.id,
          userEmail: user.email,
          action: 'USER_LOGIN',
          entity: 'Session',
          entityId: session.id,
          details: { role: effectiveRole, ip: params.ipAddress }
        });

        return { success: true, session, token };
      }
    } catch (e: any) {
      console.error('PostgreSQL auth error:', e);
      return { success: false, error: 'Error al conectar con el servicio de autenticación' };
    }

    return { success: false, error: 'Servicio de base de datos no disponible' };
  }

  /**
   * Registers a new user directly in PostgreSQL with PBKDF2 password hashing
   */
  static async register(params: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    tenantId?: string;
    tenantSlug?: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const cleanEmail = params.email.trim().toLowerCase();

    try {
      if (prisma && typeof (prisma as any).user?.findUnique === 'function') {
        const existing = await (prisma as any).user.findUnique({
          where: { email: cleanEmail }
        });

        if (existing) {
          return { success: false, error: 'Ya existe una cuenta con este correo electrónico' };
        }

        const passwordHash = PasswordService.hashPassword(params.password);
        const assignedRole = params.role || 'CUSTOMER';

        const createdUser = await (prisma as any).user.create({
          data: {
            name: params.name,
            email: cleanEmail,
            passwordHash,
            role: assignedRole,
            status: 'ACTIVE',
            ...(params.tenantId ? {
              memberships: {
                create: {
                  tenantId: params.tenantId,
                  role: assignedRole,
                  status: 'ACTIVE'
                }
              }
            } : {})
          }
        });

        AuditService.log({
          tenantId: params.tenantId,
          userId: createdUser.id,
          userEmail: createdUser.email,
          action: 'USER_REGISTER',
          entity: 'User',
          entityId: createdUser.id,
          details: { role: assignedRole }
        });

        return {
          success: true,
          user: {
            id: createdUser.id,
            name: createdUser.name,
            email: createdUser.email,
            passwordHash: createdUser.passwordHash,
            role: createdUser.role as UserRole,
            status: createdUser.status as any,
            tenantId: params.tenantId,
            tenantSlug: params.tenantSlug,
            createdAt: createdUser.createdAt.toISOString()
          }
        };
      }
    } catch (e: any) {
      console.error('PostgreSQL register error:', e);
      return { success: false, error: e?.message || 'Error al registrar el usuario' };
    }

    return { success: false, error: 'Base de datos no disponible' };
  }

  /**
   * Retrieves a user by ID from PostgreSQL
   */
  static async getUserById(id: string): Promise<UserAccount | null> {
    try {
      if (prisma && typeof (prisma as any).user?.findUnique === 'function') {
        const user = await (prisma as any).user.findUnique({
          where: { id },
          include: { memberships: { include: { tenant: true } } }
        });

        if (!user) return null;

        const firstMembership = user.memberships?.[0];
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role as UserRole,
          status: user.status as any,
          avatarUrl: user.avatarUrl || undefined,
          tenantId: firstMembership?.tenantId || undefined,
          tenantSlug: firstMembership?.tenant?.slug || undefined,
          createdAt: user.createdAt.toISOString()
        };
      }
    } catch (e) {
      console.error('PostgreSQL getUserById error:', e);
    }
    return null;
  }

  /**
   * Closes a session by invalidating the token
   */
  static async logout(token: string): Promise<boolean> {
    return SessionService.revokeSession(token);
  }
}
