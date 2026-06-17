-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS', 'PRIVACY', 'BIOMETRIC', 'BILLING');

-- AlterTable
ALTER TABLE "AbsenGerbangSiswa" ADD COLUMN     "verification_method" TEXT,
ADD COLUMN     "verification_result" BOOLEAN,
ADD COLUMN     "verification_score" DOUBLE PRECISION,
ADD COLUMN     "verification_threshold" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "SiswaFaceTemplate" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "embedding" BYTEA NOT NULL,
    "embedding_type" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiswaFaceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "tenant_id" TEXT,
    "consent_type" "ConsentType" NOT NULL,
    "version" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiswaFaceTemplate_tenant_id_siswa_id_idx" ON "SiswaFaceTemplate"("tenant_id", "siswa_id");

-- CreateIndex
CREATE UNIQUE INDEX "SiswaFaceTemplate_tenant_id_siswa_id_embedding_type_key" ON "SiswaFaceTemplate"("tenant_id", "siswa_id", "embedding_type");

-- CreateIndex
CREATE INDEX "ConsentLog_tenant_id_idx" ON "ConsentLog"("tenant_id");

-- CreateIndex
CREATE INDEX "ConsentLog_user_id_idx" ON "ConsentLog"("user_id");

-- CreateIndex
CREATE INDEX "ConsentLog_consent_type_idx" ON "ConsentLog"("consent_type");

-- CreateIndex
CREATE INDEX "ConsentLog_timestamp_idx" ON "ConsentLog"("timestamp");

-- AddForeignKey
ALTER TABLE "SiswaFaceTemplate" ADD CONSTRAINT "SiswaFaceTemplate_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaFaceTemplate" ADD CONSTRAINT "SiswaFaceTemplate_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
