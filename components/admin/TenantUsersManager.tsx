'use client';

import React, { useState } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Mail, 
  Shield, 
  Trash2, 
  CheckCircle2, 
  Lock,
  X
} from 'lucide-react';
import { useStore } from '@/lib/storeContext';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'EDITOR' | 'STAFF';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  lastActive: string;
}

const INITIAL_TEAM: TeamMember[] = [
  { id: 'usr_t1', name: 'Administrador Principal', email: 'admin@tutienda.com', role: 'OWNER', status: 'ACTIVE', lastActive: 'Ahora mismo' },
  { id: 'usr_t2', name: 'Gestor de Catálogo', email: 'catalogo@tutienda.com', role: 'MANAGER', status: 'ACTIVE', lastActive: 'Hace 2 horas' },
  { id: 'usr_t3', name: 'Soporte y Pedidos', email: 'soporte@tutienda.com', role: 'STAFF', status: 'ACTIVE', lastActive: 'Ayer' }
];

export function TenantUsersManager() {
  const { tenant } = useStore();
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'ADMIN' | 'MANAGER' | 'EDITOR' | 'STAFF'>('STAFF');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail || !formName) return;

    const newMember: TeamMember = {
      id: `usr_${Date.now()}`,
      name: formName,
      email: formEmail,
      role: formRole,
      status: 'INVITED',
      lastActive: 'Invitación enviada'
    };

    setTeam(prev => [...prev, newMember]);
    setIsModalOpen(false);
    showToast(`Invitación enviada a ${formEmail}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Revocar acceso al usuario '${name}'?`)) {
      setTeam(prev => prev.filter(u => u.id !== id));
      showToast(`Usuario '${name}' eliminado del equipo`);
    }
  };

  const filtered = team.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Equipo & Permisos (RBAC)</h2>
            <p className="text-xs text-slate-400">Administración de usuarios colaboradores, roles granulares y seguridad de tienda</p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormName('');
            setFormEmail('');
            setFormRole('STAFF');
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Invitar Colaborador</span>
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
            placeholder="Buscar colaboradores por nombre o email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {filtered.length} miembros
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-4">Colaborador</th>
                <th className="p-4">Correo Electrónico</th>
                <th className="p-4">Rol Asignado</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Última Actividad</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-4 font-bold text-white text-sm">
                    {u.name}
                  </td>
                  <td className="p-4 font-mono text-slate-300">
                    {u.email}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      u.role === 'OWNER' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                      u.role === 'MANAGER' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                      'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                    }`}>
                      {u.status === 'ACTIVE' ? 'Activo' : 'Invitado'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-[11px]">
                    {u.lastActive}
                  </td>
                  <td className="p-4 text-right">
                    {u.role !== 'OWNER' && (
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Invitar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Invitar Miembro al Equipo</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Nombre y Apellidos *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej. Ana Belén"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="ana@tutienda.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Rol & Nivel de Permisos</label>
                <select
                  value={formRole}
                  onChange={e => setFormRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ADMIN">Administrador (Acceso total)</option>
                  <option value="MANAGER">Gestor (Catálogo, pedidos, inventario)</option>
                  <option value="EDITOR">Editor (Blog, páginas, contenido)</option>
                  <option value="STAFF">Personal de Atención (Sólo lectura y envíos)</option>
                </select>
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
                  Enviar Invitación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
