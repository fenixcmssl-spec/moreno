import { NextRequest, NextResponse } from 'next/server';
import { AiService } from '@/lib/services/ai.service';
import { EntitlementService } from '@/lib/services/entitlement.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { TenantService } from '@/lib/services/tenant.service';

/**
 * =========================================================================
 * POST /api/blog/ai-generate
 * =========================================================================
 * AI-Powered Blog Article Generator using Google Gemini
 * Enforces multi-tenant isolation, session validation, and plan entitlements.
 * =========================================================================
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, tone, keywords, locale, category } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El título o tema del artículo es obligatorio.' },
        { status: 400 }
      );
    }

    // 1. Resolve Tenant Context (from session, auth header, or tenant query/body)
    let tenantId = body.tenantId;
    let merchantName = 'Fénix Store';

    const session = await TenantContextHelper.getSessionFromRequest(req);
    if (session) {
      const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
      if (!auth.success) return auth.response;
      tenantId = auth.context.tenant.id;
      merchantName = auth.context.tenant.name;
    } else if (tenantId) {
      const tenantRecord = await TenantService.getById(tenantId);
      if (!tenantRecord) {
        return NextResponse.json(
          { success: false, error: 'Comercio no encontrado.' },
          { status: 404 }
        );
      }
      merchantName = tenantRecord.name;
    } else {
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      if (!publicContext) {
        return NextResponse.json(
          { success: false, error: 'No se pudo identificar el comercio para la solicitud.' },
          { status: 400 }
        );
      }
      tenantId = publicContext.tenant.id;
      merchantName = publicContext.tenant.name;
    }

    // 2. Enforce AI Entitlements (Deny by default if plan does not include AI or is suspended)
    try {
      await EntitlementService.assertCanUseAi(tenantId);
    } catch (entitlementError: any) {
      return NextResponse.json(
        {
          success: false,
          error: entitlementError.message || 'Tu plan actual no incluye funciones de Inteligencia Artificial.',
          code: entitlementError.code || 'AI_ENTITLEMENT_REQUIRED',
          upgradeRequired: true,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // 3. Generate structured article with Gemini
    const article = await AiService.generateBlogArticle({
      title: title.trim(),
      tone: tone || 'profesional, educativo y persuasivo',
      keywords: keywords || [],
      locale: locale || 'es',
      category: category || 'Guías y Consejos',
      merchantName,
    });

    return NextResponse.json({
      success: true,
      article,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: AiService.DEFAULT_TEXT_MODEL,
        tenantId,
      },
    });
  } catch (error: any) {
    console.error('Error generating AI blog article:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error al generar el artículo con Inteligencia Artificial.',
      },
      { status: error?.statusCode || 500 }
    );
  }
}
