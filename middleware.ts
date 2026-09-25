import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * =========================================================================
 * FenixCMS SaaS Engine — High-Performance Edge Multitenant Router
 * =========================================================================
 * Ultra-fast Edge middleware for multi-tenant hostname resolution,
 * path rewrites, and security header injection.
 * Differentiates SaaS Main Domain, Merchant Subdomains, and Custom Domains.
 * =========================================================================
 */

// Known SaaS Root Domains
const SAAS_ROOT_DOMAINS = new Set([
  'fenixcms.es',
  'www.fenixcms.es',
  'fenixcms.com',
  'www.fenixcms.com',
  'fenixcms.app',
  'www.fenixcms.app',
  'localhost',
  '127.0.0.1',
]);

// Excluded static file extensions regex
const STATIC_ASSETS_REGEX = /\.(?:ico|jpg|jpeg|png|gif|svg|webp|avif|css|js|woff|woff2|ttf|eot|otf|map|mp4|webm|json|xml|txt)$/i;

/**
 * Sanitizes and normalizes the host header against injection, CRLF, and port manipulations
 */
function sanitizeHostHeader(rawHost: string | null): string {
  if (!rawHost) return 'localhost';

  let clean = rawHost
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .split(':')[0];

  // Restrict to RFC 1035/1123 domain spec characters
  clean = clean.replace(/[^a-z0-9.-]/g, '');

  // Trim leading/trailing dots and hyphens
  clean = clean.replace(/^[\.-]+|[\.-]+$/g, '');

  if (!clean || clean.length < 3) {
    return 'localhost';
  }

  return clean;
}

export type DomainClassification =
  | { type: 'saas_root'; host: string }
  | { type: 'tenant_subdomain'; host: string; slug: string }
  | { type: 'custom_domain'; host: string };

/**
 * Classifies an incoming host as SaaS Root, Subdomain, or Custom Domain
 */
function classifyHost(host: string): DomainClassification {
  // Check exact root domains
  if (SAAS_ROOT_DOMAINS.has(host)) {
    return { type: 'saas_root', host };
  }

  // Cloud Run or internal preview environments without custom subdomain
  if (host.endsWith('.run.app') || host.endsWith('.vercel.app')) {
    const parts = host.split('.');
    if (parts.length <= 4) {
      return { type: 'saas_root', host };
    }
  }

  // Subdomain of fenixcms (e.g., tienda-demo.fenixcms.es or store.localhost)
  if (
    host.endsWith('.fenixcms.es') ||
    host.endsWith('.fenixcms.com') ||
    host.endsWith('.fenixcms.app') ||
    (host.endsWith('.localhost') && host !== 'localhost')
  ) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'admin') {
      return { type: 'tenant_subdomain', host, slug: subdomain };
    }
    return { type: 'saas_root', host };
  }

  // All other valid domains are Custom Domains configured by merchants
  return { type: 'custom_domain', host };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Strict Exclusion Bypass (Static Assets, Internals)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    STATIC_ASSETS_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Extract and sanitize Hostname
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    'localhost';
  
  let cleanHost = sanitizeHostHeader(rawHost);

  // Check navbar simulated host header for live tenant switching / developer sandbox
  const simulatedHost = request.headers.get('x-simulated-host');
  if (simulatedHost) {
    cleanHost = sanitizeHostHeader(simulatedHost);
  }

  // 3. Classify Domain Architecture
  const classification = classifyHost(cleanHost);

  // 4. Downstream Headers Injection
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-resolved-hostname', cleanHost);
  requestHeaders.set('x-pathname', pathname);

  let targetTenantSlug: string | null = null;

  if (classification.type === 'tenant_subdomain') {
    requestHeaders.set('x-tenant-type', 'tenant_subdomain');
    requestHeaders.set('x-tenant-slug', classification.slug);
    requestHeaders.set('x-is-tenant-storefront', 'true');
    targetTenantSlug = classification.slug;
  } else if (classification.type === 'custom_domain') {
    requestHeaders.set('x-tenant-type', 'custom_domain');
    requestHeaders.set('x-custom-domain', classification.host);
    requestHeaders.set('x-is-tenant-storefront', 'true');
  } else {
    requestHeaders.set('x-tenant-type', 'saas_root');
    requestHeaders.set('x-is-tenant-storefront', 'false');
  }

  // Check URL query-based tenant parameter override (e.g. ?store=demo or ?tenant=demo)
  const url = request.nextUrl;
  const rawQueryTenant =
    url.searchParams.get('tenant') ||
    url.searchParams.get('store') ||
    url.searchParams.get('slug');

  if (rawQueryTenant) {
    const cleanSlug = rawQueryTenant.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    if (cleanSlug) {
      requestHeaders.set('x-tenant-slug', cleanSlug);
      requestHeaders.set('x-is-tenant-storefront', 'true');
      targetTenantSlug = cleanSlug;
    }
  }

  // 5. Build Response with Route Rewrite / Forwarding
  const rewriteUrl = request.nextUrl.clone();
  
  // Next.js Route Rewrite forwarding with enriched context headers
  const response = NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: requestHeaders,
    },
  });

  // 6. Production-Grade Edge Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - Files with common static extensions (.png, .jpg, .svg, .css, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:ico|jpg|jpeg|png|gif|svg|webp|avif|css|js|woff|woff2|ttf|eot|otf|map|mp4|webm|json|xml|txt)$).*)',
  ],
};
