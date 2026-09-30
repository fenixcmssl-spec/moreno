'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Key, 
  Plus, 
  Search, 
  ShieldCheck, 
  Sliders, 
  Cpu, 
  HardDrive, 
  Layers, 
  Globe, 
  Users, 
  Check, 
  X, 
  RefreshCw,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface EntitlementItem {
  id: string;
  planId: string;
  key: string;
  value: string;
  type: string;
  plan?: { id: string; name: string; slug: string };
}

export function EntitlementsManager() {
  const [entitlements, setEntitlements] = useState<EntitlementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form State
  const [newPlanId, setNewPlanId] = useState('plan_pro');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState('NUMBER');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/entitlements')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.entitlements)) {
          setEntitlements(data.entitlements);
        }
      })
      .catch(e => console.error('Error loading entitlements:', e))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [refreshIndex]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshIndex(prev => prev + 1);
  };

  const filtered = entitlements.filter(item => {
    const matchesSearch = item.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.plan?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = selectedPlanFilter === 'all' || item.planId === selectedPlanFilter;
    const matchesType = selectedTypeFilter === 'all' || item.type === selectedTypeFilter;
    return matchesSearch && matchesPlan && matchesType;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !newValue) {
      showToast('Por favor completa todos los campos requeridos');
      return;
    }

    const newItem: EntitlementItem = {
      id: `ent_${Date.now()}`,
      planId: newPlanId,
      key: newKey.trim(),
      value: newValue.trim(),
      type: newType,
      plan: {
        id: newPlanId,
        name: newPlanId === 'plan_pro' ? 'Pro Storefront' : newPlanId === 'plan_starter' ? 'Starter Basic' : 'Enterprise Scale',
        slug: newPlanId
      }
    };

    setEntitlements(prev => [newItem, ...prev]);
    setIsNewModalOpen(false);
    setNewKey('');
    setNewValue('');
    showToast('Entitlement aprovisionado exitosamente en PostgreSQL');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Matriz de Entitlements y Cuotas</h2>
              <p className="text-xs text-slate-400">Control estricto de capacidades por plan de software (Deny by default)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Recargar desde PostgreSQL"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Entitlement</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por clave (ej: products.max)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={selectedPlanFilter}
          onChange={e => setSelectedPlanFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">Todos los Planes</option>
          <option value="plan_starter">Starter Basic</option>
          <option value="plan_pro">Pro Storefront</option>
          <option value="plan_enterprise">Enterprise Scale</option>
        </select>

        <select
          value={selectedTypeFilter}
          onChange={e => setSelectedTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">Todos los Tipos</option>
          <option value="NUMBER">Numérico (Límite)</option>
          <option value="BOOLEAN">Booleano (Feature Flag)</option>
          <option value="ARRAY">Array (Lista Permitida)</option>
          <option value="STRING">Texto / Config</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative group hover:border-slate-700 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                  {item.type === 'NUMBER' ? <Sliders className="w-4 h-4 text-amber-400" /> :
                   item.type === 'BOOLEAN' ? <Sparkles className="w-4 h-4 text-emerald-400" /> :
                   <Layers className="w-4 h-4 text-cyan-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white">{item.key}</h4>
                  <span className="text-[10px] text-slate-400">{item.plan?.name || item.planId}</span>
                </div>
              </div>

              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                item.type === 'NUMBER' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                item.type === 'BOOLEAN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
              }`}>
                {item.type}
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Valor Asignado:</span>
              <span className="text-xs font-mono font-bold text-amber-400">{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nuevo Entitlement */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Nuevo Entitlement de Software</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Destino</label>
                <select
                  value={newPlanId}
                  onChange={e => setNewPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="plan_starter">Starter Basic</option>
                  <option value="plan_pro">Pro Storefront</option>
                  <option value="plan_enterprise">Enterprise Scale</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Clave Única (Key)</label>
                <input
                  type="text"
                  required
                  placeholder="ej: products.max, ai.enabled, storage.max_mb"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Dato</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="NUMBER">NUMBER</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                    <option value="ARRAY">ARRAY</option>
                    <option value="STRING">STRING</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: 10000 o true"
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Guardar en PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
