'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  CheckCircle2, 
  ShieldCheck,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useStore } from '@/lib/storeContext';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city: string;
  country: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const INITIAL_CUSTOMERS: CustomerProfile[] = [
  { id: 'c_1', name: 'Laura Gómez', email: 'laura.gomez@gmail.com', phone: '+34 611 223 344', city: 'Madrid', country: 'España', totalOrders: 5, totalSpent: 349.50, createdAt: '2026-01-15', status: 'ACTIVE' },
  { id: 'c_2', name: 'Carlos Fernández', email: 'carlos.f@empresa.es', phone: '+34 622 334 455', city: 'Barcelona', country: 'España', totalOrders: 3, totalSpent: 219.00, createdAt: '2026-02-01', status: 'ACTIVE' },
  { id: 'c_3', name: 'Elena Martínez', email: 'elena.mtz@hotmail.com', phone: '+34 633 445 566', city: 'Valencia', country: 'España', totalOrders: 8, totalSpent: 890.20, createdAt: '2025-11-20', status: 'ACTIVE' },
  { id: 'c_4', name: 'David Ruiz', email: 'david.ruiz@techcorp.com', phone: '+34 644 556 677', city: 'Sevilla', country: 'España', totalOrders: 1, totalSpent: 49.99, createdAt: '2026-02-18', status: 'ACTIVE' },
  { id: 'c_5', name: 'Marta Soler', email: 'marta.soler@icloud.com', phone: '+34 655 667 788', city: 'Bilbao', country: 'España', totalOrders: 4, totalSpent: 412.00, createdAt: '2025-12-05', status: 'ACTIVE' }
];

export function CustomersManager() {
  const { orders } = useStore();
  const [customers, setCustomers] = useState<CustomerProfile[]>(INITIAL_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpentAll = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Directorio de Clientes</h2>
            <p className="text-xs text-slate-400">Historial de compras, perfiles de comprador y valor de vida de cliente (LTV)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            Clientes registrados: <strong className="text-white font-bold">{customers.length}</strong>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs text-slate-400 font-medium">Clientes Totales</div>
          <div className="text-2xl font-bold text-white mt-1">{customers.length}</div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-1">100% Cuentas activas</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs text-slate-400 font-medium">Ingresos Totales por Clientes</div>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{totalSpentAll.toFixed(2)} €</div>
          <div className="text-[10px] text-slate-500 mt-1">Facturado en tienda</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs text-slate-400 font-medium">Ticket Medio por Cliente</div>
          <div className="text-2xl font-bold text-blue-400 mt-1 font-mono">
            {(totalSpentAll / Math.max(1, customers.length)).toFixed(2)} €
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Promedio de compras</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo electrónico o ciudad..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-4">Cliente</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Ubicación</th>
                <th className="p-4">Pedidos Realizados</th>
                <th className="p-4">Total Invertido</th>
                <th className="p-4">Fecha de Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron clientes que coincidan con la búsqueda
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{c.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{c.id}</div>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>{c.city}, {c.country}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{c.totalOrders} pedidos</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-amber-400 text-sm">
                      {c.totalSpent.toFixed(2)} €
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {c.createdAt}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
