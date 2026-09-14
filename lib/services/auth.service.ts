import { PasswordService } from '../auth/password';
import { SessionService, AuthSession } from '../auth/session';
import { UserRole } from '../auth/rbac';
import { AuditService } from './audit.service';
import { prisma, isPostgresConfigured, isProductionMode, DatabaseConfigurationError } from '../prisma';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  tenantId?: string;
  tenantSlug?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  tenantId?: string;
  tenantSlug?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * =========================================================================
 * FenixCMS SaaS Engine — PostgreSQL Authentication & User Service
 * =========================================================================
 * Full PostgreSQL implementation of User CRUD, authentication, password
 * hashing, and tenant association. Never exposes password hashes in safe
 * views. Strictly avoids in-memory user collections in production.
 * =========================================================================
 */
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

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError(
        'Authentication service failed: PostgreSQL is not configured in production mode.'
      );
    }

    try {
      if (isPostgresConfigured() && prisma?.user?.findUnique) {
        const user = await prisma.user.findUnique({
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
          effectiveRole = 'SUPER_ADMIN';
        } else {
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
      if (e instanceof DatabaseConfigurationError) throw e;
      console.error('PostgreSQL auth login error:', e);
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
  }): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
    const cleanEmail = params.email.trim().toLowerCase();

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError(
        'User registration failed: PostgreSQL is not configured in production mode.'
      );
    }

    try {
      if (isPostgresConfigured() && prisma?.user?.findUnique) {
        const existing = await prisma.user.findUnique({
          where: { email: cleanEmail }
        });

        if (existing) {
          return { success: false, error: 'Ya existe una cuenta con este correo electrónico' };
        }

        const passwordHash = PasswordService.hashPassword(params.password);
        const assignedRole = params.role || 'CUSTOMER';

        const createdUser = await prisma.user.create({
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
            role: createdUser.role as UserRole,
            status: createdUser.status as any,
            tenantId: params.tenantId,
            tenantSlug: params.tenantSlug,
            createdAt: createdUser.createdAt.toISOString(),
            updatedAt: createdUser.updatedAt.toISOString()
          }
        };
      }
    } catch (e: any) {
      if (e instanceof DatabaseConfigurationError) throw e;
      console.error('PostgreSQL register error:', e);
      return { success: false, error: e?.message || 'Error al registrar el usuario' };
    }

    return { success: false, error: 'Base de datos no disponible' };
  }

  /**
   * Retrieves a safe user by ID from PostgreSQL (without passwordHash)
   */
  static async getUserById(id: string): Promise<SafeUser | null> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is not configured in production mode.');
    }

    try {
      if (isPostgresConfigured() && prisma?.user?.findUnique) {
        const user = await prisma.user.findUnique({
          where: { id },
          include: { memberships: { include: { tenant: true } } }
        });

        if (!user) return null;

        const firstMembership = user.memberships?.[0];
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          status: user.status as any,
          avatarUrl: user.avatarUrl || undefined,
          tenantId: firstMembership?.tenantId || undefined,
          tenantSlug: firstMembership?.tenant?.slug || undefined,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        };
      }
    } catch (e) {
      if (e instanceof DatabaseConfigurationError) throw e;
      console.error('PostgreSQL getUserById error:', e);
    }
    return null;
  }

  /**
   * Retrieves a safe user by email from PostgreSQL
   */
  static async getUserByEmail(email: string): Promise<SafeUser | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is not configured in production mode.');
    }

    try {
      if (isPostgresConfigured() && prisma?.user?.findUnique) {
        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
          include: { memberships: { include: { tenant: true } } }
        });

        if (!user) return null;

        const firstMembership = user.memberships?.[0];
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          status: user.status as any,
          avatarUrl: user.avatarUrl || undefined,
          tenantId: firstMembership?.tenantId || undefined,
          tenantSlug: firstMembership?.tenant?.slug || undefined,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        };
      }
    } catch (e) {
      if (e instanceof DatabaseConfigurationError) throw e;
      console.error('PostgreSQL getUserByEmail error:', e);
    }
    return null;
  }

  /**
   * Updates user details in PostgreSQL
   */
  static async updateUser(id: string, data: {
    name?: string;
    password?: string;
    role?: UserRole;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
    avatarUrl?: string;
  }): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is not configured in production mode.');
    }

    try {
      if (isPostgresConfigured() && prisma?.user?.update) {
        const updateData: any = {};
        if (data.name) updateData.name = data.name.trim();
        if (data.role) updateData.role = data.role;
        if (data.status) updateData.status = data.status;
        if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
        if (data.password) {
          updateData.passwordHash = PasswordService.hashPassword(data.password);
        }

        const updated = await prisma.user.update({
          where: { id },
          data: updateData,
          include: { memberships: { include: { tenant: true } } }
        });

        const firstMembership = updated.memberships?.[0];
        return {
          success: true,
          user: {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role as UserRole,
            status: updated.status as any,
            avatarUrl: updated.avatarUrl || undefined,
            tenantId: firstMembership?.tenantId || undefined,
            tenantSlug: firstMembership?.tenant?.slug || undefined,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString()
          }
        };
      }
    } catch (e: any) {
      if (e instanceof DatabaseConfigurationError) throw e;
      return { success: false, error: e?.message || 'Error actualizando el usuario' };
    }

    return { success: false, error: 'Base de datos no disponible' };
  }

  /**
   * Deactivates a user account in PostgreSQL
   */
  static async deactivateUser(id: string): Promise<{ success: boolean; error?: string }> {
    return this.updateUser(id, { status: 'INACTIVE' });
  }

  /**
   * Deletes a user account in PostgreSQL (along with sessions and memberships via cascade)
   */
  static async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is not configured in production mode.');
    }

    try {
      if (isPostgresConfigured() && prisma?.user?.delete) {
        await prisma.user.delete({
          where: { id }
        });
        return { success: true };
      }
    } catch (e: any) {
      if (e instanceof DatabaseConfigurationError) throw e;
      return { success: false, error: e?.message || 'Error eliminando el usuario' };
    }

    return { success: false, error: 'Base de datos no disponible' };
  }

  /**
   * Lists users with optional tenant or role filter
   */
  static async listUsers(options?: {
    tenantId?: string;
    role?: UserRole;
    status?: string;
    search?: string;
  }): Promise<SafeUser[]> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is not configured in production mode.');
    }

    try {
      if (isPostgresConfigured() && prisma?.user?.findMany) {
        const where: any = {};
        if (options?.role) where.role = options.role;
        if (options?.status) where.status = options.status;
        if (options?.tenantId) {
          where.memberships = {
            some: { tenantId: options.tenantId }
          };
        }
        if (options?.search) {
          where.OR = [
            { name: { contains: options.search, mode: 'insensitive' } },
            { email: { contains: options.search, mode: 'insensitive' } }
          ];
        }

        const users = await prisma.user.findMany({
          where,
          include: { memberships: { include: { tenant: true } } },
          orderBy: { createdAt: 'desc' }
        });

        return users.map(u => {
          const firstMembership = u.memberships?.[0];
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role as UserRole,
            status: u.status as any,
            avatarUrl: u.avatarUrl || undefined,
            tenantId: firstMembership?.tenantId || undefined,
            tenantSlug: firstMembership?.tenant?.slug || undefined,
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString()
          };
        });
      }
    } catch (e) {
      if (e instanceof DatabaseConfigurationError) throw e;
      console.error('PostgreSQL listUsers error:', e);
    }

    return [];
  }

  /**
   * Securely changes a user's password in PostgreSQL after verifying the current password
   */
  static async changePassword(params: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    if (!params.userId || !params.currentPassword || !params.newPassword) {
      return { success: false, error: 'Todos los campos son requeridos' };
    }

    if (params.newPassword.length < 8) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' };
    }

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is not configured in production mode.');
    }

    try {
      if (isPostgresConfigured() && prisma?.user?.findUnique) {
        const user = await prisma.user.findUnique({
          where: { id: params.userId }
        });

        if (!user) {
          return { success: false, error: 'Usuario no encontrado' };
        }

        const isMatch = PasswordService.verifyPassword(params.currentPassword, user.passwordHash);
        if (!isMatch) {
          return { success: false, error: 'La contraseña actual es incorrecta' };
        }

        const newHash = PasswordService.hashPassword(params.newPassword);
        await prisma.user.update({
          where: { id: params.userId },
          data: { passwordHash: newHash }
        });

        if (params.revokeOtherSessions) {
          await SessionService.revokeAllUserSessions(params.userId);
        }

        AuditService.log({
          userId: user.id,
          userEmail: user.email,
          action: 'PASSWORD_CHANGED',
          entity: 'User',
          entityId: user.id,
          details: { revokeOtherSessions: params.revokeOtherSessions ?? false }
        });

        return { success: true };
      }
    } catch (e: any) {
      if (e instanceof DatabaseConfigurationError) throw e;
      return { success: false, error: e?.message || 'Error al cambiar la contraseña' };
    }

    return { success: false, error: 'Base de datos no disponible' };
  }

  /**
   * Closes a session by invalidating the token
   */
  static async logout(token: string): Promise<boolean> {
    return SessionService.revokeSession(token);
  }
}
