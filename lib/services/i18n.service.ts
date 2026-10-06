/**
 * =========================================================================
 * FenixCMS SaaS Engine — Global i18n & Multi-Locale Resolution Service
 * =========================================================================
 * Comprehensive internationalization service with automatic detection:
 * 1. User cookie / query override
 * 2. Tenant / Subdomain locale prefix
 * 3. Browser Accept-Language header weighted parsing (RFC 4647/2616)
 * 4. Safe fallback to default locale (IT, ES, EN, FR, DE, PT, HT)
 * =========================================================================
 */

import { SupportedLocale } from '@/types';
import { DICTIONARY, LANGUAGES } from '@/lib/i18n';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  'it',
  'es',
  'en',
  'fr',
  'de',
  'pt',
  'ht'
] as const;

export const DEFAULT_LOCALE: SupportedLocale = 'es';

export interface LocaleDetectionOptions {
  headers?: Headers | Record<string, string | string[] | undefined> | null;
  host?: string | null;
  subdomain?: string | null;
  queryLang?: string | null;
  cookieLang?: string | null;
  tenantDefaultLocale?: string | null;
}

export class I18nService {
  /**
   * Validates whether an arbitrary string matches a supported locale
   */
  static isSupportedLocale(locale: unknown): locale is SupportedLocale {
    if (typeof locale !== 'string') return false;
    const clean = locale.toLowerCase().trim();
    return (SUPPORTED_LOCALES as readonly string[]).includes(clean);
  }

  /**
   * Normalizes any locale string to a valid SupportedLocale or fallback
   */
  static normalizeLocale(locale: unknown, fallback: SupportedLocale = DEFAULT_LOCALE): SupportedLocale {
    if (typeof locale !== 'string') return fallback;
    const clean = locale.toLowerCase().trim();
    
    // Exact 2-letter match
    if (this.isSupportedLocale(clean)) {
      return clean;
    }
    
    // Prefix match (e.g., 'it-IT' -> 'it', 'es-ES' -> 'es', 'en-US' -> 'en')
    const prefix = clean.split(/[-_]/)[0];
    if (this.isSupportedLocale(prefix)) {
      return prefix;
    }

    return fallback;
  }

  /**
   * Parses standard HTTP Accept-Language headers with quality weights (e.g., 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7')
   */
  static parseAcceptLanguage(acceptLanguageHeader: string | null | undefined): SupportedLocale[] {
    if (!acceptLanguageHeader || typeof acceptLanguageHeader !== 'string') {
      return [];
    }

    const items = acceptLanguageHeader
      .split(',')
      .map(part => {
        const [langPart, qPart] = part.trim().split(';');
        const quality = qPart && qPart.startsWith('q=') ? parseFloat(qPart.slice(2)) : 1.0;
        const normalized = this.normalizeLocale(langPart, null as any);
        return {
          locale: normalized,
          quality: isNaN(quality) ? 0 : quality
        };
      })
      .filter(item => item.locale !== null && !isNaN(item.quality) && item.quality > 0)
      .sort((a, b) => b.quality - a.quality);

    // Return unique ordered locales
    const seen = new Set<SupportedLocale>();
    const result: SupportedLocale[] = [];
    for (const item of items) {
      if (!seen.has(item.locale)) {
        seen.add(item.locale);
        result.push(item.locale);
      }
    }

    return result;
  }

  /**
   * Detects locale from subdomain or host prefix (e.g., 'it.store.com', 'it-store.fenixcms.es', 'de.fenixcms.app')
   */
  static detectFromSubdomain(hostOrSlug: string | null | undefined): SupportedLocale | null {
    if (!hostOrSlug || typeof hostOrSlug !== 'string') return null;

    const clean = hostOrSlug.toLowerCase().trim().replace(/^https?:\/\//, '').split(':')[0];
    const parts = clean.split('.');

    // Check if the first subdomain part is a supported locale (e.g. 'it.fenixcms.es' or 'fr.client.com')
    if (parts.length > 1) {
      const firstSubdomain = parts[0];
      if (this.isSupportedLocale(firstSubdomain)) {
        return firstSubdomain;
      }
    }

    // Check hyphen-separated slug prefix or suffix (e.g. 'store-it', 'it-boutique')
    const slugParts = parts[0].split('-');
    if (slugParts.length > 1) {
      if (this.isSupportedLocale(slugParts[0])) {
        return slugParts[0];
      }
      const lastPart = slugParts[slugParts.length - 1];
      if (this.isSupportedLocale(lastPart)) {
        return lastPart;
      }
    }

    return null;
  }

  /**
   * Multi-strategy global detection resolving highest-priority candidate
   */
  static detectLocale(options: LocaleDetectionOptions): SupportedLocale {
    // 1. Explicit Query Parameter (highest precedence for immediate preview/switch)
    if (options.queryLang && this.isSupportedLocale(options.queryLang)) {
      return this.normalizeLocale(options.queryLang);
    }

    // 2. Cookie Selection (user explicit session preference)
    if (options.cookieLang && this.isSupportedLocale(options.cookieLang)) {
      return this.normalizeLocale(options.cookieLang);
    }

    // 3. Subdomain / Domain language prefix
    const subdomainLocale = this.detectFromSubdomain(options.subdomain || options.host);
    if (subdomainLocale) {
      return subdomainLocale;
    }

    // 4. Tenant Configured Default Locale (if provided via tenant settings)
    if (options.tenantDefaultLocale && this.isSupportedLocale(options.tenantDefaultLocale)) {
      return this.normalizeLocale(options.tenantDefaultLocale);
    }

    // 5. Browser Accept-Language Header
    let acceptHeader: string | null = null;
    if (options.headers) {
      if (typeof (options.headers as Headers).get === 'function') {
        acceptHeader = (options.headers as Headers).get('accept-language');
      } else if (typeof options.headers === 'object') {
        const h = options.headers as Record<string, string | string[] | undefined>;
        const raw = h['accept-language'] || h['Accept-Language'];
        acceptHeader = Array.isArray(raw) ? raw.join(',') : (raw || null);
      }
    }

    const browserLocales = this.parseAcceptLanguage(acceptHeader);
    if (browserLocales.length > 0) {
      return browserLocales[0];
    }

    // 6. Safe System Default Fallback
    return DEFAULT_LOCALE;
  }

  /**
   * Retrieves full translation dictionary for a given locale
   */
  static getMessages(locale: SupportedLocale): Record<string, string> {
    const validLocale = this.normalizeLocale(locale);
    return DICTIONARY[validLocale] || DICTIONARY.es;
  }

  /**
   * Translates a specific key with interpolation and safe fallback
   */
  static t(locale: SupportedLocale, key: string, params?: Record<string, string | number>): string {
    const messages = this.getMessages(locale);
    let text = messages[key] || DICTIONARY.es[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }

    return text;
  }

  /**
   * Formats a monetary amount according to the target locale and currency
   */
  static formatCurrency(amount: number, locale: SupportedLocale, currency: string = 'EUR'): string {
    const localeMap: Record<SupportedLocale, string> = {
      es: 'es-ES',
      it: 'it-IT',
      en: 'en-US',
      fr: 'fr-FR',
      de: 'de-DE',
      pt: 'pt-PT',
      ht: 'fr-HT'
    };

    const intlLocale = localeMap[locale] || 'es-ES';
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Returns metadata for all supported languages with native names and flags
   */
  static getSupportedLanguages() {
    return LANGUAGES;
  }
}
