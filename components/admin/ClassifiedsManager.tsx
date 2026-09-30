'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClassifiedAdItem } from '@/lib/services/classified.service';
import { 
  Tag, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Heart, 
  Eye, 
  Star, 
  ShieldAlert, 
  Save, 
  X,
  Edit,
  Trash2,
  RefreshCw,
  Loader2,
  Filter
} from 'lucide-react';

interface ClassifiedsManagerProps {
  tenantId: string;
}

export function ClassifiedsManager({ tenantId }: ClassifiedsManagerProps) {
  const [ads, setAds] = useState<ClassifiedAdItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<ClassifiedAdItem | null>(null);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    categoryName: 'Motor & Vehículos',
    categoryId: 'clcat_motor',
    sellerName: 'Carlos Mendoza',
    price: 15000,
    location: 'Valencia, España',
    city: 'Valencia',
    phone: '+34 600 112 233',
    contactEmail: 'contacto@vendedor.es',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80',
    status: 'PUBLISHED' as any,
    featured: true
  });

  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/classifieds`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.ads)) {
          setAds(data.ads);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Error cargando anuncios clasificados');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const handleOpenCreate = () => {
    setEditingAd(null);
    setForm({
      title: '',
      slug: '',
      categoryName: 'Motor & Vehículos',
      categoryId: 'clcat_motor',
      sellerName: 'Carlos Mendoza',
      price: 15000,
      location: 'Valencia, España',
      city: 'Valencia',
      phone: '+34 600 112 233',
      contactEmail: 'contacto@vendedor.es',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80',
      status: 'PUBLISHED',
      featured: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ad: ClassifiedAdItem) => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      slug: ad.slug,
      categoryName: ad.category || 'General',
      categoryId: ad.categoryId || 'clcat_general',
      sellerName: ad.sellerName,
      price: ad.price,
      location: ad.location,
      city: ad.city || 'Madrid',
      phone: ad.sellerPhone || '',
      contactEmail: ad.sellerEmail || '',
      description: ad.description || '',
      imageUrl: ad.images[0] || 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80',
      status: ad.status,
      featured: ad.featured
    });
    setIsModalOpen(true);
  };

  const handleStatusChange = async (adId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/classifieds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adId, status: newStatus })
      });

      if (res.ok) {
        const data = await res.json();
        setAds(ads.map(a => a.id === adId ? data.ad : a));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Error al actualizar el estado del anuncio');
      }
    } catch (err: any) {
      alert(err?.message || 'Error de conexión');
    }
  };

  const handleSaveAd = async () => {
    if (!form.title.trim()) {
      alert('El título es obligatorio');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: form.categoryName,
        categoryId: form.categoryId,
        sellerName: form.sellerName,
        price: Number(form.price),
        location: form.location,
        city: form.city,
        phone: form.phone,
        contactEmail: form.contactEmail,
        description: form.description,
        images: [form.imageUrl],
        status: form.status,
        featured: form.featured
      };

      if (editingAd) {
        const res = await fetch('/api/classifieds', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingAd.id, ...payload })
        });

        if (res.ok) {
          const data = await res.json();
          setAds(ads.map(a => a.id === editingAd.id ? data.ad : a));
          setIsModalOpen(false);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'Error al actualizar el anuncio');
        }
      } else {
        const res = await fetch('/api/classifieds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          setAds([data.ad, ...ads]);
          setIsModalOpen(false);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'Error al crear el anuncio');
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (adId: string) => {
    if (!confirm('¿Eliminar permanentemente este anuncio clasificado?')) return;
    try {
      const res = await fetch(`/api/classifieds?id=${encodeURIComponent(adId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setAds(ads.filter(a => a.id !== adId));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Error al eliminar el anuncio');
      }
    } catch (err: any) {
      alert(err?.message || 'Error de conexión');
    }
  };

  const filtered = ads.filter(ad => {
    const matchSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (ad.city && ad.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ad.location && ad.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = selectedStatus === 'ALL' || ad.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Módulo Portal de Clasificados & Anuncios</h2>
            <p className="text-xs text-slate-400">Persistencia real en PostgreSQL (Prisma), moderación y aislamiento multi-tenant</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAds}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Recargar anuncios"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-900/30 transition"
          >
            <Plus className="w-4 h-4" /> Publicar Anuncio
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* Filter toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por título o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PUBLISHED">Publicados</option>
            <option value="PENDING">Pendientes de Moderación</option>
            <option value="DRAFT">Borradores</option>
            <option value="SOLD">Vendidos</option>
            <option value="REJECTED">Rechazados</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Total anuncios: <strong className="text-white">{ads.length}</strong>
        </div>
      </div>

      {/* Ads Grid */}
      {loading && ads.length === 0 ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-xs">Cargando clasificados desde PostgreSQL...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
          No se encontraron anuncios clasificados. Haz clic en &quot;Publicar Anuncio&quot; para añadir uno.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(ad => (
            <div key={ad.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between text-white hover:border-slate-700 transition">
              <div className="flex gap-4">
                <img
                  src={ad.images[0] || 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80'}
                  alt={ad.title}
                  className="w-28 h-28 rounded-xl object-cover bg-slate-800 shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                      {ad.category || 'General'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ad.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      ad.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      ad.status === 'SOLD' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      ad.status === 'DRAFT' ? 'bg-slate-700 text-slate-300' :
                      'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {ad.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white truncate mb-1">{ad.title}</h3>
                  <div className="text-base font-black text-purple-400 mb-2">
                    {ad.price.toLocaleString()} €
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {ad.city || ad.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-400" /> {ad.favoritesCount} favs
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-500" /> {ad.viewsCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Moderation Actions & Edit / Delete */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Vendedor: <strong className="text-slate-200">{ad.sellerName}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  {ad.status !== 'PUBLISHED' && (
                    <button
                      onClick={() => handleStatusChange(ad.id, 'PUBLISHED')}
                      className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Aprobar
                    </button>
                  )}
                  {ad.status !== 'SOLD' && (
                    <button
                      onClick={() => handleStatusChange(ad.id, 'SOLD')}
                      className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 rounded-lg text-[11px] font-bold transition"
                    >
                      Vendido
                    </button>
                  )}
                  {ad.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleStatusChange(ad.id, 'REJECTED')}
                      className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <XCircle className="w-3 h-3" /> Rechazar
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(ad)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ad.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-slate-800 transition"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-400" />
                {editingAd ? 'Editar Anuncio Clasificado' : 'Publicar Anuncio Clasificado'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Título del Anuncio:</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej. iPhone 15 Pro Max 256GB Libre"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Slug personalizado (opcional):</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="dejar en blanco para auto-generar del título"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Categoría:</label>
                  <select
                    value={form.categoryName}
                    onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Motor & Vehículos">Motor & Vehículos</option>
                    <option value="Inmobiliaria">Inmobiliaria</option>
                    <option value="Tecnología & Móviles">Tecnología & Móviles</option>
                    <option value="Hogar & Jardín">Hogar & Jardín</option>
                    <option value="Moda & Complementos">Moda & Complementos</option>
                    <option value="Servicios">Servicios</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Precio (€):</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Ciudad:</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Ubicación / Región:</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Nombre Vendedor:</label>
                  <input
                    type="text"
                    value={form.sellerName}
                    onChange={(e) => setForm({ ...form, sellerName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Teléfono de Contacto:</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email de Contacto:</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">URL de la Imagen Principal:</label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Descripción Completa:</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalles del estado, garantía, accesorios incluidos..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Estado de Publicación:</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="PUBLISHED">Publicado (Live)</option>
                    <option value="PENDING">Pendiente de Moderación</option>
                    <option value="DRAFT">Borrador</option>
                    <option value="SOLD">Vendido</option>
                    <option value="REJECTED">Rechazado</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="featuredAd"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-800 border-slate-700"
                  />
                  <label htmlFor="featuredAd" className="text-slate-300 font-semibold cursor-pointer">
                    Destacar Anuncio
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAd}
                disabled={saving}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Guardar Anuncio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
