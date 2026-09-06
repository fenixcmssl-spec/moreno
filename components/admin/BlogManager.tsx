'use client';

import React, { useState } from 'react';
import { BlogService, BlogPost } from '@/lib/services/blog.service';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Sparkles, 
  Search, 
  Calendar, 
  User, 
  Tag, 
  MessageSquare,
  CheckCircle,
  X,
  Save
} from 'lucide-react';

interface BlogManagerProps {
  tenantId: string;
}

export function BlogManager({ tenantId }: BlogManagerProps) {
  const [posts, setPosts] = useState<BlogPost[]>(BlogService.getPosts(tenantId));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    categoryName: 'Tendencias & Tecnología',
    authorName: 'Redacción Fénix',
    excerpt: '',
    content: '',
    featuredImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    status: 'PUBLISHED' as BlogPost['status'],
    seoTitle: '',
    seoDescription: '',
    tags: 'E-commerce, SaaS, Innovación'
  });

  const handleOpenAdd = () => {
    setEditingPost(null);
    setForm({
      title: '',
      slug: '',
      categoryName: 'Tendencias & Tecnología',
      authorName: 'Redacción Fénix',
      excerpt: '',
      content: '',
      featuredImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      status: 'PUBLISHED',
      seoTitle: '',
      seoDescription: '',
      tags: 'E-commerce, SaaS, Innovación'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (post: BlogPost) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      slug: post.slug,
      categoryName: post.categoryName || 'General',
      authorName: post.authorName,
      excerpt: post.excerpt,
      content: post.content,
      featuredImage: post.featuredImage,
      status: post.status,
      seoTitle: post.seoTitle || '',
      seoDescription: post.seoDescription || '',
      tags: post.tags.join(', ')
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    if (editingPost) {
      const updated = BlogService.updatePost(tenantId, editingPost.id, {
        title: form.title,
        slug,
        categoryName: form.categoryName,
        authorName: form.authorName,
        excerpt: form.excerpt,
        content: form.content,
        featuredImage: form.featuredImage,
        status: form.status,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        tags: tagsArray
      });
      if (updated) {
        setPosts(posts.map(p => p.id === updated.id ? updated : p));
      }
    } else {
      const created = BlogService.createPost(tenantId, {
        title: form.title,
        slug,
        categoryName: form.categoryName,
        authorName: form.authorName,
        excerpt: form.excerpt,
        content: form.content,
        featuredImage: form.featuredImage,
        status: form.status,
        publishedAt: new Date().toISOString(),
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        tags: tagsArray
      });
      setPosts([created, ...posts]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta publicación?')) {
      BlogService.deletePost(tenantId, id);
      setPosts(posts.filter(p => p.id !== id));
    }
  };

  const filtered = posts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Módulo Editorial: Blog & Magazine</h2>
            <p className="text-xs text-slate-400">Gestión de artículos, categorías, autores, SEO y estados editoriales</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition"
        >
          <Plus className="w-4 h-4" /> Crear Nuevo Artículo
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar artículos por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Total artículos: <strong className="text-white">{posts.length}</strong>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Artículo</th>
              <th className="px-6 py-4">Categoría</th>
              <th className="px-6 py-4">Autor</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Vistas</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(post => (
              <tr key={post.id} className="hover:bg-slate-800/40 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={post.featuredImage} alt={post.title} className="w-12 h-12 rounded-lg object-cover bg-slate-800" />
                    <div>
                      <div className="font-bold text-white text-xs">{post.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>/{post.slug}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                    {post.categoryName || 'General'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    {post.authorName}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    post.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    post.status === 'DRAFT' ? 'bg-slate-700 text-slate-300' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {post.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 font-mono">
                  {post.viewsCount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(post)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-slate-800 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl p-6 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                {editingPost ? 'Editar Artículo' : 'Nuevo Artículo Editorial'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Título del Artículo:</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej. Las claves para escalar tu tienda en 2026"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Categoría:</label>
                  <input
                    type="text"
                    value={form.categoryName}
                    onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Autor:</label>
                  <input
                    type="text"
                    value={form.authorName}
                    onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Imagen Destacada (URL):</label>
                <input
                  type="text"
                  value={form.featuredImage}
                  onChange={(e) => setForm({ ...form, featuredImage: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Extracto (Resumen corto):</label>
                <textarea
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Contenido Principal:</label>
                <textarea
                  rows={6}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
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
                    <option value="DRAFT">Borrador</option>
                    <option value="REVIEW">En Revisión</option>
                    <option value="ARCHIVED">Archivado</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Etiquetas (separadas por coma):</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* SEO box */}
              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-3">
                <div className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Optimización SEO
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Meta Title SEO:</label>
                  <input
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                    placeholder="Título optimizado para Google..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Meta Description SEO:</label>
                  <input
                    type="text"
                    value={form.seoDescription}
                    onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                    placeholder="Descripción para resultados de búsqueda..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
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
                onClick={handleSave}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Save className="w-4 h-4" /> Guardar Artículo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
