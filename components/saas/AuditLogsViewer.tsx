'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { 
  Shield, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Terminal,
  FileCode
} from 'lucide-react';

export function AuditLogsViewer() {
  const { auditLogs } = useStore();
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const filteredLogs = auditLogs.filter(log => {
    if (filterAction !== 'ALL' && !log.action.toUpperCase().includes(filterAction)) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(term);
      const matchEntity = log.entity.toLowerCase().includes(term);
      const matchUser = (log.userId || '').toLowerCase().includes(term);
      const matchDetails = JSON.stringify(log.details || {}).toLowerCase().includes(term);
      return matchAction || matchEntity || matchUser || matchDetails;
    }
    return true;
  });

  const getActionColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('PURCHASED') || action.includes('INSTALLED')) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
    if (action.includes('UPDATED') || action.includes('TOGGLED') || action.includes('CONFIG')) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    }
    if (action.includes('DELETED') || action.includes('SUSPENDED')) {
      return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    }
    return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Registro de Auditoría y Seguridad del SaaS</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Traza inmutable de todas las mutaciones administrativas, emisión de licencias, logins, configuraciones y eventos de inquilinos.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {auditLogs.length} Registros Capturados
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por acción, usuario o payload..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 text-xs w-full sm:w-auto">
          {['ALL', 'AUTH', 'LICENSE', 'APPLICATION', 'PLAN', 'PRODUCT', 'PLUGIN'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterAction(tab)}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                filterAction === tab
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-bold">Fecha / Hora</th>
                <th className="px-4 py-3 font-bold">Acción</th>
                <th className="px-4 py-3 font-bold">Entidad</th>
                <th className="px-4 py-3 font-bold">Operador / Usuario</th>
                <th className="px-4 py-3 font-bold">Detalles / Metadata</th>
                <th className="px-4 py-3 font-bold text-right">Inspección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap" suppressHydrationWarning>
                      {new Date(log.createdAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                      {log.entity}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                      {log.userId || 'system'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate font-mono text-[11px]">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-semibold transition border border-slate-700"
                      >
                        Ver JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Detalle del Evento de Auditoría</span>
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div><strong>ID:</strong> <span className="font-mono text-slate-400">{selectedLog.id}</span></div>
                <div><strong>Acción:</strong> <span className="font-mono text-amber-400">{selectedLog.action}</span></div>
                <div><strong>Entidad:</strong> <span className="text-slate-200">{selectedLog.entity}</span></div>
                <div><strong>Tenant ID:</strong> <span className="font-mono text-slate-400">{selectedLog.tenantId || 'global'}</span></div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Payload JSON Completo
                </label>
                <pre className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800 max-h-60">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
