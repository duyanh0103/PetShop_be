-- AlterTable: add new Category columns (nullable/defaulted first for safe backfill)
ALTER TABLE "Category" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Category" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Category" ADD COLUMN "slug" TEXT;

-- Backfill slug for any existing rows from "name" (accent-insensitive best effort + id suffix to guarantee uniqueness)
UPDATE "Category"
SET "slug" = lower(regexp_replace(regexp_replace(trim(BOTH ' ' FROM "name"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')) || '-' || substr("id", 1, 8)
WHERE "slug" IS NULL;

-- Enforce NOT NULL + uniqueness now that every row has a slug
ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");
