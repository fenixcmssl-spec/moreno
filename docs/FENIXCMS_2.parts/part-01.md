# FENIXCMS_2
## FASE 2 - CHECKOUT REAL, PAYPAL APPROVAL/CAPTURE, CHECKOUTSESSION Y PROVISIONING ATÓMICO

Repositorio: fenixcmssl-spec/moreno
Rama: main
Prioridad: CRÍTICA. No abrir la venta pública hasta completar esta fase.

# 1. OBJETIVO GENERAL

FENIXCMS_1 cerró el antiguo aprovisionamiento libre. FENIXCMS_2 debe terminar el circuito comercial para que el navegador nunca pueda declarar que un pago existe y para que PayPal sea realmente el proveedor que confirma el cobro.

Flujo obligatorio:

~~~text
Cliente selecciona Application + Plan
        ↓
POST /api/billing/checkout
        ↓
Servidor valida Application + Plan + periodo + precio
        ↓
Crear CheckoutSession en PostgreSQL
        ↓
Crear PayPal Order real
        ↓
Guardar paypalOrderId
        ↓
Devolver approvalUrl real
        ↓
Browser redirige a PayPal
        ↓
Cliente aprueba
        ↓
PayPal vuelve a FenixCMS
        ↓
POST /api/billing/capture
        ↓
Servidor captura la Order
        ↓
Valida COMPLETED + amount + currency + reference
        ↓
Provisioning idempotente
        ↓
Payment + Tenant + License + Subscription + Invoice + Membership
        ↓
CheckoutSession COMPLETED
~~~

Regla absoluta:

NO PAYMENT CAPTURED = NO PROVISIONING

PayPal documenta el uso server-side de Orders v2, la aprobación del comprador y la captura posterior mediante /v2/checkout/orders/{ORDER-ID}/capture.

# 2. PROBLEMAS QUE ESTA FASE CORRIGE

1. SaasLanding todavía no puede considerar terminado el pago sin una navegación real a la aprobación de PayPal.
2. No existe una CheckoutSession de plataforma separada del Tenant.
3. Payment requiere tenantId aunque el Tenant no debe existir antes del pago.
4. Subscription e Invoice se crean después del provisioning parcial y sus errores no deben ocultarse.
5. AuthService contiene credenciales maestras y fallback de usuarios en memoria que no deben existir en producción.
6. Tests actuales mezclan mocks de PayPal con lenguaje de pago real.
7. Stripe no debe aparentar una integración real si solo devuelve una URL ficticia.

# 3. ALCANCE

## Incluido

- CheckoutSession persistente.
- Migración Prisma/PostgreSQL.
- Source of truth server-side para Application, Plan, precio y moneda.
- Create Order PayPal real.
- Approval URL real.
- Redirect del comprador.
- Return page.
- Capture server-side.
- Validación estricta de capture.
- Provisioning atómico e idempotente.
- Webhook PayPal autenticado e idempotente.
- Recovery de provisioning.
- Eliminación de contraseñas maestras.
- Authentication PostgreSQL-only en production.
- Tests FENIXCMS_2.
- lint y build.

## No incluido

- Rediseño del editor CMS completo.
- Storage real completo.
- Marketplace completo.
- SEO completo.
- Migración masiva de todos los Float del esquema.
- Rate limiting distribuido.
- Stripe real completo.
- DNS/SSL completo.

# 4. REGLAS DE AUTORIDAD

Orden de confianza:

1. PayPal.
2. CheckoutSession de PostgreSQL.
3. Payment de PostgreSQL.
4. Tenant/License/Subscription/Invoice de PostgreSQL.
5. Browser.

El browser no puede decidir amount, currency, plan, application, tenant final, licenseKey, subscriptionId, invoiceId, activationLimit ni entitlements.

# 5. FASE 2A - CHECKOUTSESSION

Crear una entidad de plataforma no tenant-scoped.

Campos mínimos:

~~~text
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
~~~

Unique recomendados:

- paypalOrderId
- paypalCaptureId
- paymentId
- tenantId

Índices recomendados:

- status
- expiresAt
- customerEmail
- applicationId + planId

CheckoutSession NO debe depender de getCurrentTenantId().

# 6. ESTADOS DE CHECKOUTSESSION

Estados propuestos:

~~~text
CREATED
PENDING_APPROVAL
APPROVED
CAPTURE_PENDING
PROVISIONING
COMPLETED
FAILED
EXPIRED
CANCELLED
~~~

Transiciones válidas y controladas. Una sesión terminal no puede volver a un estado inicial desde un endpoint público.

# 7. MIGRACIÓN PRISMA

Crear una migración nueva.
No modificar migraciones históricas ya aplicadas.
No usar prisma migrate reset en producción.

Para amountExpected usar Decimal/Prisma Decimal en la nueva ruta crítica.

# 8. CRITERIOS DE SEGURIDAD DE LA SESSION

- No almacenar secrets de PayPal.
- No almacenar OAuth access tokens.
- No confiar en campos de capture enviados por el browser.
- No cambiar snapshot comercial después de crear la sesión.
- No recalcular el precio desde el browser.
- Expirar sesiones antiguas.

# 9. RESULTADO ESPERADO DE FASE 2A

Al terminar esta parte, el sistema debe poder identificar de forma única:

CheckoutSession -> PayPal Order -> PayPal Capture -> Payment -> Tenant

sin crear el Tenant antes de la captura.