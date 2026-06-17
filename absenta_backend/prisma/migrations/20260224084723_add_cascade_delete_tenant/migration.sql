-- DropForeignKey
ALTER TABLE "AbsenGerbangSiswa" DROP CONSTRAINT "AbsenGerbangSiswa_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsenGuru" DROP CONSTRAINT "AbsenGuru_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsenSiswa" DROP CONSTRAINT "AbsenSiswa_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Billing" DROP CONSTRAINT "Billing_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Config" DROP CONSTRAINT "Config_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "DocumentActivity" DROP CONSTRAINT "DocumentActivity_actor_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "FinancialReport" DROP CONSTRAINT "FinancialReport_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Guru" DROP CONSTRAINT "Guru_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "GuruMapel" DROP CONSTRAINT "GuruMapel_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "GuruStrukturOrganisasi" DROP CONSTRAINT "GuruStrukturOrganisasi_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "JenisKegiatanMaster" DROP CONSTRAINT "JenisKegiatanMaster_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "JenisPelanggaran" DROP CONSTRAINT "JenisPelanggaran_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Jurusan" DROP CONSTRAINT "Jurusan_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Kelas" DROP CONSTRAINT "Kelas_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "KelasMapel" DROP CONSTRAINT "KelasMapel_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Mapel" DROP CONSTRAINT "Mapel_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "NotificationLog" DROP CONSTRAINT "NotificationLog_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "OrangTua" DROP CONSTRAINT "OrangTua_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "PelanggaranSiswa" DROP CONSTRAINT "PelanggaranSiswa_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "RefundRecord" DROP CONSTRAINT "RefundRecord_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Sekolah" DROP CONSTRAINT "Sekolah_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Semester" DROP CONSTRAINT "Semester_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "SesiAbsensi" DROP CONSTRAINT "SesiAbsensi_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "SesiGerbang" DROP CONSTRAINT "SesiGerbang_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Siswa" DROP CONSTRAINT "Siswa_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaFaceTemplate" DROP CONSTRAINT "SiswaFaceTemplate_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaStrukturOrganisasi" DROP CONSTRAINT "SiswaStrukturOrganisasi_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "StrukturOrganisasi" DROP CONSTRAINT "StrukturOrganisasi_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "SupervisiGuru" DROP CONSTRAINT "SupervisiGuru_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "SystemConfig" DROP CONSTRAINT "SystemConfig_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "TahunPelajaran" DROP CONSTRAINT "TahunPelajaran_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "WaliKelas" DROP CONSTRAINT "WaliKelas_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "absensi_kejadian_khusus" DROP CONSTRAINT "absensi_kejadian_khusus_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_risk_event" DROP CONSTRAINT "tenant_risk_event_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_risk_score" DROP CONSTRAINT "tenant_risk_score_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_risk_score_log" DROP CONSTRAINT "tenant_risk_score_log_tenant_id_fkey";

-- CreateIndex
CREATE INDEX "AbsenGerbangSiswa_tenant_id_sesi_gerbang_id_siswa_id_arah_idx" ON "AbsenGerbangSiswa"("tenant_id", "sesi_gerbang_id", "siswa_id", "arah");

-- CreateIndex
CREATE INDEX "AbsenSiswa_tenant_id_sesi_id_siswa_akademik_id_idx" ON "AbsenSiswa"("tenant_id", "sesi_id", "siswa_akademik_id");

-- AddForeignKey
ALTER TABLE "JenisPelanggaran" ADD CONSTRAINT "JenisPelanggaran_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PelanggaranSiswa" ADD CONSTRAINT "PelanggaranSiswa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisiGuru" ADD CONSTRAINT "SupervisiGuru_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jurusan" ADD CONSTRAINT "Jurusan_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guru" ADD CONSTRAINT "Guru_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mapel" ADD CONSTRAINT "Mapel_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaliKelas" ADD CONSTRAINT "WaliKelas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TahunPelajaran" ADD CONSTRAINT "TahunPelajaran_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGuru" ADD CONSTRAINT "AbsenGuru_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sekolah" ADD CONSTRAINT "Sekolah_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrukturOrganisasi" ADD CONSTRAINT "StrukturOrganisasi_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaStrukturOrganisasi" ADD CONSTRAINT "SiswaStrukturOrganisasi_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruStrukturOrganisasi" ADD CONSTRAINT "GuruStrukturOrganisasi_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiGerbang" ADD CONSTRAINT "SesiGerbang_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGerbangSiswa" ADD CONSTRAINT "AbsenGerbangSiswa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaFaceTemplate" ADD CONSTRAINT "SiswaFaceTemplate_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JenisKegiatanMaster" ADD CONSTRAINT "JenisKegiatanMaster_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Config" ADD CONSTRAINT "Config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_risk_score" ADD CONSTRAINT "tenant_risk_score_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_risk_score_log" ADD CONSTRAINT "tenant_risk_score_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_risk_event" ADD CONSTRAINT "tenant_risk_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentActivity" ADD CONSTRAINT "DocumentActivity_actor_tenant_id_fkey" FOREIGN KEY ("actor_tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRecord" ADD CONSTRAINT "RefundRecord_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruMapel" ADD CONSTRAINT "GuruMapel_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KelasMapel" ADD CONSTRAINT "KelasMapel_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrangTua" ADD CONSTRAINT "OrangTua_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialReport" ADD CONSTRAINT "FinancialReport_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_kejadian_khusus" ADD CONSTRAINT "absensi_kejadian_khusus_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
