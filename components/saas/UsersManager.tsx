'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Shield, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  X,
  Edit2
} from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string;
  tenants?: string[];
  createdAt: string;
  lastActive?: string;
}

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export function UsersManager() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);
  const [tenantLoadError, setTenantLoadError] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // New user form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STAFF');
  const [tenantId, setTenantId] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        const res = await fetch('/api/admin/users', { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok || data?.success !== true) {
          throw new Error(data?.error || 'Error cargando usuarios');
        }

        if (isMounted && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Error loading users:', error);
        if (isMounted) {
          showToast('No se pudieron cargar los usuarios desde el servidor.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const loadTenants = async () => {
      setIsLoadingTenants(true);

      try {
        const res = await fetch('/api/admin/tenants', { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok || data?.success !== true ||
            !Array.isArray(data.tenants)) {
          throw new Error(data?.error || 'No se pudieron cargar las tiendas');
        }

        const available: TenantOption[] = data.tenants.filter(
          (tenant: TenantOption) =>
            tenant &&
            typeof tenant.id === 'string' &&
            typeof tenant.name === 'string' &&
            typeof tenant.slug === 'string' &&
            ['active', 'trial'].includes(String(tenant.status).toLowerCase())
        );

        if (!isMounted) return;

        setTenants(available);
        setTenantId(current =>
          available.some(tenant => tenant.id === current)
            ? current
            : (available[0]?.id || '')
        );
        setTenantLoadError(
          available.length === 0
            ? 'No hay tiendas activas o en prueba disponibles.'
            : null
        );
      } catch (error) {
        console.error('Error loading tenants:', error);
        if (isMounted) {
          setTenants([]);
          setTenantId('');
          setTenantLoadError(
            'No se pudieron cargar las tiendas. Recarga el panel antes de crear el usuario.'
          );
        }
      } finally {
        if (isMounted) setIsLoadingTenants(false);
      }
    };

    void loadUsers();
    void loadTenants();

    return () => {
      isMounted = false;
    };
  }, [refreshIndex]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshIndex(prev => prev + 1);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        showToast(`Rol de usuario actualizado a ${newRole} en PostgreSQL`);
      }
    } catch (e) {
      console.error('Error updating user role:', e);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        showToast(`Estado de cuenta actualizado a ${newStatus} en PostgreSQL`);
      }
    } catch (e) {
      console.error('Error updating user status:', e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      showToast('Completa el nombre, el correo y la contraseña.');
      return;
    }

    if (password.length < 12 || password.length > 128) {
      showToast('La contraseña debe tener entre 12 y 128 caracteres.');
      return;
    }

    if (password !== password.trim()) {
      showToast('La contraseña no puede empezar ni terminar con espacios.');
      return;
    }

    if (role !== 'SUPER_ADMIN' && !tenantId) {
      showToast('Selecciona una tienda para asociar este usuario.');
      return;
    }

    setIsCreatingUser(true);

    try {
      const payload = {
        name: cleanName,
        email: cleanEmail,
        password,
        role,
        ...(role === 'SUPER_ADMIN' ? {} : { tenantId }),
      };

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data?.success === true) {
        showToast(
          role === 'SUPER_ADMIN'
            ? 'Superadministrador registrado correctamente.'
            : 'Usuario creado y asociado a la tienda seleccionada.'
        );

        setIsNewUserModalOpen(false);
        setName('');
        setEmail('');
        setPassword('');
        setRole('STAFF');
        handleRefresh();
      } else {
        showToast(data?.error || 'No se pudo crear el usuario.');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('Error de conexión al crear el usuario.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Gestión de Usuarios y Roles RBAC</h2>
            <p className="text-xs text-slate-400">Control de identidades, privilegios globales y aislamiento multi-tenant</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Recargar desde PostgreSQL"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsNewUserModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear Usuario</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo electrónico..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">Todos los Roles</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="OWNER">OWNER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="MANAGER">MANAGER</option>
          <option value="EDITOR">EDITOR</option>
          <option value="STAFF">STAFF</option>
          <option value="CUSTOMER">CUSTOMER</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Usuario</th>
                <th className="p-3.5">Rol Asignado</th>
                <th className="p-3.5">Comercios Asociados</th>
                <th className="p-3.5">Fecha Alta</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5">
                    <div className="font-semibold text-white">{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="p-3.5">
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono border bg-slate-900 focus:outline-none ${
                        u.role === 'SUPER_ADMIN' ? 'text-amber-400 border-amber-500/30' :
                        u.role === 'OWNER' ? 'text-purple-400 border-purple-500/30' :
                        'text-cyan-400 border-cyan-500/30'
                      }`}
                    >
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="EDITOR">EDITOR</option>
                      <option value="STAFF">STAFF</option>
                      <option value="CUSTOMER">CUSTOMER</option>
                    </select>
                  </td>
                  <td className="p-3.5 text-slate-300">
                    {u.tenants && u.tenants.length > 0 ? u.tenants.join(', ') : 'Plataforma Global'}
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => handleStatusToggle(u.id, u.status)}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        u.status === 'ACTIVE' ? 'text-emerald-400 hover:text-emerald-300' : 'text-rose-400 hover:text-rose-300'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Activo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Suspendido
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleStatusToggle(u.id, u.status)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                        u.status === 'ACTIVE' ? 'border-rose-800 text-rose-400 hover:bg-rose-950' : 'border-emerald-800 text-emerald-400 hover:bg-emerald-950'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Usuario */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Crear Usuario del Sistema</h3>
              <button onClick={() => setIsNewUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Lucas Vázquez"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="ej: lucas@empresa.es"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña Segura (PBKDF2)</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rol Inicial</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="STAFF">STAFF (Personal de Tienda)</option>
                  <option value="MANAGER">MANAGER (Gestor)</option>
                  <option value="ADMIN">ADMIN (Administrador de Tienda)</option>
                  <option value="OWNER">OWNER (Propietario de Tenant)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Control Total Plataforma)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tienda asociada
                </label>
                <select
                  value={role === 'SUPER_ADMIN' ? '' : tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  required={role !== 'SUPER_ADMIN'}
                  disabled={role === 'SUPER_ADMIN' || isLoadingTenants || tenants.length === 0}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white disabled:opacity-50"
                >
                  <option value="">
                    {isLoadingTenants ? 'Cargando tiendas...' : 'Selecciona una tienda...'}
                  </option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.slug})
                    </option>
                  ))}
                </select>
                {role === 'SUPER_ADMIN' ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    El superadministrador es una cuenta global y no se asocia a una tienda.
                  </p>
                ) : tenantLoadError ? (
                  <p role="alert" className="mt-1 text-[11px] text-red-300">
                    {tenantLoadError}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">
                    La cuenta quedará vinculada a esta tienda con el rol seleccionado.
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingUser ? 'Creando usuario...' : 'Registrar en PostgreSQL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
