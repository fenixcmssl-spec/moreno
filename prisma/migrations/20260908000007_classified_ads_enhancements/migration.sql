-- AlterEnum
ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'SOLD';

-- AlterTable
ALTER TABLE "ClassifiedAd" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "ClassifiedAd" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "ClassifiedAd" ADD COLUMN IF NOT EXISTS "sellerId" TEXT;
ALTER TABLE "ClassifiedAd" ADD COLUMN IF NOT EXISTS "attributes" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClassifiedAd_sellerId_idx" ON "ClassifiedAd"("sellerId");
