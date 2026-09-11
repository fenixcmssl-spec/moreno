'use client';

import React, { useState } from 'react';
import { 
  FolderTree, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  CheckCircle2, 
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import { useStore } from '@/lib/storeContext';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  productCount: number;
  featured: boolean;
}

const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: 'cat_1', name: 'Electrónica', slug: 'electronica', description: 'Gadgets, audio y tecnología de vanguardia', icon: '⚡', productCount: 14, featured: true },
  { id: 'cat_2', name: 'Ropa & Moda', slug: 'ropa-moda', description: 'Colección de temporada y calzado', icon: '👔', productCount: 28, featured: true },
  { id: 'cat_3', name: 'Hogar & Confort', slug: 'hogar-confort', description: 'Mobiliario, iluminación y decoración', icon: '🏠', productCount: 9, featured: false },
  { id: 'cat_4', name: 'Deportes & Fitness', slug: 'deportes-fitness', description: 'Equipamiento deportivo y accesorios', icon: '⚽', productCount: 16, featured: false },
  { id: 'cat_5', name: 'Belleza & Cuidado', slug: 'belleza-cuidado', description: 'Cosmética natural y cuidado personal', icon: '✨', productCount: 7, featured: true }
];

export function CategoriesManager() {
  const { products } = useStore();
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('📦');
  const [formFeatured, setFormFeatured] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormIcon('📦');
    setFormFeatured(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description);
    setFormIcon(cat.icon || '📦');
    setFormFeatured(cat.featured);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    const slug = formSlug || formName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? {
        ...c,
        name: formName,
        slug,
        description: formDescription,
        icon: formIcon,
        featured: formFeatured
      } : c));
      showToast(`Categoría '${formName}' actualizada`);
    } else {
      const newCat: CategoryItem = {
        id: `cat_${Date.now()}`,
        name: formName,
        slug,
        description: formDescription,
        icon: formIcon,
        productCount: 0,
        featured: formFeatured
      };
      setCategories(prev => [newCat, ...prev]);
      showToast(`Categoría '${formName}' creada exitosamente`);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Eliminar la categoría '${name}'?`)) {
      setCategories(prev => prev.filter(c => c.id !== id));
      showToast(`Categoría '${name}' eliminada`);
    }
  };

  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Categorías de Productos</h2>
            <p className="text-xs text-slate-400">Estructura taxonómica, navegación del catálogo y filtros de tienda</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Categoría</span>
        </button>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, slug o descripción..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {filtered.length} categorías
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(cat => (
          <div key={cat.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{cat.icon || '📦'}</span>
                <div className="flex items-center gap-2">
                  {cat.featured && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Destacada
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                    /{cat.slug}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition">{cat.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{cat.description || 'Sin descripción'}</p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Package className="w-3.5 h-3.5 text-blue-400" />
                <span>{products.filter(p => p.category?.toLowerCase() === cat.name.toLowerCase()).length || cat.productCount} productos</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                  title="Editar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría de Tienda'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3 space-y-1.5">
                  <label className="text-slate-300 font-semibold">Nombre de la Categoría *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => {
                      setFormName(e.target.value);
                      if (!editingCategory) {
                        setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    placeholder="Ej. Audio y Auriculares"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Icono</label>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={e => setFormIcon(e.target.value)}
                    placeholder="🎧"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center text-lg text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Slug URL</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={e => setFormSlug(e.target.value)}
                  placeholder="audio-auriculares"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Descripción</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Descripción corta para clientes y motores de búsqueda SEO..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="featCat"
                  checked={formFeatured}
                  onChange={e => setFormFeatured(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
                />
                <label htmlFor="featCat" className="text-slate-300 cursor-pointer font-medium">
                  Mostrar como categoría destacada en la página principal
                </label>
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
                  {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
