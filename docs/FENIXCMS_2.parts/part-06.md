# 49. FASE 2R - TESTS FENIXCMS_2

Crear o actualizar una suite específica que cubra como mínimo:

P01 - provisioning directo sin CheckoutSession -> REJECT.
P02 - amount enviado por browser -> ignorado/rechazado.
P03 - currency enviada por browser -> ignorada/rechazada.
P04 - plan alterado en capture -> ignorado/rechazado.
P05 - application alterada en capture -> ignorada/rechazada.
P06 - tenantId arbitrario -> no utilizado.
P07 - licenseKey arbitraria -> no utilizada.
P08 - APPROVED sin capture -> no provisioning.
P09 - CAPTURE PENDING -> no provisioning final.
P10 - CAPTURE DENIED -> no provisioning.
P11 - CAPTURE COMPLETED válida -> provisioning correcto.
P12 - amount mismatch -> reject.
P13 - currency mismatch -> reject.
P14 - reference mismatch -> reject.
P15 - capture repetido -> idempotente.
P16 - webhook repetido -> idempotente.
P17 - webhook signature falsa -> reject.
P18 - certUrl malicioso -> reject.
P19 - timestamp inválido -> reject.
P20 - CheckoutSession expirada -> reject.
P21 - dos captures concurrentes -> un provisioning.
P22 - browser + webhook concurrentes -> un provisioning.
P23 - Subscription failure -> no false success.
P24 - Invoice failure -> no false success.
P25 - PostgreSQL unavailable + login -> no fallback.
P26 - password master hardcoded -> test de seguridad falla.
P27 - Stripe fake URL -> test de seguridad falla.
P28 - INITIAL_* alcanzable en production -> test falla.

# 50. FASE 2S - TEST DE DINERO

Extender tests/fase27-money-precision.test.ts para CheckoutSession.

Cubrir:

79.00
79.01
0.01
999999.99

Validar con Decimal.

# 51. FASE 2T - TEST PAYPAL

Extender tests/fase28-29-paypal-webhook.test.ts.

Separar claramente:

TEST MOCK
TEST PAYPAL SANDBOX
PRODUCCIÓN PAYPAL LIVE

No llamar REAL a un test que solo usa mock local.

# 52. FASE 2U - TEST DE PRODUCCIÓN

Actualizar tests/production-readiness.test.ts para comprobar:

- DATABASE_URL requerido.
- PayPal credentials requeridas.
- PAYPAL_WEBHOOK_ID requerido.
- production base URL live.
- APP_URL HTTPS.
- no localhost en callbacks.
- no master passwords.
- no auth fallback.
- no fake Stripe.
- no simulated host.

# 53. FASE 2V - E2E PAYPAL SANDBOX

Debe existir una prueba de integración que demuestre al menos:

~~~text
1. Create Order real
2. obtener approve link real
3. abrir approval
4. aprobar con cuenta Sandbox
5. capturar Order real
6. recibir/validar respuesta
7. comprobar CheckoutSession
8. comprobar Payment
9. comprobar Tenant
10. comprobar License
11. comprobar Subscription
12. comprobar Invoice
13. comprobar Membership OWNER
~~~

PayPal documenta este flujo y ofrece sandbox separado de live.

# 54. FASE 2W - BUILD Y LINT

Ejecutar:

~~~bash
npm ci
npx prisma generate
npm run lint
npm test
npm run build
~~~

No declarar PASS si un comando falla.

# 55. FASE 2X - AUDITORÍA DE RUTAS

Revisar como mínimo:

~~~text
app/api/billing/checkout/route.ts
app/api/billing/capture/route.ts
app/api/billing/verify/route.ts
app/api/tenants/provision/route.ts
app/api/webhooks/paypal/route.ts
app/api/auth/login/route.ts
app/api/auth/session/route.ts
~~~

Clasificar cada ruta:

PUBLIC SAFE
AUTH REQUIRED
WEBHOOK ONLY
INTERNAL ONLY

# 56. FASE 2Y - CRITERIOS DE ACEPTACIÓN

FENIXCMS_2 solo está terminada cuando todas sean verdaderas:

[OK] CheckoutSession persistente.
[OK] CheckoutSession no tenant-scoped.
[OK] Plan/Application validados.
[OK] Precio server-side.
[OK] PayPal Order real.
[OK] Approval URL real.
[OK] Redirect real.
[OK] Return seguro.
[OK] Capture server-side.
[OK] COMPLETED validado.
[OK] Amount validado.
[OK] Currency validada.
[OK] Reference validada.
[OK] Capture idempotente.
[OK] Provisioning atómico.
[OK] Webhook criptográfico.
[OK] Webhook idempotente.
[OK] Recovery.
[OK] Sin passwords maestras.
[OK] Auth PostgreSQL-only.
[OK] Sin Stripe fake.
[OK] Sin INITIAL_* alcanzable en production.
[OK] Tests.
[OK] Lint.
[OK] Build.
[OK] E2E Sandbox.

# 57. PROMPT MAESTRO PARA AI STUDIO

~~~text
INICIO FASE FENIXCMS_2

DONDE SE EJECUTA:
AI STUDIO / repositorio fenixcmssl-spec/moreno

OBJETIVO:
Completar CheckoutSession, PayPal approval/capture y provisioning atómico.

REGLA ABSOLUTA:
NO PAYMENT CAPTURED = NO PROVISIONING.

1. Audita antes de modificar y enumera archivos exactos.
2. Crea CheckoutSession de plataforma en PostgreSQL.
3. No uses tenantId como requisito previo al pago.
4. Valida Application + Plan + periodo + precio en PostgreSQL.
5. Ignora/rechaza amount/currency/tenantId/licenseKey recibidos del browser.
6. Crea PayPal Order real desde servidor.
7. Guarda paypalOrderId en CheckoutSession.
8. Devuelve approvalUrl real.
9. Haz redirect a PayPal desde SaasLanding.
10. Implementa billing/success y billing/cancel.
11. Capture debe recibir paypalOrderId y obtener el resto desde CheckoutSession.
12. Acepta solo capture COMPLETED.
13. Compara amount exacto.
14. Compara currency exacta.
15. Comprueba reference/custom_id.
16. Haz provisioning atómico e idempotente.
17. Impide doble provisioning ante browser + retry + webhook.
18. Verifica webhooks PayPal criptográficamente.
19. Persiste idempotencia en PostgreSQL.
20. No uses memory fallback en producción.
21. Elimina passwords maestras hardcoded.
22. Authentication de producción debe depender de PostgreSQL.
23. No simules Stripe.
24. No uses INITIAL_* como fuente real en producción.
25. Añade tests negativos y positivos.
26. Ejecuta npm ci, prisma generate, lint, test y build.
27. Ejecuta integración real contra PayPal Sandbox.
28. Documenta variables de entorno.
29. No declares PASS de un test no ejecutado.
30. Entrega informe final con archivos, migraciones, tests, lint, build y blockers restantes.

FIN FASE FENIXCMS_2
~~~

# 58. REFERENCIAS OFICIALES PAYPAL

https://developer.paypal.com/api/rest/integration/orders-api
https://developer.paypal.com/whats-an-order/
https://developer.paypal.com/api/rest/webhooks/rest/
https://developer.paypal.com/api/rest/webhooks

Nota: el contenido técnico anterior debe adaptarse al esquema real del repositorio. No copiar un modelo Prisma literalmente si las relaciones actuales exigen una variante equivalente.