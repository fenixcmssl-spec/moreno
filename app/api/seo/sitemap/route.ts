import { NextRequest, NextResponse } from 'next/server';
import { SeoAutomationService } from '@/lib/services/seo-automation.service';
import { ProductService } from '@/lib/services/product.service';
import { CategoryService } from '@/lib/services/category.service';
import { BlogService } from '@/lib/services/blog.service';
import { DomainService } from '@/lib/services/domain.service';

export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get('host') || 'fenixcms.es';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const tenantResolution = await DomainService.resolveHostname(host);

    const tenantId = tenantResolution?.tenant?.id || tenantResolution?.domain?.tenantId || 'tenant_1';
    const baseUrl = `${proto}://${host}`;

    // Fetch products, categories, blog posts for sitemap
    const [productsResult, categoriesResult, blogResult] = await Promise.all([
      ProductService.listProducts(tenantId, { status: 'active' }).catch(() => ({ products: [], total: 0 })),
      CategoryService.listCategories(tenantId, { status: 'ACTIVE' }).catch(() => ({ categories: [], total: 0 })),
      BlogService.getPosts(tenantId, { status: 'PUBLISHED' }).catch(() => ({ posts: [], total: 0 }))
    ]);

    const xml = SeoAutomationService.generateSitemapXml({
      baseUrl,
      products: productsResult.products.map(p => ({ slug: p.slug || p.id, updatedAt: p.createdAt })),
      categories: (categoriesResult.categories || []).map(c => ({ slug: c.slug || c.name.toLowerCase() })),
      blogPosts: blogResult.posts.map(b => ({ slug: b.slug, updatedAt: b.updatedAt }))
    });

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    });
  } catch (error: any) {
    console.error('[SEO Sitemap API] Error generating sitemap:', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });
  }
}
