import { NextResponse } from 'next/server';
import { LicenseService } from '@/lib/services/license.service';
import { INITIAL_TENANTS } from '@/lib/initialData';

export async function GET() {
  try {
    const licenses = LicenseService.getAll();
    const tenants = INITIAL_TENANTS;

    const activeLicenses = licenses.filter(l => l.status === 'active');
    const suspendedLicenses = licenses.filter(l => l.status === 'suspended');
    const expiredLicenses = licenses.filter(l => l.status === 'expired');

    // Calculate MRR
    const mrr = activeLicenses.reduce((acc, l) => {
      const monthlyVal = l.billingPeriod === 'yearly' ? (l.price / 12) : l.price;
      return acc + (monthlyVal || 0);
    }, 0);

    const arr = mrr * 12;

    return NextResponse.json({
      metrics: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        totalCustomers: licenses.length,
        activeTenants: tenants.filter(t => t.status === 'active').length,
        activeLicenses: activeLicenses.length,
        suspendedLicenses: suspendedLicenses.length,
        expiredLicenses: expiredLicenses.length,
        currency: 'EUR'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error calculando métricas' }, { status: 500 });
  }
}
