import { PluginDefinition, ApplicationTypeKey } from '@/types';
import prisma from '@/lib/prisma';
import { AuditService } from './audit.service';
import { SecurityService } from '@/lib/security/security.service';

export interface PluginManifest {
  key: string;
  name: string;
  version: string;
  author: string;
  description: string;
  applicationScope?: ApplicationTypeKey | 'ALL';
  minCmsVersion?: string;
  category?: string;
  hooks?: string[];
  permissions?: string[];
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

export class PluginService {
  /**
   * Maps Prisma Plugin record to PluginDefinition
   */
  private static mapToDefinition(p: any): PluginDefinition {
    const rawConfig = typeof p.config === 'object' && p.config !== null ? p.config : {};
    const rawManifest = typeof p.manifest === 'object' && p.manifest !== null ? p.manifest : {};

    const settingsFields = rawManifest.settingsSchema
      ? Object.keys(rawManifest.settingsSchema).map(k => ({
          key: k,
          label: k.charAt(0).toUpperCase() + k.slice(1),
          type: 'text' as const,
          defaultValue: rawManifest.settingsSchema[k]
        }))
      : Object.keys(rawConfig).map(k => ({
          key: k,
          label: k.charAt(0).toUpperCase() + k.slice(1),
          type: typeof rawConfig[k] === 'boolean' ? 'boolean' as const : 'text' as const,
          defaultValue: rawConfig[k]
        }));

    return {
      id: p.id,
      key: p.key,
      name: p.name,
      description: rawManifest.description || '',
      version: p.version || '1.0.0',
      author: rawManifest.author || 'Fenix Team',
      category: p.category || 'tools',
      applicationScope: rawManifest.applicationScope || 'ECOMMERCE',
      iconName: rawManifest.iconName || 'Cpu',
      isEnabled: p.isEnabled ?? true,
      isCore: Boolean(rawManifest.isCore),
      config: rawConfig,
      hasSettings: settingsFields.length > 0,
      settingsFields
    };
  }

  /**
   * Retrieves all available plugins in the global/tenant catalog from PostgreSQL
   */
  static async getAllPlugins(options?: { category?: string; search?: string }): Promise<PluginDefinition[]> {
    try {
      const whereClause: any = {};
      if (options?.category) {
        whereClause.category = options.category;
      }
      if (options?.search) {
        whereClause.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { key: { contains: options.search, mode: 'insensitive' } }
        ];
      }

      const plugins = await prisma.plugin.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' }
      });

      return plugins.map(p => this.mapToDefinition(p));
    } catch (error) {
      console.error('[PluginService] Error fetching plugins from PostgreSQL:', error);
      return [];
    }
  }

  /**
   * Retrieves single plugin by id or key
   */
  static async getPluginById(idOrKey: string): Promise<PluginDefinition | null> {
    if (!idOrKey) return null;

    try {
      const plugin = await prisma.plugin.findFirst({
        where: {
          OR: [{ id: idOrKey }, { key: idOrKey }]
        }
      });

      if (!plugin) return null;
      return this.mapToDefinition(plugin);
    } catch (error) {
      console.error(`[PluginService] Error fetching plugin ${idOrKey}:`, error);
      return null;
    }
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
    if (!manifest.version || !/^\d+\.\d+(\.\d+)?$/.test(manifest.version)) {
      errors.push('La versión debe seguir formato semántico (ej: 1.0.0).');
    }
    if (!manifest.author) {
      errors.push('El autor es obligatorio.');
    }

    // Run security analysis
    const securityCheck = SecurityService.validatePluginManifest(manifest);
    if (!securityCheck.valid) {
      errors.push(...securityCheck.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Registers a new plugin in the PostgreSQL catalog
   */
  static async createPlugin(
    manifest: PluginManifest,
    options?: { tenantId?: string; isPublished?: boolean }
  ): Promise<{ success: boolean; plugin?: PluginDefinition; errors?: string[] }> {
    const validation = this.validateManifest(manifest);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const tenantId = options?.tenantId || 'tenant_1';

    try {
      const exists = await prisma.plugin.findFirst({
        where: {
          OR: [
            { key: manifest.key, tenantId },
            { key: manifest.key }
          ]
        }
      });

      if (exists) {
        return { success: false, errors: [`Ya existe un plugin registrado con la clave: ${manifest.key}`] };
      }

      const created = await prisma.plugin.create({
        data: {
          tenantId,
          key: manifest.key,
          name: manifest.name,
          version: manifest.version,
          category: manifest.category || 'tools',
          isEnabled: options?.isPublished ?? true,
          config: (manifest.settingsSchema || {}) as any,
          manifest: {
            author: manifest.author,
            description: manifest.description,
            applicationScope: manifest.applicationScope || 'ECOMMERCE',
            minCmsVersion: manifest.minCmsVersion || '2.0.0',
            hooks: manifest.hooks || [],
            permissions: manifest.permissions || [],
            settingsSchema: manifest.settingsSchema || {}
          } as any
        }
      });

      AuditService.log({
        action: 'PLUGIN_CREATED',
        entity: 'Plugin',
        entityId: created.id,
        details: { name: created.name, version: created.version, key: created.key }
      });

      return { success: true, plugin: this.mapToDefinition(created) };
    } catch (error: any) {
      return { success: false, errors: [error?.message || 'Error guardando plugin en base de datos'] };
    }
  }

  /**
   * Retrieves installations for a specific tenant from PostgreSQL
   */
  static async getTenantInstallations(tenantId: string): Promise<PluginInstallationRecord[]> {
    if (!tenantId) return [];

    try {
      const installations = await prisma.pluginInstallation.findMany({
        where: { tenantId },
        include: { plugin: true }
      });

      return installations.map(inst => ({
        id: inst.id,
        tenantId: inst.tenantId,
        pluginId: inst.pluginId,
        version: inst.plugin?.version || '1.0.0',
        status: inst.isEnabled ? 'ACTIVE' : 'INACTIVE',
        config: (typeof inst.settings === 'object' && inst.settings !== null ? inst.settings : {}) as Record<string, any>,
        enabledAt: inst.installedAt.toISOString(),
        updatedAt: inst.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error(`[PluginService] Error fetching installations for tenant ${tenantId}:`, error);
      return [];
    }
  }

  /**
   * Checks whether a plugin is enabled for a given tenant
   */
  static async isPluginEnabledForTenant(tenantId: string, pluginIdOrKey: string): Promise<boolean> {
    if (!tenantId || !pluginIdOrKey) return false;

    try {
      const plugin = await this.getPluginById(pluginIdOrKey);
      if (!plugin) return false;

      const installation = await prisma.pluginInstallation.findUnique({
        where: {
          tenantId_pluginId: {
            tenantId,
            pluginId: plugin.id
          }
        }
      });

      return installation ? installation.isEnabled : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Toggles activation of a plugin for a specific tenant in PostgreSQL
   */
  static async togglePluginForTenant(
    tenantId: string,
    pluginIdOrKey: string,
    forceEnable?: boolean
  ): Promise<{ success: boolean; isEnabled: boolean }> {
    if (!tenantId || !pluginIdOrKey) return { success: false, isEnabled: false };

    try {
      const plugin = await this.getPluginById(pluginIdOrKey);
      if (!plugin) return { success: false, isEnabled: false };

      const existing = await prisma.pluginInstallation.findUnique({
        where: {
          tenantId_pluginId: {
            tenantId,
            pluginId: plugin.id
          }
        }
      });

      const nextStatus = forceEnable !== undefined ? forceEnable : (existing ? !existing.isEnabled : true);

      await prisma.pluginInstallation.upsert({
        where: {
          tenantId_pluginId: {
            tenantId,
            pluginId: plugin.id
          }
        },
        update: {
          isEnabled: nextStatus
        },
        create: {
          tenantId,
          pluginId: plugin.id,
          isEnabled: nextStatus,
          settings: (plugin.config || {}) as any
        }
      });

      AuditService.log({
        tenantId,
        action: nextStatus ? 'PLUGIN_ACTIVATED' : 'PLUGIN_DEACTIVATED',
        entity: 'PluginInstallation',
        entityId: plugin.id,
        details: { pluginKey: plugin.key, pluginName: plugin.name }
      });

      return { success: true, isEnabled: nextStatus };
    } catch (error) {
      console.error(`[PluginService] Error toggling plugin for tenant ${tenantId}:`, error);
      return { success: false, isEnabled: false };
    }
  }

  /**
   * Updates configuration settings of an installed plugin for a tenant
   */
  static async updatePluginConfig(
    tenantId: string,
    pluginIdOrKey: string,
    config: Record<string, any>
  ): Promise<boolean> {
    if (!tenantId || !pluginIdOrKey) return false;

    try {
      const plugin = await this.getPluginById(pluginIdOrKey);
      if (!plugin) return false;

      const existing = await prisma.pluginInstallation.findUnique({
        where: {
          tenantId_pluginId: {
            tenantId,
            pluginId: plugin.id
          }
        }
      });

      const currentSettings = existing && typeof existing.settings === 'object' && existing.settings !== null
        ? (existing.settings as Record<string, any>)
        : {};

      const newSettings = { ...currentSettings, ...config };

      await prisma.pluginInstallation.upsert({
        where: {
          tenantId_pluginId: {
            tenantId,
            pluginId: plugin.id
          }
        },
        update: {
          settings: newSettings as any
        },
        create: {
          tenantId,
          pluginId: plugin.id,
          isEnabled: true,
          settings: newSettings as any
        }
      });

      AuditService.log({
        tenantId,
        action: 'PLUGIN_CONFIG_UPDATED',
        entity: 'PluginInstallation',
        entityId: plugin.id,
        details: { updatedKeys: Object.keys(config) }
      });

      return true;
    } catch (error) {
      console.error(`[PluginService] Error updating plugin config for tenant ${tenantId}:`, error);
      return false;
    }
  }
}

