import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function bindRealTeachersToDemoRoles() {
  console.log('🚀 [BINDING REAL POSITION HOLDERS WITH SCHEDULES TO DEMO ACCOUNTS]...\n');

  const defaultHash = await bcrypt.hash('password123', 10);

  // Daftar mapping akun demo -> Nama Guru Riil di Database
  const bindings = [
    {
      demoEmail: 'kurikulum@absenta.id',
      realTeacherName: 'TRISNAWATI, S.T.',
      posCode: 'KURIKULUM',
      role: 'ADMIN',
      note: 'Waka Kurikulum Riil (24 Jadwal Mengajar)'
    },
    {
      demoEmail: 'kesiswaan@absenta.id',
      realTeacherName: 'RENO, S.Pd.',
      posCode: 'KESISWAAN',
      role: 'ADMIN',
      note: 'Waka Kesiswaan Riil (14 Jadwal Mengajar)'
    },
    {
      demoEmail: 'hubin@absenta.id',
      realTeacherName: 'Samsurizal Manahan Tan., M.Pd.',
      posCode: 'HUBIN',
      role: 'ADMIN',
      note: 'Waka Hubin Riil (44 Jadwal Mengajar)'
    },
    {
      demoEmail: 'sarpras@absenta.id',
      realTeacherName: 'SAEPULOH, S.Pd.',
      posCode: 'SARPRAS',
      role: 'ADMIN',
      note: 'Waka Sarpras Riil (21 Jadwal Mengajar)'
    },
    {
      demoEmail: 'walikelas@absenta.id',
      realTeacherName: 'Ai Kustiani, S.Pd.',
      posCode: 'WALIKELAS',
      role: 'GURU',
      note: 'Wali Kelas Riil (31 Jadwal Mengajar)'
    },
    {
      demoEmail: 'kaprog@absenta.id',
      realTeacherName: 'Annisa Ropiatusholihah, S.Pd',
      posCode: 'KAPROG',
      role: 'GURU',
      note: 'Ketua Program Riil (32 Jadwal Mengajar)'
    },
    {
      demoEmail: 'guru.matematika@absenta.id',
      realTeacherName: 'SITI PATIMAH, S.Pd.',
      posCode: null,
      role: 'GURU',
      note: 'Guru Matematika Riil (44 Jadwal Mengajar)'
    },
    {
      demoEmail: 'guru.produktif@absenta.id',
      realTeacherName: 'ASEP SANDIANA AZHAR, S.T.',
      posCode: null,
      role: 'GURU',
      note: 'Guru Produktif Teknik Riil (42 Jadwal Mengajar)'
    },
    {
      demoEmail: 'bpbk@absenta.id',
      realTeacherName: 'SHINTA RANIAWITRI, S.Psi.',
      posCode: 'BPBK',
      role: 'GURU',
      note: 'Koordinator BP/BK Riil (Layanan Konseling & Bimbingan)'
    }
  ];

  const roles = await prisma.role.findMany({ where: { tenant_id: DEMO_ID } });
  const roleMap: Record<string, string> = {};
  roles.forEach(r => { roleMap[r.name] = r.id; });

  const positions = await prisma.organizationalPosition.findMany({ where: { tenant_id: DEMO_ID } });

  for (const b of bindings) {
    // Cari guru riil di database
    const guru = await prisma.guru.findFirst({
      where: {
        tenant_id: DEMO_ID,
        nama_guru: { contains: b.realTeacherName.replace(/\s*\(Demo\)$/i, ''), mode: 'insensitive' }
      },
      include: { User: true }
    });

    if (!guru) {
      console.warn(`⚠️ Guru '${b.realTeacherName}' tidak ditemukan di Demo!`);
      continue;
    }

    const targetRoleId = roleMap[b.role] || roleMap['GURU'];

    if (guru.user_id) {
      // Ubah email user lama yang bentrok jika berbeda user_id
      const existingUserWithEmail = await prisma.user.findFirst({
        where: { tenant_id: DEMO_ID, email: b.demoEmail }
      });
      if (existingUserWithEmail && existingUserWithEmail.id !== guru.user_id) {
        await prisma.user.update({
          where: { id: existingUserWithEmail.id },
          data: { email: `unused.${Date.now()}.${existingUserWithEmail.id.slice(0, 5)}@demo.absenta.id` }
        });
      }

      // Update email akun user guru tersebut ke demoEmail, set password123, dan aktifkan role
      await prisma.user.update({
        where: { id: guru.user_id },
        data: {
          email: b.demoEmail,
          password: defaultHash,
          role_id: targetRoleId,
          status: 'ACTIVE',
          email_verified: true,
        }
      });
      console.log(`✅ [BINDED] ${b.demoEmail.padEnd(26)} -> Guru: ${guru.nama_guru} (User ID: ${guru.user_id}) | ${b.note}`);
    }

    // Pastikan assignment jabatan struktural ada jika ada posCode
    if (b.posCode && guru.user_id) {
      const pos = positions.find(p => p.code === b.posCode || p.name.toLowerCase().includes(b.posCode.toLowerCase()));
      if (pos) {
        const existingAssign = await prisma.organizationalAssignment.findFirst({
          where: { tenant_id: DEMO_ID, user_id: guru.user_id, position_id: pos.id }
        });
        if (!existingAssign) {
          await prisma.organizationalAssignment.create({
            data: {
              id: randomUUID(),
              tenant_id: DEMO_ID,
              user_id: guru.user_id,
              position_id: pos.id,
              is_active: true
            }
          });
          console.log(`   🏛️  Assignment jabatan ${b.posCode} dipasang ke ${guru.nama_guru}`);
        }
      }
    }
  }

  // Khusus BP/BK: Tambahkan beberapa sesi/jadwal Bimbingan Konseling Kelas X, XI, XII agar guru BP/BK memiliki jadwal tampil!
  const bpbkGuru = await prisma.guru.findFirst({
    where: {
      tenant_id: DEMO_ID,
      nama_guru: { contains: 'SHINTA RANIAWITRI', mode: 'insensitive' }
    }
  });

  if (bpbkGuru) {
    const existingJadwalBk = await prisma.jadwalKBM.count({
      where: { tenant_id: DEMO_ID, guru_id: bpbkGuru.id }
    });

    if (existingJadwalBk === 0) {
      console.log('\n📅 Menambahkan Jadwal Bimbingan Konseling untuk Koordinator BP/BK...');
      const tp = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: DEMO_ID, is_active: true } });
      const sem = await prisma.semester.findFirst({ where: { tenant_id: DEMO_ID, is_active: true } });
      const kelases = await prisma.kelas.findMany({ where: { tenant_id: DEMO_ID }, take: 4 });

      // Pastikan ada Mapel BP/BK
      let mapelBk = await prisma.mapel.findFirst({
        where: { tenant_id: DEMO_ID, nama_mapel: { contains: 'Bimbingan Konseling', mode: 'insensitive' } }
      });
      if (!mapelBk) {
        mapelBk = await prisma.mapel.create({
          data: {
            id: randomUUID(),
            tenant_id: DEMO_ID,
            kode_mapel: 'BPBK',
            nama_mapel: 'Bimbingan Konseling (BP/BK)',
          }
        });
      }

      if (tp && sem) {
        const days: ('SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT')[] = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];
        const slots = [
          { slot: 1, mulai: '07:15', selesai: '08:35' },
          { slot: 2, mulai: '08:35', selesai: '09:55' },
          { slot: 3, mulai: '10:15', selesai: '11:35' },
          { slot: 4, mulai: '12:30', selesai: '13:50' },
          { slot: 5, mulai: '13:50', selesai: '15:10' },
        ];

        let inserted = 0;
        for (const k of kelases) {
          for (const d of days) {
            for (const s of slots) {
              const conflictKelas = await prisma.jadwalKBM.findFirst({
                where: {
                  tenant_id: DEMO_ID,
                  kelas_id: k.id,
                  tahun_pelajaran_id: tp.id,
                  semester_id: sem.id,
                  hari: d,
                  slot_index: s.slot
                }
              });

              const conflictGuru = await prisma.jadwalKBM.findFirst({
                where: {
                  tenant_id: DEMO_ID,
                  guru_id: bpbkGuru.id,
                  tahun_pelajaran_id: tp.id,
                  semester_id: sem.id,
                  hari: d,
                  jam_mulai: s.mulai,
                  jam_selesai: s.selesai
                }
              });

              if (!conflictKelas && !conflictGuru) {
                await prisma.jadwalKBM.create({
                  data: {
                    id: randomUUID(),
                    tenant_id: DEMO_ID,
                    tahun_pelajaran_id: tp.id,
                    semester_id: sem.id,
                    kelas_id: k.id,
                    hari: d,
                    slot_index: s.slot,
                    jam_mulai: s.mulai,
                    jam_selesai: s.selesai,
                    mapel_id: mapelBk.id,
                    guru_id: bpbkGuru.id,
                    jenis_kegiatan: 'KBM'
                  }
                });
                inserted++;
                break;
              }
            }
            if (inserted >= 6) break;
          }
          if (inserted >= 6) break;
        }
        console.log(`   ✔ ${inserted} Jadwal Bimbingan Konseling disematkan ke Guru BP/BK (${bpbkGuru.nama_guru})`);
      }
    }
  }

  console.log('\n🎉 SEMUA AKUN DEMO KINI 100% TERHUBUNG KE GURU PEMEGANG JABATAN ASLI DENGAN JADWAL LENGKAP!');
}

bindRealTeachersToDemoRoles().catch(console.error).finally(() => prisma.$disconnect());
