'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  Eye, 
  Building, 
  X,
  CreditCard
} from 'lucide-react';

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName?: string;
  billingName: string;
  billingEmail: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  issuedAt: string;
  paidAt?: string;
  items: any;
  tenant?: { name: string; slug: string };
}

export function InvoicesManager() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/invoices')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.invoices)) {
          setInvoices(data.invoices);
        }
      })
      .catch(e => console.error('Error loading invoices:', e))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [refreshIndex]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshIndex(prev => prev + 1);
  };

  const filtered = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.billingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.billingEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Facturación B2B de Licencias SaaS</h2>
            <p className="text-xs text-slate-400">Emisión legal y desglose fiscal correlativo (FNX-2026-XXXX)</p>
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

      {/* Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Buscar por número de factura (FNX-...), razón social o email..."
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
                <th className="p-3.5">Nº Factura</th>
                <th className="p-3.5">Razón Social B2B</th>
                <th className="p-3.5">Fecha Emisión</th>
                <th className="p-3.5">Base Imponible</th>
                <th className="p-3.5">IVA 21%</th>
                <th className="p-3.5">Total Factura</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-mono font-bold text-amber-400">
                    {inv.invoiceNumber}
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-white">{inv.billingName}</div>
                    <div className="text-[10px] text-slate-400">{inv.billingEmail}</div>
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {new Date(inv.issuedAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-3.5 text-slate-300">
                    {inv.subtotal.toFixed(2)} {inv.currency}
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {inv.tax.toFixed(2)} {inv.currency}
                  </td>
                  <td className="p-3.5 font-bold text-emerald-400">
                    {inv.total.toFixed(2)} {inv.currency}
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Pagada
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-lg transition"
                      title="Ver Factura"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No se encontraron facturas emitidas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-amber-400">Factura Oficial FenixCMS</span>
                <h3 className="text-base font-bold text-white">{selectedInvoice.invoiceNumber}</h3>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 block">Cliente / Empresa:</span>
                  <span className="font-semibold text-white">{selectedInvoice.billingName}</span>
                  <span className="text-slate-400 block text-[11px]">{selectedInvoice.billingEmail}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Fecha y Estado:</span>
                  <span className="text-slate-300">{new Date(selectedInvoice.issuedAt).toLocaleString('es-ES')}</span>
                  <span className="text-emerald-400 block font-semibold text-[11px]">Pagada</span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-2.5 bg-slate-950 text-slate-400 text-[10px] uppercase font-semibold">Líneas de Factura</div>
                <div className="p-3 divide-y divide-slate-800/60">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-300">Licencia de Software FenixCMS</span>
                    <span className="font-mono text-white">{selectedInvoice.subtotal.toFixed(2)} {selectedInvoice.currency}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">IVA (21%)</span>
                    <span className="font-mono text-slate-400">{selectedInvoice.tax.toFixed(2)} {selectedInvoice.currency}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm font-bold text-emerald-400">
                    <span>Total Pagado</span>
                    <span>{selectedInvoice.total.toFixed(2)} {selectedInvoice.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
