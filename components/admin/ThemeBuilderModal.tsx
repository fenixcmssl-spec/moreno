'use client';

import React, { useState } from 'react';
import { ThemeBlockSection } from '@/types';
import { ThemeService, ThemeRecord } from '@/lib/services/theme.service';
import { 
  Palette, 
  Layers, 
  Type, 
  Save, 
  UploadCloud, 
  X, 
  Plus, 
  Trash2, 
  Eye, 
  MoveUp, 
  MoveDown,
  Sparkles,
  Smartphone,
  Monitor,
  CheckCircle,
  ShoppingBag,
  FileText,
  Tag
} from 'lucide-react';

interface ThemeBuilderModalProps {
  tenantId: string;
  theme: ThemeRecord;
  isOpen: boolean;
  onClose: () => void;
  onThemeUpdated?: () => void;
}

export function ThemeBuilderModal({ tenantId, theme, isOpen, onClose, onThemeUpdated }: ThemeBuilderModalProps) {
  const [sections, setSections] = useState<ThemeBlockSection[]>(
    theme.sections && theme.sections.length > 0
      ? [...theme.sections]
      : [
          { id: 'sec_1', type: 'header', title: 'Cabecera Principal', settings: { sticky: true, showSearch: true, showCart: true } },
          { id: 'sec_2', type: 'hero', title: 'Banner Hero Principal', settings: { headline: 'Nueva Colección Exclusiva', subtitle: 'Descubre las tendencias de la temporada con envío gratis en 24h', buttonText: 'Comprar Ahora', bgImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80' } },
          { id: 'sec_3', type: 'productGrid', title: 'Catálogo de Productos', settings: { columns: 4, limit: 8, showBadge: true } },
          { id: 'sec_4', type: 'cta', title: 'Llamada a la Acción', settings: { title: 'Únete al Club Fénix', text: 'Obtén 10% de descuento en tu primer pedido suscribiéndote a nuestra newsletter', buttonText: 'Suscribirme' } },
          { id: 'sec_5', type: 'footer', title: 'Pie de Página', settings: { showSocials: true, copyrightText: '© 2026 Fénix Corporation. Todos los derechos reservados.' } }
        ]
  );

  const [palette, setPalette] = useState({
    primary: theme.palette?.primary || '#3b82f6',
    secondary: theme.palette?.secondary || '#1e293b',
    background: theme.palette?.background || '#ffffff',
    accent: theme.palette?.accent || '#f59e0b',
    text: theme.palette?.text || '#0f172a'
  });

  const [typography, setTypography] = useState({
    headingFont: theme.typography?.headingFont || 'Plus Jakarta Sans',
    bodyFont: theme.typography?.bodyFont || 'Inter'
  });

  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(sections[0]?.id || null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSection = (type: ThemeBlockSection['type']) => {
    const newSection: ThemeBlockSection = {
      id: `sec_${Date.now()}`,
      type,
      title: type === 'productGrid' ? 'Catálogo de Productos' 
           : type === 'postGrid' ? 'Últimas Noticias & Blog' 
           : type === 'adGrid' ? 'Anuncios Destacados' 
           : type === 'hero' ? 'Banner Principal' 
           : type === 'cta' ? 'Llamada a la Acción' 
           : type === 'text' ? 'Bloque de Texto Enriquecido' 
           : 'Sección Personalizada',
      settings: {
        headline: 'Nuevo Título de Bloque',
        subtitle: 'Subtítulo descriptivo adaptable',
        buttonText: 'Explorar'
      }
    };
    setSections([...sections, newSection]);
    setSelectedSectionId(newSection.id);
  };

  const handleRemoveSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const newArr = [...sections];
    const [moved] = newArr.splice(index, 1);
    newArr.splice(targetIndex, 0, moved);
    setSections(newArr);
  };

  const handleSaveDraft = () => {
    ThemeService.saveDraft(tenantId, {
      themeId: theme.id,
      sections,
      palette,
      typography
    });
    setSaveStatus('Borrador guardado con éxito');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handlePublish = () => {
    ThemeService.saveDraft(tenantId, {
      themeId: theme.id,
      sections,
      palette,
      typography
    });
    ThemeService.publishDraft(tenantId);
    onThemeUpdated?.();
    setSaveStatus('¡Tema publicado en producción con éxito!');
    setTimeout(() => {
      setSaveStatus(null);
      onClose();
    }, 1500);
  };

  const activeSection = sections.find(s => s.id === selectedSectionId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col">
      {/* Top Header Bar */}
      <div className="h-16 px-6 border-b border-slate-800 bg-slate-900 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              Theme Builder Pro: <span className="text-blue-400">{theme.name}</span>
            </h2>
            <p className="text-xs text-slate-400">Editor visual de bloques y diseño modular JSONB</p>
          </div>
        </div>

        {/* Viewport switch & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition ${
                previewDevice === 'desktop' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Escritorio
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition ${
                previewDevice === 'mobile' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Móvil
            </button>
          </div>

          {saveStatus && (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded">
              <CheckCircle className="w-3.5 h-3.5" /> {saveStatus}
            </div>
          )}

          <button
            onClick={handleSaveDraft}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Save className="w-3.5 h-3.5" /> Guardar Borrador
          </button>

          <button
            onClick={handlePublish}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition"
          >
            <UploadCloud className="w-4 h-4" /> Publicar Tema
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Builder Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Blocks & Palette controls */}
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-400" /> Estructura de Secciones
            </h3>

            <div className="space-y-2">
              {sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                    selectedSectionId === sec.id
                      ? 'bg-blue-950/60 border-blue-500/50 text-blue-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold truncate">{sec.title || sec.type}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }}
                      disabled={idx === sections.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveSection(sec.id); }}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Section dropdown */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <label className="text-[11px] font-medium text-slate-400 block mb-2">Añadir Nuevo Bloque:</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleAddSection('hero')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" /> Hero Banner
                </button>
                <button
                  onClick={() => handleAddSection('productGrid')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition"
                >
                  <ShoppingBag className="w-3 h-3 text-blue-400" /> Catálogo
                </button>
                <button
                  onClick={() => handleAddSection('postGrid')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3 h-3 text-emerald-400" /> Blog & Posts
                </button>
                <button
                  onClick={() => handleAddSection('adGrid')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition"
                >
                  <Tag className="w-3 h-3 text-purple-400" /> Anuncios
                </button>
              </div>
            </div>
          </div>

          {/* Palette & Typography */}
          <div className="p-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-amber-400" /> Paleta de Marca
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Color Primario:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={palette.primary}
                    onChange={(e) => setPalette({ ...palette, primary: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-slate-300 text-[11px]">{palette.primary}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Color de Acento:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={palette.accent}
                    onChange={(e) => setPalette({ ...palette, accent: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-slate-300 text-[11px]">{palette.accent}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fondo General:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={palette.background}
                    onChange={(e) => setPalette({ ...palette, background: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-slate-300 text-[11px]">{palette.background}</span>
                </div>
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mt-6 mb-3 flex items-center gap-2">
              <Type className="w-3.5 h-3.5 text-emerald-400" /> Tipografías
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Fuente de Encabezados:</label>
                <select
                  value={typography.headingFont}
                  onChange={(e) => setTypography({ ...typography, headingFont: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs"
                >
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Playfair Display">Playfair Display (Serif)</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Cinzel">Cinzel (Luxury)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Fuente de Cuerpo:</label>
                <select
                  value={typography.bodyFont}
                  onChange={(e) => setTypography({ ...typography, bodyFont: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="System">System Sans</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Center Live Canvas Preview */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-start overflow-y-auto">
          <div
            className={`transition-all duration-300 bg-white rounded-xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col text-slate-900 ${
              previewDevice === 'mobile' ? 'w-[375px] min-h-[667px]' : 'w-full max-w-4xl min-h-[750px]'
            }`}
            style={{ backgroundColor: palette.background }}
          >
            {/* Render Simulated Theme Sections */}
            {sections.map(sec => {
              if (sec.type === 'header') {
                return (
                  <div key={sec.id} className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#e2e8f0' }}>
                    <div className="font-extrabold text-lg" style={{ color: palette.primary, fontFamily: typography.headingFont }}>
                      CORPORACIÓN FÉNIX
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                      <span>Inicio</span>
                      <span>Catálogo</span>
                      <span>Blog</span>
                      <span>Contacto</span>
                    </div>
                  </div>
                );
              }

              if (sec.type === 'hero') {
                return (
                  <div
                    key={sec.id}
                    className="p-8 text-center text-white relative flex flex-col items-center justify-center min-h-[260px]"
                    style={{
                      backgroundColor: palette.secondary,
                      backgroundImage: sec.settings?.bgImage ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url(${sec.settings.bgImage})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <h1 className="text-2xl font-black mb-2" style={{ fontFamily: typography.headingFont }}>
                      {sec.settings?.headline || 'Colección Exclusiva 2026'}
                    </h1>
                    <p className="text-xs text-slate-200 max-w-md mb-5" style={{ fontFamily: typography.bodyFont }}>
                      {sec.settings?.subtitle || 'Descubre la máxima potencia y versatilidad con diseño de vanguardia.'}
                    </p>
                    <button
                      className="px-5 py-2 rounded-lg text-xs font-bold text-white shadow-lg"
                      style={{ backgroundColor: palette.primary }}
                    >
                      {sec.settings?.buttonText || 'Ver Ofertas'}
                    </button>
                  </div>
                );
              }

              if (sec.type === 'productGrid') {
                return (
                  <div key={sec.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: typography.headingFont }}>
                        {sec.title || 'Productos Destacados'}
                      </h2>
                      <span className="text-xs font-semibold" style={{ color: palette.primary }}>Ver todo →</span>
                    </div>

                    <div className={`grid gap-3 ${previewDevice === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'}`}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col">
                          <div className="aspect-square bg-slate-200 rounded-md mb-2 flex items-center justify-center text-slate-400 text-xs">
                            <ShoppingBag className="w-6 h-6 text-slate-400" />
                          </div>
                          <div className="text-[11px] font-bold text-slate-800 truncate">Producto Demo #{i}</div>
                          <div className="text-xs font-extrabold mt-1" style={{ color: palette.primary }}>
                            {(29.99 * i).toFixed(2)} €
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (sec.type === 'cta') {
                return (
                  <div key={sec.id} className="p-6 m-4 rounded-xl text-center text-white" style={{ backgroundColor: palette.primary }}>
                    <h3 className="text-lg font-bold mb-1">{sec.settings?.title || 'Únete a nuestra comunidad'}</h3>
                    <p className="text-xs text-blue-100 max-w-md mx-auto mb-4">{sec.settings?.text || 'Suscríbete para recibir ofertas y novedades exclusivas.'}</p>
                    <button className="px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold shadow">
                      {sec.settings?.buttonText || 'Suscribirme'}
                    </button>
                  </div>
                );
              }

              if (sec.type === 'footer') {
                return (
                  <div key={sec.id} className="p-6 mt-auto border-t text-center text-[11px] text-slate-500" style={{ borderColor: '#e2e8f0' }}>
                    {sec.settings?.copyrightText || '© 2026 Corporación Fénix. Todos los derechos reservados.'}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* Right Sidebar: Selected Block Settings */}
        {activeSection && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 p-4 flex flex-col overflow-y-auto text-white">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Ajustes del Bloque: <span className="text-blue-400">{activeSection.type}</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Título de la Sección:</label>
                <input
                  type="text"
                  value={activeSection.title || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSections(sections.map(s => s.id === activeSection.id ? { ...s, title: val } : s));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-xs"
                />
              </div>

              {activeSection.settings?.headline !== undefined && (
                <div>
                  <label className="text-slate-400 block mb-1">Titular (Headline):</label>
                  <input
                    type="text"
                    value={activeSection.settings.headline || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSections(sections.map(s => s.id === activeSection.id ? { ...s, settings: { ...s.settings, headline: val } } : s));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
              )}

              {activeSection.settings?.subtitle !== undefined && (
                <div>
                  <label className="text-slate-400 block mb-1">Subtítulo:</label>
                  <textarea
                    rows={3}
                    value={activeSection.settings.subtitle || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSections(sections.map(s => s.id === activeSection.id ? { ...s, settings: { ...s.settings, subtitle: val } } : s));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
              )}

              {activeSection.settings?.buttonText !== undefined && (
                <div>
                  <label className="text-slate-400 block mb-1">Texto del Botón:</label>
                  <input
                    type="text"
                    value={activeSection.settings.buttonText || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSections(sections.map(s => s.id === activeSection.id ? { ...s, settings: { ...s.settings, buttonText: val } } : s));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
              )}

              {activeSection.settings?.bgImage !== undefined && (
                <div>
                  <label className="text-slate-400 block mb-1">URL Imagen de Fondo:</label>
                  <input
                    type="text"
                    value={activeSection.settings.bgImage || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSections(sections.map(s => s.id === activeSection.id ? { ...s, settings: { ...s.settings, bgImage: val } } : s));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
