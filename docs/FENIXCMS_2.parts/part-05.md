# 38. FASE 2Q - ELIMINACIÓN DE CREDENCIALES MAESTRAS

Modificar:

lib/services/auth.service.ts
lib/auth/*
app/api/auth/*

Eliminar cualquier comparación directa con passwords maestras conocidas o cuentas de demostración.

Especial atención a valores como:

~~~text
Patricia1980@
admin123
fenix2026
~~~

No deben existir como mecanismo de login de producción.

# 39. AUTHENTICATION POSTGRESQL-ONLY

Flujo de producción:

~~~text
POST /api/auth/login
        ↓
PostgreSQL
        ↓
User
        ↓
PasswordService.verifyPassword
        ↓
SessionService
        ↓
httpOnly secure cookie
~~~

Si PostgreSQL está caído:

ERROR / SERVICE UNAVAILABLE

No fallback de usuarios.

# 40. BOOTSTRAP DEL PRIMER SUPER ADMIN

Si es necesario un primer administrador, crear un script o proceso one-shot que reciba la credencial exclusivamente desde variables de entorno.

Ejemplo conceptual:

~~~text
FENIXCMS_BOOTSTRAP_ADMIN_EMAIL
FENIXCMS_BOOTSTRAP_ADMIN_PASSWORD
~~~

Reglas:

- ejecutar solo si no existe SUPER_ADMIN;
- hacer hash antes de insertar;
- no imprimir password;
- no guardar password en Git;
- no usar el bootstrap como login diario;
- no regenerar la cuenta en cada deploy.

# 41. SESIONES

Mantener:

- httpOnly=true
- secure=true en production
- sameSite compatible con el flujo.
- expiración controlada.

No almacenar tenantId manipulable en la cookie como fuente de autoridad.

# 42. STRIPE

Si Stripe todavía no dispone de Checkout real, no debe aparentar funcionar.

Eliminar URL ficticia del tipo:

~~~text
https://checkout.stripe.com/pay/sessionId
~~~

Alternativa:

stripeEnabled=false

hasta completar Stripe real.

# 43. STORECONTEXT

Modificar lib/storeContext.tsx.

buyLicenseWithPayPal debe:

1. llamar al checkout server-side;
2. recibir approvalUrl;
3. redirigir al proveedor;
4. no fabricar License;
5. no fabricar Tenant;
6. actualizar estado local solo con resultado confirmado por backend.

# 44. SUPER ADMIN

Revisar lib/services/super-admin.service.ts.

En production no devolver INITIAL_* como datos reales después de errores de DB.

Casos como count().catch(() => datos demo) deben convertirse en error controlado o estado unavailable.

# 45. CONFIGURACIÓN PAYPAL LIVE

Production debe tener configuración explícita:

~~~text
NODE_ENV=production
APP_URL=https://...
DATABASE_URL=...
PAYPAL_MODE=live
PAYPAL_BASE_URL=https://api-m.paypal.com
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
~~~

No usar sandbox en production.

# 46. CALLBACKS

approvalUrl debe venir de PayPal.
return_url y cancel_url deben salir de APP_URL validada.
No localhost en production.
Usar HTTPS.

# 47. PRIVACIDAD

No exponer en el cliente:

- PayPal Client Secret
- OAuth tokens
- DATABASE_URL
- stack traces
- SQL
- passwords
- billingAddress innecesaria.

Limitar metadata de checkout y logs.

# 48. ERRORES INTERNOS

Usar códigos de error definidos:

~~~text
CHECKOUT_SESSION_NOT_FOUND
CHECKOUT_SESSION_EXPIRED
CHECKOUT_SESSION_ALREADY_COMPLETED
PAYPAL_ORDER_NOT_FOUND
PAYPAL_ORDER_MISMATCH
PAYPAL_CAPTURE_NOT_COMPLETED
PAYPAL_AMOUNT_MISMATCH
PAYPAL_CURRENCY_MISMATCH
PAYPAL_REFERENCE_MISMATCH
PAYPAL_CAPTURE_ALREADY_USED
PROVISIONING_FAILED
AUTHENTICATION_UNAVAILABLE
~~~

No devolver detalles internos al browser.