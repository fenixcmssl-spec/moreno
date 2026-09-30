import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { AuthService } from '@/lib/services/auth.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const users = await SuperAdminService.getUsers();
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('API Error in GET /api/admin/users:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando usuarios desde PostgreSQL' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const body = await req.json();
    const { name, email, password, role, tenantId } = body;
    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Nombre, email y contraseña son requeridos' }, { status: 400 });
    }

    const result = await AuthService.register({
      name,
      email,
      password,
      role: role || 'STAFF',
      tenantId
    });

    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error: any) {
    console.error('API Error in POST /api/admin/users:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error creando usuario' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const body = await req.json();
    const { userId, role, status } = body;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId requerido' }, { status: 400 });
    }

    let okRole = true;
    let okStatus = true;

    if (role) {
      okRole = await SuperAdminService.updateUserRole(userId, role);
    }
    if (status) {
      okStatus = await SuperAdminService.updateUserStatus(userId, status);
    }

    return NextResponse.json({ success: okRole && okStatus });
  } catch (error: any) {
    console.error('API Error in PATCH /api/admin/users:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error actualizando usuario' }, { status: 500 });
  }
}
