const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function subDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function run() {
  console.log('🚀 [ORGANIC SEEDER] Memulai injeksi data organik 360° untuk seluruh pilar eksekutif...');

  const today = new Date();
  const todayStart = startOfDay(today);

  // Dapatkan semua tenant non-system
  const tenants = await prisma.tenant.findMany({
    where: {
      id: { not: 'system' }
    }
  });

  console.log(`📋 Ditemukan ${tenants.length} tenant untuk diisi data organik.`);

  for (const tenant of tenants) {
    const tenantId = tenant.id;
    console.log(`\n======================================================`);
    console.log(`🏫 Memproses Tenant: ${tenant.name} (${tenantId})`);
    console.log(`======================================================`);

    // 1. Pastikan Sekolah Ada
    let sekolah = await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
    if (!sekolah) {
      sekolah = await prisma.sekolah.create({
        data: {
          tenant_id: tenantId,
          nama: tenant.name,
          kepala_sekolah: 'Dr. H. Mulyadi, M.Pd.',
          nip_kepala: '197508122000031001',
        }
      });
    }

    // 2. Pastikan Tapel & Semester Aktif
    let tapel = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    if (!tapel) {
      tapel = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId } });
      if (tapel) {
        await prisma.tahunPelajaran.update({ where: { id: tapel.id }, data: { is_active: true } });
      } else {
        tapel = await prisma.tahunPelajaran.create({
          data: {
            tenant_id: tenantId,
            tahun: '2025/2026',
            is_active: true,
          }
        });
      }
    }

    let semester = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    if (!semester) {
      semester = await prisma.semester.findFirst({ where: { tenant_id: tenantId, tahun_pelajaran_id: tapel.id } });
      if (semester) {
        await prisma.semester.update({ where: { id: semester.id }, data: { is_active: true } });
      } else {
        semester = await prisma.semester.create({
          data: {
            tenant_id: tenantId,
            tahun_pelajaran_id: tapel.id,
            nama_semester: 'Ganjil',
            is_active: true,
          }
        });
      }
    }

    // 3. Dapatkan Guru, Siswa, Kelas, Mapel
    const guruList = await prisma.guru.findMany({ where: { tenant_id: tenantId } });
    const kelases = await prisma.kelas.findMany({ where: { tenant_id: tenantId } });
    const mapels = await prisma.mapel.findMany({ where: { tenant_id: tenantId } });
    const siswaList = await prisma.siswa.findMany({ where: { tenant_id: tenantId } });

    console.log(`📊 Statistik Core: ${guruList.length} Guru, ${kelases.length} Kelas, ${siswaList.length} Siswa, ${mapels.length} Mapel`);

    // --- PILAR 1: SESI GERBANG & PRESENSI HARI INI + 14 HARI TERAKHIR ---
    console.log('📡 [Pilar KBM] Menyemai Sesi Gerbang, Presensi Live & Grafik Bulanan...');

    // Buat Sesi Gerbang untuk hari ini & beberapa hari ke belakang
    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
      const targetDay = subDays(today, dayOffset);
      if (targetDay.getDay() === 0 || targetDay.getDay() === 6) continue; // Skip weekend

      const targetDayStart = startOfDay(targetDay);
      const waktuMulai = new Date(targetDayStart);
      waktuMulai.setHours(6, 0, 0, 0);

      const waktuSelesai = new Date(targetDayStart);
      waktuSelesai.setHours(16, 0, 0, 0);

      let sesiGerbang = await prisma.sesiGerbang.findFirst({
        where: { tenant_id: tenantId, tanggal: targetDayStart }
      });

      if (!sesiGerbang) {
        sesiGerbang = await prisma.sesiGerbang.create({
          data: {
            tenant_id: tenantId,
            sekolah_id: sekolah.id,
            tanggal: targetDayStart,
            waktu_mulai: waktuMulai,
            waktu_selesai: waktuSelesai,
            status: dayOffset === 0 ? 'BERLANGSUNG' : 'SELESAI',
            tahun_pelajaran_id: tapel.id,
          }
        }).catch(() => null);
      }

      if (sesiGerbang) {
        // Presensi Guru di Gerbang
        for (let idx = 0; idx < Math.min(guruList.length, 30); idx++) {
          const guru = guruList[idx];
          const jamTap = new Date(targetDayStart);
          jamTap.setHours(6, 30 + (idx % 25), 0, 0);

          const statusGuru = idx === 0 ? 'HADIR' : (idx % 12 === 0 ? 'IZIN' : (idx % 15 === 0 ? 'SAKIT' : 'HADIR'));

          await prisma.absenGerbangGuru.upsert({
            where: {
              sesi_gerbang_id_guru_id_arah: {
                sesi_gerbang_id: sesiGerbang.id,
                guru_id: guru.id,
                arah: 'GERBANG_DATANG',
              }
            },
            update: { status: statusGuru, waktu_tap: jamTap },
            create: {
              tenant_id: tenantId,
              sesi_gerbang_id: sesiGerbang.id,
              guru_id: guru.id,
              arah: 'GERBANG_DATANG',
              status: statusGuru,
              waktu_tap: jamTap,
              poin_kehadiran: statusGuru === 'HADIR' ? 100 : (statusGuru === 'TERLAMBAT' ? 75 : 0),
              verification_method: 'RFID',
            }
          }).catch(() => {});
        }

        // Presensi Siswa di Gerbang
        for (let idx = 0; idx < Math.min(siswaList.length, 100); idx++) {
          const siswa = siswaList[idx];
          const jamTap = new Date(targetDayStart);
          jamTap.setHours(6, 20 + (idx % 38), 0, 0);

          const statusSiswa = idx % 28 === 0 ? 'ALPA' : (idx % 20 === 0 ? 'SAKIT' : (idx % 15 === 0 ? 'IZIN' : (idx % 18 === 0 ? 'TERLAMBAT' : 'HADIR')));

          if (statusSiswa !== 'ALPA') {
            await prisma.absenGerbangSiswa.upsert({
              where: {
                sesi_gerbang_id_siswa_id_arah: {
                  sesi_gerbang_id: sesiGerbang.id,
                  siswa_id: siswa.id,
                  arah: 'GERBANG_DATANG',
                }
              },
              update: { status: statusSiswa, waktu_tap: jamTap },
              create: {
                tenant_id: tenantId,
                sesi_gerbang_id: sesiGerbang.id,
                siswa_id: siswa.id,
                arah: 'GERBANG_DATANG',
                status: statusSiswa,
                waktu_tap: jamTap,
                is_terlambat: statusSiswa === 'TERLAMBAT',
                poin_kehadiran: statusSiswa === 'HADIR' ? 100 : (statusSiswa === 'TERLAMBAT' ? 70 : 0),
                verification_method: 'RFID',
              }
            }).catch(() => {});
          }
        }
      }
    }

    // Sesi KBM Live Hari Ini di Kelas
    if (kelases.length > 0 && mapels.length > 0 && guruList.length > 0) {
      for (let i = 0; i < Math.min(kelases.length, 8); i++) {
        const kl = kelases[i];
        const mp = mapels[i % mapels.length];
        const gr = guruList[i % guruList.length];

        let sesi = await prisma.sesiAbsensi.findFirst({
          where: { tenant_id: tenantId, kelas_id: kl.id, tanggal: todayStart }
        });

        if (!sesi) {
          sesi = await prisma.sesiAbsensi.create({
            data: {
              tenant_id: tenantId,
              kelas_id: kl.id,
              mapel_id: mp.id,
              guru_id: gr.id,
              tahun_pelajaran_id: tapel.id,
              semester_id: semester.id,
              tanggal: todayStart,
              waktu_mulai: new Date(),
              status: i < 4 ? 'ACTIVE' : 'SELESAI',
              jenis_kegiatan: 'KBM',
              sumber_sesi: 'MANUAL',
            }
          }).catch(() => null);
        }

        if (sesi) {
          const classStudents = siswaList.filter(s => s.kelas_id === kl.id);
          for (const sw of classStudents.slice(0, 15)) {
            let sa = await prisma.siswaAkademik.findFirst({
              where: { siswa_id: sw.id, tahun_pelajaran_id: tapel.id, semester_id: semester.id }
            });
            if (!sa) {
              sa = await prisma.siswaAkademik.create({
                data: {
                  tenant_id: tenantId,
                  siswa_id: sw.id,
                  kelas_id: kl.id,
                  tahun_pelajaran_id: tapel.id,
                  semester_id: semester.id,
                }
              }).catch(() => null);
            }

            const existingAbsen = await prisma.absenSiswa.findFirst({
              where: { sesi_id: sesi.id, siswa_id: sw.id }
            });

            if (!existingAbsen && sa) {
              await prisma.absenSiswa.create({
                data: {
                  tenant_id: tenantId,
                  sesi_id: sesi.id,
                  siswa_id: sw.id,
                  siswa_akademik_id: sa.id,
                  status: 'H',
                  is_terlambat: false,
                  kelas_id_snapshot: kl.id,
                  kelas_nama_snapshot: kl.nama_kelas,
                  tahun_pelajaran_id_snapshot: tapel.id,
                }
              }).catch(() => {});
            }
          }
        }
      }
    }

    // --- PILAR 2: KESISWAAN, PELANGGARAN & PRESTASI SISWA ---
    console.log('⚖️ [Pilar Kesiswaan] Menyemai catatan pelanggaran dan prestasi siswa...');
    
    // Jenis Pelanggaran
    const jpData = [
      { nama: 'Terlambat Masuk Sekolah (> 15 Menit)', poin: 5, kat: 'KEDISIPLINAN' },
      { nama: 'Atribut Seragam Tidak Lengkap', poin: 5, kat: 'KERAPIAN' },
      { nama: 'Meninggalkan Jam KBM Tanpa Izin', poin: 15, kat: 'KEDISIPLINAN' },
      { nama: 'Menggunakan Gadget Saat Praktik', poin: 10, kat: 'KETERTIBAN' },
      { nama: 'Merokok di Lingkungan Sekolah', poin: 35, kat: 'BERAT' },
    ];

    for (const jp of jpData) {
      await prisma.jenisPelanggaran.upsert({
        where: { id: `${tenantId}-${jp.nama.substring(0, 8).replace(/\s+/g, '_')}` },
        update: { poin: jp.poin },
        create: {
          id: `${tenantId}-${jp.nama.substring(0, 8).replace(/\s+/g, '_')}`,
          tenant_id: tenantId,
          nama_pelanggaran: jp.nama,
          poin: jp.poin,
          kategori: jp.kat,
        }
      }).catch(() => {});
    }

    if (siswaList.length >= 5) {
      const pelanggaranSamples = [
        { siswa: siswaList[0], jenis: jpData[4].nama, poin: 35, status: 'PERLU_PEMBINAAN', ket: 'Merokok di area kantin belakang sekolah' },
        { siswa: siswaList[1], jenis: jpData[2].nama, poin: 15, status: 'PROSES', ket: 'Keluar kelas saat jam pelajaran produktif' },
        { siswa: siswaList[2], jenis: jpData[0].nama, poin: 5, status: 'SELESAI', ket: 'Terlambat hadir 20 menit' },
        { siswa: siswaList[0], jenis: jpData[1].nama, poin: 5, status: 'PERLU_PEMBINAAN', ket: 'Tidak memakai ikat pinggang dan dasi' },
      ];

      for (const pel of pelanggaranSamples) {
        await prisma.pelanggaranSiswa.create({
          data: {
            tenant_id: tenantId,
            siswa_id: pel.siswa.id,
            tanggal: subDays(today, 1),
            jenis_pelanggaran: pel.jenis,
            poin: pel.poin,
            status: pel.status,
            keterangan: pel.ket,
            tahun_pelajaran_id: tapel.id,
            semester_id: semester.id,
          }
        }).catch(() => {});
      }

      // Prestasi Siswa
      const prestasiSamples = [
        { siswa: siswaList[3], nama: 'Juara 1 Lomba Kompetensi Siswa (LKS) Web Technologies', poin: 100 },
        { siswa: siswaList[4], nama: 'Juara 2 Olimpiade Jaringan Komputer Cyber Security', poin: 75 },
        { siswa: siswaList[2], nama: 'Medali Emas Futsal Pelajar Tingkat Kota', poin: 50 },
      ];

      for (const pres of prestasiSamples) {
        await prisma.prestasiSiswa.create({
          data: {
            tenant_id: tenantId,
            siswa_id: pres.siswa.id,
            nama_prestasi: pres.nama,
            poin: pres.poin,
            tanggal: subDays(today, 3),
            keterangan: 'Apresiasi resmi pada upacara bendera hari Senin',
          }
        }).catch(() => {});
      }
    }

    // --- PILAR 3: BIMBINGAN KONSELING (BP/BK) ---
    console.log('🧠 [Pilar BP/BK] Menyemai kasus bimbingan konseling dan EWS...');
    if (siswaList.length >= 4) {
      const bkList = [
        { siswa: siswaList[0], judul: 'Bimbingan Konseling Kedisiplinan & Motivasi Belajar', kat: 'DISIPLIN', status: 'DALAM_PENANGANAN' },
        { siswa: siswaList[1], judul: 'Konsultasi Perencanaan Karier & Minat Industri', kat: 'KARIER', status: 'SELESAI' },
        { siswa: siswaList[2], judul: 'Penanganan Masalah Hubungan Sosial Siswa', kat: 'SOSIAL', status: 'SELESAI' },
        { siswa: siswaList[3], judul: 'Konseling Masalah Kehadiran & Jam Belajar', kat: 'PRIBADI', status: 'SELESAI' },
      ];

      for (const bkc of bkList) {
        await prisma.kasusBK.create({
          data: {
            tenant_id: tenantId,
            siswa_id: bkc.siswa.id,
            judul_kasus: bkc.judul,
            kategori: bkc.kat,
            status: bkc.status,
            tanggal_kasus: subDays(today, 5),
            deskripsi: 'Sesi konseling individual dan evaluasi kepatuhan tata tertib bersama guru BK.',
          }
        }).catch(() => {});
      }
    }

    // --- PILAR 4: SARPRAS & FASILITAS ---
    console.log('🏢 [Pilar Sarpras] Menyemai data aset KIB, ruangan dan usulan perbaikan...');
    
    // Master Ruangan
    const rooms = [
      { kode: 'LAB-RPL-1', nama: 'Laboratorium Rekayasa Perangkat Lunak 1', kap: 36 },
      { kode: 'LAB-TKJ-1', nama: 'Laboratorium Jaringan Komputer Cisco', kap: 36 },
      { kode: 'STUDIO-DKV', nama: 'Studio Multimedia & Animasi DKV', kap: 30 },
      { kode: 'AULA-UTAMA', nama: 'Aula Graha Wiyata Utama', kap: 500 },
      { kode: 'RUANG-GURU', nama: 'Ruang Guru & Pusat Akademik', kap: 50 },
    ];

    for (const rm of rooms) {
      await prisma.masterRuangan.upsert({
        where: { id: `${tenantId}-${rm.kode}` },
        update: { nama_ruangan: rm.nama, kapasitas: rm.kap },
        create: {
          id: `${tenantId}-${rm.kode}`,
          tenant_id: tenantId,
          kode_ruangan: rm.kode,
          nama_ruangan: rm.nama,
          kapasitas: rm.kap,
        }
      }).catch(() => {});
    }

    // Aset KIB Sarpras
    const sarprasItems = [
      { nama: 'PC All-in-One Core i7 16GB (Lab Komputer 1)', kode: 'KIB-B-001', kat: 'PERALATAN_LAB' },
      { nama: 'Interactive Smart Board Display 75 Inch', kode: 'KIB-B-002', kat: 'MEDIA_PEMBELAJARAN' },
      { nama: 'Server Dell PowerEdge Rackmount', kode: 'KIB-B-003', kat: 'SERVER_JARINGAN' },
      { nama: 'Kamera Mirrorless Sony Alpha A6400 4K', kode: 'KIB-B-004', kat: 'STUDIO_DKV' },
      { nama: 'Router Cisco Catalyst & Managed Switch', kode: 'KIB-B-005', kat: 'LAB_TKJ' },
    ];

    for (const sa of sarprasItems) {
      await prisma.sarprasAsset.create({
        data: {
          tenant_id: tenantId,
          nama: sa.nama,
          kode_barang: sa.kode,
          kategori: sa.kat,
          kondisi: 'BAIK',
          tahun_perolehan: 2024,
        }
      }).catch(() => {});
    }

    // Usulan Perbaikan
    await prisma.sarprasAssetRepair.create({
      data: {
        tenant_id: tenantId,
        deskripsi: 'Perbaikan pendingin ruangan AC 2 PK Lab RPL 1',
        status: 'PENDING_APPROVAL',
        estimasi_biaya: 3500000,
        pelapor_nama: 'Waka Sarana & Prasarana',
      }
    }).catch(() => {});

    // --- PILAR 5: HUBIN & MITRA INDUSTRI ---
    console.log('🤝 [Pilar Hubin] Menyemai data mitra DUDI, siswa PKL dan loker BKK...');
    
    const mitraNames = [
      { nama: 'PT Telkom Indonesia (Persero) Tbk', bidang: 'Telekomunikasi & Jaringan' },
      { nama: 'PT Astra International Tbk - TSO', bidang: 'Otomotif & Manufaktur' },
      { nama: 'CV Inovasi Teknologi Solusindo', bidang: 'Software Development & IT' },
      { nama: 'PT Surya Digital Kreatif', bidang: 'Desain Grafis & Multimedia' },
      { nama: 'Bank BJB Cabang Utama', bidang: 'Perbankan & Administrasi' },
    ];

    for (const m of mitraNames) {
      const mitra = await prisma.mitraIndustri.create({
        data: {
          tenant_id: tenantId,
          nama_mitra: m.nama,
          bidang_usaha: m.bidang,
          alamat: 'Kawasan Industri Terpadu Jawa Barat',
          status_mou: 'AKTIF',
          kuota_pkl: 10,
        }
      }).catch(() => null);

      if (mitra && siswaList.length >= 5) {
        await prisma.siswaPkl.create({
          data: {
            tenant_id: tenantId,
            siswa_id: siswaList[4].id,
            mitra_id: mitra.id,
            tanggal_mulai: new Date(2025, 7, 1),
            tanggal_selesai: new Date(2025, 11, 30),
            status: 'SEDANG_PKL',
          }
        }).catch(() => {});
      }
    }

    // Lowongan BKK
    await prisma.hubinLowongan.create({
      data: {
        tenant_id: tenantId,
        judul_lowongan: 'Junior Front-End Developer (React.js & Tailwind)',
        perusahaan: 'CV Inovasi Teknologi Solusindo',
        tipe_pekerjaan: 'FULL_TIME',
        status: 'OPEN',
        deskripsi: 'Dibutuhkan alumni SMK kompeten dalam pengembangan antarmuka web modern.',
      }
    }).catch(() => {});

    // --- PILAR 6: TATA USAHA & PERSURATAN ---
    console.log('🏛️ [Pilar TU] Menyemai buku agenda surat masuk & keluar...');

    const suratMasukList = [
      { no: '421.5/1042/Disdik-Jabar/2026', perihal: 'Undangan Rapat Koordinasi Kepala SMK Se-Jawa Barat', pengirim: 'Dinas Pendidikan Provinsi Jawa Barat' },
      { no: '089/HRD-TELKOM/VIII/2026', perihal: 'Konfirmasi Penerimaan Siswa PKL Gelombang 2', pengirim: 'PT Telkom Indonesia' },
      { no: '112/BBPMPV-BMTI/2026', perihal: 'Sosialisasi Sertifikasi Kompetensi Berstandar BNSP', pengirim: 'Balai Besar Pengembangan Vokasi' },
    ];

    for (const sm of suratMasukList) {
      await prisma.suratMasuk.create({
        data: {
          tenant_id: tenantId,
          nomor_surat: sm.no,
          isi_ringkas: sm.perihal,
          asal_surat: sm.pengirim,
          tanggal_surat: subDays(today, 2),
          tanggal_diterima: today,
          status_disposisi: 'BELUM_DISPOSISI',
        }
      }).catch(() => {});
    }

    const suratKeluarList = [
      { no: '421.3/089/SMKN1/VIII/2026', perihal: 'Surat Keputusan Penugasan Pembimbing Lomba LKS', tujuan: 'Guru Pembimbing Terkait' },
      { no: '421.3/090/SMKN1/VIII/2026', perihal: 'Surat Rekomendasi Magang Industri Siswa Berprestasi', tujuan: 'Industri Terkait' },
    ];

    for (const sk of suratKeluarList) {
      await prisma.suratKeluar.create({
        data: {
          tenant_id: tenantId,
          nomor_surat: sk.no,
          isi_ringkas: sk.perihal,
          tujuan: sk.tujuan,
          tanggal_surat: today,
          status_surat: 'DRAFT',
        }
      }).catch(() => {});
    }

    console.log(`✅ Sukses menyemai data organik untuk: ${tenant.name}`);
  }

  console.log('\n🎉 [ORGANIC SEEDING SELESAI] Seluruh 6 pilar dashboard Kepala Sekolah kini memiliki data organik yang lengkap dan hidup!');
}

run()
  .catch((e) => {
    console.error('❌ Error seeding data organik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
