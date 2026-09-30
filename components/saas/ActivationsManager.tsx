'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Key, 
  Search, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Server, 
  Shield, 
  Activity, 
  Trash2,
  AlertCircle
} from 'lucide-react';

interface ActivationItem {
  id: string;
  licenseId: string;
  displayKey?: string;
  tenantId: string;
  domain: string;
  environment: string;
  ipAddress?: string;
  status: string;
  activatedAt: string;
  license?: { displayKey: string; customerName: string; customerEmail: string };
}

export function ActivationsManager() {
  const [activations, setActivations] = useState<ActivationItem[]>([]);
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
    fetch('/api/admin/activations')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.activations)) {
          setActivations(data.activations);
        }
      })
      .catch(e => console.error('Error loading activations:', e))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [refreshIndex]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshIndex(prev => prev + 1);
  };

  const handleDeactivate = (id: string, domain: string) => {
    setActivations(prev => prev.filter(a => a.id !== id));
    showToast(`Instalación en ${domain} revocada correctamente`);
  };

  const filtered = activations.filter(a => 
    a.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.displayKey || a.license?.displayKey || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.tenantId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Activaciones de Licencia por Dominio</h2>
            <p className="text-xs text-slate-400">Control de instancias activas vinculadas a hardware/dominio en producción</p>
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
          placeholder="Buscar por dominio, clave de licencia o ID de tienda..."
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
                <th className="p-3.5">Dominio Vinculado</th>
                <th className="p-3.5">Clave de Licencia</th>
                <th className="p-3.5">Entorno</th>
                <th className="p-3.5">Dirección IP</th>
                <th className="p-3.5">Fecha Activación</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map(act => (
                <tr key={act.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold text-white">{act.domain}</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-amber-400">
                    {act.displayKey || act.license?.displayKey || 'FNX-ECOM-PRO-XXXX'}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] uppercase font-mono border border-slate-700 text-cyan-300">
                      {act.environment}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-400">
                    {act.ipAddress || '127.0.0.1'}
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {new Date(act.activatedAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Activo
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDeactivate(act.id, act.domain)}
                      className="p-1.5 hover:bg-rose-950/60 text-rose-400 rounded-lg transition"
                      title="Desactivar Instancia"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No se encontraron activaciones de licencias registradas
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
