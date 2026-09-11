import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { LoginSchema } from '@/lib/validators';
import { SessionService } from '@/lib/auth/session';
import { SecurityService } from '@/lib/security/security.service';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting protection against brute-force (5 attempts per minute per IP)
    const rateLimit = SecurityService.applyRateLimit(req, 10, 60, 'auth_login');
    if (rateLimit.limited && rateLimit.response) {
      return rateLimit.response;
    }

    const rawBody = await req.json();
    const body = SecurityService.sanitizePayload(rawBody);
    const validated = LoginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({
        success: false,
        error: 'Datos de inicio de sesión inválidos',
        issues: validated.error.issues
      }, { status: 400 });
    }

    const { email, password, tenantSlug } = validated.data;
    const result = await AuthService.login({
      email,
      password,
      tenantSlug,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    if (!result.success || !result.token) {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: result.session
    });

    // Set secure httpOnly cookie (Point 6)
    response.cookies.set({
      name: SessionService.getCookieName(),
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error en autenticación'
    }, { status: 500 });
  }
}
