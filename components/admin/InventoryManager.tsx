'use client';

import React, { useState } from 'react';
import { 
  Boxes, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  ArrowUpDown,
  RefreshCw,
  Plus,
  Minus
} from 'lucide-react';
import { useStore } from '@/lib/storeContext';

export function InventoryManager() {
  const { products, updateProduct } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStockChange = (productId: string, val: number) => {
    setStockDrafts(prev => ({ ...prev, [productId]: Math.max(0, val) }));
  };

  const handleSaveStock = async (productId: string) => {
    const newStock = stockDrafts[productId];
    if (newStock === undefined) return;

    await updateProduct(productId, { stock: newStock });
    setStockDrafts(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    showToast('Stock actualizado correctamente');
  };

  const handleQuickAdjust = async (productId: string, currentStock: number, delta: number) => {
    const updated = Math.max(0, currentStock + delta);
    await updateProduct(productId, { stock: updated });
    showToast(`Stock ajustado a ${updated} unidades`);
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const currentVal = stockDrafts[p.id] !== undefined ? stockDrafts[p.id] : (p.stock || 0);

    if (stockFilter === 'low') return matchesSearch && currentVal > 0 && currentVal <= 5;
    if (stockFilter === 'out') return matchesSearch && currentVal === 0;
    return matchesSearch;
  });

  const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
  const outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;
  const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Control de Inventario y Stock</h2>
            <p className="text-xs text-slate-400">Supervisión en tiempo real de existencias, reposición rápida y alertas de rotura</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            Total en almacén: <strong className="text-amber-400 font-bold">{totalUnits}</strong> uds
          </span>
        </div>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setStockFilter('all')}
          className={`p-4 rounded-2xl border text-left transition ${
            stockFilter === 'all' 
              ? 'bg-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/10' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium">Total de Referencias (SKUs)</div>
          <div className="text-2xl font-bold text-white mt-1">{products.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Catálogo completo</div>
        </button>

        <button
          onClick={() => setStockFilter('low')}
          className={`p-4 rounded-2xl border text-left transition ${
            stockFilter === 'low' 
              ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/10' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Stock Bajo (≤ 5 uds)
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{lowStockCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Requieren reposición próxima</div>
        </button>

        <button
          onClick={() => setStockFilter('out')}
          className={`p-4 rounded-2xl border text-left transition ${
            stockFilter === 'out' 
              ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-500/10' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-rose-400 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Agotados (0 uds)
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{outOfStockCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Venta detenida por falta de stock</div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por producto, SKU o categoría..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-4">Producto & SKU</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Nivel de Stock</th>
                <th className="p-4">Ajuste Rápido</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron productos con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const currentStock = p.stock || 0;
                  const draftVal = stockDrafts[p.id];
                  const hasDraft = draftVal !== undefined && draftVal !== currentStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{p.title}</div>
                        <div className="text-[10px] font-mono text-slate-500">{p.sku || 'SIN-SKU'}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px]">
                          {p.category || 'General'}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-amber-400">
                        {p.price.toFixed(2)} €
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={draftVal !== undefined ? draftVal : currentStock}
                            onChange={e => handleStockChange(p.id, parseInt(e.target.value) || 0)}
                            className={`w-20 px-2 py-1.5 bg-slate-950 border rounded-lg font-mono font-bold text-center text-xs focus:outline-none ${
                              currentStock === 0 
                                ? 'border-rose-500/50 text-rose-400' 
                                : currentStock <= 5 
                                  ? 'border-amber-500/50 text-amber-400' 
                                  : 'border-slate-700 text-white'
                            }`}
                          />
                          {currentStock === 0 && (
                            <span className="text-[10px] text-rose-400 font-bold px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded">
                              Agotado
                            </span>
                          )}
                          {currentStock > 0 && currentStock <= 5 && (
                            <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
                              Bajo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQuickAdjust(p.id, currentStock, -5)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono"
                            title="Restar 5"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(p.id, currentStock, -1)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono"
                            title="Restar 1"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(p.id, currentStock, +1)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono"
                            title="Sumar 1"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(p.id, currentStock, +10)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono"
                            title="Sumar 10"
                          >
                            +10
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {hasDraft && (
                          <button
                            onClick={() => handleSaveStock(p.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-lg shadow-emerald-600/20 transition flex items-center gap-1 ml-auto"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Guardar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
