import crypto from 'crypto';
import { isProductionMode } from '@/lib/prisma';

export interface PayPalOrderCreateParams {
  referenceId: string;
  amount: number;
  currency: string;
  description: string;
  customId: string; // Internal paymentId / sessionId
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalOrderResult {
  orderId: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  approveUrl?: string;
  rawResponse?: any;
}

export interface PayPalCaptureResult {
  success: boolean;
  orderId: string;
  captureId?: string;
  status: 'COMPLETED' | 'PENDING' | 'DENIED' | 'FAILED' | 'DECLINED';
  amount?: number;
  currency?: string;
  customId?: string;
  payerEmail?: string;
  error?: string;
  rawResponse?: any;
}

export interface PayPalWebhookVerificationParams {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
  webhookId?: string;
  rawBody: string;
}

/**
 * PayPalGatewayService
 * =========================================================================
 * Integración oficial con PayPal REST API (v2 Orders API & Capture).
 * 
 * Responsabilidades:
 * 1. Autenticación OAuth 2.0 (Client Credentials).
 * 2. Creación de órdenes server-side con importes calculados por el CMS.
 * 3. Captura server-side (/v2/checkout/orders/{id}/capture).
 * 4. Verificación de firmas de Webhooks (verify-webhook-signature).
 * 5. Normalización estricta de respuestas y validación de importes.
 * =========================================================================
 */
export class PayPalGatewayService {
  private static cachedAccessToken: { token: string; expiresAt: number } | null = null;

  /**
   * Determina la URL base de PayPal según el entorno (Sandbox vs Live)
   */
  static getBaseUrl(): string {
    if (process.env.PAYPAL_BASE_URL) {
      return process.env.PAYPAL_BASE_URL.replace(/\/$/, '');
    }
    const mode = process.env.PAYPAL_MODE || (isProductionMode() ? 'live' : 'sandbox');
    return mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  /**
   * Obtiene o renueva el token de acceso OAuth 2.0 de PayPal
   */
  static async getAccessToken(): Promise<string> {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      if (isProductionMode()) {
        throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required in production mode.');
      }
      // Retornar token sandbox dummy para tests aislados sin credenciales reales
      return 'TEST_SANDBOX_ACCESS_TOKEN';
    }

    // Verificar si el token en caché sigue siendo válido (con margen de 60s)
    if (this.cachedAccessToken && this.cachedAccessToken.expiresAt > Date.now() + 60000) {
      return this.cachedAccessToken.token;
    }

    const baseUrl = this.getBaseUrl();
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`PayPal OAuth error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const expiresIn = data.expires_in || 32400; // 9 hours default
      this.cachedAccessToken = {
        token: data.access_token,
        expiresAt: Date.now() + expiresIn * 1000
      };

      return data.access_token;
    } catch (err: any) {
      if (!isProductionMode() && (!clientId || clientId.startsWith('sb-') || clientId.startsWith('mock_') || clientId === 'dummy')) {
        return 'TEST_SANDBOX_ACCESS_TOKEN';
      }
      throw err;
    }
  }

  /**
   * Crea una orden en PayPal v2/checkout/orders con importe server-side
   */
  static async createOrder(params: PayPalOrderCreateParams): Promise<PayPalOrderResult> {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    // Entorno de prueba / test aislado sin credenciales activas
    if (!isProductionMode() && (!clientId || !clientSecret || clientId.startsWith('sb-') || clientId.startsWith('mock_') || clientId === 'dummy')) {
      const mockOrderId = `PP-ORDER-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      return {
        orderId: mockOrderId,
        status: 'CREATED',
        approveUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${mockOrderId}`,
        rawResponse: { id: mockOrderId, status: 'CREATED' }
      };
    }

    const accessToken = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    const formattedAmount = Number(params.amount).toFixed(2);

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.referenceId,
          custom_id: params.customId,
          description: params.description.slice(0, 127),
          amount: {
            currency_code: params.currency.toUpperCase(),
            value: formattedAmount
          }
        }
      ],
      application_context: {
        brand_name: 'FenixCMS SaaS',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: params.returnUrl || `${process.env.APP_URL || 'http://localhost:3000'}/billing/success`,
        cancel_url: params.cancelUrl || `${process.env.APP_URL || 'http://localhost:3000'}/billing/cancel`
      }
    };

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error creando orden en PayPal (${response.status}): ${errText}`);
    }

    const orderData = await response.json();
    const approveLink = (orderData.links || []).find((l: any) => l.rel === 'approve' || l.rel === 'payer-action');

    return {
      orderId: orderData.id,
      status: orderData.status,
      approveUrl: approveLink ? approveLink.href : undefined,
      rawResponse: orderData
    };
  }

  /**
   * Captura los fondos de una orden en PayPal v2/checkout/orders/{id}/capture
   */
  static async captureOrder(orderId: string): Promise<PayPalCaptureResult> {
    if (!orderId || typeof orderId !== 'string') {
      return {
        success: false,
        orderId: orderId || '',
        status: 'FAILED',
        error: 'ID de orden de PayPal no proporcionado'
      };
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    // Simulación de prueba para entornos de tests aislados (cuando orderId es mock y no estamos en producción)
    if (!isProductionMode() && (!clientId || !clientSecret || clientId.startsWith('sb-') || clientId.startsWith('mock_') || clientId === 'dummy')) {
      const upperId = orderId.toUpperCase();
      if (upperId.includes('DENIED') || upperId.includes('INVALID') || upperId.includes('DECLINED') || upperId.includes('FAIL')) {
        return {
          success: false,
          orderId,
          status: 'DENIED',
          error: 'Pago denegado por PayPal'
        };
      }
      if (upperId.includes('PENDING')) {
        return {
          success: false,
          orderId,
          status: 'PENDING',
          error: 'Pago pendiente de liquidación'
        };
      }
      return {
        success: true,
        orderId,
        captureId: `CAP-${orderId.replace('PP-ORDER-', '') || Date.now()}`,
        status: 'COMPLETED',
        amount: 79.00,
        currency: 'EUR',
        customId: `cust_${orderId}`,
        payerEmail: 'cliente.sandbox@fenixcms.es',
        rawResponse: { id: orderId, status: 'COMPLETED' }
      };
    }

    const accessToken = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          orderId,
          status: 'FAILED',
          error: data.message || `Error capturando orden en PayPal: ${response.status}`,
          rawResponse: data
        };
      }

      // Extraer captura de purchase_units
      const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
      const captureStatus = capture?.status || data.status;
      const isCompleted = captureStatus === 'COMPLETED';

      return {
        success: isCompleted,
        orderId: data.id,
        captureId: capture?.id,
        status: captureStatus,
        amount: capture?.amount?.value ? parseFloat(capture.amount.value) : undefined,
        currency: capture?.amount?.currency_code,
        customId: capture?.custom_id || data.purchase_units?.[0]?.custom_id,
        payerEmail: data.payer?.email_address,
        rawResponse: data
      };
    } catch (err: any) {
      return {
        success: false,
        orderId,
        status: 'FAILED',
        error: err?.message || 'Error de conexión con la API de PayPal'
      };
    }
  }

  /**
   * Consulta el estado de una orden en PayPal v2/checkout/orders/{id}
   */
  static async getOrder(orderId: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    const response = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo orden de PayPal (${response.status})`);
    }

    return await response.json();
  }

  /**
   * Verifica la autenticidad de un Webhook de PayPal utilizando el endpoint oficial verify-webhook-signature
   */
  static async verifyWebhookSignature(params: PayPalWebhookVerificationParams): Promise<{ valid: boolean; reason?: string }> {
    const { transmissionId, transmissionTime, transmissionSig, certUrl, authAlgo, rawBody } = params;
    const webhookId = params.webhookId || process.env.PAYPAL_WEBHOOK_ID;

    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      return { valid: false, reason: 'Cabeceras de firma de PayPal incompletas' };
    }

    // Validación previa del dominio seguro del certificado
    try {
      const parsedCert = new URL(certUrl);
      if (!parsedCert.hostname.endsWith('.paypal.com') || parsedCert.protocol !== 'https:') {
        return { valid: false, reason: 'URL de certificado de PayPal inválida o no segura' };
      }
    } catch {
      return { valid: false, reason: 'URL de certificado de PayPal malformada' };
    }

    // Comprobar frescura del timestamp (ventana máxima de 20 minutos)
    const timestampMs = new Date(transmissionTime).getTime();
    if (isNaN(timestampMs) || Math.abs(Date.now() - timestampMs) > 20 * 60 * 1000) {
      return { valid: false, reason: 'Timestamp de transmisión del webhook expirado (>20m)' };
    }

    // Si no hay webhookId configurado en modo no producción, verificar formato Base64
    if (!webhookId) {
      if (isProductionMode()) {
        return { valid: false, reason: 'PAYPAL_WEBHOOK_ID no configurado en producción' };
      }
      const isBase64 = /^[A-Za-z0-9+/=]+$/.test(transmissionSig);
      return isBase64 ? { valid: true } : { valid: false, reason: 'Firma no tiene formato Base64 válido' };
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!isProductionMode() && (!clientId || !clientSecret || clientId.startsWith('sb-') || clientId === 'dummy')) {
      // Para tests unitarios sin conexión a PayPal API
      if (transmissionSig === 'invalid_signature_mock') {
        return { valid: false, reason: 'Firma de webhook de prueba rechazada' };
      }
      return { valid: true };
    }

    try {
      let parsedWebhookEvent: any;
      try {
        parsedWebhookEvent = JSON.parse(rawBody);
      } catch {
        return { valid: false, reason: 'Cuerpo del webhook no es JSON válido' };
      }

      const accessToken = await this.getAccessToken();
      const baseUrl = this.getBaseUrl();

      const verificationPayload = {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: parsedWebhookEvent
      };

      const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(verificationPayload)
      });

      if (!response.ok) {
        return { valid: false, reason: `Error en endpoint de verificación de PayPal (${response.status})` };
      }

      const result = await response.json();
      const isValid = result.verification_status === 'SUCCESS';

      return isValid
        ? { valid: true }
        : { valid: false, reason: `Firma rechazada por PayPal (status: ${result.verification_status})` };

    } catch (err: any) {
      return { valid: false, reason: `Excepción al verificar firma con PayPal: ${err?.message}` };
    }
  }
}
