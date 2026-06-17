
-- Get Hidayat's IDs
-- User ID for hidayat@gmail.com is 87b084b2-7192-49b7-9d52-16f536c13300
-- SiswaAkademik ID is 95566760-136e-4831-93e7-b5f263ce0b77

-- Update AbsenSiswa to HADIR
UPDATE "AbsenSiswa" 
SET status = 'HADIR', poin_kehadiran = 5, is_terlambat = false
WHERE siswa_akademik_id = '95566760-136e-4831-93e7-b5f263ce0b77';

-- Update PelanggaranSiswa to show some points
-- Siswa ID is 7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429
INSERT INTO "PelanggaranSiswa" (id, tenant_id, siswa_id, siswa_akademik_id, tanggal, jenis_pelanggaran, poin, status, created_at, updated_at)
VALUES (
    'e84a9e52-167e-4081-8933-909d2b867c46', 
    'smkn1cimahi', 
    '7ad4a9a6-abed-4e8d-a6c0-b4304e1cb429', 
    '95566760-136e-4831-93e7-b5f263ce0b77', 
    NOW(), 
    'Kedisiplinan', 
    70, 
    'SELESAI', 
    NOW(), 
    NOW()
)
ON CONFLICT DO NOTHING;
