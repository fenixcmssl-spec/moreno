import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/session';
import { AuthService } from '@/lib/services/auth.service';
import { SecurityService } from '@/lib/security/security.service';

export async function POST(req: NextRequest) {
  try {
    const rateLimit = SecurityService.applyRateLimit(req, 5, 60, 'auth_change_password');
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

    const session = await SessionService.getSession(token);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesión inválida o expirada.', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: 'Solicitud inválida.' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword, revokeOtherSessions = true } = body;

    if (
      typeof currentPassword !== 'string' ||
      currentPassword.length < 1 ||
      currentPassword.length > 128 ||
      typeof newPassword !== 'string' ||
      newPassword.length < 12 ||
      newPassword.length > 128
    ) {
      return NextResponse.json(
        { success: false, error: 'La contraseña actual es obligatoria y la nueva debe tener entre 12 y 128 caracteres.' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: 'La nueva contraseña debe ser distinta de la actual.' },
        { status: 400 }
      );
    }

    if (typeof revokeOtherSessions !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Opción de sesiones inválida.' },
        { status: 400 }
      );
    }

    // Identifiers always come from the validated server session.
    const result = await AuthService.changePassword({
      userId: session.userId,
      currentSessionId: session.id,
      currentPassword,
      newPassword,
      revokeOtherSessions
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Error al cambiar la contraseña' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al procesar el cambio de contraseña' },
      { status: 500 }
    );
  }
}
