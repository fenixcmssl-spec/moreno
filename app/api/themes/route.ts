import { NextRequest, NextResponse } from 'next/server';
import { ThemeService } from '@/lib/services/theme.service';
import { ThemeBuilderConfigSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || 'tenant_1';
  const themes = ThemeService.getAllThemes();
  const activeThemeId = ThemeService.getActiveThemeId(tenantId);
  const draft = ThemeService.getDraft(tenantId);

  return NextResponse.json({
    success: true,
    themes,
    activeThemeId,
    draft
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, tenantId, themeId, draft } = body;

    if (action === 'setActive') {
      const success = ThemeService.setActiveTheme(tenantId, themeId);
      return NextResponse.json({ success });
    }

    if (action === 'saveDraft') {
      const saved = ThemeService.saveDraft(tenantId, draft);
      return NextResponse.json({ success: true, draft: saved });
    }

    if (action === 'publish') {
      const result = ThemeService.publishDraft(tenantId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Acción no reconocida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
