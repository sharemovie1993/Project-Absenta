import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { STRUKTUR_CODES } from '../config/organization-structure';

const prisma = new PrismaClient();

async function exportAndSanitize() {
  console.log('🚀 [DEMO EXPORTER] Memulai ekstraksi dan sanitasi data produksi SMKN 1 Plered...');

  const SOURCE_TENANT_SUBDOMAIN = 'smkn1pld';
  const sourceTenant = await prisma.tenant.findFirst({
    where: { subdomain: SOURCE_TENANT_SUBDOMAIN }
  });

  if (!sourceTenant) {
    throw new Error(`Tenant sumber dengan subdomain "${SOURCE_TENANT_SUBDOMAIN}" tidak ditemukan.`);
  }

  const sId = sourceTenant.id;
  console.log(`📦 Tenant Sumber: ${sourceTenant.name} (ID: ${sId})`);

  const DEFAULT_HASH = await bcrypt.hash('password123', 10);

  // 1. Tahun Pelajaran & Semester
  const tahunPelajarans = await prisma.tahunPelajaran.findMany({ where: { tenant_id: sId } });
  const semesters = await prisma.semester.findMany({ where: { tenant_id: sId } });

  // 2. Jurusan & Kelas
  const jurusans = await prisma.jurusan.findMany({ where: { tenant_id: sId } });
  const kelases = await prisma.kelas.findMany({ where: { tenant_id: sId } });

  // 3. Jenis Kegiatan Master (Eskul dll)
  const jenisKegiatans = await prisma.jenisKegiatanMaster.findMany({ where: { tenant_id: sId } });

  // 4. Mata Pelajaran
  const matapelajarans = await prisma.mapel.findMany({ where: { tenant_id: sId } });

  // 5. Organizational Position & Assignments
  const positions = await prisma.organizationalPosition.findMany({
    where: { tenant_id: sId },
    include: { jobdesk: true }
  });
  const assignments = await prisma.organizationalAssignment.findMany({ where: { tenant_id: sId } });

  // 6. Guru & Users
  const gurus = await prisma.guru.findMany({
    where: { tenant_id: sId },
    include: { User: true }
  });

  // 7. Siswa & Users
  const siswas = await prisma.siswa.findMany({
    where: { tenant_id: sId },
    include: { User: true }
  });

  console.log(`📊 Statistik Ekstraksi:`);
  console.log(`   - Tahun Pelajaran: ${tahunPelajarans.length}`);
  console.log(`   - Jurusan: ${jurusans.length}`);
  console.log(`   - Kelas: ${kelases.length}`);
  console.log(`   - Guru & Tendik: ${gurus.length}`);
  console.log(`   - Siswa: ${siswas.length}`);
  console.log(`   - Posisi Struktur: ${positions.length}`);
  console.log(`   - Penugasan Struktur: ${assignments.length}`);

  // Peta Kode Struktur ke Email Demo Kanonikal
  const STRUKTUR_TO_DEMO_EMAIL: Record<string, string> = {
    [STRUKTUR_CODES.KEPALA_SEKOLAH]: 'kepsek@absenta.id',
    [STRUKTUR_CODES.KURIKULUM]: 'kurikulum@absenta.id',
    [STRUKTUR_CODES.KESISWAAN]: 'kesiswaan@absenta.id',
    [STRUKTUR_CODES.HUBIN]: 'hubin@absenta.id',
    [STRUKTUR_CODES.SARPRAS]: 'sarpras@absenta.id',
    [STRUKTUR_CODES.TU_KEPALA]: 'tu@absenta.id',
    [STRUKTUR_CODES.BPBK]: 'bpbk@absenta.id',
    [STRUKTUR_CODES.BKK]: 'bkk@absenta.id',
    [STRUKTUR_CODES.KAPROG]: 'kaprog@absenta.id',
    [STRUKTUR_CODES.KABENG]: 'kabeng@absenta.id',
    [STRUKTUR_CODES.TOOLMAN]: 'toolman@absenta.id',
    [STRUKTUR_CODES.GERBANG]: 'gerbang@absenta.id',
    [STRUKTUR_CODES.TU_PERSURATAN]: 'tu.persuratan@absenta.id',
    [STRUKTUR_CODES.TU_KEUANGAN]: 'tu.keuangan@absenta.id',
    [STRUKTUR_CODES.TU_KEPEGAWAIAN]: 'tu.kepegawaian@absenta.id',
    [STRUKTUR_CODES.TU_SARPRAS]: 'tu.sarpras@absenta.id',
    [STRUKTUR_CODES.KETUA_KOPERASI]: 'koperasi.ketua@absenta.id',
    [STRUKTUR_CODES.BENDAHARA_KOPERASI]: 'koperasi.bendahara@absenta.id',
    [STRUKTUR_CODES.SEKRETARIS_KOPERASI]: 'koperasi.sekretaris@absenta.id',
    [STRUKTUR_CODES.MANAJER_TOKO_KOPERASI]: 'koperasi.kasir@absenta.id',
    [STRUKTUR_CODES.PENGAWAS_KOPERASI]: 'koperasi.pengawas@absenta.id',
    [STRUKTUR_CODES.WALIKELAS]: 'walikelas@absenta.id',
    [STRUKTUR_CODES.PEMBINA_ESKUL]: 'eskul@absenta.id',
  };

  // Kumpulkan User ID pemegang jabatan khusus agar emailnya dijadikan email demo
  const userPositionMap: Record<string, string> = {};
  for (const assign of assignments) {
    const pos = positions.find(p => p.id === assign.position_id);
    if (pos && STRUKTUR_TO_DEMO_EMAIL[pos.code] && !Object.values(userPositionMap).includes(STRUKTUR_TO_DEMO_EMAIL[pos.code])) {
      userPositionMap[assign.user_id] = STRUKTUR_TO_DEMO_EMAIL[pos.code];
    }
  }

  // --- SANITASI DATA GURU & USER ---
  console.log('🧹 Menyaring dan menganonimkan data Guru & Pengguna...');
  const sanitizedGurus = gurus.map((g, idx) => {
    const cleanName = g.nama_guru.replace(/\s+/g, ' ').trim();
    const demoName = `${cleanName} (Demo)`;
    const originalUserId = g.user_id;
    const assignedDemoEmail = userPositionMap[originalUserId];
    const demoEmail = assignedDemoEmail || (idx === 0 ? 'guru@absenta.id' : `guru.${idx + 1}@demo.absenta.id`);

    // Masking NIP (misal 19800101 + acak)
    const fakeNip = g.nip ? `19${(80 + (idx % 20)).toString()}${(101 + (idx % 800)).toString().padStart(4, '0')}2010011${(100 + idx).toString().slice(-3)}` : null;
    const fakePhone = `081299${(100000 + idx).toString()}`;

    return {
      id: g.id,
      user_id: g.user_id,
      nama_guru: demoName,
      nip: fakeNip,
      nuptk: null,
      nik: null,
      no_kk: null,
      npwp: null,
      no_hp: fakePhone,
      alamat: 'Alamat Kampus Demo Absenta, Jawa Barat',
      status_kepegawaian: g.status_kepegawaian || 'PNS',
      jenis_ptk: g.jenis_ptk || 'PENDIDIK',
      user: {
        id: g.User?.id || originalUserId,
        email: demoEmail,
        full_name: demoName,
        password_hash: DEFAULT_HASH,
        phone: fakePhone,
        status: 'ACTIVE',
        email_verified: true,
      }
    };
  });

  // --- SANITASI DATA SISWA & USER ---
  console.log('🧹 Menyaring dan menganonimkan data Siswa...');
  const sanitizedSiswas = siswas.map((s, idx) => {
    const cleanName = s.nama_siswa.replace(/\s+/g, ' ').trim();
    const demoName = `${cleanName} (Demo)`;
    const demoNis = (20250000 + idx + 1).toString();
    const demoNisn = `00${(70000000 + idx + 1).toString()}`;
    const demoPhone = `081388${(100000 + idx).toString()}`;
    const demoEmail = idx === 0 ? 'siswa@absenta.id' : idx === 1 ? 'petugas.kelas@absenta.id' : `siswa.${idx + 1}@demo.absenta.id`;

    return {
      id: s.id,
      user_id: s.user_id,
      kelas_id: s.kelas_id,
      nama_siswa: demoName,
      nis: demoNis,
      nisn: demoNisn,
      nik: null,
      no_kk: null,
      no_hp: demoPhone,
      alamat: 'Jl. Siswa Demo Absenta No. ' + (idx + 1),
      jenis_kelamin: s.jenis_kelamin || (idx % 2 === 0 ? 'L' : 'P'),
      user: s.User ? {
        id: s.User.id,
        email: demoEmail,
        full_name: demoName,
        password_hash: DEFAULT_HASH,
        phone: demoPhone,
        status: 'ACTIVE',
        email_verified: true,
      } : null
    };
  });

  const dumpPayload = {
    exportDate: new Date().toISOString(),
    sourceSchool: sourceTenant.name,
    targetSubdomain: 'demo',
    targetCustomDomain: 'demo.absenta.id',
    stats: {
      tahunPelajaran: tahunPelajarans.length,
      jurusan: jurusans.length,
      kelas: kelases.length,
      guru: sanitizedGurus.length,
      siswa: sanitizedSiswas.length,
      posisi: positions.length,
      penugasan: assignments.length,
    },
    tahunPelajarans,
    semesters,
    jurusans,
    kelases,
    jenisKegiatans,
    matapelajarans,
    positions,
    assignments,
    gurus: sanitizedGurus,
    siswas: sanitizedSiswas,
  };

  const outputPath = path.join(__dirname, '../database/seeds/demo_sanitized_dataset.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dumpPayload, null, 2), 'utf-8');
  console.log(`✅ [DUMP SELESAI] Data tersanitasi berhasil disimpan ke: ${outputPath}`);
  console.log(`📦 Ukuran File: ${(fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2)} MB`);
}

exportAndSanitize()
  .catch((e) => {
    console.error('❌ Error during export & sanitize:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
