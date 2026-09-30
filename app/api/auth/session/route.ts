import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/session';
import { AuthService } from '@/lib/services/auth.service';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SessionService.getCookieName())?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false, session: null }, { status: 401 });
    }

    const session = await SessionService.getSession(token);
    if (!session) {
      return NextResponse.json({ authenticated: false, session: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      session
    });
  } catch (error: any) {
    return NextResponse.json({
      authenticated: false,
      error: error?.message || 'Error validando sesión'
    }, { status: 500 });
  }
}
