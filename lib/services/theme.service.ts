import { ThemeBlockSection, ApplicationTypeKey } from '@/types';
import { AuditService } from './audit.service';
import { INITIAL_THEMES } from '../initialData';

export interface ThemeRecord {
  id: string;
  key: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  author: string;
  applicationScope: ApplicationTypeKey | 'ALL';
  previewImage: string;
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
  isPublished: boolean;
  createdAt: string;
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

const THEMES_REGISTRY: ThemeRecord[] = INITIAL_THEMES.map(t => ({
  id: t.id,
  key: t.id,
  name: t.name,
  slug: t.name.toLowerCase().replace(/\s+/g, '-'),
  description: t.description,
  version: t.version || '1.0.0',
  author: 'Fenix Studio',
  applicationScope: (t.applicationScope as ApplicationTypeKey) || 'ECOMMERCE',
  previewImage: t.previewImage,
  sections: t.sections || [],
  palette: {
    primary: t.palette?.primary || t.colors?.primary || '#3b82f6',
    secondary: t.palette?.secondary || t.colors?.secondary || '#1e293b',
    background: t.palette?.background || t.colors?.background || '#ffffff',
    surface: t.palette?.surface || t.colors?.surface || '#f8fafc',
    accent: t.colors?.accent || '#f59e0b',
    text: t.palette?.text || t.colors?.text || '#0f172a'
  },
  typography: {
    headingFont: t.typography?.headingFont || 'Plus Jakarta Sans',
    bodyFont: t.typography?.bodyFont || 'Inter'
  },
  isPublished: true,
  createdAt: '2026-01-01T00:00:00Z'
}));

const ACTIVE_THEMES_BY_TENANT = new Map<string, string>(); // tenantId -> active themeId
const DRAFTS_BY_TENANT = new Map<string, ThemeDraftState>();

export class ThemeService {
  static getAllThemes(): ThemeRecord[] {
    return THEMES_REGISTRY;
  }

  static getThemeById(id: string): ThemeRecord | undefined {
    return THEMES_REGISTRY.find(t => t.id === id);
  }

  /**
   * Enforces single active theme per tenant (Point 15)
   */
  static setActiveTheme(tenantId: string, themeId: string): boolean {
    const theme = this.getThemeById(themeId);
    if (!theme) return false;

    ACTIVE_THEMES_BY_TENANT.set(tenantId, themeId);

    AuditService.log({
      tenantId,
      action: 'THEME_ACTIVATED',
      entity: 'Theme',
      entityId: themeId,
      details: { name: theme.name, version: theme.version }
    });

    return true;
  }

  static getActiveThemeId(tenantId: string): string {
    return ACTIVE_THEMES_BY_TENANT.get(tenantId) || THEMES_REGISTRY[0]?.id || 'theme_modern_minimal';
  }

  /**
   * Theme Builder: saves a working draft (Point 16)
   */
  static saveDraft(tenantId: string, draft: Partial<ThemeDraftState>): ThemeDraftState {
    const existing = DRAFTS_BY_TENANT.get(tenantId);
    const themeId = draft.themeId || existing?.themeId || this.getActiveThemeId(tenantId);
    const currentTheme = this.getThemeById(themeId);

    const updatedDraft: ThemeDraftState = {
      tenantId,
      themeId,
      sections: draft.sections || existing?.sections || currentTheme?.sections || [],
      palette: draft.palette || existing?.palette || currentTheme?.palette,
      typography: draft.typography || existing?.typography || currentTheme?.typography,
      lastSavedAt: new Date().toISOString(),
      isPublished: false
    };

    DRAFTS_BY_TENANT.set(tenantId, updatedDraft);
    return updatedDraft;
  }

  /**
   * Theme Builder: publishes the draft to live production (Point 16)
   */
  static publishDraft(tenantId: string): { success: boolean; theme?: ThemeRecord } {
    const draft = DRAFTS_BY_TENANT.get(tenantId);
    if (!draft) return { success: false };

    const theme = this.getThemeById(draft.themeId);
    if (theme) {
      theme.sections = draft.sections;
      if (draft.palette) theme.palette = { ...theme.palette, ...draft.palette } as any;
      if (draft.typography) theme.typography = { ...theme.typography, ...draft.typography } as any;
    }

    draft.isPublished = true;
    draft.lastSavedAt = new Date().toISOString();
    DRAFTS_BY_TENANT.set(tenantId, draft);

    AuditService.log({
      tenantId,
      action: 'THEME_BUILDER_PUBLISHED',
      entity: 'Theme',
      entityId: draft.themeId,
      details: { sectionsCount: draft.sections.length }
    });

    return { success: true, theme };
  }

  static getDraft(tenantId: string): ThemeDraftState | undefined {
    return DRAFTS_BY_TENANT.get(tenantId);
  }
}
