import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { InvoiceService } from '@/lib/services/invoice.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedTenantId = searchParams.get('tenantId');

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN', {
      targetTenantId: requestedTenantId || undefined
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, isSuperAdmin } = auth.context;

    if (isSuperAdmin && searchParams.get('all') === 'true') {
      const allInvoices = await InvoiceService.getInvoices();
      return NextResponse.json({ invoices: allInvoices });
    }

    const invoices = await InvoiceService.getInvoices({ tenantId: tenant.id });
    return NextResponse.json({ invoices, tenantId: tenant.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando facturas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency = 'EUR', items, billingDetails, subscriptionId, paymentId } = body;

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant } = auth.context;

    if (!amount) {
      return NextResponse.json({ error: 'amount requerido' }, { status: 400 });
    }

    const newInvoice = await InvoiceService.createInvoice({
      tenantId: tenant.id,
      subscriptionId,
      paymentId,
      total: Number(amount),
      currency,
      status: 'PAID',
      billingName: billingDetails?.name || tenant.name,
      billingEmail: billingDetails?.email || tenant.ownerEmail,
      billingAddress: billingDetails?.address ? { address: billingDetails.address, taxId: billingDetails?.taxId } : undefined,
      items: items || [{ description: 'Suscripción FenixCMS', quantity: 1, unitPrice: Number(amount), total: Number(amount) }]
    });

    return NextResponse.json({ success: true, invoice: newInvoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error generando factura' }, { status: 500 });
  }
}
