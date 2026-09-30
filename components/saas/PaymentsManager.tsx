'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  ShieldCheck,
  CreditCard
} from 'lucide-react';

interface PaymentItem {
  id: string;
  tenantId: string;
  tenantName?: string;
  amount: number;
  currency: string;
  provider: string;
  providerTransactionId: string;
  status: string;
  paymentType: string;
  customerName: string;
  customerEmail: string;
  paidAt?: string;
  createdAt: string;
  tenant?: { name: string; slug: string };
  invoice?: { invoiceNumber: string };
}

export function PaymentsManager() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/payments')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.payments)) {
          setPayments(data.payments);
        }
      })
      .catch(e => console.error('Error loading payments:', e))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [refreshIndex]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshIndex(prev => prev + 1);
  };

  const filtered = payments.filter(p => {
    const matchesSearch = 
      (p.tenantName || p.tenant?.name || p.tenantId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.providerTransactionId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Libro Mayor de Pagos y Transacciones</h2>
            <p className="text-xs text-slate-400">Registro inmutable de cobros de licencias SaaS verificados en pasarelas</p>
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

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por ID transacción, cliente o comercio..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">Todos los Estados</option>
          <option value="COMPLETED">Completados (Exitosos)</option>
          <option value="PENDING">Pendientes</option>
          <option value="FAILED">Fallidos</option>
          <option value="REFUNDED">Reembolsados</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">ID Transacción</th>
                <th className="p-3.5">Comercio / Titular</th>
                <th className="p-3.5">Pasarela</th>
                <th className="p-3.5">Tipo Cobro</th>
                <th className="p-3.5">Importe</th>
                <th className="p-3.5">Fecha</th>
                <th className="p-3.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-mono text-amber-400">
                    {p.providerTransactionId}
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-white">{p.customerName}</div>
                    <div className="text-[10px] text-slate-400">{p.customerEmail}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] uppercase font-mono border border-slate-700 text-slate-300">
                      {p.provider}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {p.paymentType}
                  </td>
                  <td className="p-3.5 font-bold text-emerald-400">
                    {p.amount.toFixed(2)} {p.currency || 'EUR'}
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {new Date(p.paidAt || p.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      p.status.toUpperCase() === 'COMPLETED' ? 'text-emerald-400' :
                      p.status.toUpperCase() === 'FAILED' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {p.status.toUpperCase() === 'COMPLETED' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completado
                        </>
                      ) : p.status.toUpperCase() === 'FAILED' ? (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Fallido
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Pendiente
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No se encontraron pagos registrados
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
