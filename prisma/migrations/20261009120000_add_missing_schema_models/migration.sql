-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CMSMenu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'header',
    "items" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CMSMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "author" TEXT NOT NULL DEFAULT 'Fenix Ecosystem',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "icon" TEXT,
    "bannerUrl" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "manifest" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYPAL',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "applicationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "amountExpected" DECIMAL(12,2) NOT NULL,
    "currencyExpected" TEXT NOT NULL DEFAULT 'EUR',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL,
    "billingAddress" JSONB,
    "paypalOrderId" TEXT,
    "paypalCaptureId" TEXT,
    "paymentId" TEXT,
    "tenantId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductReview_tenantId_idx" ON "ProductReview"("tenantId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_idx" ON "ProductReview"("productId");

-- CreateIndex
CREATE INDEX "ProductReview_status_idx" ON "ProductReview"("status");

-- CreateIndex
CREATE INDEX "CMSMenu_tenantId_idx" ON "CMSMenu"("tenantId");

-- CreateIndex
CREATE INDEX "CMSMenu_location_idx" ON "CMSMenu"("location");

-- CreateIndex
CREATE UNIQUE INDEX "CMSMenu_tenantId_slug_key" ON "CMSMenu"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceItem_key_key" ON "MarketplaceItem"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceItem_slug_key" ON "MarketplaceItem"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceItem_type_idx" ON "MarketplaceItem"("type");

-- CreateIndex
CREATE INDEX "MarketplaceItem_category_idx" ON "MarketplaceItem"("category");

-- CreateIndex
CREATE INDEX "MarketplaceItem_isFeatured_idx" ON "MarketplaceItem"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_paypalOrderId_key" ON "CheckoutSession"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_paypalCaptureId_key" ON "CheckoutSession"("paypalCaptureId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_paymentId_key" ON "CheckoutSession"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_tenantId_key" ON "CheckoutSession"("tenantId");

-- CreateIndex
CREATE INDEX "CheckoutSession_status_idx" ON "CheckoutSession"("status");

-- CreateIndex
CREATE INDEX "CheckoutSession_expiresAt_idx" ON "CheckoutSession"("expiresAt");

-- CreateIndex
CREATE INDEX "CheckoutSession_customerEmail_idx" ON "CheckoutSession"("customerEmail");

-- CreateIndex
CREATE INDEX "CheckoutSession_applicationId_planId_idx" ON "CheckoutSession"("applicationId", "planId");

-- CreateIndex
CREATE INDEX "CheckoutSession_tenantSlug_idx" ON "CheckoutSession"("tenantSlug");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- CreateIndex
CREATE INDEX "PlatformSetting_key_idx" ON "PlatformSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserActivationToken_tokenHash_key" ON "UserActivationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "UserActivationToken_userId_idx" ON "UserActivationToken"("userId");

-- CreateIndex
CREATE INDEX "UserActivationToken_tokenHash_idx" ON "UserActivationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "UserActivationToken_expiresAt_idx" ON "UserActivationToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CMSMenu" ADD CONSTRAINT "CMSMenu_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivationToken" ADD CONSTRAINT "UserActivationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
