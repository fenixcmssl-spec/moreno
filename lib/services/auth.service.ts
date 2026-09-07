import { PasswordService } from '../auth/password';
import { SessionService, AuthSession } from '../auth/session';
import { UserRole } from '../auth/rbac';
import { AuditService } from './audit.service';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  tenantId?: string;
  tenantSlug?: string;
  avatarUrl?: string;
  createdAt: string;
}

const USERS_DB: UserAccount[] = [
  {
    id: 'usr_superadmin',
    email: 'info@fenixcms.es',
    name: 'Super Administrador FenixCMS',
    passwordHash: PasswordService.hashPassword('Patricia1980@'),
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'usr_superadmin_legacy',
    email: 'admin@fenix.com',
    name: 'Super Administrador Secundario',
    passwordHash: PasswordService.hashPassword('Patricia1980@'),
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'usr_merchant_owner',
    email: 'tienda@demo.com',
    name: 'Carlos Mendoza',
    passwordHash: PasswordService.hashPassword('tienda123'),
    role: 'TENANT_OWNER',
    tenantId: 'tenant_1',
    tenantSlug: 'mitienda',
    status: 'ACTIVE',
    createdAt: '2026-01-05T00:00:00Z'
  },
  {
    id: 'usr_customer_demo',
    email: 'cliente@ejemplo.com',
    name: 'Laura García',
    passwordHash: PasswordService.hashPassword('cliente123'),
    role: 'CUSTOMER',
    tenantId: 'tenant_1',
    tenantSlug: 'mitienda',
    status: 'ACTIVE',
    createdAt: '2026-02-01T00:00:00Z'
  }
];

export class AuthService {
  /**
   * Performs server-side login validation and session creation
   */
  static async login(params: {
    email: string;
    password: string;
    tenantSlug?: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; session?: AuthSession; token?: string; error?: string }> {
    const user = USERS_DB.find(u => u.email.toLowerCase() === params.email.toLowerCase());

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

    // Verify tenant boundary for non-superadmin
    if (user.role !== 'SUPER_ADMIN' && params.tenantSlug && user.tenantSlug && user.tenantSlug !== params.tenantSlug) {
      return { success: false, error: 'Este usuario no tiene membresía en este comercio' };
    }

    const { token, session } = SessionService.createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug
    });

    AuditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      entity: 'Session',
      entityId: session.id,
      details: { role: user.role, ip: params.ipAddress }
    });

    return { success: true, session, token };
  }

  static async register(params: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    tenantId?: string;
    tenantSlug?: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const existing = USERS_DB.find(u => u.email.toLowerCase() === params.email.toLowerCase());
    if (existing) {
      return { success: false, error: 'Ya existe una cuenta con este correo electrónico' };
    }

    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      name: params.name,
      email: params.email.toLowerCase(),
      passwordHash: PasswordService.hashPassword(params.password),
      role: params.role || 'CUSTOMER',
      tenantId: params.tenantId,
      tenantSlug: params.tenantSlug,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    USERS_DB.push(newUser);

    AuditService.log({
      tenantId: params.tenantId,
      userId: newUser.id,
      userEmail: newUser.email,
      action: 'USER_REGISTER',
      entity: 'User',
      entityId: newUser.id,
      details: { role: newUser.role }
    });

    return { success: true, user: newUser };
  }

  static getUserById(id: string): UserAccount | undefined {
    return USERS_DB.find(u => u.id === id);
  }

  static getAllUsers(): UserAccount[] {
    return USERS_DB;
  }
}
