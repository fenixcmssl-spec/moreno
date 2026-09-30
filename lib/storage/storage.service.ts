import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { SecurityService } from '@/lib/security/security.service';

export interface MediaFileItem {
  id: string;
  tenantId: string;
  filename: string;
  storageKey: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  checksum?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StorageUploadResult {
  url: string;
  storageKey: string;
  size: number;
  checksum: string;
}

export interface IStorageProvider {
  upload(params: {
    tenantId: string;
    filename: string;
    mimeType: string;
    size: number;
    bufferOrUrl?: string | Buffer;
  }): Promise<StorageUploadResult>;
  delete(storageKey: string): Promise<boolean>;
  getUrl(storageKey: string): string;
}

export class ManagedStorageProvider implements IStorageProvider {
  private cdnBaseUrl: string;

  constructor(cdnBaseUrl: string = process.env.STORAGE_CDN_URL || '/uploads') {
    this.cdnBaseUrl = cdnBaseUrl;
  }

  async upload(params: {
    tenantId: string;
    filename: string;
    mimeType: string;
    size: number;
    bufferOrUrl?: string | Buffer;
  }): Promise<StorageUploadResult> {
    const sanitizedFilename = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const storageKey = `tenants/${params.tenantId}/uploads/${timestamp}_${sanitizedFilename}`;

    const checksum = crypto
      .createHash('sha256')
      .update(params.filename + timestamp + params.size)
      .digest('hex')
      .slice(0, 16);

    let url = typeof params.bufferOrUrl === 'string' && params.bufferOrUrl.startsWith('http')
      ? params.bufferOrUrl
      : `${this.cdnBaseUrl}/${storageKey}`;

    return {
      url,
      storageKey,
      size: params.size,
      checksum
    };
  }

  async delete(storageKey: string): Promise<boolean> {
    return true;
  }

  getUrl(storageKey: string): string {
    return `${this.cdnBaseUrl}/${storageKey}`;
  }
}

export class StorageService {
  private static provider: IStorageProvider = new ManagedStorageProvider();

  private static ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/x-icon',
    'application/pdf',
    'application/zip',
    'text/csv',
    'application/json',
    'video/mp4',
    'video/webm'
  ];

  private static MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

  static setProvider(newProvider: IStorageProvider) {
    this.provider = newProvider;
  }

  /**
   * Uploads and registers a new media asset in PostgreSQL
   */
  static async uploadFile(params: {
    tenantId: string;
    filename: string;
    mimeType: string;
    size: number;
    base64Data?: string;
    alt?: string;
    createdBy?: string;
    url?: string;
    width?: number;
    height?: number;
  }): Promise<{ success: boolean; file?: MediaFileItem; error?: string }> {
    if (!params.tenantId) {
      return { success: false, error: 'tenantId es obligatorio para el aislamiento de datos' };
    }

    if (!this.ALLOWED_MIME_TYPES.includes(params.mimeType.toLowerCase())) {
      return { success: false, error: `Tipo de archivo no permitido: ${params.mimeType}` };
    }

    if (params.size > this.MAX_FILE_SIZE_BYTES) {
      return { success: false, error: 'El archivo excede el límite máximo de 15MB' };
    }

    // Security checks: path traversal & dangerous extension blacklist
    const validation = SecurityService.validateFileUpload({
      name: params.filename,
      type: params.mimeType,
      size: params.size
    });

    if (!validation.valid) {
      return { success: false, error: validation.reason || 'Archivo rechazado por seguridad' };
    }

    const safeFilename = validation.sanitizedName || params.filename;

    try {
      const uploadResult = await this.provider.upload({
        tenantId: params.tenantId,
        filename: safeFilename,
        mimeType: params.mimeType,
        size: params.size,
        bufferOrUrl: params.url || params.base64Data
      });

      const sanitizedAlt = params.alt ? SecurityService.sanitizeString(params.alt) : safeFilename;

      const created = await prisma.mediaAsset.create({
        data: {
          tenantId: params.tenantId,
          filename: safeFilename,
          url: uploadResult.url,
          storageKey: uploadResult.storageKey,
          mimeType: params.mimeType,
          size: params.size,
          width: params.width || 800,
          height: params.height || 600,
          alt: sanitizedAlt
        }
      });

      return {
        success: true,
        file: {
          id: created.id,
          tenantId: created.tenantId,
          filename: created.filename,
          storageKey: created.storageKey || uploadResult.storageKey,
          url: created.url,
          mimeType: created.mimeType,
          size: created.size,
          width: created.width,
          height: created.height,
          alt: created.alt,
          checksum: uploadResult.checksum,
          createdBy: params.createdBy || 'Sistema',
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Error guardando archivo multimedia en PostgreSQL'
      };
    }
  }

  /**
   * Retrieves media files for a tenant from PostgreSQL
   */
  static async getTenantMedia(
    tenantId: string,
    options?: { search?: string; type?: string; limit?: number; offset?: number }
  ): Promise<MediaFileItem[]> {
    if (!tenantId) return [];

    try {
      const whereClause: any = { tenantId };
      if (options?.search) {
        whereClause.filename = {
          contains: options.search,
          mode: 'insensitive'
        };
      }
      if (options?.type) {
        whereClause.mimeType = {
          startsWith: options.type,
          mode: 'insensitive'
        };
      }

      const records = await prisma.mediaAsset.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0
      });

      return (records || []).map((r: any) => ({
        id: r.id,
        tenantId: r.tenantId,
        filename: r.filename,
        storageKey: r.storageKey || '',
        url: r.url,
        mimeType: r.mimeType,
        size: r.size,
        width: r.width,
        height: r.height,
        alt: r.alt,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error(`[StorageService] Error fetching media for tenant ${tenantId}:`, error);
      return [];
    }
  }

  /**
   * Retrieves single media asset by id ensuring tenant isolation
   */
  static async getMediaById(tenantId: string, fileId: string): Promise<MediaFileItem | null> {
    if (!tenantId || !fileId) return null;

    try {
      const record = await prisma.mediaAsset.findFirst({
        where: { id: fileId, tenantId }
      });

      if (!record) return null;

      return {
        id: record.id,
        tenantId: record.tenantId,
        filename: record.filename,
        storageKey: record.storageKey || '',
        url: record.url,
        mimeType: record.mimeType,
        size: record.size,
        width: record.width,
        height: record.height,
        alt: record.alt,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Deletes a media file by id ensuring strict tenant isolation
   */
  static async deleteFile(tenantId: string, fileId: string): Promise<boolean> {
    if (!tenantId || !fileId) return false;

    try {
      const existing = await prisma.mediaAsset.findFirst({
        where: { id: fileId, tenantId }
      });

      if (!existing) return false;

      if (existing.storageKey) {
        await this.provider.delete(existing.storageKey);
      }

      await prisma.mediaAsset.delete({
        where: { id: existing.id }
      });

      return true;
    } catch (error) {
      console.error(`[StorageService] Error deleting media asset ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Updates media asset metadata (alt text, filename)
   */
  static async updateMedia(
    tenantId: string,
    fileId: string,
    updates: { alt?: string; filename?: string }
  ): Promise<MediaFileItem | null> {
    if (!tenantId || !fileId) return null;

    try {
      const existing = await prisma.mediaAsset.findFirst({
        where: { id: fileId, tenantId }
      });

      if (!existing) return null;

      const dataToUpdate: any = {};
      if (updates.alt !== undefined) {
        dataToUpdate.alt = SecurityService.sanitizeString(updates.alt);
      }
      if (updates.filename !== undefined) {
        dataToUpdate.filename = updates.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      }

      const updated = await prisma.mediaAsset.update({
        where: { id: fileId },
        data: dataToUpdate
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        filename: updated.filename,
        storageKey: updated.storageKey || '',
        url: updated.url,
        mimeType: updated.mimeType,
        size: updated.size,
        width: updated.width,
        height: updated.height,
        alt: updated.alt,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString()
      };
    } catch (error) {
      return null;
    }
  }
}
