import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Sanitizes incoming host header against injection, CRLF, and port manipulations
 */
function sanitizeHostHeader(rawHost: string | null): string {
  if (!rawHost) return 'localhost';
  
  // 1. Remove protocol, query, trailing path
  let clean = rawHost
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .split(':')[0];

  // 2. Filter out characters outside RFC 1035/1123 domain spec
  clean = clean.replace(/[^a-z0-9.-]/g, '');

  // 3. Trim leading/trailing dots and hyphens
  clean = clean.replace(/^[\.-]+|[\.-]+$/g, '');

  // 4. Default fallback if empty or corrupt
  if (!clean || clean.length < 3) {
    return 'localhost';
  }

  return clean;
}

export function middleware(request: NextRequest) {
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost';
  const cleanHost = sanitizeHostHeader(rawHost);

  // Pass normalized hostname and security context downstream
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-resolved-hostname', cleanHost);

  // If request contains simulated or query-based tenant hints, sanitize them
  const url = request.nextUrl;
  const rawQueryTenant = url.searchParams.get('tenant') || url.searchParams.get('store') || url.searchParams.get('slug');
  if (rawQueryTenant) {
    const cleanSlug = rawQueryTenant.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    if (cleanSlug) {
      requestHeaders.set('x-tenant-slug', cleanSlug);
    }
  }

  // Simulated host switcher header from navbar
  const simulatedHost = request.headers.get('x-simulated-host');
  if (simulatedHost) {
    const cleanSimHost = sanitizeHostHeader(simulatedHost);
    requestHeaders.set('x-resolved-hostname', cleanSimHost);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

