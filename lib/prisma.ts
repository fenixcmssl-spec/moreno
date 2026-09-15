import { PrismaClient } from '@prisma/client';

/**
 * =========================================================================
 * FenixCMS SaaS Engine — Prisma Client Singleton & Database Health Guard
 * =========================================================================
 * Enforces PostgreSQL as the single source of truth in production environments.
 * Uses lazy initialization to prevent build-time crashes during `next build`
 * while strictly guaranteeing that production database access fails loudly
 * if `DATABASE_URL` is missing or unreachable (NO silent fallback).
 * =========================================================================
 */

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConfigurationError';
  }
}

export class DatabaseConnectionError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function isProductionMode(): boolean {
  return process.env.NODE_ENV === 'production';
}

type GlobalWithPrisma = typeof globalThis & {
  __fenix_prisma_instance__?: PrismaClient | null;
};

const globalObj = globalThis as GlobalWithPrisma;

/**
 * Lazy initialization of PrismaClient
 */
export function getPrismaClient(): PrismaClient {
  const isProd = process.env.NODE_ENV === 'production';
  const dbUrl = process.env.DATABASE_URL?.trim();

  if (isProd && !dbUrl) {
    const errorMsg =
      '[FenixCMS / Production Error] FATAL: DATABASE_URL is missing in production environment. ' +
      'PostgreSQL is the strict single source of truth. Silent in-memory fallback is disabled in production.';
    console.error(errorMsg);
    throw new DatabaseConfigurationError(errorMsg);
  }

  if (!dbUrl) {
    // Development / isolated test without live postgres
    throw new DatabaseConfigurationError('DATABASE_URL is not configured in current environment.');
  }

  if (!globalObj.__fenix_prisma_instance__) {
    globalObj.__fenix_prisma_instance__ = new PrismaClient({
      log: isProd ? ['error'] : ['error', 'warn'],
    });
  }

  return globalObj.__fenix_prisma_instance__;
}

/**
 * Validates database readiness and executes a test query against PostgreSQL.
 * Throws explicit errors in production when connection fails.
 */
export async function assertDatabaseReady(): Promise<{ ready: boolean; latencyMs?: number }> {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !isPostgresConfigured()) {
    throw new DatabaseConfigurationError(
      'Cannot assert database readiness: DATABASE_URL is required in production.'
    );
  }

  if (!isPostgresConfigured()) {
    return { ready: false };
  }

  const client = getPrismaClient();
  const start = Date.now();
  try {
    await client.$queryRawUnsafe('SELECT 1');
    const latencyMs = Date.now() - start;
    return { ready: true, latencyMs };
  } catch (error) {
    if (isProd) {
      throw new DatabaseConnectionError(
        'PostgreSQL database is unreachable or query execution failed.',
        error
      );
    }
    return { ready: false };
  }
}

/**
 * In-memory test store for non-production testing when DATABASE_URL is not set
 */
class InMemoryTestPrisma {
  private tables: Map<string, Map<string, any>> = new Map();

  private getTable(name: string): Map<string, any> {
    if (!this.tables.has(name)) {
      this.tables.set(name, new Map());
    }
    return this.tables.get(name)!;
  }

  createDelegate(tableName: string) {
    const table = this.getTable(tableName);

    const matchesWhere = (item: any, where: any): boolean => {
      if (!where) return true;
      for (const [key, val] of Object.entries(where)) {
        if (key === 'OR' && Array.isArray(val)) {
          const anyMatch = val.some((subWhere: any) => matchesWhere(item, subWhere));
          if (!anyMatch) return false;
          continue;
        }
        if (key === 'AND' && Array.isArray(val)) {
          const allMatch = val.every((subWhere: any) => matchesWhere(item, subWhere));
          if (!allMatch) return false;
          continue;
        }
        if (key.includes('_')) {
          // Compound unique key e.g. tenantId_code or tenantId_email
          if (typeof val === 'object' && val !== null) {
            for (const [subKey, subVal] of Object.entries(val)) {
              if (item[subKey] !== subVal) return false;
            }
            continue;
          }
        }
        if (typeof val === 'object' && val !== null) {
          if ('in' in val && Array.isArray((val as any).in)) {
            if (!(val as any).in.includes(item[key])) return false;
            continue;
          }
          if ('gte' in val) {
            if (!(item[key] >= (val as any).gte)) return false;
            continue;
          }
          if ('gt' in val) {
            if (!(item[key] > (val as any).gt)) return false;
            continue;
          }
          if ('lte' in val) {
            if (!(item[key] <= (val as any).lte)) return false;
            continue;
          }
          if ('lt' in val) {
            if (!(item[key] < (val as any).lt)) return false;
            continue;
          }
          if ('contains' in val) {
            const needle = String((val as any).contains).toLowerCase();
            const haystack = String(item[key] || '').toLowerCase();
            if (!haystack.includes(needle)) return false;
            continue;
          }
        }
        if (val === null) {
          if (item[key] !== null && item[key] !== undefined) return false;
          continue;
        }
        if (item[key] !== val) return false;
      }
      return true;
    };

    return {
      findUnique: async (args: any) => {
        const items = Array.from(table.values());
        const found = items.find(i => matchesWhere(i, args?.where));
        if (!found) return null;
        const res = { ...found };
        if (args?.include?.orderItems) {
          const oiTable = this.getTable('orderItem');
          res.orderItems = Array.from(oiTable.values()).filter(oi => oi.orderId === res.id);
        }
        return res;
      },
      findFirst: async (args: any) => {
        let items = Array.from(table.values()).filter(i => matchesWhere(i, args?.where));
        if (args?.orderBy) {
          const [field, dir] = Object.entries(args.orderBy)[0] as [string, string];
          items.sort((a, b) => {
            const aVal = a[field] || '';
            const bVal = b[field] || '';
            return dir === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
          });
        }
        const found = items[0];
        if (!found) return null;
        const res = { ...found };
        if (args?.include?.orderItems) {
          const oiTable = this.getTable('orderItem');
          res.orderItems = Array.from(oiTable.values()).filter(oi => oi.orderId === res.id);
        }
        return res;
      },
      findMany: async (args?: any) => {
        let items = Array.from(table.values()).filter(i => matchesWhere(i, args?.where));
        if (args?.orderBy) {
          const [field, dir] = Object.entries(args.orderBy)[0] as [string, string];
          items.sort((a, b) => {
            const aVal = a[field] || '';
            const bVal = b[field] || '';
            return dir === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
          });
        }
        if (args?.skip) items = items.slice(args.skip);
        if (args?.take) items = items.slice(0, args.take);
        return items.map(item => {
          const res = { ...item };
          if (args?.include?.orderItems) {
            const oiTable = this.getTable('orderItem');
            res.orderItems = Array.from(oiTable.values()).filter(oi => oi.orderId === res.id);
          }
          return res;
        });
      },
      count: async (args?: any) => {
        return Array.from(table.values()).filter(i => matchesWhere(i, args?.where)).length;
      },
      create: async (args: any) => {
        const id = args.data.id || `${tableName}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const record = { ...args.data, id, createdAt: new Date(), updatedAt: new Date() };
        if (args.data.orderItems?.create) {
          const oiTable = this.getTable('orderItem');
          const createdOIs = [];
          for (const oi of args.data.orderItems.create) {
            const oiId = oi.id || `oit_${Math.random().toString(36).slice(2, 8)}`;
            const oiRecord = { ...oi, id: oiId, orderId: id, createdAt: new Date() };
            oiTable.set(oiId, oiRecord);
            createdOIs.push(oiRecord);
          }
          record.orderItems = createdOIs;
        }
        table.set(id, record);
        return record;
      },
      update: async (args: any) => {
        const existing = Array.from(table.values()).find(i => matchesWhere(i, args.where));
        if (!existing) throw new Error(`Record not found in ${tableName}`);
        const updated = { ...existing };
        for (const [k, v] of Object.entries(args.data)) {
          if (typeof v === 'object' && v !== null && 'increment' in v) {
            updated[k] = (Number(updated[k]) || 0) + Number((v as any).increment);
          } else if (typeof v === 'object' && v !== null && 'decrement' in v) {
            updated[k] = (Number(updated[k]) || 0) - Number((v as any).decrement);
          } else {
            updated[k] = v;
          }
        }
        updated.updatedAt = new Date();
        table.set(existing.id, updated);
        return updated;
      },
      updateMany: async (args: any) => {
        const items = Array.from(table.values()).filter(i => matchesWhere(i, args.where));
        let count = 0;
        for (const existing of items) {
          const updated = { ...existing };
          for (const [k, v] of Object.entries(args.data)) {
            if (typeof v === 'object' && v !== null && 'increment' in v) {
              updated[k] = (Number(updated[k]) || 0) + Number((v as any).increment);
            } else if (typeof v === 'object' && v !== null && 'decrement' in v) {
              updated[k] = (Number(updated[k]) || 0) - Number((v as any).decrement);
            } else {
              updated[k] = v;
            }
          }
          updated.updatedAt = new Date();
          table.set(existing.id, updated);
          count++;
        }
        return { count };
      },
      upsert: async (args: any) => {
        const existing = Array.from(table.values()).find(i => matchesWhere(i, args.where));
        if (existing) {
          const updated = { ...existing, ...args.update, updatedAt: new Date() };
          table.set(existing.id, updated);
          return updated;
        } else {
          const id = args.create.id || `${tableName}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const created = { ...args.create, id, createdAt: new Date(), updatedAt: new Date() };
          table.set(id, created);
          return created;
        }
      },
      delete: async (args: any) => {
        const existing = Array.from(table.values()).find(i => matchesWhere(i, args.where));
        if (existing) table.delete(existing.id);
        return existing;
      },
      deleteMany: async (args?: any) => {
        const items = Array.from(table.values()).filter(i => matchesWhere(i, args?.where));
        for (const item of items) table.delete(item.id);
        return { count: items.length };
      }
    };
  }

  async $transaction(fn: any) {
    if (typeof fn === 'function') {
      const txProxy = new Proxy(this, {
        get: (target: any, prop: string | symbol) => {
          const propStr = String(prop);
          if (propStr === '$transaction') return (subFn: any) => target.$transaction(subFn);
          if (propStr === '$queryRawUnsafe' || propStr === '$queryRaw') return () => target.$queryRawUnsafe();
          if (typeof target[prop] === 'function') return target[prop].bind(target);
          return target.createDelegate(propStr);
        }
      });
      return fn(txProxy);
    }
    if (Array.isArray(fn)) {
      return Promise.all(fn);
    }
    return fn;
  }

  async $queryRawUnsafe() {
    return [{ '1': 1 }];
  }
}

const inMemoryTestInstance = new InMemoryTestPrisma();

/**
 * Exported Proxy for `prisma` that initializes lazily on first property access.
 * In production: throws DatabaseConfigurationError if accessed without DATABASE_URL.
 * In dev/test without DATABASE_URL: routes to InMemoryTestPrisma.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const isProd = process.env.NODE_ENV === 'production';
    const dbUrl = process.env.DATABASE_URL?.trim();

    if (!dbUrl) {
      if (isProd) {
        throw new DatabaseConfigurationError(
          `[FenixCMS / Production Error] Cannot access prisma.${String(prop)}: DATABASE_URL is missing in production.`
        );
      }
      const propStr = String(prop);
      if (propStr === '$transaction') {
        return (fn: any) => inMemoryTestInstance.$transaction(fn);
      }
      if (propStr === '$queryRawUnsafe' || propStr === '$queryRaw') {
        return () => inMemoryTestInstance.$queryRawUnsafe();
      }
      return inMemoryTestInstance.createDelegate(propStr);
    }

    const client = getPrismaClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;

