
import { prisma } from '../src/utils/prisma';
import { absensiManualService } from '../src/modules/attendance/manual/services/manual.service';
import { AbsenStatus } from '../src/constants/enums';

async function main() {
  console.log('Starting Propagation Test...');

  // 1. Clean up
  const email = 'test.propagation@example.com';
  const tenantName = 'Test Propagation Tenant';
  
  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) {
    await prisma.user.delete({ where: { id: existingUser.id } }); // Cascades usually
  }
  // Clean tenant if needed (optional, maybe unsafe if shared)
  
  // 2. Setup Tenant & Context
  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      absensi_mode: 'MULTI_SESI',
      status: 'ACTIVE'
    }
  });

  const tp = await prisma.tahunPelajaran.create({
    data: {
      tenant_id: tenant.id,
      tahun: '2025/2026',
      is_active: true,
      tanggal_mulai: new Date(),
      tanggal_selesai: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    }
  });

  const sem = await prisma.semester.create({
    data: {
      tenant_id: tenant.id,
      tahun_pelajaran_id: tp.id,
      nama_semester: 'Ganjil',
      is_active: true,
      tanggal_mulai: new Date(),
      tanggal_selesai: new Date(new Date().setMonth(new Date().getMonth() + 6))
    }
  });

  // Create Jurusan (Required for Kelas)
  const jurusan = await prisma.jurusan.create({
    data: {
      tenant_id: tenant.id,
      kode_jurusan: 'IPA',
      nama_jurusan: 'Ilmu Pengetahuan Alam'
    }
  });

  // 3. Setup Siswa & Kelas
  const kelas = await prisma.kelas.create({
    data: {
      tenant_id: tenant.id,
      nama_kelas: 'X-TEST',
      tingkat: 10,
      jurusan_id: jurusan.id
    }
  });

  const roleSiswa = await prisma.role.findFirst({ where: { name: 'SISWA' } });
  
  const user = await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      email: email,
      password: 'password123',
      full_name: 'Siswa Propagation',
      role_id: roleSiswa?.id || 'uuid-placeholder',
      status: 'ACTIVE'
    }
  });

  const siswa = await prisma.siswa.create({
    data: {
      tenant_id: tenant.id,
      user_id: user.id,
      nis: '12345678',
      nisn: '0012345678',
      status: 'AKTIF',
      jenis_kelamin: 'L',
      tanggal_lahir: new Date(),
      tempat_lahir: 'Jakarta',
      alamat: 'Jl. Test',
      nama_siswa: 'Siswa Propagation',
      kelas_id: kelas.id
    }
  });

  const siswaAkademik = await prisma.siswaAkademik.create({
    data: {
      siswa_id: siswa.id,
      kelas_id: kelas.id,
      tahun_pelajaran_id: tp.id,
      semester_id: sem.id,
      status: 'AKTIF'
    }
  });

  // 4. Create SesiAbsensi (Simulate Job)
  // Need Mapel & Guru first
  const mapel = await prisma.mapel.create({
    data: {
      tenant_id: tenant.id,
      nama_mapel: 'Matematika',
      kode_mapel: 'MTK'
    }
  });

  // Create minimal Guru user
  const guruUser = await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      email: 'guru.prop@example.com',
      password: 'password',
      full_name: 'Guru Test',
      role_id: roleSiswa?.id || 'uuid' // Just need a user
    }
  });

  const guru = await prisma.guru.create({
    data: {
      tenant_id: tenant.id,
      user_id: guruUser.id,
      nip: '99999',
      nama_guru: 'Guru Test'
    }
  });

  const sesi = await prisma.sesiAbsensi.create({
    data: {
      tenant_id: tenant.id,
      kelas_id: kelas.id,
      mapel_id: mapel.id,
      guru_id: guru.id,
      tahun_pelajaran_id: tp.id,
      semester_id: sem.id,
      tanggal: new Date(),
      waktu_mulai: new Date(),
      waktu_selesai: new Date(new Date().getTime() + 3600000),
      status: 'SCHEDULED',
      sumber_sesi: 'MANUAL' 
    }
  });
  
  // Create AbsenSiswa for this sesi
  await prisma.absenSiswa.create({
    data: {
      tenant_id: tenant.id,
      sesi_id: sesi.id,
      siswa_id: siswa.id,
      siswa_akademik_id: siswaAkademik.id,
      status: 'ALPA'
    }
  });

  console.log('Setup complete. Sesi Created with status ALPA.');

  // 5. Action: Set IZIN at Gerbang
  console.log('Submitting Manual IZIN...');
  await absensiManualService.submit(tenant.id, siswa.id, 'IZIN', new Date(), 'Sakit perut');

  // 6. Verify
  const updatedAbsenSiswa = await prisma.absenSiswa.findFirst({
    where: { sesi_id: sesi.id, siswa_id: siswa.id }
  });

  console.log('Result Status in Sesi KBM:', updatedAbsenSiswa?.status);

  if (updatedAbsenSiswa?.status === 'IZIN') {
    console.log('SUCCESS: Propagation worked!');
  } else {
    console.error('FAILURE: Propagation failed. Status is ' + updatedAbsenSiswa?.status);
  }

  // Cleanup
  await prisma.absenSiswa.deleteMany({ where: { sesi_id: sesi.id } });
  await prisma.sesiAbsensi.delete({ where: { id: sesi.id } });
  await prisma.absenGerbangSiswa.deleteMany({ where: { siswa_id: siswa.id } });
  await prisma.siswaAkademik.deleteMany({ where: { siswa_id: siswa.id } });
  await prisma.siswa.delete({ where: { id: siswa.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.user.delete({ where: { id: guruUser.id } });
  await prisma.kelas.delete({ where: { id: kelas.id } });
   await prisma.jurusan.delete({ where: { id: jurusan.id } });
   await prisma.mapel.delete({ where: { id: mapel.id } });
  await prisma.guru.delete({ where: { id: guru.id } });
  await prisma.semester.delete({ where: { id: sem.id } });
  await prisma.tahunPelajaran.delete({ where: { id: tp.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
