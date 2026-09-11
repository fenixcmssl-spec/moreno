'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { Lock, Shield, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, Sparkles, KeyRound } from 'lucide-react';

interface BackendLoginGateProps {
  title?: string;
  subtitle?: string;
  targetDestination?: 'super_admin' | 'store_admin';
}

export function BackendLoginGate({
  title = 'Acceso al Backend FenixCMS',
  subtitle = 'Panel de Administración y Control Maestro',
  targetDestination = 'super_admin'
}: BackendLoginGateProps) {
  const { loginBackend, setCurrentRoute, tenant } = useStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const result = await loginBackend(email, password);
    setIsLoading(false);

    if (result.success) {
      if (targetDestination === 'super_admin') {
        setCurrentRoute('saas_admin');
      } else {
        setCurrentRoute('store_admin');
      }
    } else {
      setErrorMessage(result.error || 'Credenciales incorrectas o usuario no autorizado');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400" />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-amber-400">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>FenixCMS Security Gateway</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Usuario / Email Administrador
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="info@fenixcms.es"
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Patricia1980@"
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* RBAC Security Note */}
          <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Autenticación RBAC Segura</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Introduce las credenciales autorizadas para tu rol (Super Admin, Propietario o Administrador de Tienda).
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Verificando acceso...</span>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Iniciar Sesión en el Backend</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Secondary Links */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={() => setCurrentRoute('saas_landing')}
            className="hover:text-amber-400 transition"
          >
            ← Portal SaaS
          </button>

          <button
            onClick={() => setCurrentRoute('store_front')}
            className="hover:text-amber-400 transition"
          >
            Ver Tienda Online →
          </button>
        </div>

      </div>
    </div>
  );
}
