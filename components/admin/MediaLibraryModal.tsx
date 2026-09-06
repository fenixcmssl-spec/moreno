'use client';

import React, { useState, useEffect } from 'react';
import { StorageService, MediaFileItem } from '@/lib/storage/storage.service';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  Search, 
  HardDrive, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface MediaLibraryModalProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (url: string) => void;
}

export function MediaLibraryModal({ tenantId, isOpen, onClose, onSelectImage }: MediaLibraryModalProps) {
  const [files, setFiles] = useState<MediaFileItem[]>(() => StorageService.getTenantMedia(tenantId));
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newFileName, setNewFileName] = useState('');

  if (!isOpen) return null;

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpload = async () => {
    if (!newFileName || !newFileUrl) return;
    setIsUploading(true);

    const res = await StorageService.uploadFile({
      tenantId,
      filename: newFileName,
      mimeType: newFileName.endsWith('.png') ? 'image/png' : newFileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
      size: 154000,
      url: newFileUrl
    });

    setIsUploading(false);
    if (res.success && res.file) {
      setFiles([res.file, ...files]);
      setNewFileName('');
      setNewFileUrl('');
    }
  };

  const handleDelete = (id: string) => {
    StorageService.deleteFile(tenantId, id);
    setFiles(files.filter(f => f.id !== id));
  };

  const filtered = files.filter(f => f.filename.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalBytes = files.reduce((a, b) => a + b.size, 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Biblioteca de Medios (Media Library)</h2>
              <p className="text-xs text-slate-400">Gestión de archivos binarios, logotipos, favicons e imágenes optimizadas</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>Espacio usado: <strong className="text-white">{totalMb} MB</strong> / 5.000 MB</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upload & Search Toolbar */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar archivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Quick upload input */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Nombre (ej. logo.png)"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 w-36"
            />
            <input
              type="text"
              placeholder="URL de la imagen"
              value={newFileUrl}
              onChange={(e) => setNewFileUrl(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 w-52"
            />
            <button
              onClick={handleUpload}
              disabled={isUploading || !newFileName || !newFileUrl}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" /> Subir
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="p-6 flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(f => (
            <div key={f.id} className="group relative bg-slate-800/60 border border-slate-700/70 rounded-xl overflow-hidden flex flex-col hover:border-blue-500 transition">
              <div className="aspect-square bg-slate-950 relative overflow-hidden flex items-center justify-center">
                <img src={f.url} alt={f.alt || f.filename} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleCopyUrl(f.url, f.id)}
                    className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-xs flex items-center gap-1 shadow"
                    title="Copiar URL"
                  >
                    {copiedId === f.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {onSelectImage && (
                    <button
                      onClick={() => { onSelectImage(f.url); onClose(); }}
                      className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs shadow"
                      title="Seleccionar para branding"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-2 rounded-lg bg-red-600/80 text-white hover:bg-red-600 text-xs shadow"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-2.5">
                <div className="text-[11px] font-semibold text-slate-200 truncate">{f.filename}</div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>{(f.size / 1024).toFixed(0)} KB</span>
                  <span className="uppercase">{f.mimeType.split('/')[1]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" /> Almacenamiento seguro compatible S3/MinIO con sanitización MIME
          </div>
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
