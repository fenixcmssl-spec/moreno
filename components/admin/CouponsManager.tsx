'use client';

import React, { useState } from 'react';
import { 
  Percent, 
  Plus, 
  Search, 
  Tag, 
  Trash2, 
  CheckCircle2, 
  Copy, 
  Calendar,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  X
} from 'lucide-react';
import { useStore } from '@/lib/storeContext';

interface CouponItem {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minSpend?: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
}

const INITIAL_COUPONS: CouponItem[] = [
  { id: 'cp_1', code: 'BIENVENIDO10', type: 'PERCENTAGE', value: 10, minSpend: 30, maxUses: 500, usedCount: 42, expiresAt: '2026-12-31', isActive: true },
  { id: 'cp_2', code: 'FLASH20', type: 'PERCENTAGE', value: 20, minSpend: 50, maxUses: 100, usedCount: 88, expiresAt: '2026-06-30', isActive: true },
  { id: 'cp_3', code: 'ENVIOGRATIS5', type: 'FIXED', value: 5.95, minSpend: 25, maxUses: 200, usedCount: 65, expiresAt: '2026-09-01', isActive: true },
  { id: 'cp_4', code: 'BLACKFRIDAY30', type: 'PERCENTAGE', value: 30, minSpend: 80, maxUses: 1000, usedCount: 940, expiresAt: '2025-11-30', isActive: false }
];

export function CouponsManager() {
  const [coupons, setCoupons] = useState<CouponItem[]>(INITIAL_COUPONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [formValue, setFormValue] = useState<number>(10);
  const [formMinSpend, setFormMinSpend] = useState<number>(0);
  const [formMaxUses, setFormMaxUses] = useState<number>(100);
  const [formExpiresAt, setFormExpiresAt] = useState('2026-12-31');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenAdd = () => {
    setFormCode('');
    setFormType('PERCENTAGE');
    setFormValue(15);
    setFormMinSpend(30);
    setFormMaxUses(200);
    setFormExpiresAt('2026-12-31');
    setIsModalOpen(true);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode) return;

    const newCoupon: CouponItem = {
      id: `cp_${Date.now()}`,
      code: formCode.trim().toUpperCase(),
      type: formType,
      value: Number(formValue),
      minSpend: formMinSpend ? Number(formMinSpend) : undefined,
      maxUses: formMaxUses ? Number(formMaxUses) : undefined,
      usedCount: 0,
      expiresAt: formExpiresAt,
      isActive: true
    };

    setCoupons(prev => [newCoupon, ...prev]);
    setIsModalOpen(false);
    showToast(`Cupón '${newCoupon.code}' creado con éxito`);
  };

  const handleToggle = (id: string) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const handleDelete = (id: string, code: string) => {
    if (confirm(`¿Eliminar el cupón '${code}'?`)) {
      setCoupons(prev => prev.filter(c => c.id !== id));
      showToast(`Cupón '${code}' eliminado`);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    showToast(`Código '${code}' copiado al portapapeles`);
  };

  const filtered = coupons.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Cupones y Descuentos</h2>
            <p className="text-xs text-slate-400">Códigos promocionales para checkout, campañas de fidelización y ofertas flash</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Cupón</span>
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
            placeholder="Buscar por código promocional..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 uppercase font-mono"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {filtered.length} cupones
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-4">Código Promocional</th>
                <th className="p-4">Descuento</th>
                <th className="p-4">Gasto Mínimo</th>
                <th className="p-4">Usos / Límite</th>
                <th className="p-4">Expiración</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No hay cupones que coincidan con la búsqueda
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-sm bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyCode(c.code)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                          title="Copiar código"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-white">
                      {c.type === 'PERCENTAGE' ? (
                        <span className="text-emerald-400">-{c.value}%</span>
                      ) : (
                        <span className="text-blue-400">-{c.value.toFixed(2)} €</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      {c.minSpend ? `${c.minSpend.toFixed(2)} €` : 'Sin mínimo'}
                    </td>
                    <td className="p-4 font-mono">
                      <span className="text-white font-bold">{c.usedCount}</span>
                      <span className="text-slate-500"> / {c.maxUses || '∞'}</span>
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {c.expiresAt || 'Sin fecha de caducidad'}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggle(c.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full transition cursor-pointer ${
                          c.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {c.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(c.id, c.code)}
                        className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Cupón */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Nuevo Cupón de Descuento</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Código del Cupón *</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={e => setFormCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="Ej. VERANO25"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Tipo de Descuento</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED">Importe Fijo (€)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Valor Descuento *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={formValue}
                    onChange={e => setFormValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Gasto Mínimo (€)</label>
                  <input
                    type="number"
                    min="0"
                    value={formMinSpend}
                    onChange={e => setFormMinSpend(parseFloat(e.target.value) || 0)}
                    placeholder="0 = Sin mínimo"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Usos Máximos</label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxUses}
                    onChange={e => setFormMaxUses(parseInt(e.target.value) || 1)}
                    placeholder="100"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Fecha de Expiración</label>
                <input
                  type="date"
                  value={formExpiresAt}
                  onChange={e => setFormExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
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
                  Crear Cupón
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
