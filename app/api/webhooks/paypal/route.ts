import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/services/license.service';
import { AuditService } from '@/lib/services/audit.service';

const processedEvents = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    const eventId = event.id || `evt_${Date.now()}`;
    const eventType = event.event_type || 'PAYMENT.SALE.COMPLETED';

    // 1. Idempotency Check
    if (processedEvents.has(eventId)) {
      return NextResponse.json({ received: true, idempotent: true, message: 'Event already processed' });
    }

    processedEvents.add(eventId);

    // 2. Process PayPal Event Type
    const resource = event.resource || {};
    const customId = resource.custom_id || resource.custom;
    const licenseKey = resource.invoice_number || resource.note_to_seller;

    switch (eventType) {
      case 'PAYMENT.SALE.COMPLETED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED': {
        // Find license and renew or mark paid
        if (licenseKey) {
          const lic = LicenseService.getByLicenseKey(licenseKey);
          if (lic) {
            LicenseService.renew(lic.id, 1);
            AuditService.log({
              tenantId: lic.tenantId,
              action: 'PAYMENT_RECEIVED_PAYPAL',
              entity: 'License',
              entityId: lic.id,
              details: { eventId, amount: resource.amount?.total }
            });
          }
        }
        break;
      }
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        if (licenseKey) {
          const lic = LicenseService.getByLicenseKey(licenseKey);
          if (lic) {
            LicenseService.toggleStatus(lic.id, 'suspended');
            AuditService.log({
              tenantId: lic.tenantId,
              action: 'SUBSCRIPTION_SUSPENDED_PAYPAL',
              entity: 'License',
              entityId: lic.id,
              details: { eventId, eventType }
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true, eventId, eventType }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error procesando webhook PayPal' }, { status: 400 });
  }
}
