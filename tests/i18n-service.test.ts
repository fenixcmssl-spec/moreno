/**
 * =========================================================================
 * FenixCMS SaaS Engine — i18n & Multi-Locale Resolution Test Suite
 * =========================================================================
 * Tests:
 * 1. Automatic browser Accept-Language header detection (IT, ES, EN, FR, DE, PT, HT)
 * 2. Subdomain & custom domain locale extraction
 * 3. Precedence hierarchy (query > cookie > subdomain > header > default)
 * 4. Safe fallback behavior on invalid or missing locales
 * 5. Translation dictionary and currency formatting
 * =========================================================================
 */

import { I18nService, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../lib/services/i18n.service';

export async function runI18nTests() {
  console.log('================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: SERVICIO DE I18N GLOBAL & DETECCIÓN AUTOMÁTICA');
  console.log('================================================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Test assertion failed: ${message}`);
    }
  }

  // 1. Valid Supported Locales
  console.log('📋 [1/5] VALIDACIÓN Y NORMALIZACIÓN DE IDIOMAS SOPORTADOS');
  assert(SUPPORTED_LOCALES.includes('it'), 'Italiano (it) está soportado');
  assert(SUPPORTED_LOCALES.includes('es'), 'Español (es) está soportado');
  assert(SUPPORTED_LOCALES.includes('en'), 'Inglés (en) está soportado');
  assert(SUPPORTED_LOCALES.includes('fr'), 'Francés (fr) está soportado');
  assert(SUPPORTED_LOCALES.includes('de'), 'Alemán (de) está soportado');
  assert(SUPPORTED_LOCALES.includes('pt'), 'Portugués (pt) está soportado');
  assert(SUPPORTED_LOCALES.includes('ht'), 'Criollo Haitiano (ht) está soportado');

  assert(I18nService.normalizeLocale('it-IT') === 'it', 'Normaliza it-IT -> it');
  assert(I18nService.normalizeLocale('ES_es') === 'es', 'Normaliza ES_es -> es');
  assert(I18nService.normalizeLocale('fr-CA') === 'fr', 'Normaliza fr-CA -> fr');
  assert(I18nService.normalizeLocale('de-DE') === 'de', 'Normaliza de-DE -> de');
  assert(I18nService.normalizeLocale('pt-BR') === 'pt', 'Normaliza pt-BR -> pt');
  assert(I18nService.normalizeLocale('invalid-lang', 'es') === 'es', 'Idioma inválido cae al default seguro');

  // 2. Parse Accept-Language Header with Q-Weights
  console.log('📋 [2/5] PARSEO DE CABECERA ACCEPT-LANGUAGE DEL NAVEGADOR');
  const parsed1 = I18nService.parseAcceptLanguage('it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7');
  assert(parsed1[0] === 'it', 'Prioriza primer idioma it de la cabecera');
  assert(parsed1.includes('en'), 'Contiene segundo idioma en');

  const parsed2 = I18nService.parseAcceptLanguage('de-DE,de;q=0.9,fr;q=0.8,es;q=0.5');
  assert(parsed2[0] === 'de', 'Prioriza de cuando tiene mayor q-weight');
  assert(parsed2[1] === 'fr', 'Segundo idioma es fr según q-weight');

  const parsedEmpty = I18nService.parseAcceptLanguage(null);
  assert(parsedEmpty.length === 0, 'Cabecera nula devuelve lista vacía');

  // 3. Subdomain / Domain Language Detection
  console.log('📋 [3/5] DETECCIÓN POR SUBDOMINIO O PREFIJO DE DOMINIO');
  assert(I18nService.detectFromSubdomain('it.tienda-online.com') === 'it', 'Detecta "it" desde subdominio it.tienda-online.com');
  assert(I18nService.detectFromSubdomain('fr.fenixcms.es') === 'fr', 'Detecta "fr" desde fr.fenixcms.es');
  assert(I18nService.detectFromSubdomain('store-de.fenixcms.app') === 'de', 'Detecta "de" desde sufijo store-de');
  assert(I18nService.detectFromSubdomain('pt-boutique.com') === 'pt', 'Detecta "pt" desde prefijo pt-boutique');
  assert(I18nService.detectFromSubdomain('mi-tienda-generica.com') === null, 'Subdominio genérico devuelve null sin forzar error');

  // 4. Multi-Strategy Priority Resolution
  console.log('📋 [4/5] RESOLUCIÓN MULTI-ESTRATEGIA Y JERARQUÍA DE PRECEDENCIA');
  
  // Case A: Query param takes top precedence
  const detectedQuery = I18nService.detectLocale({
    queryLang: 'it',
    cookieLang: 'es',
    host: 'fr.store.com',
    headers: { 'accept-language': 'de-DE,de;q=0.9' }
  });
  assert(detectedQuery === 'it', 'Query param ?lang=it tiene máxima precedencia');

  // Case B: Cookie takes precedence over subdomain & headers
  const detectedCookie = I18nService.detectLocale({
    cookieLang: 'pt',
    host: 'fr.store.com',
    headers: { 'accept-language': 'de-DE,de;q=0.9' }
  });
  assert(detectedCookie === 'pt', 'Cookie fenix_locale=pt prevalece sobre subdominio y cabeceras');

  // Case C: Subdomain takes precedence over browser header
  const detectedSubdomain = I18nService.detectLocale({
    host: 'it.mybusiness.com',
    headers: { 'accept-language': 'de-DE,de;q=0.9' }
  });
  assert(detectedSubdomain === 'it', 'Subdominio it.* prevalece sobre Accept-Language del navegador');

  // Case D: Browser Accept-Language used when no higher rule matches
  const detectedHeader = I18nService.detectLocale({
    host: 'fenixcms.es',
    headers: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' }
  });
  assert(detectedHeader === 'fr', 'Navegador con fr-FR resuelve fr automáticamente');

  // Case E: Default fallback when nothing is provided
  const detectedDefault = I18nService.detectLocale({});
  assert(detectedDefault === DEFAULT_LOCALE, `Sin información resuelve default ${DEFAULT_LOCALE}`);

  // 5. Dictionary & Currency Formatting
  console.log('📋 [5/5] MENSAJES Y FORMATEO DE MONEDA POR LOCALE');
  const msgIt = I18nService.t('it', 'nav.products');
  assert(typeof msgIt === 'string' && msgIt.length > 0, 'Obtiene traducción en italiano');

  const formattedIt = I18nService.formatCurrency(79.99, 'it', 'EUR');
  assert(formattedIt.includes('79,99') || formattedIt.includes('79.99') || formattedIt.includes('€'), 'Formatea importe en italiano con símbolo de moneda');

  const formattedDe = I18nService.formatCurrency(120.50, 'de', 'EUR');
  assert(formattedDe.includes('120') && formattedDe.includes('€'), 'Formatea importe en alemán');

  console.log('================================================================================');
  console.log(`🎉 TODOS LOS ${passed}/${total} TESTS DE I18N COMPLETADOS CON ÉXITO`);
  console.log('================================================================================');
}
