-- Incremental migration: Add idempotencyKey, currency, notes to Order, and sku to OrderItem
-- Ensure non-destructive schema update for FenixCMS Storefront Secure Checkout

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "Order" ALTER COLUMN "fulfillmentStatus" SET DEFAULT 'unfulfilled';
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Order_idempotencyKey_idx" ON "Order"("idempotencyKey");

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "sku" TEXT;
