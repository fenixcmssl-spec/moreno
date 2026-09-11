'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ExternalLink,
  ArrowUpRight,
  Sparkles,
  Layers,
  Key,
  Database,
  Globe,
  Users,
  HardDrive
} from 'lucide-react';
import { useStore } from '@/lib/storeContext';

interface BillingData {
  plan: any;
  license: any;
  subscription: any;
  entitlements: Record<string, any>;
  usage: {
    products: { current: number; limit: number; remaining: number };
    storage_mb: { current: number; limit: number; remaining: number };
    domains: { current: number; limit: number; remaining: number };
    users: { current: number; limit: number; remaining: number };
  };
  invoices: any[];
}

export function BillingCustomerManager() {
  const { tenant, plans } = useStore();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadBilling = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing');
      if (res.ok) {
        const data = await res.json();
        setBillingData(data);
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
        const res = await fetch('/api/billing');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setBillingData(data);
          }
        }
      } catch {
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    init();
    return () => { isMounted = false; };
  }, [tenant.id, tenant.planId]);

  const currentPlan = plans.find(p => p.id === tenant.planId) || plans[0] || {
    id: 'starter',
    name: 'Starter Plan',
    priceMonthly: 29,
    priceYearly: 290
  };

  const usage = billingData?.usage || {
    products: { current: 12, limit: 100, remaining: 88 },
    storage_mb: { current: 150, limit: 1024, remaining: 874 },
    domains: { current: 1, limit: 1, remaining: 0 },
    users: { current: 1, limit: 3, remaining: 2 }
  };

  const calculatePercent = (current: number, limit: number) => {
    if (limit <= 0 || limit >= 999999) return 5;
    return Math.min(100, Math.round((current / limit) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Suscripción, Licencia & Cuotas</h2>
            <p className="text-xs text-slate-400">Detalles de tu plan SaaS FenixCMS, consumo de recursos y facturas</p>
          </div>
        </div>

        <button
          onClick={() => setIsUpgradeModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Cambiar / Mejorar Plan</span>
        </button>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Plan Card & License Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px] rounded-full uppercase tracking-wider">
                  Plan Activo
                </span>
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Estado: Operativo
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">{currentPlan.name}</h3>
              <p className="text-xs text-slate-400">
                Facturación mensual automática activa. Renovación en ciclo regular.
              </p>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black text-amber-400 font-mono">
                {currentPlan.priceMonthly} €<span className="text-xs text-slate-400 font-sans font-normal">/mes</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Sin compromiso de permanencia</div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase">Aplicación</div>
              <div className="font-bold text-slate-200 mt-0.5">{tenant.applicationId || 'ecommerce'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase">Clave de Licencia</div>
              <div className="font-mono font-bold text-amber-400 text-[11px] mt-0.5 truncate">
                {tenant.licenseKey || 'FNX-LIC-DEMO-2026'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase">Moneda Tienda</div>
              <div className="font-bold text-slate-200 mt-0.5">{tenant.currency || 'EUR'} (€)</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase">Dominio Principal</div>
              <div className="font-mono text-emerald-400 text-[11px] mt-0.5 truncate">
                {tenant.customDomain || `${tenant.slug}.fenixcms.es`}
              </div>
            </div>
          </div>
        </div>

        {/* Security & License Quick Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Verificación de Licencia</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tu licencia otorga acceso cifrado a la API multi-tenant y a las actualizaciones de seguridad en tiempo real.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
            <div className="text-slate-500 text-[10px]">HASH DE FIRMA DIGITAL:</div>
            <div className="text-amber-400 truncate">sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1f...</div>
          </div>
        </div>
      </div>

      {/* Resource Quotas Gauges */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Consumo de Recursos & Entitlements del Plan</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Actualizado en tiempo real</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Products */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Productos Activos</span>
              <span className="font-mono font-bold text-white">
                {usage.products.current} / {usage.products.limit >= 99999 ? '∞' : usage.products.limit}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${calculatePercent(usage.products.current, usage.products.limit)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>{usage.products.remaining >= 99999 ? 'Ilimitados' : `${usage.products.remaining} disponibles`}</span>
              <span className="font-mono">{calculatePercent(usage.products.current, usage.products.limit)}%</span>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Almacenamiento Media</span>
              <span className="font-mono font-bold text-white">
                {usage.storage_mb.current} MB / {usage.storage_mb.limit} MB
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${calculatePercent(usage.storage_mb.current, usage.storage_mb.limit)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>{usage.storage_mb.remaining} MB libres</span>
              <span className="font-mono">{calculatePercent(usage.storage_mb.current, usage.storage_mb.limit)}%</span>
            </div>
          </div>

          {/* Domains */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Dominios Personalizados</span>
              <span className="font-mono font-bold text-white">
                {usage.domains.current} / {usage.domains.limit}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${calculatePercent(usage.domains.current, usage.domains.limit)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>{usage.domains.remaining} dominios extra</span>
              <span className="font-mono">{calculatePercent(usage.domains.current, usage.domains.limit)}%</span>
            </div>
          </div>

          {/* Users */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Usuarios de Equipo</span>
              <span className="font-mono font-bold text-white">
                {usage.users.current} / {usage.users.limit}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${calculatePercent(usage.users.current, usage.users.limit)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>{usage.users.remaining} plazas libres</span>
              <span className="font-mono">{calculatePercent(usage.users.current, usage.users.limit)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Historial de Facturas</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Descargas en PDF</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-4">Nº Factura</th>
                <th className="p-4">Fecha de Emisión</th>
                <th className="p-4">Concepto</th>
                <th className="p-4">Importe</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-mono font-bold text-white">INV-2026-00412</td>
                <td className="p-4 text-slate-400 font-mono">01/02/2026</td>
                <td className="p-4 text-slate-300">Suscripción Mensual - {currentPlan.name}</td>
                <td className="p-4 font-mono font-bold text-amber-400">{currentPlan.priceMonthly}.00 €</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                    Pagada
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => showToast('Descargando factura en PDF...')}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition text-xs flex items-center gap-1 ml-auto font-mono"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> PDF
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-mono font-bold text-white">INV-2026-00389</td>
                <td className="p-4 text-slate-400 font-mono">01/01/2026</td>
                <td className="p-4 text-slate-300">Suscripción Mensual - {currentPlan.name}</td>
                <td className="p-4 font-mono font-bold text-amber-400">{currentPlan.priceMonthly}.00 €</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                    Pagada
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => showToast('Descargando factura en PDF...')}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition text-xs flex items-center gap-1 ml-auto font-mono"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> PDF
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Mejorar Plan SaaS</h3>
                <p className="text-xs text-slate-400">Desbloquea funciones prémium, plugins avanzados y cuotas ampliadas</p>
              </div>
              <button onClick={() => setIsUpgradeModalOpen(false)} className="px-3 py-1 bg-slate-800 rounded-lg text-slate-400 hover:text-white text-xs">
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map(p => {
                const isSelected = p.id === tenant.planId;
                return (
                  <div 
                    key={p.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 ${
                      isSelected 
                        ? 'bg-amber-500/10 border-amber-500' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-sm">{p.name}</div>
                      <div className="text-xl font-black text-amber-400 font-mono mt-1">
                        {p.priceMonthly} €<span className="text-xs text-slate-500 font-normal">/mes</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-2 space-y-1">
                        <div>• Productos: {Number(p.entitlements?.['products.max'] || 0) >= 99999 ? 'Ilimitados' : (p.entitlements?.['products.max'] ?? '0')}</div>
                        <div>• Plugins: {p.entitlements?.['plugins.enabled'] ? 'Sí' : 'No'}</div>
                        <div>• Dominio propio: {p.entitlements?.['customDomain.enabled'] ? 'Sí' : 'No'}</div>
                        <div>• Anuncios: {p.entitlements?.['ads.enabled'] ? 'Sí' : 'No'}</div>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="w-full py-2 bg-amber-500 text-slate-950 font-bold text-center text-xs rounded-lg">
                        Plan Actual
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          showToast(`Solicitud de cambio al plan '${p.name}' registrada`);
                          setIsUpgradeModalOpen(false);
                        }}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                      >
                        Seleccionar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
