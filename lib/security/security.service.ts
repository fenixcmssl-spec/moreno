import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window rate limiter store
const RATE_LIMIT_STORE: Map<string, RateLimitRecord> = new Map();

// Periodic cleanup of expired rate limit entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of RATE_LIMIT_STORE.entries()) {
      if (record.resetAt <= now) {
        RATE_LIMIT_STORE.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export class RateLimiter {
  /**
   * Evaluates if a request key has exceeded its allowed limit within the time window
   */
  static check(key: string, limit: number = 60, windowSeconds: number = 60): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const record = RATE_LIMIT_STORE.get(key);

    if (!record || record.resetAt <= now) {
      RATE_LIMIT_STORE.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetSeconds: windowSeconds
      };
    }

    if (record.count >= limit) {
      const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds
      };
    }

    record.count += 1;
    const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: true,
      limit,
      remaining: limit - record.count,
      resetSeconds
    };
  }

  /**
   * Helper to extract client IP or identifier
   */
  static getClientIdentifier(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
    return '127.0.0.1';
  }
}

export class SecurityService {
  /**
   * Comprehensive XSS and Script Injection filter
   */
  static sanitizeString(input: string | null | undefined): string {
    if (!input || typeof input !== 'string') return '';

    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags and contents
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove <iframe> tags and contents
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove <object> tags
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')   // Remove <embed> tags
      .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')                    // Remove inline event handlers (onload, onerror, onclick)
      .replace(/\bon\w+\s*=\s*[^>\s]+/gi, '')                          // Remove unquoted inline event handlers
      .replace(/javascript:[^"'>]*/gi, '')                              // Remove javascript: pseudo-protocol
      .replace(/data:text\/html[^"'>]*/gi, '')                          // Remove data:text/html vectors
      .replace(/vbscript:[^"'>]*/gi, '')                                // Remove vbscript: vectors
      .trim();
  }

  /**
   * Recursively sanitizes all string properties within an object/array payload
   */
  static sanitizePayload<T>(payload: T): T {
    if (!payload || typeof payload !== 'object') {
      if (typeof payload === 'string') {
        return this.sanitizeString(payload) as unknown as T;
      }
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this.sanitizePayload(item)) as unknown as T;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizePayload(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Validates redirect URLs to prevent Open Redirects (CWE-601)
   */
  static isSafeRedirectUrl(url: string | null | undefined, allowedDomains: string[] = ['fenixcms.es']): boolean {
    if (!url || typeof url !== 'string') return false;

    const trimmed = url.trim();

    // 1. Safe relative URLs starting with '/' but not '//' (which would be protocol-relative external domain)
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
      return true;
    }

    // 2. Parse absolute URLs and match whitelist
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      const host = parsed.hostname.toLowerCase();
      return allowedDomains.some(d => host === d || host.endsWith(`.${d}`));
    } catch {
      return false;
    }
  }

  /**
   * Safe File Upload validator: enforces MIME whitelist, blocks executable extensions,
   * checks max file size, and eliminates path traversal attempts.
   */
  static validateFileUpload(file: {
    name: string;
    type: string;
    size: number;
  }): { valid: boolean; reason?: string; sanitizedName?: string } {
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

    if (!file || !file.name) {
      return { valid: false, reason: 'Archivo o nombre de archivo ausente.' };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { valid: false, reason: `El tamaño del archivo (${(file.size / 1024 / 1024).toFixed(1)}MB) supera el límite máximo permitido (10MB).` };
    }

    // 1. Sanitize filename & prevent directory traversal
    let safeName = file.name
      .replace(/[\/\\]/g, '_')
      .replace(/\.\.+/g, '.')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    if (!safeName || safeName.startsWith('.')) {
      safeName = `upload_${Date.now()}_${safeName.replace(/^\.+/, '')}`;
    }

    // 2. Dangerous file extensions blacklist
    const DANGEROUS_EXTENSIONS = [
      'php', 'php3', 'php4', 'php5', 'phtml', 'phar',
      'exe', 'dll', 'bat', 'cmd', 'sh', 'bash', 'bin',
      'js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs',
      'html', 'htm', 'xhtml', 'shtml',
      'py', 'pyc', 'pyw', 'rb', 'pl', 'cgi',
      'jar', 'war', 'vbs', 'scr', 'msi', 'com'
    ];

    const extensionMatch = safeName.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';

    if (!extension || DANGEROUS_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        reason: `Tipo de archivo o extensión '.${extension}' no permitida por razones de seguridad.`
      };
    }

    // 3. Allowed MIME types whitelist
    const ALLOWED_MIME_TYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
      'text/csv',
      'application/json',
      'application/zip',
      'video/mp4',
      'video/webm'
    ];

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        reason: `El tipo MIME '${file.type}' no está en la lista de formatos admitidos.`
      };
    }

    return {
      valid: true,
      sanitizedName: safeName
    };
  }

  /**
   * Validates plugin manifests before installation or execution to prevent unsafe code execution
   */
  static validatePluginManifest(manifest: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!manifest || typeof manifest !== 'object') {
      return { valid: false, errors: ['Manifiesto de plugin inválido o no es un objeto JSON.'] };
    }

    if (!manifest.id || typeof manifest.id !== 'string' || !/^[a-z0-9_-]+$/i.test(manifest.id)) {
      errors.push('El campo id del plugin debe contener solo caracteres alfanuméricos, guiones o guiones bajos.');
    }

    if (!manifest.name || typeof manifest.name !== 'string' || manifest.name.length < 2) {
      errors.push('El nombre del plugin es obligatorio (mínimo 2 caracteres).');
    }

    if (!manifest.version || !/^\d+\.\d+(\.\d+)?(-[a-z0-9.]+)?$/i.test(manifest.version)) {
      errors.push('La versión del plugin debe seguir el estándar SemVer (ej. 1.0.0).');
    }

    // Check for suspicious code patterns inside manifest hooks or scripts
    const rawString = JSON.stringify(manifest);
    const FORBIDDEN_PATTERNS = [
      'eval(',
      'Function(',
      'child_process',
      'process.env.DATABASE_URL',
      'process.env.GEMINI_API_KEY',
      'require(\'fs\')',
      'require("fs")',
      '<script',
      'document.cookie',
      'window.localStorage'
    ];

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (rawString.includes(pattern)) {
        errors.push(`El plugin contiene instrucciones no permitidas en el sandbox de seguridad ('${pattern}').`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Applies rate limiting middleware guard to an API endpoint
   */
  static applyRateLimit(
    req: NextRequest,
    limit: number = 60,
    windowSeconds: number = 60,
    action: string = 'general'
  ): { limited: boolean; response?: NextResponse } {
    const ip = RateLimiter.getClientIdentifier(req);
    const key = `ratelimit:${action}:${ip}`;
    const result = RateLimiter.check(key, limit, windowSeconds);

    if (!result.allowed) {
      return {
        limited: true,
        response: NextResponse.json(
          {
            error: 'Límite de peticiones excedido (Rate limit exceeded). Por favor espera antes de reintentar.',
            code: 'RATE_LIMIT_EXCEEDED',
            limit: result.limit,
            resetSeconds: result.resetSeconds
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(result.resetSeconds),
              'X-RateLimit-Limit': String(result.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(result.resetSeconds)
            }
          }
        )
      };
    }

    return { limited: false };
  }
}
