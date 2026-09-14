import { NextRequest, NextResponse } from 'next/server';
import { PluginService } from '@/lib/services/plugin.service';
import { PluginManifestSchema } from '@/lib/validators';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';
import { SecurityService } from '@/lib/security/security.service';

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
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const [plugins, installations] = await Promise.all([
      PluginService.getAllPlugins({ category, search }),
      PluginService.getTenantInstallations(tenant.id)
    ]);

    const installationMap = new Map(installations.map(inst => [inst.pluginId, inst]));

    // Enrich with tenant-specific active status and settings from PostgreSQL
    const tenantPlugins = plugins.map(p => {
      const inst = installationMap.get(p.id);
      return {
        ...p,
        isActiveForTenant: inst ? inst.status === 'ACTIVE' : (p.isEnabled ?? false),
        tenantSettings: inst ? inst.config : p.config
      };
    });

    return NextResponse.json({
      success: true,
      plugins: tenantPlugins,
      installations,
      tenantId: tenant.id
    });
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

      const toggleResult = await PluginService.togglePluginForTenant(
        tenant.id,
        pluginId,
        enable !== undefined ? Boolean(enable) : undefined
      );

      AuditService.log({
        tenantId: tenant.id,
        userId: session?.userId,
        userEmail: session?.email,
        action: toggleResult.isEnabled ? 'PLUGIN_ENABLED' : 'PLUGIN_DISABLED',
        entity: 'Plugin',
        entityId: pluginId
      });

      return NextResponse.json({
        success: toggleResult.success,
        pluginId,
        enabled: toggleResult.isEnabled
      });
    }

    if (body.action === 'updateConfig') {
      const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN', {
        targetTenantId: body.tenantId
      });

      if (!auth.success) {
        return auth.response;
      }

      const { tenant } = auth.context;
      const { pluginId, settings } = body;

      if (!pluginId || !settings) {
        return NextResponse.json({ success: false, error: 'pluginId y settings requeridos' }, { status: 400 });
      }

      const updated = await PluginService.updatePluginConfig(tenant.id, pluginId, settings);
      return NextResponse.json({ success: updated, pluginId, settings });
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

    const result = await PluginService.createPlugin(validated.data as any, {
      tenantId: auth.context.tenant.id
    });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

