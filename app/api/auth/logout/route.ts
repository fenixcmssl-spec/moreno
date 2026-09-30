import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/session';
import { AuditService } from '@/lib/services/audit.service';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SessionService.getCookieName())?.value;

    if (token) {
      const session = await SessionService.getSession(token);
      if (session) {
        AuditService.log({
          tenantId: session.tenantId,
          userId: session.userId,
          userEmail: session.email,
          action: 'USER_LOGOUT',
          entity: 'Session',
          entityId: session.id,
          details: { role: session.role }
        });
      }
      await SessionService.revokeSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Sesión finalizada exitosamente'
    });

    // Clear cookie
    response.cookies.set({
      name: SessionService.getCookieName(),
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error al cerrar sesión'
    }, { status: 500 });
  }
}
