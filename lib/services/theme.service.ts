import { ThemeBlockSection, ApplicationTypeKey } from '@/types';
import prisma from '@/lib/prisma';
import { AuditService } from './audit.service';

export interface ThemeRecord {
  id: string;
  key: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  author: string;
  applicationScope?: ApplicationTypeKey | 'ALL';
  previewImage?: string;
  sections: ThemeBlockSection[];
  palette: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    accent: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  isActive?: boolean;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemeDraftState {
  themeId: string;
  tenantId: string;
  sections: ThemeBlockSection[];
  palette?: Record<string, string>;
  typography?: Record<string, string>;
  lastSavedAt: string;
  isPublished: boolean;
}

const DEFAULT_SECTIONS: ThemeBlockSection[] = [
  { id: 'sec_hero_1', type: 'hero_banner', name: 'Hero Banner Principal', isEnabled: true, order: 0, settings: {} },
  { id: 'sec_feat_1', type: 'featured_products', name: 'Productos Destacados', isEnabled: true, order: 1, settings: {} },
  { id: 'sec_cat_1', type: 'category_grid', name: 'Categorías Destacadas', isEnabled: true, order: 2, settings: {} }
];

const DEFAULT_PALETTE = {
  primary: '#131921',
  secondary: '#232f3e',
  background: '#ffffff',
  surface: '#f8fafc',
  accent: '#febd69',
  text: '#0f172a'
};

const DEFAULT_TYPOGRAPHY = {
  headingFont: 'Plus Jakarta Sans, sans-serif',
  bodyFont: 'Inter, sans-serif'
};

export class ThemeService {
  /**
   * Converts Prisma Theme model to ThemeRecord
   */
  private static mapToRecord(t: any): ThemeRecord {
    const rawPalette = typeof t.palette === 'object' && t.palette !== null ? t.palette : {};
    const rawTypography = typeof t.typography === 'object' && t.typography !== null ? t.typography : {};
    const rawSections = Array.isArray(t.sections) && t.sections.length > 0 ? t.sections : DEFAULT_SECTIONS;

    return {
      id: t.id,
      key: t.key,
      name: t.name,
      slug: t.slug || t.name.toLowerCase().replace(/\s+/g, '-'),
      description: t.description || '',
      version: t.version || '1.0.0',
      author: t.author || 'Fenix Team',
      applicationScope: 'ECOMMERCE',
      previewImage: (t.layout as any)?.previewImage || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&q=80',
      sections: rawSections as ThemeBlockSection[],
      palette: {
        primary: rawPalette.primary || DEFAULT_PALETTE.primary,
        secondary: rawPalette.secondary || DEFAULT_PALETTE.secondary,
        background: rawPalette.background || DEFAULT_PALETTE.background,
        surface: rawPalette.surface || DEFAULT_PALETTE.surface,
        accent: rawPalette.accent || DEFAULT_PALETTE.accent,
        text: rawPalette.text || DEFAULT_PALETTE.text
      },
      typography: {
        headingFont: rawTypography.headingFont || DEFAULT_TYPOGRAPHY.headingFont,
        bodyFont: rawTypography.bodyFont || DEFAULT_TYPOGRAPHY.bodyFont
      },
      isActive: t.isActive || false,
      isPublished: true,
      createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: t.updatedAt ? t.updatedAt.toISOString() : new Date().toISOString()
    };
  }

  /**
   * Lists all available themes in the global/tenant catalog
   */
  static async getAllThemes(options?: { tenantId?: string; search?: string }): Promise<ThemeRecord[]> {
    try {
      const whereClause: any = {};
      if (options?.search) {
        whereClause.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { key: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } }
        ];
      }

      const themes = await prisma.theme.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' }
      });

      return (themes || []).map((t: any) => this.mapToRecord(t));
    } catch (error) {
      console.error('[ThemeService] Error fetching themes from PostgreSQL:', error);
      return [];
    }
  }

  /**
   * Retrieves single theme by id or key
   */
  static async getThemeById(idOrKey: string): Promise<ThemeRecord | null> {
    if (!idOrKey) return null;

    try {
      const theme = await prisma.theme.findFirst({
        where: {
          OR: [{ id: idOrKey }, { key: idOrKey }]
        }
      });

      if (!theme) return null;
      return this.mapToRecord(theme);
    } catch (error) {
      console.error(`[ThemeService] Error fetching theme ${idOrKey}:`, error);
      return null;
    }
  }

  /**
   * Creates a new Theme record in PostgreSQL
   */
  static async createTheme(data: {
    tenantId: string;
    key: string;
    name: string;
    slug?: string;
    description?: string;
    version?: string;
    author?: string;
    palette?: Record<string, string>;
    typography?: Record<string, string>;
    layout?: any;
    sections?: ThemeBlockSection[];
  }): Promise<ThemeRecord> {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const created = await prisma.theme.create({
      data: {
        tenantId: data.tenantId,
        key: data.key,
        name: data.name,
        slug,
        description: data.description || null,
        version: data.version || '1.0.0',
        author: data.author || 'Fenix Team',
        palette: (data.palette || DEFAULT_PALETTE) as any,
        typography: (data.typography || DEFAULT_TYPOGRAPHY) as any,
        layout: (data.layout || {}) as any,
        sections: (data.sections || DEFAULT_SECTIONS) as any,
        isActive: false
      }
    });

    return this.mapToRecord(created);
  }

  /**
   * Updates an existing theme
   */
  static async updateTheme(id: string, updates: Partial<any>): Promise<ThemeRecord | null> {
    try {
      const updated = await prisma.theme.update({
        where: { id },
        data: updates
      });
      return this.mapToRecord(updated);
    } catch (error) {
      return null;
    }
  }

  /**
   * Deletes a theme
   */
  static async deleteTheme(id: string): Promise<boolean> {
    try {
      await prisma.theme.delete({ where: { id } });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retrieves active theme record for a tenant, applying any custom published modifications
   */
  static async getActiveTheme(tenantId: string): Promise<ThemeRecord | null> {
    if (!tenantId) return null;

    try {
      const installation = await prisma.themeInstallation.findFirst({
        where: { tenantId, isActive: true },
        include: { theme: true }
      });

      if (installation && installation.theme) {
        const base = this.mapToRecord(installation.theme);
        const customProps = typeof installation.customProps === 'object' && installation.customProps !== null
          ? (installation.customProps as any)
          : null;

        if (customProps) {
          if (customProps.sections && Array.isArray(customProps.sections)) {
            base.sections = customProps.sections;
          }
          if (customProps.palette) {
            base.palette = { ...base.palette, ...customProps.palette };
          }
          if (customProps.typography) {
            base.typography = { ...base.typography, ...customProps.typography };
          }
        }
        return base;
      }

      // Fallback to first available theme
      const firstTheme = await prisma.theme.findFirst({ orderBy: { createdAt: 'asc' } });
      if (firstTheme) {
        return this.mapToRecord(firstTheme);
      }
      return null;
    } catch (error) {
      console.error(`[ThemeService] Error fetching active theme for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Retrieves active theme identifier (key or ID) for a tenant
   */
  static async getActiveThemeId(tenantId: string): Promise<string> {
    if (!tenantId) return 'theme_fenix_market';

    try {
      const installation = await prisma.themeInstallation.findFirst({
        where: { tenantId, isActive: true },
        include: { theme: true }
      });

      if (installation && installation.theme) {
        return installation.theme.key || installation.theme.id;
      }

      const firstTheme = await prisma.theme.findFirst({ orderBy: { createdAt: 'asc' } });
      return firstTheme ? (firstTheme.key || firstTheme.id) : 'theme_fenix_market';
    } catch (error) {
      return 'theme_fenix_market';
    }
  }

  /**
   * Enforces single active theme per tenant in PostgreSQL
   */
  static async setActiveTheme(tenantId: string, themeIdOrKey: string): Promise<boolean> {
    if (!tenantId || !themeIdOrKey) return false;

    try {
      const targetTheme = await prisma.theme.findFirst({
        where: {
          OR: [{ id: themeIdOrKey }, { key: themeIdOrKey }]
        }
      });

      if (!targetTheme) return false;

      // In a transaction: deactivate all existing themes for this tenant, then activate target
      await prisma.$transaction([
        prisma.themeInstallation.updateMany({
          where: { tenantId },
          data: { isActive: false }
        }),
        prisma.themeInstallation.upsert({
          where: {
            tenantId_themeId: {
              tenantId,
              themeId: targetTheme.id
            }
          },
          update: {
            isActive: true
          },
          create: {
            tenantId,
            themeId: targetTheme.id,
            isActive: true
          }
        })
      ]);

      AuditService.log({
        tenantId,
        action: 'THEME_ACTIVATED',
        entity: 'Theme',
        entityId: targetTheme.id,
        details: { key: targetTheme.key, name: targetTheme.name }
      });

      return true;
    } catch (error) {
      console.error(`[ThemeService] Error setting active theme for tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Theme Builder: saves a working draft into PostgreSQL
   */
  static async saveDraft(
    tenantId: string,
    draftOrThemeId: Partial<ThemeDraftState> | string,
    sections?: ThemeBlockSection[]
  ): Promise<ThemeDraftState> {
    let targetThemeId: string;
    let secList: ThemeBlockSection[] = [];
    let palette: any;
    let typography: any;

    if (typeof draftOrThemeId === 'string') {
      targetThemeId = draftOrThemeId;
      secList = sections || [];
    } else {
      targetThemeId = draftOrThemeId.themeId || (await this.getActiveThemeId(tenantId));
      secList = draftOrThemeId.sections || [];
      palette = draftOrThemeId.palette;
      typography = draftOrThemeId.typography;
    }

    const theme = await this.getThemeById(targetThemeId);
    const resolvedThemeId = theme ? theme.id : targetThemeId;

    if (secList.length === 0 && theme?.sections) {
      secList = theme.sections;
    }

    const draftState: ThemeDraftState = {
      tenantId,
      themeId: targetThemeId,
      sections: secList,
      palette: palette || theme?.palette,
      typography: typography || theme?.typography,
      lastSavedAt: new Date().toISOString(),
      isPublished: false
    };

    if (theme) {
      await prisma.themeInstallation.upsert({
        where: {
          tenantId_themeId: {
            tenantId,
            themeId: resolvedThemeId
          }
        },
        update: {
          draftProps: draftState as any
        },
        create: {
          tenantId,
          themeId: resolvedThemeId,
          draftProps: draftState as any,
          isActive: false
        }
      });
    }

    return draftState;
  }

  /**
   * Theme Builder: retrieves saved draft for tenant
   */
  static async getDraft(tenantId: string, themeId?: string): Promise<ThemeDraftState | null> {
    if (!tenantId) return null;

    try {
      const whereClause: any = { tenantId };
      if (themeId) {
        const theme = await this.getThemeById(themeId);
        if (theme) {
          whereClause.themeId = theme.id;
        }
      } else {
        whereClause.isActive = true;
      }

      const installation = await prisma.themeInstallation.findFirst({
        where: whereClause
      });

      if (installation && installation.draftProps && typeof installation.draftProps === 'object') {
        return installation.draftProps as unknown as ThemeDraftState;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Theme Builder: publishes the draft to live production in PostgreSQL
   */
  static async publishDraft(
    tenantId: string,
    themeId?: string
  ): Promise<{ success: boolean; isPublished: boolean; theme?: ThemeRecord | null }> {
    try {
      const targetThemeKeyOrId = themeId || (await this.getActiveThemeId(tenantId));
      const theme = await this.getThemeById(targetThemeKeyOrId);

      if (!theme) {
        return { success: false, isPublished: false };
      }

      const installation = await prisma.themeInstallation.findUnique({
        where: {
          tenantId_themeId: {
            tenantId,
            themeId: theme.id
          }
        }
      });

      const draft = installation?.draftProps as unknown as ThemeDraftState | undefined;
      const customPropsToSave = {
        sections: draft?.sections || theme.sections,
        palette: draft?.palette || theme.palette,
        typography: draft?.typography || theme.typography,
        publishedAt: new Date().toISOString()
      };

      const updatedDraft = draft
        ? { ...draft, isPublished: true, lastSavedAt: new Date().toISOString() }
        : {
            tenantId,
            themeId: theme.id,
            sections: theme.sections,
            palette: theme.palette,
            typography: theme.typography,
            lastSavedAt: new Date().toISOString(),
            isPublished: true
          };

      await prisma.themeInstallation.upsert({
        where: {
          tenantId_themeId: {
            tenantId,
            themeId: theme.id
          }
        },
        update: {
          customProps: customPropsToSave as any,
          draftProps: updatedDraft as any,
          isActive: true
        },
        create: {
          tenantId,
          themeId: theme.id,
          customProps: customPropsToSave as any,
          draftProps: updatedDraft as any,
          isActive: true
        }
      });

      AuditService.log({
        tenantId,
        action: 'THEME_BUILDER_PUBLISHED',
        entity: 'Theme',
        entityId: theme.id,
        details: { sectionsCount: customPropsToSave.sections.length }
      });

      const publishedTheme: ThemeRecord = {
        ...theme,
        sections: customPropsToSave.sections,
        palette: { ...theme.palette, ...(customPropsToSave.palette || {}) },
        typography: { ...theme.typography, ...(customPropsToSave.typography || {}) },
        isPublished: true
      };

      return { success: true, isPublished: true, theme: publishedTheme };
    } catch (error) {
      console.error(`[ThemeService] Error publishing draft for tenant ${tenantId}:`, error);
      return { success: false, isPublished: false };
    }
  }
}

