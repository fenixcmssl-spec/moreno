# 29. FASE 2N - IDEMPOTENCIA Y CONCURRENCIA

Escenarios que deben soportarse:

~~~text
capture request A
capture request B
webhook
browser retry
~~~

Todo puede llegar simultáneamente.

Protecciones:

- unique paypalOrderId.
- unique paypalCaptureId.
- unique Payment/providerTransactionId.
- CheckoutSession status PROVISIONING.
- comprobaciones transaccionales.
- respuesta idempotente para estados terminales.

Resultado obligatorio:

1 Tenant
1 License
1 Subscription
1 Invoice
1 Payment
1 OWNER Membership

para una compra capturada.

# 30. FASE 2O - WEBHOOK PAYPAL

Modificar:

app/api/webhooks/paypal/route.ts
lib/services/webhook.service.ts
lib/services/paypal-gateway.service.ts

Flujo:

~~~text
raw body
  ↓
verify signature
  ↓
eventId
  ↓
idempotency
  ↓
persist event
  ↓
process
  ↓
mark processed
~~~

PayPal documenta la verificación del webhook y los datos de transmisión necesarios para validación.

# 31. VERIFICACIÓN CRIPTOGRÁFICA

No aceptar como prueba suficiente:

- Base64 correcto.
- certUrl que termine en paypal.com.
- timestamp reciente.

Debe existir verificación criptográfica real mediante verify-webhook-signature o el mecanismo criptográfico oficial equivalente.

La implementación actual del gateway ya tiene llamada al endpoint oficial y debe usarse en producción.

# 32. IDEMPOTENCIA DE WEBHOOK

WebhookEvent.eventId debe ser unique.

Primer evento:

~~~text
verify -> insert -> process -> mark processed -> 2xx
~~~

Evento repetido:

~~~text
verify -> duplicate -> no side effects -> 2xx
~~~

PayPal puede reintentar entregas que no reciben un código 2xx.

# 33. ESTADOS PAYPAL

CHECKOUT.ORDER.APPROVED:
solo APPROVED/CAPTURE_PENDING. No entregar licencia final.

PAYMENT.CAPTURE.PENDING:
no provisioning final.

PAYMENT.CAPTURE.COMPLETED:
reconciliar y provisionar idempotentemente.

PAYMENT.CAPTURE.DENIED:
FAILED/DENIED. No crear recursos.

CHECKOUT.PAYMENT-APPROVAL.REVERSED:
registrar reverso y reconciliar según reglas de negocio.

BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED:
tratar como renovación, separada de la compra inicial.

# 34. FASE 2P - RECOVERY

Caso crítico:

~~~text
PayPal = COMPLETED
DB provisioning = timeout
~~~

No volver a cobrar.
No crear un segundo Payment.
No crear un segundo Tenant.

Guardar la sesión en estado recuperable:

PROVISIONING o FAILED_RETRYABLE

según el diseño final.

# 35. RECOVERY JOB

Crear función interna:

reconcilePendingCheckoutSessions()

Buscar sesiones donde exista evidencia de capture y el provisioning no esté COMPLETED.

Ejecutar provisioning idempotente.

No ejecutarlo desde el browser.

# 36. POSTGRESQL SIN FALLBACK DE MEMORIA

En producción no utilizar como fuente de verdad:

- CONSUMED_PAYPAL_ORDERS
- FALLBACK_SAAS_PAYMENTS
- MEMORY_WEBHOOK_EVENTS
- inMemoryUserStore

Si PostgreSQL falla:

- checkout falla de forma segura;
- capture falla de forma segura;
- webhook queda reintentable;
- auth no usa usuario de memoria.

# 37. SOURCE OF TRUTH FINAL

Browser -> solicita.
Servidor -> decide.
PostgreSQL -> persiste.
PayPal -> confirma el pago.

El cliente jamás puede elevar el plan o cambiar el Tenant de la compra.