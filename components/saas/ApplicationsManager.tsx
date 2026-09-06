'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { ApplicationDefinition, ApplicationTypeKey, ApplicationModuleDef } from '@/types';
import { 
  Layers, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Eye, 
  Sparkles, 
  Package, 
  ShoppingBag, 
  FileText, 
  Megaphone, 
  Calendar, 
  GraduationCap, 
  Compass, 
  X,
  Check
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingBag,
  FileText,
  Megaphone,
  Layers,
  Calendar,
  GraduationCap,
  Compass,
  Package
};

export function ApplicationsManager() {
  const { applications, createApplication, updateApplication, toggleApplicationStatus } = useStore();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ApplicationDefinition | null>(null);

  // Form State
  const [key, setKey] = useState<ApplicationTypeKey>('CUSTOM');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Layers');
  const [version, setVersion] = useState('1.0.0');
  const [category, setCategory] = useState('Custom Business');
  const [modulesInput, setModulesInput] = useState('core, dashboard, analytics');

  const handleOpenNew = () => {
    setKey('CUSTOM');
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Layers');
    setVersion('1.0.0');
    setCategory('Specialized Solution');
    setModulesInput('core, dashboard, settings');
    setIsNewModalOpen(true);
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    const moduleKeys = modulesInput.split(',').map(m => m.trim()).filter(Boolean);
    const modules: ApplicationModuleDef[] = moduleKeys.map((m, idx) => ({
      id: `mod_${idx}_${Date.now()}`,
      applicationId: '',
      key: m.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: m,
      isDefault: true
    }));
    
    await createApplication({
      key,
      name,
      slug,
      description,
      icon,
      version,
      category,
      modules,
      status: 'ACTIVE',
      settingsSchema: {
        themeAllowed: true,
        pluginsAllowed: true
      }
    });

    setIsNewModalOpen(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    const moduleKeys = modulesInput.split(',').map(m => m.trim()).filter(Boolean);
    const modules: ApplicationModuleDef[] = moduleKeys.map((m, idx) => ({
      id: `mod_${idx}_${Date.now()}`,
      applicationId: editingApp.id,
      key: m.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: m,
      isDefault: true
    }));

    await updateApplication(editingApp.id, {
      name,
      description,
      version,
      category,
      modules
    });

    setEditingApp(null);
  };

  const handleOpenEdit = (app: ApplicationDefinition) => {
    setEditingApp(app);
    setName(app.name);
    setDescription(app.description);
    setVersion(app.version);
    setCategory(app.category || 'General');
    setModulesInput(app.modules.map(m => typeof m === 'string' ? m : m.name || m.key).join(', '));
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Catálogo de Aplicaciones SaaS (Fase 1 y 2)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cada cliente tester o suscriptor puede contratar un tipo de aplicación específica (E-Commerce, Blog Editorial, Directorio de Clasificados, o crear soluciones personalizadas) con módulos modulares aislados.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Aplicación</span>
        </button>
      </div>

      {/* Grid of Applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {applications.map((app) => {
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
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
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
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-3 line-clamp-2">
                  {app.description}
                </p>

                {/* Modules list */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                    Módulos Incluidos ({app.modules.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {app.modules.map((mod, idx) => {
                      const modName = typeof mod === 'string' ? mod : mod.name || mod.key;
                      return (
                        <span 
                          key={typeof mod === 'object' && mod.id ? mod.id : `${modName}_${idx}`} 
                          className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono text-[10px] border border-slate-700/60"
                        >
                          {modName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleApplicationStatus(app.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    isActive 
                      ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/50' 
                      : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50'
                  }`}
                >
                  {isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>{isActive ? 'Desactivar' : 'Activar'}</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(app)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Crear Nueva Aplicación */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Registrar Nueva Aplicación en el Catálogo</span>
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tipo / Clave Enum</label>
                  <select
                    value={key}
                    onChange={e => setKey(e.target.value as ApplicationTypeKey)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="ECOMMERCE">ECOMMERCE</option>
                    <option value="BLOG">BLOG</option>
                    <option value="CLASSIFIEDS">CLASSIFIEDS</option>
                    <option value="LANDING">LANDING</option>
                    <option value="BOOKING">BOOKING</option>
                    <option value="LMS">LMS</option>
                    <option value="DIRECTORY">DIRECTORY</option>
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
                    placeholder="Ej: Fenix Booking & Citas"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Slug Identificador</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))}
                    placeholder="fenix-booking"
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
                  placeholder="Explica el propósito y las capacidades de esta aplicación para los clientes..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Módulos Separados por Comas</label>
                <input
                  type="text"
                  required
                  value={modulesInput}
                  onChange={e => setModulesInput(e.target.value)}
                  placeholder="calendar, appointments, payments, notifications, reminders"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Estos módulos se activarán automáticamente para los inquilinos que contraten este tipo de app.</p>
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
                  Registrar Aplicación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Aplicación */}
      {editingApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <span>Editar Aplicación: {editingApp.name}</span>
              </h3>
              <button onClick={() => setEditingApp(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Módulos Incluidos</label>
                <input
                  type="text"
                  required
                  value={modulesInput}
                  onChange={e => setModulesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
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
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
