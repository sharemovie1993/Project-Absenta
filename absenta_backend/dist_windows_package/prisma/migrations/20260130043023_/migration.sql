-- CreateTable
CREATE TABLE "ParentPushSubscription" (
    "id" TEXT NOT NULL,
    "orang_tua_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys_json" JSONB NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentPushSubscription_endpoint_key" ON "ParentPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "ParentPushSubscription_orang_tua_id_idx" ON "ParentPushSubscription"("orang_tua_id");

-- AddForeignKey
ALTER TABLE "ParentPushSubscription" ADD CONSTRAINT "ParentPushSubscription_orang_tua_id_fkey" FOREIGN KEY ("orang_tua_id") REFERENCES "OrangTua"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
