UPDATE "JadwalKegiatan"
SET 
  nama = 'Apel Pulang',
  jenis_kegiatan = 'Apel Pulang',
  waktu_mulai = '15:30',
  waktu_selesai = '16:00',
  target_semua_kelas = true,
  aktif = true
WHERE nama ILIKE '%Apel Pulang%';

SELECT id, nama, jenis_kegiatan, aktif, target_semua_kelas, waktu_mulai, waktu_selesai, hari 
FROM "JadwalKegiatan";
