import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { DEMO_PARENT_MAGIC_TOKEN } from './setup-demo-parent-magic-token';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

export async function unifyDemoClassEcosystem() {
  console.log('🚀 [PENYELARASAN 100% SATU KELAS DEMO: GURU MAPEL, WALI KELAS, SISWA, PETUGAS KELAS & ORTU]...\n');

  // 1. Target Kelas Utama: X TJKT 1 (diajar oleh Erwin Demo)
  const targetKelas = await prisma.kelas.findFirst({
    where: { tenant_id: DEMO_ID, nama_kelas: 'X TJKT 1' }
  });

  if (!targetKelas) {
    throw new Error('Kelas target X TJKT 1 tidak ditemukan!');
  }

  console.log(`🏛️  KELAS EKOSISTEM DEMO: ${targetKelas.nama_kelas} (ID: ${targetKelas.id})`);

  const defaultHash = await bcrypt.hash('password123', 10);
  const roleMap: Record<string, string> = {};
  (await prisma.role.findMany({ where: { tenant_id: DEMO_ID } })).forEach(r => {
    roleMap[r.name.toUpperCase()] = r.id;
  });
  const roleSiswaId = roleMap['SISWA'];
  const roleGuruId = roleMap['GURU'];

  const posMap: Record<string, string> = {};
  (await prisma.organizationalPosition.findMany({ where: { tenant_id: DEMO_ID } })).forEach(p => {
    posMap[p.code.toUpperCase()] = p.id;
  });

  // 2. Setup GURU MAPEL: Erwin Demo (Jadwal KBM IPAS di X TJKT 1)
  const erwin = await prisma.guru.findFirst({
    where: {
      tenant_id: DEMO_ID,
      nama_guru: { contains: 'Erwin', mode: 'insensitive' },
      JadwalKBM: { some: { kelas_id: targetKelas.id } }
    },
    include: { User: true }
  });

  if (erwin) {
    await prisma.user.update({
      where: { id: erwin.user_id },
      data: {
        email: 'guru@absenta.id',
        full_name: 'Erwin Demo',
        password: defaultHash,
        status: 'ACTIVE'
      }
    });
    console.log(`✔ [1/5] Guru Mapel : ${erwin.nama_guru} -> Email: guru@absenta.id (Mengajar IPAS di ${targetKelas.nama_kelas})`);
  }

  // 3. Setup WALI KELAS: walikelas@absenta.id (Wali Kelas X TJKT 1)
  let waliUser = await prisma.user.findFirst({
    where: { tenant_id: DEMO_ID, email: 'walikelas@absenta.id' },
    include: { Guru: true }
  });

  if (!waliUser) {
    // Cari guru perempuan untuk wali kelas
    const femaleTeacher = await prisma.guru.findFirst({
      where: { tenant_id: DEMO_ID, nama_guru: { contains: 'Ai', mode: 'insensitive' } }
    });
    if (femaleTeacher) {
      waliUser = await prisma.user.update({
        where: { id: femaleTeacher.user_id },
        data: {
          email: 'walikelas@absenta.id',
          full_name: 'Ai Kustiani Demo',
          password: defaultHash,
          role_id: roleGuruId,
          status: 'ACTIVE'
        },
        include: { Guru: true }
      });
    }
  }

  if (waliUser) {
    // Set assignment WALIKELAS kelas_id = targetKelas.id
    await prisma.organizationalAssignment.deleteMany({
      where: {
        tenant_id: DEMO_ID,
        Position: { code: 'WALIKELAS' },
        kelas_id: targetKelas.id
      }
    });

    await prisma.organizationalAssignment.create({
      data: {
        id: randomUUID(),
        tenant_id: DEMO_ID,
        user_id: waliUser.id,
        position_id: posMap['WALIKELAS'],
        kelas_id: targetKelas.id,
        is_active: true
      }
    });

    console.log(`✔ [2/5] Wali Kelas : ${waliUser.full_name} -> Email: walikelas@absenta.id (Wali Kelas ${targetKelas.nama_kelas})`);
  }

  // 4. Ambil 2 Siswa pertama di Kelas X TJKT 1
  const studentsInClass = await prisma.siswa.findMany({
    where: { tenant_id: DEMO_ID, kelas_id: targetKelas.id, status: 'AKTIF' },
    include: { User: true },
    orderBy: { created_at: 'asc' },
    take: 2
  });

  if (studentsInClass.length < 2) {
    throw new Error('Siswa di kelas X TJKT 1 kurang dari 2.');
  }

  const studentTarget = studentsInClass[0]; // Siswa Utama (siswa@absenta.id)
  const officerTarget = studentsInClass[1]; // Petugas Kelas (petugas.kelas@absenta.id)

  // 4a. Setup SISWA: siswa@absenta.id
  // Arsipkan email siswa@absenta.id jika menempel di user lain
  const oldSiswaUser = await prisma.user.findFirst({
    where: { tenant_id: DEMO_ID, email: 'siswa@absenta.id', id: { not: studentTarget.user_id || '' } }
  });
  if (oldSiswaUser) {
    await prisma.user.update({
      where: { id: oldSiswaUser.id },
      data: { email: `siswa.old.${Date.now()}@demo.absenta.id` }
    });
  }

  let studentUserId = studentTarget.user_id;
  if (!studentUserId) {
    studentUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: studentUserId,
        tenant_id: DEMO_ID,
        email: 'siswa@absenta.id',
        full_name: studentTarget.nama_siswa,
        password: defaultHash,
        role_id: roleSiswaId,
        status: 'ACTIVE'
      }
    });
    await prisma.siswa.update({
      where: { id: studentTarget.id },
      data: { user_id: studentUserId }
    });
  } else {
    await prisma.user.update({
      where: { id: studentUserId },
      data: {
        email: 'siswa@absenta.id',
        full_name: studentTarget.nama_siswa,
        password: defaultHash,
        role_id: roleSiswaId,
        status: 'ACTIVE'
      }
    });
  }
  console.log(`✔ [3/5] Siswa Demo  : [${studentTarget.nis}] ${studentTarget.nama_siswa} -> Email: siswa@absenta.id (Murid ${targetKelas.nama_kelas})`);

  // 4b. Setup PETUGAS KELAS: petugas.kelas@absenta.id
  const oldOfficerUser = await prisma.user.findFirst({
    where: { tenant_id: DEMO_ID, email: 'petugas.kelas@absenta.id', id: { not: officerTarget.user_id || '' } }
  });
  if (oldOfficerUser) {
    await prisma.user.update({
      where: { id: oldOfficerUser.id },
      data: { email: `officer.old.${Date.now()}@demo.absenta.id` }
    });
  }

  let officerUserId = officerTarget.user_id;
  if (!officerUserId) {
    officerUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: officerUserId,
        tenant_id: DEMO_ID,
        email: 'petugas.kelas@absenta.id',
        full_name: officerTarget.nama_siswa,
        password: defaultHash,
        role_id: roleSiswaId,
        status: 'ACTIVE'
      }
    });
    await prisma.siswa.update({
      where: { id: officerTarget.id },
      data: { user_id: officerUserId }
    });
  } else {
    await prisma.user.update({
      where: { id: officerUserId },
      data: {
        email: 'petugas.kelas@absenta.id',
        full_name: officerTarget.nama_siswa,
        password: defaultHash,
        role_id: roleSiswaId,
        status: 'ACTIVE'
      }
    });
  }

  // Berikan jabatan fungsional PETUGAS_KELAS untuk kelas target
  await prisma.organizationalAssignment.deleteMany({
    where: {
      tenant_id: DEMO_ID,
      user_id: officerUserId
    }
  });

  await prisma.organizationalAssignment.create({
    data: {
      id: randomUUID(),
      tenant_id: DEMO_ID,
      user_id: officerUserId,
      position_id: posMap['PETUGAS_KELAS'],
      kelas_id: targetKelas.id,
      is_active: true
    }
  });
  console.log(`✔ [4/5] Petugas Kls : [${officerTarget.nis}] ${officerTarget.nama_siswa} -> Email: petugas.kelas@absenta.id (Sekretaris Kelas ${targetKelas.nama_kelas})`);

  // 5. Setup ORANG TUA: Bapak Hartono Demo (Tautkan ke Siswa Utama studentTarget di X TJKT 1)
  let parent = await prisma.orangTua.findFirst({
    where: { tenant_id: DEMO_ID, no_hp: '081234567890' }
  });

  if (!parent) {
    parent = await prisma.orangTua.create({
      data: {
        id: randomUUID(),
        tenant_id: DEMO_ID,
        nama: 'Bapak Hartono Demo',
        no_hp: '081234567890',
        hubungan: 'AYAH'
      }
    });
  }

  // Tautkan ke studentTarget di X TJKT 1
  await prisma.orangTuaSiswa.deleteMany({
    where: { orang_tua_id: parent.id }
  });

  await prisma.orangTuaSiswa.create({
    data: {
      id: randomUUID(),
      orang_tua_id: parent.id,
      siswa_id: studentTarget.id
    }
  });

  // Perbarui Magic Token Orang Tua
  await prisma.parentAccessToken.deleteMany({
    where: { orang_tua_id: parent.id }
  });

  const expiredAt = new Date();
  expiredAt.setFullYear(expiredAt.getFullYear() + 5);

  await prisma.parentAccessToken.create({
    data: {
      id: randomUUID(),
      orang_tua_id: parent.id,
      token: DEMO_PARENT_MAGIC_TOKEN,
      expired_at: expiredAt,
      is_active: true
    }
  });

  console.log(`✔ [5/5] Orang Tua   : ${parent.nama} -> Magic Token Taut ke Anak: ${studentTarget.nama_siswa} (${targetKelas.nama_kelas})`);

  console.log('\n================ RINGKASAN EKOSISTEM SATU KELAS DEMO ================');
  console.log(`🏛️  Kelas Terpadu : ${targetKelas.nama_kelas}`);
  console.log(`👨‍🏫 Guru Mapel    : Erwin Demo (Mapel IPAS) -> guru@absenta.id`);
  console.log(`👩‍🏫 Wali Kelas    : Ai Kustiani Demo (Wali Kelas) -> walikelas@absenta.id`);
  console.log(`🎒 Murid         : ${studentTarget.nama_siswa} -> siswa@absenta.id`);
  console.log(`📝 Sekretaris Kls: ${officerTarget.nama_siswa} (Petugas Presensi) -> petugas.kelas@absenta.id`);
  console.log(`👨‍👩‍👧 Orang Tua     : ${parent.nama} (Ayah dari ${studentTarget.nama_siswa}) -> Magic Token`);
  console.log('=====================================================================');
  console.log('🎉 SEMUA 5 PERAN DEMO KINI TERSINKRONISASI 100% DALAM SATU KELAS YANG SAMA!');
}

if (require.main === module) {
  unifyDemoClassEcosystem().catch(console.error).finally(() => prisma.$disconnect());
}
