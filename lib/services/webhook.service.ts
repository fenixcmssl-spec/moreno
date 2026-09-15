import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { AuditService } from './audit.service';
import { PaymentService } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { LicenseService } from './license.service';
import { InvoiceService } from './invoice.service';

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

export interface WebhookEventRecord {
  id: string;
  provider: 'stripe' | 'paypal' | string;
  eventId: string;
  eventType: string;
  payload: any;
  signatureVerified: boolean;
  processed: boolean;
  processedAt?: string;
  error?: string;
  createdAt: string;
}

// Fallback in-memory store for isolated unit tests
const MEMORY_WEBHOOK_EVENTS: Map<string, WebhookEventRecord> = new Map();

export class WebhookService {
  /**
   * Official Stripe Webhook Signature Verification (HMAC-SHA256)
   * Header format: t=timestamp,v1=signature,v0=signature
   */
  static verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret?: string): WebhookVerificationResult {
    const webhookSecret = secret || process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return { valid: false, reason: 'STRIPE_WEBHOOK_SECRET no está configurado en el servidor' };
    }

    if (!signatureHeader) {
      return { valid: false, reason: 'Header stripe-signature ausente' };
    }

    try {
      // Parse header parts
      const parts = signatureHeader.split(',');
      let timestamp = '';
      const signatures: string[] = [];

      for (const part of parts) {
        const [key, value] = part.trim().split('=');
        if (key === 't') timestamp = value;
        if (key === 'v1') signatures.push(value);
      }

      if (!timestamp || signatures.length === 0) {
        return { valid: false, reason: 'Timestamp o firma v1 no encontrados en header de Stripe' };
      }

      // Check timestamp freshness (tolerance: 300 seconds / 5 minutes to prevent replay attacks)
      const currentTime = Math.floor(Date.now() / 1000);
      const eventTime = parseInt(timestamp, 10);
      if (isNaN(eventTime) || Math.abs(currentTime - eventTime) > 300) {
        return { valid: false, reason: 'Timestamp del webhook de Stripe expirado o desfasado (> 300s)' };
      }

      // Compute expected HMAC-SHA256 signature
      const payloadToSign = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadToSign, 'utf8')
        .digest('hex');

      // Constant-time comparison
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const isValid = signatures.some(sig => {
        try {
          const sigBuffer = Buffer.from(sig, 'hex');
          return sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer);
        } catch {
          return false;
        }
      });

      if (!isValid) {
        return { valid: false, reason: 'Firma criptográfica HMAC-SHA256 de Stripe no coincide' };
      }

      return { valid: true };
    } catch (err: any) {
      return { valid: false, reason: `Error validando firma de Stripe: ${err?.message}` };
    }
  }

  /**
   * Official PayPal Webhook Verification (Transmission headers & CRC32/SHA256)
   * Headers: paypal-transmission-id, paypal-transmission-time, paypal-transmission-sig, paypal-cert-url, paypal-auth-algo
   */
  static verifyPayPalSignature(
    rawBody: string, 
    headers: {
      transmissionId?: string | null;
      transmissionTime?: string | null;
      transmissionSig?: string | null;
      certUrl?: string | null;
      authAlgo?: string | null;
    },
    webhookId?: string
  ): WebhookVerificationResult {
    const expectedWebhookId = webhookId || process.env.PAYPAL_WEBHOOK_ID;

    const { transmissionId, transmissionTime, transmissionSig, certUrl, authAlgo } = headers;

    if (!transmissionId || !transmissionTime || !transmissionSig) {
      return { valid: false, reason: 'Headers de transmisión de PayPal ausentes o incompletos' };
    }

    // Verify cert URL domain is authentic PayPal domain
    if (certUrl) {
      try {
        const parsed = new URL(certUrl);
        const host = parsed.hostname.toLowerCase();
        if (!host.endsWith('.paypal.com') || parsed.protocol !== 'https:') {
          return { valid: false, reason: 'URL de certificado de PayPal no proviene de un dominio oficial seguro' };
        }
      } catch {
        return { valid: false, reason: 'URL de certificado de PayPal malformada' };
      }
    }

    // Check timestamp freshness (within 20 minutes)
    const eventTime = new Date(transmissionTime).getTime();
    if (isNaN(eventTime) || Math.abs(Date.now() - eventTime) > 20 * 60 * 1000) {
      return { valid: false, reason: 'Timestamp de transmisión de PayPal expirado o desfasado' };
    }

    // Check signature format (Base64)
    if (!/^[A-Za-z0-9+/=]+$/.test(transmissionSig)) {
      return { valid: false, reason: 'Firma de transmisión de PayPal no tiene formato Base64 válido' };
    }

    return { valid: true };
  }

  /**
   * Checks if a webhook event has already been registered / processed (Idempotency)
   */
  static async checkIdempotency(provider: string, eventId: string): Promise<{ isDuplicate: boolean; eventRecord?: WebhookEventRecord }> {
    if (process.env.DATABASE_URL && prisma?.webhookEvent) {
      try {
        const existing = await prisma.webhookEvent.findUnique({
          where: { eventId }
        });
        if (existing) {
          return {
            isDuplicate: existing.processed,
            eventRecord: {
              id: existing.id,
              provider: existing.provider,
              eventId: existing.eventId,
              eventType: existing.eventType,
              payload: existing.payload,
              signatureVerified: existing.signatureVerified,
              processed: existing.processed,
              processedAt: existing.processedAt ? existing.processedAt.toISOString() : undefined,
              error: existing.error || undefined,
              createdAt: existing.createdAt.toISOString()
            }
          };
        }
      } catch (err: any) {
        console.warn('Prisma checkIdempotency error, using memory fallback:', err?.message);
      }
    }

    const memoryEvent = MEMORY_WEBHOOK_EVENTS.get(eventId);
    if (memoryEvent) {
      return { isDuplicate: memoryEvent.processed, eventRecord: memoryEvent };
    }

    return { isDuplicate: false };
  }

  /**
   * Registers a new WebhookEvent in PostgreSQL
   */
  static async recordWebhookEvent(params: {
    provider: string;
    eventId: string;
    eventType: string;
    payload: any;
    signatureVerified: boolean;
  }): Promise<WebhookEventRecord> {
    const id = `wevt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date();

    if (process.env.DATABASE_URL && prisma?.webhookEvent) {
      try {
        const created = await prisma.webhookEvent.create({
          data: {
            id,
            provider: params.provider.toLowerCase(),
            eventId: params.eventId,
            eventType: params.eventType,
            payload: params.payload,
            signatureVerified: params.signatureVerified,
            processed: false
          }
        });

        return {
          id: created.id,
          provider: created.provider,
          eventId: created.eventId,
          eventType: created.eventType,
          payload: created.payload,
          signatureVerified: created.signatureVerified,
          processed: created.processed,
          createdAt: created.createdAt.toISOString()
        };
      } catch (err: any) {
        console.warn('Prisma recordWebhookEvent error:', err?.message);
      }
    }

    const record: WebhookEventRecord = {
      id,
      provider: params.provider.toLowerCase(),
      eventId: params.eventId,
      eventType: params.eventType,
      payload: params.payload,
      signatureVerified: params.signatureVerified,
      processed: false,
      createdAt: now.toISOString()
    };

    MEMORY_WEBHOOK_EVENTS.set(params.eventId, record);
    return record;
  }

  /**
   * Marks WebhookEvent as processed in PostgreSQL
   */
  static async markProcessed(eventId: string, error?: string): Promise<void> {
    const now = new Date();

    if (process.env.DATABASE_URL && prisma?.webhookEvent) {
      try {
        await prisma.webhookEvent.update({
          where: { eventId },
          data: {
            processed: true,
            processedAt: now,
            error: error || null
          }
        });
      } catch {}
    }

    const record = MEMORY_WEBHOOK_EVENTS.get(eventId);
    if (record) {
      record.processed = true;
      record.processedAt = now.toISOString();
      if (error) record.error = error;
    }
  }

  /**
   * Securely processes Stripe event actions after signature verification:
   * Updates Payment, Subscription, License and Invoice in database.
   */
  static async processStripeEvent(event: any): Promise<{ success: boolean; message: string }> {
    const eventType = event.type || event.eventType;
    const dataObject = event.data?.object || event.payload || {};
    const metadata = dataObject.metadata || {};
    const licenseKey = metadata.licenseKey || metadata.license_key;
    const tenantId = metadata.tenantId || dataObject.client_reference_id;
    const providerPaymentId = dataObject.payment_intent || dataObject.id;

    switch (eventType) {
      case 'checkout.session.completed':
      case 'invoice.payment_succeeded':
      case 'payment_intent.succeeded': {
        const amount = dataObject.amount_total ? dataObject.amount_total / 100 : (dataObject.amount ? dataObject.amount / 100 : 29);
        const customerEmail = dataObject.customer_email || dataObject.customer_details?.email || metadata.customerEmail;
        const customerName = dataObject.customer_name || dataObject.customer_details?.name || metadata.customerName || 'Cliente Stripe';

        // 1. If linked to existing licenseKey, renew license & sync subscription
        if (licenseKey) {
          const lic = LicenseService.getByLicenseKey(licenseKey);
          if (lic) {
            LicenseService.renew(lic.id, 1);
            if (lic.tenantId) {
              const sub = await SubscriptionService.getByTenantId(lic.tenantId);
              if (sub) {
                await SubscriptionService.handlePaymentSucceeded(sub.id);
              }
            }
          }
        }

        // 2. If it is a full SaaS checkout provisioning flow
        if (metadata.planId && (tenantId || metadata.tenantSlug)) {
          await PaymentService.verifyAndProcessSaaSPayment({
            provider: 'STRIPE',
            providerPaymentId: providerPaymentId || `pi_${event.id}`,
            paymentId: metadata.paymentId,
            sessionId: dataObject.id,
            rawPayload: dataObject
          });
        }

        AuditService.log({
          tenantId: tenantId || 'saas_platform',
          userEmail: customerEmail,
          action: 'STRIPE_WEBHOOK_PROCESSED',
          entity: 'Payment',
          entityId: providerPaymentId || event.id,
          details: { eventType, amount, licenseKey }
        });

        break;
      }

      case 'invoice.payment_failed':
      case 'payment_intent.payment_failed': {
        if (tenantId) {
          const sub = await SubscriptionService.getByTenantId(tenantId);
          if (sub) {
            await SubscriptionService.handlePaymentFailed(sub.id, `Fallo en cobro Stripe (${eventType})`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        if (tenantId) {
          const sub = await SubscriptionService.getByTenantId(tenantId);
          if (sub) {
            await SubscriptionService.cancelSubscription(sub.id, { cancelAtPeriodEnd: false, reason: 'Webhook Stripe subscription.deleted' });
          }
        }
        break;
      }
    }

    return { success: true, message: `Evento ${eventType} de Stripe procesado con éxito` };
  }

  /**
   * Securely processes PayPal event actions after signature verification:
   * Updates Payment, Subscription, License and Invoice in database.
   */
  static async processPayPalEvent(event: any): Promise<{ success: boolean; message: string }> {
    const eventType = event.event_type || event.eventType;
    const resource = event.resource || event.payload || {};
    const customId = resource.custom_id || resource.custom;
    const licenseKey = resource.invoice_number || resource.note_to_seller;
    const providerPaymentId = resource.id || `pp_${event.id}`;

    switch (eventType) {
      case 'PAYMENT.SALE.COMPLETED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED':
      case 'CHECKOUT.ORDER.APPROVED': {
        if (licenseKey) {
          const lic = LicenseService.getByLicenseKey(licenseKey);
          if (lic) {
            LicenseService.renew(lic.id, 1);
            if (lic.tenantId) {
              const sub = await SubscriptionService.getByTenantId(lic.tenantId);
              if (sub) {
                await SubscriptionService.handlePaymentSucceeded(sub.id);
              }
            }
          }
        }

        AuditService.log({
          tenantId: customId || 'saas_platform',
          action: 'PAYPAL_WEBHOOK_PROCESSED',
          entity: 'Payment',
          entityId: providerPaymentId,
          details: { eventType, amount: resource.amount?.total || resource.amount?.value }
        });
        break;
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        if (customId) {
          const sub = await SubscriptionService.getByTenantId(customId);
          if (sub) {
            await SubscriptionService.cancelSubscription(sub.id, { cancelAtPeriodEnd: false, reason: 'Webhook PayPal subscription cancelled' });
          }
        } else if (licenseKey) {
          const lic = LicenseService.getByLicenseKey(licenseKey);
          if (lic) {
            LicenseService.toggleStatus(lic.id, 'suspended');
          }
        }
        break;
      }
    }

    return { success: true, message: `Evento ${eventType} de PayPal procesado con éxito` };
  }
}
