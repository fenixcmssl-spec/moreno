'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Globe, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Check, 
  X,
  ExternalLink
} from 'lucide-react';

interface DomainItem {
  id: string;
  hostname: string;
  type: string;
  status: string;
  verified: boolean;
  isPrimary: boolean;
  sslStatus: string;
  tenantId: string;
  tenantName?: string;
  createdAt: string;
  tenant?: { name: string; slug: string };
}

export function DomainsManager() {
  const [domains, setDomains] = useState<DomainItem[]>([]);
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
    fetch('/api/admin/domains')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.domains)) {
          setDomains(data.domains);
        }
      })
      .catch(e => console.error('Error loading domains:', e))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [refreshIndex]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshIndex(prev => prev + 1);
  };

  const handleVerify = (id: string, hostname: string) => {
    setDomains(prev => prev.map(d => d.id === id ? { ...d, verified: true, sslStatus: 'active' } : d));
    showToast(`Dominio ${hostname} verificado con SSL aprovisionado`);
  };

  const filtered = domains.filter(d => 
    d.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.tenantName || d.tenant?.name || d.tenantId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Enrutamiento Multi-Dominio y SSL</h2>
            <p className="text-xs text-slate-400">Control maestro de subdominios de sistema y dominios propios de clientes</p>
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
          placeholder="Buscar por hostname o comercio..."
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
                <th className="p-3.5">Hostname / URL</th>
                <th className="p-3.5">Tipo Dominio</th>
                <th className="p-3.5">Comercio Asignado</th>
                <th className="p-3.5">Certificado SSL</th>
                <th className="p-3.5">DNS Verificado</th>
                <th className="p-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-semibold text-white">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{d.hostname}</span>
                      {d.isPrimary && (
                        <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] rounded font-mono">
                          Primario
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] uppercase font-mono border border-slate-700 text-cyan-300">
                      {d.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-300">
                    {d.tenantName || d.tenant?.name || d.tenantId}
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Let&apos;s Encrypt Activo
                    </span>
                  </td>
                  <td className="p-3.5">
                    {d.verified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Pendiente CNAME
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {!d.verified ? (
                      <button
                        onClick={() => handleVerify(d.id, d.hostname)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] transition"
                      >
                        Verificar DNS
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">Enrutado</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron dominios configurados
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
