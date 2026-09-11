import { NextRequest, NextResponse } from 'next/server';
import { ApplicationService } from '@/lib/services/application.service';
import { AuditService } from '@/lib/services/audit.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const isPublic = url.searchParams.get('public') === 'true';

    // If not explicitly requesting public catalogue, ensure Super Admin access
    if (!isPublic) {
      const auth = await TenantContextHelper.requireTenantRole(req, 'SUPER_ADMIN');
      if (!auth.success) {
        // Fallback for public checkout/provisioning or return error
        const apps = await ApplicationService.getAll({ status: 'ACTIVE', search });
        return NextResponse.json({ applications: apps, isPublicFallback: true });
      }
    }

    const apps = await ApplicationService.getAll({ status, search });
    return NextResponse.json({ applications: apps });
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: error?.message || 'Error cargando aplicaciones desde la base de datos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validate SUPER_ADMIN role
    const auth = await TenantContextHelper.requireTenantRole(req, 'SUPER_ADMIN');
    if (!auth.success) {
      return auth.response;
    }

    const body = await req.json();
    const { key, name, slug, description, category, icon, version, status, modules } = body;

    if (!name || !key) {
      return NextResponse.json(
        { error: 'El nombre y la clave única (key) de la aplicación son requeridos.' },
        { status: 400 }
      );
    }

    // 2. Check if application key or slug already exists
    const existingKey = await ApplicationService.getByKey(key);
    if (existingKey) {
      return NextResponse.json(
        { error: `Ya existe una aplicación con la clave ${key.toUpperCase()}.` },
        { status: 409 }
      );
    }

    // 3. Create application with defined available modules in PostgreSQL
    const app = await ApplicationService.create({
      key,
      name,
      slug,
      description,
      category,
      icon,
      version,
      status: status || 'ACTIVE',
      modules: Array.isArray(modules) ? modules : []
    });

    // 4. Audit log
    AuditService.log({
      action: 'APPLICATION_CREATED',
      entity: 'Application',
      entityId: app.id,
      userId: auth.context.session?.userId,
      details: {
        name: app.name,
        key: app.key,
        modulesCount: app.modules.length
      }
    });

    return NextResponse.json({ success: true, application: app }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: error?.message || 'Error creando la aplicación en PostgreSQL' },
      { status: 500 }
    );
  }
}
