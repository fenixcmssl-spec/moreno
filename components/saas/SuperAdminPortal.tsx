'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { BackendLoginGate } from '@/components/admin/BackendLoginGate';
import { SaaSLicense, SaaSPlan, MarketplaceItem } from '@/types';
import { getTranslation } from '@/lib/i18n';
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
  FileArchive
} from 'lucide-react';

import { ApplicationsManager } from './ApplicationsManager';
import { AuditLogsViewer } from './AuditLogsViewer';

export function SuperAdminPortal() {
  const { 
    applications,
    licenses, 
    toggleLicenseStatus, 
    updateLicense,
    createLicense,
    plans, 
    createPlan,
    updatePlan,
    deletePlan,
    clearAllPlans,
    resetDefaultPlans,
    marketplaceItems,
    addMarketplaceItem,
    updateMarketplaceItem,
    deleteMarketplaceItem,
    tenant, 
    products, 
    setCurrentRoute,
    currentLocale,
    isAuthenticated,
    currentUser,
    logoutBackend,
    auditLogs
  } = useStore();

  const [activeTab, setActiveTab] = useState<'licenses' | 'plans' | 'applications' | 'marketplace' | 'tenants' | 'audit'>('licenses');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketplaceFilter, setMarketplaceFilter] = useState<'all' | 'plugin' | 'theme'>('all');

  // Modal States
  const [isNewLicenseModalOpen, setIsNewLicenseModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<SaaSLicense | null>(null);
  const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useState(false);
  const [editingMarketplaceItem, setEditingMarketplaceItem] = useState<MarketplaceItem | null>(null);

  // Custom in-app Confirmation Modals (bypasses iframe confirm limitations)
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification(null);
    }, 4000);
  };

  // New Plan Form State
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanSlug, setNewPlanSlug] = useState('');
  const [newPlanAppId, setNewPlanAppId] = useState('app_classifieds');
  const [newPlanBadge, setNewPlanBadge] = useState('Nuevo');
  const [newPlanImageUrl, setNewPlanImageUrl] = useState('');
  const [newPlanImageMode, setNewPlanImageMode] = useState<'file' | 'url'>('file');
  const [isDraggingPlanImage, setIsDraggingPlanImage] = useState(false);
  const [newPlanPriceMonthly, setNewPlanPriceMonthly] = useState<number>(29);
  const [newPlanPriceYearly, setNewPlanPriceYearly] = useState<number>(290);
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [newPlanCapacityNumber, setNewPlanCapacityNumber] = useState<number>(1000);
  const [newPlanStorageMb, setNewPlanStorageMb] = useState<number>(5000);
  const [newPlanCustomDomain, setNewPlanCustomDomain] = useState(true);
  const [newPlanFeaturesText, setNewPlanFeaturesText] = useState('Publicación de anuncios ilimitada\nFiltros por ciudad y categoría\nChat interno entre usuarios\nMonetización de anuncios destacados\nDominio personalizado y SSL');
  const [newPlanIsPopular, setNewPlanIsPopular] = useState(false);

  // New License Form State
  const [newLicCustomerName, setNewLicCustomerName] = useState('');
  const [newLicCustomerEmail, setNewLicCustomerEmail] = useState('');
  const [newLicStoreName, setNewLicStoreName] = useState('');
  const [newLicStoreSlug, setNewLicStoreSlug] = useState('');
  const [newLicLogoUrl, setNewLicLogoUrl] = useState('');
  const [newLicImageMode, setNewLicImageMode] = useState<'file' | 'url'>('file');
  const [isDraggingLicImage, setIsDraggingLicImage] = useState(false);
  const [newLicPlanId, setNewLicPlanId] = useState('plan_pro');
  const [newLicDuration, setNewLicDuration] = useState<'1_month' | '3_months' | '6_months' | '1_year' | 'lifetime'>('1_year');
  const [newLicCustomPrice, setNewLicCustomPrice] = useState<number>(790);
  const [newLicPaymentProvider, setNewLicPaymentProvider] = useState<'paypal' | 'stripe' | 'manual'>('paypal');

  // Edit License Form State
  const [editLicDurationOption, setEditLicDurationOption] = useState<'extend_1m' | 'extend_3m' | 'extend_1y' | 'lifetime' | 'custom'>('custom');
  const [editLicValidTo, setEditLicValidTo] = useState('');
  const [editLicPrice, setEditLicPrice] = useState(0);
  const [editLicBillingPeriod, setEditLicBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [editLicStatus, setEditLicStatus] = useState<SaaSLicense['status']>('active');

  // Edit Plan Form State
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanBadge, setEditPlanBadge] = useState('');
  const [editPlanImageUrl, setEditPlanImageUrl] = useState('');
  const [editPlanImageMode, setEditPlanImageMode] = useState<'file' | 'url'>('file');
  const [isDraggingEditPlanImage, setIsDraggingEditPlanImage] = useState(false);
  const [editPlanPriceMonthly, setEditPlanPriceMonthly] = useState(0);
  const [editPlanPriceYearly, setEditPlanPriceYearly] = useState(0);
  const [editPlanDescription, setEditPlanDescription] = useState('');
  const [editPlanMaxProducts, setEditPlanMaxProducts] = useState(100);
  const [editPlanMaxStorageMb, setEditPlanMaxStorageMb] = useState(1000);

  // Marketplace Form State
  const [mktType, setMktType] = useState<'plugin' | 'theme'>('plugin');
  const [mktName, setMktName] = useState('');
  const [mktCategory, setMktCategory] = useState('payment');
  const [mktApplicationScope, setMktApplicationScope] = useState<string>('ALL');
  const [mktPrice, setMktPrice] = useState(29);
  const [mktBillingType, setMktBillingType] = useState<'one_time' | 'subscription_monthly' | 'subscription_yearly' | 'free'>('one_time');
  const [mktBadge, setMktBadge] = useState('Nuevo');
  const [mktShortDescription, setMktShortDescription] = useState('');
  const [mktDescription, setMktDescription] = useState('');
  const [mktPreviewImage, setMktPreviewImage] = useState('');
  const [mktAuthor, setMktAuthor] = useState('Fenix Official');
  const [mktVersion, setMktVersion] = useState('1.0.0');
  const [mktIsPublished, setMktIsPublished] = useState(true);
  const [mktIsFeatured, setMktIsFeatured] = useState(false);
  const [mktUploadedFileName, setMktUploadedFileName] = useState('');
  const [mktZipFileSize, setMktZipFileSize] = useState('');
  const [isDraggingZip, setIsDraggingZip] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'file' | 'url'>('file');

  const handleZipFileSelected = (file: File) => {
    if (!file) return;
    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
      : `${(file.size / 1024).toFixed(1)} KB`;
    
    setMktUploadedFileName(file.name);
    setMktZipFileSize(sizeStr);

    // Auto infer name and version if empty or default
    const cleanName = file.name
      .replace(/\.(zip|tar\.gz|json)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\bv\d+(\.\d+)*\b/gi, '')
      .trim();

    if (!mktName && cleanName) {
      setMktName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const versionMatch = file.name.match(/v?(\d+\.\d+(\.\d+)?)/i);
    if (versionMatch && versionMatch[1]) {
      setMktVersion(versionMatch[1]);
    }
  };

  const handleImageFileSelected = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setMktPreviewImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePlanImageFileSelected = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setNewPlanImageUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditPlanImageFileSelected = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setEditPlanImageUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLicLogoFileSelected = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setNewLicLogoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // If not authenticated or not super_admin, render secure login gate
  if (!isAuthenticated || currentUser?.role !== 'super_admin') {
    return (
      <BackendLoginGate 
        title="Super Admin Console — FenixCMS"
        subtitle="Acceso maestro a fenixcms.es/admin restringido a administradores autorizados."
        targetDestination="super_admin"
      />
    );
  }

  const activeLicensesCount = licenses.filter(l => l.status === 'active').length;
  const estimatedMRR = licenses.reduce((sum, l) => {
    if (l.status !== 'active') return sum;
    return sum + (l.billingPeriod === 'monthly' ? l.price : Math.round(l.price / 12));
  }, 0);

  const filteredLicenses = licenses.filter(l => 
    l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.licenseKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.tenantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMarketplaceItems = marketplaceItems.filter(item => {
    if (marketplaceFilter === 'all') return true;
    return item.type === marketplaceFilter;
  });

  const handleOpenEditLicense = (lic: SaaSLicense) => {
    setEditingLicense(lic);
    setEditLicValidTo(lic.validTo ? lic.validTo.split('T')[0] : '');
    setEditLicPrice(lic.price);
    setEditLicBillingPeriod(lic.billingPeriod);
    setEditLicStatus(lic.status);
    setEditLicDurationOption('custom');
  };

  const handleSaveLicenseChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicense) return;

    let finalValidTo = editLicValidTo;

    if (editLicDurationOption === 'extend_1m') {
      const d = new Date(editingLicense.validTo);
      d.setMonth(d.getMonth() + 1);
      finalValidTo = d.toISOString();
    } else if (editLicDurationOption === 'extend_3m') {
      const d = new Date(editingLicense.validTo);
      d.setMonth(d.getMonth() + 3);
      finalValidTo = d.toISOString();
    } else if (editLicDurationOption === 'extend_1y') {
      const d = new Date(editingLicense.validTo);
      d.setFullYear(d.getFullYear() + 1);
      finalValidTo = d.toISOString();
    } else if (editLicDurationOption === 'lifetime') {
      finalValidTo = '2099-12-31T23:59:59Z';
    } else {
      finalValidTo = new Date(editLicValidTo).toISOString();
    }

    await updateLicense(editingLicense.id, {
      price: Number(editLicPrice),
      billingPeriod: editLicBillingPeriod,
      status: editLicStatus,
      validTo: finalValidTo
    });

    setEditingLicense(null);
  };

  const handleOpenEditPlan = (plan: SaaSPlan) => {
    setEditingPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanBadge(plan.badge || '');
    setEditPlanImageUrl(plan.imageUrl || '');
    setEditPlanPriceMonthly(plan.priceMonthly);
    setEditPlanPriceYearly(plan.priceYearly);
    setEditPlanDescription(plan.description);
    setEditPlanMaxProducts(plan.maxProducts || plan.entitlements?.['products.max'] || 1000);
    setEditPlanMaxStorageMb(plan.maxStorageMb || plan.entitlements?.['storage.max_mb'] || 5000);
  };

  const handleSavePlanChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    await updatePlan(editingPlan.id, {
      name: editPlanName,
      badge: editPlanBadge,
      imageUrl: editPlanImageUrl || undefined,
      priceMonthly: Number(editPlanPriceMonthly),
      priceYearly: Number(editPlanPriceYearly),
      description: editPlanDescription,
      maxProducts: Number(editPlanMaxProducts),
      maxStorageMb: Number(editPlanMaxStorageMb)
    });

    setEditingPlan(null);
  };

  const handleCreateNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newPlanSlug.trim() || newPlanName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const featuresArray = newPlanFeaturesText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const isClassifieds = newPlanAppId === 'app_classifieds';
    const isBlog = newPlanAppId === 'app_blog';
    const isAuctions = newPlanAppId === 'app_auctions';
    const isHybridBlogEcommerce = newPlanAppId === 'app_hybrid_ecommerce_blog' || newPlanAppId === 'app_all_in_one';
    const isHybridAuctionsBlog = newPlanAppId === 'app_hybrid_auctions_blog';

    await createPlan({
      applicationId: newPlanAppId,
      name: newPlanName,
      slug: slug,
      badge: newPlanBadge.trim() || undefined,
      imageUrl: newPlanImageUrl || undefined,
      priceMonthly: Number(newPlanPriceMonthly),
      priceYearly: Number(newPlanPriceYearly),
      description: newPlanDescription,
      popular: newPlanIsPopular,
      status: 'ACTIVE',
      maxProducts: (!isClassifieds && !isBlog && !isAuctions && !isHybridAuctionsBlog) ? Number(newPlanCapacityNumber) : undefined,
      maxStorageMb: Number(newPlanStorageMb),
      customDomainAllowed: newPlanCustomDomain,
      entitlements: {
        ...(isClassifieds ? { 'classifieds.ads_max': Number(newPlanCapacityNumber) } : {}),
        ...(isBlog ? { 'blog.posts_max': Number(newPlanCapacityNumber) } : {}),
        ...(isAuctions ? { 'auctions.lots_max': Number(newPlanCapacityNumber), 'auctions.enabled': true } : {}),
        ...(isHybridBlogEcommerce ? { 'products.max': Number(newPlanCapacityNumber), 'blog.posts_max': Number(newPlanCapacityNumber), 'ecommerce.enabled': true, 'blog.enabled': true } : {}),
        ...(isHybridAuctionsBlog ? { 'auctions.lots_max': Number(newPlanCapacityNumber), 'blog.posts_max': Number(newPlanCapacityNumber), 'auctions.enabled': true, 'blog.enabled': true } : {}),
        ...((!isClassifieds && !isBlog && !isAuctions && !isHybridBlogEcommerce && !isHybridAuctionsBlog) ? { 'products.max': Number(newPlanCapacityNumber) } : {}),
        'storage.max_mb': Number(newPlanStorageMb),
        'domains.max': newPlanCustomDomain ? 2 : 1,
        'users.max': 5,
        'ai.enabled': true
      },
      features: featuresArray.length > 0 ? featuresArray : [
        'Acceso completo a la plataforma',
        'Soporte técnico y actualizaciones automáticas',
        'Panel de administración multi-idioma (6 idiomas)',
        'Alojamiento optimizado y certificado SSL incluido'
      ]
    });

    setIsNewPlanModalOpen(false);
    showToast(`✅ Plan "${newPlanName}" creado y publicado exitosamente`);
    // Reset form to clean state
    setNewPlanName('');
    setNewPlanSlug('');
    setNewPlanBadge('Nuevo');
    setNewPlanImageUrl('');
    setNewPlanPriceMonthly(29);
    setNewPlanPriceYearly(290);
    setNewPlanDescription('');
    setNewPlanCapacityNumber(1000);
    setNewPlanStorageMb(5000);
    setNewPlanFeaturesText('Publicación de anuncios ilimitada\nFiltros por ciudad y categoría\nChat interno entre usuarios\nMonetización de anuncios destacados\nDominio personalizado y SSL');
  };

  const handleRequestDeletePlan = (planId: string, planName: string) => {
    setPlanToDelete({ id: planId, name: planName });
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    const name = planToDelete.name;
    await deletePlan(planToDelete.id);
    setPlanToDelete(null);
    showToast(`🗑️ Plan "${name}" eliminado correctamente`);
  };

  const handleConfirmClearAllPlans = async () => {
    await clearAllPlans();
    setIsConfirmClearAllOpen(false);
    showToast(`🧹 Todos los planes han sido eliminados. Catálogo listo desde cero.`);
  };

  const handleConfirmResetDefaultPlans = async () => {
    await resetDefaultPlans();
    setIsConfirmResetOpen(false);
    showToast(`🔄 Planes predeterminados de FenixCMS restaurados con éxito.`);
  };

  const handleOpenNewMarketplaceModal = () => {
    setEditingMarketplaceItem(null);
    setMktType('plugin');
    setMktName('');
    setMktCategory('payment');
    setMktApplicationScope('ALL');
    setMktPrice(29);
    setMktBillingType('one_time');
    setMktBadge('Nuevo');
    setMktShortDescription('');
    setMktDescription('');
    setMktPreviewImage('');
    setMktAuthor('Fenix Official');
    setMktVersion('1.0.0');
    setMktIsPublished(true);
    setMktIsFeatured(false);
    setMktUploadedFileName('');
    setMktZipFileSize('');
    setImageInputMode('file');
    setIsMarketplaceModalOpen(true);
  };

  const handleOpenEditMarketplaceModal = (item: MarketplaceItem) => {
    setEditingMarketplaceItem(item);
    setMktType(item.type);
    setMktName(item.name);
    setMktCategory(item.category);
    setMktApplicationScope((item.applicationScope as string) || 'ALL');
    setMktPrice(item.price);
    setMktBillingType((item.billingType as any) || 'one_time');
    setMktBadge(item.badge || '');
    setMktShortDescription(item.shortDescription || '');
    setMktDescription(item.description);
    setMktPreviewImage(item.previewImage || '');
    setMktAuthor(item.author || 'Fenix Official');
    setMktVersion(item.version || '1.0.0');
    setMktIsPublished(item.isPublished ?? true);
    setMktIsFeatured(item.isFeatured || false);
    setMktUploadedFileName(item.downloadFileName || '');
    setMktZipFileSize('240 KB');
    setImageInputMode(item.previewImage?.startsWith('data:') ? 'file' : 'url');
    setIsMarketplaceModalOpen(true);
  };

  const handleSaveMarketplaceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = mktName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (editingMarketplaceItem) {
      await updateMarketplaceItem(editingMarketplaceItem.id, {
        name: mktName,
        type: mktType,
        category: mktCategory,
        applicationScope: mktApplicationScope as any,
        price: Number(mktPrice),
        billingType: mktBillingType,
        badge: mktBadge,
        shortDescription: mktShortDescription,
        description: mktDescription,
        previewImage: mktPreviewImage,
        author: mktAuthor,
        version: mktVersion,
        isPublished: mktIsPublished,
        isFeatured: mktIsFeatured,
        downloadFileName: mktUploadedFileName || `${slug}-v${mktVersion}.zip`
      });
    } else {
      await addMarketplaceItem({
        name: mktName,
        slug,
        type: mktType,
        category: mktCategory,
        applicationScope: mktApplicationScope as any,
        price: Number(mktPrice),
        billingType: mktBillingType,
        badge: mktBadge,
        shortDescription: mktShortDescription,
        description: mktDescription,
        previewImage: mktPreviewImage || (mktType === 'theme' ? 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80' : undefined),
        author: mktAuthor,
        version: mktVersion,
        rating: 5.0,
        salesCount: 0,
        isPublished: mktIsPublished,
        isFeatured: mktIsFeatured,
        downloadFileName: mktUploadedFileName || `${slug}-v${mktVersion}.zip`
      });
    }

    setIsMarketplaceModalOpen(false);
    showToast(`✅ Add-on "${mktName}" guardado en el Marketplace con compatibilidad: ${mktApplicationScope}`);
  };

  const handleCreateNewLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlan = plans.find(p => p.id === newLicPlanId) || plans[1];
    
    let validToDate = new Date();
    if (newLicDuration === '1_month') {
      validToDate.setMonth(validToDate.getMonth() + 1);
    } else if (newLicDuration === '3_months') {
      validToDate.setMonth(validToDate.getMonth() + 3);
    } else if (newLicDuration === '6_months') {
      validToDate.setMonth(validToDate.getMonth() + 6);
    } else if (newLicDuration === '1_year') {
      validToDate.setFullYear(validToDate.getFullYear() + 1);
    } else if (newLicDuration === 'lifetime') {
      validToDate = new Date('2099-12-31T23:59:59Z');
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const key = `FNX-${selectedPlan.name.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}-${randomSuffix}`;

    await createLicense({
      tenantId: `tenant_${(newLicStoreSlug || newLicStoreName).toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      applicationId: selectedPlan.applicationId || 'app_ecommerce',
      licenseKey: key,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      status: 'active',
      customerName: newLicCustomerName,
      customerEmail: newLicCustomerEmail,
      tenantName: newLicStoreName,
      tenantSlug: newLicStoreSlug || newLicStoreName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      logoUrl: newLicLogoUrl || undefined,
      imageUrl: newLicLogoUrl || undefined,
      price: Number(newLicCustomPrice),
      billingPeriod: newLicDuration === '1_month' || newLicDuration === '3_months' || newLicDuration === '6_months' ? 'monthly' : 'yearly',
      paymentProvider: newLicPaymentProvider,
      transactionId: `MANUAL-EMIT-${Date.now()}`,
      validFrom: new Date().toISOString(),
      validTo: validToDate.toISOString(),
      entitlements: selectedPlan.entitlements,
      maxProducts: selectedPlan.maxProducts,
      maxStorageMb: selectedPlan.maxStorageMb
    });

    setIsNewLicenseModalOpen(false);
    setNewLicCustomerName('');
    setNewLicCustomerEmail('');
    setNewLicStoreName('');
    setNewLicStoreSlug('');
    setNewLicLogoUrl('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {getTranslation(currentLocale, 'superadmin.title')}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {getTranslation(currentLocale, 'superadmin.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Logged in User Pill */}
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 leading-none">{getTranslation(currentLocale, 'superadmin.active_session')}</div>
                <div className="text-white font-mono font-bold text-xs">{currentUser?.email || 'info@fenixcms.es'}</div>
              </div>
            </div>

            <button
              onClick={() => setIsNewLicenseModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>{getTranslation(currentLocale, 'superadmin.emit_license')}</span>
            </button>

            <button
              onClick={handleOpenNewMarketplaceModal}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{getTranslation(currentLocale, 'superadmin.sell_addon')}</span>
            </button>

            <button
              onClick={() => setCurrentRoute('saas_landing')}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              {getTranslation(currentLocale, 'superadmin.view_commercial')}
            </button>

            <button
              onClick={logoutBackend}
              className="px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Cerrar Sesión del Backend"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{getTranslation(currentLocale, 'superadmin.logout')}</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>{getTranslation(currentLocale, 'superadmin.kpi_mrr')}</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-white">{estimatedMRR}€</div>
            <div className="text-[10px] text-emerald-400 font-medium mt-1">{getTranslation(currentLocale, 'superadmin.kpi_mrr_sub')}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>{getTranslation(currentLocale, 'superadmin.kpi_active_lic')}</span>
              <Key className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400">{activeLicensesCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">{licenses.length} {getTranslation(currentLocale, 'superadmin.kpi_active_lic_sub')}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>{getTranslation(currentLocale, 'superadmin.kpi_addons')}</span>
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">{marketplaceItems.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">{getTranslation(currentLocale, 'superadmin.kpi_addons_sub')}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>{getTranslation(currentLocale, 'superadmin.kpi_products')}</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-purple-400">{products.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">{getTranslation(currentLocale, 'superadmin.kpi_products_sub')}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('licenses')}
            className={`px-4 py-2.5 font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'licenses'
                ? 'border-amber-500 text-amber-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{getTranslation(currentLocale, 'superadmin.tab_licenses')} ({licenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2.5 font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'border-amber-500 text-amber-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Catálogo de Aplicaciones ({applications.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2.5 font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'plans'
                ? 'border-amber-500 text-amber-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{getTranslation(currentLocale, 'superadmin.tab_plans')} ({plans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2.5 font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'marketplace'
                ? 'border-amber-500 text-amber-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{getTranslation(currentLocale, 'superadmin.tab_marketplace')} ({marketplaceItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-4 py-2.5 font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'tenants'
                ? 'border-amber-500 text-amber-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>{getTranslation(currentLocale, 'superadmin.tab_tenants')}</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Auditoría & Seguridad ({auditLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: LICENSES TABLE */}
        {activeTab === 'licenses' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, clave, email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsNewLicenseModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Emitir Nueva Licencia</span>
                </button>
                <div className="text-xs text-slate-400">
                  {filteredLicenses.length} licencias
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Clave de Licencia</th>
                    <th className="px-4 py-3">Cliente / Titular</th>
                    <th className="px-4 py-3">Tienda / Slug</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Importe & Cobro</th>
                    <th className="px-4 py-3">Vigencia / Vencimiento</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredLicenses.map((lic) => {
                    const validToDate = lic.validTo ? new Date(lic.validTo) : new Date();
                    const isLifetime = validToDate.getFullYear() >= 2090;
                    return (
                      <tr key={lic.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-amber-400 select-all">
                          {lic.licenseKey}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{lic.customerName}</div>
                          <div className="text-[11px] text-slate-400">{lic.customerEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {(lic.logoUrl || lic.imageUrl) ? (
                              <img
                                src={lic.logoUrl || lic.imageUrl}
                                alt={lic.tenantName}
                                className="w-8 h-8 rounded-lg object-cover bg-slate-800 border border-slate-700 shrink-0 shadow-sm"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                                {lic.tenantName ? lic.tenantName.charAt(0).toUpperCase() : 'T'}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-200">{lic.tenantName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{lic.tenantSlug}.com</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium text-slate-300">
                            {lic.planName}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          <div>{lic.price}€</div>
                          <div className="text-[10px] text-slate-400 capitalize">{lic.billingPeriod === 'monthly' ? 'Mensual' : 'Anual'}</div>
                        </td>
                        <td className="px-4 py-3">
                          {isLifetime ? (
                            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800 text-[10px] font-bold">
                              ⚡ VITALICIA (Lifetime)
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{validToDate.toLocaleDateString()}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {lic.status === 'active' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-bold uppercase">
                              <CheckCircle className="w-3 h-3" /> Activa
                            </span>
                          )}
                          {lic.status === 'suspended' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300 text-[10px] font-bold uppercase">
                              <XCircle className="w-3 h-3" /> Suspendida
                            </span>
                          )}
                          {lic.status === 'expired' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-bold uppercase">
                              <Clock className="w-3 h-3" /> Expirada
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditLicense(lic)}
                              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-semibold flex items-center gap-1 transition"
                              title="Modificar precio, vigencia y duración"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Editar / Duración</span>
                            </button>
                            {lic.status === 'active' ? (
                              <button
                                onClick={() => toggleLicenseStatus(lic.id, 'suspended')}
                                className="px-2 py-1 rounded bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700/50 text-rose-300 text-[10px] font-semibold transition"
                              >
                                Suspender
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleLicenseStatus(lic.id, 'active')}
                                className="px-2 py-1 rounded bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 text-emerald-300 text-[10px] font-semibold transition"
                              >
                                Reactivar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: APPLICATIONS CATALOG (Fase 1 y 2) */}
        {activeTab === 'applications' && (
          <ApplicationsManager />
        )}

        {/* TAB 2: PLANS & PRICING CATALOG */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Planes de Suscripción FenixCMS ({plans.length})</span>
                </h2>
                <p className="text-xs text-slate-400">Personaliza los precios mensuales/anuales y los límites de cada nivel de suscripción para el frontend público.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setNewPlanName('');
                    setNewPlanSlug('');
                    setNewPlanAppId('app_classifieds');
                    setNewPlanBadge('Nuevo');
                    setNewPlanPriceMonthly(29);
                    setNewPlanPriceYearly(290);
                    setNewPlanDescription('');
                    setNewPlanCapacityNumber(1000);
                    setNewPlanStorageMb(5000);
                    setNewPlanCustomDomain(true);
                    setNewPlanFeaturesText('Publicación de anuncios ilimitada\nFiltros por ciudad y categoría\nChat interno entre usuarios\nMonetización de anuncios destacados\nDominio personalizado y SSL');
                    setIsNewPlanModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Crear Nuevo Plan desde Cero</span>
                </button>

                <button
                  onClick={() => setIsConfirmResetOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                  title="Restaura los 5 planes originales"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Restaurar Predeterminados</span>
                </button>

                {plans.length > 0 && (
                  <button
                    onClick={() => setIsConfirmClearAllOpen(true)}
                    className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-1.5 border border-rose-800/50 transition"
                    title="Borra todos los planes para empezar desde cero"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Eliminar Todos los Planes</span>
                  </button>
                )}
              </div>
            </div>

            {plans.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                  <Sliders className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Catálogo de Planes Vacío</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Has eliminado todos los planes. Puedes crear un plan nuevo desde cero (ej. Plan de Anuncios / Clasificados, Tienda Online, etc.) o restaurar los planes predeterminados.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setNewPlanName('');
                      setNewPlanSlug('');
                      setNewPlanAppId('app_classifieds');
                      setNewPlanBadge('Nuevo');
                      setNewPlanPriceMonthly(29);
                      setNewPlanPriceYearly(290);
                      setNewPlanDescription('');
                      setNewPlanCapacityNumber(1000);
                      setNewPlanStorageMb(5000);
                      setNewPlanCustomDomain(true);
                      setNewPlanFeaturesText('Publicación de anuncios ilimitada\nFiltros por ciudad y categoría\nChat interno entre usuarios\nMonetización de anuncios destacados\nDominio personalizado y SSL');
                      setIsNewPlanModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Mi Primer Plan</span>
                  </button>
                  <button
                    onClick={() => setIsConfirmResetOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                    <span>Restaurar Planes Predeterminados</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(p => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between relative shadow-lg hover:border-slate-700 transition overflow-hidden">
                    {p.imageUrl && (
                      <div className="-mx-6 -mt-6 mb-2 h-32 w-[calc(100%+3rem)] overflow-hidden bg-slate-950 relative border-b border-slate-800">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      {p.badge ? (
                        <div className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                          {p.badge}
                        </div>
                      ) : (
                        <div className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          {p.applicationId === 'app_classifieds' ? 'Clasificados' : 
                           p.applicationId === 'app_blog' ? 'Editorial' : 
                           p.applicationId === 'app_auctions' ? 'Subastas' :
                           p.applicationId === 'app_hybrid_auctions_blog' ? 'Subastas + Blog' :
                           p.applicationId === 'app_hybrid_ecommerce_blog' ? 'Tienda + Blog' :
                           p.applicationId === 'app_all_in_one' ? 'Todo en Uno' :
                           'Ecommerce'}
                        </div>
                      )}

                      <button
                        onClick={() => handleRequestDeletePlan(p.id, p.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/50 transition"
                        title="Eliminar este plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between mt-1">
                        <h3 className="text-lg font-bold text-white">{p.name}</h3>
                        <div className="text-right">
                          <span className="text-2xl font-black text-amber-400">{p.priceMonthly}€</span>
                          <span className="text-xs text-slate-400">/mes</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                        {p.priceYearly}€ facturados al año
                      </div>

                      <p className="text-xs text-slate-400 mt-2 min-h-[36px]">{p.description}</p>

                      <div className="text-xs text-slate-300 space-y-2 pt-4 border-t border-slate-800 mt-4">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Capacidad Principal:</span>
                          <span className="font-bold text-white" suppressHydrationWarning>
                            {p.maxProducts 
                              ? `${p.maxProducts} productos` 
                              : p.entitlements?.['auctions.lots_max']
                                ? `${p.entitlements['auctions.lots_max']} subastas/lotes`
                                : p.entitlements?.['blog.posts_max'] 
                                  ? `${p.entitlements['blog.posts_max']} artículos`
                                  : p.entitlements?.['classifieds.ads_max']
                                    ? `${p.entitlements['classifieds.ads_max']} anuncios`
                                    : 'Ilimitado'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Almacenamiento:</span>
                          <span className="font-bold text-white" suppressHydrationWarning>{p.maxStorageMb || p.entitlements?.['storage.max_mb'] || 5000} MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Dominio Personalizado:</span>
                          <span className="text-emerald-400 font-semibold">Permitido</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800 space-y-1 mt-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Funciones incluidas:</div>
                        {p.features && p.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                            <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => handleOpenEditPlan(p)}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Modificar Precios y Límites</span>
                      </button>
                      <button
                        onClick={() => handleRequestDeletePlan(p.id, p.name)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 hover:border-rose-800/50 text-slate-400 transition"
                        title="Eliminar este plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MARKETPLACE ADD-ONS A LA VENTA */}
        {activeTab === 'marketplace' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div>
                <h2 className="text-base font-bold text-white">Catálogo de Plugins & Temas para Vender en el Frontend</h2>
                <p className="text-xs text-slate-400">Sube extensiones y temas, define sus precios de compra o suscripción y publícalos para todos los clientes del SaaS.</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex p-1 bg-slate-800 rounded-lg border border-slate-700 text-xs">
                  <button
                    onClick={() => setMarketplaceFilter('all')}
                    className={`px-3 py-1 rounded-md transition ${marketplaceFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
                  >
                    Todos ({marketplaceItems.length})
                  </button>
                  <button
                    onClick={() => setMarketplaceFilter('plugin')}
                    className={`px-3 py-1 rounded-md transition ${marketplaceFilter === 'plugin' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
                  >
                    Plugins
                  </button>
                  <button
                    onClick={() => setMarketplaceFilter('theme')}
                    className={`px-3 py-1 rounded-md transition ${marketplaceFilter === 'theme' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
                  >
                    Temas
                  </button>
                </div>

                <button
                  onClick={handleOpenNewMarketplaceModal}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Poner a la Venta Nuevo Add-on</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMarketplaceItems.map((item) => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition shadow-sm">
                  {/* Top Preview/Banner */}
                  {item.previewImage ? (
                    <div className="h-36 w-full relative bg-slate-800 overflow-hidden">
                      <img src={item.previewImage} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className="px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-white font-bold text-[10px] uppercase border border-slate-700">
                          {item.type === 'theme' ? '🎨 TEMA VISUAL' : '🔌 PLUGIN EXTENSIÓN'}
                        </span>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] uppercase">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-slate-950/90 text-amber-400 font-extrabold text-sm border border-slate-700">
                        {item.price === 0 ? 'GRATIS' : `${item.price}€`}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] uppercase border border-slate-700">
                              {item.category}
                            </span>
                            {item.badge && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-[10px] uppercase">
                                {item.badge}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold text-[10px]">
                              {item.applicationScope === 'app_ecommerce' ? '🛍️ Tienda' :
                               item.applicationScope === 'app_auctions' ? '🔨 Subastas' :
                               item.applicationScope === 'app_hybrid_auctions_blog' ? '🔨 Subastas+Blog' :
                               item.applicationScope === 'app_hybrid_ecommerce_blog' ? '🔥 Tienda+Blog' :
                               item.applicationScope === 'app_blog' ? '📰 Blog' :
                               item.applicationScope === 'app_classifieds' ? '📢 Anuncios' :
                               '🌐 Universal'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-amber-400">
                          {item.price === 0 ? 'GRATIS' : `${item.price}€`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.billingType === 'one_time' ? 'Pago Único' : item.billingType === 'subscription_monthly' ? 'Suscripción/mes' : 'Anual'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Body Info */}
                  <div className="p-4 space-y-2.5 flex-1">
                    <h3 className="font-bold text-white text-sm leading-snug">{item.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{item.shortDescription || item.description}</p>
                    
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                      <span>Versión: <strong className="text-slate-200">{item.version}</strong></span>
                      <span>Ventas: <strong className="text-emerald-400">{item.salesCount}</strong></span>
                      <span className="flex items-center gap-1">
                        {item.isPublished ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Publicado
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Oculto
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditMarketplaceModal(item)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Editar Precio & Datos</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        updateMarketplaceItem(item.id, { isPublished: !item.isPublished });
                        showToast(`Estado de "${item.name}" actualizado.`);
                      }}
                      className={`p-1.5 rounded-lg border text-xs transition ${
                        item.isPublished 
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' 
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                      }`}
                      title={item.isPublished ? 'Pausar venta' : 'Publicar en Frontend'}
                    >
                      {item.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => {
                        deleteMarketplaceItem(item.id);
                        showToast(`🗑️ "${item.name}" eliminado del catálogo.`);
                      }}
                      className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 text-xs transition"
                      title="Eliminar de catálogo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TENANTS DIRECTORY */}
        {activeTab === 'tenants' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{tenant.name}</h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 text-[10px] font-bold uppercase">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{tenant.customDomain} / {tenant.slug}.fenixcms.es</p>
                </div>
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-xs font-semibold">
                  Plan Professional
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] block">PROPIETARIO:</span>
                  <span className="text-white font-medium">{tenant.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">EMAIL:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{tenant.ownerEmail}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">PLUGINS ACTIVOS:</span>
                  <span className="text-emerald-400 font-semibold">{tenant.activePlugins.length} instalados</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">IDIOMA BASE:</span>
                  <span className="text-slate-300 font-semibold uppercase">{tenant.defaultLocale} (6 disponibles)</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCurrentRoute('store_admin')}
                  className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition text-center"
                >
                  Acceder al Backoffice
                </button>
                <button
                  onClick={() => setCurrentRoute('store_front')}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition text-center"
                >
                  Ver Escaparate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS & SECURITY */}
        {activeTab === 'audit' && (
          <AuditLogsViewer />
        )}

        {/* MODAL 1: EDITAR / EXTENDER DURACIÓN DE LICENCIA */}
        {editingLicense && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
              <button
                onClick={() => setEditingLicense(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Licencia & Duración</h3>
                  <p className="text-xs text-slate-400 font-mono">{editingLicense.licenseKey}</p>
                </div>
              </div>

              <form onSubmit={handleSaveLicenseChanges} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Titular y Tienda</label>
                  <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 text-white font-medium">
                    {editingLicense.customerName} ({editingLicense.customerEmail}) — <span className="text-amber-400">{editingLicense.tenantName}</span>
                  </div>
                </div>

                {/* Duration Picker */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Duración / Vigencia de la Licencia</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setEditLicDurationOption('extend_1m')}
                      className={`p-2 rounded-lg border text-center transition ${editLicDurationOption === 'extend_1m' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                    >
                      +1 Mes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditLicDurationOption('extend_3m')}
                      className={`p-2 rounded-lg border text-center transition ${editLicDurationOption === 'extend_3m' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                    >
                      +3 Meses
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditLicDurationOption('extend_1y')}
                      className={`p-2 rounded-lg border text-center transition ${editLicDurationOption === 'extend_1y' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                    >
                      +1 Año
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditLicDurationOption('lifetime')}
                      className={`p-2 rounded-lg border text-center transition ${editLicDurationOption === 'lifetime' ? 'bg-purple-600 text-white font-bold border-purple-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                    >
                      ⚡ Lifetime
                    </button>
                  </div>

                  {editLicDurationOption === 'custom' && (
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Fecha de Expiración Exacta:</label>
                      <input
                        type="date"
                        value={editLicValidTo}
                        onChange={e => setEditLicValidTo(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Importe de Licencia (€)</label>
                    <input
                      type="number"
                      value={editLicPrice}
                      onChange={e => setEditLicPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Periodo de Facturación</label>
                    <select
                      value={editLicBillingPeriod}
                      onChange={e => setEditLicBillingPeriod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="monthly">Mensual</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Estado de la Licencia</label>
                  <select
                    value={editLicStatus}
                    onChange={e => setEditLicStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="active">Activa (Permite operar la tienda)</option>
                    <option value="pending">Pendiente de Aprobación</option>
                    <option value="suspended">Suspendida (Bloqueo por impago/admin)</option>
                    <option value="expired">Expirada (Requiere renovación)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingLicense(null)}
                    className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDITAR PRECIOS Y CONDICIONES DE UN PLAN */}
        {editingPlan && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
              <button
                onClick={() => setEditingPlan(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Plan & Precios de Suscripción</h3>
                  <p className="text-xs text-slate-400">Modifica los importes que verán los clientes en la landing pública.</p>
                </div>
              </div>

              <form onSubmit={handleSavePlanChanges} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre del Plan</label>
                    <input
                      type="text"
                      required
                      value={editPlanName}
                      onChange={e => setEditPlanName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Insignia / Badge</label>
                    <input
                      type="text"
                      placeholder="ej. Más Popular"
                      value={editPlanBadge}
                      onChange={e => setEditPlanBadge(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* IMAGEN DE PORTADA / ICONO DEL PLAN */}
                <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>Imagen de Portada / Banner / Logotipo</span>
                    </label>
                    
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setEditPlanImageMode('file')}
                        className={`px-2 py-1 rounded font-semibold transition ${
                          editPlanImageMode === 'file' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Subir desde PC
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditPlanImageMode('url')}
                        className={`px-2 py-1 rounded font-semibold transition ${
                          editPlanImageMode === 'url' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Enlace URL
                      </button>
                    </div>
                  </div>

                  {editPlanImageMode === 'file' ? (
                    <div>
                      {editPlanImageUrl ? (
                        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={editPlanImageUrl}
                              alt="Vista previa"
                              className="w-16 h-12 object-cover rounded-lg bg-slate-800 border border-slate-700 shadow-sm shrink-0"
                            />
                            <div>
                              <div className="font-bold text-white text-xs">Imagen seleccionada</div>
                              <div className="text-[10px] text-emerald-400">Vista previa lista</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label
                              htmlFor="edit-plan-img-input"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer border border-slate-700 transition"
                            >
                              Cambiar Foto
                            </label>
                            <button
                              type="button"
                              onClick={() => setEditPlanImageUrl('')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Eliminar imagen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingEditPlanImage(true);
                          }}
                          onDragLeave={() => setIsDraggingEditPlanImage(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingEditPlanImage(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleEditPlanImageFileSelected(file);
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 text-center transition cursor-pointer ${
                            isDraggingEditPlanImage
                              ? 'border-amber-400 bg-amber-500/10'
                              : 'border-slate-700 hover:border-amber-500/70 bg-slate-900/60'
                          }`}
                        >
                          <input
                            type="file"
                            id="edit-plan-img-input"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleEditPlanImageFileSelected(file);
                            }}
                            className="hidden"
                          />
                          <label htmlFor="edit-plan-img-input" className="cursor-pointer block space-y-1">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                              <Upload className="w-4 h-4" />
                            </div>
                            <div className="text-xs font-bold text-white">
                              Arrastra una imagen o haz clic para subir desde tu PC
                            </div>
                            <p className="text-[10px] text-slate-400">
                              PNG, JPG, WEBP, SVG
                            </p>
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/banner-plan.jpg"
                        value={editPlanImageUrl}
                        onChange={(e) => setEditPlanImageUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-[11px]"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Precio Mensual (€/mes)</label>
                    <input
                      type="number"
                      required
                      value={editPlanPriceMonthly}
                      onChange={e => setEditPlanPriceMonthly(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Precio Anual (€/año)</label>
                    <input
                      type="number"
                      required
                      value={editPlanPriceYearly}
                      onChange={e => setEditPlanPriceYearly(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Límite de Productos</label>
                    <input
                      type="number"
                      value={editPlanMaxProducts}
                      onChange={e => setEditPlanMaxProducts(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Almacenamiento (MB)</label>
                    <input
                      type="number"
                      value={editPlanMaxStorageMb}
                      onChange={e => setEditPlanMaxStorageMb(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Descripción del Plan</label>
                  <textarea
                    rows={2}
                    value={editPlanDescription}
                    onChange={e => setEditPlanDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
                  >
                    Actualizar Precios en el Frontend
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: PONER EN VENTA / EDITAR ITEM EN EL MARKETPLACE */}
        {isMarketplaceModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-left my-8 max-h-[92vh] overflow-y-auto">
              <button
                onClick={() => setIsMarketplaceModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3 mb-5">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingMarketplaceItem ? 'Editar Add-on del Marketplace' : 'Poner en Venta Nuevo Plugin o Tema'}
                  </h3>
                  <p className="text-xs text-slate-400">Publica paquetes .ZIP e imágenes personalizadas para tu catálogo SaaS.</p>
                </div>
              </div>

              <form onSubmit={handleSaveMarketplaceItem} className="space-y-4 text-xs">
                {/* 1. Type Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">Tipo de Add-on a Comercializar</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMktType('plugin')}
                      className={`p-3 rounded-xl border text-center transition flex items-center justify-center gap-2 ${
                        mktType === 'plugin' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md' : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Plugin / Extensión Funcional</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMktType('theme')}
                      className={`p-3 rounded-xl border text-center transition flex items-center justify-center gap-2 ${
                        mktType === 'theme' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md' : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Tema / Plantilla Visual</span>
                    </button>
                  </div>
                </div>

                {/* 2. ZIP FILE UPLOAD SECTION (DRAG & DROP + PICKER) */}
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <FolderArchive className="w-4 h-4 text-amber-400" />
                      <span>Subir Paquete Comprimido ({mktType === 'plugin' ? 'Plugin .ZIP' : 'Tema .ZIP'})</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Formatos: .ZIP, .TAR.GZ, .JSON</span>
                  </div>

                  {mktUploadedFileName ? (
                    <div className="p-3 bg-slate-900 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <FileArchive className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-white text-xs font-mono truncate">{mktUploadedFileName}</div>
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Paquete adjunto {mktZipFileSize ? `(${mktZipFileSize})` : ''} • Listo para entrega</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label
                          htmlFor="mkt-zip-input"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer border border-slate-700 transition"
                        >
                          Cambiar ZIP
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setMktUploadedFileName('');
                            setMktZipFileSize('');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Eliminar archivo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingZip(true);
                      }}
                      onDragLeave={() => setIsDraggingZip(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingZip(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleZipFileSelected(file);
                      }}
                      className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${
                        isDraggingZip
                          ? 'border-amber-400 bg-amber-500/10'
                          : 'border-slate-700 hover:border-amber-500/70 bg-slate-900/60'
                      }`}
                    >
                      <input
                        type="file"
                        id="mkt-zip-input"
                        accept=".zip,.tar.gz,.json,application/zip,application/x-zip-compressed"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleZipFileSelected(file);
                        }}
                        className="hidden"
                      />
                      <label htmlFor="mkt-zip-input" className="cursor-pointer block space-y-1.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-bold text-white">
                          Arrastra y suelta tu archivo <span className="text-amber-400 font-mono">.ZIP</span> o haz clic para explorar
                        </div>
                        <p className="text-[11px] text-slate-400">
                          El archivo quedará disponible para descarga automática al confirmarse la compra del cliente.
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* 3. IMAGE UPLOAD / THUMBNAIL PREVIEW SECTION */}
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>Imagen de Portada / Vista Previa / Mockup</span>
                    </label>
                    
                    {/* Switch File / URL */}
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setImageInputMode('file')}
                        className={`px-2 py-1 rounded font-semibold transition ${
                          imageInputMode === 'file' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Subir desde PC
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('url')}
                        className={`px-2 py-1 rounded font-semibold transition ${
                          imageInputMode === 'url' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Enlace URL
                      </button>
                    </div>
                  </div>

                  {imageInputMode === 'file' ? (
                    <div>
                      {mktPreviewImage ? (
                        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={mktPreviewImage}
                              alt="Vista previa"
                              className="w-16 h-12 object-cover rounded-lg bg-slate-800 border border-slate-700 shadow-sm shrink-0"
                            />
                            <div>
                              <div className="font-bold text-white text-xs">Imagen seleccionada</div>
                              <div className="text-[10px] text-emerald-400">Vista previa lista y optimizada</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label
                              htmlFor="mkt-img-input"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer border border-slate-700 transition"
                            >
                              Cambiar Foto
                            </label>
                            <button
                              type="button"
                              onClick={() => setMktPreviewImage('')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Eliminar imagen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingImage(true);
                          }}
                          onDragLeave={() => setIsDraggingImage(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingImage(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleImageFileSelected(file);
                          }}
                          className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${
                            isDraggingImage
                              ? 'border-emerald-400 bg-emerald-500/10'
                              : 'border-slate-700 hover:border-emerald-500/70 bg-slate-900/60'
                          }`}
                        >
                          <input
                            type="file"
                            id="mkt-img-input"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageFileSelected(file);
                            }}
                            className="hidden"
                          />
                          <label htmlFor="mkt-img-input" className="cursor-pointer block space-y-1.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                            <div className="text-xs font-bold text-white">
                              Haz clic para subir una captura/mockup o arrastra tu imagen aquí
                            </div>
                            <p className="text-[11px] text-slate-400">
                              PNG, JPG, WebP o SVG recomendados (Ratio sugerido 16:9 o 4:3)
                            </p>
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={mktPreviewImage}
                          onChange={e => setMktPreviewImage(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      {mktPreviewImage && (
                        <div className="flex items-center gap-3 p-2 bg-slate-900 rounded-lg border border-slate-800">
                          <img
                            src={mktPreviewImage}
                            alt="Previsualización"
                            className="w-14 h-10 object-cover rounded bg-slate-800 border border-slate-700"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="text-[10px] text-slate-400">Previsualización de enlace externo cargada</span>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    type="file"
                    id="mkt-img-input"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFileSelected(file);
                    }}
                    className="hidden"
                  />
                </div>

                {/* 4. Basic Details (Name & Category) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Comercial del Add-on</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Redsys + Bizum TPV Pro"
                      value={mktName}
                      onChange={e => setMktName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Categoría</label>
                    <select
                      value={mktCategory}
                      onChange={e => setMktCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="payment">Pasarelas de Pago</option>
                      <option value="shipping">Logística y Envíos</option>
                      <option value="marketing">Marketing & WhatsApp</option>
                      <option value="ai">Inteligencia Artificial</option>
                      <option value="seo">SEO & Tráfico</option>
                      <option value="theme">Tema Visual</option>
                      <option value="tools">Herramientas Avanzadas</option>
                    </select>
                  </div>
                </div>

                {/* 4.1 Target License / Application Scope */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <label className="block text-[11px] font-semibold text-amber-400 mb-1 flex items-center justify-between">
                    <span>🎯 Exclusividad por Tipo de Licencia / Negocio</span>
                    <span className="text-[10px] text-slate-400 font-normal">Define qué clientes pueden instalar este plugin</span>
                  </label>
                  <select
                    value={mktApplicationScope}
                    onChange={e => setMktApplicationScope(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-semibold text-xs"
                  >
                    <option value="ALL">🌐 Universal: Disponible para Todas las Licencias</option>
                    <option value="app_ecommerce">🛍️ Exclusivo para Licencias de Tienda Online (Ecommerce)</option>
                    <option value="app_auctions">🔨 Exclusivo para Licencias de Subastas Online (eBay)</option>
                    <option value="app_hybrid_auctions_blog">🔨📰 Exclusivo para Licencias Subastas + Blog</option>
                    <option value="app_hybrid_ecommerce_blog">🔥 Exclusivo para Licencias Tienda + Blog</option>
                    <option value="app_blog">📰 Exclusivo para Licencias de Blog & Revistas</option>
                    <option value="app_classifieds">📢 Exclusivo para Licencias de Portal de Anuncios</option>
                    <option value="app_all_in_one">👑 Exclusivo para Licencias Todo en Uno (Enterprise)</option>
                  </select>
                </div>

                {/* 5. Price and Billing Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Precio de Venta (€)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={mktPrice}
                      onChange={e => setMktPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-sm text-amber-400"
                    />
                    <span className="text-[10px] text-slate-500">Pon 0 para ofrecerlo como add-on gratuito.</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Modelo de Cobro</label>
                    <select
                      value={mktBillingType}
                      onChange={e => setMktBillingType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="one_time">Pago Único (Compra de por vida)</option>
                      <option value="subscription_monthly">Suscripción Mensual (€/mes)</option>
                      <option value="subscription_yearly">Suscripción Anual (€/año)</option>
                      <option value="free">Gratuito / Incluido</option>
                    </select>
                  </div>
                </div>

                {/* 6. Short Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Descripción Breve (para la tarjeta de tienda)</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Pasarela oficial de pago bancario español con Bizum y tarjeta de crédito."
                    value={mktShortDescription}
                    onChange={e => setMktShortDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                {/* 7. Version & Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Versión del Paquete</label>
                    <input
                      type="text"
                      value={mktVersion}
                      onChange={e => setMktVersion(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Insignia Destacada</label>
                    <input
                      type="text"
                      placeholder="ej. Top Ventas, Oficial, Nuevo"
                      value={mktBadge}
                      onChange={e => setMktBadge(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* 8. Published toggle */}
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Publicar Inmediatamente en la Tienda</div>
                    <div className="text-[10px] text-slate-400">Si está marcado, los usuarios podrán verlo y comprarlo desde su panel.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={mktIsPublished}
                    onChange={e => setMktIsPublished(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsMarketplaceModalOpen(false)}
                    className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow"
                  >
                    {editingMarketplaceItem ? 'Guardar Cambios' : 'Poner a la Venta en FenixCMS'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: EMITIR NUEVA LICENCIA */}
        {isNewLicenseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
              <button
                onClick={() => setIsNewLicenseModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Generar & Emitir Nueva Licencia</h3>
                  <p className="text-xs text-slate-400">Crea una clave de licencia con duración y condiciones personalizadas.</p>
                </div>
              </div>

              <form onSubmit={handleCreateNewLicenseSubmit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre del Cliente</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Carlos Mendoza"
                      value={newLicCustomerName}
                      onChange={e => setNewLicCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email del Cliente</label>
                    <input
                      type="email"
                      required
                      placeholder="carlos@empresa.com"
                      value={newLicCustomerEmail}
                      onChange={e => setNewLicCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre de la Tienda</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Moda Elegante"
                      value={newLicStoreName}
                      onChange={e => {
                        setNewLicStoreName(e.target.value);
                        setNewLicStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Subdominio / Slug</label>
                    <input
                      type="text"
                      required
                      value={newLicStoreSlug}
                      onChange={e => setNewLicStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* IMAGEN / LOGOTIPO DE LA LICENCIA (SUBIR DESDE PC O ENLACE) */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>Logotipo / Imagen de la Tienda o Negocio (Opcional)</span>
                    </label>
                    
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setNewLicImageMode('file')}
                        className={`px-2 py-0.5 rounded font-semibold transition ${
                          newLicImageMode === 'file' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Subir desde PC
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewLicImageMode('url')}
                        className={`px-2 py-0.5 rounded font-semibold transition ${
                          newLicImageMode === 'url' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Enlace URL
                      </button>
                    </div>
                  </div>

                  {newLicImageMode === 'file' ? (
                    <div>
                      {newLicLogoUrl ? (
                        <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={newLicLogoUrl}
                              alt="Logo tienda"
                              className="w-12 h-10 object-cover rounded-lg bg-slate-800 border border-slate-700 shadow-sm shrink-0"
                            />
                            <div>
                              <div className="font-bold text-white text-xs">Imagen adjuntada</div>
                              <div className="text-[10px] text-emerald-400">Listo para vincular al tenant</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label
                              htmlFor="new-lic-logo-input"
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold cursor-pointer border border-slate-700 transition"
                            >
                              Cambiar
                            </label>
                            <button
                              type="button"
                              onClick={() => setNewLicLogoUrl('')}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Eliminar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingLicImage(true);
                          }}
                          onDragLeave={() => setIsDraggingLicImage(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingLicImage(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleLicLogoFileSelected(file);
                          }}
                          className={`border-2 border-dashed rounded-xl p-3 text-center transition cursor-pointer ${
                            isDraggingLicImage
                              ? 'border-amber-400 bg-amber-500/10'
                              : 'border-slate-700 hover:border-amber-500/70 bg-slate-900/60'
                          }`}
                        >
                          <input
                            type="file"
                            id="new-lic-logo-input"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLicLogoFileSelected(file);
                            }}
                            className="hidden"
                          />
                          <label htmlFor="new-lic-logo-input" className="cursor-pointer block space-y-1">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                              <Upload className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-[11px] font-bold text-white">
                              Arrastra el logo o haz clic para subir desde tu PC
                            </div>
                            <p className="text-[10px] text-slate-400">
                              PNG, JPG, SVG
                            </p>
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/logo-tienda.png"
                        value={newLicLogoUrl}
                        onChange={(e) => setNewLicLogoUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-[11px]"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Plan de Suscripción</label>
                    <select
                      value={newLicPlanId}
                      onChange={e => {
                        setNewLicPlanId(e.target.value);
                        const pl = plans.find(p => p.id === e.target.value);
                        if (pl) setNewLicCustomPrice(pl.priceYearly);
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.priceMonthly}€/m - {p.priceYearly}€/año)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Duración Asignada</label>
                    <select
                      value={newLicDuration}
                      onChange={e => setNewLicDuration(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="1_month">1 Mes</option>
                      <option value="3_months">3 Meses</option>
                      <option value="6_months">6 Meses</option>
                      <option value="1_year">1 Año Completo</option>
                      <option value="lifetime">⚡ Licencia Vitalicia (Lifetime)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Precio Cobrado (€)</label>
                    <input
                      type="number"
                      value={newLicCustomPrice}
                      onChange={e => setNewLicCustomPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Método de Cobro</label>
                    <select
                      value={newLicPaymentProvider}
                      onChange={e => setNewLicPaymentProvider(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="paypal">PayPal</option>
                      <option value="stripe">Stripe / Tarjeta</option>
                      <option value="manual">Transferencia / Factura Manual</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewLicenseModalOpen(false)}
                    className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
                  >
                    Emitir Clave de Licencia
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5: CREAR NUEVO PLAN DE SUSCRIPCIÓN DESDE CERO */}
        {isNewPlanModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-left my-8 max-h-[92vh] overflow-y-auto">
              <button
                onClick={() => setIsNewPlanModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3 mb-5">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Crear Nuevo Plan de Suscripción</h3>
                  <p className="text-xs text-slate-400">Configura un plan comercial desde cero para publicarlo en la web comercial.</p>
                </div>
              </div>

              <form onSubmit={handleCreateNewPlan} className="space-y-4 text-xs">
                {/* 1. Tipo de Negocio / Aplicación */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tipo de Negocio / Aplicación</label>
                  <select
                    value={newPlanAppId}
                    onChange={e => {
                      setNewPlanAppId(e.target.value);
                      if (e.target.value === 'app_classifieds') {
                        if (!newPlanName) setNewPlanName('Portal Clasificados Pro');
                        setNewPlanFeaturesText('Publicación de anuncios con fotos\nFiltros por provincia y ciudad\nChat y mensajería comprador-vendedor\nMonetización con destacados y banners\nDominio personalizado y SSL');
                      } else if (e.target.value === 'app_blog') {
                        if (!newPlanName) setNewPlanName('Blog & Media Pro');
                        setNewPlanFeaturesText('Entradas ilimitadas y categorías\nGestión de múltiples autores\nOptimización SEO avanzada\nModeración de comentarios con anti-spam\nDominio personalizado y SSL');
                      } else if (e.target.value === 'app_hybrid_auctions_blog') {
                        if (!newPlanName) setNewPlanName('Portal de Subastas + Blog Pro');
                        setNewPlanFeaturesText('Subastas con cuenta atrás en vivo y pujas incrementales\nBotón «¡Cómpralo Ya!» y precio de reserva oculto\nBlog editorial para guías de coleccionismo y novedades\nComisión automática de ventas y pasarelas (Stripe/PayPal/Bizum)\nAlertas de sobrepuja y adjudicación en tiempo real');
                      } else if (e.target.value === 'app_auctions') {
                        if (!newPlanName) setNewPlanName('Portal de Subastas Pro');
                        setNewPlanFeaturesText('Subastas con cuenta atrás en vivo y pujas incrementales\nBotón «¡Cómpralo Ya!» y precio de reserva oculto\nComisión sobre venta final automática\nGalería multimedia HD con zoom\nDominio personalizado y SSL');
                      } else if (e.target.value === 'app_hybrid_ecommerce_blog') {
                        if (!newPlanName) setNewPlanName('Tienda Online + Blog Pro');
                        setNewPlanFeaturesText('Tienda Online completa con pasarelas de pago\nBlog editorial integrado para marketing de contenidos\nCatálogo de productos y variantes ilimitadas\nOptimización SEO para posicionar en Google\nInstalación de plugins y temas');
                      } else if (e.target.value === 'app_all_in_one') {
                        if (!newPlanName) setNewPlanName('Suite Todo en Uno (All-in-One)');
                        setNewPlanFeaturesText('Tienda Online + Blog + Portal de Clasificados + Reservas\nAcceso a todos los plugins oficiales\nSoporte multitienda y multidominio\nHerramientas de IA Gemini integradas\nSoporte prioritario 24/7');
                      } else {
                        if (!newPlanName) setNewPlanName('Tienda Online Pro');
                        setNewPlanFeaturesText('Catálogo completo de productos y variantes\nPasarelas Stripe, PayPal y Bizum\nGestión de envíos y stock\nInstalación de plugins y temas\nDominio personalizado y SSL');
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                  >
                    <option value="app_hybrid_auctions_blog">🔨📰 Híbrido: Portal de Subastas + Blog Integrado</option>
                    <option value="app_hybrid_ecommerce_blog">🔥 Híbrido: Tienda Online + Blog Integrado</option>
                    <option value="app_all_in_one">👑 Suite Todo en Uno (Tienda + Blog + Clasificados + Citas)</option>
                    <option value="app_auctions">🔨 Portal de Subastas Online (tipo eBay)</option>
                    <option value="app_ecommerce">🛍️ Tienda Online / Ecommerce</option>
                    <option value="app_blog">📰 Blog, Periódico & Revista Digital</option>
                    <option value="app_classifieds">📢 Portal de Clasificados / Anuncios (tipo Milanuncios)</option>
                    <option value="app_booking">📅 Sistema de Reservas & Citas</option>
                    <option value="app_real_estate">🏠 Portal Inmobiliario</option>
                  </select>
                </div>

                {/* 2. Nombre e Insignia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Comercial del Plan</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Plan Anuncios Starter"
                      value={newPlanName}
                      onChange={e => {
                        setNewPlanName(e.target.value);
                        if (!newPlanSlug) setNewPlanSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Insignia / Badge (Opcional)</label>
                    <input
                      type="text"
                      placeholder="ej. Más Popular, Recomendado"
                      value={newPlanBadge}
                      onChange={e => setNewPlanBadge(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* 2.1 IMAGEN DE PORTADA / ICONO DEL PLAN (SUBIR DESDE PC O ENLACE) */}
                <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>Imagen de Portada / Banner / Logotipo del Plan (Opcional)</span>
                    </label>
                    
                    {/* Switch File / URL */}
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setNewPlanImageMode('file')}
                        className={`px-2 py-1 rounded font-semibold transition ${
                          newPlanImageMode === 'file' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Subir desde PC
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPlanImageMode('url')}
                        className={`px-2 py-1 rounded font-semibold transition ${
                          newPlanImageMode === 'url' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Enlace URL
                      </button>
                    </div>
                  </div>

                  {newPlanImageMode === 'file' ? (
                    <div>
                      {newPlanImageUrl ? (
                        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={newPlanImageUrl}
                              alt="Vista previa"
                              className="w-16 h-12 object-cover rounded-lg bg-slate-800 border border-slate-700 shadow-sm shrink-0"
                            />
                            <div>
                              <div className="font-bold text-white text-xs">Imagen seleccionada desde tu ordenador</div>
                              <div className="text-[10px] text-emerald-400">Vista previa cargada con éxito</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label
                              htmlFor="new-plan-img-input"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer border border-slate-700 transition"
                            >
                              Cambiar Foto
                            </label>
                            <button
                              type="button"
                              onClick={() => setNewPlanImageUrl('')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Eliminar imagen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingPlanImage(true);
                          }}
                          onDragLeave={() => setIsDraggingPlanImage(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingPlanImage(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handlePlanImageFileSelected(file);
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 text-center transition cursor-pointer ${
                            isDraggingPlanImage
                              ? 'border-amber-400 bg-amber-500/10'
                              : 'border-slate-700 hover:border-amber-500/70 bg-slate-900/60'
                          }`}
                        >
                          <input
                            type="file"
                            id="new-plan-img-input"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePlanImageFileSelected(file);
                            }}
                            className="hidden"
                          />
                          <label htmlFor="new-plan-img-input" className="cursor-pointer block space-y-1">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                              <Upload className="w-4 h-4" />
                            </div>
                            <div className="text-xs font-bold text-white">
                              Arrastra una imagen o haz clic para subir desde tu PC
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Formatos admitidos: PNG, JPG, WEBP, SVG
                            </p>
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/banner-plan.jpg"
                        value={newPlanImageUrl}
                        onChange={(e) => setNewPlanImageUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-[11px]"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Precios Mensual y Anual */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Precio Mensual (€/mes)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newPlanPriceMonthly}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setNewPlanPriceMonthly(val);
                        setNewPlanPriceYearly(val * 10); // Sugerir 2 meses gratis al año
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Precio Anual (€/año)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newPlanPriceYearly}
                      onChange={e => setNewPlanPriceYearly(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-emerald-400"
                    />
                  </div>
                </div>

                {/* 4. Límites y Capacidades */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {newPlanAppId === 'app_classifieds' ? 'Límite de Anuncios' : newPlanAppId === 'app_blog' ? 'Límite de Artículos' : 'Límite de Productos'}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newPlanCapacityNumber}
                      onChange={e => setNewPlanCapacityNumber(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Almacenamiento (MB)</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={newPlanStorageMb}
                      onChange={e => setNewPlanStorageMb(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* 5. Descripción */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Descripción Breve</label>
                  <textarea
                    rows={2}
                    placeholder="ej. Plataforma de clasificados con monetización integrada para particulares y profesionales."
                    value={newPlanDescription}
                    onChange={e => setNewPlanDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                {/* 6. Lista de Funciones Incluidas (1 por línea) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Funciones Incluidas <span className="text-slate-500 font-normal">(Escribe una función por línea)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={newPlanFeaturesText}
                    onChange={e => setNewPlanFeaturesText(e.target.value)}
                    placeholder="Publicación de anuncios con fotos&#10;Filtros por ciudad y distancia&#10;Chat entre compradores y vendedores"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-[11px]"
                  />
                </div>

                {/* 7. Opciones adicionales */}
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white text-[11px]">Permitir Dominio Personalizado</div>
                    <div className="text-[10px] text-slate-400">El cliente podrá conectar su propio .com o .es</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newPlanCustomDomain}
                    onChange={e => setNewPlanCustomDomain(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewPlanModalOpen(false)}
                    className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
                  >
                    Guardar y Publicar Plan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 6: CONFIRMAR ELIMINACIÓN DE UN PLAN */}
        {planToDelete && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                <Trash2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">¿Eliminar este Plan Comercial?</h3>
                <p className="text-xs text-slate-300 font-medium">
                  Vas a eliminar <strong className="text-rose-400 font-bold">&quot;{planToDelete.name}&quot;</strong>.
                </p>
                <p className="text-[11px] text-slate-400">
                  Este plan desaparecerá inmediatamente de la web pública y ya no estará disponible para nuevas suscripciones.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setPlanToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeletePlan}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sí, Eliminar Plan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 7: CONFIRMAR ELIMINACIÓN DE TODOS LOS PLANES */}
        {isConfirmClearAllOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                <Trash2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">¿Eliminar TODOS los Planes?</h3>
                <p className="text-xs text-slate-300">
                  Se borrarán los <strong className="text-amber-400">{plans.length} planes</strong> actuales del catálogo.
                </p>
                <p className="text-[11px] text-slate-400">
                  El catálogo quedará en blanco para que puedas crear únicamente los planes que tú decidas desde cero.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsConfirmClearAllOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmClearAllPlans}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sí, Vaciar Todo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 8: CONFIRMAR RESTAURAR PLANES PREDETERMINADOS */}
        {isConfirmResetOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                <RefreshCw className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">¿Restaurar Planes Predeterminados?</h3>
                <p className="text-xs text-slate-300">
                  Se restablecerán los 5 planes oficiales de FenixCMS (Starter Merchant, Professional Store, Enterprise Network, Blog Creator y Portal Clasificados Pro).
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsConfirmResetOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmResetDefaultPlans}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sí, Restaurar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FLOATING TOAST NOTIFICATION */}
        {toastNotification && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-amber-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <span className="text-xs font-semibold">{toastNotification}</span>
            <button
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
