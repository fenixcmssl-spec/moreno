import { PluginDefinition, ApplicationTypeKey } from '@/types';
import { AuditService } from './audit.service';
import { INITIAL_PLUGINS } from '../initialData';

export interface PluginManifest {
  key: string;
  name: string;
  version: string;
  author: string;
  description: string;
  applicationScope: ApplicationTypeKey | 'ALL';
  minCmsVersion: string;
  hooks: string[];
  permissions: string[];
  settingsSchema?: Record<string, any>;
  packageUrl?: string;
  checksum?: string;
}

export interface PluginInstallationRecord {
  id: string;
  tenantId: string;
  pluginId: string;
  version: string;
  status: 'ACTIVE' | 'INACTIVE';
  config: Record<string, any>;
  enabledAt: string;
  updatedAt: string;
}

let PLUGINS_REGISTRY: PluginDefinition[] = [...INITIAL_PLUGINS];
const INSTALLATIONS_STORE = new Map<string, PluginInstallationRecord[]>();

export class PluginService {
  /**
   * Retrieves all available plugins in the ecosystem
   */
  static getAllPlugins(): PluginDefinition[] {
    return PLUGINS_REGISTRY;
  }

  static getPluginById(id: string): PluginDefinition | undefined {
    return PLUGINS_REGISTRY.find(p => p.id === id || p.key === id);
  }

  /**
   * Validates a plugin manifest before installation or publishing
   */
  static validateManifest(manifest: Partial<PluginManifest>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!manifest.key || !/^[a-z0-9_]+$/.test(manifest.key)) {
      errors.push('La clave del plugin debe contener solo minúsculas, números y guiones bajos.');
    }
    if (!manifest.name || manifest.name.length < 3) {
      errors.push('El nombre del plugin debe tener al menos 3 caracteres.');
    }
    if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push('La versión debe seguir formato semántico (ej: 1.0.0).');
    }
    if (!manifest.author) {
      errors.push('El autor es obligatorio.');
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Registers a new plugin package from Super Admin (Point 14)
   */
  static createPlugin(manifest: PluginManifest, isPublished: boolean = true): { success: boolean; plugin?: PluginDefinition; errors?: string[] } {
    const validation = this.validateManifest(manifest);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const exists = PLUGINS_REGISTRY.some(p => p.key === manifest.key);
    if (exists) {
      return { success: false, errors: [`Ya existe un plugin registrado con la clave: ${manifest.key}`] };
    }

    const newPlugin: PluginDefinition = {
      id: `plg_${Date.now()}`,
      key: manifest.key,
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      author: manifest.author,
      category: 'integrations',
      applicationScope: manifest.applicationScope,
      iconName: 'Cpu',
      isEnabled: true,
      isCore: false,
      config: manifest.settingsSchema ? { ...manifest.settingsSchema } : {},
      hasSettings: Boolean(manifest.settingsSchema),
      settingsFields: manifest.settingsSchema ? Object.keys(manifest.settingsSchema).map(k => ({
        key: k,
        label: k.charAt(0).toUpperCase() + k.slice(1),
        type: 'text',
        defaultValue: manifest.settingsSchema![k]
      })) : []
    };

    PLUGINS_REGISTRY.push(newPlugin);

    AuditService.log({
      action: 'PLUGIN_CREATED',
      entity: 'Plugin',
      entityId: newPlugin.id,
      details: { name: newPlugin.name, version: newPlugin.version, author: newPlugin.author }
    });

    return { success: true, plugin: newPlugin };
  }

  /**
   * Tenant installation, activation, deactivation & configuration
   */
  static getTenantInstallations(tenantId: string): PluginInstallationRecord[] {
    return INSTALLATIONS_STORE.get(tenantId) || [];
  }

  static togglePluginForTenant(tenantId: string, pluginId: string): { success: boolean; isEnabled: boolean } {
    const installations = this.getTenantInstallations(tenantId);
    const existing = installations.find(i => i.pluginId === pluginId);

    if (existing) {
      existing.status = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      existing.updatedAt = new Date().toISOString();
      INSTALLATIONS_STORE.set(tenantId, installations);
      
      AuditService.log({
        tenantId,
        action: existing.status === 'ACTIVE' ? 'PLUGIN_ACTIVATED' : 'PLUGIN_DEACTIVATED',
        entity: 'PluginInstallation',
        entityId: pluginId
      });

      return { success: true, isEnabled: existing.status === 'ACTIVE' };
    } else {
      const plugin = this.getPluginById(pluginId);
      if (!plugin) return { success: false, isEnabled: false };

      const newInst: PluginInstallationRecord = {
        id: `pinst_${Date.now()}`,
        tenantId,
        pluginId: plugin.id,
        version: plugin.version,
        status: 'ACTIVE',
        config: plugin.config || {},
        enabledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      INSTALLATIONS_STORE.set(tenantId, [...installations, newInst]);

      AuditService.log({
        tenantId,
        action: 'PLUGIN_INSTALLED',
        entity: 'PluginInstallation',
        entityId: plugin.id
      });

      return { success: true, isEnabled: true };
    }
  }

  static updatePluginConfig(tenantId: string, pluginId: string, config: Record<string, any>): boolean {
    const installations = this.getTenantInstallations(tenantId);
    const target = installations.find(i => i.pluginId === pluginId);
    if (!target) return false;

    target.config = { ...target.config, ...config };
    target.updatedAt = new Date().toISOString();
    INSTALLATIONS_STORE.set(tenantId, installations);
    return true;
  }
}
