SELECT 
  to_char(s.tanggal, 'YYYY-MM-DD (Dy)') as tanggal,
  to_char(s.waktu_mulai, 'HH24:MI') as jam_mulai,
  to_char(s.waktu_selesai, 'HH24:MI') as jam_selesai,
  s.jenis_kegiatan,
  k.nama_kelas,
  count(a.id) as total_siswa
FROM "SesiAbsensi" s
JOIN "Kelas" k ON s.kelas_id = k.id
LEFT JOIN "AbsenSiswa" a ON a.sesi_id = s.id
WHERE k.nama_kelas ILIKE '%KUL%'
GROUP BY s.id, s.tanggal, s.waktu_mulai, s.waktu_selesai, s.jenis_kegiatan, k.nama_kelas
ORDER BY s.tanggal ASC, s.waktu_mulai ASC;
