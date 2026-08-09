-- CreateTable
CREATE TABLE "Branding" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "app_name" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "accent_color" TEXT,
    "theme_mode" TEXT DEFAULT 'light',
    "favicon_url" TEXT,
    "footer_text" TEXT,
    "support_email" TEXT,
    "support_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branding_tenant_id_idx" ON "Branding"("tenant_id");

-- AddForeignKey
ALTER TABLE "Branding" ADD CONSTRAINT "Branding_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
