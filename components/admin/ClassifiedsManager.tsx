'use client';

import React, { useState } from 'react';
import { ClassifiedService, ClassifiedAdItem } from '@/lib/services/classified.service';
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
  X
} from 'lucide-react';

interface ClassifiedsManagerProps {
  tenantId: string;
}

export function ClassifiedsManager({ tenantId }: ClassifiedsManagerProps) {
  const [ads, setAds] = useState<ClassifiedAdItem[]>(ClassifiedService.getAds(tenantId));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    categoryName: 'Motor & Vehículos',
    categoryId: 'clcat_motor',
    sellerName: 'Carlos Mendoza',
    price: 15000,
    location: 'Valencia',
    city: 'Valencia',
    phone: '+34 600 112 233',
    contactEmail: 'contacto@vendedor.es',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80',
    status: 'PUBLISHED' as ClassifiedAdItem['status'],
    featured: true
  });

  const handleStatusChange = (adId: string, newStatus: ClassifiedAdItem['status']) => {
    ClassifiedService.updateAdStatus(tenantId, adId, newStatus);
    setAds(ads.map(a => a.id === adId ? { ...a, status: newStatus } : a));
  };

  const handleCreateAd = () => {
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const created = ClassifiedService.createAd(tenantId, {
      title: form.title,
      slug,
      categoryId: form.categoryId,
      categoryName: form.categoryName,
      sellerId: 'usr_seller_admin',
      sellerName: form.sellerName,
      sellerRating: 5.0,
      description: form.description,
      price: Number(form.price),
      location: `${form.city} (${form.location})`,
      city: form.city,
      images: [form.imageUrl],
      status: form.status,
      featured: form.featured,
      phone: form.phone,
      contactEmail: form.contactEmail
    });

    setAds([created, ...ads]);
    setIsModalOpen(false);
  };

  const filtered = ads.filter(ad => {
    const matchSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) || ad.city.toLowerCase().includes(searchTerm.toLowerCase());
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
            <p className="text-xs text-slate-400">Gestión de anuncios, vendedores, moderación de publicaciones y favoritos</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-900/30 transition"
        >
          <Plus className="w-4 h-4" /> Publicar Anuncio
        </button>
      </div>

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
            <option value="SOLD">Vendidos</option>
            <option value="REJECTED">Rechazados</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Total anuncios: <strong className="text-white">{ads.length}</strong>
        </div>
      </div>

      {/* Ads Grid */}
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
                    {ad.categoryName}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    ad.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    ad.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    ad.status === 'SOLD' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
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
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" /> {ad.location}
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

            {/* Bottom Moderation Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Vendedor: <strong className="text-slate-200">{ad.sellerName}</strong> ({ad.sellerRating})</span>
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
                    Marcar Vendido
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
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-400" /> Publicar Anuncio Clasificado
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
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAd}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Save className="w-4 h-4" /> Publicar Anuncio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
