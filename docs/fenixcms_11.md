# FENIXCMS_11
## PLAN INTEGRAL DE IMPLEMENTACIÓN TÉCNICA, SEGURIDAD, PRUEBAS Y PREPRODUCCIÓN

Repositorio: fenixcmssl-spec/moreno
Rama objetivo: main
Documento: FENIXCMS_11

Este documento consolida la hoja de ruta técnica para llevar FenixCMS desde el estado actual del repositorio hasta una plataforma SaaS preparada para producción.

REGLA OPERATIVA

UNA FASE -> UNA IMPLEMENTACIÓN -> TESTS -> REVISIÓN -> COMMIT -> SIGUIENTE FASE.

No ejecutar varias fases simultáneamente.

Después de cada fase, AI Studio debe entregar:

1. Archivos creados.
2. Archivos modificados.
3. Migraciones Prisma.
4. Endpoints afectados.
5. Servicios afectados.
6. Tests creados/modificados.
7. Resultado real de npm test.
8. Resultado real de npm run lint.
9. Resultado real de npm run build.
10. Resultado real de npm run audit:production.
11. Riesgos restantes.
12. Commit recomendado.

No escribir PASS cuando una prueba no haya sido ejecutada realmente.

---

# 1. OBJETIVO FINAL

FenixCMS debe mantener dos áreas claramente separadas.

ÁREA A - PLATAFORMA FENIXCMS

Responsable de:

- Applications.
- Plans.
- Entitlements.
- Venta de licencias.
- Checkout SaaS.
- Payments.
- Subscriptions.
- Invoices.
- Licenses.
- Activations.
- Domains.
- Super Admin.
- Plugins/themes de plataforma.

ÁREA B - CMS DEL CLIENTE

Responsable de:

- Storefront.
- Products.
- Categories.
- Orders.
- Customers.
- Pages.
- Blog.
- Classifieds.
- Media.
- Branding.
- Themes.
- Plugins.
- SEO.
- Idiomas.

Nunca permitir que un tenant pueda manipular recursos de otro tenant.

---

# 2. ESTADO DEL REPOSITORIO

El repositorio actual utiliza Next.js, TypeScript, Prisma, PostgreSQL y Zod.

package.json ya contiene scripts importantes:

- dev
- build
- start
- lint
- test
- audit:runtime
- audit:secrets
- check:production-env
- audit:production
- seed

scripts/run-all-tests.ts ya integra suites de varias fases, incluyendo billing, aislamiento, contratos API, precisión monetaria y PayPal/webhooks.

No eliminar las suites existentes. Las nuevas pruebas deben integrarse en el mismo runner cuando corresponda.

---

# 3. BLOQUEADORES CRÍTICOS

Antes del VPS deben quedar cerrados:

1. CheckoutSession persistente.
2. PayPal Approval real.
3. Capture real server-side.
4. Verificación exacta de Order, Capture, Amount, Currency y Reference.
5. Provisioning idempotente.
6. Recovery de pagos capturados con fallo de DB.
7. Eliminación de credenciales maestras.
8. PostgreSQL como fuente de verdad en producción.
9. Storage físico real.
10. Ausencia de datos demo en caminos de producción.
11. Domain verification real.
12. SSL real.
13. Rate limiting compartido.
14. Dinero con precisión Decimal.
15. Super Admin persistente.
16. CI/CD real.
17. E2E PayPal Sandbox.
18. Pruebas multi-tenant.
19. Backups y restore probado.
20. Checklist de producción completa.

---

# 4. FASE 0 - BASELINE

OBJETIVO

Crear un punto de referencia antes de tocar el código.

COMANDOS

    git status
    git log -5 --oneline
    node --version
    npm --version
    npm ci
    npx prisma validate
    npx prisma generate
    npm run lint
    npm test
    npm run audit:runtime
    npm run audit:secrets
    npm run check:production-env
    npm run audit:production
    npm run build

Guardar el resultado.

Si algo falla antes de modificar el CMS, documentarlo como fallo de baseline.

ENTREGABLE

docs/audits/FENIXCMS_11_BASELINE.md

Debe incluir:

- commit;
- fecha;
- Node;
- npm;
- Prisma;
- PostgreSQL;
- lint;
- tests;
- audit;
- build;
- blockers.

---

# 5. FASE 1 - CONTRATOS Y FUENTE DE VERDAD

OBJETIVO

Garantizar que PostgreSQL sea la autoridad de producción.

PROHIBIDO COMO FUENTE DE VERDAD EN PRODUCCIÓN

- INITIAL_TENANTS.
- INITIAL_PLANS.
- INITIAL_APPLICATIONS.
- INITIAL_LICENSES.
- fallback payment arrays.
- tenant_demo.
- inMemoryUserStore.
- session state en localStorage.
- Payment status recibido del navegador.
- License generada en frontend.

ARQUITECTURA

Route
  |
  v
Validation
  |
  v
Business Service
  |
  v
Prisma/PostgreSQL
  |
  +--> External Gateway
  |
  +--> Audit/Observability

No mezclar HTTP, UI, PayPal y persistencia en una sola función.

---

# 6. FASE 2 - CHECKOUTSESSION

OBJETIVO

Crear una entidad persistente de plataforma que exista antes del Tenant.

MODELO MÍNIMO

    id
    provider
    status
    applicationId
    planId
    billingPeriod
    amountExpected
    currencyExpected
    customerName
    customerEmail
    tenantName
    tenantSlug
    billingAddress
    paypalOrderId
    paypalCaptureId
    paymentId
    tenantId
    expiresAt
    approvedAt
    capturedAt
    completedAt
    consumedAt
    failureCode
    failureReason
    createdAt
    updatedAt

REGLAS

- No tenant-scoped.
- No access token.
- No client secret.
- paypalOrderId UNIQUE.
- paypalCaptureId UNIQUE.
- paymentId UNIQUE cuando corresponda.
- índices por status, expiresAt, customerEmail, application y plan.

STATUS

    CREATED
    PENDING_APPROVAL
    APPROVED
    CAPTURE_PENDING
    PROVISIONING
    COMPLETED
    FAILED
    EXPIRED
    CANCELLED

---

# 7. FASE 3 - PAYPAL CHECKOUT REAL

FLUJO

    POST /api/billing/checkout
        |
        v
    Validar Application
        |
        v
    Validar Plan
        |
        v
    Calcular precio
        |
        v
    Crear CheckoutSession
        |
        v
    Crear PayPal Order
        |
        v
    Guardar paypalOrderId
        |
        v
    Devolver approvalUrl
        |
        v
    Browser -> PayPal
        |
        v
    Usuario aprueba
        |
        v
    Return a FenixCMS
        |
        v
    POST /api/billing/capture

La URL de aprobación debe proceder de la respuesta real de PayPal.

Nunca fabricar una URL con sessionId.

VARIABLES

    PAYPAL_CLIENT_ID
    PAYPAL_CLIENT_SECRET
    PAYPAL_BASE_URL
    PAYPAL_WEBHOOK_ID
    PAYPAL_MODE
    APP_URL

PRODUCCIÓN

    PAYPAL_MODE=live
    PAYPAL_BASE_URL=https://api-m.paypal.com

---

# 8. FASE 4 - VALIDACIÓN DEL CHECKOUT

El navegador puede mandar:

- applicationId;
- planId;
- billingPeriod;
- customerName;
- customerEmail;
- tenantName;
- tenantSlug;
- billingAddress.

No debe tener autoridad sobre:

- amount;
- currency;
- tenantId;
- licenseKey;
- subscriptionId;
- invoiceId;
- activationLimit;
- entitlements;
- providerTransactionId.

VALIDAR

- email;
- longitud;
- slug;
- periodo;
- Application;
- Plan;
- relación Plan -> Application;
- estado activo;
- límites de body.

---

# 9. FASE 5 - AUTHORITY DE PLANES

Revisar lib/services/plan.service.ts.

Eliminar lógica de producción que:

- devuelve la primera Application;
- devuelve el primer Plan;
- crea ECOMMERCE porque el solicitado no existe;
- usa INITIAL_PLANS como fuente final;
- usa INITIAL_APPLICATIONS como fuente final.

CADENA CORRECTA

Application válida
    +
Plan válido
    +
Plan.applicationId correcto
    +
Plan activo
    +
billingPeriod válido
    =
Checkout permitido.

---

# 10. FASE 6 - CAPTURE SERVER-SIDE

POST /api/billing/capture debe recibir solamente el identificador de la PayPal Order.

Debe hacer:

1. buscar CheckoutSession;
2. comprobar que existe;
3. comprobar que no está expirada;
4. comprobar estado;
5. capturar PayPal;
6. verificar resultado;
7. validar importe;
8. validar moneda;
9. validar referencia;
10. validar captureId;
11. provisioning.

NO aceptar como autoridad:

- planId;
- applicationId;
- amount;
- currency;
- tenantId;
- licenseKey;
- subscriptionId;
- invoiceId.

---

# 11. FASE 7 - VALIDACIÓN EXACTA DE PAYPAL

No aceptar únicamente status=COMPLETED.

Validar:

ORDER ID

    PayPal response.id == CheckoutSession.paypalOrderId

CAPTURE ID

    captureId existe y es real.

STATUS

    capture.status == COMPLETED

AMOUNT

    capturedAmount == amountExpected

CURRENCY

    capturedCurrency == currencyExpected

REFERENCE

    custom_id/reference_id == CheckoutSession ID o referencia interna equivalente.

REUTILIZACIÓN

    captureId ya procesado -> respuesta idempotente, sin provisioning nuevo.

Las comparaciones monetarias críticas deben usar Decimal o una representación monetaria exacta.

---

# 12. FASE 8 - APPROVAL Y RETURN

SaasLanding no debe hacer:

    checkout -> capture inmediato.

Debe hacer:

    checkout
      ->
    approvalUrl
      ->
    PayPal
      ->
    return

Crear o corregir la página de éxito.

REGRA

RETURN != PAYMENT COMPLETED

La página de retorno solo inicia la comprobación server-side.

Mostrar:

- Verificando pago.
- Pago confirmado.
- Activando tienda.
- Pendiente.
- Error.

No utilizar localStorage como prueba de pago.

---

# 13. FASE 9 - PROVISIONING ATÓMICO

Crear o refactorizar:

lib/services/saas-provisioning.service.ts

Método recomendado:

    provisionFromCapturedCheckout(checkoutSessionId, captureData)

DENTRO DE UNA TRANSACCIÓN

1. Releer CheckoutSession.
2. Bloquear/revalidar estado.
3. Confirmar captureId no consumido.
4. Crear Payment.
5. Crear/obtener User.
6. Crear Tenant.
7. Crear License.
8. Crear Subscription.
9. Crear Invoice.
10. Crear Membership OWNER.
11. Crear System Domain.
12. Actualizar CheckoutSession.
13. Commit.

SI FALLA

    ROLLBACK

No devolver success=true con datos parciales.

---

# 14. FASE 10 - IDEMPOTENCIA Y CONCURRENCIA

Casos que deben ser seguros:

- doble click;
- refresh;
- browser retry;
- webhook + browser simultáneos;
- dos requests de capture simultáneos;
- webhook repetido.

Garantías:

    1 CheckoutSession
    1 Payment
    1 Tenant
    1 License
    1 Subscription
    1 Invoice
    1 Membership

No depender de Set/Map en memoria.

Usar:

- unique constraints;
- transacciones;
- estado PROVISIONING;
- comprobación condicional;
- recuperación idempotente.

---

# 15. FASE 11 - WEBHOOKS PAYPAL

Endpoint:

app/api/webhooks/paypal/route.ts

Verificación:

1. raw body;
2. transmission id;
3. transmission time;
4. transmission signature;
5. cert URL;
6. auth algorithm;
7. webhook ID;
8. verificación oficial de PayPal.

No aceptar solo porque la firma tenga formato Base64.

WEBHOOK EVENT ID

Debe ser UNIQUE en PostgreSQL.

FLUJO

receive
 ->
verify
 ->
idempotency
 ->
persist event
 ->
process
 ->
mark processed

APPROVED no provisiona licencia final.

CAPTURE.COMPLETED puede reconciliar/provisionar.

DENIED/PENDING no provisionan final.

---

# 16. FASE 12 - RECOVERY

CASO

    PayPal = COMPLETED
    DB provisioning = failure

Resultado:

    CheckoutSession = PROVISIONING o FAILED_RETRYABLE

Nunca volver a cobrar.

Crear mecanismo:

    reconcilePendingCheckoutSessions()

Debe recuperar:

- Payment;
- Tenant;
- License;
- Subscription;
- Invoice;
- Membership;

sin duplicarlos.

---

# 17. FASE 13 - AUTHENTICATION

Archivo principal:

lib/services/auth.service.ts

ELIMINAR

- master passwords;
- password comparisons;
- login hardcoded;
- fallback user production;
- inMemoryUserStore como vía de acceso.

Buscar strings de credenciales antiguas y añadir un test estático para evitar regresiones.

PRODUCCIÓN

Login -> PostgreSQL -> PasswordService -> SessionService -> Cookie.

Si PostgreSQL no está disponible:

    503 / authentication unavailable

Nunca fallback.

---

# 18. FASE 14 - BOOTSTRAP SUPER ADMIN

Variables:

    FENIXCMS_BOOTSTRAP_ADMIN_EMAIL
    FENIXCMS_BOOTSTRAP_ADMIN_PASSWORD

Proceso:

1. comprobar si ya existe SUPER_ADMIN;
2. si no existe, crear;
3. hashear password;
4. no imprimir secreto;
5. no guardar en Git;
6. no utilizar el bootstrap como login alternativo.

---

# 19. FASE 15 - SESSION SECURITY

Comprobar:

- token aleatorio de alta entropía;
- hash del token en DB;
- httpOnly;
- secure en production;
- sameSite;
- expiración;
- revocación;
- logout;
- renovación/lastActive;
- asociación segura con tenant.

No guardar tenantId modificable dentro del browser como autoridad.

---

# 20. FASE 16 - MULTI-TENANT

Toda consulta tenant-scoped debe depender del contexto confiable.

Prohibido usar:

    ?tenantId=
    body.tenantId
    x-tenant-id arbitrario

como autoridad.

Prisma debe seguir fail-closed.

Si un recurso tenant-scoped se consulta sin tenant válido:

    TenantIsolationViolationError

SUPER_ADMIN/system bypass solo desde código interno controlado.

---

# 21. FASE 17 - RBAC

Permisos a nivel:

- role;
- action;
- resource;
- tenant.

Ejemplos:

    products:create
    products:edit
    orders:manage
    settings:write
    domains:verify
    plugins:install
    themes:activate

El frontend puede ocultar UI, pero el backend debe rechazar igualmente.

---

# 22. FASE 18 - STORE CHECKOUT

El servidor calcula:

- price;
- stock;
- tax;
- discount;
- shipping;
- total.

El browser solo manda:

- productId;
- quantity;
- coupon code;
- datos permitidos del comprador.

Validar de nuevo desde PostgreSQL.

PROBAR RACE CONDITION

Dos clientes compran la última unidad:

    uno SUCCESS
    uno REJECTED

Nunca stock negativo.

---

# 23. FASE 19 - MONEY

Migración progresiva de campos monetarios críticos a Decimal.

Prioridad:

1. CheckoutSession.
2. Payment.
3. Invoice.
4. Subscription.
5. Order.
6. OrderItem.
7. Product.

No realizar una migración masiva no probada.

Crear tests para:

- 0.01;
- 79.00;
- 79.01;
- 99.99;
- 999.99;
- 999999.99.

---

# 24. FASE 20 - STORAGE REAL

Revisar:

lib/storage/storage.service.ts

El provider debe guardar bytes reales.

Interfaz:

    upload
    download
    delete
    exists
    metadata

Storage key:

    tenant/{tenantId}/media/{uuid}.{ext}

Validar:

- tamaño;
- MIME;
- extensión;
- path traversal;
- filename;
- bytes/firma cuando sea posible;
- checksum real.

Checksum debe derivarse de los bytes reales, no de filename + timestamp.

---

# 25. FASE 21 - MEDIA API

Revisar:

app/api/media/route.ts

Eliminar en producción:

- tenant_demo;
- media seed;
- respuesta success=true con fake data cuando DB/storage falla;
- URLs externas usadas como media real.

POST debe:

1. identificar tenant confiable;
2. validar file;
3. escribir storage;
4. guardar MediaAsset;
5. responder con asset persistente.

GET debe filtrar por tenant.

DELETE debe eliminar el asset real.

---

# 26. FASE 22 - BRANDING

Persistir por tenant:

- logo;
- favicon;
- primaryColor;
- accentColor;
- fontFamily;
- SEO title;
- SEO description.

No usar Unsplash/Picsum como identidad final de producción.

Logo y favicon deben estar almacenados de manera persistente.

---

# 27. FASE 23 - PLUGINS

Validar paquetes:

- manifest;
- id;
- version;
- size;
- checksum;
- path traversal;
- archivos permitidos;
- dependencias.

No considerar pattern scanning como sandbox real.

Plugins con acceso a secretos deben estar prohibidos.

Para plugins de terceros, definir modelo de confianza y aislamiento.

---

# 28. FASE 24 - THEMES

Funciones:

- upload;
- install;
- activate;
- deactivate;
- update;
- delete.

El theme activo debe estar asociado al tenant.

No permitir que un tenant active internamente recursos de otro tenant.

---

# 29. FASE 25 - DOMAINS

Estados:

    PENDING_DNS
    DNS_VERIFIED
    SSL_PENDING
    ACTIVE
    FAILED
    DISABLED

Nunca:

    verified=true

porque el cliente escribió un dominio.

Sistema:

    slug.fenixcms.es

Custom:

    verificación DNS real
      ->
    SSL real
      ->
    ACTIVE

---

# 30. FASE 26 - I18N

Idiomas requeridos:

    es
    en
    fr
    it
    pt
    de
    ht

Verificar HT en:

- selectors;
- translation files;
- categories;
- product metadata;
- emails;
- templates;
- fallback chain.

Persistir supportedLocales por tenant.

---

# 31. FASE 27 - SUPER ADMIN

Revisar:

lib/services/super-admin.service.ts

Producción debe leer PostgreSQL como autoridad.

No devolver INITIAL_* después de un error DB.

Métricas:

- MRR;
- ARR;
- revenue;
- tenants;
- subscriptions;
- licenses;
- failed payments;
- invoices;

deben proceder de PostgreSQL.

Si DB falla:

    DATA_UNAVAILABLE

No inventar números.

---

# 32. FASE 28 - RATE LIMITING

El Map en memoria no es suficiente para una producción distribuida.

Utilizar almacenamiento compartido si hay múltiples procesos/instancias.

Endpoints prioritarios:

- login;
- password reset;
- checkout;
- capture;
- upload;
- public API;
- webhook abuse.

---

# 33. FASE 29 - CSRF/CORS/HEADERS

Definir estrategia CSRF para:

- auth mutations;
- billing;
- admin;
- content mutations.

CORS privado.

Headers:

- HSTS;
- Content-Security-Policy;
- X-Content-Type-Options;
- Referrer-Policy;
- Permissions-Policy.

---

# 34. FASE 30 - INPUT SECURITY

No aplicar el mismo sanitizer a todos los campos.

Separar validación para:

- plain text;
- rich HTML;
- URL;
- slug;
- filename;
- Markdown;
- JSON.

Rechazar:

- javascript:;
- data:text/html;
- inline event handlers;
- iframe no autorizado.

---

# 35. FASE 31 - OBSERVABILIDAD

Logs estructurados deben identificar:

- requestId;
- tenantId;
- userId;
- checkoutSessionId;
- orderId;
- captureId;
- operation;
- duration;
- result.

Nunca registrar:

- password;
- OAuth token;
- client secret;
- cookies;
- Authorization header;
- DATABASE_URL.

---

# 36. FASE 32 - HEALTH/READINESS

Liveness:

    proceso Node vivo.

Readiness:

    PostgreSQL accesible
    dependencias críticas disponibles

Health jamás debe exponer secretos.

---

# 37. FASE 33 - BACKUPS

PostgreSQL:

- backup;
- retención;
- cifrado;
- restore test.

Media:

- backup separado.

Prueba real:

    restore
    ->
    schema
    ->
    tenant
    ->
    license
    ->
    order
    ->
    media references

---

# 38. FASE 34 - CI/CD

Crear .github/workflows/ci.yml.

Pipeline:

    checkout
    setup Node 22
    npm ci
    npx prisma validate
    npx prisma generate
    npm run lint
    npm test
    npm run audit:production
    npm run build

Ningún deploy si falla el pipeline.

---

# 39. FASE 35 - REPRODUCIBILIDAD

Mantener:

- Node 22;
- .nvmrc;
- package-lock;
- versión Prisma;
- packageManager cuando proceda.

Evitar depender de herramientas que no pueden ejecutarse en el equipo de desarrollo.

La validación principal debe poder realizarse con Node/npm.

---

# 40. FASE 36 - MIGRACIONES PRODUCCIÓN

Nunca ejecutar:

    prisma migrate reset

en producción.

Usar:

    npx prisma migrate deploy

Después:

    npx prisma generate

Y:

    npx prisma migrate status

---

# 41. FASE 37 - SEED

Separar:

- dev seed;
- test fixtures;
- production bootstrap.

No insertar tenants demo automáticamente en producción.

---

# 42. FASE 38 - TESTS DE BILLING

Casos obligatorios:

1. checkout válido;
2. amount manipulado;
3. currency manipulada;
4. plan manipulado;
5. application manipulada;
6. tenantId manipulado;
7. approved sin capture;
8. pending;
9. denied;
10. completed;
11. amount mismatch;
12. currency mismatch;
13. reference mismatch;
14. duplicate capture;
15. concurrent capture;
16. webhook replay;
17. webhook spoof;
18. DB timeout;
19. recovery.

---

# 43. FASE 39 - TESTS AUTH

Casos:

1. login válido;
2. password inválida;
3. usuario inexistente;
4. rate limit;
5. expiración;
6. logout/revoke;
7. cambio password;
8. DB unavailable;
9. scan de passwords hardcoded;
10. cookie security.

---

# 44. FASE 40 - TESTS MULTI-TENANT

Crear Tenant A y Tenant B.

Probar lectura, escritura y borrado cruzado para:

- Products;
- Orders;
- Customers;
- Media;
- Pages;
- Blog;
- Plugins;
- Themes;
- Domains;
- Subscriptions;
- Licenses.

Cada intento cruzado debe ser rechazado.

---

# 45. FASE 41 - TESTS STORAGE

Casos:

1. upload válido;
2. MIME falso;
3. extensión peligrosa;
4. path traversal;
5. tamaño excesivo;
6. checksum real;
7. delete;
8. rollback;
9. orphan;
10. cross-tenant media.

---

# 46. FASE 42 - TESTS ENTITLEMENTS

Planes:

    Starter
    Pro
    Enterprise

Comprobar que:

- Starter no ejecuta funciones Pro.
- Pro no ejecuta funciones Enterprise.
- Enterprise ejecuta sus entitlements.

Backend debe comprobar entitlements incluso si frontend oculta el botón.

---

# 47. FASE 43 - PAYPAL SANDBOX E2E

Ejecutar una compra completa real en Sandbox:

    Landing
      ->
    checkout
      ->
    PayPal Sandbox
      ->
    approve
      ->
    return
      ->
    capture
      ->
    Payment
      ->
    Tenant
      ->
    License
      ->
    Subscription
      ->
    Invoice
      ->
    Login
      ->
    CMS

Registrar orderId y captureId reales de Sandbox.

No llamar “PayPal real” a un test local mock.

---

# 48. FASE 44 - GO LIVE

CHECKLIST

    [ ] baseline documentado
    [ ] CheckoutSession
    [ ] PayPal approval
    [ ] PayPal capture
    [ ] exact amount verification
    [ ] exact currency verification
    [ ] exact reference verification
    [ ] provisioning idempotent
    [ ] webhook verification
    [ ] recovery
    [ ] no master passwords
    [ ] PostgreSQL-only auth
    [ ] tenant isolation
    [ ] store checkout protected
    [ ] Decimal money
    [ ] real storage
    [ ] branding persistent
    [ ] plugins protected
    [ ] themes protected
    [ ] domain verification
    [ ] SSL
    [ ] i18n including ht
    [ ] Super Admin persistent
    [ ] rate limiting
    [ ] health/readiness
    [ ] backups
    [ ] CI green
    [ ] lint green
    [ ] tests green
    [ ] audit production green
    [ ] build green
    [ ] PayPal Sandbox E2E green
    [ ] VPS rollback tested
    [ ] secrets outside Git

---

# 49. PROCEDIMIENTO DE DEPLOY

En VPS, solamente después de la aprobación final:

    git fetch origin
    git checkout main
    git pull --ff-only
    npm ci
    npx prisma migrate deploy
    npx prisma generate
    npm run lint
    npm test
    npm run audit:production
    npm run build
    sudo systemctl restart fenixcms
    sudo systemctl status fenixcms --no-pager

Después ejecutar health/readiness.

---

# 50. ROLLBACK

Antes de deploy se debe conocer:

- commit estable anterior;
- migraciones nuevas;
- cambios de entorno;
- cambios Nginx;
- cambios systemd.

No borrar automáticamente la DB.

Si la migración es irreversible:

- aplicar procedimiento compensatorio;
- mantener backup;
- recuperar a entorno de staging;
- probar antes.

---

# 51. PROMPT MAESTRO PARA AI STUDIO

Copiar una sola fase cada vez.

INICIO IMPLEMENTACIÓN FENIXCMS_11

REPOSITORIO:
fenixcmssl-spec/moreno

REGLA:
UNA FASE -> IMPLEMENTAR -> TESTS -> INFORME -> COMMIT -> DETENERSE.

OBJETIVO:
Convertir FenixCMS en una plataforma SaaS multi-tenant real y preparada para producción.

REGLAS:

1. PostgreSQL es la fuente de verdad en producción.
2. No utilizar INITIAL_* como datos de producción.
3. No utilizar tenant_demo en producción.
4. No utilizar memoria como fuente de verdad de pagos o auth.
5. No aceptar tenantId, amount, currency, plan o license como autoridad desde el navegador.
6. No ocultar fallos críticos con catch + success.
7. No utilizar passwords hardcoded.
8. No declarar PASS sin ejecutar.
9. No modificar funcionalidad no relacionada con la fase.
10. Crear migraciones nuevas, nunca editar migraciones aplicadas.
11. Integrar tests existentes con los nuevos.
12. Mantener aislamiento multi-tenant fail-closed.

ANTES DE EDITAR:

- audita los archivos;
- enumera cambios;
- identifica dependencias;
- identifica riesgos;
- confirma qué ya existe;
- no inventes componentes que no estén en el repositorio.

POR CADA FASE ENTREGA:

A. objetivo;
B. archivos;
C. modelo de datos;
D. API;
E. servicios;
F. seguridad;
G. migraciones;
H. tests;
I. lint;
J. build;
K. riesgos;
L. commit.

AL FINAL:
DETENTE Y ESPERA VALIDACIÓN.

FIN REGLAS.

---

# 52. ORDEN DE IMPLEMENTACIÓN

Orden obligatorio:

FASE 0  -> Baseline
FASE 1  -> Contratos/fuente de verdad
FASE 2  -> CheckoutSession/PayPal
FASE 3  -> Provisioning
FASE 4  -> Auth
FASE 5  -> Multi-tenant/RBAC
FASE 6  -> Store checkout
FASE 7  -> Decimal
FASE 8  -> Storage
FASE 9  -> Branding
FASE 10 -> Plugins
FASE 11 -> Themes
FASE 12 -> Domains/SSL
FASE 13 -> I18n
FASE 14 -> Super Admin
FASE 15 -> Security headers/CSRF/CORS
FASE 16 -> Rate limiting
FASE 17 -> Observability
FASE 18 -> Health/readiness
FASE 19 -> Backup/recovery
FASE 20 -> CI/CD
FASE 21 -> Reproducibility
FASE 22 -> Production migrations
FASE 23 -> Seed/bootstrap
FASE 24 -> Billing tests
FASE 25 -> Auth tests
FASE 26 -> Tenant tests
FASE 27 -> Storage tests
FASE 28 -> Entitlement tests
FASE 29 -> PayPal Sandbox E2E
FASE 30 -> Two-tenant E2E
FASE 31 -> Production rehearsal
FASE 32 -> Go-live.

---

# 53. CRITERIO FINAL

FenixCMS no está listo solo porque:

- Next.js compile;
- npm test pase;
- un mock de PayPal funcione;
- el panel se vea bien.

Está listo cuando una compra real pueda recorrer:

Comprar licencia
  ->
Pagar
  ->
Tenant creado
  ->
License activa
  ->
Subscription persistente
  ->
Invoice persistente
  ->
Login
  ->
CMS
  ->
Products
  ->
Orders
  ->
Media
  ->
Domain
  ->
Theme/Plugin autorizado

y además:

Tenant A NO puede acceder a Tenant B.

---

# 54. ENTREGA OBLIGATORIA DE AI STUDIO

Para cada fase:

    FASE:
    COMMIT:

    ARCHIVOS CREADOS:
    ARCHIVOS MODIFICADOS:

    MIGRACIONES:

    ENDPOINTS:

    SERVICIOS:

    MODELOS:

    TESTS PASSED:
    TESTS FAILED:
    TESTS SKIPPED:

    LINT:
    BUILD:
    AUDIT PRODUCTION:

    RIESGOS:
    BLOCKERS:

    CONFIRMACIONES:
    - PostgreSQL authority
    - tenant isolation
    - no production fallback
    - no hardcoded credentials
    - idempotency
    - recovery/rollback

---

# 55. FIN DEL DOCUMENTO FENIXCMS_11

Este documento debe utilizarse como guía integral de implementación. Las especificaciones especializadas de FENIXCMS_1 y FENIXCMS_2 siguen siendo válidas y deben respetarse dentro de las fases de billing/PayPal.

NO DEPLOY TO VPS UNTIL THE GO-LIVE CHECKLIST IS GREEN.
