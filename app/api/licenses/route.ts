import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/services/license.service';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const slug = searchParams.get('slug');

    if (tenantId) {
      const lic = LicenseService.getByTenantId(tenantId);
      return NextResponse.json({ license: lic || null });
    }

    if (slug) {
      const lic = LicenseService.getByTenantSlug(slug);
      return NextResponse.json({ license: lic || null });
    }

    const all = LicenseService.getAll();
    return NextResponse.json({ licenses: all });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error listando licencias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      applicationId = 'ECOMMERCE',
      planId,
      planName,
      customerName,
      customerEmail,
      tenantSlug,
      tenantName,
      price = 0,
      billingPeriod = 'monthly',
      paymentProvider = 'paypal',
      transactionId = `tx_${Date.now()}`,
      entitlements,
      maxProducts,
      maxStorageMb
    } = body;

    if (!tenantSlug || !customerEmail || !planId) {
      return NextResponse.json({ error: 'Campos requeridos incompletos' }, { status: 400 });
    }

    const { displayKey } = LicenseService.generateSecureLicenseKey(applicationId, planName || 'PRO', tenantSlug);
    const now = new Date();
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + (billingPeriod === 'yearly' ? 12 : 1));

    const newLicense = LicenseService.create({
      tenantId: tenantId || `tenant_${Date.now()}`,
      applicationId,
      planId,
      planName: planName || 'Professional',
      licenseKey: displayKey,
      status: 'active',
      customerName: customerName || 'Comerciante',
      customerEmail,
      tenantSlug: tenantSlug.toLowerCase(),
      tenantName: tenantName || tenantSlug,
      price,
      billingPeriod,
      paymentProvider,
      transactionId,
      validFrom: now.toISOString(),
      validTo: expiry.toISOString(),
      entitlements,
      maxProducts,
      maxStorageMb
    });

    AuditService.log({
      tenantId: newLicense.tenantId,
      action: 'LICENSE_CREATED',
      entity: 'License',
      entityId: newLicense.id,
      details: { licenseKey: displayKey, planId, applicationId }
    });

    return NextResponse.json({ success: true, license: newLicense }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando licencia' }, { status: 500 });
  }
}
