import { NextRequest, NextResponse } from 'next/server';
import { ApplicationService } from '@/lib/services/application.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'SUPER_ADMIN');
    if (!auth.success) {
      return auth.response;
    }

    const { id } = await params;
    const body = await req.json();
    const { key, name, description, isDefault } = body;

    if (!key || !name) {
      return NextResponse.json(
        { error: 'Clave y nombre del módulo son obligatorios.' },
        { status: 400 }
      );
    }

    const moduleDef = await ApplicationService.addModule(id, {
      key,
      name,
      description,
      isDefault
    });

    if (!moduleDef) {
      return NextResponse.json({ error: 'No se pudo añadir el módulo a la aplicación.' }, { status: 400 });
    }

    AuditService.log({
      action: 'APPLICATION_MODULE_ADDED',
      entity: 'ApplicationModule',
      entityId: moduleDef.id,
      userId: auth.context.session?.userId,
      details: { applicationId: id, moduleKey: key, moduleName: name }
    });

    return NextResponse.json({ success: true, module: moduleDef }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error añadiendo módulo a la aplicación' },
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
    const url = new URL(req.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Clave de módulo (key) requerida.' }, { status: 400 });
    }

    const success = await ApplicationService.deleteModule(id, key);
    if (!success) {
      return NextResponse.json({ error: 'No se pudo eliminar el módulo.' }, { status: 400 });
    }

    AuditService.log({
      action: 'APPLICATION_MODULE_DELETED',
      entity: 'ApplicationModule',
      userId: auth.context.session?.userId,
      details: { applicationId: id, moduleKey: key }
    });

    return NextResponse.json({ success: true, message: 'Módulo eliminado' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error eliminando módulo' },
      { status: 500 }
    );
  }
}
