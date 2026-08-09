/*
  Warnings:

  - You are about to drop the column `logo_url` on the `Tenant` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Guru_tenant_id_nip_key";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "logo_url";

-- CreateTable
CREATE TABLE "StudentCardConfig" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'vertical',
    "card_title" TEXT NOT NULL DEFAULT 'KARTU PELAJAR',
    "header_text" TEXT,
    "subheader_text" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#2563eb',
    "secondary_color" TEXT NOT NULL DEFAULT '#ffffff',
    "logo_url" TEXT,
    "show_photo" BOOLEAN NOT NULL DEFAULT true,
    "show_qrcode" BOOLEAN NOT NULL DEFAULT true,
    "photo_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "photo_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "photo_scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "qrcode_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qrcode_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qrcode_scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentCardConfig_tenant_id_key" ON "StudentCardConfig"("tenant_id");

-- AddForeignKey
ALTER TABLE "StudentCardConfig" ADD CONSTRAINT "StudentCardConfig_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
