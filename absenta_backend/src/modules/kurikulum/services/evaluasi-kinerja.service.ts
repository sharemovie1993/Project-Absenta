import { prisma } from '@/utils/prisma';

export interface EvaluasiPillarScores {
  presensi: number;      // 0 - 100 (Bobot 20%)
  kbmJam: number;        // 0 - 100 (Bobot 25%)
  jurnalKbm: number;     // 0 - 100 (Bobot 20%)
  perangkatAjar: number; // 0 - 100 (Bobot 15%)
  supervisi: number;     // 0 - 100 (Bobot 20%)
  tugasTambahan: number; // 0 - 100
}

export interface EvaluasiMetrics {
  totalHariKerja: number;
  hariHadir: number;
  hariTerlambat: number;
  kehadiranPct: number;
  keterlambatanMenit: number;
  izinSakitCount: number;
  alpaCount: number;
  jamMengajarMingguan: number;
  jamMengajarTotal: number;
  jamMengajarRealisasi: number;
  kbmRealisasiPct: number;
  jurnalTotalSesi: number;
  jurnalTerisiCount: number;
  jurnalTerisiPct: number;
  perangkatExpected: number;
  perangkatTotal: number;
  perangkatApproved: number;
  perangkatStatus: 'LENGKAP' | 'REVIEW' | 'KURANG';
  supervisiSkor: number;
  supervisiStatus: 'SELESAI' | 'TERJADWAL' | 'BELUM_ADA';
  supervisiTanggal: string | null;
  catatanPenilai: string | null;
  tugasTambahanList: string[];
}

export interface TeacherEvaluationRecord {
  id: string;
  nama: string;
  nip: string;
  foto?: string | null;
  mapel: string;
  jabatan: string;
  statusKepegawaian: string;
  compositeScore: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  predikatLabel: string;
  pillarScores: EvaluasiPillarScores;
  metrics: EvaluasiMetrics;
  rekomendasi: string;
  pembinaanKhusus?: string | null;
  keunggulan: string[];
  areaPerbaikan: string[];
}

export interface EvaluasiSummary {
  totalGuru: number;
  avgScore: number;
  predikatDist: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  topPerformers: Array<{ id: string; nama: string; score: number; predikat: string; mapel: string }>;
  needsAttentionCount: number;
  pillarAverages: {
    presensi: number;
    kbmJam: number;
    jurnalKbm: number;
    perangkatAjar: number;
    supervisi: number;
  };
}

export interface EvaluasiKinerjaResponse {
  summary: EvaluasiSummary;
  data: TeacherEvaluationRecord[];
}

export class EvaluasiKinerjaService {
  /**
   * Menghasilkan laporan Evaluasi Kinerja Guru komprehensif 5 pilar standar industri
   */
  static async getEvaluasiList(tenantId: string, filters?: {
    tahun_pelajaran_id?: string;
    semester_id?: string;
    search?: string;
    predikat?: string;
    status_kepegawaian?: string;
    guru_id?: string;
  }): Promise<EvaluasiKinerjaResponse> {
    const { tahun_pelajaran_id, semester_id, search, predikat, status_kepegawaian, guru_id } = filters || {};

    // 1. Ambil daftar Guru yang memenuhi kualifikasi evaluasi:
    // - Semua Guru / Pendidik / Kepsek / jenis_ptk null (default)
    // - DAN Tenaga Kependidikan / TU yang memiliki penugasan mengajar (JadwalKBM / GuruMapel / SesiAbsensi > 0)
    const guruWhere: any = {
      tenant_id: tenantId,
      OR: [
        { jenis_ptk: { in: ['PENDIDIK', 'GURU', 'KEPALA_SEKOLAH'] } },
        { jenis_ptk: null },
        {
          jenis_ptk: 'TENAGA_KEPENDIDIKAN',
          OR: [
            { JadwalKBM: { some: { tenant_id: tenantId } } },
            { GuruMapel: { some: { tenant_id: tenantId } } },
            { SesiAbsensi: { some: { tenant_id: tenantId } } },
            { AbsenGuru: { some: { tenant_id: tenantId } } },
          ]
        }
      ]
    };
    if (guru_id) guruWhere.id = guru_id;
    if (status_kepegawaian && status_kepegawaian !== 'ALL') {
      guruWhere.status_kepegawaian = status_kepegawaian;
    }

    const gurus = await prisma.guru.findMany({
      where: guruWhere,
      select: {
        id: true,
        user_id: true,
        nama_guru: true,
        nip: true,
        foto: true,
        jenis_ptk: true,
        status_kepegawaian: true,
        jabatan: true,
      },
      orderBy: { nama_guru: 'asc' },
    });

    const guruIds = gurus.map(g => g.id);
    const userIds = gurus.map(g => g.user_id).filter(Boolean);

    if (guruIds.length === 0) {
      return {
        summary: {
          totalGuru: 0,
          avgScore: 0,
          predikatDist: { A: 0, B: 0, C: 0, D: 0 },
          topPerformers: [],
          needsAttentionCount: 0,
          pillarAverages: {
            presensi: 0,
            kbmJam: 0,
            jurnalKbm: 0,
            perangkatAjar: 0,
            supervisi: 0,
          },
        },
        data: [],
      };
    }

    // 2. Query Data Presensi Gerbang Guru
    const absenGerbangList = await prisma.absenGerbangGuru.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: { in: guruIds },
        arah: 'GERBANG_DATANG',
      },
      select: {
        guru_id: true,
        status: true,
        is_terlambat: true,
        menit_keterlambatan: true,
        waktu_tap: true,
      },
    });

    // 3. Query Data Presensi Sesi Kelas Guru
    const absenSesiGuruList = await prisma.absenGuru.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: { in: guruIds },
        tahun_pelajaran_id: tahun_pelajaran_id || undefined,
        semester_id: semester_id || undefined,
      },
      select: {
        guru_id: true,
        status: true,
        is_terlambat: true,
        menit_keterlambatan: true,
      },
    });

    // 4. Query Perencanaan Beban Mengajar (JadwalKBM)
    const templates = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: { in: guruIds },
        tahun_pelajaran_id: tahun_pelajaran_id || undefined,
        semester_id: semester_id || undefined,
      },
      include: {
        Mapel: { select: { id: true, nama_mapel: true } },
        Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
      },
    });

    // 5. Query Ploting Guru Mapel
    const guruMapelList = await prisma.guruMapel.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: { in: guruIds },
        tahun_pelajaran_id: tahun_pelajaran_id || undefined,
        semester_id: semester_id || undefined,
      },
      include: {
        Mapel: { select: { id: true, nama_mapel: true } },
        Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
      },
    });

    // 6. Query Struktur Kurikulum (Alokasi JP Standar)
    const strukturList = await prisma.strukturKurikulum.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: tahun_pelajaran_id || undefined,
      },
      select: {
        mapel_id: true,
        tingkat: true,
        jp_per_minggu: true,
      },
    });

    const strukturMap = new Map<string, number>();
    for (const st of strukturList) {
      strukturMap.set(`${st.mapel_id}_${st.tingkat}`, st.jp_per_minggu);
    }

    // 7. Query Realisasi Sesi KBM & Jurnal Materi & Absensi Siswa
    const sesiList = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: { in: guruIds },
        tahun_pelajaran_id: tahun_pelajaran_id || undefined,
        semester_id: semester_id || undefined,
      },
      select: {
        id: true,
        guru_id: true,
        status: true,
        slot_kbm: true,
        keterangan: true,
        ProgresMateri: {
          select: {
            judul_materi: true,
            deskripsi: true,
            pencapaian_persen: true,
          },
        },
        _count: {
          select: {
            AbsenSiswa: true,
          },
        },
      },
    });

    // 8. Query Dokumen Perangkat Ajar
    const perangkatList = await prisma.perangkatAjar.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: { in: guruIds },
        tahun_pelajaran_id: tahun_pelajaran_id || undefined,
        semester_id: semester_id || undefined,
      },
      select: {
        guru_id: true,
        status: true,
        jenis: true,
        judul: true,
        mapel_id: true,
      },
    });

    // 9. Query Supervisi Akademik Guru
    const supervisiList = await prisma.supervisiGuru.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: { in: guruIds },
        tahun_pelajaran_id: tahun_pelajaran_id || undefined,
        semester_id: semester_id || undefined,
      },
      orderBy: { tanggal: 'desc' },
      select: {
        guru_id: true,
        status: true,
        nilai: true,
        nilai_self: true,
        catatan: true,
        tanggal: true,
      },
    });

    // 10. Query Penugasan Organisasi (Tugas Tambahan)
    const assignmentsList = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        user_id: { in: userIds },
        is_active: true,
      },
      include: {
        Position: { select: { name: true, code: true } },
        Kelas: { select: { nama_kelas: true } },
      },
    });

    // Hitung total hari kerja aktif sekolah yang terekam (sebagai baseline riil)
    const allUniqueDates = new Set<string>();
    absenGerbangList.forEach(a => {
      if (a.waktu_tap) allUniqueDates.add(new Date(a.waktu_tap).toISOString().slice(0, 10));
    });
    const baselineHariKerja = Math.max(1, allUniqueDates.size);

    // Hitung jumlah minggu efektif semester (standar 18 minggu per semester)
    const WEEKS_PER_SEMESTER = 18;

    // ── Agregasi Lintas 5 Pilar per Guru ──
    const results: TeacherEvaluationRecord[] = [];

    for (const guru of gurus) {
      // ─────────────────────────────────────────────────────────────
      // PILAR 1: PRESENSI & KEDISIPLINAN KERJA (BOBOT 20%)
      // ─────────────────────────────────────────────────────────────
      const myGerbang = absenGerbangList.filter(a => a.guru_id === guru.id);
      const mySesiAbsen = absenSesiGuruList.filter(a => a.guru_id === guru.id);

      const distinctPresenceDates = new Set<string>();
      myGerbang.forEach(a => {
        if (a.waktu_tap) distinctPresenceDates.add(new Date(a.waktu_tap).toISOString().slice(0, 10));
      });

      const totalTeacherDays = Math.max(distinctPresenceDates.size, myGerbang.length, 1);
      const totalExpectedDays = Math.max(totalTeacherDays, baselineHariKerja);

      const hadirCount = myGerbang.filter(a => a.status === 'HADIR' || a.status === 'TEPAT_WAKTU').length;
      const lateCount = myGerbang.filter(a => a.is_terlambat || a.status === 'TERLAMBAT').length;
      const izinSakitCount = myGerbang.filter(a => a.status === 'IZIN' || a.status === 'SAKIT').length;
      const alpaCount = myGerbang.filter(a => a.status === 'ALPA').length;

      const totalLateMinutes = myGerbang.reduce((sum, a) => sum + (a.menit_keterlambatan || 0), 0) +
        mySesiAbsen.reduce((sum, a) => sum + (a.menit_keterlambatan || 0), 0);

      // Tingkat kehadiran aktual (%)
      const totalHadirFisik = hadirCount + lateCount;
      const kehadiranPct = Math.min(100, Math.round(((totalHadirFisik + izinSakitCount) / totalExpectedDays) * 100));

      // Rumus Skor Presensi:
      // Hadir tepat waktu bernilai 100%, Terlambat bernilai 75%, Izin/Sakit bernilai 80%, Alpa -100%.
      // Ditambah pinalti menit keterlambatan (2 poin per 60 menit telat).
      let presensiScore = 100;
      if (myGerbang.length > 0) {
        const weightedPresence = (hadirCount * 100) + (lateCount * 75) + (izinSakitCount * 80) - (alpaCount * 100);
        const rawScore = weightedPresence / totalExpectedDays;
        const latePenalty = Math.floor(totalLateMinutes / 60) * 2;
        presensiScore = Math.max(0, Math.min(100, Math.round(rawScore - latePenalty)));
      } else {
        // Jika belum ada data tap gerbang, evaluasi dari absensi KBM sesi
        if (mySesiAbsen.length > 0) {
          const sesiHadir = mySesiAbsen.filter(s => s.status === 'HADIR' || s.status === 'TEPAT_WAKTU').length;
          const sesiTelat = mySesiAbsen.filter(s => s.status === 'TERLAMBAT' || s.is_terlambat).length;
          presensiScore = Math.min(100, Math.round(((sesiHadir * 100 + sesiTelat * 75) / mySesiAbsen.length)));
        } else {
          presensiScore = 80; // Baseline netral
        }
      }

      // ─────────────────────────────────────────────────────────────
      // PILAR 2: BEBAN & REALISASI JAM MENGAJAR / KBM (BOBOT 25%)
      // ─────────────────────────────────────────────────────────────
      const myTemplates = templates.filter(t => t.guru_id === guru.id);
      const myPloting = guruMapelList.filter(gm => gm.guru_id === guru.id);

      // Kumpulkan seluruh mapel yang diampu
      const mapelSet = new Set<string>();
      myTemplates.forEach(t => { if (t.Mapel?.nama_mapel) mapelSet.add(t.Mapel.nama_mapel); });
      myPloting.forEach(gm => { if (gm.Mapel?.nama_mapel) mapelSet.add(gm.Mapel.nama_mapel); });
      const mapelStr = Array.from(mapelSet).join(', ') || 'Guru Mata Pelajaran';

      // Hitung JP mingguan rencana dari Struktur Kurikulum
      let weeklyPlannedJp = 0;
      const uniqueAssignments = new Set<string>();

      myTemplates.forEach(t => {
        if (!t.mapel_id || !t.Kelas) return;
        const key = `${t.mapel_id}_${t.Kelas.id}`;
        if (!uniqueAssignments.has(key)) {
          uniqueAssignments.add(key);
          const jp = strukturMap.get(`${t.mapel_id}_${t.Kelas.tingkat}`) ?? 2;
          weeklyPlannedJp += jp;
        }
      });

      myPloting.forEach(gm => {
        if (!gm.mapel_id || !gm.Kelas) return;
        const key = `${gm.mapel_id}_${gm.Kelas.id}`;
        if (!uniqueAssignments.has(key)) {
          uniqueAssignments.add(key);
          const jp = strukturMap.get(`${gm.mapel_id}_${gm.Kelas.tingkat}`) ?? 2;
          weeklyPlannedJp += jp;
        }
      });

      if (weeklyPlannedJp === 0 && myTemplates.length > 0) {
        weeklyPlannedJp = myTemplates.length;
      }
      if (weeklyPlannedJp === 0) {
        weeklyPlannedJp = 24; // Beban standar sertifikasi guru 24 JP/minggu
      }

      const totalJpRencanaSemester = weeklyPlannedJp * WEEKS_PER_SEMESTER;

      // Realisasi JP dari sesi KBM berstatus 'CLOSED'
      const mySesi = sesiList.filter(s => s.guru_id === guru.id);
      const closedSesi = mySesi.filter(s => s.status === 'CLOSED');
      const totalJpRealisasi = closedSesi.reduce((sum, s) => sum + (s.slot_kbm || 1), 0);

      // Hitung persentase ketercapaian jam mengajar
      const kbmRealisasiPct = totalJpRencanaSemester > 0
        ? Math.min(100, Math.round((totalJpRealisasi / totalJpRencanaSemester) * 100))
        : 0;

      // Skor KBM: dihitung proporsional terhadap target sesi yang telah berjalan
      let kbmScore = 80;
      if (closedSesi.length > 0) {
        kbmScore = Math.min(100, Math.round((totalJpRealisasi / (weeklyPlannedJp * Math.max(1, Math.ceil(baselineHariKerja / 5)))) * 100));
        kbmScore = Math.min(100, Math.max(20, kbmScore));
      } else if (mySesi.length > 0) {
        kbmScore = 50; // Ada sesi tapi belum ada yang diselesaikan (CLOSED)
      } else {
        kbmScore = 75; // Sesi semester belum dimulai
      }

      // ─────────────────────────────────────────────────────────────
      // PILAR 3: JURNAL KBM & ADMINISTRASI MATERI (BOBOT 20%)
      // ─────────────────────────────────────────────────────────────
      // Sesi sah terisi jurnal bila: memiliki judul/deskripsi materi AND telah melakukan absensi siswa
      const sesiWithJournalAndAbsen = closedSesi.filter(s => {
        const hasMateri = Boolean(s.ProgresMateri?.judul_materi || s.ProgresMateri?.deskripsi || s.keterangan);
        const hasAbsenSiswa = (s._count?.AbsenSiswa || 0) > 0;
        return hasMateri && hasAbsenSiswa;
      });

      const jurnalTerisiPct = closedSesi.length > 0
        ? Math.round((sesiWithJournalAndAbsen.length / closedSesi.length) * 100)
        : (mySesi.length > 0 ? 60 : 85);
      const jurnalScore = jurnalTerisiPct;

      // ─────────────────────────────────────────────────────────────
      // PILAR 4: PERANGKAT AJAR / MODUL AJAR (BOBOT 15%)
      // ─────────────────────────────────────────────────────────────
      const myPerangkat = perangkatList.filter(p => p.guru_id === guru.id);
      const approvedPerangkat = myPerangkat.filter(p => p.status === 'APPROVED' || p.status === 'DISETUJUI');
      const reviewPerangkat = myPerangkat.filter(p => p.status === 'PENDING' || p.status === 'REVIEW');

      // Standar dokumen per mapel yang diampu: 4 dokumen (Modul Ajar, ATP, Prota, Promes)
      const expectedPerangkat = Math.max(4, mapelSet.size * 4);

      let perangkatScore = 70;
      let perangkatStatus: 'LENGKAP' | 'REVIEW' | 'KURANG' = 'KURANG';

      if (approvedPerangkat.length >= expectedPerangkat) {
        perangkatScore = 100;
        perangkatStatus = 'LENGKAP';
      } else if (approvedPerangkat.length + reviewPerangkat.length >= expectedPerangkat) {
        perangkatScore = Math.round(((approvedPerangkat.length * 1.0 + reviewPerangkat.length * 0.7) / expectedPerangkat) * 100);
        perangkatStatus = 'REVIEW';
      } else if (myPerangkat.length > 0) {
        perangkatScore = Math.min(85, Math.round(((approvedPerangkat.length * 1.0 + reviewPerangkat.length * 0.6) / expectedPerangkat) * 100));
        perangkatStatus = 'REVIEW';
      } else {
        perangkatScore = 60;
        perangkatStatus = 'KURANG';
      }

      // ─────────────────────────────────────────────────────────────
      // PILAR 5: SUPERVISI AKADEMIK & OBSERVASI KELAS (BOBOT 20%)
      // ─────────────────────────────────────────────────────────────
      const mySupervisi = supervisiList.filter(s => s.guru_id === guru.id);
      const completedSupervisi = mySupervisi.filter(s => s.status === 'COMPLETED' || s.status === 'SELESAI');
      const latestSupervisi = completedSupervisi[0] || mySupervisi[0] || null;

      let supervisiSkor = 80;
      let supervisiStatus: 'SELESAI' | 'TERJADWAL' | 'BELUM_ADA' = 'BELUM_ADA';
      let supervisiTanggal: string | null = null;
      let catatanPenilai: string | null = null;

      if (latestSupervisi) {
        supervisiTanggal = new Date(latestSupervisi.tanggal).toISOString().slice(0, 10);
        catatanPenilai = latestSupervisi.catatan || null;

        if (latestSupervisi.nilai !== null && latestSupervisi.nilai !== undefined) {
          supervisiSkor = latestSupervisi.nilai;
          supervisiStatus = 'SELESAI';
        } else if (latestSupervisi.nilai_self !== null && latestSupervisi.nilai_self !== undefined) {
          supervisiSkor = latestSupervisi.nilai_self;
          supervisiStatus = 'TERJADWAL';
        } else {
          supervisiSkor = 80;
          supervisiStatus = 'TERJADWAL';
        }
      } else {
        supervisiStatus = 'BELUM_ADA';
        supervisiSkor = 80; // Baseline netral bila belum dijadwalkan supervisi
      }

      // ─────────────────────────────────────────────────────────────
      // PILAR 6: TUGAS TAMBAHAN / KONTRIBUSI KELEMBAGAAN
      // ─────────────────────────────────────────────────────────────
      const myAssignments = assignmentsList.filter(a => a.user_id === guru.user_id);
      const tugasTambahanNames: string[] = [];
      myAssignments.forEach(a => {
        const posName = a.Position?.name || a.Position?.code || 'Tugas Tambahan';
        const kelasName = a.Kelas?.nama_kelas ? ` (${a.Kelas.nama_kelas})` : '';
        tugasTambahanNames.push(`${posName}${kelasName}`);
      });
      if (guru.jabatan && !tugasTambahanNames.some(t => t.toLowerCase().includes(guru.jabatan!.toLowerCase()))) {
        tugasTambahanNames.push(guru.jabatan);
      }

      let tugasTambahanScore = 80;
      if (tugasTambahanNames.length >= 2) {
        tugasTambahanScore = 95;
      } else if (tugasTambahanNames.length === 1) {
        tugasTambahanScore = 90;
      } else {
        tugasTambahanScore = 80;
      }

      // ─────────────────────────────────────────────────────────────
      // PERHITUNGAN SKOR KOMPOSIT 5 PILAR
      // Presensi 20%, Realisasi KBM 25%, Jurnal 20%, Perangkat 15%, Supervisi 20%
      // ─────────────────────────────────────────────────────────────
      const compositeScore = Math.round(
        (presensiScore * 0.20) +
        (kbmScore * 0.25) +
        (jurnalScore * 0.20) +
        (perangkatScore * 0.15) +
        (supervisiSkor * 0.20)
      );

      // Tentukan Predikat
      let predikat: 'A' | 'B' | 'C' | 'D' = 'B';
      let predikatLabel = 'Baik (Memenuhi Standar)';
      if (compositeScore >= 90) {
        predikat = 'A';
        predikatLabel = 'Amat Baik (Sangat Memuaskan)';
      } else if (compositeScore >= 75) {
        predikat = 'B';
        predikatLabel = 'Baik (Sesuai Ekspektasi)';
      } else if (compositeScore >= 60) {
        predikat = 'C';
        predikatLabel = 'Cukup (Perlu Pembinaan)';
      } else {
        predikat = 'D';
        predikatLabel = 'Kurang (Perlu Tindakan Khusus)';
      }

      // ─────────────────────────────────────────────────────────────
      // DIAGNOSTIK KEUNGGULAN, AREA PERBAIKAN, & REKOMENDASI
      // ─────────────────────────────────────────────────────────────
      const keunggulan: string[] = [];
      const areaPerbaikan: string[] = [];

      if (presensiScore >= 90) keunggulan.push(`Kedisiplinan presensi & ketepatan jam kerja sangat prima (${kehadiranPct}%).`);
      else if (presensiScore < 75) areaPerbaikan.push(`Tingkat kehadiran/keterlambatan jam masuk perlu perbaikan (${totalLateMinutes} menit telat).`);

      if (kbmScore >= 90) keunggulan.push(`Realisasi tatap muka KBM sangat tinggi (${totalJpRealisasi} JP terlaksana).`);
      else if (kbmScore < 75) areaPerbaikan.push(`Realisasi jam mengajar KBM belum mencapai target proporsional semester.`);

      if (jurnalScore >= 90) keunggulan.push(`Kepatuhan pengisian jurnal materi & absensi siswa tertib 100%.`);
      else if (jurnalScore < 75) areaPerbaikan.push(`Pengisian resume materi & absensi siswa pada jurnal KBM sering tertunda.`);

      if (perangkatScore >= 90) keunggulan.push(`Perangkat ajar (Modul/RPP, ATP, Prota, Promes) lengkap dan telah disetujui.`);
      else if (perangkatScore < 75) areaPerbaikan.push(`Unggahan modul ajar semester masih berstatus review/kurang.`);

      if (supervisiSkor >= 90) keunggulan.push(`Skor observasi klinis supervisi akademik sangat memuaskan (${supervisiSkor}/100).`);
      else if (supervisiSkor < 75) areaPerbaikan.push(`Penerapan diferensiasi belajar dan interaksi kelas perlu bimbingan supervisi.`);

      // Rekomendasi Utama
      let rekomendasi = '';
      let pembinaanKhusus: string | null = null;

      if (compositeScore >= 90) {
        rekomendasi = `Kinerja unggul dan teladan di seluruh pilar. Direkomendasikan sebagai Guru Penggerak/Pembina MGMPS.`;
      } else if (areaPerbaikan.length > 0) {
        rekomendasi = `Prioritas perbaikan: ${areaPerbaikan[0]}`;
        pembinaanKhusus = areaPerbaikan.slice(0, 2).join(' Serta ');
      } else {
        rekomendasi = `Kinerja telah memenuhi regulasi kurikulum dengan baik. Tingkatkan konsistensi administrasi KBM.`;
      }

      results.push({
        id: guru.id,
        nama: guru.nama_guru,
        nip: guru.nip || '-',
        foto: guru.foto,
        mapel: mapelStr,
        jabatan: guru.jabatan || 'Guru Mata Pelajaran',
        statusKepegawaian: guru.status_kepegawaian || 'PNS',
        compositeScore,
        predikat,
        predikatLabel,
        pillarScores: {
          presensi: presensiScore,
          kbmJam: kbmScore,
          jurnalKbm: jurnalScore,
          perangkatAjar: perangkatScore,
          supervisi: supervisiSkor,
          tugasTambahan: tugasTambahanScore,
        },
        metrics: {
          totalHariKerja: totalExpectedDays,
          hariHadir: totalHadirFisik,
          hariTerlambat: lateCount,
          kehadiranPct,
          keterlambatanMenit: totalLateMinutes,
          izinSakitCount,
          alpaCount,
          jamMengajarMingguan: weeklyPlannedJp,
          jamMengajarTotal: totalJpRencanaSemester,
          jamMengajarRealisasi: totalJpRealisasi,
          kbmRealisasiPct,
          jurnalTotalSesi: closedSesi.length,
          jurnalTerisiCount: sesiWithJournalAndAbsen.length,
          jurnalTerisiPct,
          perangkatExpected: expectedPerangkat,
          perangkatTotal: myPerangkat.length,
          perangkatApproved: approvedPerangkat.length,
          perangkatStatus,
          supervisiSkor,
          supervisiStatus,
          supervisiTanggal,
          catatanPenilai,
          tugasTambahanList: tugasTambahanNames,
        },
        rekomendasi,
        pembinaanKhusus,
        keunggulan,
        areaPerbaikan,
      });
    }

    // Filter results berdasarkan pencarian dan predikat bila diminta
    let filteredResults = results;
    if (search && search.trim()) {
      const q = search.toLowerCase();
      filteredResults = filteredResults.filter(r =>
        r.nama.toLowerCase().includes(q) ||
        r.nip.toLowerCase().includes(q) ||
        r.mapel.toLowerCase().includes(q) ||
        r.jabatan.toLowerCase().includes(q)
      );
    }
    if (predikat && predikat !== 'ALL') {
      filteredResults = filteredResults.filter(r => r.predikat === predikat);
    }

    // Sort by compositeScore descending
    filteredResults.sort((a, b) => b.compositeScore - a.compositeScore);

    // Summary Analytics
    const totalGuru = results.length;
    const avgScore = totalGuru > 0 ? Math.round(results.reduce((s, r) => s + r.compositeScore, 0) / totalGuru) : 0;
    const predikatDist = {
      A: results.filter(r => r.predikat === 'A').length,
      B: results.filter(r => r.predikat === 'B').length,
      C: results.filter(r => r.predikat === 'C').length,
      D: results.filter(r => r.predikat === 'D').length,
    };
    const topPerformers = results
      .slice(0, 3)
      .map(r => ({ id: r.id, nama: r.nama, score: r.compositeScore, predikat: r.predikat, mapel: r.mapel }));
    const needsAttentionCount = predikatDist.C + predikatDist.D;

    const pillarAverages = {
      presensi: totalGuru > 0 ? Math.round(results.reduce((s, r) => s + r.pillarScores.presensi, 0) / totalGuru) : 0,
      kbmJam: totalGuru > 0 ? Math.round(results.reduce((s, r) => s + r.pillarScores.kbmJam, 0) / totalGuru) : 0,
      jurnalKbm: totalGuru > 0 ? Math.round(results.reduce((s, r) => s + r.pillarScores.jurnalKbm, 0) / totalGuru) : 0,
      perangkatAjar: totalGuru > 0 ? Math.round(results.reduce((s, r) => s + r.pillarScores.perangkatAjar, 0) / totalGuru) : 0,
      supervisi: totalGuru > 0 ? Math.round(results.reduce((s, r) => s + r.pillarScores.supervisi, 0) / totalGuru) : 0,
    };

    return {
      summary: {
        totalGuru,
        avgScore,
        predikatDist,
        topPerformers,
        needsAttentionCount,
        pillarAverages,
      },
      data: filteredResults,
    };
  }
}
