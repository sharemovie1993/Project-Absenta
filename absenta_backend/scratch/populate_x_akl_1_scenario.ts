import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("POPULASI SCENARIO REAL DATA KELAS X AKL 1");
  console.log("=================================================");

  // 1. Ambil Tenant & Kelas
  const tenant = await prisma.tenant.findFirst({
    where: { id: 'c2998880-ef62-43b7-8c85-2cc855a84d26' }
  }) || await prisma.tenant.findFirst();

  if (!tenant) {
    throw new Error("Tenant tidak ditemukan!");
  }
  const tenantId = tenant.id;
  console.log("✓ Tenant ID:", tenantId, "(Name:", tenant.name, ")");

  const kelas = await prisma.kelas.findFirst({
    where: { nama_kelas: { contains: 'X AKL 1', mode: 'insensitive' }, tenant_id: tenantId }
  });
  if (!kelas) {
    throw new Error("Kelas X AKL 1 tidak ditemukan!");
  }
  const kelasId = kelas.id;
  console.log("✓ Kelas X AKL 1 ID:", kelasId);

  // 2. Ambil User & Guru Wali Kelas & Guru BK
  const walasUser = await prisma.user.findFirst({
    where: { email: { contains: 'tati', mode: 'insensitive' }, tenant_id: tenantId },
    include: { Guru: true }
  });
  const walasGuruId = walasUser?.Guru?.id || null;
  const walasNama = walasUser?.full_name || walasUser?.Guru?.nama_guru || 'TATI KARYATI, S.Pd.';
  console.log("✓ Wali Kelas:", walasNama, "(Guru ID:", walasGuruId, ")");

  const bkUser = await prisma.user.findFirst({
    where: { email: { contains: 'ajeng', mode: 'insensitive' }, tenant_id: tenantId },
    include: { Guru: true }
  });
  const bkGuruId = bkUser?.Guru?.id || null;
  const bkNama = bkUser?.full_name || bkUser?.Guru?.nama_guru || 'Ajeng (Guru BK)';
  console.log("✓ Guru BK:", bkNama, "(Guru ID:", bkGuruId, ")");

  // 3. Ambil Tahun Pelajaran & Semester Aktif
  const tp = await prisma.tahunPelajaran.findFirst({
    where: { tenant_id: tenantId, is_active: true }
  }) || await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId } });

  const semester = await prisma.semester.findFirst({
    where: { tenant_id: tenantId, is_active: true }
  }) || await prisma.semester.findFirst({ where: { tenant_id: tenantId } });

  console.log("✓ Tahun Pelajaran ID:", tp?.id, "| Semester ID:", semester?.id);

  // 4. Cari 5 Target Siswa berdasarkan NISN & NIS
  const targetNisns = ['0109275978', '0115190115', '0106442141', '0114956858', '0127212982'];
  const targetStudents = await prisma.siswa.findMany({
    where: {
      tenant_id: tenantId,
      kelas_id: kelasId,
      nisn: { in: targetNisns }
    }
  });

  // Tambahkan siswa pendukung di X AKL 1 untuk melengkapi 10 siswa
  const otherStudents = await prisma.siswa.findMany({
    where: {
      tenant_id: tenantId,
      kelas_id: kelasId,
      nisn: { notIn: targetNisns }
    },
    take: 5
  });

  const all10Students = [...targetStudents, ...otherStudents];
  console.log(`\n✓ Total ${all10Students.length} Siswa Terdaftar untuk Populasi Skenario:`);
  all10Students.forEach((s, i) => {
    console.log(`   ${i + 1}. NISN: ${s.nisn} | NIS: ${s.nis} | Nama: ${s.nama_siswa}`);
  });

  // Map siswa spesifik
  const acep = all10Students.find(s => s.nisn === '0109275978') || all10Students[0]; // HADIR disemua sesi, Prestasi
  const amanda = all10Students.find(s => s.nisn === '0115190115') || all10Students[1]; // SAKIT, Pelanggaran
  const anisa = all10Students.find(s => s.nisn === '0106442141') || all10Students[2]; // IZIN, 3 Prestasi
  const ardi = all10Students.find(s => s.nisn === '0114956858') || all10Students[3]; // ALPA 10 hari, EWS & Kasus BK
  const azahra = all10Students.find(s => s.nisn === '0127212982') || all10Students[4]; // TERLAMBAT 10 hari, Pelanggaran

  console.log("\n=== MEMULAI POPULASI DATA REAL SCENARIO ===");

  // 10 Hari Sekolah (Agustus 2026)
  const schoolDates = [
    '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
    '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'
  ];

  // A. ABSENSI GERBANG & ABSENSI SESI (10 Hari Sekolah Agustus 2026)
  console.log("\n1. Populasi Absensi Gerbang & Absensi Sesi KBM (10 Hari)...");
  let gateCount = 0;
  let sessionCount = 0;

  // Cache SiswaAkademik IDs
  const siswaAkademikMap = new Map<string, string>();
  for (const s of all10Students) {
    const sa = await prisma.siswaAkademik.findFirst({
      where: { siswa_id: s.id }
    });
    if (sa) {
      siswaAkademikMap.set(s.id, sa.id);
    }
  }

  for (const dateStr of schoolDates) {
    const tanggal = new Date(dateStr);

    // 1. Find/Create SesiGerbang untuk Tanggal Sekolah
    let sesiGerbang = await prisma.sesiGerbang.findFirst({
      where: { tenant_id: tenantId, tanggal: tanggal }
    });
    if (!sesiGerbang) {
      const sekolah = await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
      if (sekolah) {
        sesiGerbang = await prisma.sesiGerbang.create({
          data: {
            tenant_id: tenantId,
            sekolah_id: sekolah.id,
            tanggal: tanggal,
            waktu_mulai: new Date(`${dateStr}T06:30:00+07:00`),
            waktu_selesai: new Date(`${dateStr}T07:15:00+07:00`),
            status: 'SELESAI'
          }
        }).catch(() => null);
      }
    }

    // Absensi Gerbang Siswa
    for (const student of all10Students) {
      let status = 'HADIR';
      let jamMasuk = '06:50:00';
      let keterlambatan = 0;

      if (student.id === ardi.id) {
        status = 'ALPHA';
        jamMasuk = '';
      } else if (student.id === azahra.id) {
        status = 'TERLAMBAT';
        jamMasuk = '07:38:00';
        keterlambatan = 23;
      } else if (student.id === amanda.id && (dateStr >= '2026-08-12')) {
        status = 'SAKIT';
        jamMasuk = '';
      } else if (student.id === anisa.id && (dateStr === '2026-08-06' || dateStr === '2026-08-07')) {
        status = 'IZIN';
        jamMasuk = '';
      }

      await prisma.absenGerbangSiswa.create({
        data: {
          tenant_id: tenantId,
          siswa_id: student.id,
          sesi_gerbang_id: sesiGerbang?.id || '',
          waktu_tap: jamMasuk ? new Date(`${dateStr}T${jamMasuk}+07:00`) : null,
          status: status,
          is_terlambat: status === 'TERLAMBAT',
          menit_keterlambatan: keterlambatan,
          arah: 'MASUK'
        }
      }).catch(e => console.log(`   Gate Error (${student.nama_siswa}):`, e.message));
      gateCount++;
    }

    // 2. Sesi Absensi & AbsenSiswa (Jam 1 KBM)
    if (tp?.id && semester?.id) {
      const sesi = await prisma.sesiAbsensi.create({
        data: {
          tenant_id: tenantId,
          kelas_id: kelasId,
          tahun_pelajaran_id: tp.id,
          semester_id: semester.id,
          tanggal: tanggal,
          waktu_mulai: new Date(`${dateStr}T07:15:00+07:00`),
          waktu_selesai: new Date(`${dateStr}T09:35:00+07:00`),
          status: 'SELESAI'
        }
      }).catch(() => null);

      if (sesi) {
        for (const student of all10Students) {
          const saId = siswaAkademikMap.get(student.id);
          if (!saId) continue;

          let sesiStatus = 'HADIR';
          if (student.id === ardi.id) {
            sesiStatus = 'ALPHA';
          } else if (student.id === amanda.id && (dateStr >= '2026-08-12')) {
            sesiStatus = 'SAKIT';
          } else if (student.id === anisa.id && (dateStr === '2026-08-06' || dateStr === '2026-08-07')) {
            sesiStatus = 'IZIN';
          } else if (student.id === azahra.id) {
            sesiStatus = 'HADIR'; // Terlambat di gerbang tetapi mengikuti sesi KBM
          }

          await prisma.absenSiswa.create({
            data: {
              tenant_id: tenantId,
              siswa_id: student.id,
              siswa_akademik_id: saId,
              sesi_id: sesi.id,
              status: sesiStatus
            }
          }).catch(() => {});
          sessionCount++;
        }
      }
    }
  }
  console.log(`   ✓ Populasi ${gateCount} record Absensi Gerbang & ${sessionCount} Absensi Sesi KBM selesai.`);

  // B. PERMOHONAN IZIN ORTU
  console.log("\n2. Populasi Permohonan Izin Ortu...");

  const userIdPengaju = walasUser?.id || 'system';

  // Amanda: Sakit 3 Hari
  await prisma.permohonanIzinSiswa.create({
    data: {
      tenant_id: tenantId,
      siswa_id: amanda.id,
      tipe_izin: 'SAKIT',
      tanggal_mulai: new Date('2026-08-12'),
      tanggal_selesai: new Date('2026-08-14'),
      alasan: 'Ananda Amanda mendadak demam tinggi dan flu berat paska terpapar hujan. Dokter merekomendasikan istirahat 3 hari.',
      status: 'DISETUJUI',
      diajukan_oleh: userIdPengaju,
      attachment_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
      created_at: new Date('2026-08-12T06:30:00+07:00')
    }
  }).catch(e => console.log("   Info Permohonan Amanda:", e.message));

  // Anisa: Izin Keluarga 2 Hari
  await prisma.permohonanIzinSiswa.create({
    data: {
      tenant_id: tenantId,
      siswa_id: anisa.id,
      tipe_izin: 'IZIN_KELUARGA',
      tanggal_mulai: new Date('2026-08-06'),
      tanggal_selesai: new Date('2026-08-07'),
      alasan: 'Menghadiri acara pernikahan saudara kandung di luar kota (Bandung).',
      status: 'DISETUJUI',
      diajukan_oleh: userIdPengaju,
      attachment_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80',
      created_at: new Date('2026-08-06T06:45:00+07:00')
    }
  }).catch(e => console.log("   Info Permohonan Anisa:", e.message));
  console.log("   ✓ Permohonan Izin Ortu Amanda & Anisa berhasil disimpan.");

  // C. PRESTASI SISWA
  console.log("\n3. Populasi Catatan Prestasi Siswa...");

  // Acep Bakri (1 Catatan Prestasi)
  await prisma.prestasiSiswa.create({
    data: {
      tenant_id: tenantId,
      siswa_id: acep.id,
      kelas_id: kelasId,
      nama_prestasi: 'Juara 1 Lomba Kompetensi Siswa (LKS) Akuntansi Tingkat Kota',
      poin: 50,
      tanggal: new Date('2026-08-10'),
      keterangan: 'Meraih medali emas LKS Akuntansi & Keuangan Lembaga se-Kota dan melaju ke tingkat Provinsi.'
    }
  }).catch(e => console.log("   Info Prestasi Acep:", e.message));

  // Anisa Fitriani (3 Catatan Prestasi)
  const prestasiAnisa = [
    {
      nama: 'Juara 2 Debat Bahasa Indonesia Pelajar Tingkat Provinsi',
      poin: 40,
      tanggal: '2026-08-04',
      ket: 'Mempersembahkan piala perak tim debat sekolah pada ajang FLS2N Provinsi.'
    },
    {
      nama: 'Duta Lingkungan Hidup & Zero Waste Sekolah',
      poin: 25,
      tanggal: '2026-08-08',
      ket: 'Penggerak utama program pembiasaan pilah sampah plastik di area Lab Komputer & Kelas.'
    },
    {
      nama: 'Juara 3 Festival Seni & Musik Tradisional Daerah',
      poin: 30,
      tanggal: '2026-08-11',
      ket: 'Meraih Juara 3 kategori Solo Vokal Lagu Sunda Pelajar.'
    }
  ];

  for (const p of prestasiAnisa) {
    await prisma.prestasiSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: anisa.id,
        kelas_id: kelasId,
        nama_prestasi: p.nama,
        poin: p.poin,
        tanggal: new Date(p.tanggal),
        keterangan: p.ket
      }
    }).catch(e => console.log("   Info Prestasi Anisa:", e.message));
  }
  console.log("   ✓ 4 Catatan Prestasi (Acep 1x, Anisa 3x) berhasil disimpan.");

  // D. PELANGGARAN SISWA
  console.log("\n4. Populasi Catatan Pelanggaran Siswa...");

  // Amanda Nurpadilah (Pelanggaran Ringan Atribut)
  await prisma.pelanggaranSiswa.create({
    data: {
      tenant_id: tenantId,
      siswa_id: amanda.id,
      kelas_id: kelasId,
      tahun_pelajaran_id: tp?.id,
      semester_id: semester?.id,
      jenis_pelanggaran: 'Atribut Seragam Tidak Lengkap',
      poin: 10,
      tanggal: new Date('2026-08-04'),
      status: 'SELESAI',
      keterangan: 'Tidak memakai dasi dan sabuk sekolah saat upacara hari Senin. Telah diberikan teguran lisan.'
    }
  }).catch(e => console.log("   Info Pelanggaran Amanda:", e.message));

  // Azahra Salsabila (Pelanggaran Keterlambatan Rutin 10 Hari)
  await prisma.pelanggaranSiswa.create({
    data: {
      tenant_id: tenantId,
      siswa_id: azahra.id,
      kelas_id: kelasId,
      tahun_pelajaran_id: tp?.id,
      semester_id: semester?.id,
      jenis_pelanggaran: 'Keterlambatan Masuk Sekolah (Akumulasi 10 Hari)',
      poin: 25,
      tanggal: new Date('2026-08-12'),
      status: 'PROSES',
      keterangan: 'Terlambat masuk sekolah 10 hari berturut-turut. Pembinaan disiplin wali kelas & penandatanganan komitmen tepat waktu.'
    }
  }).catch(e => console.log("   Info Pelanggaran Azahra:", e.message));
  console.log("   ✓ Catatan Pelanggaran Amanda & Azahra Salsabila berhasil disimpan.");

  // E. EWS SNAPSHOT & KASUS BK
  console.log("\n5. Populasi EWS Snapshot & Record BK...");

  // Ardi Firdaus: High Risk EWS & Kasus BK
  await prisma.ewsSnapshot.create({
    data: {
      tenant_id: tenantId,
      siswa_id: ardi.id,
      risk_level: 'HIGH',
      risk_score: 88.5,
      violations_score: 0.0,
      achievement_score: 0.0,
      alpa_count: 10,
      active_cases: 1
    }
  }).catch(e => console.log("   Info EWS Ardi:", e.message));

  if (bkGuruId) {
    await prisma.kasusBK.create({
      data: {
        tenant_id: tenantId,
        siswa_id: ardi.id,
        judul: 'Penanganan Siswa Alpha 10 Hari Berturut-turut (Ardi Firdaus)',
        kategori: 'Keterhadiran & Membolos',
        prioritas: 'TINGGI',
        status: 'PROSES',
        keterangan: 'Siswa tidak hadir tanpa keterangan selama 10 hari sekolah berturut-turut. Wali Kelas dan Guru BK Ajeng telah menerbitkan Surat Pemanggilan Orang Tua I.',
        tanggal_kasus: new Date('2026-08-12')
      }
    }).catch(e => console.log("   Info Kasus BK Ardi:", e.message));

    // Azahra Salsabila: Kasus BK Keterlambatan Rutin
    await prisma.kasusBK.create({
      data: {
        tenant_id: tenantId,
        siswa_id: azahra.id,
        judul: 'Konseling Kedisiplinan Keterlambatan Rutin (Azahra Salsabila)',
        kategori: 'Kedisiplinan',
        prioritas: 'SEDANG',
        status: 'PROSES',
        keterangan: 'Siswa mengalami keterlambatan masuk gerbang sekolah 10 hari berturut-turut. Dilakukan konseling individu mengenai pola jam tidur malam.',
        tanggal_kasus: new Date('2026-08-11')
      }
    }).catch(e => console.log("   Info Kasus BK Azahra:", e.message));
  }
  console.log("   ✓ EWS Snapshot & Record Kasus BK Guru Ajeng berhasil disimpan.");

  // F. JURNAL WALI KELAS (Tati Karyati, S.Pd.)
  console.log("\n6. Populasi Jurnal Wali Kelas (Tati Karyati, S.Pd.)...");

  const jurnalEntries = [
    {
      tanggal: '2026-08-12',
      kategori: 'Pembinaan Kelas',
      judul: 'Pengarahan Jam Walas X AKL 1 & Evaluasi Kedisiplinan Awal Bulan',
      konten: 'Membahas komitmen tepat waktu jam 07.00 WIB, kerapihan pakaian, dan keaktifan KBM. Diapresiasi siswa teladan Acep Bakri dan Anisa Fitriani atas prestasi akademik & non-akademik.',
      tags: ['Jam Walas', 'Disiplin', 'Apresiasi'],
      siswa_terlibat: [acep.nama_siswa, anisa.nama_siswa]
    },
    {
      tanggal: '2026-08-10',
      kategori: 'Koordinasi BK',
      judul: 'Koordinasi dengan Guru BK Ajeng terkait Kasus Alpha 10 Hari Ardi Firdaus',
      konten: 'Mengadakan koordinasi terbatas bersama Ibu Ajeng (Guru BK). Disepakati penerbitan Surat Pemanggilan Orang Tua ke rumah siswa serta home visit jika orang tua belum merespon.',
      tags: ['Koordinasi BK', 'Ardi Firdaus', 'EWS'],
      siswa_terlibat: [ardi.nama_siswa]
    },
    {
      tanggal: '2026-08-07',
      kategori: 'Rapat Ortu',
      judul: 'Sosialisasi Program Pembelajaran X AKL 1 & Pembentukan Paguyuban Ortu',
      konten: 'Rapat tatap muka bersama orang tua siswa X AKL 1. Orang tua mendukung penuh ketertiban presensi digital, pembiasaan ibadah, dan kerapihan seragam.',
      tags: ['Paguyuban Ortu', 'Program Kelas'],
      siswa_terlibat: []
    },
    {
      tanggal: '2026-08-05',
      kategori: 'Kasus Teratasi',
      judul: 'Pembinaan & Komitmen Ketepatan Waktu Azahra Salsabila',
      konten: 'Mediation dan pengarahan personal mengenai keterlambatan masuk gerbang. Azahra berjanji menyesuaikan jadwal berangkat dari rumah lebih awal.',
      tags: ['Pembinaan', 'Azahra Salsabila', 'Disiplin'],
      siswa_terlibat: [azahra.nama_siswa]
    }
  ];

  for (const j of jurnalEntries) {
    await prisma.jurnalWaliKelas.create({
      data: {
        tenant_id: tenantId,
        kelas_id: kelasId,
        guru_id: walasGuruId,
        tanggal: new Date(j.tanggal),
        kategori: j.kategori,
        judul: j.judul,
        konten: j.konten,
        tags: j.tags,
        siswa_terlibat: j.siswa_terlibat
      }
    }).catch(e => console.log("   Info Jurnal Walas:", e.message));
  }
  console.log("   ✓ 4 Entri Jurnal Wali Kelas Tati Karyati berhasil disimpan.");

  console.log("\n=================================================");
  console.log("✅ POPULASI SCENARIO REAL KELAS X AKL 1 SUKSES!");
  console.log("=================================================");
}

main()
  .catch(e => console.error("Error populasi data:", e))
  .finally(() => prisma.$disconnect());
