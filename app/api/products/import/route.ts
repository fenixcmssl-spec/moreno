import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper, runWithTenant } from '@/lib/auth/tenantContext';
import { ProductService } from '@/lib/services/product.service';
import { AuditService } from '@/lib/services/audit.service';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const MAX_ROWS = 500;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

type ImportError = {
  row: number;
  sku?: string;
  message: string;
};

function parseImportNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  let normalized = value
    .trim()
    .replace(/\s/g, '')
    .replace(/[€$£]/g, '');

  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');

  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else if (comma >= 0) {
    normalized = normalized.replace(',', '.');
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function validImageUrl(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);

    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: 'La importación supera el límite de 2 MB.' },
        { status: 413 }
      );
    }

    let body: any;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'El cuerpo de la petición no contiene JSON válido.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body?.products) || body.products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Debes enviar una lista de productos.' },
        { status: 400 }
      );
    }

    if (body.products.length > MAX_ROWS) {
      return NextResponse.json(
        {
          success: false,
          error: `El máximo por lote es de ${MAX_ROWS} productos. Divide el catálogo en varios lotes.`
        },
        { status: 413 }
      );
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;
    const tenantId = tenant.id;

    return await runWithTenant(tenantId, async () => {

      const updateExistingBySku = body.updateExistingBySku === true;
      const createdProducts: any[] = [];
      const updatedProducts: any[] = [];
      const errors: ImportError[] = [];
      const seenSkus = new Set<string>();

      const initialCount = await (prisma as any).product.count({
        where: { tenantId }
      });

      let quotaReached = false;
      let quotaMessage = 'Se ha alcanzado el límite de productos del plan.';

      for (let index = 0; index < body.products.length; index++) {
        const row = body.products[index];
        const suppliedRow = Number(row?.sourceRow);
        const rowNumber = Number.isSafeInteger(suppliedRow) && suppliedRow >= 1
          ? suppliedRow
          : index + 2;

        let sku = '';

        try {
          if (!row || typeof row !== 'object' || Array.isArray(row)) {
            errors.push({ row: rowNumber, message: 'La fila no contiene un producto válido.' });
            continue;
          }

          const title = typeof row.title === 'string' ? row.title.trim() : '';
          sku = typeof row.sku === 'string' ? row.sku.trim() : '';

          if (!title || title.length > 300) {
            errors.push({
              row: rowNumber,
              sku: sku || undefined,
              message: 'El título es obligatorio y no puede superar 300 caracteres.'
            });
            continue;
          }

          if (sku.length > 100) {
            errors.push({
              row: rowNumber,
              sku,
              message: 'El SKU no puede superar 100 caracteres.'
            });
            continue;
          }

          const price = parseImportNumber(row.price);

          if (price === null || price < 0 || price > 100000000) {
            errors.push({
              row: rowNumber,
              sku: sku || undefined,
              message: 'El precio debe ser un número válido entre 0 y 100.000.000.'
            });
            continue;
          }

          const stock = parseImportNumber(row.stock);

          if (stock === null || !Number.isSafeInteger(stock) || stock < 0) {
            errors.push({
              row: rowNumber,
              sku: sku || undefined,
              message: 'El stock debe ser un número entero igual o superior a cero.'
            });
            continue;
          }

          let comparePrice: number | undefined;
          const compareValue = row.comparePrice ?? row.compareAtPrice;

          if (compareValue !== undefined && compareValue !== null && String(compareValue).trim() !== '') {
            const parsedCompare = parseImportNumber(compareValue);

            if (parsedCompare === null || parsedCompare < 0 || parsedCompare > 100000000) {
              errors.push({
                row: rowNumber,
                sku: sku || undefined,
                message: 'El precio anterior no es válido.'
              });
              continue;
            }

            comparePrice = parsedCompare;
          }

          const description = typeof row.description === 'string'
            ? row.description.trim()
            : undefined;

          if ((description?.length ?? 0) > 10000) {
            errors.push({
              row: rowNumber,
              sku: sku || undefined,
              message: 'La descripción supera el máximo de 10.000 caracteres.'
            });
            continue;
          }

          const category = typeof row.category === 'string' && row.category.trim()
            ? row.category.trim()
            : undefined;

          if ((category?.length ?? 0) > 120) {
            errors.push({
              row: rowNumber,
              sku: sku || undefined,
              message: 'La categoría no puede superar 120 caracteres.'
            });
            continue;
          }

          const imagesProvided = Array.isArray(row.images) ||
            (typeof row.image === 'string' && row.image.trim().length > 0);

          const imagesInput = Array.isArray(row.images)
            ? row.images
            : typeof row.image === 'string' && row.image.trim()
              ? [row.image.trim()]
              : [];

          if (imagesInput.length > 20 || imagesInput.some(
            (image: unknown) =>
              typeof image !== 'string' ||
              image.length > 2048 ||
              !validImageUrl(image)
          )) {
            errors.push({
              row: rowNumber,
              sku: sku || undefined,
              message: 'Hay imágenes con URL no válida. Solo se permiten URLs HTTP/HTTPS o rutas relativas seguras.'
            });
            continue;
          }

          const images = imagesInput as string[];

          let tags: string[] | undefined;

          if (Array.isArray(row.tags)) {
            if (row.tags.some((tag: unknown) => typeof tag !== 'string')) {
              errors.push({
                row: rowNumber,
                sku: sku || undefined,
                message: 'La lista de etiquetas contiene valores no válidos.'
              });
              continue;
            }

            tags = row.tags.map((tag: string) => tag.trim()).filter(Boolean);
          } else if (typeof row.tags === 'string' && row.tags.trim()) {
            tags = row.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
          }

          if (tags && (tags.length > 100 || tags.some(tag => tag.length > 100))) {
            errors.push({
              row: rowNumber,
              sku: sku || undefined,
              message: 'El número o la longitud de las etiquetas supera el límite permitido.'
            });
            continue;
          }

          const status = String(row.status || 'active').toLowerCase();

          if (!['active', 'draft'].includes(status)) {
            errors.push({
              row: rowNumber,
              sku: sku || undefined,
              message: 'El estado solo puede ser active o draft.'
            });
            continue;
          }

          if (sku) {
            const normalizedSku = sku.toLocaleLowerCase('en-US');

            if (seenSkus.has(normalizedSku)) {
              errors.push({
                row: rowNumber,
                sku,
                message: 'Este SKU está repetido dentro del archivo de importación.'
              });
              continue;
            }

            seenSkus.add(normalizedSku);
          }

          const existing = sku
            ? await (prisma as any).product.findFirst({
                where: {
                  tenantId,
                  sku: { equals: sku, mode: 'insensitive' }
                }
              })
            : null;

          if (existing && !updateExistingBySku) {
            errors.push({
              row: rowNumber,
              sku,
              message: 'El SKU ya existe en esta tienda. Activa la actualización por SKU o cambia el código.'
            });
            continue;
          }

          if (existing) {
            const product = await ProductService.updateProduct(tenantId, existing.id, {
              title,
              price,
              stock,
              sku: String(existing.sku || sku),
              status,
              ...(description !== undefined ? { description } : {}),
              ...(comparePrice !== undefined ? { comparePrice } : {}),
              ...(category !== undefined ? { category } : {}),
              ...(imagesProvided ? { images } : {}),
              ...(tags !== undefined ? { tags } : {})
            });

            updatedProducts.push(product);

            AuditService.log({
              tenantId,
              userId: session?.userId,
              userEmail: session?.email,
              action: 'PRODUCT_UPDATED',
              entity: 'Product',
              entityId: product.id,
              details: { source: 'product_import', row: rowNumber, sku }
            });

            continue;
          }

          if (quotaReached) {
            errors.push({
              row: rowNumber,
              sku: sku || undefined,
              message: quotaMessage
            });
            continue;
          }

          const entitlement = await TenantContextHelper.requireEntitlement(req, 'products.max', {
            targetTenantId: tenantId,
            currentCount: initialCount + createdProducts.length,
            increment: 1
          });

          if (!entitlement.success) {
            const entitlementResponse = entitlement.response;
            const payload = entitlementResponse
              ? await entitlementResponse.clone().json().catch(() => null)
              : null;
            quotaMessage = payload?.error || payload?.message || quotaMessage;
            quotaReached = true;

            errors.push({
              row: rowNumber,
              sku: sku || undefined,
              message: quotaMessage
            });
            continue;
          }

          const product = await ProductService.createProduct(tenantId, {
            title,
            description: description ?? '',
            price,
            comparePrice,
            stock,
            sku: sku || undefined,
            category: category ?? 'General',
            images: imagesProvided ? images : [],
            tags: tags ?? [],
            status
          });

          createdProducts.push(product);

          AuditService.log({
            tenantId,
            userId: session?.userId,
            userEmail: session?.email,
            action: 'PRODUCT_CREATED',
            entity: 'Product',
            entityId: product.id,
            details: { source: 'product_import', row: rowNumber, sku: product.sku }
          });
        } catch (error: any) {
          errors.push({
            row: rowNumber,
            sku: sku || undefined,
            message: error?.message || 'Error guardando el producto.'
          });
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        tenantId,
        createdCount: createdProducts.length,
        updatedCount: updatedProducts.length,
        failedCount: errors.length,
        errors,
        createdProducts,
        updatedProducts
      });
    });
  } catch (error: any) {
    console.error('[PRODUCT_IMPORT] Error del lote:', error);

    return NextResponse.json(
      { success: false, error: error?.message || 'Error procesando la importación.' },
      { status: 500 }
    );
  }
}
