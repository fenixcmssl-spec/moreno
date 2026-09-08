import { NextRequest, NextResponse } from 'next/server';
import { ApplicationService } from '@/lib/services/application.service';
import { AuditService } from '@/lib/services/audit.service';

export async function GET() {
  try {
    const apps = ApplicationService.getAll();
    return NextResponse.json({ applications: apps });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando aplicaciones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, key, description, category, icon, version, modules } = body;

    if (!name || !key) {
      return NextResponse.json({ error: 'Nombre y clave de aplicación requeridos' }, { status: 400 });
    }

    const app = ApplicationService.create({
      name,
      key: key.toUpperCase(),
      slug: key.toLowerCase(),
      description: description || '',
      category: category || 'General',
      icon: icon || 'Box',
      version: version || '1.0.0',
      status: 'ACTIVE',
      modules: modules || []
    });

    AuditService.log({
      action: 'APPLICATION_CREATED',
      entity: 'Application',
      entityId: app.id,
      details: { name, key: app.key }
    });

    return NextResponse.json({ success: true, application: app }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando aplicación' }, { status: 500 });
  }
}
