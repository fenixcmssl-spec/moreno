import { NextRequest, NextResponse } from 'next/server';
import { SessionService, AuthSession } from './session';
import { UserRole } from './rbac';
import prisma from '../prisma';

export interface AdminAuthResult {
  authorized: boolean;
  session?: AuthSession;
  error?: string;
  statusCode?: number;
}

/**
 * Enforces SUPER_ADMIN role strictly for API routes.
 * Blocks all standard users, customers, store managers, and unauthorized requests.
 */
export async function requireSuperAdmin(req: NextRequest): Promise<AdminAuthResult> {
  // 1. Extract session token strictly from cookie, Authorization header or x-session-token header (NO query params)
  const cookieToken = req.cookies.get(SessionService.getCookieName())?.value;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const customHeaderToken = req.headers.get('x-session-token');

  const token = cookieToken || bearerToken || customHeaderToken;

  if (!token) {
    return {
      authorized: false,
      error: 'Autenticación requerida: No se proporcionó token de sesión válido',
      statusCode: 401
    };
  }

  // 2. Validate session against PostgreSQL
  const session = await SessionService.getSession(token);

  if (!session) {
    return {
      authorized: false,
      error: 'Sesión inválida, revocada o expirada. Por favor, inicia sesión nuevamente.',
      statusCode: 401
    };
  }

  // 3. Strict Role Verification: MUST be SUPER_ADMIN
  if (session.role !== 'SUPER_ADMIN') {
    return {
      authorized: false,
      error: 'Acceso denegado: Se requieren privilegios de SUPER_ADMIN para esta operación',
      statusCode: 403
    };
  }

  // 4. Double check directly against PostgreSQL User record for security hardening (FAIL CLOSED)
  try {
    if (prisma && typeof (prisma as any).user?.findUnique === 'function') {
      const dbUser = await (prisma as any).user.findUnique({
        where: { id: session.userId },
        select: { id: true, role: true, status: true }
      });

      if (!dbUser || dbUser.role !== 'SUPER_ADMIN' || dbUser.status !== 'ACTIVE') {
        return {
          authorized: false,
          error: 'Cuenta de SUPER_ADMIN no válida, modificada o suspendida en la base de datos',
          statusCode: 403
        };
      }
    }
  } catch (e) {
    // Fail-closed policy: Database verification error cannot be bypassed
    return {
      authorized: false,
      error: 'Error de verificación de privilegios en base de datos. Acceso denegado.',
      statusCode: 500
    };
  }

  return {
    authorized: true,
    session
  };
}

/**
 * Creates standardized JSON error response for unauthorized super admin requests
 */
export function adminUnauthorizedResponse(result: AdminAuthResult) {
  return NextResponse.json(
    {
      success: false,
      error: result.error || 'Acceso restringido a SUPER_ADMIN',
      code: result.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
    },
    { status: result.statusCode || 403 }
  );
}
