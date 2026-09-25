import { NextRequest, NextResponse } from 'next/server';
import { AiService } from '@/lib/services/ai.service';
import { EntitlementService } from '@/lib/services/entitlement.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { TenantService } from '@/lib/services/tenant.service';
import prisma, { isPostgresConfigured } from '@/lib/prisma';

/**
 * =========================================================================
 * POST /api/media/ai-alt
 * =========================================================================
 * AI-Powered Image Accessibility & SEO Alt Text Generator (Gemini Vision)
 * Generates concise (<10 words) descriptive alt tags for uploaded media.
 * =========================================================================
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, imageUrl, base64Data, filename, fileId, mediaId } = body;

    const targetUrl = url || imageUrl;

    if (!targetUrl && !base64Data) {
      return NextResponse.json(
        { success: false, error: 'Se requiere la URL o los datos en base64 de la imagen.' },
        { status: 400 }
      );
    }

    // 1. Resolve Tenant Context (from session, auth header, or tenant query/body)
    let tenantId = body.tenantId;

    const session = await TenantContextHelper.getSessionFromRequest(req);
    if (session) {
      const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
      if (!auth.success) return auth.response;
      tenantId = auth.context.tenant.id;
    } else if (tenantId) {
      const tenantRecord = await TenantService.getById(tenantId);
      if (!tenantRecord) {
        return NextResponse.json(
          { success: false, error: 'Comercio no encontrado.' },
          { status: 404 }
        );
      }
    } else {
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      if (!publicContext) {
        return NextResponse.json(
          { success: false, error: 'No se pudo identificar el comercio para la solicitud.' },
          { status: 400 }
        );
      }
      tenantId = publicContext.tenant.id;
    }

    // 2. Enforce AI Entitlements (Check if tenant has AI enabled & valid subscription)
    try {
      await EntitlementService.assertCanUseAi(tenantId);
    } catch (entitlementError: any) {
      return NextResponse.json(
        {
          success: false,
          error: entitlementError.message || 'Tu plan actual no incluye funciones de visión artificial con Gemini.',
          code: entitlementError.code || 'AI_ENTITLEMENT_REQUIRED',
          upgradeRequired: true,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // 3. Generate Alt text using Gemini Vision
    const altText = await AiService.generateImageAltText(
      targetUrl || base64Data,
      filename || 'producto.jpg'
    );

    // 4. Optionally persist the generated alt in PostgreSQL if a fileId/mediaId was provided
    const targetFileId = fileId || mediaId;
    if (targetFileId && isPostgresConfigured() && prisma?.mediaAsset) {
      try {
        await (prisma as any).mediaAsset.updateMany({
          where: {
            id: targetFileId,
            tenantId: tenantId,
          },
          data: {
            alt: altText,
          },
        });
      } catch (dbErr) {
        console.warn('Could not persist alt tag to database mediaAsset:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      alt: altText,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: AiService.DEFAULT_VISION_MODEL,
        tenantId,
        wordsCount: altText.split(/\s+/).filter(Boolean).length,
      },
    });
  } catch (error: any) {
    console.error('Error generating AI Alt text:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error al analizar la imagen con Inteligencia Artificial.',
      },
      { status: error?.statusCode || 500 }
    );
  }
}
