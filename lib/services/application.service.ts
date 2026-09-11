import { prisma } from '@/lib/prisma';
import { ApplicationDefinition, ApplicationModuleDef, ApplicationTypeKey } from '@/types';
import { INITIAL_APPLICATIONS } from '@/lib/initialData';

export class ApplicationService {
  /**
   * Retrieves all applications from PostgreSQL with their available modules included
   */
  static async getAll(options?: { status?: string; search?: string }): Promise<ApplicationDefinition[]> {
    try {
      if (!process.env.DATABASE_URL || !prisma?.application?.findMany) {
        let result = [...INITIAL_APPLICATIONS];
        if (options?.status) {
          result = result.filter(a => a.status.toLowerCase() === options.status?.toLowerCase());
        }
        if (options?.search) {
          const q = options.search.toLowerCase();
          result = result.filter(a => 
            a.name.toLowerCase().includes(q) || 
            a.key.toLowerCase().includes(q) || 
            (a.description && a.description.toLowerCase().includes(q))
          );
        }
        return result;
      }

      const where: any = {};
      if (options?.status) {
        where.status = options.status;
      }
      if (options?.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { key: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } },
          { category: { contains: options.search, mode: 'insensitive' } }
        ];
      }

      const dbApps = await prisma.application.findMany({
        where,
        include: {
          modules: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (dbApps && dbApps.length > 0) {
        return dbApps.map(this.mapPrismaToAppDefinition);
      }

      // Fallback to initial applications if DB table is empty
      let result = [...INITIAL_APPLICATIONS];
      if (options?.status) {
        result = result.filter(a => a.status.toLowerCase() === options.status?.toLowerCase());
      }
      if (options?.search) {
        const q = options.search.toLowerCase();
        result = result.filter(a => 
          a.name.toLowerCase().includes(q) || 
          a.key.toLowerCase().includes(q) || 
          (a.description && a.description.toLowerCase().includes(q))
        );
      }
      return result;
    } catch {
      return INITIAL_APPLICATIONS;
    }
  }

  /**
   * Retrieves an application by its unique ID
   */
  static async getById(id: string): Promise<ApplicationDefinition | null> {
    try {
      if (!process.env.DATABASE_URL || !prisma?.application?.findUnique) {
        return INITIAL_APPLICATIONS.find(a => a.id === id) || null;
      }

      const dbApp = await prisma.application.findUnique({
        where: { id },
        include: {
          modules: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (dbApp) return this.mapPrismaToAppDefinition(dbApp);

      return INITIAL_APPLICATIONS.find(a => a.id === id) || null;
    } catch {
      return INITIAL_APPLICATIONS.find(a => a.id === id) || null;
    }
  }

  /**
   * Retrieves an application by its unique key (e.g. 'ECOMMERCE', 'BLOG', 'BLOG_ADS', 'CLASSIFIEDS', etc.)
   */
  static async getByKey(key: string): Promise<ApplicationDefinition | null> {
    try {
      if (!process.env.DATABASE_URL || !prisma?.application?.findUnique) {
        return INITIAL_APPLICATIONS.find(a => a.key.toUpperCase() === key.toUpperCase()) || null;
      }

      const dbApp = await prisma.application.findUnique({
        where: { key: key.toUpperCase() },
        include: {
          modules: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (dbApp) return this.mapPrismaToAppDefinition(dbApp);

      return INITIAL_APPLICATIONS.find(a => a.key.toUpperCase() === key.toUpperCase()) || null;
    } catch {
      return INITIAL_APPLICATIONS.find(a => a.key.toUpperCase() === key.toUpperCase()) || null;
    }
  }

  /**
   * Retrieves an application by its URL slug
   */
  static async getBySlug(slug: string): Promise<ApplicationDefinition | null> {
    try {
      if (!process.env.DATABASE_URL || !prisma?.application?.findUnique) {
        return INITIAL_APPLICATIONS.find(a => a.slug.toLowerCase() === slug.toLowerCase()) || null;
      }

      const dbApp = await prisma.application.findUnique({
        where: { slug: slug.toLowerCase() },
        include: {
          modules: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (dbApp) return this.mapPrismaToAppDefinition(dbApp);

      return INITIAL_APPLICATIONS.find(a => a.slug.toLowerCase() === slug.toLowerCase()) || null;
    } catch {
      return INITIAL_APPLICATIONS.find(a => a.slug.toLowerCase() === slug.toLowerCase()) || null;
    }
  }

  /**
   * Creates a new application in PostgreSQL with defined modules
   */
  static async create(data: {
    key: string;
    name: string;
    slug?: string;
    description?: string;
    category?: string;
    icon?: string;
    version?: string;
    status?: string;
    modules?: Array<{
      key: string;
      name: string;
      description?: string;
      isDefault?: boolean;
    }>;
  }): Promise<ApplicationDefinition> {
    const key = data.key.trim().toUpperCase();
    const slug = (data.slug || key.toLowerCase()).replace(/[^a-z0-9-]/g, '');

    const created = await prisma.application.create({
      data: {
        key,
        name: data.name.trim(),
        slug,
        description: data.description || '',
        category: data.category || 'General',
        icon: data.icon || 'Box',
        version: data.version || '1.0.0',
        status: data.status || 'ACTIVE',
        modules: {
          create: (data.modules || []).map(m => ({
            key: m.key.trim().toLowerCase(),
            name: m.name.trim(),
            description: m.description || '',
            isDefault: m.isDefault ?? true
          }))
        }
      },
      include: {
        modules: true
      }
    });

    return this.mapPrismaToAppDefinition(created);
  }

  /**
   * Updates an existing application and its module configurations in PostgreSQL
   */
  static async update(
    id: string,
    data: {
      name?: string;
      key?: string;
      slug?: string;
      description?: string;
      category?: string;
      icon?: string;
      version?: string;
      status?: string;
      modules?: Array<{
        id?: string;
        key: string;
        name: string;
        description?: string;
        isDefault?: boolean;
      }>;
    }
  ): Promise<ApplicationDefinition | null> {
    const existing = await prisma.application.findUnique({
      where: { id },
      include: { modules: true }
    });

    if (!existing) return null;

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.key !== undefined) updateData.key = data.key.trim().toUpperCase();
    if (data.slug !== undefined) updateData.slug = data.slug.trim().toLowerCase();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.version !== undefined) updateData.version = data.version;
    if (data.status !== undefined) updateData.status = data.status;

    // Execute update in transaction to cleanly synchronize modules
    const updated = await prisma.$transaction(async (tx: any) => {
      await tx.application.update({
        where: { id },
        data: updateData
      });

      if (data.modules && Array.isArray(data.modules)) {
        await tx.applicationModule.deleteMany({
          where: { applicationId: id }
        });

        if (data.modules.length > 0) {
          await tx.applicationModule.createMany({
            data: data.modules.map(m => ({
              applicationId: id,
              key: m.key.trim().toLowerCase(),
              name: m.name.trim(),
              description: m.description || '',
              isDefault: m.isDefault ?? true
            }))
          });
        }
      }

      return tx.application.findUnique({
        where: { id },
        include: { modules: true }
      });
    });

    if (!updated) return null;
    return this.mapPrismaToAppDefinition(updated);
  }

  /**
   * Toggles or sets the active/inactive status of an application in PostgreSQL
   */
  static async toggleStatus(id: string, newStatus?: 'ACTIVE' | 'INACTIVE'): Promise<ApplicationDefinition | null> {
    const existing = await prisma.application.findUnique({
      where: { id },
      include: { modules: true }
    });

    if (!existing) return null;

    const targetStatus = newStatus || (existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');

    const updated = await prisma.application.update({
      where: { id },
      data: { status: targetStatus },
      include: { modules: true }
    });

    return this.mapPrismaToAppDefinition(updated);
  }

  /**
   * Deletes an application from PostgreSQL (cascades to modules)
   */
  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.application.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error(`Error deleting application ${id}:`, error);
      return false;
    }
  }

  /**
   * Adds or updates a single module within an application in PostgreSQL
   */
  static async addModule(
    applicationId: string,
    moduleData: { key: string; name: string; description?: string; isDefault?: boolean }
  ): Promise<ApplicationModuleDef | null> {
    try {
      const mod = await prisma.applicationModule.upsert({
        where: {
          applicationId_key: {
            applicationId,
            key: moduleData.key.trim().toLowerCase()
          }
        },
        update: {
          name: moduleData.name.trim(),
          description: moduleData.description,
          isDefault: moduleData.isDefault ?? true
        },
        create: {
          applicationId,
          key: moduleData.key.trim().toLowerCase(),
          name: moduleData.name.trim(),
          description: moduleData.description,
          isDefault: moduleData.isDefault ?? true
        }
      });

      return {
        id: mod.id,
        applicationId: mod.applicationId,
        key: mod.key,
        name: mod.name,
        description: mod.description || undefined,
        isDefault: mod.isDefault
      };
    } catch (error) {
      console.error('Error adding module:', error);
      return null;
    }
  }

  /**
   * Deletes a module from an application in PostgreSQL
   */
  static async deleteModule(applicationId: string, key: string): Promise<boolean> {
    try {
      await prisma.applicationModule.delete({
        where: {
          applicationId_key: {
            applicationId,
            key: key.toLowerCase()
          }
        }
      });
      return true;
    } catch (error) {
      console.error(`Error deleting module ${key} from app ${applicationId}:`, error);
      return false;
    }
  }

  private static mapPrismaToAppDefinition(dbApp: any): ApplicationDefinition {
    return {
      id: dbApp.id,
      key: dbApp.key as ApplicationTypeKey,
      name: dbApp.name,
      slug: dbApp.slug,
      description: dbApp.description || '',
      category: dbApp.category || 'General',
      status: (dbApp.status || 'ACTIVE') as any,
      icon: dbApp.icon || 'Box',
      version: dbApp.version || '1.0.0',
      modules: (dbApp.modules || []).map((m: any) => ({
        id: m.id,
        applicationId: m.applicationId,
        key: m.key,
        name: m.name,
        description: m.description || undefined,
        isDefault: m.isDefault
      })),
      createdAt: dbApp.createdAt instanceof Date ? dbApp.createdAt.toISOString() : (dbApp.createdAt || new Date().toISOString()),
      updatedAt: dbApp.updatedAt instanceof Date ? dbApp.updatedAt.toISOString() : undefined
    };
  }
}
