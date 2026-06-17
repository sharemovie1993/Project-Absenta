
-- 1. Pembersihan Data Lama
DELETE FROM "AbsenSiswa" WHERE siswa_id = '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429';
DELETE FROM "AbsenGerbangSiswa" WHERE siswa_id = '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429';
DELETE FROM "PelanggaranSiswa" WHERE siswa_id = '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429';
DELETE FROM "SesiGerbang" WHERE tenant_id = '17c66f12-715b-405f-b48e-485393fce5b4' AND tanggal::date = '2026-04-10';

-- 2. Buat Sesi Gerbang untuk hari ini (Agar Flow Bisnis Valid)
INSERT INTO "SesiGerbang" (id, tenant_id, sekolah_id, tanggal, waktu_mulai, status, jenis_kegiatan, tahun_pelajaran_id)
VALUES ('d84a9e52-167e-4081-8933-909d2b867c47', '17c66f12-715b-405f-b48e-485393fce5b4', 'b6b388f6-3ffe-4146-976b-fb7d42e187d5', '2026-04-10 00:00:00+07', '2026-04-10 07:00:00+07', 'SELESAI', 'PEMBIASAAN', '13cec916-5116-471a-b078-bb5f39d0ce52');

-- 3. Injeksi Data Kehadiran (Flow Bisnis: Tap di Gerbang Hari Ini)
INSERT INTO "AbsenGerbangSiswa" (id, tenant_id, sesi_gerbang_id, siswa_id, status, arah, waktu_tap, is_terlambat, tahun_pelajaran_id_snapshot, created_at, updated_at)
VALUES 
('e84a9e52-167e-4081-8933-909d2b867c48', '17c66f12-715b-405f-b48e-485393fce5b4', 'd84a9e52-167e-4081-8933-909d2b867c47', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', 'HADIR', 'GERBANG_DATANG', '2026-04-10 07:05:00+07', false, '13cec916-5116-471a-b078-bb5f39d0ce52', now(), now());

-- 4. Injeksi Poin Pelanggaran (Gamifikasi Widget)
INSERT INTO "PelanggaranSiswa" (id, tenant_id, siswa_id, siswa_akademik_id, tanggal, jenis_pelanggaran, poin, status, created_at, updated_at)
VALUES 
('f84a9e52-167e-4081-8933-909d2b867c46', '17c66f12-715b-405f-b48e-485393fce5b4', '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', '95566760-136e-4831-93e7-b5f263ce0b77', now(), 'Kedisiplinan', 75, 'SELESAI', now(), now());
