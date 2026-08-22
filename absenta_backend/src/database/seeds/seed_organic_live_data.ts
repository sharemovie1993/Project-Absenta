import { PrismaClient, Hari, SumberSesi } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addDays, subDays, format } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [ORGANIC SEEDER] Memulai injeksi data organik 360° untuk seluruh pilar...');

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const DEFAULT_PASSWORD = await bcrypt.hash('password123', 10);

  // 1. Dapatkan daftar target tenant
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { id: 'demo-tenant-absenta' },
        { subdomain: 'demo' },
        { subdomain: 'smkn1cimahi' },
        { status: 'ACTIVE' }
      ]
    }
  });

  if (tenants.length === 0) {
    console.log('⚠️ Tidak ada tenant ditemukan, membuat default demo tenant...');
    const demo = await prisma.tenant.create({
      data: {
        id: 'demo-tenant-absenta',
        name: 'SMK Negeri 1 Absenta (Demo Portal)',
        subdomain: 'demo',
        custom_domain: 'demo.absenta.id',
        status: 'ACTIVE',
      }
    });
    tenants.push(demo);
  }

  for (const tenant of tenants) {
    const tenantId = tenant.id;
    console.log(`\n======================================================`);
    console.log(`🏫 Memproses Tenant: ${tenant.name} (${tenantId})`);
    console.log(`======================================================`);

    // --- A. TAHUN PELAJARAN & SEMESTER ---
    let tapel = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    if (!tapel) {
      tapel = await prisma.tahunPelajaran.create({
        data: {
          tenant_id: tenantId,
          tahun_ajaran: '2025/2026',
          is_active: true,
          tanggal_mulai: new Date(2025, 6, 15),
          tanggal_selesai: new Date(2026, 5, 20),
        }
      });
    }

    let semester = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    if (!semester) {
      semester = await prisma.semester.create({
        data: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tapel.id,
          nama_semester: 'Ganjil',
          is_active: true,
        }
      });
    }

    // --- B. JURUSAN & PROGRAM KEAHLIAN ---
    const jurusanList = [
      { kode: 'PPLG', nama: 'Pengembangan Perangkat Lunak & Gim' },
      { kode: 'TJKT', nama: 'Teknik Jaringan Komputer & Telekomunikasi' },
      { kode: 'DKV', nama: 'Desain Komunikasi Visual' },
      { kode: 'MPLB', nama: 'Manajemen Perkantoran & Layanan Bisnis' },
    ];

    const createdJurusan: any[] = [];
    for (const j of jurusanList) {
      const jur = await prisma.jurusan.upsert({
        where: { id: `${tenantId}-${j.kode}` },
        update: { nama_jurusan: j.nama },
        create: {
          id: `${tenantId}-${j.kode}`,
          tenant_id: tenantId,
          nama_jurusan: j.nama,
        }
      });
      createdJurusan.push(jur);
    }

    // --- C. KELAS-KELAS ---
    const kelasNames = [
      { nama: 'X PPLG 1', tingkat: 10, jur: createdJurusan[0] },
      { nama: 'X PPLG 2', tingkat: 10, jur: createdJurusan[0] },
      { nama: 'XI RPL 1', tingkat: 11, jur: createdJurusan[0] },
      { nama: 'XII RPL 1', tingkat: 12, jur: createdJurusan[0] },
      { nama: 'X TJKT 1', tingkat: 10, jur: createdJurusan[1] },
      { nama: 'XI TKJ 1', tingkat: 11, jur: createdJurusan[1] },
      { nama: 'XII TKJ 1', tingkat: 12, jur: createdJurusan[1] },
      { nama: 'X DKV 1', tingkat: 10, jur: createdJurusan[2] },
      { nama: 'XI DKV 1', tingkat: 11, jur: createdJurusan[2] },
      { nama: 'X MPLB 1', tingkat: 10, jur: createdJurusan[3] },
    ];

    const createdKelas: any[] = [];
    for (const k of kelasNames) {
      const kl = await prisma.kelas.upsert({
        where: { id: `${tenantId}-${k.nama.replace(/\s+/g, '_')}` },
        update: {
          nama_kelas: k.nama,
          tingkat: k.tingkat,
          jurusan_id: k.jur.id,
          tahun_pelajaran_id: tapel.id,
        },
        create: {
          id: `${tenantId}-${k.nama.replace(/\s+/g, '_')}`,
          tenant_id: tenantId,
          nama_kelas: k.nama,
          tingkat: k.tingkat,
          jurusan_id: k.jur.id,
          tahun_pelajaran_id: tapel.id,
        }
      });
      createdKelas.push(kl);
    }

    // --- D. MATA PELAJARAN ---
    const mapelData = [
      { nama: 'Pemrograman Web & Perangkat Bergerak', kode: 'PPLG-01' },
      { nama: 'Basis Data & SQL', kode: 'PPLG-02' },
      { nama: 'Administrasi Infrastruktur Jaringan', kode: 'TJKT-01' },
      { nama: 'Desain Grafis & UI/UX Studio', kode: 'DKV-01' },
      { nama: 'Matematika Terapan', kode: 'UMUM-01' },
      { nama: 'Bahasa Indonesia & Literasi Digital', kode: 'UMUM-02' },
      { nama: 'Bahasa Inggris Komunikasi Bisnis', kode: 'UMUM-03' },
      { nama: 'Pendidikan Agama & Budi Pekerti', kode: 'UMUM-04' },
      { nama: 'Projek Kreatif & Kewirausahaan (PKK)', kode: 'PROD-01' },
    ];

    const createdMapel: any[] = [];
    for (const m of mapelData) {
      const mp = await prisma.mapel.upsert({
        where: { id: `${tenantId}-${m.kode}` },
        update: { nama_mapel: m.nama, kode_mapel: m.kode },
        create: {
          id: `${tenantId}-${m.kode}`,
          tenant_id: tenantId,
          nama_mapel: m.nama,
          kode_mapel: m.kode,
        }
      });
      createdMapel.push(mp);
    }

    // --- E. GURU & TENAGA KEPENDIDIKAN (PTK) ---
    const guruData = [
      { nama: 'Dr. H. Mulyadi, M.Pd.', nip: '197508122000031001', jenis: 'KEPALA_SEKOLAH' },
      { nama: 'Budi Santoso, S.Kom., M.T.', nip: '198203152006041005', jenis: 'WAKA_KURIKULUM' },
      { nama: 'Siti Rahmawati, M.Pd.', nip: '198505202009022003', jenis: 'WAKA_KESISWAAN' },
      { nama: 'Ahmad Fauzi, S.T.', nip: '198007112005011004', jenis: 'WAKA_SARPRAS' },
      { nama: 'Dewi Lestari, S.Pd., M.M.', nip: '198711032010012008', jenis: 'WAKA_HUBIN' },
      { nama: 'Dra. Hj. Nurul Hidayah, M.Kons.', nip: '197904142003122002', jenis: 'GURU_BK' },
      { nama: 'Hendra Gunawan, S.Kom.', nip: '199002182015031002', jenis: 'GURU' },
      { nama: 'Rina Marlina, S.Pd.', nip: '199208252019032014', jenis: 'GURU' },
      { nama: 'Fajar Nugraha, S.T.', nip: '198806122014021003', jenis: 'GURU' },
      { nama: 'Yuni Astuti, S.Pd.', nip: '199103052018012007', jenis: 'GURU' },
      { nama: 'Bambang Triyono, S.Kom.', nip: '198609302011011009', jenis: 'GURU' },
      { nama: 'Ratna Sari, S.Pd.', nip: '199312152020122018', jenis: 'GURU' },
      { nama: 'Agus Setiawan, S.Pd.', nip: '198901222015041001', jenis: 'GURU' },
    ];

    const createdGuru: any[] = [];
    for (const g of guruData) {
      const guru = await prisma.guru.upsert({
        where: { id: `${tenantId}-${g.nip}` },
        update: { nama_guru: g.nama, nip: g.nip },
        create: {
          id: `${tenantId}-${g.nip}`,
          tenant_id: tenantId,
          nama_guru: g.nama,
          nip: g.nip,
          jenis_kelamin: g.nama.includes('Hj.') || g.nama.includes('Siti') || g.nama.includes('Dewi') || g.nama.includes('Rina') || g.nama.includes('Yuni') || g.nama.includes('Ratna') ? 'PEREMPUAN' : 'LAKI_LAKI',
        }
      });
      createdGuru.push(guru);
    }

    // --- F. SISWA ORGANIK (8 SISWA PER KELAS) ---
    const firstNames = ['Aditya', 'Bima', 'Citra', 'Dimas', 'Eka', 'Fathan', 'Gita', 'Hafizh', 'Indah', 'Jovian', 'Kevin', 'Laras', 'Maulana', 'Nabila', 'Octa', 'Putri', 'Rafi', 'Salsabila', 'Tegar', 'Vina', 'Wafi', 'Yusuf', 'Zahra'];
    const lastNames = ['Pratama', 'Saputra', 'Ramadhan', 'Wijaya', 'Kusuma', 'Mahendra', 'Firmansyah', 'Permana', 'Nugroho', 'Hidayat', 'Wibowo', 'Santoso', 'Utami', 'Lestari', 'Wardhana'];

    const createdSiswa: any[] = [];
    let nisCounter = 250100;

    for (const kl of createdKelas) {
      for (let sIdx = 1; sIdx <= 8; sIdx++) {
        nisCounter++;
        const fn = firstNames[(nisCounter + sIdx) % firstNames.length];
        const ln = lastNames[(nisCounter * 3 + sIdx) % lastNames.length];
        const fullNama = `${fn} ${ln}`;
        const nis = String(nisCounter);
        const nisn = `008${nisCounter}99`;

        const s = await prisma.siswa.upsert({
          where: { id: `${tenantId}-${nis}` },
          update: {
            nama_siswa: fullNama,
            kelas_id: kl.id,
            status: 'AKTIF',
          },
          create: {
            id: `${tenantId}-${nis}`,
            tenant_id: tenantId,
            nama_siswa: fullNama,
            nis: nis,
            nisn: nisn,
            kelas_id: kl.id,
            status: 'AKTIF',
            jenis_kelamin: sIdx % 2 === 0 ? 'PEREMPUAN' : 'LAKI_LAKI',
          }
        });
        createdSiswa.push(s);
      }
    }

    console.log(`✅ Academic Core Siap: ${createdKelas.length} Kelas, ${createdGuru.length} Guru, ${createdSiswa.length} Siswa`);

    // --- G. PILAR 1: PRESENSI GERBANG & SESI KBM HARI INI ---
    console.log('📡 Generating Presensi Gerbang & Sesi KBM Live...');
    
    // 1. Presensi Gerbang Guru Pagi Ini
    for (let idx = 0; idx < createdGuru.length; idx++) {
      const guru = createdGuru[idx];
      const jamDatang = new Date(today);
      jamDatang.setHours(6, 30 + (idx % 25), 0, 0);

      await prisma.absenGerbangGuru.create({
        data: {
          tenant_id: tenantId,
          guru_id: guru.id,
          tanggal: today,
          jam_masuk: jamDatang,
          status: idx < 11 ? 'HADIR' : (idx === 11 ? 'TERLAMBAT' : 'IZIN'),
          metode: 'RFID',
        }
      });
    }

    // 2. Presensi Gerbang Siswa Pagi Ini
    for (let idx = 0; idx < createdSiswa.length; idx++) {
      const siswa = createdSiswa[idx];
      const statusSeed = idx % 20 === 0 ? 'ALPA' : (idx % 15 === 0 ? 'SAKIT' : (idx % 12 === 0 ? 'IZIN' : 'HADIR'));
      const jamDatang = new Date(today);
      jamDatang.setHours(6, 25 + (idx % 35), 0, 0);

      if (statusSeed !== 'ALPA') {
        await prisma.absenGerbangSiswa.create({
          data: {
            tenant_id: tenantId,
            siswa_id: siswa.id,
            tanggal: today,
            jam_masuk: jamDatang,
            status: statusSeed === 'HADIR' ? (idx % 18 === 0 ? 'TERLAMBAT' : 'HADIR') : statusSeed,
            metode: 'RFID',
          }
        });
      }
    }

    // 3. Sesi Absensi KBM Live di Kelas
    for (let i = 0; i < 6; i++) {
      const kl = createdKelas[i % createdKelas.length];
      const mp = createdMapel[i % createdMapel.length];
      const gr = createdGuru[(i + 1) % createdGuru.length];

      const sesi = await prisma.sesiAbsensi.create({
        data: {
          tenant_id: tenantId,
          kelas_id: kl.id,
          mapel_id: mp.id,
          guru_id: gr.id,
          tanggal: today,
          jam_mulai: '07:30',
          jam_selesai: '09:45',
          status: i < 3 ? 'ACTIVE' : 'COMPLETED',
          materi: `Modul Pembelajaran ${mp.nama_mapel} - Bab 3`,
        }
      });

      // Absen siswa di dalam sesi KBM
      const siswaKelas = createdSiswa.filter(s => s.kelas_id === kl.id);
      for (const sw of siswaKelas) {
        await prisma.absenSiswa.create({
          data: {
            tenant_id: tenantId,
            sesi_id: sesi.id,
            siswa_id: sw.id,
            status: 'HADIR',
          }
        });
      }
    }

    // --- H. PILAR 2: KESISWAAN & DISIPLIN (PELANGGARAN & PRESTASI) ---
    console.log('⚖️ Generating Kesiswaan, Pelanggaran & Prestasi Siswa...');
    
    // 1. Jenis Pelanggaran Master
    const jpList = [
      { nama: 'Terlambat Masuk Sekolah (> 15 Menit)', poin: 5 },
      { nama: 'Atribut Seragam Tidak Lengkap / Rapi', poin: 5 },
      { nama: 'Meninggalkan Jam KBM Tanpa Izin Guru Piket', poin: 15 },
      { nama: 'Menggunakan Gadget Saat Pembelajaran Tanpa Izin', poin: 10 },
      { nama: 'Merokok di Lingkungan Sekolah', poin: 35 },
    ];

    for (const jp of jpList) {
      await prisma.jenisPelanggaran.upsert({
        where: { id: `${tenantId}-${jp.nama.substring(0, 10).replace(/\s+/g, '_')}` },
        update: { poin: jp.poin },
        create: {
          id: `${tenantId}-${jp.nama.substring(0, 10).replace(/\s+/g, '_')}`,
          tenant_id: tenantId,
          nama_pelanggaran: jp.nama,
          poin: jp.poin,
        }
      });
    }

    // 2. Catatan Pelanggaran Siswa
    const pelanggaranSample = [
      { siswa: createdSiswa[0], jp: jpList[4], ket: 'Merokok di area belakang kantin sekolah saat istirahat', status: 'PERLU_PEMBINAAN' },
      { siswa: createdSiswa[1], jp: jpList[2], ket: 'Meninggalkan kelas saat pelajaran Matematika berlangsung', status: 'BARU' },
      { siswa: createdSiswa[2], jp: jpList[0], ket: 'Terlambat hadir 25 menit karena kendala transportasi', status: 'SELESAI' },
      { siswa: createdSiswa[3], jp: jpList[3], ket: 'Bermain mobile game saat sesi praktikum web di Lab', status: 'PROSES' },
      { siswa: createdSiswa[0], jp: jpList[1], ket: 'Tidak mengenakan dasi dan ikat pinggang standar', status: 'PERLU_PEMBINAAN' },
    ];

    for (const pel of pelanggaranSample) {
      await prisma.pelanggaranSiswa.create({
        data: {
          tenant_id: tenantId,
          siswa_id: pel.siswa.id,
          tanggal: subDays(today, 1),
          jenis_pelanggaran: pel.jp.nama,
          poin: pel.jp.poin,
          status: pel.status,
          keterangan: pel.ket,
        }
      });
    }

    // 3. Prestasi Siswa (Hall of Fame)
    const prestasiSample = [
      { siswa: createdSiswa[4], nama: 'Juara 1 Lomba Kompetensi Siswa (LKS) Web Technologies', poin: 100, tingkat: 'PROVINSI' },
      { siswa: createdSiswa[5], nama: 'Juara 2 Olimpiade Jaringan Komputer Cyber Security', poin: 75, tingkat: 'NASIONAL' },
      { siswa: createdSiswa[6], nama: 'Medali Emas Futsal Pelajar Tingkat Kota', poin: 50, tingkat: 'KOTA' },
      { siswa: createdSiswa[7], nama: 'Duta Literasi Digital & Inovasi Sekolah', poin: 40, tingkat: 'SEKOLAH' },
    ];

    for (const pres of prestasiSample) {
      await prisma.prestasiSiswa.create({
        data: {
          tenant_id: tenantId,
          siswa_id: pres.siswa.id,
          nama_prestasi: pres.nama,
          poin: pres.poin,
          tanggal: subDays(today, 5),
          tingkat: pres.tingkat,
          keterangan: 'Apresiasi resmi pada upacara bendera hari Senin',
        }
      });
    }

    // --- I. PILAR 3: BIMBINGAN KONSELING & EWS (BP/BK) ---
    console.log('🧠 Generating BP/BK Kasus & EWS Data...');
    const guruBk = createdGuru.find(g => g.nama.includes('Kons')) || createdGuru[5];
    
    const bkCases = [
      { siswa: createdSiswa[0], judul: 'Bimbingan Konseling Kedisiplinan & Minat Belajar', kategori: 'DISIPLIN', status: 'DALAM_PENANGANAN', meanDays: 3 },
      { siswa: createdSiswa[8], judul: 'Konsultasi Perencanaan Karier & Minat Kuliah PTN', kategori: 'KARIER', status: 'SELESAI', meanDays: 2 },
      { siswa: createdSiswa[9], judul: 'Penanganan Konflik Hubungan Pertemanan di Kelas', kategori: 'SOSIAL', status: 'SELESAI', meanDays: 4 },
      { siswa: createdSiswa[10], judul: 'Konseling Masalah Kehadiran & Motivasi Belajar', kategori: 'PRIBADI', status: 'SELESAI', meanDays: 2 },
    ];

    for (const bkc of bkCases) {
      await prisma.kasusBK.create({
        data: {
          tenant_id: tenantId,
          siswa_id: bkc.siswa.id,
          guru_id: guruBk.id,
          judul_kasus: bkc.judul,
          kategori: bkc.kategori,
          status: bkc.status,
          tanggal_kasus: subDays(today, 7),
          deskripsi: `Sesi bimbingan konseling dan konseling individual bersama guru BK ${guruBk.nama_guru}.`,
        }
      });
    }

    // --- J. PILAR 4: SARANA & PRASARANA (SARPRAS) ---
    console.log('🏢 Generating Sarpras, Aset KIB & Fasilitas...');
    
    const ruanganData = [
      { kode: 'LAB-RPL-01', nama: 'Laboratorium Rekayasa Perangkat Lunak 1', kapasitas: 36 },
      { kode: 'LAB-TKJ-01', nama: 'Laboratorium Jaringan Cisco & Fiber Optic', kapasitas: 36 },
      { kode: 'STUDIO-DKV', nama: 'Studio Multimedia & Animasi DKV', kapasitas: 30 },
      { kode: 'AULA-UTAMA', nama: 'Aula Graha Graha Wiyata Utama', kapasitas: 500 },
      { kode: 'RUANG-GURU', nama: 'Ruang Guru & Tata Usaha Utama', kapasitas: 50 },
    ];

    for (const r of ruanganData) {
      await prisma.masterRuangan.upsert({
        where: { id: `${tenantId}-${r.kode}` },
        update: { nama_ruangan: r.nama, kapasitas: r.kapasitas },
        create: {
          id: `${tenantId}-${r.kode}`,
          tenant_id: tenantId,
          kode_ruangan: r.kode,
          nama_ruangan: r.nama,
          kapasitas: r.kapasitas,
          kondisi: 'BAIK',
        }
      });
    }

    const sarprasAssets = [
      { nama: 'PC All-in-One Core i7 16GB (Lab RPL)', kode: 'KIB-B-001', kategori: 'PERALATAN_LAB', jumlah: 36, kondisi: 'BAIK' },
      { nama: 'Smart Interactive Flat Panel Display 75 Inch', kode: 'KIB-B-002', kategori: 'MEDIA_PEMBELAJARAN', jumlah: 4, kondisi: 'BAIK' },
      { nama: 'Server Dell PowerEdge R740 Rackmount', kode: 'KIB-B-003', kategori: 'SERVER_JARINGAN', jumlah: 2, kondisi: 'BAIK' },
      { nama: 'Kamera Mirrorless Sony A6400 & Lensa 18-105mm', kode: 'KIB-B-004', kategori: 'STUDIO_DKV', jumlah: 6, kondisi: 'BAIK' },
      { nama: 'Router Cisco Catalyst & Switch Managed 24 Port', kode: 'KIB-B-005', kategori: 'LAB_TKJ', jumlah: 12, kondisi: 'BAIK' },
    ];

    for (const sa of sarprasAssets) {
      await prisma.sarprasAsset.create({
        data: {
          tenant_id: tenantId,
          nama_aset: sa.nama,
          kode_aset: sa.kode,
          kategori: sa.kategori,
          kondisi: sa.kondisi,
          harga_perolehan: 15000000,
          tahun_perolehan: 2024,
        }
      });
    }

    // Usulan Perbaikan Sarpras
    await prisma.sarprasAssetRepair.create({
      data: {
        tenant_id: tenantId,
        deskripsi_kerusakan: 'Penggantian pendingin ruangan (AC 2 PK) Lab RPL 1 tidak dingin',
        status: 'PENDING_APPROVAL',
        estimasi_biaya: 3500000,
        pelapor_nama: 'Ahmad Fauzi, S.T. (Waka Sarpras)',
      }
    });

    // --- K. PILAR 5: HUBIN, PKL & KEMITRAAN DUDI ---
    console.log('🤝 Generating Hubungan Industri, PKL & Mitra DUDI...');

    const mitraList = [
      { nama: 'PT Telkom Indonesia (Persero) Tbk', bidang: 'Telekomunikasi & Jaringan' },
      { nama: 'PT Astra International Tbk - TSO', bidang: 'Otomotif & Manufaktur' },
      { nama: 'CV Inovasi Teknologi Solusindo', bidang: 'Software Development & IT' },
      { nama: 'PT Surya Digital Kreatif', bidang: 'Desain Grafis & Multimedia' },
      { nama: 'Bank BJB Cabang Utama', bidang: 'Perbankan & Administrasi Bisnis' },
    ];

    for (const m of mitraList) {
      const mitra = await prisma.mitraIndustri.create({
        data: {
          tenant_id: tenantId,
          nama_perusahaan: m.nama,
          bidang_usaha: m.bidang,
          alamat: 'Kawasan Industri Terpadu, Jawa Barat',
          status_kerjasama: 'AKTIF',
          kuota_siswa: 10,
        }
      });

      // Tempatkan siswa PKL aktif
      await prisma.siswaPkl.create({
        data: {
          tenant_id: tenantId,
          siswa_id: createdSiswa[10].id,
          mitra_id: mitra.id,
          guru_pembimbing_id: createdGuru[4].id,
          tanggal_mulai: new Date(2025, 7, 1),
          tanggal_selesai: new Date(2025, 11, 30),
          status: 'SEDANG_PKL',
        }
      });
    }

    // Lowongan BKK
    await prisma.hubinLowongan.create({
      data: {
        tenant_id: tenantId,
        posisi: 'Junior Front-End Developer (React.js / Tailwind)',
        perusahaan: 'CV Inovasi Teknologi Solusindo',
        tipe_pekerjaan: 'FULL_TIME',
        status: 'OPEN',
        deskripsi: 'Dibutuhkan alumni SMK kompeten dalam pengembangan aplikasi antarmuka web modern.',
      }
    });

    // --- L. PILAR 6: TATA USAHA & PERSURATAN ---
    console.log('🏛️ Generating Tata Usaha & Buku Agenda Surat...');

    const suratMasukList = [
      { nomor: '421.5/1042/Disdik-Jabar/2026', perihal: 'Undangan Rapat Koordinasi Kepala SMK Se-Jawa Barat', pengirim: 'Dinas Pendidikan Provinsi Jawa Barat' },
      { nomor: '089/HRD-TELKOM/VIII/2026', perihal: 'Konfirmasi Penerimaan Siswa Praktik Kerja Lapangan (PKL) Gelombang 2', pengirim: 'PT Telkom Indonesia' },
      { nomor: '112/BBPMPV-BMTI/2026', perihal: 'Sosialisasi Sertifikasi Kompetensi Keahlian Berstandar BNSP', pengirim: 'Balai Besar Pengembangan Penjaminan Mutu Pendidikan Vokasi' },
    ];

    for (const sm of suratMasukList) {
      await prisma.suratMasuk.create({
        data: {
          tenant_id: tenantId,
          nomor_surat: sm.nomor,
          perihal: sm.perihal,
          asal_surat: sm.pengirim,
          tanggal_surat: subDays(today, 2),
          tanggal_terima: today,
          status_disposisi: 'MENUNGGU_DISPOSISI',
        }
      });
    }

    const suratKeluarList = [
      { nomor: '421.3/089/SMKN1-AB/VIII/2026', perihal: 'Surat Keputusan Penugasan Pembimbing Lomba Keterampilan Siswa (LKS)', tujuan: 'Guru Pembimbing Terkait' },
      { nomor: '421.3/090/SMKN1-AB/VIII/2026', perihal: 'Surat Keterangan Aktif Mengajar & Beban Jam Kerja Guru Semester Ganjil', tujuan: 'Dinas Pendidikan Jawa Barat' },
    ];

    for (const sk of suratKeluarList) {
      await prisma.suratKeluar.create({
        data: {
          tenant_id: tenantId,
          nomor_surat: sk.nomor,
          perihal: sk.perihal,
          tujuan: sk.tujuan,
          tanggal_surat: today,
          status_approval: 'MENUNGGU_TTD_KEPSEK',
        }
      });
    }

    console.log(`✨ Sukses seeding data organik 360° untuk Tenant: ${tenant.name}!`);
  }

  console.log('\n🎉 [SEEKER COMPLETED] Seluruh pilar dashboard Kepala Sekolah kini memiliki data organik yang mengalir nyata!');
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding data organik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
