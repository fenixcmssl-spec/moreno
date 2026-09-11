import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';
import { Customer } from '@/types';

let customersDb: Customer[] = [
  {
    id: 'cust_1',
    tenantId: 'tenant_1',
    name: 'Elena Ramos',
    email: 'elena@gmail.com',
    phone: '+34 600 111 222',
    ordersCount: 3,
    totalSpent: 420.50,
    createdAt: '2026-01-10T12:00:00Z'
  },
  {
    id: 'cust_2',
    tenantId: 'tenant_1',
    name: 'Javier Soler',
    email: 'javier@empresa.es',
    phone: '+34 611 333 444',
    ordersCount: 1,
    totalSpent: 89.90,
    createdAt: '2026-02-01T15:30:00Z'
  },
  {
    id: 'cust_3',
    tenantId: 'tenant_2',
    name: 'David Vance',
    email: 'david@techtrends.com',
    ordersCount: 5,
    totalSpent: 1250.00,
    createdAt: '2026-01-15T09:00:00Z'
  }
];

export async function GET(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
    if (!auth.success) return auth.response;

    const { tenant } = auth.context;
    const customers = customersDb.filter(c => c.tenantId === tenant.id);

    return NextResponse.json({ customers, total: customers.length, tenantId: tenant.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando clientes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;
    const body = await req.json();

    if (!body.email || !body.name) {
      return NextResponse.json({ error: 'Nombre y correo son requeridos' }, { status: 400 });
    }

    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      tenantId: tenant.id,
      name: body.name,
      email: body.email,
      phone: body.phone,
      ordersCount: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString()
    };

    customersDb.unshift(newCust);

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'CUSTOMER_CREATED',
      entity: 'Customer',
      entityId: newCust.id,
      details: { email: body.email }
    });

    return NextResponse.json({ success: true, customer: newCust }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando cliente' }, { status: 500 });
  }
}
