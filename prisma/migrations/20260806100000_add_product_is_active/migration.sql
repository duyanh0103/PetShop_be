-- AlterTable: add Product.isActive (defaults to true, so existing rows stay visible)
ALTER TABLE "Product" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
