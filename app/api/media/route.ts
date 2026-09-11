import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage/storage.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';
import { SecurityService } from '@/lib/security/security.service';

export async function GET(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenant(req);
    if (!auth.success) {
      return auth.response;
    }

    const { tenant } = auth.context;
    const files = StorageService.getTenantMedia(tenant.id);
    return NextResponse.json({ success: true, files, tenantId: tenant.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando archivos multimedia' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = SecurityService.applyRateLimit(req, 20, 60, 'media_upload');
    if (rateLimit.limited && rateLimit.response) {
      return rateLimit.response;
    }

    const body = await req.json();
    const { filename, mimeType, size, url, alt } = body;

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    // 1. Strict File Security Validation (MIME check, extension whitelist, path traversal check)
    const fileValidation = SecurityService.validateFileUpload({
      name: filename || 'file.bin',
      type: mimeType || 'application/octet-stream',
      size: size || 1000
    });

    if (!fileValidation.valid) {
      return NextResponse.json({
        success: false,
        error: fileValidation.reason || 'Archivo rechazado por políticas de seguridad.'
      }, { status: 400 });
    }

    const safeFilename = fileValidation.sanitizedName || filename;
    const { tenant, session } = auth.context;

    // Entitlement Check: storage.max_mb
    const storageLimitCheck = await TenantContextHelper.requireEntitlement(auth.context, 'storage.max_mb', {
      increment: Math.ceil((size || 120000) / (1024 * 1024)) || 1
    });
    if (!storageLimitCheck.success) {
      return storageLimitCheck.response;
    }

    const result = await StorageService.uploadFile({
      tenantId: tenant.id,
      filename: safeFilename,
      mimeType,
      size: size || 120000,
      url,
      alt: SecurityService.sanitizeString(alt)
    });

    if (result.success) {
      AuditService.log({
        tenantId: tenant.id,
        userId: session?.userId,
        userEmail: session?.email,
        action: 'MEDIA_UPLOADED',
        entity: 'MediaAsset',
        entityId: result.file?.id,
        details: { filename, size }
      });
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId') || searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'fileId requerido' }, { status: 400 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;
    const success = StorageService.deleteFile(tenant.id, fileId);

    if (success) {
      AuditService.log({
        tenantId: tenant.id,
        userId: session?.userId,
        userEmail: session?.email,
        action: 'MEDIA_DELETED',
        entity: 'MediaAsset',
        entityId: fileId
      });
    }

    return NextResponse.json({ success, message: success ? 'Archivo eliminado' : 'Archivo no encontrado' }, { status: success ? 200 : 404 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
