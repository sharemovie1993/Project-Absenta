-- 1. Cari Siswa Hidayat untuk mendapatkan User ID dan Tenant ID yang benar
SELECT s.id as siswa_id, s.user_id, s.tenant_id, s.nama_siswa, s.nis, s.kelas_id
FROM "Siswa" s
WHERE s.nis = '20255419';

-- 2. Cari Penugasan Organisasi untuk User tersebut
SELECT oa.id as assignment_id, oa.is_active, oa.start_date, oa.end_date, oa.kelas_id as assignment_kelas_id,
       op.name as position_name, op.scope_type
FROM "OrganizationalAssignment" oa
JOIN "OrganizationalPosition" op ON oa.position_id = op.id
WHERE oa.tenant_id IN (SELECT tenant_id FROM "Siswa" WHERE nis = '20255419')
  AND oa.user_id IN (SELECT user_id FROM "Siswa" WHERE nis = '20255419');
