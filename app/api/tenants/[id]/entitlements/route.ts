import { NextRequest, NextResponse } from 'next/server';
import { EntitlementService } from '@/lib/services/entitlement.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const feature = searchParams.get('feature');
    const resource = searchParams.get('resource');

    // If querying a single feature: can(tenant, feature)
    if (feature) {
      const allowed = await EntitlementService.can(id, feature);
      return NextResponse.json({ tenantId: id, feature, allowed });
    }

    // If querying a single resource: limit(tenant, resource) & remaining(tenant, resource)
    if (resource) {
      const check = await EntitlementService.checkResource(id, resource);
      return NextResponse.json({ tenantId: id, ...check });
    }

    // Return full effective entitlements
    const effective = await EntitlementService.getEffectiveEntitlements(id);
    
    // Enrich with live usage and remaining values for common resources
    const resourceUsage: Record<string, { current: number; limit: number; remaining: number }> = {};
    const keyResources = ['products', 'orders', 'users', 'domains', 'storage', 'posts', 'ads', 'plugins'];

    await Promise.all(
      keyResources.map(async (r) => {
        const check = await EntitlementService.checkResource(id, r);
        resourceUsage[r] = {
          current: check.current,
          limit: check.limit,
          remaining: check.remaining
        };
      })
    );

    return NextResponse.json({
      success: true,
      entitlements: effective,
      usage: resourceUsage
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error consultando entitlements del tenant' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const { key, value, remove } = body;

    // Super Admin or Owner role required for overrides
    const auth = await TenantContextHelper.requireTenantRole(req, 'OWNER', {
      targetTenantId: id
    });

    if (!auth.success) {
      return auth.response;
    }

    if (!key) {
      return NextResponse.json({ error: 'La clave de entitlement (key) es obligatoria' }, { status: 400 });
    }

    if (remove) {
      await EntitlementService.removeOverride(id, key);
      AuditService.log('ENTITLEMENT_OVERRIDE_REMOVED', 'Tenant', { tenantId: id, key });
      return NextResponse.json({
        success: true,
        message: `Override para '${key}' eliminado correctamente.`
      });
    }

    if (value === undefined) {
      return NextResponse.json({ error: 'El valor de override es obligatorio' }, { status: 400 });
    }

    await EntitlementService.setOverride(id, key, value);
    AuditService.log('ENTITLEMENT_OVERRIDE_SET', 'Tenant', { tenantId: id, key, value });

    const updatedEffective = await EntitlementService.getEffectiveEntitlements(id);

    return NextResponse.json({
      success: true,
      message: `Override '${key}' = ${JSON.stringify(value)} aplicado al tenant con éxito.`,
      entitlements: updatedEffective
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error modificando override de entitlement' },
      { status: 500 }
    );
  }
}
