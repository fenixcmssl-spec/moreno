import { NextRequest, NextResponse } from 'next/server';
import { ThemeService } from '@/lib/services/theme.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenant(req);
    if (!auth.success) {
      return auth.response;
    }

    const { tenant } = auth.context;
    const themes = ThemeService.getAllThemes();
    const activeThemeId = ThemeService.getActiveThemeId(tenant.id);
    const draft = ThemeService.getDraft(tenant.id);

    return NextResponse.json({
      success: true,
      themes,
      activeThemeId,
      draft,
      tenantId: tenant.id
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando temas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, themeId, draft } = body;

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;

    if (action === 'setActive') {
      if (!themeId) {
        return NextResponse.json({ success: false, error: 'themeId requerido' }, { status: 400 });
      }
      const success = ThemeService.setActiveTheme(tenant.id, themeId);
      AuditService.log({
        tenantId: tenant.id,
        userId: session?.userId,
        userEmail: session?.email,
        action: 'THEME_ACTIVATED',
        entity: 'Theme',
        entityId: themeId
      });
      return NextResponse.json({ success });
    }

    if (action === 'saveDraft') {
      const saved = ThemeService.saveDraft(tenant.id, draft);
      return NextResponse.json({ success: true, draft: saved });
    }

    if (action === 'publish') {
      const result = ThemeService.publishDraft(tenant.id);
      AuditService.log({
        tenantId: tenant.id,
        userId: session?.userId,
        userEmail: session?.email,
        action: 'THEME_PUBLISHED',
        entity: 'Theme',
        details: { publishedAt: new Date().toISOString() }
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Acción no reconocida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
