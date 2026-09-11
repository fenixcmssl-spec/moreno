'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/storeContext';
import { ApplicationDefinition, ApplicationTypeKey, ApplicationModuleDef } from '@/types';
import { 
  Layers, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2,
  Package, 
  ShoppingBag, 
  FileText, 
  Megaphone, 
  Calendar, 
  GraduationCap, 
  Compass, 
  Briefcase,
  Sliders,
  X,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingCart: ShoppingBag,
  ShoppingBag,
  Newspaper: FileText,
  FileText,
  Megaphone,
  Tag: Package,
  Package,
  Calendar,
  GraduationCap,
  MapPin: Compass,
  Compass,
  Layers,
  Briefcase,
  Sliders,
  Box: Package
};

export function ApplicationsManager() {
  const { applications: contextApps } = useStore();
  const [apps, setApps] = useState<ApplicationDefinition[]>(contextApps || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ApplicationDefinition | null>(null);
  const [deletingApp, setDeletingApp] = useState<ApplicationDefinition | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [key, setKey] = useState<ApplicationTypeKey>('ECOMMERCE');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('ShoppingBag');
  const [version, setVersion] = useState('1.0.0');
  const [category, setCategory] = useState('E-commerce');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [modulesList, setModulesList] = useState<Array<{ key: string; name: string; description: string; isDefault: boolean }>>([]);
  const [newModuleKey, setNewModuleKey] = useState('');
  const [newModuleName, setNewModuleName] = useState('');

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const refreshApplications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/applications');
      if (res.ok) {
        const data = await res.json();
        if (data.applications && Array.isArray(data.applications)) {
          setApps(data.applications);
        }
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchApps() {
      try {
        const res = await fetch('/api/admin/applications');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.applications && Array.isArray(data.applications)) {
            setApps(data.applications);
          }
        }
      } catch (err) {
        console.warn('Initial apps fetch error:', err);
      }
    }
    fetchApps();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenNew = () => {
    setKey('ECOMMERCE');
    setName('');
    setSlug('');
    setDescription('');
    setIcon('ShoppingCart');
    setVersion('1.0.0');
    setCategory('E-commerce');
    setStatus('ACTIVE');
    setModulesList([
      { key: 'products', name: 'Catálogo de Productos', description: 'Gestión de productos y stock', isDefault: true },
      { key: 'orders', name: 'Gestión de Pedidos', description: 'Control de estados y envíos', isDefault: true },
      { key: 'gateways', name: 'Pasarelas de Pago', description: 'Stripe, PayPal, Bizum', isDefault: true }
    ]);
    setIsNewModalOpen(true);
  };

  const handleAddModule = () => {
    if (!newModuleKey.trim() || !newModuleName.trim()) return;
    const cleanKey = newModuleKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (modulesList.some(m => m.key === cleanKey)) {
      showToast('error', `El módulo con clave "${cleanKey}" ya existe en la lista.`);
      return;
    }
    setModulesList(prev => [...prev, {
      key: cleanKey,
      name: newModuleName.trim(),
      description: '',
      isDefault: true
    }]);
    setNewModuleKey('');
    setNewModuleName('');
  };

  const handleRemoveModule = (modKey: string) => {
    setModulesList(prev => prev.filter(m => m.key !== modKey));
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !key) return;

    try {
      const res = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          description,
          icon,
          version,
          category,
          status,
          modules: modulesList
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar la aplicación');
      }

      showToast('success', `Aplicación "${data.application.name}" creada en PostgreSQL con éxito.`);
      setIsNewModalOpen(false);
      refreshApplications();
    } catch (err: any) {
      showToast('error', err.message || 'Error al guardar la aplicación');
    }
  };

  const handleOpenEdit = (app: ApplicationDefinition) => {
    setEditingApp(app);
    setName(app.name);
    setKey(app.key);
    setSlug(app.slug);
    setDescription(app.description);
    setVersion(app.version);
    setIcon(app.icon);
    setCategory(app.category || 'General');
    setStatus((app.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE');
    setModulesList(
      (app.modules || []).map(m => ({
        key: m.key,
        name: m.name,
        description: m.description || '',
        isDefault: m.isDefault ?? true
      }))
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    try {
      const res = await fetch(`/api/admin/applications/${editingApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          key,
          slug,
          description,
          version,
          icon,
          category,
          status,
          modules: modulesList
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error actualizando la aplicación');
      }

      showToast('success', `Aplicación "${data.application.name}" actualizada con éxito.`);
      setEditingApp(null);
      refreshApplications();
    } catch (err: any) {
      showToast('error', err.message || 'Error al editar la aplicación');
    }
  };

  const handleToggleStatus = async (app: ApplicationDefinition) => {
    const nextStatus = app.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error cambiando estado');
      }

      showToast('success', `Aplicación ${nextStatus === 'ACTIVE' ? 'Activada' : 'Desactivada'} correctamente.`);
      refreshApplications();
    } catch (err: any) {
      showToast('error', err.message || 'Error al cambiar estado');
    }
  };

  const handleDeleteApp = async () => {
    if (!deletingApp) return;

    try {
      const res = await fetch(`/api/admin/applications/${deletingApp.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar');
      }

      showToast('success', `Aplicación "${deletingApp.name}" eliminada de PostgreSQL.`);
      setDeletingApp(null);
      refreshApplications();
    } catch (err: any) {
      showToast('error', err.message || 'Error al eliminar la aplicación');
    }
  };

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

      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Application Manager — PostgreSQL</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión centralizada de las arquitecturas de aplicación en base de datos. Define módulos disponibles, activa, desactiva o crea soluciones a medida.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshApplications}
            disabled={isLoading}
            className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition"
            title="Recargar desde PostgreSQL"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Nueva Aplicación</span>
          </button>
        </div>
      </div>

      {/* Grid of Applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {apps.map((app) => {
          const IconComp = ICON_MAP[app.icon] || Layers;
          const isActive = app.status === 'ACTIVE';

          return (
            <div 
              key={app.id} 
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-400">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{app.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 font-bold">
                          {app.key}
                        </span>
                        <span className="text-[10px] text-slate-500">v{app.version}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-3 line-clamp-2">
                  {app.description}
                </p>

                {/* Modules list */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 flex items-center justify-between">
                    <span>Módulos Disponibles ({app.modules?.length || 0})</span>
                    <span className="text-[9px] text-slate-600 font-normal">PostgreSQL</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {app.modules && app.modules.length > 0 ? (
                      app.modules.map((mod: ApplicationModuleDef | string, idx: number) => {
                        const modName = typeof mod === 'string' ? mod : mod.name || mod.key;
                        const modKey = typeof mod === 'string' ? mod : mod.key;
                        return (
                          <span 
                            key={typeof mod === 'object' && mod.id ? mod.id : `${modKey}_${idx}`} 
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700/60"
                            title={typeof mod === 'object' ? mod.description : undefined}
                          >
                            {modName}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-slate-600 italic">Sin submódulos configurados</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleStatus(app)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    isActive 
                      ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/50' 
                      : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50'
                  }`}
                  title={isActive ? 'Desactivar para nuevos comercios' : 'Activar en catálogo'}
                >
                  {isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>{isActive ? 'Desactivar' : 'Activar'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(app)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => setDeletingApp(app)}
                    className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 border border-rose-800/40 transition"
                    title="Eliminar de PostgreSQL"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Crear Nueva Aplicación */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Registrar Nueva Aplicación en PostgreSQL</span>
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tipo de Aplicación (Key)</label>
                  <select
                    value={key}
                    onChange={e => {
                      const newK = e.target.value as ApplicationTypeKey;
                      setKey(newK);
                      if (newK === 'ECOMMERCE') { setIcon('ShoppingCart'); setCategory('E-commerce'); }
                      else if (newK === 'BLOG') { setIcon('Newspaper'); setCategory('Contenido'); }
                      else if (newK === 'BLOG_ADS') { setIcon('Megaphone'); setCategory('Monetización'); }
                      else if (newK === 'CLASSIFIEDS') { setIcon('Tag'); setCategory('Marketplace'); }
                      else if (newK === 'BOOKING') { setIcon('Calendar'); setCategory('Servicios'); }
                      else if (newK === 'LMS') { setIcon('GraduationCap'); setCategory('Educación'); }
                      else if (newK === 'DIRECTORY') { setIcon('MapPin'); setCategory('Directorio'); }
                      else if (newK === 'LANDING') { setIcon('Layers'); setCategory('Marketing'); }
                      else if (newK === 'BUSINESS') { setIcon('Briefcase'); setCategory('Gestión'); }
                      else if (newK === 'CUSTOM') { setIcon('Sliders'); setCategory('Desarrollo'); }
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  >
                    <option value="ECOMMERCE">ECOMMERCE</option>
                    <option value="BLOG">BLOG</option>
                    <option value="BLOG_ADS">BLOG_ADS</option>
                    <option value="CLASSIFIEDS">CLASSIFIEDS</option>
                    <option value="BOOKING">BOOKING</option>
                    <option value="LMS">LMS</option>
                    <option value="DIRECTORY">DIRECTORY</option>
                    <option value="LANDING">LANDING</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Versión Inicial</label>
                  <input
                    type="text"
                    required
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }}
                    placeholder="Ej: Fenix E-commerce Pro"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Slug URL</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))}
                    placeholder="ecommerce-pro"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Explica las capacidades y alcance de esta aplicación para los suscriptores..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                />
              </div>

              {/* Módulos Disponibles */}
              <div className="border border-slate-800 bg-slate-950/40 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-200">Módulos Disponibles para esta Aplicación</label>
                  <span className="text-[10px] text-slate-400">{modulesList.length} añadidos</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Clave (ej. products, chat)"
                    value={newModuleKey}
                    onChange={e => setNewModuleKey(e.target.value)}
                    className="w-1/3 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Nombre del Módulo (ej. Catálogo)"
                    value={newModuleName}
                    onChange={e => setNewModuleName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddModule}
                    className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                  >
                    + Añadir
                  </button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {modulesList.map((m) => (
                    <div key={m.key} className="flex items-center justify-between px-2.5 py-1 bg-slate-800/80 rounded border border-slate-700 text-xs">
                      <span className="font-mono text-amber-400">{m.key}</span>
                      <span className="text-slate-300">{m.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveModule(m.key)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

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
                  Registrar Aplicación en PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Aplicación */}
      {editingApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <span>Editar Aplicación: {editingApp.name}</span>
              </h3>
              <button onClick={() => setEditingApp(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Versión</label>
                  <input
                    type="text"
                    required
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                />
              </div>

              {/* Módulos Disponibles */}
              <div className="border border-slate-800 bg-slate-950/40 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-200">Módulos Disponibles ({modulesList.length})</label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Clave (ej. coupons)"
                    value={newModuleKey}
                    onChange={e => setNewModuleKey(e.target.value)}
                    className="w-1/3 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Nombre del Módulo"
                    value={newModuleName}
                    onChange={e => setNewModuleName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddModule}
                    className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                  >
                    + Añadir
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {modulesList.map((m) => (
                    <div key={m.key} className="flex items-center justify-between px-2.5 py-1 bg-slate-800/80 rounded border border-slate-700 text-xs">
                      <span className="font-mono text-amber-400">{m.key}</span>
                      <span className="text-slate-300">{m.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveModule(m.key)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
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

      {/* Modal: Confirmar Eliminación */}
      {deletingApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">¿Eliminar Aplicación?</h3>
            </div>

            <p className="text-xs text-slate-300">
              Estás a punto de eliminar la aplicación <strong className="text-white">&quot;{deletingApp.name}&quot;</strong> ({deletingApp.key}) y todos sus submódulos de PostgreSQL.
            </p>

            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeletingApp(null)}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteApp}
                className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow text-xs"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
