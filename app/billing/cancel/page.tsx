'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

function BillingCancelContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || searchParams.get('token');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/40">
          <XCircle className="w-9 h-9" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">Pago Cancelado</h1>
          <p className="text-sm text-slate-300 mt-2">
            Has cancelado el proceso de pago en PayPal. No se ha realizado ningún cargo ni se ha provisionado ningún comercio.
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-400">
          Puedes volver a intentarlo en cualquier momento seleccionando el plan que mejor se adapte a tu negocio.
        </div>

        <div>
          <a
            href="/#pricing"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition shadow-lg shadow-amber-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Catálogo de Planes
          </a>
        </div>
      </div>
    </div>
  );
}

export default function BillingCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Cargando...</div>}>
      <BillingCancelContent />
    </Suspense>
  );
}
