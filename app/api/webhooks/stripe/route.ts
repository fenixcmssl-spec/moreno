import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/services/license.service';
import { AuditService } from '@/lib/services/audit.service';

const processedEvents = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    const eventId = event.id || `evt_${Date.now()}`;
    const eventType = event.type || 'invoice.payment_succeeded';

    // 1. Idempotency Check
    if (processedEvents.has(eventId)) {
      return NextResponse.json({ received: true, idempotent: true, message: 'Event already processed' });
    }

    processedEvents.add(eventId);

    // 2. Process Stripe Event
    const dataObject = event.data?.object || {};
    const metadata = dataObject.metadata || {};
    const licenseKey = metadata.licenseKey || metadata.license_key;

    switch (eventType) {
      case 'invoice.payment_succeeded':
      case 'checkout.session.completed': {
        if (licenseKey) {
          const lic = LicenseService.getByLicenseKey(licenseKey);
          if (lic) {
            LicenseService.renew(lic.id, 1);
            AuditService.log({
              tenantId: lic.tenantId,
              action: 'PAYMENT_RECEIVED_STRIPE',
              entity: 'License',
              entityId: lic.id,
              details: { eventId, amount: dataObject.amount_paid ? dataObject.amount_paid / 100 : 0 }
            });
          }
        }
        break;
      }
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        if (licenseKey) {
          const lic = LicenseService.getByLicenseKey(licenseKey);
          if (lic) {
            LicenseService.toggleStatus(lic.id, 'suspended');
            AuditService.log({
              tenantId: lic.tenantId,
              action: 'SUBSCRIPTION_SUSPENDED_STRIPE',
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
    return NextResponse.json({ error: error?.message || 'Error procesando webhook Stripe' }, { status: 400 });
  }
}
