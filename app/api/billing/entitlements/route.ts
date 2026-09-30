import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { EntitlementService } from '@/lib/services/entitlement.service';

export async function GET(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenant(req);
    if (!auth.success) {
      return auth.response;
    }

    const { tenant } = auth.context;
    const effective = await EntitlementService.getEffectiveEntitlements(tenant.id);

    // Current live usage count
    const usage = {
      products: await EntitlementService.getUsage(tenant.id, 'products.max'),
      orders: await EntitlementService.getUsage(tenant.id, 'orders.max'),
      users: await EntitlementService.getUsage(tenant.id, 'users.max'),
      domains: await EntitlementService.getUsage(tenant.id, 'domains.max'),
      storage_mb: await EntitlementService.getUsage(tenant.id, 'storage.max_mb'),
      blog_posts: await EntitlementService.getUsage(tenant.id, 'blog.posts_max'),
      ads: await EntitlementService.getUsage(tenant.id, 'classifieds.ads_max'),
      plugins: await EntitlementService.getUsage(tenant.id, 'plugins.max')
    };

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      entitlements: effective,
      usage
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando entitlements' }, { status: 500 });
  }
}
