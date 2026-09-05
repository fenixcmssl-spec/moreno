'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { User, Package, Truck, ArrowLeft, ShoppingBag, CheckCircle, Clock } from 'lucide-react';

export function ShopperLoginPortal() {
  const { tenant, orders, setCurrentRoute } = useStore();
  const [email, setEmail] = useState('laura.gomez@gmail.com');

  return (
    <div className="min-h-screen bg-[#eaeded] text-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Mi Cuenta — {tenant.name}</h1>
              <p className="text-xs text-slate-500">Acceso Comprador ({tenant.customDomain || 'tutienda.com'}/login)</p>
            </div>
          </div>

          <button
            onClick={() => setCurrentRoute('store_front')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </button>
        </div>

        {/* Orders Tracking Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <span>Mis Pedidos Recientes ({orders.length})</span>
            </h2>
            <span className="text-xs text-slate-400">Seguimiento en tiempo real con Correos</span>
          </div>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No hay pedidos registrados todavía</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  La tienda está limpia y lista para recibir pedidos en producción.
                </p>
                <button
                  onClick={() => setCurrentRoute('store_front')}
                  className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg shadow-sm transition"
                >
                  Explorar Catálogo de Productos
                </button>
              </div>
            ) : (
              orders.map((ord) => (
                <div key={ord.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">{ord.orderNumber}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{new Date(ord.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                        {ord.paymentStatus}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                        {ord.fulfillmentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <img src={it.image} alt={it.title} className="w-10 h-10 object-cover rounded bg-white border border-slate-200" />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{it.title}</div>
                          <div className="text-slate-500 text-[11px]">Cant: {it.quantity} • SKU: {it.sku}</div>
                        </div>
                        <div className="font-bold text-slate-900">{it.price.toFixed(2)}€</div>
                      </div>
                    ))}
                  </div>

                  {ord.trackingNumber && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-medium">
                        <Truck className="w-4 h-4 text-amber-600" />
                        <span>{ord.carrier}: <b className="font-mono">{ord.trackingNumber}</b></span>
                      </div>
                      <span className="text-emerald-700 font-bold text-[11px]">En reparto</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
