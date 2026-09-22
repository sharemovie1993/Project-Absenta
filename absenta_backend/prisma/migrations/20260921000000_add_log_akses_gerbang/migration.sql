-- CreateTable
CREATE TABLE IF NOT EXISTS "log_akses_gerbang" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "tipe_orang" TEXT NOT NULL DEFAULT 'SISWA',
    "siswa_id" TEXT,
    "guru_id" TEXT,
    "nama_snapshot" TEXT,
    "kelas_snapshot" TEXT,
    "nama_tamu" TEXT,
    "instansi_tamu" TEXT,
    "keperluan_tamu" TEXT,
    "kontak_tamu" TEXT,
    "arah" TEXT NOT NULL,
    "waktu_akses" TIMESTAMPTZ NOT NULL,
    "metode_verifikasi" TEXT,
    "token_input" TEXT,
    "alasan_non_sekolah" TEXT,
    "catatan" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_akses_gerbang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "log_akses_gerbang_tenant_id_tanggal_idx" ON "log_akses_gerbang"("tenant_id", "tanggal");
CREATE INDEX IF NOT EXISTS "log_akses_gerbang_tenant_id_created_at_idx" ON "log_akses_gerbang"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "log_akses_gerbang_tenant_id_siswa_id_idx" ON "log_akses_gerbang"("tenant_id", "siswa_id");
CREATE INDEX IF NOT EXISTS "log_akses_gerbang_tenant_id_guru_id_idx" ON "log_akses_gerbang"("tenant_id", "guru_id");
CREATE INDEX IF NOT EXISTS "log_akses_gerbang_tenant_id_tipe_orang_idx" ON "log_akses_gerbang"("tenant_id", "tipe_orang");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "log_akses_gerbang" ADD CONSTRAINT "log_akses_gerbang_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "log_akses_gerbang" ADD CONSTRAINT "log_akses_gerbang_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "log_akses_gerbang" ADD CONSTRAINT "log_akses_gerbang_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
