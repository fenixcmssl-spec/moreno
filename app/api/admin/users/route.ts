import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { AuthService } from '@/lib/services/auth.service';
import prisma from '@/lib/prisma';
import type { UserRole } from '@/lib/auth/rbac';
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

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: 'Solicitud JSON inválida' },
        { status: 400 }
      );
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const requestedRole = typeof body.role === 'string' ? body.role : 'STAFF';

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (
      name.length > 150 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { success: false, error: 'Nombre o correo electrónico no válido' },
        { status: 400 }
      );
    }

    if (password.length < 12 || password.length > 128) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe tener entre 12 y 128 caracteres' },
        { status: 400 }
      );
    }

    if (password !== password.trim()) {
      return NextResponse.json(
        { success: false, error: 'La contraseña no puede empezar ni terminar con espacios' },
        { status: 400 }
      );
    }

    const allowedRoles: UserRole[] = [
      'SUPER_ADMIN',
      'OWNER',
      'ADMIN',
      'MANAGER',
      'EDITOR',
      'STAFF',
      'CUSTOMER',
      'TENANT_OWNER',
      'TENANT_ADMIN',
    ];

    if (!allowedRoles.includes(requestedRole as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'El rol seleccionado no es válido' },
        { status: 400 }
      );
    }

    const assignedRole = requestedRole as UserRole;
    const tenantId = typeof body.tenantId === 'string'
      ? body.tenantId.trim()
      : '';

    if (
      body.tenantId !== undefined &&
      body.tenantId !== null &&
      typeof body.tenantId !== 'string'
    ) {
      return NextResponse.json(
        { success: false, error: 'El identificador de tienda no es válido' },
        { status: 400 }
      );
    }

    if (assignedRole === 'SUPER_ADMIN' && tenantId) {
      return NextResponse.json(
        { success: false, error: 'Una cuenta SUPER_ADMIN es global y no debe asociarse a una tienda' },
        { status: 400 }
      );
    }

    if (assignedRole !== 'SUPER_ADMIN' && !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Selecciona una tienda para este rol' },
        { status: 400 }
      );
    }

    let tenantSlug: string | undefined;

    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, slug: true, status: true },
      });

      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'La tienda seleccionada no existe' },
          { status: 400 }
        );
      }

      if (!['active', 'trial'].includes(String(tenant.status).toLowerCase())) {
        return NextResponse.json(
          { success: false, error: 'La tienda seleccionada no está activa ni en prueba' },
          { status: 400 }
        );
      }

      tenantSlug = tenant.slug;
    }

    const result = await AuthService.register({
      name,
      email,
      password,
      role: assignedRole,
      tenantId: tenantId || undefined,
      tenantSlug,
    });

    return NextResponse.json(result, {
      status: result.success ? 201 : 400,
    });
  } catch (error: any) {
    console.error('API Error in POST /api/admin/users:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error creando usuario' },
      { status: 500 }
    );
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
