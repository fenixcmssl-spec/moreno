# 19. FASE 2K - VALIDACIÓN ESTRICTA DE PAYPAL CAPTURE

Después de capture, no aceptar solamente status=COMPLETED.

Validar todas las siguientes condiciones:

1. response.id == CheckoutSession.paypalOrderId
2. capture existe
3. capture.id existe
4. capture.status == COMPLETED
5. amount capturado == amountExpected
6. currency capturada == currencyExpected
7. custom_id/reference_id == CheckoutSession
8. captureId no ha sido consumido

Comparar dinero con Decimal, no con igualdad de Float.

# 20. FASE 2L - PROVISIONING SERVICE

Crear o refactorizar:

lib/services/saas-provisioning.service.ts

Método recomendado:

~~~text
provisionFromCapturedCheckout(checkoutSessionId, captureData)
~~~

Responsabilidad única:

CheckoutSession capturada y validada -> recursos SaaS persistentes.

No mezclar en el mismo método:

- UI
- HTTP PayPal
- sanitización genérica
- lógica de React

# 21. FASE 2M - TRANSACCIÓN ATÓMICA

Después de capture válida, ejecutar transacción PostgreSQL.

Orden recomendado:

~~~text
BEGIN TRANSACTION
1. Re-read CheckoutSession
2. Lock/recheck state
3. Verify capture uniqueness
4. Create Payment
5. Create User if necessary
6. Create Tenant
7. Create License
8. Create Subscription
9. Create Invoice
10. Create OWNER Membership
11. Create System Domain
12. Update CheckoutSession = COMPLETED
13. Set consumedAt
COMMIT
~~~

Si falla una operación crítica:

~~~text
ROLLBACK
~~~

No devolver success=true con recursos parciales.

# 22. PAYMENT

Payment final debe quedar vinculado a la operación.

Valores esperados:

~~~text
provider = PAYPAL
paymentType = SAAS_LICENSE
providerTransactionId = captureId o identificador único correctamente definido
amount = amount capturado
currency = currency capturada
status = COMPLETED
paidAt = timestamp
~~~

No sobrescribir Payment existente que corresponda a otra operación.

# 23. TENANT

Crear Tenant solo después de la capture válida.

Datos:

- tenantName
- tenantSlug
- application
- plan
- owner

El navegador no proporciona la identidad final del Tenant durante capture.

# 24. LICENSE

Crear License con:

- tenantId
- applicationId
- planId
- validFrom
- validTo
- billingPeriod
- amount
- currency
- activationLimit
- clave criptográfica

No recibir licenseKey desde el browser.

# 25. SUBSCRIPTION

Subscription debe usar datos de CheckoutSession.

Campos conceptuales:

- tenantId
- planId
- provider
- billingPeriod
- amount
- currency
- status
- currentPeriodStart
- currentPeriodEnd

No fingir una renovación automática de PayPal si todavía no existe un acuerdo/suscripción PayPal real.

# 26. INVOICE

Invoice se crea con el Payment real.

No poner status=PAID si Payment no está COMPLETED.

Debe guardar:

- tenantId
- paymentId
- subscriptionId
- invoiceNumber único
- subtotal
- tax
- total
- currency
- billing identity
- items

# 27. USER + MEMBERSHIP

Crear/recuperar User de manera segura.

Crear Membership:

~~~text
role = OWNER
status = ACTIVE
~~~

Si email ya pertenece a otro Tenant y la política no permite ese caso, rechazar en vez de reasignar.

Nunca usar passwords predeterminadas.

# 28. DOMAIN

Dominio de sistema:

~~~text
<slug>.fenixcms.es
~~~

Un custom domain solicitado en checkout debe quedar pendiente de verificación.

Prohibido marcar arbitrariamente:

~~~text
verified=true
status=active
~~~

sin comprobación real de DNS/SSL.