import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

const DEMO_EMAILS = [
  { email: 'admin@absenta.id', role: 'ADMIN', name: 'Administrator Sekolah (Demo)', position: null },
  { email: 'kepsek@absenta.id', role: 'ADMIN', name: 'Dr. H. Ahmad Fauzi, M.Pd', position: 'KEPALA_SEKOLAH' },
  { email: 'kurikulum@absenta.id', role: 'ADMIN', name: 'Dra. Hj. Siti Rahma, M.Pd', position: 'KURIKULUM' },
  { email: 'kesiswaan@absenta.id', role: 'ADMIN', name: 'Budi Santoso, S.Pd', position: 'KESISWAAN' },
  { email: 'hubin@absenta.id', role: 'ADMIN', name: 'Agus Setiawan, S.T', position: 'HUBIN' },
  { email: 'sarpras@absenta.id', role: 'ADMIN', name: 'Ir. Hendra Gunawan', position: 'SARPRAS' },
  { email: 'tu@absenta.id', role: 'ADMIN', name: 'Ahmad Hidayat, S.AP', position: 'TU_KEPALA' },
  { email: 'bpbk@absenta.id', role: 'GURU', name: 'Nurul Aini, S.Psi', position: 'BPBK' },
  { email: 'bkk@absenta.id', role: 'GURU', name: 'Denny Ramdani, S.Pd', position: 'BKK' },
  { email: 'kaprog@absenta.id', role: 'GURU', name: 'Indra Lesmana, M.Kom', position: 'KAPROG' },
  { email: 'kabeng@absenta.id', role: 'GURU', name: 'Mulyadi, S.T', position: 'KABENG' },
  { email: 'toolman@absenta.id', role: 'GURU', name: 'Asep Supriatna', position: 'TOOLMAN' },
  { email: 'gerbang@absenta.id', role: 'GURU', name: 'Rudi Hermawan', position: 'GERBANG' },
  { email: 'tu.persuratan@absenta.id', role: 'ADMIN', name: 'Fitri Handayani, S.Sos', position: 'TU_PERSURATAN' },
  { email: 'tu.keuangan@absenta.id', role: 'ADMIN', name: 'Dewi Lestari, S.E', position: 'TU_KEUANGAN' },
  { email: 'tu.kepegawaian@absenta.id', role: 'ADMIN', name: 'Ginanzhar Sudiarto, S.Kom', position: 'TU_KEPEGAWAIAN' },
  { email: 'tu.sarpras@absenta.id', role: 'ADMIN', name: 'Depi Kurniawan', position: 'TU_SARPRAS' },
  { email: 'koperasi.ketua@absenta.id', role: 'GURU', name: 'Siti Maryam, S.E', position: 'KETUA_KOPERASI' },
  { email: 'koperasi.bendahara@absenta.id', role: 'GURU', name: 'Rina Marlina, S.Pd', position: 'BENDAHARA_KOPERASI' },
  { email: 'koperasi.sekretaris@absenta.id', role: 'GURU', name: 'Eka Pratiwi, S.Pd', position: 'SEKRETARIS_KOPERASI' },
  { email: 'koperasi.manajer@absenta.id', role: 'GURU', name: 'Doni Prasetyo, S.E', position: 'MANAJER_TOKO_KOPERASI' },
  { email: 'koperasi.pengawas@absenta.id', role: 'GURU', name: 'H. Suryana, M.M', position: 'PENGAWAS_KOPERASI' },
  { email: 'guru.matematika@absenta.id', role: 'GURU', name: 'Sri Wahyuni, S.Pd', position: null },
  { email: 'guru.produktif@absenta.id', role: 'GURU', name: 'Rian Hidayat, S.T', position: null },
  { email: 'walikelas@absenta.id', role: 'GURU', name: 'Endang Kurnia, S.Pd', position: 'WALIKELAS' },
  { email: 'pembina.pramuka@absenta.id', role: 'GURU', name: 'Yayan Sofyan, S.Pd', position: 'PEMBINA_ESKUL' },
  { email: 'siswa.rpl@absenta.id', role: 'SISWA', name: 'Fikri Haikal Rahman', position: null },
  { email: 'siswa.tkr@absenta.id', role: 'SISWA', name: 'Bagas Aditya Pratama', position: null },
  { email: 'ortu@absenta.id', role: 'ORANG_TUA', name: 'Herman Susilo (Wali Fikri)', position: null }
];

async function checkAndCreateAllDemoUsers() {
  console.log('🔍 Memeriksa seluruh akun demo di Tenant Demo...');

  const roles = await prisma.role.findMany({ where: { tenant_id: DEMO_ID } });
  const roleMap: Record<string, string> = {};
  roles.forEach(r => { roleMap[r.name] = r.id; });
  console.log('Role Map Demo:', roleMap);

  const defaultHash = await bcrypt.hash('password123', 10);
  const positions = await prisma.organizationalPosition.findMany({ where: { tenant_id: DEMO_ID } });

  let createdCount = 0;
  let updatedCount = 0;

  for (const item of DEMO_EMAILS) {
    const targetRoleId = roleMap[item.role] || roleMap['ADMIN'];
    
    let user = await prisma.user.findFirst({
      where: { tenant_id: DEMO_ID, email: item.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: randomUUID(),
          tenant_id: DEMO_ID,
          email: item.email,
          full_name: item.name,
          password: defaultHash,
          role_id: targetRoleId,
          status: 'ACTIVE',
          email_verified: true,
        }
      });
      console.log(`➕ Dibuat User baru: ${item.email} (${item.name}) -> Role: ${item.role}`);
      createdCount++;
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: defaultHash,
          role_id: targetRoleId,
          status: 'ACTIVE',
          email_verified: true,
        }
      });
      console.log(`✔ User diupdate password & role: ${item.email}`);
      updatedCount++;
    }

    // Jika memiliki peran jabatan struktural, pastikan ada assignment di OrganizationalAssignment
    if (item.position) {
      const pos = positions.find(p => p.code === item.position || p.name.toLowerCase().includes(item.position.toLowerCase()));
      if (pos) {
        const existingAssign = await prisma.organizationalAssignment.findFirst({
          where: { tenant_id: DEMO_ID, user_id: user.id, position_id: pos.id }
        });
        if (!existingAssign) {
          await prisma.organizationalAssignment.create({
            data: {
              id: randomUUID(),
              tenant_id: DEMO_ID,
              user_id: user.id,
              position_id: pos.id,
              is_active: true
            }
          });
          console.log(`   🏛️  Assignment posisi ${item.position} dibuat untuk ${item.email}`);
        }
      }
    }

    // Jika peran GURU, pastikan profil Guru dibuat/terhubung
    if (item.role === 'GURU') {
      const existingGuru = await prisma.guru.findFirst({
        where: { tenant_id: DEMO_ID, user_id: user.id }
      });
      if (!existingGuru) {
        await prisma.guru.create({
          data: {
            id: randomUUID(),
            tenant_id: DEMO_ID,
            user_id: user.id,
            nama_guru: item.name,
            nip: `1985${Math.floor(10000000000000 + Math.random() * 90000000000000)}`,
          }
        });
        console.log(`   👨‍🏫 Profil Guru dibuat untuk ${item.email}`);
      }
    }

    // Jika peran SISWA, pastikan profil Siswa terhubung
    if (item.role === 'SISWA') {
      const existingSiswa = await prisma.siswa.findFirst({
        where: { tenant_id: DEMO_ID, user_id: user.id }
      });
      if (!existingSiswa) {
        const anyKelas = await prisma.kelas.findFirst({ where: { tenant_id: DEMO_ID } });
        const uniqueNis = `DEMO${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
        await prisma.siswa.create({
          data: {
            id: randomUUID(),
            tenant_id: DEMO_ID,
            user_id: user.id,
            nama_siswa: item.name,
            nis: uniqueNis,
            jenis_kelamin: 'L',
            kelas_id: anyKelas?.id,
          }
        });
        console.log(`   🎒 Profil Siswa dibuat untuk ${item.email} (NIS: ${uniqueNis})`);
      }
    }
  }

  console.log(`\n🎉 SELESAI! Dibuat: ${createdCount}, Diupdate: ${updatedCount}. Semua kredensial peran demo aktif dengan password: password123`);
}

checkAndCreateAllDemoUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
