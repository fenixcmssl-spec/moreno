import { NextRequest, NextResponse } from 'next/server';
import { InvoiceItem } from '@/types';
import { AuditService } from '@/lib/services/audit.service';

let invoicesDb: InvoiceItem[] = [
  {
    id: 'inv_1001',
    invoiceNumber: 'FNX-2026-0001',
    tenantId: 'tenant_1',
    amount: 29.00,
    currency: 'EUR',
    status: 'PAID',
    issuedAt: '2026-01-01T10:00:00Z',
    paidAt: '2026-01-01T10:05:00Z',
    items: [{ description: 'Suscripción Fenix Pro E-commerce (Mensual)', quantity: 1, unitPrice: 29.00, total: 29.00 }],
    billingDetails: { name: 'Comercio Demo S.L.', email: 'demo@fenixcms.es', address: 'Calle Gran Vía 28, Madrid', taxId: 'B-12345678' }
  },
  {
    id: 'inv_1002',
    invoiceNumber: 'FNX-2026-0002',
    tenantId: 'tenant_2',
    amount: 790.00,
    currency: 'EUR',
    status: 'PAID',
    issuedAt: '2026-01-02T12:00:00Z',
    paidAt: '2026-01-02T12:03:00Z',
    items: [{ description: 'Suscripción Fenix Enterprise Multitienda (Anual)', quantity: 1, unitPrice: 790.00, total: 790.00 }],
    billingDetails: { name: 'TechTrends Global', email: 'owner@techtrends.com', address: 'Paseo de Gracia 100, Barcelona', taxId: 'B-87654321' }
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (tenantId) {
      const invoices = invoicesDb.filter(i => i.tenantId === tenantId);
      return NextResponse.json({ invoices });
    }

    return NextResponse.json({ invoices: invoicesDb });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando facturas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, amount, currency = 'EUR', items, billingDetails } = body;

    if (!tenantId || !amount) {
      return NextResponse.json({ error: 'tenantId y amount requeridos' }, { status: 400 });
    }

    const seq = invoicesDb.length + 1;
    const invNumber = `FNX-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

    const newInvoice: InvoiceItem = {
      id: `inv_${Date.now()}`,
      invoiceNumber: invNumber,
      tenantId,
      amount: Number(amount),
      currency,
      status: 'PAID',
      issuedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      items: items || [{ description: 'Suscripción FenixCMS', quantity: 1, unitPrice: amount, total: amount }],
      billingDetails: billingDetails || { name: 'Comercio', email: 'admin@tienda.es' }
    };

    invoicesDb.unshift(newInvoice);

    AuditService.log({
      tenantId,
      action: 'INVOICE_GENERATED',
      entity: 'Invoice',
      entityId: newInvoice.id,
      details: { invoiceNumber: invNumber, amount, currency }
    });

    return NextResponse.json({ success: true, invoice: newInvoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error generando factura' }, { status: 500 });
  }
}
