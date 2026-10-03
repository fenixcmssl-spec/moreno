# FENIXCMS_8
## FASE 8 - CIERRE DEFINITIVO DE LA "SEGUNDA REALIDAD" Y GOBERNANZA DE PERSISTENCIA PARA PRODUCCIÓN

**Objetivo principal:** Convertir PostgreSQL en la única fuente de verdad real del runtime de FenixCMS y eliminar de producción cualquier estado demo, memoria, fallback silencioso o mutación que pueda hacer que la interfaz diga una cosa mientras PostgreSQL contiene otra.

**Repositorio:** `fenixcmssl-spec/moreno`
**Rama:** `main`
**Dónde se ejecuta:** AI Studio / repositorio GitHub. No desplegar al VPS hasta cerrar todos los criterios de aceptación.
**Prioridad:** MÁXIMA antes de producción.

---

### Invariantes de la Fase 8:
1. **Super Admin**: Cero usuarios demo en producción. DB vacía devuelve `[]`. DB caída devuelve 500/503. `PlatformSetting` persistido en PostgreSQL con auditoría.
2. **StoreContext**: Cero inicialización con `INITIAL_*` en producción (inicia con empty/loading e hidrata desde APIs). `resetToDemoData()` bloqueado en producción.
3. **Checkout & Provisioning**: Cero dependencia de mapas en memoria en producción. Idempotencia y transaccionalidad total en PostgreSQL.
4. **Onboarding & User Activation**: Creación de usuario en estado `PENDING_ACTIVATION` con `UserActivationToken` hasheado, con expiración y uso único. Login bloqueado para usuarios no activos.
5. **PayPal Reconciliation**: Verificación explícita de `custom_id/reference_id`, monto, divisa y orden contra `CheckoutSession`.
6. **Auditoría CI**: Nuevo script `audit-production-source-of-truth.ts` integrado en CI.
