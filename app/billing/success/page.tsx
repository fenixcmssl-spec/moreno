'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, Store, ArrowRight, ShieldCheck } from 'lucide-react';

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || searchParams.get('orderId') || searchParams.get('session_id') || searchParams.get('paymentId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function capturePayment() {
      if (!token) {
        setError('No se proporcionó un identificador de orden de PayPal.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/billing/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paypalOrderId: token,
            orderId: token
          })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'No se pudo confirmar la captura del pago.');
        }

        setResult(data);
      } catch (err: any) {
        console.error('Error capturing billing session:', err);
        setError(err?.message || 'Error durante la captura y aprovisionamiento.');
      } finally {
        setLoading(false);
      }
    }

    capturePayment();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center space-y-4">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-white">Verificando Pago con PayPal...</h2>
          <p className="text-sm text-slate-400">
            Estamos capturando los fondos y aprovisionando tu tienda, base de datos y licencia SaaS de forma atómica.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Error en la Verificación</h2>
          <p className="text-sm text-red-300">{error}</p>
          <div className="pt-4">
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition"
            >
              Volver a Planes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tenant = result?.tenant;
  const license = result?.license;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full p-8 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">¡Pago Confirmado y Licencia Activada!</h1>
          <p className="text-sm text-slate-300 mt-2">
            Tu tienda <span className="text-amber-400 font-bold">{tenant?.name || 'FenixCMS'}</span> ha sido aprovisionada con éxito.
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-left font-mono text-xs space-y-2">
          <div>
            <span className="text-slate-400 text-[10px] block">CLAVE DE LICENCIA OFICIAL:</span>
            <span className="text-emerald-400 font-bold text-sm select-all">
              {license?.displayKey || license?.licenseKey || 'FNX-ACTIVA'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">SUBDOMINIO ASIGNADO:</span>
            <span className="text-white font-medium">{tenant?.slug}.fenixcms.es</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">ESTADO DE SUSCRIPCIÓN:</span>
            <span className="text-amber-400 font-semibold uppercase">Activa & Confirmada</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/admin"
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Store className="w-4 h-4" />
            Acceder al Backoffice
          </Link>
          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-2"
          >
            Ir a Portada
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Cargando...</div>}>
      <BillingSuccessContent />
    </Suspense>
  );
}
