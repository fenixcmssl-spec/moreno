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

    const body = await req.json();
    const { currentPassword, newPassword, revokeOtherSessions = true } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Contraseña actual y nueva contraseña son requeridas.' },
        { status: 400 }
      );
    }

    // Always use session.userId - NEVER trust client body for userId
    const result = await AuthService.changePassword({
      userId: session.userId,
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
