'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sliders, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  DollarSign, 
  Globe, 
  Lock, 
  AlertTriangle,
  Mail,
  Percent
} from 'lucide-react';
import { PlatformSettings } from '@/lib/services/super-admin.service';

export function PlatformSettingsManager() {
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: 'FenixCMS Cloud Engine',
    supportEmail: 'admin@fenixcms.io',
    defaultCurrency: 'EUR',
    defaultLocale: 'es',
    stripeEnabled: true,
    paypalEnabled: true,
    bizumEnabled: true,
    maintenanceMode: false,
    autoProvisionSSL: true,
    allowRegistrations: true,
    trialDaysDefault: 14,
    vatPercentage: 21,
    updatedAt: new Date().toISOString()
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(e => console.error('Error loading settings:', e))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [refreshIndex]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshIndex(prev => prev + 1);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Configuración global de FenixCMS guardada con éxito');
      }
    } catch (e) {
      showToast('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Configuración Maestra del Motor SaaS</h2>
            <p className="text-xs text-slate-400">Parámetros globales del entorno, pasarelas y políticas de seguridad</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
          title="Recargar"
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

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <span>Identidad y Localización Global</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Plataforma SaaS</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={e => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Correo de Soporte Maestro</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Moneda Base</label>
                <select
                  value={settings.defaultCurrency}
                  onChange={e => setSettings({ ...settings, defaultCurrency: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Idioma Predeterminado</label>
                <select
                  value={settings.defaultLocale}
                  onChange={e => setSettings({ ...settings, defaultLocale: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="es">Español (ES)</option>
                  <option value="en">English (EN)</option>
                  <option value="it">Italiano (IT)</option>
                  <option value="fr">Français (FR)</option>
                  <option value="de">Deutsch (DE)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Billing and Policies */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Políticas de Licenciamiento y Cobro</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Días de Prueba (Trial)</label>
                <input
                  type="number"
                  value={settings.trialDaysDefault}
                  onChange={e => setSettings({ ...settings, trialDaysDefault: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">IVA Legal por Defecto (%)</label>
                <input
                  type="number"
                  value={settings.vatPercentage}
                  onChange={e => setSettings({ ...settings, vatPercentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-300 block">Pasarelas de Pago del Portal SaaS</label>
              
              <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-200 font-medium">Stripe Elements (Tarjetas Seguras)</span>
                <input
                  type="checkbox"
                  checked={settings.stripeEnabled}
                  onChange={e => setSettings({ ...settings, stripeEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-200 font-medium">PayPal Checkout & Subscriptions</span>
                <input
                  type="checkbox"
                  checked={settings.paypalEnabled}
                  onChange={e => setSettings({ ...settings, paypalEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-200 font-medium">Bizum Automatizado</span>
                <input
                  type="checkbox"
                  checked={settings.bizumEnabled}
                  onChange={e => setSettings({ ...settings, bizumEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security and Mode */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>Infraestructura y Aprovisionamiento SSL</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700">
              <div>
                <span className="text-xs text-white font-semibold block">Aprovisionar SSL Automático</span>
                <span className="text-[10px] text-slate-400">Let&apos;s Encrypt wildcard para subdominios</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoProvisionSSL}
                onChange={e => setSettings({ ...settings, autoProvisionSSL: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700">
              <div>
                <span className="text-xs text-white font-semibold block">Permitir Registro de Tenants</span>
                <span className="text-[10px] text-slate-400">Self-service checkout habilitado</span>
              </div>
              <input
                type="checkbox"
                checked={settings.allowRegistrations}
                onChange={e => setSettings({ ...settings, allowRegistrations: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-rose-950/20 rounded-xl border border-rose-900/40">
              <div>
                <span className="text-xs text-rose-300 font-semibold block">Modo Mantenimiento Global</span>
                <span className="text-[10px] text-rose-400/80">Desactiva acceso a storefronts</span>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Parámetros en PostgreSQL'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
