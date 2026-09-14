import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { CustomerService } from '@/lib/services/customer.service';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedTenantId = searchParams.get('tenantId');
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: requestedTenantId || undefined
    });
    if (!auth.success) return auth.response;

    const { tenant } = auth.context;
    const { customers, total } = await CustomerService.listCustomers(tenant.id, {
      search,
      limit,
      offset
    });

    return NextResponse.json({
      customers,
      total,
      tenantId: tenant.id
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando clientes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;

    if (!body.email || !body.name) {
      return NextResponse.json({ error: 'Nombre y correo son requeridos' }, { status: 400 });
    }

    const customer = await CustomerService.createCustomer(tenant.id, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      address: body.address
    });

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'CUSTOMER_CREATED',
      entity: 'Customer',
      entityId: customer.id,
      details: { email: customer.email, name: customer.name }
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando cliente' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de cliente requerido' }, { status: 400 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;

    const updated = await CustomerService.updateCustomer(tenant.id, id, updates);

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'CUSTOMER_UPDATED',
      entity: 'Customer',
      entityId: id,
      details: { updatedFields: Object.keys(updates) }
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando cliente' }, { status: 500 });
  }
}
