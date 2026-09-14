import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/session';
import { AuditService } from '@/lib/services/audit.service';
import { SecurityService } from '@/lib/security/security.service';

export async function POST(req: NextRequest) {
  try {
    const rateLimit = SecurityService.applyRateLimit(req, 20, 60, 'auth_switch_tenant');
    if (rateLimit.limited && rateLimit.response) {
      return rateLimit.response;
    }

    const token = req.cookies.get(SessionService.getCookieName())?.value || 
      (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')!.substring(7).trim() : null);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No autenticado. Se requiere sesión activa.', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const rawBody = await req.json();
    const body = SecurityService.sanitizePayload(rawBody);
    const { targetTenantId } = body;

    if (!targetTenantId || typeof targetTenantId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'targetTenantId es requerido.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const result = await SessionService.switchTenant(token, targetTenantId.trim());

    if (!result.success || !result.session) {
      return NextResponse.json(
        { success: false, error: result.error || 'No se pudo cambiar de comercio.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    AuditService.log({
      tenantId: result.session.tenantId,
      userId: result.session.userId,
      userEmail: result.session.email,
      action: 'TENANT_SWITCHED',
      entity: 'Session',
      entityId: result.session.id,
      details: { targetTenantId, newRole: result.session.role }
    });

    return NextResponse.json({
      success: true,
      session: result.session,
      message: 'Comercio cambiado exitosamente'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al cambiar de comercio' },
      { status: 500 }
    );
  }
}
