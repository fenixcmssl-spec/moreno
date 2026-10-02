# FENIXCMS_3 - PLAN INTEGRAL DE IMPLEMENTACION Y PRODUCCION

## 1. Introducción

Este documento consolida el Plan Maestro FenixCMS (FASES 0-23), las mejoras adicionales (FASES 24-44)
y las correcciones urgentes identificadas en las revisiones actuales del repositorio GitHub fenixcmssl-spec/moreno.
Su objetivo es servir como documento único de trabajo para AI Studio y para la validación posterior en Debian,
GitHub y VPS.

REGLA OPERATIVA: UNA FASE -> UNA IMPLEMENTACION -> UNA VALIDACION -> UN COMMIT -> SOLO DESPUES LA SIGUIENTE.

PRINCIPIOS:
- PostgreSQL/Prisma es la fuente de verdad en producción.
- El frontend no es autoridad de precios, licencias, entitlements, tenant, pagos ni persistencia.
- Sin pago capturado y validado no existe provisioning.
- Los fallbacks de memoria quedan limitados a tests/dev controlado.
- No se declara PASS una prueba que no se haya ejecutado realmente.
- Un CRUD sólo está terminado cuando la mutación persiste y puede comprobarse desde otra sesión/proceso.
- Un plugin/tema sólo está instalado cuando paquete, manifest, entitlement, persistencia y seguridad están validados.
- Producción se despliega únicamente desde un commit de GitHub que haya pasado CI y aceptación.

## 2. Arquitectura objetivo

PORTAL SAAS / VENTA DE LICENCIAS
    |
    +-- Application
    +-- Plan
    +-- Entitlements
    +-- CheckoutSession
    +-- PayPal Order/Capture
    +-- Payment
    +-- Tenant
    +-- License
    +-- Subscription
    +-- Invoice

TENANT CMS / USO DE LA LICENCIA
    |
    +-- hostname -> tenant
    +-- session -> membership/role
    +-- entitlements -> capabilities
    +-- products/orders/pages/blog/media
    +-- themes/plugins
    +-- domains/branding/locales
    +-- storefront

PRINCIPIO: los dos bloques estan separados funcionalmente y ambos terminan en PostgreSQL.

## 3. Orden de dependencias

0-3: Baseline, reconciliación, persistencia y seguridad base.
4-7: Catálogo, planes, licencias y provisioning.
8-10: Venta SaaS, pagos y Super Admin.
11-14: Persistencia del CMS, media y branding.
15-18: Temas, plugins, marketplace y dominios.
19-23: Idiomas, storefront, completitud CMS, SEO y observabilidad.
24-30: Endurecimiento avanzado, CheckoutSession, PayPal, webhooks y atomicidad.
31-35: Checkout tienda, storage, paquetes, auth/rate-limit y eliminación de demo.
36-40: Super Admin persistente, DB, PostgreSQL, CI/CD y toolchain.
41-44: Observabilidad, privacidad, rendimiento, aceptación y go-live.

## 4. Fases 0-44 (Resumen e Implementación de Referencia)

### FASE 0 - Auditoría de referencia y congelación del alcance
### FASE 1 - Reconciliación AI Studio / Debian / GitHub
### FASE 2 - PostgreSQL como única fuente de verdad
### FASE 3 - Aislamiento multi-tenant, autenticación y RBAC
### FASE 4 - Catálogo de aplicaciones y módulos
### FASE 5 - Planes, precios y matriz de entitlements
### FASE 6 - Motor de ciclo de vida de licencias
### FASE 7 - Provisionamiento atómico del tenant
### FASE 8 - Checkout público SaaS y compra de licencia
### FASE 9 - Webhooks, pagos, suscripciones y facturación
### FASE 10 - Consola Super Admin persistente
### FASE 11 - Eliminar falsa persistencia del StoreContext
### FASE 12 - CRUD completo del tenant CMS
### FASE 13 - Mediateca y almacenamiento persistente
### FASE 14 - Branding dinámico: logo, logo móvil y favicon
### FASE 15 - Motor de temas y constructor visual
### FASE 16 - Motor de plugins
### FASE 17 - Marketplace persistente de plugins y temas
### FASE 18 - Dominios, subdominios, custom domains y SSL
### FASE 19 - Sistema multidioma + Haitian Creole
### FASE 20 - Resolución del storefront y coherencia de licencia
### FASE 21 - Auditoría de completitud CMS: páginas, menús, reseñas y contenido
### FASE 22 - SEO, sitemap y metadata por tenant
### FASE 23 - Auditoría, logs y observabilidad operativa
### FASE 24 - Resolver tenant exclusivamente por contexto confiable
### FASE 25 - Prisma fail-closed para modelos tenant-scoped
### FASE 26 - Contratos API y Zod
### FASE 27 - Precisión monetaria
### FASE 28 - PayPal Orders API y Capture reales
### FASE 29 - Verificación PayPal y máquina de estados de webhook
### FASE 30 - Pipeline atómico Payment -> Tenant -> License -> Subscription -> Invoice
### FASE 31 - Checkout de tienda: precio, stock y tenant protegidos
### FASE 32 - Storage real, checksum y seguridad de archivos
### FASE 33 - Paquetes seguros de plugins y temas
### FASE 34 - Autenticación, CSRF, cookies y rate limiting distribuido
### FASE 35 - Eliminar todos los fallback de demo en producción
### FASE 36 - Super Admin totalmente persistente
### FASE 37 - Constraints, integridad e índices PostgreSQL
### FASE 38 - Pooling, timeouts y conexiones PostgreSQL
### FASE 39 - CI/CD profesional en GitHub
### FASE 40 - Toolchain Node/npm reproducible
### FASE 41 - Observabilidad y trazabilidad completa
### FASE 42 - Privacidad, PII y facturación
### FASE 43 - Rendimiento, cache y escalabilidad
### FASE 44 - Aceptación final, recuperación y go-live
