import { NextRequest, NextResponse } from 'next/server';
import { PluginService } from '@/lib/services/plugin.service';
import { PluginManifestSchema } from '@/lib/validators';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenant(req);
    if (!auth.success) {
      return auth.response;
    }

    // Entitlement Check: plugins.enabled
    const entitlementCheck = await TenantContextHelper.requireEntitlement(auth.context, 'plugins.enabled');
    if (!entitlementCheck.success) {
      return entitlementCheck.response;
    }

    const { tenant } = auth.context;
    const plugins = PluginService.getAllPlugins();
    
    // Enrich with tenant-specific active status
    const tenantPlugins = plugins.map(p => ({
      ...p,
      isActiveForTenant: tenant.activePlugins?.includes(p.id) ?? false
    }));

    return NextResponse.json({ success: true, plugins: tenantPlugins, tenantId: tenant.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error listando plugins' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'toggle') {
      const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN', {
        targetTenantId: body.tenantId
      });

      if (!auth.success) {
        return auth.response;
      }

      // Entitlement Check: plugins.enabled
      const entitlementCheck = await TenantContextHelper.requireEntitlement(auth.context, 'plugins.enabled');
      if (!entitlementCheck.success) {
        return entitlementCheck.response;
      }

      const { tenant, session } = auth.context;
      const { pluginId, enable } = body;

      if (!pluginId) {
        return NextResponse.json({ success: false, error: 'pluginId requerido' }, { status: 400 });
      }

      AuditService.log({
        tenantId: tenant.id,
        userId: session?.userId,
        userEmail: session?.email,
        action: enable ? 'PLUGIN_ENABLED' : 'PLUGIN_DISABLED',
        entity: 'Plugin',
        entityId: pluginId
      });

      return NextResponse.json({ success: true, pluginId, enabled: Boolean(enable) });
    }

    // Global plugin installation/creation requires Super Admin
    const auth = await TenantContextHelper.requireTenantRole(req, 'SUPER_ADMIN');
    if (!auth.success) {
      return auth.response;
    }

    // Security check against unsafe code execution (eval, child_process, dangerous tokens)
    const securityCheck = SecurityService.validatePluginManifest(body);
    if (!securityCheck.valid) {
      return NextResponse.json({
        success: false,
        error: 'El plugin no superó la auditoría de seguridad del sandbox',
        issues: securityCheck.errors
      }, { status: 400 });
    }

    const validated = PluginManifestSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({
        success: false,
        error: 'Manifiesto de plugin inválido',
        issues: validated.error.issues
      }, { status: 400 });
    }

    const result = PluginService.createPlugin(validated.data as any);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
