import { NextRequest, NextResponse } from 'next/server';
import { ApplicationService } from '@/lib/services/application.service';
import { AuditService } from '@/lib/services/audit.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'SUPER_ADMIN');
    if (!auth.success) {
      return auth.response;
    }

    const { id } = await params;
    const app = await ApplicationService.getById(id);

    if (!app) {
      return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ application: app });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando aplicación' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'SUPER_ADMIN');
    if (!auth.success) {
      return auth.response;
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await ApplicationService.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 });
    }

    const updated = await ApplicationService.update(id, {
      name: body.name,
      key: body.key,
      slug: body.slug,
      description: body.description,
      category: body.category,
      icon: body.icon,
      version: body.version,
      status: body.status,
      modules: body.modules
    });

    if (!updated) {
      return NextResponse.json({ error: 'No se pudo actualizar la aplicación' }, { status: 400 });
    }

    AuditService.log({
      action: 'APPLICATION_UPDATED',
      entity: 'Application',
      entityId: id,
      userId: auth.context.session?.userId,
      details: {
        name: updated.name,
        key: updated.key,
        modulesCount: updated.modules.length
      }
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: error?.message || 'Error actualizando aplicación en PostgreSQL' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'SUPER_ADMIN');
    if (!auth.success) {
      return auth.response;
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await ApplicationService.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 });
    }

    const targetStatus = body.status as ('ACTIVE' | 'INACTIVE') | undefined;
    const updated = await ApplicationService.toggleStatus(id, targetStatus);

    if (!updated) {
      return NextResponse.json({ error: 'No se pudo cambiar el estado' }, { status: 400 });
    }

    AuditService.log({
      action: updated.status === 'ACTIVE' ? 'APPLICATION_ACTIVATED' : 'APPLICATION_DEACTIVATED',
      entity: 'Application',
      entityId: id,
      userId: auth.context.session?.userId,
      details: {
        status: updated.status,
        key: updated.key
      }
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error cambiando estado de aplicación' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'SUPER_ADMIN');
    if (!auth.success) {
      return auth.response;
    }

    const { id } = await params;
    const existing = await ApplicationService.getById(id);

    if (!existing) {
      return NextResponse.json({ error: 'Aplicación no encontrada' }, { status: 404 });
    }

    const success = await ApplicationService.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'No se pudo eliminar la aplicación' }, { status: 500 });
    }

    AuditService.log({
      action: 'APPLICATION_DELETED',
      entity: 'Application',
      entityId: id,
      userId: auth.context.session?.userId,
      details: {
        deletedKey: existing.key,
        deletedName: existing.name
      }
    });

    return NextResponse.json({ success: true, message: 'Aplicación eliminada de PostgreSQL exitosamente' });
  } catch (error: any) {
    console.error('Error deleting application:', error);
    return NextResponse.json(
      { error: error?.message || 'Error eliminando aplicación' },
      { status: 500 }
    );
  }
}
