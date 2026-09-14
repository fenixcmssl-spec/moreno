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
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;

    const themes = await ThemeService.getAllThemes({ search });
    const activeThemeId = await ThemeService.getActiveThemeId(tenant.id);
    const draft = await ThemeService.getDraft(tenant.id);

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
    const { action, themeId, draft, themeData } = body;

    // Creation of a global theme in the catalog requires SUPER_ADMIN
    if (action === 'createTheme' || themeData) {
      const authSuper = await TenantContextHelper.requireTenantRole(req, 'SUPER_ADMIN');
      if (!authSuper.success) {
        return authSuper.response;
      }

      const createdTheme = await ThemeService.createTheme({
        tenantId: authSuper.context.tenant.id,
        ...(themeData || body)
      });

      return NextResponse.json({ success: true, theme: createdTheme }, { status: 201 });
    }

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
      const success = await ThemeService.setActiveTheme(tenant.id, themeId);
      if (!success) {
        return NextResponse.json({ success: false, error: 'No se pudo activar el tema especificado' }, { status: 404 });
      }

      AuditService.log({
        tenantId: tenant.id,
        userId: session?.userId,
        userEmail: session?.email,
        action: 'THEME_ACTIVATED',
        entity: 'Theme',
        entityId: themeId
      });
      return NextResponse.json({ success: true, activeThemeId: themeId });
    }

    if (action === 'saveDraft') {
      const saved = await ThemeService.saveDraft(tenant.id, draft || themeId);
      return NextResponse.json({ success: true, draft: saved });
    }

    if (action === 'publish') {
      const result = await ThemeService.publishDraft(tenant.id, themeId);
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

