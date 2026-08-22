import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function simulateTuTabs() {
  console.log('📊 [SIMULASI TAB SWITCHER UNTUK SELURUH AKUN TU DI DEMO]...\n');

  const tuUsers = [
    { email: 'tu@absenta.id', roleTitle: 'Kepala Tata Usaha (TU_KEPALA)' },
    { email: 'tu.kepegawaian@absenta.id', roleTitle: 'TU Kepegawaian & Dapodik (TU_KEPEGAWAIAN)' },
    { email: 'tu.persuratan@absenta.id', roleTitle: 'TU Persuratan & Agenda Dinas (TU_PERSURATAN)' },
    { email: 'tu.keuangan@absenta.id', roleTitle: 'TU Keuangan & SPP (TU_KEUANGAN)' },
    { email: 'tu.sarpras@absenta.id', roleTitle: 'TU Sarpras & Pengurus Barang KIB (TU_SARPRAS)' }
  ];

  for (const u of tuUsers) {
    const user = await prisma.user.findFirst({
      where: { tenant_id: DEMO_ID, email: u.email },
      include: {
        Role: true,
        organizationalAssignments: {
          include: { Position: true }
        },
        Guru: true
      }
    });

    if (!user) {
      console.log(`❌ User ${u.email} tidak ditemukan`);
      continue;
    }

    const positions = (user.organizationalAssignments || []).map((a: any) => a.Position?.code);
    const roleName = user.Role?.name;
    const isPendidik = false;
    const isPureGerbangStaff = false;
    const isAdminRole = roleName === 'ADMIN' || roleName === 'SUPERADMIN';

    // Evaluasi persona helpers
    const isWaliKelas = positions.includes('WALIKELAS');
    const isKurikulum = positions.includes('KURIKULUM');
    const isKesiswaan = positions.includes('KESISWAAN');
    const isSarpras = positions.includes('SARPRAS') || positions.includes('TU_SARPRAS');
    const isToolman = positions.includes('TOOLMAN');
    const isKabeng = positions.includes('KABENG');
    const isHubin = positions.includes('HUBIN');
    const isBkk = positions.includes('BKK');
    const isKaprog = positions.includes('KAPROG');
    const isKoperasi = positions.some(p => p.includes('KOPERASI'));
    const isBpbk = positions.includes('BPBK');
    const isTUKepegawaian = positions.includes('TU_KEPEGAWAIAN');
    const isTUPersuratan = positions.includes('TU_PERSURATAN');
    const isTUKeuangan = positions.includes('TU_KEUANGAN');
    const isTUSarpras = positions.includes('TU_SARPRAS');
    const isTUKepala = positions.includes('TU_KEPALA');
    const isTU = isTUKepala || isTUPersuratan || isTUKeuangan || isTUKepegawaian || isTUSarpras || positions.includes('TU');

    // Evaluasi tab list
    const visibleTabs: string[] = [];

    if (isAdminRole) visibleTabs.push('Dashboard Admin');
    if ((isPendidik || isPureGerbangStaff) && !isAdminRole) visibleTabs.push('Beranda Guru / Scan Gerbang');
    if (isWaliKelas) visibleTabs.push('Wali Kelas');
    if (isKurikulum || isAdminRole) visibleTabs.push('Kurikulum');
    if (isKesiswaan || isAdminRole) visibleTabs.push('Kesiswaan');
    if (isSarpras || isToolman || isKabeng || isAdminRole) visibleTabs.push('Sarpras');
    if (isHubin || isBkk || isKaprog || isAdminRole) visibleTabs.push('Hubin');
    if (isKoperasi || isAdminRole) visibleTabs.push('Koperasi');
    if (isBpbk || isAdminRole) visibleTabs.push('BP/BK');
    if (isTUKepegawaian || isTU || isAdminRole) visibleTabs.push('TU Kepegawaian');
    visibleTabs.push('Profil Guru / Staf');

    console.log(`👤 Akun: ${user.full_name} (${user.email})`);
    console.log(`   Jabatan: ${u.roleTitle}`);
    console.log(`   Position Codes: [${positions.join(', ')}]`);
    console.log(`   Base Role: ${roleName}`);
    console.log(`   👉 Tab yang Terlihat (${visibleTabs.length} Tab): [${visibleTabs.join(' | ')}]`);
    console.log('---------------------------------------------------------');
  }
}

simulateTuTabs()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
