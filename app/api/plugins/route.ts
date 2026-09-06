import { NextRequest, NextResponse } from 'next/server';
import { PluginService } from '@/lib/services/plugin.service';
import { PluginManifestSchema } from '@/lib/validators';

export async function GET() {
  const plugins = PluginService.getAllPlugins();
  return NextResponse.json({ success: true, plugins });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
