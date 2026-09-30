'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { LogIn, Key, Store, ArrowRight, ShieldCheck, Lock, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';

export function MerchantLoginPortal() {
  const { setCurrentRoute, tenant, licenses, loginBackend } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [loginMode, setLoginMode] = useState<'credentials' | 'license_key'>('credentials');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    if (loginMode === 'credentials') {
      const res = await loginBackend(email, password, tenant.slug);
      setIsLoading(false);
      if (res.success) {
        setCurrentRoute('store_admin');
      } else {
        setErrorMsg(res.error || 'Credenciales no válidas');
      }
    } else {
      // License key login
      const cleanKey = (licenseKeyInput || tenant.licenseKey).trim();
      const lic = licenses.find(l => l.licenseKey.toLowerCase() === cleanKey.toLowerCase());
      if (lic || cleanKey === tenant.licenseKey) {
        setIsLoading(false);
        setCurrentRoute('store_admin');
      } else {
        setIsLoading(false);
        setErrorMsg('Clave de licencia no encontrada o inactiva.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-left">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Acceso Clientes FenixCMS</h2>
          <p className="text-xs text-slate-400">
            Inicia sesión para administrar el catálogo, pedidos y plugins de tu tienda (<span className="text-amber-400 font-mono">fenixcms.es/login</span>)
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="font-semibold">{errorMsg}</p>
          </div>
        )}

        {/* Mode switch */}
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => { setLoginMode('credentials'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-md font-semibold transition ${
              loginMode === 'credentials' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Email y Contraseña
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('license_key'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-md font-semibold transition ${
              loginMode === 'license_key' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Clave de Licencia
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {loginMode === 'credentials' ? (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email del Administrador</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="info@fenixcms.es"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-300">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Patricia1980@"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Clave de Licencia FenixCMS</label>
              <input
                type="text"
                required
                placeholder="FNX-PRO-9823-X981-DEMO"
                value={licenseKeyInput || tenant.licenseKey}
                onChange={e => setLicenseKeyInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-amber-400 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}

          {/* RBAC Note */}
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Acceso Seguro a la Tienda</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Accede con la cuenta de Administrador o con tu Clave de Licencia activa del comercio.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Validando credenciales...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar al Panel de Control ({tenant.customDomain || 'tutienda.com'}/admin)</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setCurrentRoute('saas_landing')}
            className="text-xs text-slate-400 hover:text-amber-400 transition"
          >
            ← Volver a la página principal de FenixCMS
          </button>
        </div>

      </div>
    </div>
  );
}
