SELECT s.id as siswa_id, s.user_id, s.tenant_id, s.kelas_id, u.username, r.name as role_name 
FROM "Siswa" s 
JOIN "User" u ON s.user_id = u.id 
JOIN "Role" r ON u.role_id = r.id 
WHERE s.nama_siswa LIKE '%Hidayat%';
