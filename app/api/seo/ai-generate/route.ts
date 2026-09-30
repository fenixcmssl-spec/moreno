import { NextRequest, NextResponse } from 'next/server';
import { SeoAutomationService } from '@/lib/services/seo-automation.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, category, brand, price, siteName } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'El título es obligatorio para generar SEO.' },
        { status: 400 }
      );
    }

    const suggestions = SeoAutomationService.generateAiSeoSuggestions({
      title,
      description: description || '',
      category,
      brand,
      price: typeof price === 'number' ? price : undefined,
      siteName: siteName || 'Fenix Store'
    });

    return NextResponse.json({
      success: true,
      data: suggestions
    });
  } catch (error: any) {
    console.error('[SEO AI API] Error generating SEO suggestions:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno del generador SEO' },
      { status: 500 }
    );
  }
}
