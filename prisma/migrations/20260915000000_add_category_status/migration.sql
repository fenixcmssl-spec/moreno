-- AlterTable: Add missing status column to Category table with default value 'ACTIVE'
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex: Add index on Category(status)
CREATE INDEX IF NOT EXISTS "Category_status_idx" ON "Category"("status");
