import { prisma, isPostgresConfigured, isProductionMode, DatabaseConfigurationError } from '@/lib/prisma';
import { ApplicationDefinition, ApplicationModuleDef, ApplicationTypeKey } from '@/types';
import { INITIAL_APPLICATIONS } from '@/lib/initialData';

export class ApplicationService {
  /**
   * Maps Prisma Application to ApplicationDefinition interface
   */
  public static mapPrismaToAppDefinition(app: any): ApplicationDefinition {
    const modulesList: ApplicationModuleDef[] = (app.modules || []).map((m: any) => ({
      key: m.key,
      name: m.name,
      description: m.description || '',
      isDefault: Boolean(m.isDefault)
    }));

    return {
      id: app.id,
      key: app.key as ApplicationTypeKey,
      name: app.name,
      slug: app.slug,
      description: app.description || '',
      category: app.category || 'General',
      icon: app.icon || 'Box',
      version: app.version || '1.0.0',
      status: (app.status || 'ACTIVE').toUpperCase() as any,
      modules: modulesList,
      createdAt: app.createdAt ? new Date(app.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: app.updatedAt ? new Date(app.updatedAt).toISOString() : new Date().toISOString()
    };
  }

  /**
   * Retrieves all applications from PostgreSQL with their available modules included
   */
  static async getAll(options?: { status?: string; search?: string }): Promise<ApplicationDefinition[]> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.application?.findMany) {
      const where: any = {};
      if (options?.status) {
        where.status = options.status.toUpperCase();
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

      // If database is empty and we are in production, return empty list (no fake data)
      if (isProductionMode()) {
        return [];
      }
    }

    // Development/Test fallback only when postgres not configured
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

  /**
   * Retrieves an application by its unique ID
   */
  static async getById(id: string): Promise<ApplicationDefinition | null> {
    if (!id) return null;

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.application?.findUnique) {
      const dbApp = await prisma.application.findUnique({
        where: { id },
        include: {
          modules: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (dbApp) return this.mapPrismaToAppDefinition(dbApp);

      if (isProductionMode()) {
        return null;
      }
    }

    return INITIAL_APPLICATIONS.find(a => a.id === id) || null;
  }

  /**
   * Retrieves an application by its unique key (e.g. 'ECOMMERCE', 'BLOG', 'BLOG_ADS', 'CLASSIFIEDS')
   */
  static async getByKey(key: string): Promise<ApplicationDefinition | null> {
    if (!key) return null;
    const cleanKey = key.trim().toUpperCase();

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.application?.findUnique) {
      const dbApp = await prisma.application.findUnique({
        where: { key: cleanKey },
        include: {
          modules: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (dbApp) return this.mapPrismaToAppDefinition(dbApp);

      if (isProductionMode()) {
        return null;
      }
    }

    return INITIAL_APPLICATIONS.find(a => a.key.toUpperCase() === cleanKey) || null;
  }

  /**
   * Retrieves an application by its URL slug
   */
  static async getBySlug(slug: string): Promise<ApplicationDefinition | null> {
    if (!slug) return null;
    const cleanSlug = slug.trim().toLowerCase();

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.application?.findUnique) {
      const dbApp = await prisma.application.findUnique({
        where: { slug: cleanSlug },
        include: {
          modules: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (dbApp) return this.mapPrismaToAppDefinition(dbApp);

      if (isProductionMode()) {
        return null;
      }
    }

    return INITIAL_APPLICATIONS.find(a => a.slug.toLowerCase() === cleanSlug) || null;
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
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    const key = data.key.trim().toUpperCase();
    const slug = (data.slug || key.toLowerCase()).replace(/[^a-z0-9-]/g, '');

    if (isPostgresConfigured() && prisma?.application?.create) {
      const created = await prisma.application.create({
        data: {
          key,
          name: data.name.trim(),
          slug,
          description: data.description || '',
          category: data.category || 'General',
          icon: data.icon || 'Box',
          version: data.version || '1.0.0',
          status: (data.status || 'ACTIVE').toUpperCase(),
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

    throw new DatabaseConfigurationError('Database is not available for application creation.');
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
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.application) {
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
      if (data.status !== undefined) updateData.status = data.status.toUpperCase();

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

      return updated ? this.mapPrismaToAppDefinition(updated) : null;
    }

    return null;
  }

  /**
   * Adds an individual module to an existing application
   */
  static async addModule(
    applicationId: string,
    moduleData: {
      key: string;
      name: string;
      description?: string;
      isDefault?: boolean;
    }
  ): Promise<ApplicationModuleDef & { id: string } | null> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.applicationModule?.create) {
      const created = await prisma.applicationModule.create({
        data: {
          applicationId,
          key: moduleData.key.trim().toLowerCase(),
          name: moduleData.name.trim(),
          description: moduleData.description || '',
          isDefault: moduleData.isDefault ?? true
        }
      });

      return {
        id: created.id,
        applicationId: created.applicationId,
        key: created.key,
        name: created.name,
        description: created.description || '',
        isDefault: Boolean(created.isDefault)
      };
    }

    return null;
  }

  /**
   * Deletes a module from an application by its key
   */
  static async deleteModule(applicationId: string, moduleKey: string): Promise<boolean> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.applicationModule?.deleteMany) {
      const res = await prisma.applicationModule.deleteMany({
        where: {
          applicationId,
          key: moduleKey.trim().toLowerCase()
        }
      });
      return res.count > 0;
    }

    return false;
  }

  /**
   * Toggles or updates the status of an application in PostgreSQL
   */
  static async toggleStatus(id: string, targetStatus?: 'ACTIVE' | 'INACTIVE'): Promise<ApplicationDefinition | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const newStatus = targetStatus || (existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
    return this.update(id, { status: newStatus });
  }

  /**
   * Deletes an application from PostgreSQL
   */
  static async delete(id: string): Promise<boolean> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.application?.delete) {
      await prisma.application.delete({
        where: { id }
      });
      return true;
    }

    return false;
  }
}
