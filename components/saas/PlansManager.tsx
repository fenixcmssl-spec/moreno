'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/storeContext';
import { SaaSPlan, ApplicationDefinition } from '@/types';
import {
  Sliders,
  Plus,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  X,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Search,
  Check,
  Package,
  Layers,
  Calendar,
  Globe,
  HardDrive,
  Users,
  Coins
} from 'lucide-react';

export function PlansManager() {
  const { applications } = useStore();
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [appFilter, setAppFilter] = useState<string>('ALL');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<SaaSPlan | null>(null);
  const [deleteRestriction, setDeleteRestriction] = useState<{ canDelete: boolean; activeLicensesCount: number; reason?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State for Create / Edit
  const [formAppId, setFormAppId] = useState('app_ecommerce');
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMonthlyPrice, setFormMonthlyPrice] = useState(29);
  const [formYearlyPrice, setFormYearlyPrice] = useState(290);
  const [formCurrency, setFormCurrency] = useState('EUR');
  const [formTrialDays, setFormTrialDays] = useState(14);
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formBadge, setFormBadge] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPopular, setFormPopular] = useState(false);
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState('');
  
  // Entitlements form state
  const [formMaxProducts, setFormMaxProducts] = useState(500);
  const [formMaxStorageMb, setFormMaxStorageMb] = useState(5000);
  const [formMaxDomains, setFormMaxDomains] = useState(1);
  const [formMaxUsers, setFormMaxUsers] = useState(3);
  const [formAiEnabled, setFormAiEnabled] = useState(true);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        if (data.plans && Array.isArray(data.plans)) {
          setPlans(data.plans);
        }
      }
    } catch (err) {
      console.error('Error fetching plans from PostgreSQL:', err);
      showToast('error', 'Error al conectar con la base de datos de planes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchInitialPlans() {
      try {
        const res = await fetch('/api/admin/plans');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.plans && Array.isArray(data.plans)) {
            setPlans(data.plans);
          }
        }
      } catch (err) {
        console.error('Error fetching plans from PostgreSQL:', err);
      }
    }
    fetchInitialPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  // Open New Plan Form
  const handleOpenNew = () => {
    const defaultApp = applications[0]?.id || 'app_ecommerce';
    setFormAppId(defaultApp);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormMonthlyPrice(29);
    setFormYearlyPrice(290);
    setFormCurrency('EUR');
    setFormTrialDays(14);
    setFormStatus('ACTIVE');
    setFormBadge('');
    setFormImageUrl('');
    setFormPopular(false);
    setFormFeatures([
      'Acceso completo a todos los módulos contratados',
      'Certificado SSL automático y dominio personalizado',
      'Soporte multi-idioma oficial',
      'Copias de seguridad automáticas diarias'
    ]);
    setFormMaxProducts(500);
    setFormMaxStorageMb(5000);
    setFormMaxDomains(1);
    setFormMaxUsers(3);
    setFormAiEnabled(true);
    setIsNewModalOpen(true);
  };

  // Open Edit Plan Form
  const handleOpenEdit = (plan: SaaSPlan) => {
    setEditingPlan(plan);
    setFormAppId(plan.applicationId || applications[0]?.id || 'app_ecommerce');
    setFormName(plan.name);
    setFormSlug(plan.slug);
    setFormDescription(plan.description);
    setFormMonthlyPrice(plan.monthlyPrice ?? plan.priceMonthly ?? 29);
    setFormYearlyPrice(plan.yearlyPrice ?? plan.priceYearly ?? 290);
    setFormCurrency(plan.currency || 'EUR');
    setFormTrialDays(plan.trialDays ?? 14);
    setFormStatus((plan.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE');
    setFormBadge(plan.badge || '');
    setFormImageUrl(plan.imageUrl || '');
    setFormPopular(Boolean(plan.popular));
    setFormFeatures(Array.isArray(plan.features) ? [...plan.features] : []);
    
    const ent = plan.entitlements || {};
    setFormMaxProducts(Number(ent['products.max'] ?? plan.maxProducts ?? 500));
    setFormMaxStorageMb(Number(ent['storage.max_mb'] ?? plan.maxStorageMb ?? 5000));
    setFormMaxDomains(Number(ent['domains.max'] ?? 1));
    setFormMaxUsers(Number(ent['users.max'] ?? 3));
    setFormAiEnabled(ent['ai.enabled'] !== false);
  };

  // Add Feature to form
  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFormFeatures(prev => [...prev, newFeatureText.trim()]);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index: number) => {
    setFormFeatures(prev => prev.filter((_, i) => i !== index));
  };

  // Create Plan in PostgreSQL
  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: formAppId,
          name: formName.trim(),
          slug: formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          description: formDescription.trim(),
          monthlyPrice: Number(formMonthlyPrice),
          yearlyPrice: Number(formYearlyPrice),
          currency: formCurrency,
          trialDays: Number(formTrialDays),
          status: formStatus,
          badge: formBadge.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          popular: formPopular,
          features: formFeatures,
          entitlements: {
            'products.max': Number(formMaxProducts),
            'storage.max_mb': Number(formMaxStorageMb),
            'domains.max': Number(formMaxDomains),
            'users.max': Number(formMaxUsers),
            'ai.enabled': formAiEnabled
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar el plan');
      }

      showToast('success', `Plan "${data.plan.name}" creado en PostgreSQL con éxito.`);
      setIsNewModalOpen(false);
      loadPlans();
    } catch (err: any) {
      showToast('error', err.message || 'Error al guardar el plan en PostgreSQL');
    }
  };

  // Save Edit in PostgreSQL
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: formAppId,
          name: formName.trim(),
          slug: formSlug.trim(),
          description: formDescription.trim(),
          monthlyPrice: Number(formMonthlyPrice),
          yearlyPrice: Number(formYearlyPrice),
          currency: formCurrency,
          trialDays: Number(formTrialDays),
          status: formStatus,
          badge: formBadge.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          popular: formPopular,
          features: formFeatures,
          entitlements: {
            'products.max': Number(formMaxProducts),
            'storage.max_mb': Number(formMaxStorageMb),
            'domains.max': Number(formMaxDomains),
            'users.max': Number(formMaxUsers),
            'ai.enabled': formAiEnabled
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error actualizando plan');
      }

      showToast('success', `Plan "${data.plan.name}" actualizado en PostgreSQL.`);
      setEditingPlan(null);
      loadPlans();
    } catch (err: any) {
      showToast('error', err.message || 'Error al actualizar el plan');
    }
  };

  // Toggle Plan Status in PostgreSQL (Active / Inactive)
  const handleToggleStatus = async (plan: SaaSPlan) => {
    const nextStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error cambiando estado');
      }

      showToast('success', `Plan "${plan.name}" ${nextStatus === 'ACTIVE' ? 'Activado' : 'Desactivado'} en PostgreSQL.`);
      loadPlans();
    } catch (err: any) {
      showToast('error', err.message || 'Error al cambiar estado del plan');
    }
  };

  // Duplicate Plan in PostgreSQL
  const handleDuplicatePlan = async (plan: SaaSPlan) => {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}/duplicate`, {
        method: 'POST'
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error duplicando plan');
      }

      showToast('success', `Plan duplicado exitosamente: "${data.plan.name}".`);
      loadPlans();
    } catch (err: any) {
      showToast('error', err.message || 'Error al duplicar plan');
    }
  };

  // Check delete restrictions and open delete modal
  const handleRequestDelete = async (plan: SaaSPlan) => {
    setPlanToDelete(plan);
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`);
      if (res.ok) {
        const data = await res.json();
        setDeleteRestriction({
          canDelete: data.canDelete ?? (data.activeLicensesCount === 0),
          activeLicensesCount: data.activeLicensesCount ?? 0,
          reason: data.deleteRestrictionReason
        });
      } else {
        setDeleteRestriction({ canDelete: true, activeLicensesCount: 0 });
      }
    } catch {
      setDeleteRestriction({ canDelete: true, activeLicensesCount: 0 });
    }
  };

  // Confirm deletion in PostgreSQL
  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/plans/${planToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo eliminar el plan');
      }

      showToast('success', `Plan "${planToDelete.name}" eliminado de PostgreSQL.`);
      setPlanToDelete(null);
      setDeleteRestriction(null);
      loadPlans();
    } catch (err: any) {
      showToast('error', err.message || 'Error al eliminar el plan');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter plans
  const filteredPlans = plans.filter(p => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (appFilter !== 'ALL' && p.applicationId !== appFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold shadow-lg border animate-in fade-in slide-in-from-top-2 ${
          notification.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
            : 'bg-rose-950/90 text-rose-300 border-rose-800'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Plan Manager — PostgreSQL</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gestión integral de planes de suscripción, precios mensuales/anuales, límites de recursos y restricciones de integridad en base de datos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={loadPlans}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition"
            title="Recargar desde PostgreSQL"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Nuevo Plan</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, slug o descripción..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Status Filter */}
          <div className="inline-flex p-0.5 bg-slate-800 rounded-lg border border-slate-700 text-[11px]">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                statusFilter === 'ALL' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({plans.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                statusFilter === 'ACTIVE' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Activos ({plans.filter(p => p.status === 'ACTIVE').length})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                statusFilter === 'INACTIVE' ? 'bg-rose-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Inactivos ({plans.filter(p => p.status === 'INACTIVE').length})
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Plans */}
      {filteredPlans.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Sliders className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No se encontraron planes</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No hay planes que coincidan con los filtros seleccionados o el catálogo está vacío en PostgreSQL.
            </p>
          </div>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Plan</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const isActive = plan.status === 'ACTIVE';
            const activeLicCount = plan._count?.activeLicenses ?? 0;
            const app = applications.find(a => a.id === plan.applicationId || a.key === plan.applicationId);

            return (
              <div
                key={plan.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition relative shadow-lg overflow-hidden group"
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-wider px-3 py-0.5 rounded-bl-lg shadow">
                    Popular
                  </div>
                )}

                <div>
                  {/* Top row: Badge & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {plan.badge && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {plan.badge}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {app ? app.name : (plan.applicationId || 'General')}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Plan Name & Pricing */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white tracking-tight">{plan.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-400">
                        {plan.monthlyPrice ?? plan.priceMonthly ?? 0} {plan.currency === 'USD' ? '$' : '€'}
                      </span>
                      <span className="text-xs text-slate-400">/ mes</span>
                      <span className="text-xs text-slate-500 font-mono">
                        ({plan.yearlyPrice ?? plan.priceYearly ?? 0} {plan.currency === 'USD' ? '$' : '€'}/año)
                      </span>
                    </div>
                  </div>

                  {/* Trial & Slug */}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>{plan.trialDays ?? 14} días prueba</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      slug: {plan.slug}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 min-h-[32px]">
                    {plan.description}
                  </p>

                  {/* Entitlements / Limits Grid */}
                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-slate-500" /> Capacidad Productos:
                      </span>
                      <span className="font-bold text-white">
                        {plan.entitlements?.['products.max'] ?? plan.maxProducts ?? 'Ilimitado'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <HardDrive className="w-3 h-3 text-slate-500" /> Almacenamiento:
                      </span>
                      <span className="font-bold text-white">
                        {plan.entitlements?.['storage.max_mb'] ?? plan.maxStorageMb ?? 5000} MB
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-slate-500" /> Dominios Permitidos:
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {plan.entitlements?.['domains.max'] ?? 1}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400" /> IA Gemini:
                      </span>
                      <span className={plan.entitlements?.['ai.enabled'] !== false ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                        {plan.entitlements?.['ai.enabled'] !== false ? 'Activada' : 'No incluida'}
                      </span>
                    </div>
                  </div>

                  {/* Features Bullets */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Características incluidas ({plan.features.length})
                      </div>
                      {plan.features.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                      {plan.features.length > 3 && (
                        <div className="text-[10px] text-slate-500 font-semibold pl-4">
                          +{plan.features.length - 3} más...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Licenses Info */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Licencias Activas:</span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                      activeLicCount > 0 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {activeLicCount} {activeLicCount === 1 ? 'licencia' : 'licencias'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Toolbar */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Toggle Status */}
                    <button
                      onClick={() => handleToggleStatus(plan)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        isActive
                          ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/50'
                          : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50'
                      }`}
                      title={isActive ? 'Desactivar plan' : 'Activar plan'}
                    >
                      {isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      <span>{isActive ? 'Desactivar' : 'Activar'}</span>
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicatePlan(plan)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
                      title="Duplicar este plan en PostgreSQL"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Duplicar</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(plan)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition shadow"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    {/* Delete with Active License Protection */}
                    <button
                      onClick={() => handleRequestDelete(plan)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800/50 transition"
                      title={activeLicCount > 0 ? 'No se puede eliminar (tiene licencias activas)' : 'Eliminar de PostgreSQL'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREAR NUEVO PLAN EN POSTGRESQL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Crear Nuevo Plan en PostgreSQL</h3>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-4 text-xs">
              {/* Row 1: Application and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Aplicación Destino</label>
                  <select
                    value={formAppId}
                    onChange={e => setFormAppId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                  >
                    {applications.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.key})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Estado Inicial</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                  >
                    <option value="ACTIVE">Activo (Visible para suscripción)</option>
                    <option value="INACTIVE">Inactivo (Borrador / Oculto)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Name, Slug, Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Professional Growth"
                    value={formName}
                    onChange={e => {
                      setFormName(e.target.value);
                      if (!formSlug) setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Slug URL</label>
                  <input
                    type="text"
                    required
                    placeholder="pro-growth"
                    value={formSlug}
                    onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Insignia / Badge</label>
                  <input
                    type="text"
                    placeholder="ej. Más Popular"
                    value={formBadge}
                    onChange={e => setFormBadge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Row 3: Prices, Currency, Trial */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Precio Mensual</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formMonthlyPrice}
                    onChange={e => {
                      const m = Number(e.target.value);
                      setFormMonthlyPrice(m);
                      setFormYearlyPrice(m * 10);
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Precio Anual</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formYearlyPrice}
                    onChange={e => setFormYearlyPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Moneda</label>
                  <select
                    value={formCurrency}
                    onChange={e => setFormCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Días de Prueba</label>
                  <input
                    type="number"
                    min="0"
                    value={formTrialDays}
                    onChange={e => setFormTrialDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Descripción Comercial</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explica qué tipo de negocio o cliente saca el mayor provecho de este plan..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                />
              </div>

              {/* Entitlements / Límites */}
              <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Límites y Recursos del Plan (Entitlements)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Máx. Productos</label>
                    <input
                      type="number"
                      min="1"
                      value={formMaxProducts}
                      onChange={e => setFormMaxProducts(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Almacenamiento (MB)</label>
                    <input
                      type="number"
                      min="100"
                      value={formMaxStorageMb}
                      onChange={e => setFormMaxStorageMb(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Máx. Dominios</label>
                    <input
                      type="number"
                      min="1"
                      value={formMaxDomains}
                      onChange={e => setFormMaxDomains(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Máx. Usuarios</label>
                    <input
                      type="number"
                      min="1"
                      value={formMaxUsers}
                      onChange={e => setFormMaxUsers(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAiEnabled}
                      onChange={e => setFormAiEnabled(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-slate-300 text-[11px] font-semibold">Habilitar IA Gemini (Fichas y SEO)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPopular}
                      onChange={e => setFormPopular(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-slate-300 text-[11px] font-semibold">Marcar como «Más Popular»</span>
                  </label>
                </div>
              </div>

              {/* Features List */}
              <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                <label className="text-[11px] font-bold text-white flex items-center justify-between">
                  <span>Puntos de Características Visibles ({formFeatures.length})</span>
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ej. Pasarela Stripe y PayPal oficial incluida"
                    value={newFeatureText}
                    onChange={e => setNewFeatureText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                  >
                    + Añadir
                  </button>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {formFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center justify-between px-2.5 py-1 bg-slate-800/80 rounded border border-slate-700 text-xs">
                      <span className="text-slate-200">{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
                >
                  Crear Plan en PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR PLAN EN POSTGRESQL */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Edit className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Editar Plan: {editingPlan.name}</h3>
              </div>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Row 1: Application and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Aplicación Destino</label>
                  <select
                    value={formAppId}
                    onChange={e => setFormAppId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                  >
                    {applications.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.key})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Estado</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Name, Slug, Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Slug URL</label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Insignia / Badge</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={e => setFormBadge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Row 3: Prices, Currency, Trial */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Precio Mensual</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formMonthlyPrice}
                    onChange={e => setFormMonthlyPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Precio Anual</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formYearlyPrice}
                    onChange={e => setFormYearlyPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Moneda</label>
                  <select
                    value={formCurrency}
                    onChange={e => setFormCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Días de Prueba</label>
                  <input
                    type="number"
                    min="0"
                    value={formTrialDays}
                    onChange={e => setFormTrialDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  required
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                />
              </div>

              {/* Entitlements / Límites */}
              <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                <label className="text-[11px] font-bold text-white flex items-center justify-between">
                  <span>Límites y Recursos (Entitlements)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Máx. Productos</label>
                    <input
                      type="number"
                      min="1"
                      value={formMaxProducts}
                      onChange={e => setFormMaxProducts(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Almacenamiento (MB)</label>
                    <input
                      type="number"
                      min="100"
                      value={formMaxStorageMb}
                      onChange={e => setFormMaxStorageMb(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Máx. Dominios</label>
                    <input
                      type="number"
                      min="1"
                      value={formMaxDomains}
                      onChange={e => setFormMaxDomains(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Máx. Usuarios</label>
                    <input
                      type="number"
                      min="1"
                      value={formMaxUsers}
                      onChange={e => setFormMaxUsers(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAiEnabled}
                      onChange={e => setFormAiEnabled(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-slate-300 text-[11px] font-semibold">Habilitar IA Gemini</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPopular}
                      onChange={e => setFormPopular(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-slate-300 text-[11px] font-semibold">Marcar como «Más Popular»</span>
                  </label>
                </div>
              </div>

              {/* Features List */}
              <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                <label className="text-[11px] font-bold text-white flex items-center justify-between">
                  <span>Características ({formFeatures.length})</span>
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nueva característica..."
                    value={newFeatureText}
                    onChange={e => setNewFeatureText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                  >
                    + Añadir
                  </button>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {formFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center justify-between px-2.5 py-1 bg-slate-800/80 rounded border border-slate-700 text-xs">
                      <span className="text-slate-200">{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
                >
                  Guardar Cambios en PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRMAR ELIMINACIÓN CON RESTRICCIÓN DE INTEGRIDAD */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            {deleteRestriction && !deleteRestriction.canDelete ? (
              // RESTRICTION: Active licenses prevent deletion
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-rose-400">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Eliminación Bloqueada</h3>
                    <p className="text-[11px] text-rose-300 font-semibold">Restricción de Integridad Referencial</p>
                  </div>
                </div>

                <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-3.5 space-y-2 text-xs">
                  <p className="text-rose-200">
                    El plan <strong className="text-white">&quot;{planToDelete.name}&quot;</strong> no puede ser eliminado porque tiene{' '}
                    <strong className="text-amber-400 font-bold">{deleteRestriction.activeLicensesCount} licencia(s) activa(s)</strong> vinculada(s).
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Para garantizar la continuidad operativa de los comercios y clientes suscritos, primero debes suspender, cancelar o migrar sus licencias a otro plan.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setPlanToDelete(null);
                      setDeleteRestriction(null);
                    }}
                    className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
                  >
                    Entendido, Mantener Plan
                  </button>
                </div>
              </div>
            ) : (
              // Safe deletion confirmation
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-amber-400">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">¿Eliminar Plan de PostgreSQL?</h3>
                    <p className="text-[11px] text-slate-400">Esta acción no se puede deshacer</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300">
                  Estás a punto de eliminar permanentemente el plan <strong className="text-white">&quot;{planToDelete.name}&quot;</strong> ({planToDelete.slug}).
                </p>

                <div className="flex gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setPlanToDelete(null);
                      setDeleteRestriction(null);
                    }}
                    className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow text-xs flex items-center justify-center gap-1.5"
                  >
                    {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Confirmar Eliminación</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
