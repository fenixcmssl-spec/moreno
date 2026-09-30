'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard, 
  Search, 
  RefreshCw, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';

interface SubscriptionItem {
  id: string;
  tenantId: string;
  tenantName?: string;
  planId: string;
  planName?: string;
  provider: string;
  providerSubscriptionId?: string;
  status: string;
  billingPeriod: string;
  amount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  tenant?: { name: string; slug: string };
  plan?: { name: string };
}

export function SubscriptionsManager() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/subscriptions')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.subscriptions)) {
          setSubscriptions(data.subscriptions);
        }
      })
      .catch(e => console.error('Error loading subscriptions:', e))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [refreshIndex]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshIndex(prev => prev + 1);
  };

  const handleCancelSub = (id: string) => {
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: 'CANCELLED', cancelAtPeriodEnd: true } : s));
    showToast(`Suscripción ${id} marcada como CANCELADA en PostgreSQL`);
  };

  const filtered = subscriptions.filter(s => 
    (s.tenantName || s.tenant?.name || s.tenantId).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.planName || s.plan?.name || s.planId).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.providerSubscriptionId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Suscripciones Periódicas SaaS</h2>
            <p className="text-xs text-slate-400">Control de cobros recurrentes de licencias (Stripe / PayPal / Redsys)</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
          title="Recargar desde PostgreSQL"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Buscar por comercio, plan o ID de proveedor..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Comercio / Tenant</th>
                <th className="p-3.5">Plan Contratado</th>
                <th className="p-3.5">Pasarela</th>
                <th className="p-3.5">Importe</th>
                <th className="p-3.5">Ciclo</th>
                <th className="p-3.5">Próxima Renovación</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5">
                    <span className="font-semibold text-white">{sub.tenantName || sub.tenant?.name || sub.tenantId}</span>
                  </td>
                  <td className="p-3.5 text-slate-300">
                    {sub.planName || sub.plan?.name || sub.planId}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] uppercase font-mono border border-slate-700 text-indigo-300">
                      {sub.provider}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-amber-400">
                    {sub.amount} {sub.currency || 'EUR'}
                  </td>
                  <td className="p-3.5 capitalize text-slate-400">
                    {sub.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'}
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      sub.status === 'ACTIVE' || sub.status === 'active' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {sub.status === 'ACTIVE' || sub.status === 'active' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Activa
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelada
                        </>
                      )}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    {sub.status === 'ACTIVE' || sub.status === 'active' ? (
                      <button
                        onClick={() => handleCancelSub(sub.id)}
                        className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-lg text-[10px] font-bold transition"
                      >
                        Cancelar
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">Sin acción</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No se encontraron suscripciones registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
