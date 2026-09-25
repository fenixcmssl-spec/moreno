'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  Search, 
  HardDrive, 
  ShieldCheck,
  Sparkles,
  Loader2,
  Link as LinkIcon,
  PlusCircle,
  FolderOpen,
  Eye,
  Download,
  Code,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Edit3
} from 'lucide-react';

export interface MediaFileItem {
  id: string;
  tenantId: string;
  filename: string;
  storageKey: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  createdAt: string;
}

interface MediaLibraryModalProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (url: string) => void;
}

const DEFAULT_SEED_FILES: MediaFileItem[] = [
  {
    id: 'med_logo_official',
    tenantId: 'tenant_demo',
    filename: 'logo-fenix-store.png',
    storageKey: 'tenants/tenant_demo/uploads/logo-fenix.png',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
    mimeType: 'image/png',
    size: 64200,
    width: 600,
    height: 600,
    alt: 'Logotipo Oficial Fenix Store',
    createdAt: '2026-09-01T09:00:00Z',
  },
  {
    id: 'med_smartwatch',
    tenantId: 'tenant_demo',
    filename: 'smartwatch-ultra-gps-titanium.webp',
    storageKey: 'tenants/tenant_demo/uploads/smartwatch.webp',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    mimeType: 'image/webp',
    size: 142000,
    width: 800,
    height: 800,
    alt: 'Smartwatch Ultra AMOLED Titanium GPS',
    createdAt: '2026-09-02T10:00:00Z',
  },
  {
    id: 'med_espresso',
    tenantId: 'tenant_demo',
    filename: 'cafetera-espresso-20bares.jpg',
    storageKey: 'tenants/tenant_demo/uploads/cafetera.jpg',
    url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&q=80',
    mimeType: 'image/jpeg',
    size: 198000,
    width: 800,
    height: 800,
    alt: 'Cafetera espresso italiana de acero inoxidable',
    createdAt: '2026-09-02T11:15:00Z',
  },
  {
    id: 'med_headphones',
    tenantId: 'tenant_demo',
    filename: 'auriculares-pro-noise-cancelling.webp',
    storageKey: 'tenants/tenant_demo/uploads/headphones.webp',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    mimeType: 'image/webp',
    size: 165000,
    width: 800,
    height: 800,
    alt: 'Auriculares inalámbricos premium con cancelación activa',
    createdAt: '2026-09-03T14:20:00Z',
  },
  {
    id: 'med_keyboard',
    tenantId: 'tenant_demo',
    filename: 'teclado-mecanico-rgb-hotswap.jpg',
    storageKey: 'tenants/tenant_demo/uploads/keyboard.jpg',
    url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    mimeType: 'image/jpeg',
    size: 180000,
    width: 800,
    height: 600,
    alt: 'Teclado mecánico ergonómico RGB switches táctiles',
    createdAt: '2026-09-03T16:45:00Z',
  },
  {
    id: 'med_macbook',
    tenantId: 'tenant_demo',
    filename: 'macbook-pro-m3-spacegray.jpg',
    storageKey: 'tenants/tenant_demo/uploads/macbook.jpg',
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
    mimeType: 'image/jpeg',
    size: 210000,
    width: 800,
    height: 600,
    alt: 'Portátil de aluminio con pantalla Retina',
    createdAt: '2026-09-04T09:30:00Z',
  },
  {
    id: 'med_banner_deals',
    tenantId: 'tenant_demo',
    filename: 'banner-ofertas-flash-ecommerce.webp',
    storageKey: 'tenants/tenant_demo/uploads/banner.webp',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
    mimeType: 'image/webp',
    size: 245000,
    width: 1200,
    height: 500,
    alt: 'Banner promocional de temporada para escaparate',
    createdAt: '2026-09-04T12:00:00Z',
  }
];

export function MediaLibraryModal({ tenantId, isOpen, onClose, onSelectImage }: MediaLibraryModalProps) {
  const [files, setFiles] = useState<MediaFileItem[]>(DEFAULT_SEED_FILES);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeType, setCopiedCodeType] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Detail preview / inspection modal state
  const [selectedFile, setSelectedFile] = useState<MediaFileItem | null>(null);
  const [editingAlt, setEditingAlt] = useState('');
  const [isSavingAlt, setIsSavingAlt] = useState(false);

  // Upload mode: 'file' (local upload) | 'url' (web import)
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newFileName, setNewFileName] = useState('');
  
  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Alt status
  const [generatingAltId, setGeneratingAltId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/media?tenantId=${tenantId || 'tenant_demo'}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.files) && data.files.length > 0) {
          setFiles(data.files);
        } else if (isMounted && (!data.files || data.files.length === 0)) {
          setFiles(DEFAULT_SEED_FILES);
        }
      })
      .catch((err) => {
        console.warn('Failed to load media files from API, using default seed assets:', err);
        if (isMounted) setFiles(DEFAULT_SEED_FILES);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tenantId]);

  // Sync editing alt when selectedFile changes
  useEffect(() => {
    if (selectedFile) {
      setEditingAlt(selectedFile.alt || '');
    }
  }, [selectedFile]);

  // Close with ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedFile) {
          setSelectedFile(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedFile, onClose]);

  if (!isOpen) return null;

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySnippet = (snippet: string, type: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedCodeType(type);
    setTimeout(() => setCopiedCodeType(null), 2000);
  };

  /**
   * Processes a local File object and converts it to a base64 Data URL
   */
  const processLocalFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido (PNG, JPG, WebP, SVG, GIF).');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setIsUploading(false);
        return;
      }

      const cleanFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const newMedia: MediaFileItem = {
        id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId: tenantId || 'tenant_demo',
        filename: cleanFilename,
        storageKey: `tenants/${tenantId || 'tenant_demo'}/uploads/${Date.now()}_${cleanFilename}`,
        url: dataUrl,
        mimeType: file.type || 'image/png',
        size: file.size || 120000,
        width: 800,
        height: 800,
        alt: cleanFilename.split('.')[0].replace(/[-_]/g, ' '),
        createdAt: new Date().toISOString()
      };

      // Optimistic UI update immediately
      setFiles(prev => [newMedia, ...prev]);

      try {
        await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenantId || 'tenant_demo',
            filename: cleanFilename,
            mimeType: file.type || 'image/png',
            size: file.size,
            url: dataUrl,
            base64Data: dataUrl,
            alt: newMedia.alt
          })
        });
      } catch (err) {
        console.warn('Backend media sync notice (local preview active):', err);
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      alert('Hubo un error al leer el archivo desde el dispositivo.');
    };

    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processLocalFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processLocalFile(droppedFile);
    }
  };

  const handleUrlUpload = async () => {
    if (!newFileUrl.trim()) return;
    setIsUploading(true);

    const filename = newFileName.trim() || `imagen_${Date.now()}.jpg`;
    const newMedia: MediaFileItem = {
      id: `med_${Date.now()}`,
      tenantId: tenantId || 'tenant_demo',
      filename,
      storageKey: `url_${Date.now()}`,
      url: newFileUrl.trim(),
      mimeType: filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
      size: 154000,
      width: 800,
      height: 800,
      alt: filename.split('.')[0].replace(/[-_]/g, ' '),
      createdAt: new Date().toISOString()
    };

    setFiles(prev => [newMedia, ...prev]);
    setNewFileUrl('');
    setNewFileName('');

    try {
      await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId || 'tenant_demo',
          filename: newMedia.filename,
          mimeType: newMedia.mimeType,
          size: 154000,
          url: newMedia.url,
          alt: newMedia.alt
        })
      });
    } catch (err) {
      console.warn('Backend URL upload sync notice:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateAlt = async (file: MediaFileItem) => {
    setGeneratingAltId(file.id);
    setAiError(null);
    setAiSuccessMsg(null);

    try {
      const res = await fetch('/api/media/ai-alt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId || 'tenant_demo',
          url: file.url,
          filename: file.filename,
          fileId: file.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.alt) {
        setFiles(prev =>
          prev.map(f => (f.id === file.id ? { ...f, alt: data.alt } : f))
        );
        if (selectedFile && selectedFile.id === file.id) {
          setSelectedFile(prev => prev ? { ...prev, alt: data.alt } : null);
          setEditingAlt(data.alt);
        }
        setAiSuccessMsg(`Etiqueta Alt generada con éxito con Gemini: "${data.alt}"`);
        setTimeout(() => setAiSuccessMsg(null), 4000);
      } else {
        setAiError(data.error || 'No se pudo generar la etiqueta Alt.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Error conectando con el servicio de IA Gemini.');
    } finally {
      setGeneratingAltId(null);
    }
  };

  const handleSaveAltManual = async () => {
    if (!selectedFile) return;
    setIsSavingAlt(true);
    const updatedAlt = editingAlt.trim();

    setFiles(prev =>
      prev.map(f => (f.id === selectedFile.id ? { ...f, alt: updatedAlt } : f))
    );
    setSelectedFile(prev => prev ? { ...prev, alt: updatedAlt } : null);

    try {
      await fetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId || 'tenant_demo',
          fileId: selectedFile.id,
          alt: updatedAlt
        })
      });
      setAiSuccessMsg('Etiqueta Alt actualizada correctamente');
      setTimeout(() => setAiSuccessMsg(null), 3000);
    } catch (e) {
      console.warn('Error saving alt:', e);
    } finally {
      setIsSavingAlt(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo multimedia?')) {
      return;
    }
    try {
      await fetch(`/api/media?tenantId=${tenantId || 'tenant_demo'}&fileId=${id}`, {
        method: 'DELETE'
      });
    } catch {}
    setFiles(files.filter(f => f.id !== id));
    if (selectedFile?.id === id) {
      setSelectedFile(null);
    }
  };

  const filtered = files.filter(f => 
    f.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.alt && f.alt.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalBytes = files.reduce((a, b) => a + b.size, 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);

  // Navigate between items in detail preview
  const currentDetailIndex = selectedFile ? filtered.findIndex(f => f.id === selectedFile.id) : -1;
  const hasPrev = currentDetailIndex > 0;
  const hasNext = currentDetailIndex >= 0 && currentDetailIndex < filtered.length - 1;

  const handlePrevItem = () => {
    if (hasPrev) {
      setSelectedFile(filtered[currentDetailIndex - 1]);
    }
  };

  const handleNextItem = () => {
    if (hasNext) {
      setSelectedFile(filtered[currentDetailIndex + 1]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-sans select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-inner">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Biblioteca de Medios (Media Library)</span>
                <span className="text-[11px] bg-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/30 font-mono font-semibold">
                  {files.length} archivos
                </span>
                {onSelectImage && (
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                    Modo Selección Activo
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {onSelectImage 
                  ? 'Haz clic sobre cualquier foto para seleccionarla para tu tienda o marca'
                  : 'Haz clic sobre cualquier foto para inspeccionarla en grande, copiar enlaces y generar Alt con Gemini Vision'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>Almacenamiento: <strong className="text-white">{totalMb} MB</strong> / 5.000 MB</span>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upload & Search Toolbar */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/60 space-y-4">
          
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nombre de archivo o alt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner"
              />
            </div>

            {/* Upload Method Switcher */}
            <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setUploadMode('file')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  uploadMode === 'file' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" /> Subir Archivo Local
              </button>
              <button
                onClick={() => setUploadMode('url')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  uploadMode === 'url' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" /> Importar por URL
              </button>
            </div>
          </div>

          {/* Mode 1: Local File Drag & Drop Dropzone */}
          {uploadMode === 'file' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                isDragging 
                  ? 'border-blue-400 bg-blue-500/10 scale-[0.99]' 
                  : 'border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800/70 shadow-sm'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="hidden"
              />
              
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>

              <div>
                <div className="text-xs font-bold text-slate-200">
                  {isUploading ? 'Procesando y optimizando imagen...' : 'Haz clic para seleccionar o arrastra una imagen aquí'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Formatos compatibles: PNG, JPG, WebP, SVG, GIF (Hasta 15 MB con renderizado instantáneo)
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: URL Import */}
          {uploadMode === 'url' && (
            <div className="flex flex-col sm:flex-row gap-2.5 items-center bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700">
              <input
                type="text"
                placeholder="Nombre del archivo (ej. banner-tienda.png)"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 w-full sm:w-56 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="https://ejemplo.com/mi-imagen.jpg"
                value={newFileUrl}
                onChange={(e) => setNewFileUrl(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 w-full focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleUrlUpload}
                disabled={isUploading || !newFileUrl.trim()}
                className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow"
              >
                <PlusCircle className="w-4 h-4" /> Importar
              </button>
            </div>
          )}

        </div>

        {/* Notifications Banners */}
        {aiError && (
          <div className="mx-6 mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between">
            <span>{aiError}</span>
            <button onClick={() => setAiError(null)} className="text-rose-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {aiSuccessMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              {aiSuccessMsg}
            </span>
            <button onClick={() => setAiSuccessMsg(null)} className="text-emerald-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="p-6 flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 min-h-[300px]">
          {filtered.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
              <ImageIcon className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300">No se encontraron archivos</p>
              <p className="text-xs text-slate-500 mt-1">Prueba con otro término de búsqueda o sube una imagen.</p>
            </div>
          ) : (
            filtered.map(f => (
              <div 
                key={f.id} 
                onClick={() => {
                  if (onSelectImage) {
                    onSelectImage(f.url);
                    onClose();
                  } else {
                    setSelectedFile(f);
                  }
                }}
                className="group relative bg-slate-800/70 border border-slate-700/80 rounded-2xl overflow-hidden flex flex-col hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                {/* Image Container with checkered transparency pattern */}
                <div className="aspect-square bg-slate-950 relative overflow-hidden flex items-center justify-center bg-[linear-gradient(45deg,#0f172a_25%,transparent_25%),linear-gradient(-45deg,#0f172a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#0f172a_75%),linear-gradient(-45deg,transparent_75%,#0f172a_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]">
                  <Image
                    src={f.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'}
                    alt={f.alt || f.filename}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="object-cover group-hover:scale-108 transition duration-300"
                  />

                  {/* Format Badge top-right */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-950/70 text-slate-300 backdrop-blur-sm border border-slate-700/50">
                      {f.mimeType.split('/')[1] || 'IMG'}
                    </span>
                  </div>
                  
                  {/* Overlay Action Buttons */}
                  <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 z-10 p-3">
                    
                    <div className="text-[11px] font-bold text-white bg-blue-600/90 px-3 py-1 rounded-full shadow flex items-center gap-1.5 mb-1">
                      {onSelectImage ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Seleccionar</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Detalles</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedFile(f)}
                        className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 text-xs shadow border border-slate-700 cursor-pointer"
                        title="Abrir Vista Previa Detallada"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      
                      <button
                        onClick={() => handleGenerateAlt(f)}
                        disabled={generatingAltId === f.id}
                        className="p-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs flex items-center gap-1 shadow font-bold cursor-pointer disabled:opacity-50"
                        title="Generar Alt accesible con Gemini Vision"
                      >
                        {generatingAltId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleCopyUrl(f.url, f.id)}
                        className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-xs flex items-center gap-1 shadow cursor-pointer"
                        title="Copiar URL directa"
                      >
                        {copiedId === f.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleDelete(f.id)}
                        className="p-2 rounded-xl bg-red-600/80 text-white hover:bg-red-600 text-xs shadow cursor-pointer"
                        title="Eliminar archivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Meta */}
                <div className="p-3 space-y-1 bg-slate-900/50 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200 truncate" title={f.filename}>
                      {f.filename}
                    </div>
                    {f.alt ? (
                      <div className="text-[11px] text-amber-400 font-medium truncate flex items-center gap-1 mt-0.5" title={f.alt}>
                        <Sparkles className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">&ldquo;{f.alt}&rdquo;</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <span>Sin etiqueta Alt</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80 mt-2">
                    <span>{(f.size / 1024).toFixed(0)} KB</span>
                    <span>{f.width && f.height ? `${f.width}×${f.height}px` : 'Original'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" /> 
            <span>Almacenamiento CDN multi-tenant activo con optimización WebP y visión multimodal Gemini</span>
          </div>
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow"
          >
            Cerrar Galería
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DETAILED INSPECTION / LIGHTBOX MODAL (When a photo is clicked) */}
      {/* ========================================================================= */}
      {selectedFile && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col lg:flex-row shadow-2xl overflow-hidden text-white relative">
            
            {/* Top right close button */}
            <button 
              onClick={() => setSelectedFile(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              title="Cerrar vista detallada (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left/Main Column: Big Image Viewer */}
            <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-6 min-h-[320px] lg:min-h-[500px] border-b lg:border-b-0 lg:border-r border-slate-800">
              
              {/* Previous / Next buttons */}
              {hasPrev && (
                <button
                  onClick={handlePrevItem}
                  className="absolute left-4 z-10 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-blue-600 transition shadow-lg cursor-pointer border border-slate-700"
                  title="Foto anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {hasNext && (
                <button
                  onClick={handleNextItem}
                  className="absolute right-4 z-10 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-blue-600 transition shadow-lg cursor-pointer border border-slate-700"
                  title="Foto siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Main Image View */}
              <div className="relative w-full h-full max-w-lg max-h-[460px] aspect-square flex items-center justify-center">
                <Image
                  src={selectedFile.url}
                  alt={selectedFile.alt || selectedFile.filename}
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
              </div>

              {/* View in new tab link */}
              <a
                href={selectedFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Ver tamaño completo
              </a>
            </div>

            {/* Right Column: File Details & AI Tools */}
            <div className="w-full lg:w-96 p-6 flex flex-col justify-between overflow-y-auto max-h-[500px] lg:max-h-none space-y-5 bg-slate-900">
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Detalles del Archivo
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5 break-all">
                    {selectedFile.filename}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="uppercase">{selectedFile.mimeType}</span>
                    <span>•</span>
                    <span>{selectedFile.width && selectedFile.height ? `${selectedFile.width}×${selectedFile.height} px` : '800×800 px'}</span>
                  </div>
                </div>

                {/* Gemini AI Alt Text Section */}
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Etiqueta Alt (Accesibilidad & SEO)</span>
                    </label>
                    <button
                      onClick={() => handleGenerateAlt(selectedFile)}
                      disabled={generatingAltId === selectedFile.id}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {generatingAltId === selectedFile.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Analizando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Auto con Gemini</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingAlt}
                      onChange={(e) => setEditingAlt(e.target.value)}
                      placeholder="Descripción de la imagen para SEO..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={handleSaveAltManual}
                      disabled={isSavingAlt || editingAlt === (selectedFile.alt || '')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition disabled:opacity-30 cursor-pointer"
                      title="Guardar cambios de Alt"
                    >
                      {isSavingAlt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Google Gemini Vision analiza el contenido visual para generar textos descriptivos que impulsan el ranking SEO.
                  </p>
                </div>

                {/* Quick Copy Snippets */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300">Copiar Snippet / Enlace</div>
                  
                  {/* Direct URL */}
                  <div className="flex items-center gap-1.5 bg-slate-800/60 p-2 rounded-xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 truncate flex-1 font-mono">{selectedFile.url}</span>
                    <button
                      onClick={() => handleCopyUrl(selectedFile.url, selectedFile.id)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition shrink-0"
                    >
                      {copiedId === selectedFile.id ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === selectedFile.id ? 'Copiado' : 'URL'}</span>
                    </button>
                  </div>

                  {/* HTML & Markdown buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleCopySnippet(`<img src="${selectedFile.url}" alt="${selectedFile.alt || selectedFile.filename}" />`, 'html')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5 text-purple-400" />
                      <span>{copiedCodeType === 'html' ? '¡HTML Copiado!' : 'Copiar HTML'}</span>
                    </button>
                    <button
                      onClick={() => handleCopySnippet(`![${selectedFile.alt || selectedFile.filename}](${selectedFile.url})`, 'md')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5 text-blue-400" />
                      <span>{copiedCodeType === 'md' ? '¡MD Copiado!' : 'Copiar Markdown'}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Bottom Actions */}
              <div className="space-y-2 pt-4 border-t border-slate-800">
                {onSelectImage && (
                  <button
                    onClick={() => {
                      onSelectImage(selectedFile.url);
                      setSelectedFile(null);
                      onClose();
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Usar esta imagen en la tienda</span>
                  </button>
                )}

                <div className="flex gap-2">
                  <a
                    href={selectedFile.url}
                    download={selectedFile.filename}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Descargar</span>
                  </a>
                  <button
                    onClick={() => handleDelete(selectedFile.id)}
                    className="px-3.5 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
