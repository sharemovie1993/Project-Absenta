
-- 1. Pembersihan Data Lama Hidayat
DELETE FROM "AbsenSiswa" WHERE siswa_akademik_id = '95566760-136e-4831-93e7-b5f263ce0b77';
DELETE FROM "AbsenGerbangSiswa" WHERE siswa_id = '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429';
DELETE FROM "PelanggaranSiswa" WHERE siswa_id = '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429';

-- 2. Injeksi Data Kehadiran April 2026 (Manual Loop via Multiple Inserts)
-- Saya akan memasukkan data untuk 10 hari terakhir agar dashboard tidak kosong
-- Format: id, tenant_id, sesi_id, siswa_id, siswa_akademik_id, status, waktu_tap, is_terlambat, ...

-- Karena SesiAbsensi ID-nya dinamis, saya akan membuat data AbsenGerbangSiswa saja yang paling utama (Hybrid mode prioritizes this)

INSERT INTO "AbsenGerbangSiswa" (id, tenant_id, siswa_id, status, arah, waktu_tap, is_terlambat, tahun_pelajaran_id_snapshot, created_at, updated_at)
VALUES 
(gen_random_uuid(), 'smkn1cimahi', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', 'HADIR', 'GERBANG_DATANG', '2026-04-01 07:05:00+07', false, '13cec916-5116-471a-b078-bb5f39d0ce52', now(), now()),
(gen_random_uuid(), 'smkn1cimahi', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', 'HADIR', 'GERBANG_DATANG', '2026-04-02 07:02:00+07', false, '13cec916-5116-471a-b078-bb5f39d0ce52', now(), now()),
(gen_random_uuid(), 'smkn1cimahi', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', 'HADIR', 'GERBANG_DATANG', '2026-04-03 07:10:00+07', false, '13cec916-5116-471a-b078-bb5f39d0ce52', now(), now()),
(gen_random_uuid(), 'smkn1cimahi', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', 'HADIR', 'GERBANG_DATANG', '2026-04-06 07:08:00+07', false, '13cec916-5116-471a-b078-bb5f39d0ce52', now(), now()),
(gen_random_uuid(), 'smkn1cimahi', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', 'HADIR', 'GERBANG_DATANG', '2026-04-07 07:01:00+07', false, '13cec916-5116-471a-b078-bb5f39d0ce52', now(), now()),
(gen_random_uuid(), 'smkn1cimahi', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', 'HADIR', 'GERBANG_DATANG', '2026-04-08 07:05:00+07', false, '13cec916-5116-471a-b078-bb5f39d0ce52', now(), now()),
(gen_random_uuid(), 'smkn1cimahi', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', 'HADIR', 'GERBANG_DATANG', '2026-04-09 07:04:00+07', false, '13cec916-5116-471a-b078-bb5f39d0ce52', now(), now()),
(gen_random_uuid(), 'smkn1cimahi', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', 'HADIR', 'GERBANG_DATANG', '2026-04-10 07:06:00+07', false, '13cec916-5116-471a-b078-bb5f39d0ce52', now(), now());

-- 3. Injeksi Poin Pelanggaran
INSERT INTO "PelanggaranSiswa" (id, tenant_id, siswa_id, siswa_akademik_id, tanggal, jenis_pelanggaran, poin, status, created_at, updated_at)
VALUES 
('f84a9e52-167e-4081-8933-909d2b867c46', 'smkn1cimahi', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', '95566760-136e-4831-93e7-b5f263ce0b77', now(), 'Kedisiplinan', 70, 'SELESAI', now(), now());
