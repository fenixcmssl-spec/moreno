import crypto from 'crypto';
import { AuditService } from './audit.service';
import { LicenseService } from './license.service';

export interface CheckoutCalculation {
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  currency: string;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  orderId?: string;
  provider: 'paypal' | 'stripe' | 'bizum' | 'redsys' | 'cod' | 'bank_transfer';
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  payerEmail: string;
  payerName: string;
  paidAt?: string;
  createdAt: string;
}

const PAYMENTS_LEDGER: PaymentRecord[] = [];
const PROCESSED_WEBHOOK_IDS = new Set<string>();

export class PaymentService {
  /**
   * Calculates cart/checkout financial totals securely on server (never trust frontend total)
   */
  static calculateTotals(params: {
    items: { price: number; quantity: number }[];
    couponDiscountPct?: number;
    shippingMethod?: string;
    taxRate?: number; // default 0.21 (21% IVA)
  }): CheckoutCalculation {
    const rawSubtotal = params.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const subtotal = Math.round(rawSubtotal * 100) / 100;

    const discountPct = params.couponDiscountPct || 0;
    const discount = Math.round((subtotal * (discountPct / 100)) * 100) / 100;
    const taxableAmount = Math.max(0, subtotal - discount);

    let shippingCost = 0;
    if (params.shippingMethod === 'correos_express') {
      shippingCost = taxableAmount > 50 ? 0 : 4.95;
    } else if (params.shippingMethod === 'dhl_express') {
      shippingCost = 9.90;
    } else if (params.shippingMethod === 'recogida_local') {
      shippingCost = 0;
    } else {
      shippingCost = taxableAmount > 50 ? 0 : 3.90;
    }

    const taxRate = params.taxRate !== undefined ? params.taxRate : 0.21;
    const taxAmount = Math.round((taxableAmount * taxRate) * 100) / 100;
    const total = Math.round((taxableAmount + taxAmount + shippingCost) * 100) / 100;

    return {
      subtotal,
      discount,
      taxRate,
      taxAmount,
      shippingCost,
      total,
      currency: 'EUR'
    };
  }

  /**
   * Processes a webhook notification from Stripe/PayPal with signature check and idempotency
   */
  static async handleWebhook(params: {
    provider: 'paypal' | 'stripe';
    eventId: string;
    signature: string;
    payload: {
      tenantId: string;
      planId?: string;
      licenseId?: string;
      amount: number;
      payerEmail: string;
      payerName: string;
      providerPaymentId: string;
      status: 'PAID' | 'FAILED';
    };
  }): Promise<{ success: boolean; message: string }> {
    // 1. Idempotency Check (Points 12 & 25)
    if (PROCESSED_WEBHOOK_IDS.has(params.eventId)) {
      return { success: true, message: 'Evento de webhook ya procesado previamente (idempotente)' };
    }

    // 2. Cryptographic signature simulation verification
    if (!params.signature || params.signature.length < 8) {
      return { success: false, message: 'Firma de webhook inválida' };
    }

    PROCESSED_WEBHOOK_IDS.add(params.eventId);

    const paymentRecord: PaymentRecord = {
      id: `pay_${Date.now()}`,
      tenantId: params.payload.tenantId,
      provider: params.provider,
      providerPaymentId: params.payload.providerPaymentId,
      amount: params.payload.amount,
      currency: 'EUR',
      status: params.payload.status,
      payerEmail: params.payload.payerEmail,
      payerName: params.payload.payerName,
      paidAt: params.payload.status === 'PAID' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    };

    PAYMENTS_LEDGER.push(paymentRecord);

    // 3. Flow: Payment PAID -> License/Subscription ACTIVE -> Tenant Enabled
    if (params.payload.status === 'PAID' && params.payload.licenseId) {
      LicenseService.updateStatus(params.payload.licenseId, 'ACTIVE');
    }

    AuditService.log({
      tenantId: params.payload.tenantId,
      userEmail: params.payload.payerEmail,
      action: 'PAYMENT_WEBHOOK_PROCESSED',
      entity: 'Payment',
      entityId: paymentRecord.id,
      details: {
        provider: params.provider,
        amount: params.payload.amount,
        status: params.payload.status,
        providerPaymentId: params.payload.providerPaymentId
      }
    });

    return { success: true, message: 'Pago registrado y licencia habilitada con éxito' };
  }

  static getPaymentsForTenant(tenantId: string): PaymentRecord[] {
    return PAYMENTS_LEDGER.filter(p => p.tenantId === tenantId);
  }
}
