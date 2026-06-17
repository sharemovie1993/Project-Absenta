-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('SUPERADMIN', 'ADMIN', 'GURU', 'WALIKELAS', 'SISWA');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "SiswaStatus" AS ENUM ('AKTIF', 'LULUS', 'KELUAR', 'PINDAH');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('UNPAID', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AbsensiMode" AS ENUM ('SIMPLE', 'MULTI_SESI');

-- CreateEnum
CREATE TYPE "SesiStatus" AS ENUM ('DRAFT', 'BERLANGSUNG', 'SELESAI');

-- CreateEnum
CREATE TYPE "AbsenStatus" AS ENUM ('HADIR', 'TIDAK_HADIR', 'ALPA', 'IZIN', 'SAKIT', 'TERLAMBAT');

-- CreateEnum
CREATE TYPE "JenisTap" AS ENUM ('GERBANG_DATANG', 'GERBANG_PULANG', 'KELAS', 'GERBANG_LAINNYA');

-- CreateEnum
CREATE TYPE "JenisKegiatan" AS ENUM ('GERBANG', 'APEL', 'DUHA', 'KBM', 'ESKUL', 'PEMBIASAAN', 'UPACARA', 'JURUSAN');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "absensi_mode" "AbsensiMode" NOT NULL DEFAULT 'SIMPLE',
    "domain" TEXT,
    "logo_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "reset_token" TEXT,
    "reset_token_expires" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_monthly" INTEGER NOT NULL,
    "max_user" INTEGER,
    "features" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jurusan" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jurusan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kelas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nama_kelas" TEXT NOT NULL,
    "tingkat" INTEGER NOT NULL,
    "jurusan_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guru" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nip" TEXT,
    "nama_guru" TEXT NOT NULL,
    "no_rfid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mapel" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nama_mapel" TEXT NOT NULL,
    "kode_mapel" TEXT,
    "tingkat" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mapel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaliKelas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "guru_id" TEXT NOT NULL,
    "kelas_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaliKelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TahunPelajaran" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tahun" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TahunPelajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nama_semester" TEXT NOT NULL,
    "tahun_pelajaran_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Siswa" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "nis" TEXT NOT NULL,
    "nisn" TEXT,
    "nik" TEXT,
    "nama_siswa" TEXT NOT NULL,
    "jenis_kelamin" TEXT NOT NULL,
    "tempat_lahir" TEXT,
    "tanggal_lahir" TIMESTAMP(3),
    "alamat" TEXT,
    "dusun" TEXT,
    "kelurahan" TEXT,
    "kecamatan" TEXT,
    "kabupaten" TEXT,
    "provinsi" TEXT,
    "rt" TEXT,
    "rw" TEXT,
    "kode_pos" TEXT,
    "no_hp" TEXT,
    "transportasi" TEXT,
    "nama_ayah" TEXT,
    "nik_ayah" TEXT,
    "pekerjaan_ayah" TEXT,
    "pendidikan_ayah" TEXT,
    "penghasilan_ayah" TEXT,
    "nama_ibu" TEXT,
    "nik_ibu" TEXT,
    "pekerjaan_ibu" TEXT,
    "pendidikan_ibu" TEXT,
    "penghasilan_ibu" TEXT,
    "nama_wali" TEXT,
    "hubungan_wali" TEXT,
    "pekerjaan_wali" TEXT,
    "penghasilan_wali" TEXT,
    "anak_ke" INTEGER,
    "kebutuhan_khusus" TEXT,
    "penerima_kps" BOOLEAN DEFAULT false,
    "penerima_kip" BOOLEAN DEFAULT false,
    "no_kip" TEXT,
    "kelas_id" TEXT NOT NULL,
    "tahun_pelajaran_id" TEXT,
    "semester_id" TEXT,
    "tanggal_masuk" TIMESTAMP(3),
    "tanggal_keluar" TIMESTAMP(3),
    "alasan_keluar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "no_rfid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesiAbsensi" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "guru_id" TEXT NOT NULL,
    "kelas_id" TEXT NOT NULL,
    "mapel_id" TEXT,
    "semester_id" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "waktu_mulai" TIMESTAMP(3) NOT NULL,
    "waktu_selesai" TIMESTAMP(3),
    "jenis_kegiatan" TEXT NOT NULL DEFAULT 'KBM',
    "slot_kbm" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'BERLANGSUNG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SesiAbsensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenGuru" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sesi_id" TEXT NOT NULL,
    "guru_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "waktu_tap" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbsenGuru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenSiswa" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sesi_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "waktu_tap" TIMESTAMP(3),
    "asal_gerbang" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbsenSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sekolah" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sekolah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesiGerbang" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sekolah_id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "waktu_mulai" TIMESTAMP(3) NOT NULL,
    "waktu_selesai" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'BERLANGSUNG',
    "gate_id" TEXT,
    "jenis_kegiatan" "JenisKegiatan" NOT NULL DEFAULT 'GERBANG',

    CONSTRAINT "SesiGerbang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenGerbangSiswa" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sesi_gerbang_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "arah" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HADIR',
    "waktu_tap" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbsenGerbangSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogTap" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rfid" TEXT NOT NULL,
    "jenis_tap" TEXT NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "device_id" TEXT,

    CONSTRAINT "LogTap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JenisKegiatanMaster" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "JenisKegiatan" NOT NULL,
    "urutan" INTEGER,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JenisKegiatanMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuruMapel" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "guru_id" TEXT NOT NULL,
    "mapel_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuruMapel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KelasMapel" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "kelas_id" TEXT NOT NULL,
    "mapel_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KelasMapel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrangTua" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nik" TEXT,
    "hubungan" TEXT,
    "pekerjaan" TEXT,
    "pendidikan" TEXT,
    "penghasilan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrangTua_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "path" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuRole" (
    "id" TEXT NOT NULL,
    "menu_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RekapAbsensiBulanan" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tahun_bulan" TEXT NOT NULL,
    "kelas_id" TEXT,
    "mapel_id" TEXT,
    "guru_id" TEXT,
    "jumlah_hadir" INTEGER NOT NULL DEFAULT 0,
    "jumlah_izin" INTEGER NOT NULL DEFAULT 0,
    "jumlah_sakit" INTEGER NOT NULL DEFAULT 0,
    "jumlah_alpa" INTEGER NOT NULL DEFAULT 0,
    "jumlah_tidak_hadir" INTEGER NOT NULL DEFAULT 0,
    "total_siswa" INTEGER NOT NULL DEFAULT 0,
    "total_sesi" INTEGER NOT NULL DEFAULT 0,
    "persentase_kehadiran" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RekapAbsensiBulanan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE INDEX "User_tenant_id_idx" ON "User"("tenant_id");

-- CreateIndex
CREATE INDEX "User_tenant_id_role_id_idx" ON "User"("tenant_id", "role_id");

-- CreateIndex
CREATE INDEX "User_verification_token_idx" ON "User"("verification_token");

-- CreateIndex
CREATE INDEX "User_reset_token_idx" ON "User"("reset_token");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenant_id_email_key" ON "User"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "Subscription_tenant_id_idx" ON "Subscription"("tenant_id");

-- CreateIndex
CREATE INDEX "Billing_tenant_id_idx" ON "Billing"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Billing_tenant_id_invoice_number_key" ON "Billing"("tenant_id", "invoice_number");

-- CreateIndex
CREATE INDEX "Jurusan_tenant_id_idx" ON "Jurusan"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Jurusan_tenant_id_kode_key" ON "Jurusan"("tenant_id", "kode");

-- CreateIndex
CREATE INDEX "Kelas_tenant_id_idx" ON "Kelas"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Guru_user_id_key" ON "Guru"("user_id");

-- CreateIndex
CREATE INDEX "Guru_tenant_id_idx" ON "Guru"("tenant_id");

-- CreateIndex
CREATE INDEX "Guru_tenant_id_no_rfid_idx" ON "Guru"("tenant_id", "no_rfid");

-- CreateIndex
CREATE UNIQUE INDEX "Guru_tenant_id_nip_key" ON "Guru"("tenant_id", "nip");

-- CreateIndex
CREATE INDEX "Mapel_tenant_id_idx" ON "Mapel"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Mapel_tenant_id_kode_mapel_key" ON "Mapel"("tenant_id", "kode_mapel");

-- CreateIndex
CREATE UNIQUE INDEX "WaliKelas_kelas_id_key" ON "WaliKelas"("kelas_id");

-- CreateIndex
CREATE INDEX "WaliKelas_tenant_id_idx" ON "WaliKelas"("tenant_id");

-- CreateIndex
CREATE INDEX "TahunPelajaran_tenant_id_idx" ON "TahunPelajaran"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "TahunPelajaran_tenant_id_tahun_key" ON "TahunPelajaran"("tenant_id", "tahun");

-- CreateIndex
CREATE INDEX "Semester_tenant_id_idx" ON "Semester"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_user_id_key" ON "Siswa"("user_id");

-- CreateIndex
CREATE INDEX "Siswa_tenant_id_idx" ON "Siswa"("tenant_id");

-- CreateIndex
CREATE INDEX "Siswa_kelas_id_idx" ON "Siswa"("kelas_id");

-- CreateIndex
CREATE INDEX "Siswa_tenant_id_no_rfid_idx" ON "Siswa"("tenant_id", "no_rfid");

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_tenant_id_nis_key" ON "Siswa"("tenant_id", "nis");

-- CreateIndex
CREATE INDEX "SesiAbsensi_tenant_id_idx" ON "SesiAbsensi"("tenant_id");

-- CreateIndex
CREATE INDEX "SesiAbsensi_tenant_id_tanggal_idx" ON "SesiAbsensi"("tenant_id", "tanggal");

-- CreateIndex
CREATE INDEX "SesiAbsensi_tenant_id_kelas_id_tanggal_idx" ON "SesiAbsensi"("tenant_id", "kelas_id", "tanggal");

-- CreateIndex
CREATE INDEX "AbsenGuru_tenant_id_idx" ON "AbsenGuru"("tenant_id");

-- CreateIndex
CREATE INDEX "AbsenGuru_tenant_id_guru_id_idx" ON "AbsenGuru"("tenant_id", "guru_id");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenGuru_sesi_id_guru_id_key" ON "AbsenGuru"("sesi_id", "guru_id");

-- CreateIndex
CREATE INDEX "AbsenSiswa_tenant_id_idx" ON "AbsenSiswa"("tenant_id");

-- CreateIndex
CREATE INDEX "AbsenSiswa_tenant_id_siswa_id_idx" ON "AbsenSiswa"("tenant_id", "siswa_id");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenSiswa_sesi_id_siswa_id_key" ON "AbsenSiswa"("sesi_id", "siswa_id");

-- CreateIndex
CREATE INDEX "Sekolah_tenant_id_idx" ON "Sekolah"("tenant_id");

-- CreateIndex
CREATE INDEX "SesiGerbang_tenant_id_idx" ON "SesiGerbang"("tenant_id");

-- CreateIndex
CREATE INDEX "SesiGerbang_tenant_id_tanggal_idx" ON "SesiGerbang"("tenant_id", "tanggal");

-- CreateIndex
CREATE INDEX "AbsenGerbangSiswa_tenant_id_idx" ON "AbsenGerbangSiswa"("tenant_id");

-- CreateIndex
CREATE INDEX "AbsenGerbangSiswa_tenant_id_siswa_id_arah_idx" ON "AbsenGerbangSiswa"("tenant_id", "siswa_id", "arah");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenGerbangSiswa_sesi_gerbang_id_siswa_id_arah_key" ON "AbsenGerbangSiswa"("sesi_gerbang_id", "siswa_id", "arah");

-- CreateIndex
CREATE INDEX "LogTap_tenant_id_idx" ON "LogTap"("tenant_id");

-- CreateIndex
CREATE INDEX "LogTap_tenant_id_waktu_idx" ON "LogTap"("tenant_id", "waktu");

-- CreateIndex
CREATE INDEX "JenisKegiatanMaster_tenant_id_idx" ON "JenisKegiatanMaster"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "JenisKegiatanMaster_tenant_id_nama_key" ON "JenisKegiatanMaster"("tenant_id", "nama");

-- CreateIndex
CREATE INDEX "Config_tenant_id_idx" ON "Config"("tenant_id");

-- CreateIndex
CREATE INDEX "ActivityLog_tenant_id_idx" ON "ActivityLog"("tenant_id");

-- CreateIndex
CREATE INDEX "GuruMapel_tenant_id_idx" ON "GuruMapel"("tenant_id");

-- CreateIndex
CREATE INDEX "KelasMapel_tenant_id_idx" ON "KelasMapel"("tenant_id");

-- CreateIndex
CREATE INDEX "OrangTua_tenant_id_idx" ON "OrangTua"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "MenuRole_menu_id_role_id_key" ON "MenuRole"("menu_id", "role_id");

-- CreateIndex
CREATE INDEX "RekapAbsensiBulanan_tenant_id_idx" ON "RekapAbsensiBulanan"("tenant_id");

-- CreateIndex
CREATE INDEX "RekapAbsensiBulanan_tenant_id_tahun_bulan_idx" ON "RekapAbsensiBulanan"("tenant_id", "tahun_bulan");

-- CreateIndex
CREATE UNIQUE INDEX "RekapAbsensiBulanan_tenant_id_tahun_bulan_kelas_id_mapel_id_key" ON "RekapAbsensiBulanan"("tenant_id", "tahun_bulan", "kelas_id", "mapel_id", "guru_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jurusan" ADD CONSTRAINT "Jurusan_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_jurusan_id_fkey" FOREIGN KEY ("jurusan_id") REFERENCES "Jurusan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guru" ADD CONSTRAINT "Guru_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guru" ADD CONSTRAINT "Guru_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mapel" ADD CONSTRAINT "Mapel_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaliKelas" ADD CONSTRAINT "WaliKelas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaliKelas" ADD CONSTRAINT "WaliKelas_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaliKelas" ADD CONSTRAINT "WaliKelas_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TahunPelajaran" ADD CONSTRAINT "TahunPelajaran_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "Mapel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGuru" ADD CONSTRAINT "AbsenGuru_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGuru" ADD CONSTRAINT "AbsenGuru_sesi_id_fkey" FOREIGN KEY ("sesi_id") REFERENCES "SesiAbsensi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGuru" ADD CONSTRAINT "AbsenGuru_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_sesi_id_fkey" FOREIGN KEY ("sesi_id") REFERENCES "SesiAbsensi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sekolah" ADD CONSTRAINT "Sekolah_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiGerbang" ADD CONSTRAINT "SesiGerbang_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiGerbang" ADD CONSTRAINT "SesiGerbang_sekolah_id_fkey" FOREIGN KEY ("sekolah_id") REFERENCES "Sekolah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGerbangSiswa" ADD CONSTRAINT "AbsenGerbangSiswa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGerbangSiswa" ADD CONSTRAINT "AbsenGerbangSiswa_sesi_gerbang_id_fkey" FOREIGN KEY ("sesi_gerbang_id") REFERENCES "SesiGerbang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGerbangSiswa" ADD CONSTRAINT "AbsenGerbangSiswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogTap" ADD CONSTRAINT "LogTap_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JenisKegiatanMaster" ADD CONSTRAINT "JenisKegiatanMaster_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Config" ADD CONSTRAINT "Config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruMapel" ADD CONSTRAINT "GuruMapel_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruMapel" ADD CONSTRAINT "GuruMapel_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruMapel" ADD CONSTRAINT "GuruMapel_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "Mapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KelasMapel" ADD CONSTRAINT "KelasMapel_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KelasMapel" ADD CONSTRAINT "KelasMapel_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KelasMapel" ADD CONSTRAINT "KelasMapel_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "Mapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrangTua" ADD CONSTRAINT "OrangTua_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrangTua" ADD CONSTRAINT "OrangTua_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuRole" ADD CONSTRAINT "MenuRole_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuRole" ADD CONSTRAINT "MenuRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RekapAbsensiBulanan" ADD CONSTRAINT "RekapAbsensiBulanan_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RekapAbsensiBulanan" ADD CONSTRAINT "RekapAbsensiBulanan_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RekapAbsensiBulanan" ADD CONSTRAINT "RekapAbsensiBulanan_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "Mapel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RekapAbsensiBulanan" ADD CONSTRAINT "RekapAbsensiBulanan_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;
