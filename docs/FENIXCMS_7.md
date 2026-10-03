# FENIXCMS_7
## FASE 7 - ELIMINACIÓN DE LA SEGUNDA REALIDAD, POSTGRESQL-ONLY EN RUNTIME Y CONTEXTO TENANT CONFIABLE

INICIO FASE 7

DONDE SE EJECUTA:
AI STUDIO / repositorio fenixcmssl-spec/moreno

VALIDACIÓN LOCAL:
ORDENADOR DEBIAN

DESPLIEGUE:
NO VPS PRODUCCIÓN HASTA CERRAR ESTA FASE

PRIORIDAD:
CRÍTICA - bloqueador de producción por integridad de datos y aislamiento

---

## 1. RESUMEN EJECUTIVO
La FASE 7 elimina la segunda realidad del runtime en frontend y backend:
- PostgreSQL + APIs server-side + sesión HttpOnly/cookie + PayPal real = ÚNICA AUTORIDAD DE RUNTIME.
- Firebase/Firestore eliminado completamente del runtime.
- StoreContext actúa como UI/Cache reactiva, nunca como base de datos local ni generador de IDs/entidades ficticias.
- Las mutaciones en cliente son Server-Authoritative (Intent -> API -> PostgreSQL -> UI State).
- En caso de fallo de API, jamás se fabrica un recurso local ni se devuelve falso éxito.
- Storefront público bloquea cualquier intento de Tenant Spoofing por query params (`?slug=`, `?tenant=`, `?store=`, `?host=`). El Hostname confiable e infraestructura de proxy es la única autoridad.
