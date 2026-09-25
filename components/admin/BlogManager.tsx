'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BlogPostRecord } from '@/lib/services/blog.service';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Sparkles, 
  Search, 
  User, 
  X,
  Save,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface BlogManagerProps {
  tenantId: string;
}

export function BlogManager({ tenantId }: BlogManagerProps) {
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPostRecord | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    categoryName: 'Tendencias & Tecnología',
    authorName: 'Redacción Fénix',
    excerpt: '',
    content: '',
    featuredImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    status: 'PUBLISHED' as any,
    seoTitle: '',
    seoDescription: '',
    tags: 'E-commerce, SaaS, Innovación'
  });

  const handleAiGenerate = async () => {
    if (!form.title.trim()) {
      alert('Por favor, escribe un título o tema base para que Gemini pueda redactar el artículo.');
      return;
    }

    setGeneratingAi(true);
    setAiError(null);

    try {
      const res = await fetch('/api/blog/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          title: form.title,
          category: form.categoryName,
          keywords: form.tags,
          tone: 'persuasivo, experto y educativo',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.article) {
        const { article } = data;
        setForm(prev => ({
          ...prev,
          title: article.title || prev.title,
          excerpt: article.excerpt || prev.excerpt,
          content: article.content || prev.content,
          seoTitle: article.seoTitle || prev.seoTitle,
          seoDescription: article.seoDesc || prev.seoDescription,
          tags: Array.isArray(article.tags) ? article.tags.join(', ') : prev.tags,
        }));
      } else {
        setAiError(data.error || 'Error al generar artículo con IA');
      }
    } catch (err: any) {
      setAiError(err.message || 'Error de conexión con el servicio de IA');
    } finally {
      setGeneratingAi(false);
    }
  };

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/blog`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.posts)) {
          setPosts(data.posts);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Error cargando artículos de blog');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

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

  const handleOpenEdit = (post: BlogPostRecord) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      slug: post.slug,
      categoryName: post.category || 'General',
      authorName: post.author?.name || 'Redacción',
      excerpt: post.excerpt || '',
      content: post.content || '',
      featuredImage: post.featuredImage || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      status: post.status,
      seoTitle: post.seoTitle || '',
      seoDescription: post.seoDescription || '',
      tags: (post.tags || []).join(', ')
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('El título es obligatorio');
      return;
    }

    try {
      setSaving(true);
      const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);

      if (editingPost) {
        const res = await fetch('/api/blog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPost.id,
            title: form.title,
            slug,
            category: form.categoryName,
            authorName: form.authorName,
            excerpt: form.excerpt,
            content: form.content,
            featuredImage: form.featuredImage,
            status: form.status,
            seoTitle: form.seoTitle,
            seoDescription: form.seoDescription,
            tags: tagsArray
          })
        });

        if (res.ok) {
          const data = await res.json();
          setPosts(posts.map(p => p.id === data.post.id ? data.post : p));
          setIsModalOpen(false);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'Error al actualizar el artículo');
        }
      } else {
        const res = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            slug,
            category: form.categoryName,
            authorName: form.authorName,
            excerpt: form.excerpt,
            content: form.content,
            featuredImage: form.featuredImage,
            status: form.status,
            seoTitle: form.seoTitle,
            seoDescription: form.seoDescription,
            tags: tagsArray
          })
        });

        if (res.ok) {
          const data = await res.json();
          setPosts([data.post, ...posts]);
          setIsModalOpen(false);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'Error al crear el artículo');
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Error al guardar el artículo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta publicación de forma permanente?')) return;
    try {
      const res = await fetch(`/api/blog?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== id));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Error al eliminar el artículo');
      }
    } catch (err: any) {
      alert(err?.message || 'Error de conexión');
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
            <p className="text-xs text-slate-400">Persistencia real en PostgreSQL (Prisma), SEO y roles editoriales</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPosts}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Recargar artículos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition"
          >
            <Plus className="w-4 h-4" /> Crear Nuevo Artículo
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
          {error}
        </div>
      )}

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
        {loading && posts.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs">Cargando publicaciones desde PostgreSQL...</span>
          </div>
        ) : (
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-xs">
                    No hay publicaciones registradas. Haz clic en &quot;Crear Nuevo Artículo&quot; para empezar.
                  </td>
                </tr>
              ) : (
                filtered.map(post => (
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
                        {post.category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        {post.author?.name || 'Redacción'}
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
                ))
              )}
            </tbody>
          </table>
        )}
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={generatingAi || !form.title.trim()}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50 cursor-pointer"
                  title="Redactar artículo completo con Gemini AI"
                >
                  {generatingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Redactando con Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Redactar con IA (Gemini)</span>
                    </>
                  )}
                </button>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {aiError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between mb-4">
                <span>{aiError}</span>
                <button onClick={() => setAiError(null)} className="text-rose-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 block">Título o Tema del Artículo:</label>
                  <span className="text-[10px] text-amber-400 font-semibold">✨ Escribe un tema y pulsa &quot;Redactar con IA&quot;</span>
                </div>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej. Las 10 tendencias de moda sostenible que arrasan este 2026"
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
                <label className="text-slate-400 block mb-1">Slug personalizado (opcional):</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="dejar en blanco para auto-generar del título"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
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
                disabled={saving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Guardar Artículo
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
