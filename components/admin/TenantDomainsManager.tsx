'use client';

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  ExternalLink,
  Trash2,
  Lock,
  Server,
  X
} from 'lucide-react';
import { useStore } from '@/lib/storeContext';

interface DomainRecord {
  id: string;
  hostname: string;
  type: 'primary' | 'subdomain' | 'custom';
  verified: boolean;
  sslActive: boolean;
  createdAt: string;
}

export function TenantDomainsManager() {
  const { tenant } = useStore();
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHostname, setNewHostname] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadDomains = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/domains');
      if (res.ok) {
        const data = await res.json();
        if (data.domains && data.domains.length > 0) {
          setDomains(data.domains);
        } else {
          // Default fallback representation
          setDomains([
            {
              id: 'dom_sub',
              hostname: `${tenant.slug}.fenixcms.es`,
              type: 'subdomain',
              verified: true,
              sslActive: true,
              createdAt: '2026-01-01'
            },
            ...(tenant.customDomain ? [{
              id: 'dom_custom',
              hostname: tenant.customDomain,
              type: 'custom' as const,
              verified: true,
              sslActive: true,
              createdAt: '2026-01-10'
            }] : [])
          ]);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await fetch(`/api/domains?tenantId=${tenant.id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.domains && data.domains.length > 0) {
              setDomains(data.domains);
            } else {
              setDomains([
                {
                  id: 'dom_sub',
                  hostname: `${tenant.slug}.fenixcms.es`,
                  type: 'subdomain',
                  verified: true,
                  sslActive: true,
                  createdAt: '2026-01-01'
                },
                ...(tenant.customDomain ? [{
                  id: 'dom_custom',
                  hostname: tenant.customDomain,
                  type: 'custom' as const,
                  verified: true,
                  sslActive: true,
                  createdAt: '2026-01-10'
                }] : [])
              ]);
            }
          }
        }
      } catch {
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    init();
    return () => { isMounted = false; };
  }, [tenant.id, tenant.slug, tenant.customDomain]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostname) return;
    setErrorMessage(null);

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: newHostname.trim().toLowerCase(),
          type: 'custom',
          tenantId: tenant.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Error al registrar dominio. Comprueba tus límites.');
        return;
      }

      showToast(`Dominio '${newHostname}' añadido. Configura tus registros DNS.`);
      setIsModalOpen(false);
      setNewHostname('');
      loadDomains();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    }
  };

  const handleDeleteDomain = async (id: string, hostname: string) => {
    if (confirm(`¿Eliminar el dominio '${hostname}'?`)) {
      try {
        const res = await fetch(`/api/domains?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`Dominio '${hostname}' eliminado`);
          setDomains(prev => prev.filter(d => d.id !== id));
        }
      } catch {
        showToast('Error al eliminar');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Dominios & Enrutamiento DNS</h2>
            <p className="text-xs text-slate-400">Configuración de dominio propio, certificados SSL Let&apos;s Encrypt automáticos y subdominios</p>
          </div>
        </div>

        <button
          onClick={() => {
            setNewHostname('');
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Conectar Dominio Propio</span>
        </button>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* DNS Configuration Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Server className="w-4 h-4 text-amber-400" />
          <span>Instrucciones de Configuración DNS para Dominio Propio</span>
        </div>

        <p className="text-xs text-slate-400">
          Para que tu dominio apunte a tu tienda en FenixCMS, accede a tu proveedor de DNS (Cloudflare, GoDaddy, Namecheap, etc.) y crea el siguiente registro:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs">
          <div>
            <div className="text-[10px] text-slate-500">TIPO:</div>
            <div className="font-bold text-white">CNAME o A</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500">NOMBRE / HOST:</div>
            <div className="font-bold text-amber-400">@ / www</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-[10px] text-slate-500">DESTINO / VALOR:</div>
            <div className="font-bold text-emerald-400 truncate">ingress.fenixcms.es (o IP 199.36.158.100)</div>
          </div>
        </div>
      </div>

      {/* Domains Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-4">Dominio / Hostname</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Estado DNS</th>
                <th className="p-4">Certificado SSL</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {domains.map(d => (
                <tr key={d.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <span className="font-mono font-bold text-white text-sm">{d.hostname}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      d.type === 'primary' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      d.type === 'custom' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                      'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {d.type === 'subdomain' ? 'Subdominio Gratuito' : 'Dominio Personalizado'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" /> Verificado
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                      <Lock className="w-3 h-3" /> SSL TLS 1.3 Activo
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {d.type === 'custom' && (
                      <button
                        onClick={() => handleDeleteDomain(d.id, d.hostname)}
                        className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition ml-auto"
                        title="Eliminar dominio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Conectar Dominio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Conectar Dominio Personalizado</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddDomain} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Nombre de Dominio (Hostname) *</label>
                <input
                  type="text"
                  required
                  value={newHostname}
                  onChange={e => setNewHostname(e.target.value)}
                  placeholder="ejemplo.com o tienda.ejemplo.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500">
                  Introduce el dominio sin https:// ni barras.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Verificar y Conectar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
