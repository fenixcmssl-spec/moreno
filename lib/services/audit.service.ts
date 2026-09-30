import { AuditLogItem } from '@/types';

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud_1',
    tenantId: 'tenant_demo',
    userEmail: 'info@fenixcms.es',
    action: 'TENANT_PROVISIONED',
    entity: 'Tenant',
    entityId: 'tenant_demo',
    details: { name: 'Mi Tienda Online', plan: 'Professional Store', application: 'ECOMMERCE' },
    ipAddress: '127.0.0.1',
    createdAt: '2026-09-01T10:30:00Z'
  },
  {
    id: 'aud_2',
    tenantId: 'tenant_demo',
    userEmail: 'info@fenixcms.es',
    action: 'LICENSE_GENERATED',
    entity: 'License',
    entityId: 'lic_882910',
    details: { key: 'FNX-PRO-9823-X981-DEMO', validTo: '2027-09-01' },
    ipAddress: '127.0.0.1',
    createdAt: '2026-09-01T10:30:05Z'
  },
  {
    id: 'aud_3',
    tenantId: 'tenant_demo',
    userEmail: 'info@fenixcms.es',
    action: 'PLUGIN_ENABLED',
    entity: 'Plugin',
    entityId: 'plugin_correos_pro',
    details: { plugin: 'Correos Express Oficial' },
    ipAddress: '127.0.0.1',
    createdAt: '2026-09-02T14:15:00Z'
  }
];

function redactSensitiveDetails(details?: Record<string, any>): Record<string, any> | undefined {
  if (!details || typeof details !== 'object') return details;
  const SENSITIVE_KEYS = /password|token|secret|authorization|cookie|apikey|card|cvv|hash|passwordHash|tokenHash/i;
  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEYS.test(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      redacted[key] = redactSensitiveDetails(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export class AuditService {
  private static logs: AuditLogItem[] = [...INITIAL_AUDIT_LOGS];

  static getAll(): AuditLogItem[] {
    return this.logs;
  }

  static getByTenant(tenantId: string): AuditLogItem[] {
    return this.logs.filter(l => l.tenantId === tenantId);
  }

  static getLogs(filter?: { tenantId?: string; action?: string; limit?: number }): AuditLogItem[] {
    let result = this.logs;
    if (filter?.tenantId) {
      result = result.filter(l => l.tenantId === filter.tenantId);
    }
    if (filter?.action) {
      result = result.filter(l => l.action.toLowerCase() === filter.action?.toLowerCase());
    }
    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }
    return result;
  }

  static log(
    actionOrOptions: string | {
      action: string;
      entity?: string;
      entityId?: string;
      userId?: string;
      details?: Record<string, any>;
      tenantId?: string;
      userEmail?: string;
      [key: string]: any;
    },
    entity: string = 'System', 
    details?: Record<string, any>, 
    tenantId?: string, 
    userEmail: string = 'info@fenixcms.es'
  ): AuditLogItem {
    let finalAction = '';
    let finalEntity = entity;
    let finalEntityId: string | undefined = undefined;
    let finalDetails = details;
    let finalTenantId = tenantId;
    let finalUserEmail = userEmail;

    if (typeof actionOrOptions === 'object') {
      finalAction = actionOrOptions.action;
      finalEntity = actionOrOptions.entity || 'System';
      finalEntityId = actionOrOptions.entityId;
      finalDetails = actionOrOptions.details;
      finalTenantId = actionOrOptions.tenantId;
      finalUserEmail = actionOrOptions.userEmail || 'info@fenixcms.es';
    } else {
      finalAction = actionOrOptions;
    }

    const entry: AuditLogItem = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      tenantId: finalTenantId,
      userEmail: finalUserEmail,
      action: finalAction,
      entity: finalEntity,
      entityId: finalEntityId,
      details: redactSensitiveDetails(finalDetails),
      ipAddress: '127.0.0.1',
      createdAt: new Date().toISOString()
    };
    this.logs.unshift(entry);
    return entry;
  }
}
