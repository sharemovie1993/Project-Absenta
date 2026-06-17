-- DropForeignKey
ALTER TABLE "DocumentActivity" DROP CONSTRAINT "DocumentActivity_actor_user_id_fkey";

-- DropForeignKey
ALTER TABLE "DocumentActivity" DROP CONSTRAINT "DocumentActivity_document_id_fkey";

-- DropForeignKey
ALTER TABLE "DocumentVersion" DROP CONSTRAINT "DocumentVersion_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "DocumentVersion" DROP CONSTRAINT "DocumentVersion_document_id_fkey";

-- DropForeignKey
ALTER TABLE "GuruStrukturOrganisasi" DROP CONSTRAINT "GuruStrukturOrganisasi_guru_id_fkey";

-- DropForeignKey
ALTER TABLE "GuruStrukturOrganisasi" DROP CONSTRAINT "GuruStrukturOrganisasi_struktur_organisasi_id_fkey";

-- DropForeignKey
ALTER TABLE "MenuRole" DROP CONSTRAINT "MenuRole_role_id_fkey";

-- DropForeignKey
ALTER TABLE "OrangTuaSiswa" DROP CONSTRAINT "OrangTuaSiswa_orang_tua_id_fkey";

-- DropForeignKey
ALTER TABLE "OrangTuaSiswa" DROP CONSTRAINT "OrangTuaSiswa_siswa_id_fkey";

-- DropForeignKey
ALTER TABLE "ParentAccessToken" DROP CONSTRAINT "ParentAccessToken_orang_tua_id_fkey";

-- DropForeignKey
ALTER TABLE "ParentPushSubscription" DROP CONSTRAINT "ParentPushSubscription_orang_tua_id_fkey";

-- DropForeignKey
ALTER TABLE "PlanChangeRequest" DROP CONSTRAINT "PlanChangeRequest_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaAkademik" DROP CONSTRAINT "SiswaAkademik_kelas_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaAkademik" DROP CONSTRAINT "SiswaAkademik_semester_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaAkademik" DROP CONSTRAINT "SiswaAkademik_siswa_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaAkademik" DROP CONSTRAINT "SiswaAkademik_tahun_pelajaran_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaStrukturOrganisasi" DROP CONSTRAINT "SiswaStrukturOrganisasi_siswa_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaStrukturOrganisasi" DROP CONSTRAINT "SiswaStrukturOrganisasi_struktur_organisasi_id_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionHistory" DROP CONSTRAINT "SubscriptionHistory_subscription_id_fkey";

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaAkademik" ADD CONSTRAINT "SiswaAkademik_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaAkademik" ADD CONSTRAINT "SiswaAkademik_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaAkademik" ADD CONSTRAINT "SiswaAkademik_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaAkademik" ADD CONSTRAINT "SiswaAkademik_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaStrukturOrganisasi" ADD CONSTRAINT "SiswaStrukturOrganisasi_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaStrukturOrganisasi" ADD CONSTRAINT "SiswaStrukturOrganisasi_struktur_organisasi_id_fkey" FOREIGN KEY ("struktur_organisasi_id") REFERENCES "StrukturOrganisasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruStrukturOrganisasi" ADD CONSTRAINT "GuruStrukturOrganisasi_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruStrukturOrganisasi" ADD CONSTRAINT "GuruStrukturOrganisasi_struktur_organisasi_id_fkey" FOREIGN KEY ("struktur_organisasi_id") REFERENCES "StrukturOrganisasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentActivity" ADD CONSTRAINT "DocumentActivity_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentActivity" ADD CONSTRAINT "DocumentActivity_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeRequest" ADD CONSTRAINT "PlanChangeRequest_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrangTuaSiswa" ADD CONSTRAINT "OrangTuaSiswa_orang_tua_id_fkey" FOREIGN KEY ("orang_tua_id") REFERENCES "OrangTua"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrangTuaSiswa" ADD CONSTRAINT "OrangTuaSiswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentAccessToken" ADD CONSTRAINT "ParentAccessToken_orang_tua_id_fkey" FOREIGN KEY ("orang_tua_id") REFERENCES "OrangTua"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuRole" ADD CONSTRAINT "MenuRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentPushSubscription" ADD CONSTRAINT "ParentPushSubscription_orang_tua_id_fkey" FOREIGN KEY ("orang_tua_id") REFERENCES "OrangTua"("id") ON DELETE CASCADE ON UPDATE CASCADE;
