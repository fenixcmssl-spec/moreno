'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/storeContext';
import { BackendLoginGate } from '@/components/admin/BackendLoginGate';
import { SaaSLicense, SaaSPlan, MarketplaceItem } from '@/types';
import { 
  Shield, 
  Store, 
  Key, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Search, 
  Sliders, 
  Layers, 
  DollarSign,
  Calendar,
  LogOut,
  Edit,
  Trash2,
  RefreshCw,
  ShoppingBag,
  Package,
  Sparkles,
  Clock,
  Eye,
  EyeOff,
  Check,
  Upload,
  FolderArchive,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Link2,
  FileArchive,
  LayoutDashboard,
  Cpu,
  CreditCard,
  FileText,
  Building,
  Globe,
  Palette,
  Puzzle,
  Users,
  History,
  Settings as SettingsIcon,
  TrendingUp,
  AlertTriangle,
  UserX,
  ShieldCheck,
  Activity
} from 'lucide-react';

import { ApplicationsManager } from './ApplicationsManager';
import { PlansManager } from './PlansManager';
import { EntitlementsManager } from './EntitlementsManager';
import { ActivationsManager } from './ActivationsManager';
import { SubscriptionsManager } from './SubscriptionsManager';
import { PaymentsManager } from './PaymentsManager';
import { InvoicesManager } from './InvoicesManager';
import { DomainsManager } from './DomainsManager';
import { UsersManager } from './UsersManager';
import { AuditLogsViewer } from './AuditLogsViewer';
import { PlatformSettingsManager } from './PlatformSettingsManager';
import { DashboardMetrics } from '@/lib/services/super-admin.service';

type SuperAdminTab = 
  | 'dashboard'
  | 'applications'
  | 'plans'
  | 'entitlements'
  | 'licenses'
  | 'activations'
  | 'subscriptions'
  | 'payments'
  | 'invoices'
  | 'tenants'
  | 'domains'
  | 'themes'
  | 'plugins'
  | 'users'
  | 'audit'
  | 'settings';

export function SuperAdminPortal() {
  const { 
    currentUser,
    isAuthenticated,
    logoutBackend,
    setCurrentRoute,
    licenses,
    plans,
    marketplaceItems,
    addMarketplaceItem,
    updateMarketplaceItem,
    deleteMarketplaceItem,
    createLicense,
    updateLicense,
    toggleLicenseStatus
  } = useStore();

  const [activeTab, setActiveTab] = useState<SuperAdminTab>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    mrr: 15420,
    arr: 185040,
    tenants: 42,
    activeLicenses: 38,
    trialLicenses: 7,
    expiredLicenses: 3,
    cancelledSubscriptions: 2,
    failedPayments: 1,
    currency: 'EUR',
    totalUsers: 89,
    activeSubscriptions: 35,
    totalInvoices: 142,
    revenueTotal: 245900
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Tenant state for Tenants tab
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');

  // Marketplace states
  const [mktFilter, setMktFilter] = useState<'all' | 'plugin' | 'theme'>('all');
  const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useState(false);
  const [editingMktItem, setEditingMktItem] = useState<MarketplaceItem | null>(null);

  // New License Modal
  const [isNewLicenseModalOpen, setIsNewLicenseModalOpen] = useState(false);
  const [newLicCustomerName, setNewLicCustomerName] = useState('');
  const [newLicCustomerEmail, setNewLicCustomerEmail] = useState('');
  const [newLicStoreName, setNewLicStoreName] = useState('');
  const [newLicPlanId, setNewLicPlanId] = useState('plan_pro');
  const [newLicDuration, setNewLicDuration] = useState<'1_month' | '1_year' | 'lifetime'>('1_year');
  const [newLicCustomPrice, setNewLicCustomPrice] = useState(790);

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 3500);
  };

  const isSuperAdmin = currentUser?.role === 'super_admin' || (currentUser?.role as any) === 'SUPER_ADMIN';

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && isSuperAdmin) {
      const load = async () => {
        try {
          const [mRes, tRes] = await Promise.all([
            fetch('/api/admin/metrics'),
            fetch('/api/admin/tenants')
          ]);
          const [mData, tData] = await Promise.all([mRes.json(), tRes.json()]);
          if (isMounted) {
            if (mData.success && mData.metrics) setMetrics(mData.metrics);
            if (tData.success && Array.isArray(tData.tenants)) setTenantsList(tData.tenants);
          }
        } catch (e) {
          console.error('Error loading admin portal initial data:', e);
        } finally {
          if (isMounted) setIsLoadingMetrics(false);
        }
      };
      load();
    }
    return () => { isMounted = false; };
  }, [isAuthenticated, currentUser]);

  const fetchDashboardMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (e) {
      console.error('Error loading admin metrics:', e);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      if (data.success && Array.isArray(data.tenants)) {
        setTenantsList(data.tenants);
      }
    } catch (e) {
      console.error('Error loading tenants:', e);
    }
  };

  // STRICT RBAC CHECK: Only SUPER_ADMIN allowed
  if (!isAuthenticated || !currentUser) {
    return <BackendLoginGate targetDestination="super_admin" title="Acceso Exclusivo Super Admin" subtitle="Introduce credenciales con rol SUPER_ADMIN para administrar FenixCMS" />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-800/80 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-rose-300">Acceso Denegado (403)</h2>
          <p className="text-xs text-slate-400">
            Tu rol actual ({currentUser.role}) no tiene permisos para entrar al Super Admin. Esta área está restringida exclusivamente a usuarios con rol <strong className="text-amber-400 font-mono">SUPER_ADMIN</strong>.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => logoutBackend()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              Cerrar Sesión
            </button>
            <button
              onClick={() => setCurrentRoute('store_admin')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition"
            >
              Ir a Panel de Tienda
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLicCustomerName || !newLicCustomerEmail || !newLicStoreName) {
      showToast('Por favor completa los campos requeridos');
      return;
    }

    const created = await createLicense({
      tenantId: `t_${Date.now()}`,
      applicationId: 'app_ecommerce',
      planId: newLicPlanId,
      planName: newLicPlanId === 'plan_pro' ? 'Pro Storefront' : newLicPlanId === 'plan_starter' ? 'Starter Basic' : 'Enterprise Scale',
      licenseKey: `FNX-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      customerName: newLicCustomerName,
      customerEmail: newLicCustomerEmail,
      tenantName: newLicStoreName,
      tenantSlug: newLicStoreName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      price: newLicCustomPrice,
      billingPeriod: newLicDuration === '1_year' ? 'yearly' : 'monthly',
      paymentProvider: 'paypal',
      transactionId: `tx_${Date.now()}`,
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 86400000).toISOString(),
      status: 'active'
    });

    setIsNewLicenseModalOpen(false);
    setNewLicCustomerName('');
    setNewLicCustomerEmail('');
    setNewLicStoreName('');
    showToast(`Licencia creada con éxito`);
    fetchDashboardMetrics();
  };

  const navTabs: { id: SuperAdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'applications', label: 'Applications', icon: Cpu },
    { id: 'plans', label: 'Plans', icon: Layers },
    { id: 'entitlements', label: 'Entitlements', icon: Sliders },
    { id: 'licenses', label: 'Licenses', icon: Key },
    { id: 'activations', label: 'Activations', icon: Activity },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'tenants', label: 'Tenants', icon: Building },
    { id: 'domains', label: 'Domains', icon: Globe },
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'plugins', label: 'Plugins', icon: Puzzle },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'audit', label: 'Audit Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-md shadow-amber-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight text-white">FENIX CMS</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Plataforma Global Multi-Tenant &amp; Licenciamiento SaaS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-200">{currentUser.name}</div>
            <div className="text-[10px] text-amber-400 font-mono">{currentUser.email}</div>
          </div>

          <button
            onClick={() => setCurrentRoute('store_front')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Ver Tienda</span>
          </button>

          <button
            onClick={() => logoutBackend()}
            className="p-2 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-xl border border-slate-700 transition"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container with Sidebar / Tabs */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-64 bg-slate-900/50 border-r border-slate-800 p-3 lg:p-4 shrink-0 overflow-x-auto lg:overflow-y-auto">
          <nav className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left w-full ${
                    isActive 
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
          
          {toastNotification && (
            <div className="p-3 bg-emerald-950/90 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toastNotification}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Panel de Control Ejecutivo Super Admin</h1>
                  <p className="text-xs text-slate-400">Métricas en tiempo real consultadas directamente desde PostgreSQL</p>
                </div>
                <button
                  onClick={fetchDashboardMetrics}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
                  <span>Actualizar Métricas</span>
                </button>
              </div>

              {/* 8 Primary Required Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. MRR */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">MRR (Ingreso Mensual)</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    €{metrics.mrr.toLocaleString('es-ES')}
                  </div>
                  <p className="text-[11px] text-slate-500">Ingreso recurrente mensualizado</p>
                </div>

                {/* 2. ARR */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">ARR (Ingreso Anual)</span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400">
                    €{metrics.arr.toLocaleString('es-ES')}
                  </div>
                  <p className="text-[11px] text-slate-500">Run-rate anualizado proyectado</p>
                </div>

                {/* 3. Tenants */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Comercios / Tenants</span>
                    <Building className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {metrics.tenants}
                  </div>
                  <p className="text-[11px] text-slate-500">Instancias multi-tenant creadas</p>
                </div>

                {/* 4. Active Licenses */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Licencias Activas</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    {metrics.activeLicenses}
                  </div>
                  <p className="text-[11px] text-slate-500">Licencias vigentes y operativas</p>
                </div>

                {/* 5. Trial Licenses */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Licencias en Prueba</span>
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-cyan-400">
                    {metrics.trialLicenses}
                  </div>
                  <p className="text-[11px] text-slate-500">Período de prueba de 14 días</p>
                </div>

                {/* 6. Expired Licenses */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Licencias Expiradas</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400">
                    {metrics.expiredLicenses}
                  </div>
                  <p className="text-[11px] text-slate-500">Pendientes de renovación de ciclo</p>
                </div>

                {/* 7. Cancelled Subscriptions */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Suscripciones Canceladas</span>
                    <XCircle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-rose-400">
                    {metrics.cancelledSubscriptions}
                  </div>
                  <p className="text-[11px] text-slate-500">Churn de suscripción registrado</p>
                </div>

                {/* 8. Failed Payments */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Pagos Fallidos</span>
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-rose-500">
                    {metrics.failedPayments}
                  </div>
                  <p className="text-[11px] text-slate-500">Requiere reintento en pasarela</p>
                </div>

              </div>

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setActiveTab('licenses')} 
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl cursor-pointer transition space-y-2"
                >
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Key className="w-4 h-4" />
                    <span>Gestión de Licencias</span>
                  </div>
                  <p className="text-xs text-slate-400">Emisión de claves criptográficas, prórrogas y asignación de dominios autorizados.</p>
                </div>

                <div 
                  onClick={() => setActiveTab('entitlements')} 
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl cursor-pointer transition space-y-2"
                >
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                    <Sliders className="w-4 h-4" />
                    <span>Matriz de Entitlements</span>
                  </div>
                  <p className="text-xs text-slate-400">Control de cuotas y capacidades estrictas por software plan en PostgreSQL.</p>
                </div>

                <div 
                  onClick={() => setActiveTab('payments')} 
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl cursor-pointer transition space-y-2"
                >
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span>Libro Mayor de Pagos</span>
                  </div>
                  <p className="text-xs text-slate-400">Historial de cobros Stripe, PayPal y Bizum con facturas B2B generadas.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPLICATIONS */}
          {activeTab === 'applications' && <ApplicationsManager />}

          {/* TAB 3: PLANS */}
          {activeTab === 'plans' && <PlansManager />}

          {/* TAB 4: ENTITLEMENTS */}
          {activeTab === 'entitlements' && <EntitlementsManager />}

          {/* TAB 5: LICENSES */}
          {activeTab === 'licenses' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Emisión y Control de Licencias FenixCMS</h2>
                    <p className="text-xs text-slate-400">Claves seriales criptográficas validadas contra PostgreSQL</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsNewLicenseModalOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Emitir Nueva Licencia</span>
                </button>
              </div>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5">Clave de Licencia</th>
                        <th className="p-3.5">Cliente / Tienda</th>
                        <th className="p-3.5">Plan Asignado</th>
                        <th className="p-3.5">Vencimiento</th>
                        <th className="p-3.5">Importe</th>
                        <th className="p-3.5">Estado</th>
                        <th className="p-3.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {licenses.map(lic => (
                        <tr key={lic.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-mono font-bold text-amber-400">
                            {lic.licenseKey}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{lic.customerName}</div>
                            <div className="text-[10px] text-slate-400">{lic.tenantName} ({lic.customerEmail})</div>
                          </td>
                          <td className="p-3.5 capitalize text-slate-300">
                            {lic.planName || lic.planId.replace('plan_', '')}
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {lic.validTo ? new Date(lic.validTo).toLocaleDateString('es-ES') : 'Ilimitado'}
                          </td>
                          <td className="p-3.5 font-bold text-emerald-400">
                            €{lic.price || 0}
                          </td>
                          <td className="p-3.5">
                            <button
                              onClick={() => toggleLicenseStatus(lic.id, lic.status === 'active' ? 'suspended' : 'active')}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                                lic.status === 'active' ? 'text-emerald-400' :
                                lic.status === 'pending' ? 'text-cyan-400' : 'text-rose-400'
                              }`}
                            >
                              {lic.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              <span className="capitalize">{lic.status}</span>
                            </button>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => toggleLicenseStatus(lic.id, lic.status === 'active' ? 'suspended' : 'active')}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] transition"
                            >
                              Cambiar Estado
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ACTIVATIONS */}
          {activeTab === 'activations' && <ActivationsManager />}

          {/* TAB 7: SUBSCRIPTIONS */}
          {activeTab === 'subscriptions' && <SubscriptionsManager />}

          {/* TAB 8: PAYMENTS */}
          {activeTab === 'payments' && <PaymentsManager />}

          {/* TAB 9: INVOICES */}
          {activeTab === 'invoices' && <InvoicesManager />}

          {/* TAB 10: TENANTS */}
          {activeTab === 'tenants' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Comercios y Tenants Multi-Tenant</h2>
                    <p className="text-xs text-slate-400">Aislamiento por esquema y configuración de instancias de tiendas</p>
                  </div>
                </div>

                <button
                  onClick={fetchTenants}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o slug de comercio..."
                  value={tenantSearchQuery}
                  onChange={e => setTenantSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(tenantsList.length > 0 ? tenantsList : [
                  { id: 't_demo_store', name: 'Tienda Oficial FenixCMS', slug: 'demo', status: 'ACTIVE', planName: 'Enterprise Scale', domains: ['tienda.fenixcms.es'] },
                  { id: 't_madrid_shop', name: 'Madrid Boutique Store', slug: 'madrid', status: 'ACTIVE', planName: 'Pro Storefront', domains: ['madridboutique.es'] },
                  { id: 't_valencia_shoes', name: 'Calzados Mediterráneo', slug: 'valencia', status: 'ACTIVE', planName: 'Starter Basic', domains: ['calzadosvalencia.com'] }
                ])
                .filter(t => t.name.toLowerCase().includes(tenantSearchQuery.toLowerCase()) || t.slug.toLowerCase().includes(tenantSearchQuery.toLowerCase()))
                .map(t => (
                  <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{t.name}</h4>
                        <span className="text-[11px] font-mono text-amber-400">/{t.slug}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        {t.status}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Plan:</span>
                        <span className="text-slate-200 font-semibold">{t.planName || 'Pro Storefront'}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Dominio:</span>
                        <span className="text-cyan-400 font-mono text-[11px]">{t.domains?.[0] || `${t.slug}.fenixcms.es`}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: DOMAINS */}
          {activeTab === 'domains' && <DomainsManager />}

          {/* TAB 12: THEMES */}
          {activeTab === 'themes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-pink-500/10 rounded-xl text-pink-400 border border-pink-500/20">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Catálogo de Temas FenixCMS</h2>
                    <p className="text-xs text-slate-400">Plantillas visuales modulares y temas oficiales para tiendas</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingMktItem(null);
                    setIsMarketplaceModalOpen(true);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Subir Nuevo Tema</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketplaceItems.filter(i => i.type === 'theme').map(theme => (
                  <div key={theme.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group hover:border-slate-700 transition">
                    <div className="h-36 bg-slate-800 relative overflow-hidden flex items-center justify-center">
                      {theme.previewImage ? (
                        <img src={theme.previewImage} alt={theme.name} className="w-full h-full object-cover" />
                      ) : (
                        <Palette className="w-10 h-10 text-slate-600" />
                      )}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/80 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
                        v{theme.version}
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-sm">{theme.name}</h4>
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {theme.price === 0 ? 'Gratis' : `€${theme.price}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{theme.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 13: PLUGINS */}
          {activeTab === 'plugins' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Catálogo de Plugins y Módulos</h2>
                    <p className="text-xs text-slate-400">Extensiones de pasarelas, envíos, IA y conectores empresariales</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingMktItem(null);
                    setIsMarketplaceModalOpen(true);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Subir Nuevo Plugin</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketplaceItems.filter(i => i.type === 'plugin').map(plugin => (
                  <div key={plugin.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 group hover:border-slate-700 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                          <Puzzle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{plugin.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">v{plugin.version} • {plugin.category}</span>
                        </div>
                      </div>

                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {plugin.price === 0 ? 'Gratis' : `€${plugin.price}`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">{plugin.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 14: USERS */}
          {activeTab === 'users' && <UsersManager />}

          {/* TAB 15: AUDIT LOGS */}
          {activeTab === 'audit' && <AuditLogsViewer />}

          {/* TAB 16: SETTINGS */}
          {activeTab === 'settings' && <PlatformSettingsManager />}

        </main>
      </div>

      {/* Modal Nueva Licencia */}
      {isNewLicenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Emitir Nueva Licencia de Software</h3>
              <button onClick={() => setIsNewLicenseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLicenseSubmit} className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Cliente / Empresa</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Moda Express S.L."
                  value={newLicCustomerName}
                  onChange={e => setNewLicCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email del Titular</label>
                <input
                  type="email"
                  required
                  placeholder="ej: contacto@empresa.com"
                  value={newLicCustomerEmail}
                  onChange={e => setNewLicCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Tienda</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Moda Express Madrid"
                  value={newLicStoreName}
                  onChange={e => setNewLicStoreName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Plan</label>
                  <select
                    value={newLicPlanId}
                    onChange={e => setNewLicPlanId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="plan_starter">Starter Basic</option>
                    <option value="plan_pro">Pro Storefront</option>
                    <option value="plan_enterprise">Enterprise Scale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duración</label>
                  <select
                    value={newLicDuration}
                    onChange={e => setNewLicDuration(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="1_month">1 Mes</option>
                    <option value="1_year">1 Año</option>
                    <option value="lifetime">Vitalicio</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewLicenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Generar y Guardar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
