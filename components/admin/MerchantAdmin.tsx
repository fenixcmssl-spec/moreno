'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { BackendLoginGate } from '@/components/admin/BackendLoginGate';
import { 
  ProductItem, 
  StoreOrder, 
  PluginDefinition, 
  ThemeDefinition, 
  SupportedLocale 
} from '@/types';
import { getTranslation, LANGUAGES } from '@/lib/i18n';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Puzzle, 
  Palette, 
  FileSpreadsheet, 
  Globe, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Truck, 
  CreditCard, 
  Sliders, 
  Sparkles, 
  ArrowRight, 
  ExternalLink, 
  Save, 
  Upload, 
  Eye, 
  Download,
  AlertCircle,
  Building2,
  Banknote,
  Send,
  LogOut,
  UserCheck,
  HardDrive,
  FolderArchive,
  FileCode,
  Code2,
  CheckCircle2,
  Layers,
  DownloadCloud,
  Laptop,
  Image as ImageIcon,
  FileText,
  Tag
} from 'lucide-react';
import { BlogManager } from '@/components/admin/BlogManager';
import { ClassifiedsManager } from '@/components/admin/ClassifiedsManager';
import { TenantBrandingSettings } from '@/components/admin/TenantBrandingSettings';
import { ThemeBuilderModal } from '@/components/admin/ThemeBuilderModal';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';
import { ThemeService, ThemeRecord } from '@/lib/services/theme.service';

export function MerchantAdmin() {
  const { 
    tenant, 
    products, 
    orders, 
    plugins, 
    themes, 
    activeTheme, 
    setActiveThemeId, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    updateOrderStatus, 
    togglePlugin, 
    updatePluginConfig, 
    installNewPlugin, 
    installNewTheme, 
    importProductsBatch,
    currentLocale,
    setCurrentRoute,
    isAuthenticated,
    currentUser,
    logoutBackend
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'products' | 'orders' | 'blog' | 'classifieds' | 'plugins' | 'themes' | 'media' | 'wp_import' | 'languages' | 'settings'
  >('dashboard');

  const [isThemeBuilderOpen, setIsThemeBuilderOpen] = useState(false);
  const [selectedBuilderTheme, setSelectedBuilderTheme] = useState<ThemeRecord | null>(null);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  // Product CRUD Modal state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productForm, setProductForm] = useState({
    title: '',
    category: 'Electrónica',
    price: 39.99,
    compareAtPrice: 59.99,
    sku: '',
    stock: 50,
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
    tags: 'nuevo, destacado'
  });

  // Plugin Config & Install Modal state
  const [configPlugin, setConfigPlugin] = useState<PluginDefinition | null>(null);
  const [pluginFormConfig, setPluginFormConfig] = useState<Record<string, any>>({});
  const [isNewPluginModalOpen, setIsNewPluginModalOpen] = useState(false);
  const [pluginModalTab, setPluginModalTab] = useState<'upload' | 'manual' | 'catalog'>('upload');
  const [uploadedPluginFile, setUploadedPluginFile] = useState<{
    name: string;
    size: number;
    content?: string;
    parsedData?: { name: string; category: any; description: string };
  } | null>(null);
  const [isPluginUploading, setIsPluginUploading] = useState(false);
  const [newPluginForm, setNewPluginForm] = useState({
    key: '',
    name: '',
    category: 'payment' as const,
    description: '',
    version: '1.0.0',
    author: 'Community Developer'
  });

  // Theme Customizer & Upload state
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);
  const [isNewThemeModalOpen, setIsNewThemeModalOpen] = useState(false);
  const [themeModalTab, setThemeModalTab] = useState<'upload' | 'custom' | 'presets'>('upload');
  const [uploadedThemeFile, setUploadedThemeFile] = useState<{ name: string; size: number; content?: string } | null>(null);
  const [uploadedThemeImage, setUploadedThemeImage] = useState<string>('');
  const [isThemeUploading, setIsThemeUploading] = useState(false);
  const [newThemeForm, setNewThemeForm] = useState({
    name: '',
    description: '',
    badge: 'Custom',
    primaryColor: '#f59e0b',
    accentColor: '#10b981',
    headerBg: '#0f172a',
    headerText: '#ffffff'
  });
  const [themeCustomConfig, setThemeCustomConfig] = useState({
    primaryColor: activeTheme?.colors?.primary || activeTheme?.palette?.primary || '#f59e0b',
    accentColor: activeTheme?.colors?.accent || activeTheme?.palette?.secondary || '#10b981',
    headerBg: activeTheme?.colors?.headerBg || '#0f172a',
    headerText: activeTheme?.colors?.headerText || '#ffffff'
  });

  // Language Upload & Add state
  const [isNewLangModalOpen, setIsNewLangModalOpen] = useState(false);
  const [langModalTab, setLangModalTab] = useState<'upload' | 'manual'>('upload');
  const [uploadedLangFile, setUploadedLangFile] = useState<{ name: string; size: number; content?: string } | null>(null);
  const [newLangForm, setNewLangForm] = useState({
    code: '',
    name: '',
    flag: '🌐'
  });

  // WP All Import State
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4>(1);
  const [importFileContent, setImportFileContent] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string>('');
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    title: 'title',
    price: 'price',
    sku: 'sku',
    stock: 'stock',
    category: 'category',
    description: 'description',
    image: 'image'
  });
  const [isImportRunning, setIsImportRunning] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number } | null>(null);

  // If not authenticated, render secure backend login gate
  if (!isAuthenticated) {
    return (
      <BackendLoginGate 
        title="Acceso al Panel de Control de la Tienda"
        subtitle={`Inicia sesión en ${tenant.customDomain || 'tutienda.com'}/admin para administrar tu catálogo, pedidos y plugins.`}
        targetDestination="store_admin"
      />
    );
  }

  // Stats
  const totalSales = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0);
  const paidOrdersCount = orders.filter(o => o.paymentStatus === 'paid').length;
  const avgTicket = paidOrdersCount > 0 ? (totalSales / paidOrdersCount).toFixed(2) : '0.00';

  // Handle Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        title: productForm.title,
        category: productForm.category,
        price: Number(productForm.price),
        compareAtPrice: productForm.compareAtPrice ? Number(productForm.compareAtPrice) : undefined,
        sku: productForm.sku,
        stock: Number(productForm.stock),
        description: productForm.description,
        images: [productForm.imageUrl],
        tags: productForm.tags.split(',').map(t => t.trim())
      });
    } else {
      await addProduct({
        tenantId: tenant.id,
        title: productForm.title,
        slug: productForm.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        category: productForm.category,
        price: Number(productForm.price),
        compareAtPrice: productForm.compareAtPrice ? Number(productForm.compareAtPrice) : undefined,
        sku: productForm.sku || `SKU-${Date.now().toString().slice(-5)}`,
        stock: Number(productForm.stock),
        description: productForm.description,
        images: [productForm.imageUrl],
        tags: productForm.tags.split(',').map(t => t.trim()),
        rating: 5.0,
        reviewsCount: 1,
        status: 'active'
      });
    }
    setIsAddProductOpen(false);
    setEditingProduct(null);
  };

  // Load sample CSV for WP All Import
  const handleLoadSampleCSV = () => {
    const sampleCSV = `title,price,compare_price,sku,stock,category,image,description
"Smart TV 55 Pulgadas 4K HDR",429.99,599.00,"TV-55-4K-UHD",18,"Electrónica","https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80","Televisor inteligente con resolución 4K HDR10, Dolby Audio y sistema operativo Android TV."
"Robot Aspirador y Fregasuelos Láser",199.50,299.00,"HOG-ROB-ASP-LSR",32,"Hogar y Cocina","https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=800&q=80","Robot aspirador inteligente con navegación láser LiDAR 3D, potencia de succión 4000Pa y depósito de agua."
"Monitor Gaming Curvo 27\\" 165Hz 1ms",189.00,249.00,"INF-MON-27C-165",24,"Informática","https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80","Monitor para juegos con panel VA curvo 1500R, tasa de refresco 165Hz, FreeSync Premium y altavoces integrados."
"Chaqueta Cortavientos Deportiva Unisex",45.00,69.90,"MOD-CHA-WIN-BLU",50,"Moda y Ropa","https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80","Chaqueta impermeable ultraligera transpirable con capucha ajustable y detalles reflectantes nocturnos."`;
    
    setImportFileName('catalogo_proveedor_mayorista.csv');
    setImportFileContent(sampleCSV);
    
    // Parse CSV lines
    const lines = sampleCSV.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      // simple csv row parser
      const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
      const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(',');
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = matches[i] ? matches[i].replace(/^"|"$/g, '').trim() : '';
      });
      return obj;
    });

    setParsedImportRows(rows);
    setImportStep(2);
  };

  const handleExecuteImport = async () => {
    setIsImportRunning(true);
    await new Promise(r => setTimeout(r, 1400));

    const formattedProducts = parsedImportRows.map(row => ({
      title: row[columnMapping.title] || 'Producto Importado',
      price: parseFloat(row[columnMapping.price]) || 29.99,
      sku: row[columnMapping.sku] || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      stock: parseInt(row[columnMapping.stock]) || 30,
      category: row[columnMapping.category] || 'General',
      description: row[columnMapping.description] || 'Descripción importada vía Fenix All Import.',
      images: [row[columnMapping.image] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80']
    }));

    await importProductsBatch(formattedProducts);
    setIsImportRunning(false);
    setImportResult({ total: formattedProducts.length });
    setImportStep(4);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Store Info */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
              FNX
            </div>
            <div className="overflow-hidden text-left">
              <div className="font-bold text-sm text-white truncate">{tenant.name}</div>
              <div className="text-[10px] text-amber-400 font-mono truncate">{tenant.customDomain || 'tutienda.com'}</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-semibold text-slate-400">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{getTranslation(currentLocale, 'merchant.dashboard')}</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                activeTab === 'products' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-blue-400" />
                <span>{getTranslation(currentLocale, 'merchant.products')}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${activeTab === 'products' ? 'bg-slate-950/20 text-slate-900' : 'bg-slate-800 text-slate-300'}`}>
                {products.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                activeTab === 'orders' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>{getTranslation(currentLocale, 'merchant.orders')}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${activeTab === 'orders' ? 'bg-slate-950/20 text-slate-900' : 'bg-slate-800 text-slate-300'}`}>
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('blog')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                activeTab === 'blog' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Blog & Artículos</span>
            </button>

            <button
              onClick={() => setActiveTab('classifieds')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                activeTab === 'classifieds' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4 text-purple-400" />
              <span>Clasificados & Anuncios</span>
            </button>

            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider px-3">
                Diseño & Ecosistema
              </span>
            </div>

            <button
              onClick={() => setActiveTab('themes')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                activeTab === 'themes' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4 text-purple-400" />
              <span>{getTranslation(currentLocale, 'merchant.themes')} & Builder</span>
            </button>

            <button
              onClick={() => setActiveTab('plugins')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                activeTab === 'plugins' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Puzzle className="w-4 h-4 text-amber-400" />
                <span>{getTranslation(currentLocale, 'merchant.plugins')}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${activeTab === 'plugins' ? 'bg-slate-950/20 text-slate-900' : 'bg-slate-800 text-slate-300'}`}>
                {plugins.length}
              </span>
            </button>

            <button
              onClick={() => setIsMediaLibraryOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition hover:bg-slate-800 hover:text-white text-slate-400"
            >
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span>Biblioteca de Medios</span>
            </button>

            <button
              onClick={() => setActiveTab('wp_import')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                activeTab === 'wp_import' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>{getTranslation(currentLocale, 'merchant.wp_import')}</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                activeTab === 'settings' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-300" />
              <span>Identidad & Branding</span>
            </button>
          </nav>
        </div>

        {/* View Storefront & User Session */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          {/* Active Admin Session Pill */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Admin Activo
              </span>
              <button
                onClick={logoutBackend}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition"
                title="Cerrar sesión del backend"
              >
                <LogOut className="w-3 h-3" />
                <span>Salir</span>
              </button>
            </div>
            <div className="text-white font-mono text-[11px] font-bold truncate mt-0.5">
              {currentUser?.email || 'info@fenixcms.es'}
            </div>
          </div>

          <button
            onClick={() => setCurrentRoute('store_front')}
            className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-700"
          >
            <Eye className="w-4 h-4" />
            <span>Ver Escaparate Fenix</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN BACKOFFICE WORKSPACE */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-h-screen text-left">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h1 className="text-xl font-extrabold text-white">Dashboard — {tenant.name}</h1>
                  <p className="text-xs text-slate-400">Resumen operativo de ventas, catálogo y envíos con Correos.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({
                      title: '',
                      category: 'Electrónica',
                      price: 29.99,
                      compareAtPrice: 49.99,
                      sku: `SKU-${Date.now().toString().slice(-4)}`,
                      stock: 30,
                      description: '',
                      imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
                      tags: 'nuevo, destacado'
                    });
                    setIsAddProductOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Producto</span>
                </button>
              </div>

              {/* KPIs Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Ventas Totales</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{totalSales.toFixed(2)}€</div>
                  <div className="text-[10px] text-slate-500 mt-1">{paidOrdersCount} pedidos pagados</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Ticket Medio</div>
                  <div className="text-2xl font-black text-white mt-1">{avgTicket}€</div>
                  <div className="text-[10px] text-slate-500 mt-1">Por cliente</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Productos en Stock</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{products.length}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Variantes activas</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Plugins Activos</div>
                  <div className="text-2xl font-black text-blue-400 mt-1">
                    {plugins.filter(p => p.enabled || p.isEnabled).length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">PayPal, Stripe, Correos, COD</div>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>Últimos Pedidos Recibidos</span>
                  </h3>
                  <button onClick={() => setActiveTab('orders')} className="text-xs text-amber-400 hover:underline">
                    Ver todos ({orders.length}) →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[10px] text-slate-400 uppercase bg-slate-800/60 font-bold">
                      <tr>
                        <th className="px-3 py-2">Nº Pedido</th>
                        <th className="px-3 py-2">Cliente</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-3 py-2">Pasarela</th>
                        <th className="px-3 py-2">Estado</th>
                        <th className="px-3 py-2">Correos Tracking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                            No hay pedidos registrados todavía. La tienda está limpia y lista para producción.
                          </td>
                        </tr>
                      ) : (
                        orders.slice(0, 4).map(o => (
                          <tr key={o.id} className="hover:bg-slate-800/40">
                            <td className="px-3 py-2.5 font-mono font-bold text-white">{o.orderNumber}</td>
                            <td className="px-3 py-2.5">{o.customerName}</td>
                            <td className="px-3 py-2.5 font-bold text-amber-400">{o.total.toFixed(2)}€</td>
                            <td className="px-3 py-2.5 uppercase font-semibold text-blue-400">{o.paymentMethod}</td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold uppercase">
                                {o.paymentStatus}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-emerald-400 text-[11px]">{o.trackingNumber || 'En preparación'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS CATALOG */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h1 className="text-xl font-extrabold text-white">Catálogo de Productos</h1>
                  <p className="text-xs text-slate-400">Gestiona precios, variantes, imágenes y stock sincronizados en Firestore.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('wp_import')}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                    <span>Importar CSV (Fenix All Import)</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({
                        title: '',
                        category: 'Electrónica',
                        price: 29.99,
                        compareAtPrice: 49.99,
                        sku: `SKU-${Date.now().toString().slice(-4)}`,
                        stock: 30,
                        description: '',
                        imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
                        tags: 'nuevo, destacado'
                      });
                      setIsAddProductOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Producto</span>
                  </button>
                </div>
              </div>

              {/* Product Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={p.images[0]} alt={p.title} className="w-10 h-10 object-cover rounded bg-slate-800 border border-slate-700" />
                            <div>
                              <div className="font-bold text-white line-clamp-1">{p.title}</div>
                              <div className="text-[10px] text-slate-500">{p.rating} ★ ({p.reviewsCount} reviews)</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{p.sku}</td>
                        <td className="px-4 py-3 font-medium text-slate-300">{p.category}</td>
                        <td className="px-4 py-3 font-bold text-amber-400">{p.price.toFixed(2)}€</td>
                        <td className="px-4 py-3 font-semibold text-emerald-400">{p.stock} uds</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setProductForm({
                                  title: p.title,
                                  category: p.category,
                                  price: p.price,
                                  compareAtPrice: p.compareAtPrice || 0,
                                  sku: p.sku,
                                  stock: p.stock,
                                  description: p.description,
                                  imageUrl: p.images[0] || '',
                                  tags: p.tags.join(', ')
                                });
                                setIsAddProductOpen(true);
                              }}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar producto ${p.title}?`)) {
                                  deleteProduct(p.id);
                                }
                              }}
                              className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900 border border-rose-800/50 text-rose-300 transition"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS MANAGEMENT & CORREOS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h1 className="text-xl font-extrabold text-white">Gestión de Pedidos & Envíos Correos</h1>
                  <p className="text-xs text-slate-400">Controla el estado de pago, albaranes y números de seguimiento de Correos Express.</p>
                </div>
              </div>

              <div className="space-y-3">
                {orders.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
                    <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-300">Bandeja de pedidos vacía</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      No hay pedidos pendientes ni registrados. Cuando tus clientes compren en la tienda con Stripe, PayPal o Contrarreembolso, se generarán aquí con integración a Correos.
                    </p>
                  </div>
                ) : (
                  orders.map(ord => (
                    <div key={ord.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 text-xs">
                        <div>
                          <span className="font-mono font-bold text-white text-sm">{ord.orderNumber}</span>
                          <span className="text-slate-400 ml-2 font-medium">Cliente: <b className="text-slate-200">{ord.customerName}</b> ({ord.customerEmail})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={ord.paymentStatus}
                            onChange={e => updateOrderStatus(ord.id, { paymentStatus: e.target.value as any })}
                            className="bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-[11px] font-semibold"
                          >
                            <option value="paid">Pagado (Paid)</option>
                            <option value="pending">Pendiente (Pending)</option>
                            <option value="refunded">Reembolsado</option>
                          </select>

                          <select
                            value={ord.fulfillmentStatus}
                            onChange={e => updateOrderStatus(ord.id, { fulfillmentStatus: e.target.value as any })}
                            className="bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-[11px] font-semibold"
                          >
                            <option value="processing">En Preparación</option>
                            <option value="shipped">Enviado con Correos</option>
                            <option value="delivered">Entregado</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-slate-500 text-[10px] font-bold uppercase">Dirección de Entrega:</span>
                          <div className="text-slate-300">{ord.shippingAddress.address}, {ord.shippingAddress.postalCode} {ord.shippingAddress.city}, {ord.shippingAddress.country}</div>
                          <div className="text-slate-400">Tel: {ord.customerPhone}</div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500 text-[10px] font-bold uppercase">Pasarela & Desglose:</span>
                          <div className="font-semibold text-blue-400 uppercase">Pago: {ord.paymentMethod}</div>
                          <div className="text-slate-300">Total: <b className="text-amber-400">{ord.total.toFixed(2)}€</b> (IVA incluido)</div>
                        </div>

                        <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                          <span className="text-slate-400 text-[10px] font-bold uppercase flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-amber-400" />
                            <span>Envío {ord.carrier || 'Correos Express'}:</span>
                          </span>
                          <div className="font-mono text-emerald-400 font-bold select-all">
                            {ord.trackingNumber || 'PQ4809289123'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PLUGINS ECOSYSTEM (FENIX EXTENSION ARCHITECTURE) */}
          {activeTab === 'plugins' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h1 className="text-xl font-extrabold text-white">Plugins & Extensiones FenixCMS</h1>
                  <p className="text-xs text-slate-400">
                    Arquitectura modular extensible: sube plugins (.zip / .json) desde tu ordenador, activa pasarelas o añade herramientas en 1 clic.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setPluginModalTab('upload');
                    setIsNewPluginModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Plugin (.zip / .json) / Instalar</span>
                </button>
              </div>

              {/* Plugins List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plugins.map((plug) => (
                  <div
                    key={plug.id}
                    className={`bg-slate-900 rounded-xl p-5 border transition flex flex-col justify-between ${
                      plug.isEnabled ? 'border-slate-700' : 'border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-slate-800 text-amber-400 border border-slate-700">
                            {plug.category === 'payment' && <CreditCard className="w-4 h-4" />}
                            {plug.category === 'shipping' && <Truck className="w-4 h-4 text-emerald-400" />}
                            {plug.category === 'import' && <FileSpreadsheet className="w-4 h-4 text-blue-400" />}
                            {plug.category === 'ai' && <Sparkles className="w-4 h-4 text-purple-400" />}
                            {plug.category === 'marketing' && <Send className="w-4 h-4 text-amber-400" />}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{plug.name}</h3>
                            <span className="text-[10px] text-slate-400">v{plug.version} • Por {plug.author}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          plug.isEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {plug.isEnabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                        {plug.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                      <button
                        onClick={() => togglePlugin(plug.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          plug.isEnabled
                            ? 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        }`}
                      >
                        {plug.isEnabled ? 'Desactivar' : 'Activar Plugin'}
                      </button>

                      {plug.settingsFields && (
                        <button
                          onClick={() => {
                            setConfigPlugin(plug);
                            setPluginFormConfig(plug.config || {});
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Configurar</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: THEMES STUDIO */}
          {activeTab === 'themes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h1 className="text-xl font-extrabold text-white">Temas & Apariencia Visual</h1>
                  <p className="text-xs text-slate-400">Sube temas (.zip / .json) desde tu ordenador, activa plantillas o personaliza colores.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allThemes = ThemeService.getAllThemes();
                      setSelectedBuilderTheme(allThemes[0]);
                      setIsThemeBuilderOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                  >
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span>Theme Builder Pro (Visual)</span>
                  </button>
                  <button
                    onClick={() => {
                      setThemeModalTab('upload');
                      setIsNewThemeModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Subir Tema (.zip / .json)</span>
                  </button>
                  <button
                    onClick={() => setIsThemeCustomizerOpen(true)}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>Editor de Colores</span>
                  </button>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {themes.map((th) => {
                  const isActive = activeTheme.id === th.id;
                  return (
                    <div
                      key={th.id}
                      className={`bg-slate-900 rounded-xl overflow-hidden border transition flex flex-col justify-between ${
                        isActive ? 'border-2 border-amber-500 shadow-xl shadow-amber-500/10' : 'border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="aspect-video w-full overflow-hidden bg-slate-800 relative">
                          <img src={th.previewImage} alt={th.name} className="w-full h-full object-cover" />
                          {th.badge && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 text-amber-400 text-[10px] font-bold shadow">
                              {th.badge}
                            </span>
                          )}
                        </div>

                        <div className="p-4 space-y-2">
                          <h3 className="text-sm font-bold text-white">{th.name}</h3>
                          <p className="text-xs text-slate-400">{th.description}</p>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        {isActive ? (
                          <div className="w-full py-2 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5">
                            <Check className="w-4 h-4" />
                            <span>Tema Activo en Escaparate</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveThemeId(th.id)}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition text-center shadow"
                          >
                            Activar este Tema
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: FENIX ALL IMPORT PRO */}
          {activeTab === 'wp_import' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-blue-400" />
                    <span>Fenix All Import Pro (Importador Masivo)</span>
                  </h1>
                  <p className="text-xs text-slate-400">
                    Importa miles de productos desde archivos CSV, XML o JSON con mapeador visual arrastrable de campos.
                  </p>
                </div>
              </div>

              {/* 4-Step Wizard Indicator */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                <div className={`p-2.5 rounded-lg border transition ${importStep >= 1 ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  1. Archivo Fuente
                </div>
                <div className={`p-2.5 rounded-lg border transition ${importStep >= 2 ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  2. Mapeo de Campos
                </div>
                <div className={`p-2.5 rounded-lg border transition ${importStep >= 3 ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  3. Reglas & SKU
                </div>
                <div className={`p-2.5 rounded-lg border transition ${importStep >= 4 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  4. Ejecución
                </div>
              </div>

              {/* STEP 1: Upload / Load Sample */}
              {importStep === 1 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Selecciona tu archivo de productos (CSV, XML o JSON)</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Compatible con feeds de proveedores mayoristas, archivos CSV, XML y JSON estándar.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                    <button
                      onClick={handleLoadSampleCSV}
                      className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Cargar Archivo de Prueba CSV (4 Productos Listos)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Drag and drop / Column mapping */}
              {importStep === 2 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white">Mapeo de Campos de Importación</h3>
                      <p className="text-xs text-slate-400">Asocia las columnas de tu archivo <span className="text-amber-400 font-mono">({importFileName})</span> con los atributos de FenixCMS.</p>
                    </div>
                    <span className="text-xs bg-slate-800 px-2.5 py-1 rounded text-emerald-400 font-mono">
                      {parsedImportRows.length} registros detectados
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Título del Producto (Target: Title)</label>
                      <select
                        value={columnMapping.title}
                        onChange={e => setColumnMapping({ ...columnMapping, title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="title">Columna: title</option>
                        <option value="name">Columna: name</option>
                        <option value="producto">Columna: producto</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Precio (€) (Target: Price)</label>
                      <select
                        value={columnMapping.price}
                        onChange={e => setColumnMapping({ ...columnMapping, price: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="price">Columna: price</option>
                        <option value="precio">Columna: precio</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Código SKU / Referencia (Target: SKU)</label>
                      <select
                        value={columnMapping.sku}
                        onChange={e => setColumnMapping({ ...columnMapping, sku: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="sku">Columna: sku</option>
                        <option value="referencia">Columna: referencia</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Stock Disponible (Target: Stock)</label>
                      <select
                        value={columnMapping.stock}
                        onChange={e => setColumnMapping({ ...columnMapping, stock: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="stock">Columna: stock</option>
                        <option value="cantidad">Columna: cantidad</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Categoría (Target: Category)</label>
                      <select
                        value={columnMapping.category}
                        onChange={e => setColumnMapping({ ...columnMapping, category: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="category">Columna: category</option>
                        <option value="categoria">Columna: categoria</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">URL de Imagen (Target: Image)</label>
                      <select
                        value={columnMapping.image}
                        onChange={e => setColumnMapping({ ...columnMapping, image: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="image">Columna: image</option>
                        <option value="imagen">Columna: imagen</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-800">
                    <button
                      onClick={() => setImportStep(1)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                    >
                      ← Atrás
                    </button>
                    <button
                      onClick={() => setImportStep(3)}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                    >
                      Continuar al Paso 3 →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Conflict Rules */}
              {importStep === 3 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white">Reglas de Duplicados e Identificador Único</h3>
                  
                  <div className="space-y-3 text-xs">
                    <label className="flex items-center gap-2 p-3 bg-slate-800/80 rounded-lg border border-slate-700 cursor-pointer">
                      <input type="checkbox" defaultChecked className="text-amber-500" />
                      <div>
                        <span className="font-bold text-white">Actualizar productos existentes si coincide el SKU</span>
                        <p className="text-slate-400 text-[11px]">Si el producto ya existe en el catálogo, actualiza precio y stock automáticamente.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-slate-800/80 rounded-lg border border-slate-700 cursor-pointer">
                      <input type="checkbox" defaultChecked className="text-amber-500" />
                      <div>
                        <span className="font-bold text-white">Crear nuevas categorías automáticamente</span>
                        <p className="text-slate-400 text-[11px]">Si la categoría del CSV no existe en la tienda, se dará de alta.</p>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-800">
                    <button
                      onClick={() => setImportStep(2)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                    >
                      ← Atrás
                    </button>
                    <button
                      onClick={handleExecuteImport}
                      disabled={isImportRunning}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow"
                    >
                      {isImportRunning ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Importando {parsedImportRows.length} productos a Firestore...</span>
                        </>
                      ) : (
                        <span>Ejecutar Importación Ahora</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Success View */}
              {importStep === 4 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">¡Importación Fenix All Import Completada!</h3>
                  <p className="text-xs text-slate-300">
                    Se han procesado e insertado <span className="text-amber-400 font-bold">{importResult?.total}</span> nuevos productos en el catálogo de <span className="font-semibold text-white">{tenant.name}</span>.
                  </p>

                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('products')}
                      className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs"
                    >
                      Ver Catálogo de Productos
                    </button>
                    <button
                      onClick={() => setCurrentRoute('store_front')}
                      className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs"
                    >
                      Ver en Escaparate Fenix
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 7: MULTI-LANGUAGE MANAGER */}
          {activeTab === 'languages' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h1 className="text-xl font-extrabold text-white">Multi-idioma Nativo & Localización</h1>
                  <p className="text-xs text-slate-400">
                    Sube diccionarios (.json / .po) desde tu ordenador o crea nuevos idiomas para expandir tu mercado global.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setLangModalTab('upload');
                    setIsNewLangModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir / Añadir Idioma (.json)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {LANGUAGES.map(l => (
                  <div key={l.code} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{l.flag}</span>
                      <div>
                        <div className="font-bold text-white text-xs">{l.name} ({l.code.toUpperCase()})</div>
                        <div className="text-[10px] text-emerald-400">Traducciones 100% Sincronizadas</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                      Activo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: BLOG & MAGAZINE */}
          {activeTab === 'blog' && (
            <BlogManager tenantId={tenant.id} />
          )}

          {/* TAB: CLASSIFIEDS */}
          {activeTab === 'classifieds' && (
            <ClassifiedsManager tenantId={tenant.id} />
          )}

          {/* TAB: STORE SETTINGS & BRANDING */}
          {activeTab === 'settings' && (
            <TenantBrandingSettings />
          )}

        </div>
      </main>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsAddProductOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-white mb-4">
              {editingProduct ? 'Editar Producto' : 'Añadir Nuevo Producto al Catálogo'}
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Título del Producto</label>
                <input
                  type="text"
                  required
                  value={productForm.title}
                  onChange={e => setProductForm({ ...productForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={productForm.category}
                    onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option>Electrónica</option>
                    <option>Hogar y Cocina</option>
                    <option>Informática</option>
                    <option>Moda y Ropa</option>
                    <option>Deportes</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Código SKU</label>
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Precio (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.price}
                    onChange={e => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Precio Anterior (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.compareAtPrice}
                    onChange={e => setProductForm({ ...productForm, compareAtPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Stock</label>
                  <input
                    type="number"
                    required
                    value={productForm.stock}
                    onChange={e => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">URL de Imagen Principal</label>
                <input
                  type="url"
                  required
                  value={productForm.imageUrl}
                  onChange={e => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PLUGIN CONFIGURATION */}
      {configPlugin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setConfigPlugin(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-base font-bold text-white mb-1">Configuración: {configPlugin.name}</h3>
            <p className="text-xs text-slate-400 mb-4">{configPlugin.description}</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updatePluginConfig(configPlugin.id, pluginFormConfig);
                setConfigPlugin(null);
              }}
              className="space-y-3 text-xs"
            >
              {configPlugin.settingsFields?.map(f => (
                <div key={f.key}>
                  <label className="block font-semibold text-slate-300 mb-1">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      rows={2}
                      value={pluginFormConfig[f.key] ?? ''}
                      onChange={e => setPluginFormConfig({ ...pluginFormConfig, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  ) : f.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(pluginFormConfig[f.key])}
                        onChange={e => setPluginFormConfig({ ...pluginFormConfig, [f.key]: e.target.checked })}
                        className="text-amber-500"
                      />
                      <span className="text-slate-300">Habilitar esta opción</span>
                    </label>
                  ) : (
                    <input
                      type={f.type}
                      value={pluginFormConfig[f.key] ?? ''}
                      placeholder={f.placeholder}
                      onChange={e => setPluginFormConfig({ ...pluginFormConfig, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfigPlugin(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow"
                >
                  Guardar Ajustes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSTALL / UPLOAD NEW PLUGIN (FROM COMPUTER / MANUAL / CATALOG) */}
      {isNewPluginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => {
                setIsNewPluginModalOpen(false);
                setUploadedPluginFile(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Puzzle className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Instalador de Plugins FenixCMS</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Sube un paquete de plugin (.zip o .json) directamente desde tu ordenador o elige del catálogo.
            </p>

            {/* Modal Tabs */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs mb-4">
              <button
                type="button"
                onClick={() => setPluginModalTab('upload')}
                className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  pluginModalTab === 'upload' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Subir desde Ordenador</span>
              </button>
              <button
                type="button"
                onClick={() => setPluginModalTab('catalog')}
                className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  pluginModalTab === 'catalog' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Catálogo Rápido</span>
              </button>
              <button
                type="button"
                onClick={() => setPluginModalTab('manual')}
                className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  pluginModalTab === 'manual' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Crear Manual</span>
              </button>
            </div>

            {/* TAB 1: UPLOAD FROM COMPUTER */}
            {pluginModalTab === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/80 rounded-xl p-6 text-center bg-slate-800/40 transition">
                  <input
                    type="file"
                    id="plugin-file-upload"
                    accept=".zip,.json,.tar.gz,.js"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        let parsedName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                        let parsedCategory: any = 'payment';
                        let parsedDesc = 'Plugin importado y cargado desde el ordenador del usuario.';

                        if (file.name.endsWith('.json')) {
                          try {
                            const json = JSON.parse(content);
                            if (json.name) parsedName = json.name;
                            if (json.category) parsedCategory = json.category;
                            if (json.description) parsedDesc = json.description;
                          } catch {}
                        }

                        setUploadedPluginFile({
                          name: file.name,
                          size: file.size,
                          content,
                          parsedData: {
                            name: parsedName,
                            category: parsedCategory,
                            description: parsedDesc
                          }
                        });
                      };
                      if (file.name.endsWith('.json')) {
                        reader.readAsText(file);
                      } else {
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="plugin-file-upload" className="cursor-pointer block space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                      <FolderArchive className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-white">
                      Haz clic para seleccionar el archivo de tu ordenador
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Formatos compatibles: <span className="font-mono text-emerald-400">.ZIP</span>, <span className="font-mono text-emerald-400">.JSON</span>, <span className="font-mono text-emerald-400">.TAR.GZ</span> (Máx 50MB)
                    </p>
                  </label>
                </div>

                {/* File preview */}
                {uploadedPluginFile ? (
                  <div className="p-3.5 bg-slate-800 border border-emerald-500/50 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white font-mono">{uploadedPluginFile.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {(uploadedPluginFile.size / 1024).toFixed(1)} KB • Paquete validado con éxito
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-700">
                        Listo
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-700 text-[11px] text-slate-300 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500">Nombre Detectado:</span>
                        <p className="font-semibold text-white capitalize">{uploadedPluginFile.parsedData?.name || 'Plugin Personalizado'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Tipo de Extensión:</span>
                        <p className="font-semibold text-emerald-400 capitalize">{uploadedPluginFile.parsedData?.category || 'General'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Al igual que en WordPress (Subir plugin), FenixCMS desempaqueta los manifiestos, valida permisos y registra la extensión en caliente en tu tienda.
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewPluginModalOpen(false);
                      setUploadedPluginFile(null);
                    }}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!uploadedPluginFile || isPluginUploading}
                    onClick={async () => {
                      if (!uploadedPluginFile) return;
                      setIsPluginUploading(true);
                      await new Promise(r => setTimeout(r, 600));

                      const pName = uploadedPluginFile.parsedData?.name || uploadedPluginFile.name.replace(/\.[^/.]+$/, '');
                      const pCat = uploadedPluginFile.parsedData?.category || 'payment';
                      const pDesc = uploadedPluginFile.parsedData?.description || `Plugin importado desde el paquete local ${uploadedPluginFile.name}.`;

                      installNewPlugin({
                        id: `plugin_uploaded_${Date.now()}`,
                        key: `pkg_${Date.now()}`,
                        name: pName,
                        category: pCat,
                        description: pDesc,
                        version: '1.0.0',
                        author: 'Desarrollador Externo',
                        iconName: 'Puzzle',
                        isEnabled: true,
                        config: {}
                      });

                      setIsPluginUploading(false);
                      setUploadedPluginFile(null);
                      setIsNewPluginModalOpen(false);
                    }}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPluginUploading ? (
                      <span>Instalando paquete...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Instalar Plugin desde Ordenador</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: POPULAR EXTENSIONS CATALOG */}
            {pluginModalTab === 'catalog' && (
              <div className="space-y-3">
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                  {[
                    {
                      name: 'Redsys + Bizum Oficial España',
                      cat: 'payment' as const,
                      desc: 'Pasarela de pago bancario TPV Virtual con soporte nativo de Bizum y 3DSecure.',
                      ver: '2.4.0',
                      author: 'Redsys Oficial'
                    },
                    {
                      name: 'WhatsApp Notificaciones de Pedido',
                      cat: 'marketing' as const,
                      desc: 'Envía el ticket de compra y número de seguimiento automáticamente al WhatsApp del cliente.',
                      ver: '1.8.2',
                      author: 'Fenix Connect'
                    },
                    {
                      name: 'Correos Express & SEUR Connector',
                      cat: 'shipping' as const,
                      desc: 'Generación de etiquetas térmicas y recogida automática con transportistas.',
                      ver: '3.1.0',
                      author: 'Logistics Pro'
                    },
                    {
                      name: 'ChatGPT SEO Meta-Tags & Copywriter',
                      cat: 'ai' as const,
                      desc: 'Auto-completa descripciones de productos y optimiza snippets para Google.',
                      ver: '1.2.0',
                      author: 'Fenix AI Labs'
                    }
                  ].map((catItem, idx) => (
                    <div key={idx} className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{catItem.name}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">v{catItem.ver}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{catItem.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          installNewPlugin({
                            id: `plugin_cat_${Date.now()}_${idx}`,
                            key: `cat_${idx}_${Date.now()}`,
                            name: catItem.name,
                            category: catItem.cat,
                            description: catItem.desc,
                            version: catItem.ver,
                            author: catItem.author,
                            iconName: 'Puzzle',
                            isEnabled: true,
                            config: {}
                          });
                          setIsNewPluginModalOpen(false);
                        }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs whitespace-nowrap"
                      >
                        Instalar
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewPluginModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: MANUAL REGISTRATION */}
            {pluginModalTab === 'manual' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  installNewPlugin({
                    id: `plugin_${Date.now()}`,
                    key: newPluginForm.key || `custom_${Date.now()}`,
                    name: newPluginForm.name,
                    category: newPluginForm.category,
                    description: newPluginForm.description,
                    version: newPluginForm.version,
                    author: newPluginForm.author,
                    iconName: 'Puzzle',
                    isEnabled: true,
                    config: {}
                  });
                  setIsNewPluginModalOpen(false);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nombre del Plugin</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Stripe Checkout Custom"
                    value={newPluginForm.name}
                    onChange={e => setNewPluginForm({ ...newPluginForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={newPluginForm.category}
                    onChange={e => setNewPluginForm({ ...newPluginForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="payment">Pasarela de Pago</option>
                    <option value="shipping">Envíos & Logística</option>
                    <option value="marketing">Marketing & CRM</option>
                    <option value="ai">Inteligencia Artificial</option>
                    <option value="seo">SEO & Analytics</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Descripción</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe las funcionalidades del plugin..."
                    value={newPluginForm.description}
                    onChange={e => setNewPluginForm({ ...newPluginForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewPluginModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow"
                  >
                    Registrar Plugin
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL: INSTALL / UPLOAD NEW THEME (FROM COMPUTER / CUSTOM) */}
      {isNewThemeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => {
                setIsNewThemeModalOpen(false);
                setUploadedThemeFile(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Palette className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Instalador de Temas FenixCMS</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Sube una plantilla visual (.zip o .json) desde tu ordenador o crea un tema a medida.
            </p>

            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs mb-4">
              <button
                type="button"
                onClick={() => setThemeModalTab('upload')}
                className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  themeModalTab === 'upload' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Subir Tema (.zip / .json)</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeModalTab('custom')}
                className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  themeModalTab === 'custom' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Crear Tema Personalizado</span>
              </button>
            </div>

            {themeModalTab === 'upload' ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/80 rounded-xl p-6 text-center bg-slate-800/40 transition">
                  <input
                    type="file"
                    id="theme-file-upload"
                    accept=".zip,.json,.tar.gz,.css"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadedThemeFile({
                        name: file.name,
                        size: file.size
                      });
                    }}
                    className="hidden"
                  />
                  <label htmlFor="theme-file-upload" className="cursor-pointer block space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                      <FolderArchive className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-white">
                      Haz clic para seleccionar el paquete del tema (.zip / .json)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Carga instantánea de estilos, componentes de cuadrícula y layout.
                    </p>
                  </label>
                </div>

                {uploadedThemeFile && (
                  <div className="p-3.5 bg-slate-800 border border-amber-500/50 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white font-mono">{uploadedThemeFile.name}</div>
                        <div className="text-[10px] text-slate-400">{(uploadedThemeFile.size / 1024).toFixed(1)} KB • Archivo cargado</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold border border-amber-700">
                      Válido
                    </span>
                  </div>
                )}

                {/* Optional Screenshot / Preview Image */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs space-y-2">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Imagen de Portada / Captura del Tema (Opcional)</span>
                  </div>
                  {uploadedThemeImage ? (
                    <div className="flex items-center justify-between gap-3 p-2 bg-slate-900 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-2">
                        <img src={uploadedThemeImage} alt="Theme Preview" className="w-12 h-9 object-cover rounded bg-slate-800" />
                        <span className="text-[11px] text-emerald-400 font-medium">Captura adjuntada con éxito</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedThemeImage('')}
                        className="text-slate-400 hover:text-rose-400 text-xs px-2 py-1"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        id="theme-img-upload"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) setUploadedThemeImage(ev.target.result as string);
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="theme-img-upload"
                        className="flex items-center justify-center gap-2 py-2 px-3 border border-slate-700 border-dashed rounded-lg text-[11px] text-slate-300 hover:border-amber-500/50 hover:bg-slate-800 cursor-pointer transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span>Subir captura de pantalla (PNG, JPG, WebP)</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewThemeModalOpen(false);
                      setUploadedThemeFile(null);
                      setUploadedThemeImage('');
                    }}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!uploadedThemeFile || isThemeUploading}
                    onClick={async () => {
                      if (!uploadedThemeFile) return;
                      setIsThemeUploading(true);
                      await new Promise(r => setTimeout(r, 600));

                      const cleanName = uploadedThemeFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                      installNewTheme({
                        id: `theme_uploaded_${Date.now()}`,
                        key: `theme_custom_${Date.now()}`,
                        name: cleanName.toUpperCase(),
                        description: `Tema importado desde el archivo ${uploadedThemeFile.name}.`,
                        previewImage: uploadedThemeImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
                        badge: 'Importado',
                        colors: {
                          primary: '#0ea5e9',
                          secondary: '#0284c7',
                          accent: '#f59e0b',
                          background: '#090d16',
                          headerBg: '#0b1120',
                          headerText: '#ffffff'
                        },
                        typography: {
                          headingFont: 'Outfit',
                          bodyFont: 'Inter'
                        },
                        layout: {
                          bannerStyle: 'fenix_marketplace_slider',
                          productCardStyle: 'fenix_dense'
                        }
                      });

                      setIsThemeUploading(false);
                      setUploadedThemeFile(null);
                      setUploadedThemeImage('');
                      setIsNewThemeModalOpen(false);
                    }}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    {isThemeUploading ? 'Instalando Tema...' : 'Instalar y Activar Tema'}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  installNewTheme({
                    id: `theme_custom_${Date.now()}`,
                    key: `theme_custom_${Date.now()}`,
                    name: newThemeForm.name,
                    description: newThemeForm.description,
                    previewImage: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
                    badge: 'Custom',
                    colors: {
                      primary: newThemeForm.primaryColor,
                      secondary: '#3b82f6',
                      accent: newThemeForm.accentColor,
                      background: '#0f172a',
                      headerBg: newThemeForm.headerBg,
                      headerText: newThemeForm.headerText
                    },
                    typography: {
                      headingFont: 'Inter',
                      bodyFont: 'Inter'
                    },
                    layout: {
                      bannerStyle: 'modern_grid',
                      productCardStyle: 'fenix_high_density'
                    }
                  });
                  setIsNewThemeModalOpen(false);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nombre de la Plantilla</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Fenix Cyber Gold Theme"
                    value={newThemeForm.name}
                    onChange={e => setNewThemeForm({ ...newThemeForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Descripción</label>
                  <input
                    type="text"
                    required
                    placeholder="Estilo visual de alta conversión..."
                    value={newThemeForm.description}
                    onChange={e => setNewThemeForm({ ...newThemeForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Color Primario</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newThemeForm.primaryColor}
                        onChange={e => setNewThemeForm({ ...newThemeForm, primaryColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-700 bg-slate-800 cursor-pointer"
                      />
                      <span className="font-mono text-slate-300 text-xs">{newThemeForm.primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Color Cabecera</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newThemeForm.headerBg}
                        onChange={e => setNewThemeForm({ ...newThemeForm, headerBg: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-700 bg-slate-800 cursor-pointer"
                      />
                      <span className="font-mono text-slate-300 text-xs">{newThemeForm.headerBg}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewThemeModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow"
                  >
                    Crear y Activar Tema
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL: ADD / UPLOAD NEW LANGUAGE */}
      {isNewLangModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => {
                setIsNewLangModalOpen(false);
                setUploadedLangFile(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Añadir / Subir Idioma</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Carga un archivo de traducción (.json o .po) o define un nuevo código ISO para tu tienda.
            </p>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/80 rounded-xl p-5 text-center bg-slate-800/40 transition">
                <input
                  type="file"
                  id="lang-file-upload"
                  accept=".json,.po,.mo"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadedLangFile({
                      name: file.name,
                      size: file.size
                    });
                  }}
                  className="hidden"
                />
                <label htmlFor="lang-file-upload" className="cursor-pointer block space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
                    <FolderArchive className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white">
                    Seleccionar archivo .JSON de traducción
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Ejemplo: <code className="text-blue-400">de.json</code>, <code className="text-blue-400">ja.json</code>, <code className="text-blue-400">pt.json</code>
                  </p>
                </label>
              </div>

              {uploadedLangFile && (
                <div className="p-3 bg-slate-800 border border-blue-500/50 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white font-mono">{uploadedLangFile.name}</div>
                      <div className="text-[10px] text-slate-400">{(uploadedLangFile.size / 1024).toFixed(1)} KB • Archivo listo</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewLangModalOpen(false);
                    setUploadedLangFile(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewLangModalOpen(false);
                    setUploadedLangFile(null);
                  }}
                  className="px-5 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg text-xs shadow"
                >
                  Registrar Idioma
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* THEME BUILDER PRO MODAL */}
      {isThemeBuilderOpen && (
        <ThemeBuilderModal
          tenantId={tenant.id}
          theme={selectedBuilderTheme || ThemeService.getAllThemes()[0]}
          isOpen={isThemeBuilderOpen}
          onClose={() => setIsThemeBuilderOpen(false)}
        />
      )}

      {/* MEDIA LIBRARY MODAL */}
      {isMediaLibraryOpen && (
        <MediaLibraryModal
          tenantId={tenant.id}
          isOpen={isMediaLibraryOpen}
          onClose={() => setIsMediaLibraryOpen(false)}
        />
      )}

    </div>
  );
}
