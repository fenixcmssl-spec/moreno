# 10. FASE 2B - APPLICATION + PLAN + PRECIO

Modificar la validación de PlanService.

Reglas:

1. Application debe existir.
2. Plan debe existir.
3. Plan debe pertenecer a Application.
4. Plan debe estar activo.
5. billingPeriod debe estar soportado.
6. Precio debe salir de PostgreSQL.
7. Moneda debe salir de PostgreSQL.
8. No devolver la primera Application como fallback.
9. No devolver el primer Plan como fallback.
10. No crear ECOMMERCE automáticamente si la aplicación solicitada no existe.

La combinación incorrecta debe ser error de negocio y no debe llegar a PayPal.

# 11. FASE 2C - API /api/billing/checkout

Entrada permitida conceptualmente:

~~~json
{
  "applicationId": "app_ecommerce",
  "planId": "plan_pro",
  "billingPeriod": "monthly",
  "customerName": "Nombre",
  "customerEmail": "cliente@dominio.com",
  "tenantName": "Mi Tienda",
  "tenantSlug": "mi-tienda",
  "billingAddress": {}
}
~~~

No aceptar como autoridad:

~~~text
amount
currency
tenantId
licenseKey
subscriptionId
invoiceId
providerTransactionId
activationLimit
entitlements
~~~

Validar con Zod o validators existentes:

- email
- nombre
- slug
- periodo
- application
- plan
- billingAddress
- límite de tamaño del body

Flujo interno:

~~~text
validate input
   ↓
lookup Application
   ↓
lookup Plan
   ↓
validate relation
   ↓
calculate amount
   ↓
create CheckoutSession
   ↓
create PayPal Order
   ↓
save paypalOrderId
   ↓
status=PENDING_APPROVAL
   ↓
return approvalUrl
~~~

Si PayPal falla después de crear la session, marcarla FAILED o estado recuperable. No crear Tenant.

# 12. FASE 2D - PAYPAL CREATE ORDER

Modificar o endurecer lib/services/paypal-gateway.service.ts.

El gateway recibe únicamente datos validados por el backend.

Payload lógico:

~~~text
intent = CAPTURE
purchase_units[0].reference_id = CheckoutSession ID
purchase_units[0].custom_id = CheckoutSession ID
purchase_units[0].amount.currency_code = currencyExpected
purchase_units[0].amount.value = amountExpected
~~~

Obligatorio:

- OAuth2 server-side.
- PAYPAL_BASE_URL controlada por entorno.
- timeout para llamadas externas.
- gestión de errores.
- no exponer client secret.

Usar PayPal-Request-Id cuando corresponda para idempotencia externa y mantener igualmente unique constraints internas.

# 13. FASE 2E - APPROVAL URL REAL

No construir manualmente una URL con sessionId.

El approvalUrl debe venir de la respuesta real de PayPal.

Ejemplo conceptual del frontend:

~~~text
POST /api/billing/checkout
        ↓
approvalUrl
        ↓
window.location.assign(approvalUrl)
~~~

# 14. FASE 2F - SaaSLanding

Modificar components/saas/SaasLanding.tsx.

Eliminar el flujo:

~~~text
checkout -> capture inmediato
~~~

Implementar:

~~~text
checkout -> approvalUrl -> PayPal -> return
~~~

No mostrar pago completado antes de capture.
No generar licencias localmente.
No generar tenants localmente.
No utilizar Math.random para crear credenciales comerciales.

# 15. FASE 2G - RETURN PAGE

Crear o corregir app/billing/success/page.tsx.

El return de PayPal no es evidencia de pago.

La página debe:

1. Mostrar verificación.
2. Obtener orderId.
3. Llamar al backend.
4. Ejecutar capture server-side.
5. Esperar provisioning.
6. Mostrar éxito solo al final.

No guardar success como verdad en localStorage.

# 16. FASE 2H - CANCEL PAGE

Crear o corregir app/billing/cancel/page.tsx.

Cancelar no crea recursos.

Si la session sigue abierta:

~~~text
PENDING_APPROVAL -> CANCELLED
~~~

No borrar histórico.

# 17. FASE 2I - API /api/billing/capture

Input recomendado:

~~~json
{
  "paypalOrderId": "ORDER-ID"
}
~~~

No necesitar plan, application, amount, currency, tenantId ni licenseKey.

Proceso:

~~~text
paypalOrderId
  ↓
find CheckoutSession
  ↓
not found -> reject
expired -> reject
completed -> idempotent response
  ↓
capture PayPal
  ↓
validate response
  ↓
provision atomically
~~~

# 18. FASE 2J - EXPIRACIÓN

CheckoutSession debe tener expiresAt.

Una session expirada no se provisiona desde un endpoint público.

Para una nueva compra crear una nueva session.