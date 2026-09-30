'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { getTranslation, getProductTitle } from '@/lib/i18n';
import { 
  X, 
  Check, 
  CreditCard, 
  Truck, 
  ShieldCheck, 
  Building2, 
  Banknote, 
  ArrowRight
} from 'lucide-react';

function generateTrackingNumber(suffix: number): string {
  return `PQ4809283740${(suffix % 1000).toString().padStart(3, '0')}`;
}

export function StorefrontCheckout({ onClose }: { onClose: () => void }) {
  const { cart, tenant, createOrder, clearCart, setCurrentRoute, currentLocale } = useStore();

  const [customerName, setCustomerName] = useState('Laura Gómez');
  const [customerEmail, setCustomerEmail] = useState('laura.gomez@gmail.com');
  const [customerPhone, setCustomerPhone] = useState('+34 611 223 344');
  const [address, setAddress] = useState('Avenida Diagonal 240, 4º B');
  const [city, setCity] = useState('Barcelona');
  const [postalCode, setPostalCode] = useState('08018');
  const [country, setCountry] = useState(
    currentLocale === 'it' ? 'Italia' :
    currentLocale === 'en' ? 'United Kingdom' :
    currentLocale === 'fr' ? 'France' :
    currentLocale === 'de' ? 'Deutschland' :
    currentLocale === 'pt' ? 'Portugal' : 'España'
  );

  // Shipping & Payment selections
  const [shippingMethod, setShippingMethod] = useState<'correos_express' | 'correos_standard'>('correos_express');
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stripe' | 'bank_transfer' | 'cash_on_delivery'>('paypal');

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [completedTracking, setCompletedTracking] = useState<string | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const isFreeShipping = subtotal >= tenant.settings.freeShippingThreshold;
  const shippingCost = isFreeShipping ? 0 : (shippingMethod === 'correos_express' ? 3.99 : 2.49);
  const codFee = paymentMethod === 'cash_on_delivery' ? 3.00 : 0.00;
  const total = subtotal + shippingCost + codFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      await new Promise(r => setTimeout(r, 1200));

      const trackingNumber = generateTrackingNumber(cart.length + Math.floor(subtotal));

      const order = await createOrder({
        tenantId: tenant.id,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: {
          address,
          city,
          state: city,
          postalCode,
          country
        },
        items: cart.map(i => ({
          productId: i.product.id,
          title: getProductTitle(i.product, currentLocale),
          price: i.product.price,
          quantity: i.quantity,
          image: i.product.images[0],
          sku: i.product.sku
        })),
        subtotal,
        shippingCost,
        tax: Math.round(subtotal * 0.21 * 100) / 100,
        total,
        paymentMethod,
        paymentStatus: paymentMethod === 'cash_on_delivery' || paymentMethod === 'bank_transfer' ? 'pending' : 'paid',
        fulfillmentStatus: 'processing',
        carrier: shippingMethod === 'correos_express' ? 'Correos Express 24h' : 'Correos Paq Estándar',
        trackingNumber
      });

      setCompletedOrderNumber(order.orderNumber);
      setCompletedTracking(trackingNumber);
      clearCart();
    } catch (err) {
      console.error(err);
      alert('Hubo un error al procesar el pedido.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans text-slate-900">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-left my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1.5 rounded-full bg-slate-100 transition hover:bg-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {!completedOrderNumber ? (
          <form onSubmit={handlePlaceOrder} className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>{getTranslation(currentLocale, 'checkout.title')}</span>
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </h2>
              <p className="text-xs text-slate-500">
                {tenant.name} ({tenant.customDomain || 'tutienda.com'})
              </p>
            </div>

            {/* 1. Address Form */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {getTranslation(currentLocale, 'checkout.step1')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {getTranslation(currentLocale, 'checkout.full_name')}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {getTranslation(currentLocale, 'checkout.email')}
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {getTranslation(currentLocale, 'checkout.address')}
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {getTranslation(currentLocale, 'checkout.phone')}
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {getTranslation(currentLocale, 'checkout.city')}
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {getTranslation(currentLocale, 'checkout.postal_code')}
                  </label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={e => setPostalCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {getTranslation(currentLocale, 'checkout.country')}
                  </label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Shipping with Correos Express Plugin */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-500" />
                <span>{getTranslation(currentLocale, 'checkout.step2')}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                  shippingMethod === 'correos_express' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingMethod === 'correos_express'}
                      onChange={() => setShippingMethod('correos_express')}
                      className="mt-0.5 text-amber-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Correos Express 24h</div>
                      <div className="text-[11px] text-slate-500">
                        {currentLocale === 'it' ? 'Consegna garantita giorno successivo con tracking' :
                         currentLocale === 'en' ? 'Guaranteed next-day delivery with real-time tracking' :
                         currentLocale === 'fr' ? 'Livraison garantie 24h avec suivi en direct' :
                         currentLocale === 'de' ? 'Garantierte 24h-Zustellung mit Sendungsverfolgung' :
                         currentLocale === 'pt' ? 'Entrega garantida no dia seguinte com rastreio' :
                         'Entrega garantizada día siguiente con tracking'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-900">
                    {isFreeShipping ? getTranslation(currentLocale, 'checkout.free_shipping_val') : '3,99€'}
                  </span>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                  shippingMethod === 'correos_standard' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingMethod === 'correos_standard'}
                      onChange={() => setShippingMethod('correos_standard')}
                      className="mt-0.5 text-amber-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Correos Paq Estándar</div>
                      <div className="text-[11px] text-slate-500">
                        {currentLocale === 'it' ? '48-72 ore standard' :
                         currentLocale === 'en' ? '48-72 hours standard' :
                         currentLocale === 'fr' ? '48-72h standard' :
                         currentLocale === 'de' ? '48-72 Stunden Standard' :
                         currentLocale === 'pt' ? '48-72 horas padrão' :
                         '48-72 horas península'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-900">
                    {isFreeShipping ? getTranslation(currentLocale, 'checkout.free_shipping_val') : '2,49€'}
                  </span>
                </label>
              </div>
            </div>

            {/* 3. Payment Gateways Plugins Selection */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span>{getTranslation(currentLocale, 'checkout.step3')}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* PayPal */}
                <label className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  paymentMethod === 'paypal' ? 'border-[#0070BA] bg-[#0070BA]/5' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'paypal'}
                      onChange={() => setPaymentMethod('paypal')}
                      className="text-[#0070BA]"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                        <span className="font-extrabold italic text-[#0079C1]">Pay</span>
                        <span className="font-extrabold italic text-[#00457C]">Pal</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {currentLocale === 'it' ? 'Account o Carta in 1 clic' :
                         currentLocale === 'en' ? 'Account or Card in 1 click' :
                         currentLocale === 'fr' ? 'Compte ou Carte en 1 clic' :
                         currentLocale === 'de' ? 'Konto oder Karte mit 1-Klick' :
                         currentLocale === 'pt' ? 'Conta ou Cartão num clique' :
                         'Cuenta o Tarjeta en 1 clic'}
                      </div>
                    </div>
                  </div>
                </label>

                {/* Stripe */}
                <label className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  paymentMethod === 'stripe' ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'stripe'}
                      onChange={() => setPaymentMethod('stripe')}
                      className="text-purple-600"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Tarjeta Bancaria / Stripe</div>
                      <div className="text-[10px] text-slate-500">Visa, Mastercard, Apple Pay</div>
                    </div>
                  </div>
                </label>

                {/* Bank Wire */}
                <label className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  paymentMethod === 'bank_transfer' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {currentLocale === 'it' ? 'Bonifico Bancario' :
                           currentLocale === 'en' ? 'Bank Wire Transfer' :
                           currentLocale === 'fr' ? 'Virement Bancaire' :
                           currentLocale === 'de' ? 'Banküberweisung' :
                           currentLocale === 'pt' ? 'Transferência Bancária' :
                           'Transferencia Bancaria'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">IBAN</div>
                    </div>
                  </div>
                </label>

                {/* Cash on Delivery (COD) */}
                <label className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  paymentMethod === 'cash_on_delivery' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'cash_on_delivery'}
                      onChange={() => setPaymentMethod('cash_on_delivery')}
                      className="text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {currentLocale === 'it' ? 'Contrassegno (+3€)' :
                           currentLocale === 'en' ? 'Cash on Delivery (+3€)' :
                           currentLocale === 'fr' ? 'Contre-remboursement (+3€)' :
                           currentLocale === 'de' ? 'Nachnahme (+3€)' :
                           currentLocale === 'pt' ? 'Contra-reembolso (+3€)' :
                           'Contrarrembolso (+3€)'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {currentLocale === 'it' ? 'Paga al corriere alla consegna' :
                         currentLocale === 'en' ? 'Pay delivery courier in cash' :
                         currentLocale === 'fr' ? 'Payez au livreur à réception' :
                         currentLocale === 'de' ? 'Barzahlung beim Boten' :
                         currentLocale === 'pt' ? 'Pague ao estafeta na entrega' :
                         'Paga al repartidor de Correos'}
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Instructions preview for Bank Transfer */}
              {paymentMethod === 'bank_transfer' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-blue-900">
                    {currentLocale === 'it' ? 'Coordinate bancarie per il bonifico:' :
                     currentLocale === 'en' ? 'Bank wire details:' :
                     currentLocale === 'fr' ? 'Coordonnées bancaires pour le virement :' :
                     currentLocale === 'de' ? 'Bankverbindung für Überweisung:' :
                     currentLocale === 'pt' ? 'Dados bancários para a transferência:' :
                     'Datos bancarios para la transferencia:'}
                  </div>
                  <div className="text-slate-700 font-mono text-[11px]">IBAN: ES91 2100 0418 4502 0005 1332</div>
                  <div className="text-slate-600 text-[10px]">Beneficiario: {tenant.name} SL</div>
                </div>
              )}
            </div>

            {/* Order Totals Summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{getTranslation(currentLocale, 'checkout.subtotal_label')}</span>
                <span className="font-bold text-slate-900">{subtotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{getTranslation(currentLocale, 'checkout.shipping_label')}</span>
                <span className="font-semibold text-slate-900">
                  {shippingCost === 0 ? getTranslation(currentLocale, 'checkout.free_shipping_val') : `${shippingCost.toFixed(2)}€`}
                </span>
              </div>
              {codFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>{getTranslation(currentLocale, 'checkout.cod_fee_label')}</span>
                  <span className="font-semibold text-slate-900">{codFee.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>{getTranslation(currentLocale, 'checkout.tax_label')}</span>
                <span className="text-slate-500">{(subtotal * 0.21).toFixed(2)}€</span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between items-baseline text-sm">
                <span className="font-bold text-slate-900">{getTranslation(currentLocale, 'checkout.total_label')}</span>
                <span className="text-xl font-black text-amber-600">{total.toFixed(2)}€</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 rounded-full bg-[#ffd814] hover:bg-[#f7ca00] text-slate-950 font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>{getTranslation(currentLocale, 'checkout.processing_btn')}</span>
                </>
              ) : (
                <span>{getTranslation(currentLocale, 'checkout.place_order_btn')} ({total.toFixed(2)}€)</span>
              )}
            </button>
          </form>
        ) : (
          /* Order Confirmation View */
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
              <Check className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-slate-900">
              {getTranslation(currentLocale, 'checkout.success_title')}
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              {tenant.name} • {customerEmail}
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">{getTranslation(currentLocale, 'checkout.order_number')}</span>
                <span className="font-bold text-slate-900 select-all">{completedOrderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">MÉTODO:</span>
                <span className="font-bold text-blue-700 uppercase">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{getTranslation(currentLocale, 'checkout.tracking_number')}</span>
                <span className="font-bold text-emerald-700 select-all">{completedTracking}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{getTranslation(currentLocale, 'checkout.total_label')}</span>
                <span className="font-bold text-amber-600">{total.toFixed(2)}€</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => {
                  onClose();
                  setCurrentRoute('store_front');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#ffd814] hover:bg-[#f7ca00] text-slate-950 font-bold text-xs transition"
              >
                {getTranslation(currentLocale, 'checkout.continue_shopping')}
              </button>
              <button
                onClick={() => {
                  onClose();
                  setCurrentRoute('store_admin');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Backoffice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
