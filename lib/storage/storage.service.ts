import crypto from 'crypto';

export interface MediaFileItem {
  id: string;
  tenantId: string;
  filename: string;
  storageKey: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  checksum: string;
  createdBy: string;
  createdAt: string;
}

const MEDIA_STORE = new Map<string, MediaFileItem[]>();

// Pre-seeded high quality media assets
const INITIAL_MEDIA_FILES: MediaFileItem[] = [
  {
    id: 'med_logo_fenix',
    tenantId: 'tenant_1',
    filename: 'fenix-brand-logo.png',
    storageKey: 'tenants/tenant_1/branding/logo.png',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    mimeType: 'image/png',
    size: 142800,
    width: 600,
    height: 600,
    alt: 'Logo Oficial Fenix',
    checksum: 'a9f24b819c9e',
    createdBy: 'admin@fenix.com',
    createdAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 'med_banner_hero',
    tenantId: 'tenant_1',
    filename: 'summer-collection-banner.webp',
    storageKey: 'tenants/tenant_1/banners/hero_summer.webp',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80',
    mimeType: 'image/webp',
    size: 345000,
    width: 1600,
    height: 800,
    alt: 'Banner Colección Verano',
    checksum: 'c4e912ab78f0',
    createdBy: 'admin@fenix.com',
    createdAt: '2026-08-05T14:30:00Z'
  },
  {
    id: 'med_product_watch',
    tenantId: 'tenant_1',
    filename: 'smartwatch-ultra-titanium.jpg',
    storageKey: 'tenants/tenant_1/products/smartwatch.jpg',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    mimeType: 'image/jpeg',
    size: 198000,
    width: 800,
    height: 800,
    alt: 'Reloj Inteligente Titanio',
    checksum: '99bf034e81a3',
    createdBy: 'admin@fenix.com',
    createdAt: '2026-08-10T12:00:00Z'
  }
];

export class StorageService {
  private static ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'application/zip',
    'application/pdf'
  ];

  private static MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

  /**
   * Uploads and registers a new media item
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
  }): Promise<{ success: boolean; file?: MediaFileItem; error?: string }> {
    if (!this.ALLOWED_MIME_TYPES.includes(params.mimeType)) {
      return { success: false, error: `Tipo de archivo no permitido: ${params.mimeType}` };
    }

    if (params.size > this.MAX_FILE_SIZE_BYTES) {
      return { success: false, error: 'El archivo excede el límite máximo de 15MB' };
    }

    const checksum = crypto.createHash('sha256').update(params.filename + Date.now()).digest('hex').slice(0, 16);
    const storageKey = `tenants/${params.tenantId}/uploads/${Date.now()}_${params.filename.replace(/\s+/g, '_')}`;

    const newFile: MediaFileItem = {
      id: `med_${Date.now()}`,
      tenantId: params.tenantId,
      filename: params.filename,
      storageKey,
      url: params.url || `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80`,
      mimeType: params.mimeType,
      size: params.size,
      width: 800,
      height: 600,
      alt: params.alt || params.filename,
      checksum,
      createdBy: params.createdBy || 'Sistema',
      createdAt: new Date().toISOString()
    };

    const currentFiles = this.getTenantMedia(params.tenantId);
    MEDIA_STORE.set(params.tenantId, [newFile, ...currentFiles]);

    return { success: true, file: newFile };
  }

  /**
   * Retrieves media files for a tenant
   */
  static getTenantMedia(tenantId: string): MediaFileItem[] {
    if (!MEDIA_STORE.has(tenantId)) {
      MEDIA_STORE.set(tenantId, [...INITIAL_MEDIA_FILES]);
    }
    return MEDIA_STORE.get(tenantId) || [];
  }

  /**
   * Deletes a media file by id
   */
  static deleteFile(tenantId: string, fileId: string): boolean {
    const files = this.getTenantMedia(tenantId);
    const filtered = files.filter(f => f.id !== fileId);
    MEDIA_STORE.set(tenantId, filtered);
    return true;
  }
}
