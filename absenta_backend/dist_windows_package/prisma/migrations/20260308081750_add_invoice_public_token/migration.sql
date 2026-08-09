-- CreateTable
CREATE TABLE "InvoicePublicToken" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "InvoicePublicToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePublicToken_token_hash_key" ON "InvoicePublicToken"("token_hash");

-- CreateIndex
CREATE INDEX "InvoicePublicToken_invoice_id_idx" ON "InvoicePublicToken"("invoice_id");

-- CreateIndex
CREATE INDEX "InvoicePublicToken_tenant_id_idx" ON "InvoicePublicToken"("tenant_id");
