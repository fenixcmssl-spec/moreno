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

export class AuditService {
  private static logs: AuditLogItem[] = [...INITIAL_AUDIT_LOGS];

  static getAll(): AuditLogItem[] {
    return this.logs;
  }

  static getByTenant(tenantId: string): AuditLogItem[] {
    return this.logs.filter(l => l.tenantId === tenantId);
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
      details: finalDetails,
      ipAddress: '127.0.0.1',
      createdAt: new Date().toISOString()
    };
    this.logs.unshift(entry);
    return entry;
  }
}
