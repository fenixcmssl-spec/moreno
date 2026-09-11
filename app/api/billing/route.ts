import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { EntitlementService } from '@/lib/services/entitlement.service';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { LicenseService } from '@/lib/services/license.service';
import { InvoiceService } from '@/lib/services/invoice.service';
import { PaymentService } from '@/lib/services/payment.service';
import { INITIAL_PLANS } from '@/lib/initialData';

export async function GET(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenant(req);
    if (!auth.success) {
      return auth.response;
    }

    const { tenant } = auth.context;

    const entitlements = await EntitlementService.getEffectiveEntitlements(tenant.id);
    const subscription = SubscriptionService.getByTenantId(tenant.id);
    const license = LicenseService.getByTenantId(tenant.id) || LicenseService.getByLicenseKey(tenant.licenseKey || '');
    const invoices = await InvoiceService.getInvoices({ tenantId: tenant.id });
    const payments = await PaymentService.getSaaSPayments({ tenantId: tenant.id });

    const currentPlan = INITIAL_PLANS.find(p => p.id === tenant.planId) || INITIAL_PLANS[0];

    const usage = {
      products: {
        current: await EntitlementService.getUsage(tenant.id, 'products.max'),
        limit: await EntitlementService.limit(tenant.id, 'products.max'),
        remaining: await EntitlementService.remaining(tenant.id, 'products.max')
      },
      storage_mb: {
        current: await EntitlementService.getUsage(tenant.id, 'storage.max_mb'),
        limit: await EntitlementService.limit(tenant.id, 'storage.max_mb'),
        remaining: await EntitlementService.remaining(tenant.id, 'storage.max_mb')
      },
      domains: {
        current: await EntitlementService.getUsage(tenant.id, 'domains.max'),
        limit: await EntitlementService.limit(tenant.id, 'domains.max'),
        remaining: await EntitlementService.remaining(tenant.id, 'domains.max')
      },
      users: {
        current: await EntitlementService.getUsage(tenant.id, 'users.max'),
        limit: await EntitlementService.limit(tenant.id, 'users.max'),
        remaining: await EntitlementService.remaining(tenant.id, 'users.max')
      }
    };

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      tenantName: tenant.name,
      plan: currentPlan,
      subscription: subscription || null,
      license: license || null,
      entitlements,
      usage,
      invoices,
      payments,
      availablePlans: INITIAL_PLANS
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando datos de facturación' }, { status: 500 });
  }
}
