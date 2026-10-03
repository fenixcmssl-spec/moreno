import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token de activación no proporcionado' },
        { status: 400 }
      );
    }

    const verification = await AuthService.verifyActivationToken(token);
    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Token inválido o expirado' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        email: verification.user.email,
        name: verification.user.name
      }
    });
  } catch (error: any) {
    console.error('Error verificando token de activación:', error);
    return NextResponse.json(
      { success: false, error: 'Error procesando la solicitud de activación' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token y nueva contraseña son obligatorios' },
        { status: 400 }
      );
    }

    const result = await AuthService.activateAccountWithToken(token, password);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'No se pudo activar la cuenta' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta activada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.',
      user: result.user
    });
  } catch (error: any) {
    console.error('Error activando cuenta:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno al activar la cuenta' },
      { status: 500 }
    );
  }
}
