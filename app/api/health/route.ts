import { NextRequest, NextResponse } from 'next/server';
import { assertDatabaseReady, isPostgresConfigured, isProductionMode } from '@/lib/prisma';

/**
 * =========================================================================
 * FenixCMS SaaS Engine — Production Health & Readiness Endpoint
 * =========================================================================
 * GET /api/health
 * 
 * Supports two probe types:
 * 1. Liveness Probe (?type=liveness):
 *    Verifies that the Next.js Node process is running and responding to HTTP requests.
 * 
 * 2. Readiness Probe (?type=readiness or default):
 *    Executes a fast probe (SELECT 1) against PostgreSQL to ensure the application
 *    is fully prepared to serve user traffic.
 * 
 * Security:
 * - Never returns DATABASE_URL, passwords, secrets, or internal stack traces.
 * - In production, if PostgreSQL is down or unreachable, returns HTTP 503 (Service Unavailable).
 * =========================================================================
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const probeType = searchParams.get('type') || 'readiness';
  const timestamp = new Date().toISOString();
  const uptimeSeconds = Math.floor(process.uptime ? process.uptime() : 0);
  const env = process.env.NODE_ENV || 'development';

  // 1. Liveness check (process alive)
  if (probeType === 'liveness') {
    return NextResponse.json({
      status: 'healthy',
      check: 'liveness',
      application: 'OK',
      timestamp,
      uptimeSeconds,
      environment: env
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }

  // 2. Readiness check (verifies database readiness)
  try {
    const isConfigured = isPostgresConfigured();
    const isProd = isProductionMode();

    if (isProd && !isConfigured) {
      return NextResponse.json({
        status: 'unhealthy',
        check: 'readiness',
        application: 'OK',
        database: 'NOT_CONFIGURED',
        error: 'DATABASE_URL environment variable is missing in production',
        timestamp,
        environment: env
      }, {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Type': 'application/json'
        }
      });
    }

    const dbStatus = await assertDatabaseReady();

    if (!dbStatus.ready) {
      return NextResponse.json({
        status: 'unhealthy',
        check: 'readiness',
        application: 'OK',
        database: 'UNREACHABLE',
        error: 'PostgreSQL database connection failed or timed out',
        timestamp,
        environment: env
      }, {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Type': 'application/json'
        }
      });
    }

    return NextResponse.json({
      status: 'healthy',
      check: 'readiness',
      application: 'OK',
      database: 'OK',
      dbLatencyMs: dbStatus.latencyMs ?? 0,
      uptimeSeconds,
      timestamp,
      environment: env
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      check: 'readiness',
      application: 'OK',
      database: 'ERROR',
      error: isProductionMode() ? 'Database verification error' : (error?.message || 'Database verification error'),
      timestamp,
      environment: env
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
}
