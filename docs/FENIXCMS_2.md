# FENIXCMS_2
## FASE 2 - CHECKOUTSESSION REAL, PAYPAL APPROVAL/CAPTURE, PROVISIONING ATÓMICO Y CIERRE DE CREDENCIALES INSEGURAS

Documento técnico de implementación para AI Studio.

Repositorio: `fenixcmssl-spec/moreno`  
Rama: `main`  
Prioridad: **CRÍTICA - no abrir la venta pública hasta completar esta fase.**

---

# 0. OBJETIVO GENERAL

FENIXCMS_1 cerró el antiguo camino de aprovisionamiento gratuito y añadió la integración server-side de PayPal. La audioría actual de `main` ha` confirmado:
1. `components/saas/SaasLanding.tsx` llama a checkout y despuñs intenta capture inmediatamente.
2. No existe una entidad `CheckoutSession` persistente independiente del Tenant.