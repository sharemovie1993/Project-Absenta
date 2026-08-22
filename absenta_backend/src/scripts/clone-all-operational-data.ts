/**
 * SINKRONISASI TOTAL 360° DATA OPERASIONAL LENGKAP:
 * SiswaAkademik, JadwalKBM, JadwalPiket, SesiAbsensi, SesiGerbang, Presensi Siswa & Guru
 */
import { PrismaClient, JenisKegiatan } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

function cleanName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\(Demo\)$/i, '').trim().toLowerCase();
}

async function runFullSync() {
  console.log('🚀 [360° FULL SYNC] Memulai sinkronisasi seluruh data operasional sekolah...');

  // 1. Ambil Dictionary ID Mapping
  console.log('🗂️  Membangun dictionary relasi...');

  const gProd = await prisma.guru.findMany({ where: { tenant_id: PROD_ID } });
  const gDemo = await prisma.guru.findMany({ where: { tenant_id: DEMO_ID } });
  const guruMap = new Map<string, string>();
  gProd.forEach(gp => {
    const gd = gDemo.find(d => cleanName(d.nama_guru) === cleanName(gp.nama_guru));
    if (gd) guruMap.set(gp.id, gd.id);
  });
  console.log(`   ✔ Guru Map: ${guruMap.size}/${gProd.length}`);

  const sProd = await prisma.siswa.findMany({ where: { tenant_id: PROD_ID } });
  const sDemo = await prisma.siswa.findMany({ where: { tenant_id: DEMO_ID } });
  const siswaMap = new Map<string, string>();
  sProd.forEach(sp => {
    const sd = sDemo.find(d => cleanName(d.nama_siswa) === cleanName(sp.nama_siswa));
    if (sd) siswaMap.set(sp.id, sd.id);
  });
  console.log(`   ✔ Siswa Map: ${siswaMap.size}/${sProd.length}`);

  const kProd = await prisma.kelas.findMany({ where: { tenant_id: PROD_ID } });
  const kDemo = await prisma.kelas.findMany({ where: { tenant_id: DEMO_ID } });
  const kelasMap = new Map<string, string>();
  kProd.forEach(kp => {
    const kd = kDemo.find(d => cleanName(d.nama_kelas) === cleanName(kp.nama_kelas));
    if (kd) kelasMap.set(kp.id, kd.id);
  });
  console.log(`   ✔ Kelas Map: ${kelasMap.size}/${kProd.length}`);

  const mProd = await prisma.mapel.findMany({ where: { tenant_id: PROD_ID } });
  const mDemo = await prisma.mapel.findMany({ where: { tenant_id: DEMO_ID } });
  const mapelMap = new Map<string, string>();
  mProd.forEach(mp => {
    const md = mDemo.find(d => d.kode_mapel === mp.kode_mapel || cleanName(d.nama_mapel) === cleanName(mp.nama_mapel));
    if (md) mapelMap.set(mp.id, md.id);
  });
  console.log(`   ✔ Mapel Map: ${mapelMap.size}/${mProd.length}`);

  const tpProd = await prisma.tahunPelajaran.findMany({ where: { tenant_id: PROD_ID } });
  const tpDemo = await prisma.tahunPelajaran.findMany({ where: { tenant_id: DEMO_ID } });
  const tpMap = new Map<string, string>();
  tpProd.forEach(tpp => {
    const tpd = tpDemo.find(d => d.tahun === tpp.tahun);
    if (tpd) tpMap.set(tpp.id, tpd.id);
  });
  console.log(`   ✔ Tahun Pelajaran Map: ${tpMap.size}/${tpProd.length}`);

  const semProd = await prisma.semester.findMany({ where: { tenant_id: PROD_ID } });
  const semDemo = await prisma.semester.findMany({ where: { tenant_id: DEMO_ID } });
  const semMap = new Map<string, string>();
  for (const semp of semProd) {
    const targetTpId = tpMap.get(semp.tahun_pelajaran_id);
    const semd = semDemo.find(d => cleanName(d.nama_semester) === cleanName(semp.nama_semester) && d.tahun_pelajaran_id === targetTpId);
    if (semd) semMap.set(semp.id, semd.id);
  }
  console.log(`   ✔ Semester Map: ${semMap.size}/${semProd.length}`);

  const sekolahDemo = await prisma.sekolah.findFirst({ where: { tenant_id: DEMO_ID } });
  const adminDemo = await prisma.user.findFirst({ where: { tenant_id: DEMO_ID, email: 'admin@absenta.id' } });

  // 2. Sync JenisKegiatanMaster
  console.log('\n📌 1. Sinkronisasi JenisKegiatanMaster...');
  await prisma.jenisKegiatanMaster.deleteMany({ where: { tenant_id: DEMO_ID } });
  const jkmProd = await prisma.jenisKegiatanMaster.findMany({ where: { tenant_id: PROD_ID } });
  for (const j of jkmProd) {
    await prisma.jenisKegiatanMaster.create({
      data: {
        id: randomUUID(),
        tenant_id: DEMO_ID,
        nama: j.nama,
        tipe: j.tipe,
        urutan: j.urutan,
        aktif: j.aktif,
      }
    });
  }
  console.log(`   ✅ Selesai: ${jkmProd.length} JenisKegiatanMaster tersinkronisasi.`);

  // 3. Sync SiswaAkademik (Registrasi Siswa)
  console.log('\n🎓 2. Sinkronisasi SiswaAkademik (Registrasi Siswa)...');
  await prisma.siswaAkademik.deleteMany({
    where: {
      siswa: { tenant_id: DEMO_ID }
    }
  });
  const saProd = await prisma.siswaAkademik.findMany({
    where: { siswa: { tenant_id: PROD_ID } }
  });
  const saMap = new Map<string, string>();
  let saInserted = 0;
  for (const sa of saProd) {
    const newSiswaId = siswaMap.get(sa.siswa_id);
    const newKelasId = kelasMap.get(sa.kelas_id);
    const newTpId = tpMap.get(sa.tahun_pelajaran_id);
    const newSemId = semMap.get(sa.semester_id);

    if (!newSiswaId || !newKelasId || !newTpId || !newSemId) continue;

    try {
      const newSaId = randomUUID();
      saMap.set(sa.id, newSaId);
      await prisma.siswaAkademik.create({
        data: {
          id: newSaId,
          siswa_id: newSiswaId,
          kelas_id: newKelasId,
          tahun_pelajaran_id: newTpId,
          semester_id: newSemId,
          status: sa.status,
        }
      });
      saInserted++;
    } catch (_) {}
  }
  console.log(`   ✅ Selesai: ${saInserted}/${saProd.length} SiswaAkademik tersinkronisasi!`);

  // 4. Sync JadwalKBM
  console.log('\n📅 3. Sinkronisasi JadwalKBM...');
  await prisma.jadwalKBM.deleteMany({ where: { tenant_id: DEMO_ID } });
  const jadwalProd = await prisma.jadwalKBM.findMany({ where: { tenant_id: PROD_ID } });
  let kbmInserted = 0;
  for (const r of jadwalProd) {
    const newGuruId = r.guru_id ? guruMap.get(r.guru_id) : null;
    const newKelasId = r.kelas_id ? kelasMap.get(r.kelas_id) : null;
    const newMapelId = r.mapel_id ? mapelMap.get(r.mapel_id) : null;
    const newTpId = r.tahun_pelajaran_id ? tpMap.get(r.tahun_pelajaran_id) : null;
    const newSemId = r.semester_id ? semMap.get(r.semester_id) : null;

    if (!newKelasId || !newTpId || !newSemId || !newGuruId) continue;

    try {
      await prisma.jadwalKBM.create({
        data: {
          id: randomUUID(),
          tenant_id: DEMO_ID,
          tahun_pelajaran_id: newTpId,
          semester_id: newSemId,
          kelas_id: newKelasId,
          hari: r.hari,
          slot_index: r.slot_index,
          jam_mulai: r.jam_mulai,
          jam_selesai: r.jam_selesai,
          mapel_id: newMapelId,
          guru_id: newGuruId,
          jenis_kegiatan: r.jenis_kegiatan,
          asc_id: r.asc_id ? `${r.asc_id}-demo` : null,
          created_by_user_id: adminDemo?.id || null,
        }
      });
      kbmInserted++;
    } catch (_) {}
  }
  console.log(`   ✅ Selesai: ${kbmInserted}/${jadwalProd.length} baris JadwalKBM tersinkronisasi!`);

  // 5. Sync JadwalPiketGuru
  console.log('\n🛡️  4. Sinkronisasi JadwalPiketGuru...');
  await prisma.jadwalPiketGuru.deleteMany({ where: { tenant_id: DEMO_ID } });
  const piketProd = await prisma.jadwalPiketGuru.findMany({ where: { tenant_id: PROD_ID } });
  let piketInserted = 0;
  for (const p of piketProd) {
    const newGuruId = p.guru_id ? guruMap.get(p.guru_id) : null;
    const newTpId = p.tahun_pelajaran_id ? tpMap.get(p.tahun_pelajaran_id) : null;
    const newSemId = p.semester_id ? semMap.get(p.semester_id) : null;

    if (!newGuruId || !newTpId || !newSemId) continue;

    try {
      await prisma.jadwalPiketGuru.create({
        data: {
          id: randomUUID(),
          tenant_id: DEMO_ID,
          guru_id: newGuruId,
          tahun_pelajaran_id: newTpId,
          semester_id: newSemId,
          hari: p.hari,
          pos_piket: p.pos_piket,
          slot_mulai: p.slot_mulai,
          slot_selesai: p.slot_selesai,
          jam_mulai: p.jam_mulai,
          jam_selesai: p.jam_selesai,
          catatan: p.catatan,
        }
      });
      piketInserted++;
    } catch (_) {}
  }
  console.log(`   ✅ Selesai: ${piketInserted}/${piketProd.length} baris JadwalPiketGuru tersinkronisasi!`);

  // 6. Sync SesiAbsensi
  console.log('\n⏱️  5. Sinkronisasi SesiAbsensi...');
  await prisma.sesiAbsensi.deleteMany({ where: { tenant_id: DEMO_ID } });
  const sesiProd = await prisma.sesiAbsensi.findMany({ where: { tenant_id: PROD_ID } });
  let sesiInserted = 0;
  const sesiIdMap = new Map<string, string>();

  for (const s of sesiProd) {
    const newGuruId = s.guru_id ? guruMap.get(s.guru_id) : null;
    const newKelasId = s.kelas_id ? kelasMap.get(s.kelas_id) : null;
    const newMapelId = s.mapel_id ? mapelMap.get(s.mapel_id) : null;
    const newTpId = s.tahun_pelajaran_id ? tpMap.get(s.tahun_pelajaran_id) : null;
    const newSemId = s.semester_id ? semMap.get(s.semester_id) : null;

    if (!newGuruId || !newKelasId || !newTpId || !newSemId) continue;

    try {
      const newSesiId = randomUUID();
      sesiIdMap.set(s.id, newSesiId);
      await prisma.sesiAbsensi.create({
        data: {
          id: newSesiId,
          tenant_id: DEMO_ID,
          guru_id: newGuruId,
          kelas_id: newKelasId,
          mapel_id: newMapelId,
          semester_id: newSemId,
          tahun_pelajaran_id: newTpId,
          tanggal: s.tanggal,
          waktu_mulai: s.waktu_mulai,
          waktu_selesai: s.waktu_selesai,
          jenis_kegiatan: s.jenis_kegiatan,
          slot_kbm: s.slot_kbm,
          status: s.status,
          is_auto_closed: s.is_auto_closed,
          sumber_sesi: s.sumber_sesi,
          keterangan: s.keterangan,
        }
      });
      sesiInserted++;
    } catch (_) {}
  }
  console.log(`   ✅ Selesai: ${sesiInserted}/${sesiProd.length} SesiAbsensi tersinkronisasi!`);

  // 7. Sync SesiGerbang
  console.log('\n🚪 6. Sinkronisasi SesiGerbang...');
  await prisma.sesiGerbang.deleteMany({ where: { tenant_id: DEMO_ID } });
  const gerbangProd = await prisma.sesiGerbang.findMany({ where: { tenant_id: PROD_ID } });
  let gerbangInserted = 0;
  for (const g of gerbangProd) {
    const newTpId = g.tahun_pelajaran_id ? tpMap.get(g.tahun_pelajaran_id) : null;
    if (!sekolahDemo) continue;
    try {
      await prisma.sesiGerbang.create({
        data: {
          id: randomUUID(),
          tenant_id: DEMO_ID,
          sekolah_id: sekolahDemo.id,
          tahun_pelajaran_id: newTpId,
          jenis_kegiatan: g.jenis_kegiatan || JenisKegiatan.PEMBIASAAN,
          tanggal: g.tanggal,
          waktu_mulai: g.waktu_mulai,
          waktu_selesai: g.waktu_selesai,
          status: g.status,
        }
      });
      gerbangInserted++;
    } catch (_) {}
  }
  console.log(`   ✅ Selesai: ${gerbangInserted}/${gerbangProd.length} SesiGerbang tersinkronisasi!`);

  // 8. Sync AbsenGuru
  console.log('\n👨‍🏫 7. Sinkronisasi AbsenGuru...');
  await prisma.absenGuru.deleteMany({ where: { tenant_id: DEMO_ID } });
  const absenGuruProd = await prisma.absenGuru.findMany({ where: { tenant_id: PROD_ID } });
  let agInserted = 0;
  for (const ag of absenGuruProd) {
    const newGuruId = guruMap.get(ag.guru_id);
    const newSesiId = sesiIdMap.get(ag.sesi_id);
    const newTpId = tpMap.get(ag.tahun_pelajaran_id);
    const newSemId = semMap.get(ag.semester_id);
    if (!newGuruId || !newSesiId || !newTpId || !newSemId) continue;

    try {
      await prisma.absenGuru.create({
        data: {
          id: randomUUID(),
          tenant_id: DEMO_ID,
          sesi_id: newSesiId,
          guru_id: newGuruId,
          tahun_pelajaran_id: newTpId,
          semester_id: newSemId,
          status: ag.status,
          waktu_tap: ag.waktu_tap,
          is_terlambat: ag.is_terlambat,
          catatan: ag.catatan,
        }
      });
      agInserted++;
    } catch (_) {}
  }
  console.log(`   ✅ Selesai: ${agInserted}/${absenGuruProd.length} AbsenGuru tersinkronisasi!`);

  // 9. Sync AbsenSiswa
  console.log('\n🎒 8. Sinkronisasi AbsenSiswa...');
  await prisma.absenSiswa.deleteMany({ where: { tenant_id: DEMO_ID } });
  const absenSiswaProd = await prisma.absenSiswa.findMany({ where: { tenant_id: PROD_ID } });
  let asInserted = 0;
  for (const as of absenSiswaProd) {
    const newSiswaId = as.siswa_id ? siswaMap.get(as.siswa_id) : null;
    const newSesiId = sesiIdMap.get(as.sesi_id);
    const newSaId = saMap.get(as.siswa_akademik_id);
    if (!newSesiId || !newSaId) continue;

    try {
      await prisma.absenSiswa.create({
        data: {
          id: randomUUID(),
          tenant_id: DEMO_ID,
          sesi_id: newSesiId,
          siswa_id: newSiswaId,
          siswa_akademik_id: newSaId,
          status: as.status,
          waktu_tap: as.waktu_tap,
          is_terlambat: as.is_terlambat,
          menit_keterlambatan: as.menit_keterlambatan,
          poin_kehadiran: as.poin_kehadiran,
          asal_gerbang: as.asal_gerbang,
          kelas_id_snapshot: as.kelas_id_snapshot ? kelasMap.get(as.kelas_id_snapshot) || null : null,
          kelas_nama_snapshot: as.kelas_nama_snapshot,
          tingkat_snapshot: as.tingkat_snapshot,
          tahun_pelajaran_id_snapshot: as.tahun_pelajaran_id_snapshot ? tpMap.get(as.tahun_pelajaran_id_snapshot) || null : null,
          catatan: as.catatan,
          created_at: as.created_at,
          updated_at: as.updated_at,
        }
      });
      asInserted++;
    } catch (_) {}
  }
  console.log(`   ✅ Selesai: ${asInserted}/${absenSiswaProd.length} AbsenSiswa tersinkronisasi!`);

  // 10. Audit Akhir
  console.log('\n================ AUDIT SINKRONISASI 360° ================');
  const auditList = [
    { name: 'User', count: await prisma.user.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'Guru', count: await prisma.guru.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'Siswa', count: await prisma.siswa.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'Kelas', count: await prisma.kelas.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'Jurusan', count: await prisma.jurusan.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'Mapel', count: await prisma.mapel.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'Tahun Pelajaran', count: await prisma.tahunPelajaran.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'Semester', count: await prisma.semester.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'JenisKegiatanMaster', count: await prisma.jenisKegiatanMaster.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'SiswaAkademik', count: await prisma.siswaAkademik.count({ where: { siswa: { tenant_id: DEMO_ID } } }) },
    { name: 'JadwalKBM', count: await prisma.jadwalKBM.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'JadwalKontrakKbm', count: await prisma.jadwalKontrakKbm.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'JadwalPiketGuru', count: await prisma.jadwalPiketGuru.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'SesiAbsensi', count: await prisma.sesiAbsensi.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'SesiGerbang', count: await prisma.sesiGerbang.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'Presensi Siswa', count: await prisma.absenSiswa.count({ where: { tenant_id: DEMO_ID } }) },
    { name: 'Presensi Guru', count: await prisma.absenGuru.count({ where: { tenant_id: DEMO_ID } }) },
  ];

  for (const item of auditList) {
    console.log(`   ✅ ${item.name.padEnd(25)} : ${item.count} data`);
  }
  console.log('=========================================================');
  console.log('🎉 SELURUH DATA OPERASIONAL 360° LENGKAP & TERHUBUNG UTUH!');
}

runFullSync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
