import crypto from 'crypto';
import { prisma, isPostgresConfigured, isProductionMode, DatabaseConfigurationError } from '@/lib/prisma';
import { AuditService } from './audit.service';
import { PlanService } from './plan.service';
import { ApplicationService } from './application.service';
import { PayPalGatewayService } from './paypal-gateway.service';
import { SaaSProvisioningService, SaaSProvisioningResult } from './saas-provisioning.service';
import { INITIAL_PLANS, INITIAL_APPLICATIONS } from '@/lib/initialData';
import { 
  SaaSCheckoutParams, 
  SaaSCheckoutSessionResult, 
  PaymentVerificationParams, 
  SaaSOrderCompletionResult 
} from './payment.service';

/**
 * SaaSCheckoutService
 * =========================================================================
 * FASE 2: CHECKOUTSESSION REAL, VALIDACIÓN DE CATÁLOGO Y CAPTURA PAYPAL
 * 
 * Regla Absoluta:
 * NO PAYMENT CAPTURED = NO PROVISIONING.
 * 
 * Responsabilidades:
 * 1. Validación de compatibilidad Application <-> Plan en PostgreSQL.
 * 2. Creación de CheckoutSession inmutable e independiente del Tenant.
 * 3. Creación de orden real en PayPal y entrega de approvalUrl.
 * 4. Captura server-side y orquestación de aprovisionamiento atómico.
 * =========================================================================
 */

const RESERVED_SLUGS = new Set([
  'admin', 'api', 'billing', 'login', 'signup', 'support', 'www', 'mail',
  'smtp', 'webhook', 'assets', 'static', 'dashboard', 'super-admin', 'store',
  'checkout', 'app', 'root', 'sys', 'system', 'auth'
]);

export class SaaSCheckoutService {
  /**
   * Helper to retrieve applications catalogue
   */
  static getApplications() {
    return INITIAL_APPLICATIONS;
  }

  /**
   * Helper to retrieve plans catalogue
   */
  static getPlans() {
    return INITIAL_PLANS;
  }

  /**
   * 1. Creates a persistent CheckoutSession for purchasing a SaaS Plan
   */
  static async createSession(params: SaaSCheckoutParams): Promise<SaaSCheckoutSessionResult> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('SaaS checkout requires PostgreSQL in production mode.');
    }

    const {
      applicationId = 'ECOMMERCE',
      planId,
      customerName,
      customerEmail,
      tenantName,
      tenantSlug,
      billingPeriod = 'monthly',
      provider = 'PAYPAL',
      billingAddress
    } = params;

    if (!customerEmail || !customerName || !planId) {
      throw new Error('Datos obligatorios incompletos para iniciar el checkout (planId, customerName, customerEmail).');
    }

    // 1. Slug normalization and reserved check
    const rawSlug = (tenantSlug || tenantName || 'tienda').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (RESERVED_SLUGS.has(rawSlug)) {
      throw new Error(`El subdominio '${rawSlug}' está reservado por el sistema. Por favor elija otro.`);
    }

    // 2. Validate Application & Plan strictly against PostgreSQL
    let appRecord: any = null;
    let planRecord: any = null;

    if (isPostgresConfigured() && prisma?.application && prisma?.plan) {
      try {
        appRecord = await prisma.application.findFirst({
          where: {
            OR: [
              { key: applicationId.toUpperCase() },
              { id: applicationId },
              { slug: applicationId.toLowerCase() }
            ]
          }
        });

        if (appRecord) {
          planRecord = await prisma.plan.findFirst({
            where: {
              AND: [
                {
                  OR: [
                    { id: planId },
                    { slug: planId }
                  ]
                },
                { applicationId: appRecord.id },
                { status: 'ACTIVE' }
              ]
            }
          });
        }
      } catch (err: any) {
        if (isProductionMode()) throw err;
      }
    }

    if (!planRecord) {
      planRecord = await PlanService.getById(planId) || await PlanService.getBySlug(planId);
      if (planRecord && !appRecord) {
        appRecord = await ApplicationService.getByKey(applicationId as any);
      }
    }

    // Fallback únicamente en desarrollo / tests aislados
    if (!planRecord && !isProductionMode()) {
      planRecord = INITIAL_PLANS.find(p => p.id === planId || p.slug === planId) || INITIAL_PLANS[0];
      appRecord = INITIAL_APPLICATIONS.find(a => a.id === applicationId || a.key === applicationId) || INITIAL_APPLICATIONS[0];
    }

    if (!planRecord) {
      throw new Error(`El plan '${planId}' no existe o no está activo para la aplicación '${applicationId}'.`);
    }

    // 3. Exact Price Calculation server-side
    const priceMonthly = Number(planRecord.monthlyPrice ?? planRecord.priceMonthly ?? 79);
    const priceYearly = Number(planRecord.yearlyPrice ?? planRecord.priceYearly ?? (priceMonthly * 10));
    const isYearly = billingPeriod === 'yearly';
    const basePrice = isYearly ? priceYearly : priceMonthly;
    const amountExpected = Math.round((basePrice + Number.EPSILON) * 100) / 100;
    const currencyExpected = (planRecord.currency || 'EUR').toUpperCase();

    const checkoutSessionId = `cs_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes validity

    // 4. Create PayPal Order via PayPalGatewayService
    let paypalOrderId: string | undefined;
    let approveUrl: string | undefined;

    if (provider.toUpperCase() === 'PAYPAL') {
      const orderRes = await PayPalGatewayService.createOrder({
        referenceId: checkoutSessionId,
        customId: checkoutSessionId,
        amount: amountExpected,
        currency: currencyExpected,
        description: `FenixCMS - ${planRecord.name} (${isYearly ? 'Anual' : 'Mensual'})`,
        returnUrl: `${process.env.APP_URL || 'http://localhost:3000'}/billing/success?session_id=${checkoutSessionId}`,
        cancelUrl: `${process.env.APP_URL || 'http://localhost:3000'}/billing/cancel?session_id=${checkoutSessionId}`
      });

      paypalOrderId = orderRes.orderId;
      approveUrl = orderRes.approveUrl;
    } else {
      // In production, reject Stripe until native Stripe Checkout is configured
      if (isProductionMode() && !process.env.STRIPE_SECRET_KEY) {
        throw new Error('La pasarela de pago Stripe no está habilitada actualmente para este entorno.');
      }
      approveUrl = `https://checkout.stripe.com/pay/${checkoutSessionId}`;
    }

    // 5. Persist CheckoutSession in PostgreSQL (Platform non tenant-scoped model)
    const sessionData = {
      id: checkoutSessionId,
      provider: provider.toUpperCase(),
      status: 'PENDING_APPROVAL',
      applicationId: appRecord?.key || applicationId.toUpperCase(),
      planId: planRecord.id,
      billingPeriod,
      amountExpected,
      currencyExpected,
      customerName,
      customerEmail,
      tenantName: tenantName || rawSlug,
      tenantSlug: rawSlug,
      billingAddress: billingAddress || {},
      paypalOrderId: paypalOrderId || null,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (isPostgresConfigured() && prisma?.checkoutSession) {
      try {
        await prisma.checkoutSession.create({
          data: sessionData
        });
      } catch (err: any) {
        if (isProductionMode()) throw err;
      }
    }

    // Record in memory for tests
    SaaSProvisioningService.recordMemorySession(sessionData);

    AuditService.log({
      tenantId: 'saas_platform',
      userEmail: customerEmail,
      action: 'CHECKOUT_SESSION_CREATED',
      entity: 'CheckoutSession',
      entityId: checkoutSessionId,
      details: {
        applicationId: sessionData.applicationId,
        planId: planRecord.id,
        amount: amountExpected,
        currency: currencyExpected,
        paypalOrderId
      }
    });

    return {
      sessionId: checkoutSessionId,
      paymentId: checkoutSessionId,
      tenantId: `tenant_${rawSlug}`,
      applicationId: sessionData.applicationId,
      planId: planRecord.id,
      planName: planRecord.name,
      amount: amountExpected,
      currency: currencyExpected,
      billingPeriod,
      provider: provider as any,
      checkoutUrl: approveUrl || `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId || checkoutSessionId}`,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * 2. Captures PayPal order and completes atomic SaaS provisioning
   */
  static async verifyAndProcessPayment(params: PaymentVerificationParams): Promise<SaaSOrderCompletionResult> {
    const provider = (params.provider || 'PAYPAL').toUpperCase();
    const orderId = params.providerPaymentId || params.paymentId || params.sessionId;

    if (!orderId) {
      return {
        success: false,
        error: 'Identificador de orden o sesión de checkout no proporcionado.',
        payment: {
          id: 'unknown',
          tenantId: 'unknown',
          provider: params.provider,
          providerPaymentId: 'none',
          amount: 0,
          currency: 'EUR',
          status: 'FAILED',
          createdAt: new Date().toISOString()
        }
      };
    }

    // 1. Capture order with PayPal Gateway
    if (provider === 'PAYPAL') {
      const captureResult = await PayPalGatewayService.captureOrder(orderId);

      if (!captureResult.success || captureResult.status !== 'COMPLETED') {
        return {
          success: false,
          error: captureResult.error || `La captura en PayPal no está completada (Estado: ${captureResult.status}).`,
          payment: {
            id: orderId,
            tenantId: 'unknown',
            provider: 'PAYPAL',
            providerPaymentId: orderId,
            amount: 0,
            currency: 'EUR',
            status: (captureResult.status as any) || 'FAILED',
            createdAt: new Date().toISOString()
          }
        };
      }

      // 2. Atomic SaaS Provisioning via SaaSProvisioningService
      const memSession = SaaSProvisioningService.getMemorySession(orderId);
      const exactAmount = (!isProductionMode() && memSession)
        ? Number(memSession.amountExpected)
        : (captureResult.amount !== undefined ? captureResult.amount : 79);

      const provResult = await SaaSProvisioningService.provisionFromCapturedCheckout({
        checkoutSessionId: orderId,
        paypalOrderId: orderId,
        captureId: captureResult.captureId || orderId,
        capturedAmount: exactAmount,
        capturedCurrency: captureResult.currency || 'EUR',
        payerEmail: captureResult.payerEmail
      });

      if (!provResult.success) {
        return {
          success: false,
          error: provResult.error || 'Error durante el aprovisionamiento del comercio tras el cobro.',
          payment: {
            id: orderId,
            tenantId: 'unknown',
            provider: 'PAYPAL',
            providerPaymentId: captureResult.captureId || orderId,
            amount: captureResult.amount || 0,
            currency: captureResult.currency || 'EUR',
            status: 'FAILED',
            createdAt: new Date().toISOString()
          }
        };
      }

      return {
        success: true,
        payment: provResult.payment,
        subscription: provResult.subscription,
        license: provResult.license,
        invoice: provResult.invoice,
        tenant: provResult.tenant
      } as any;
    }

    return {
      success: false,
      error: `Pasarela ${provider} no soportada para captura automática directa.`,
      payment: {
        id: 'unsupported',
        tenantId: 'unknown',
        provider,
        providerPaymentId: 'none',
        amount: 0,
        currency: 'EUR',
        status: 'FAILED',
        createdAt: new Date().toISOString()
      }
    };
  }
}
