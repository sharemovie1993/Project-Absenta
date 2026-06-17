-- 1. Cari Tenant ID Hidayat (NIS 20255419)
-- 2. Cari Position ID untuk "Petugas Absensi Kelas"
-- 3. Cari OrganizationalAssignment untuk Hidayat (user_id di Siswa)
SELECT 
  s.id as siswa_id, s.user_id, s.tenant_id, s.nama_siswa,
  oa.id as assignment_id, oa.is_active, 
  op.name as position_name, op.scope_type,
  oa.kelas_id as assigned_kelas_id, s.kelas_id as student_kelas_id
FROM "Siswa" s
LEFT JOIN "OrganizationalAssignment" oa ON s.user_id = oa.user_id
LEFT JOIN "OrganizationalPosition" op ON oa.position_id = op.id
WHERE s.nis = '20255419';
