import { prisma } from '@/utils/prisma';

export interface EvaluasiPillarScores {
  presensi: number;      // 0 - 100
  kbmJam: number;        // 0 - 100
  jurnalKbm: number;     // 0 - 100
  perangkatAjar: number; // 0 - 100
  supervisi: number;     // 0 - 100
  tugasTambahan: number; // 0 - 100
}

export interface EvaluasiMetrics {
  kehadiranPct: number;
  keterlambatanMenit: number;
  izinSakitCount: number;
  alpaCount: number;
  jamMengajarTotal: number;
  jamMengajarRealisasi: number;
  jurnalTerisiPct: number;
  perangkatTotal: number;
  perangkatApproved: number;
  perangkatStatus: 'LENGKAP' | 'REVIEW' | 'KURANG';
  supervisiSkor: number;
  supervisiTanggal: string | null;
  catatanPenilai: string | null;
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
  topPerformers: Array<{ id: string; nama: string; score: number; predikat: string }>;
  needsAttentionCount: number;
}

export interface EvaluasiKinerjaResponse {
  summary: EvaluasiSummary;
  data: TeacherEvaluationRecord[];
}

export class EvaluasiKinerjaService {
  /**
   * Menghasilkan laporan Evaluasi Kinerja Guru komprehensif lintas 5 pilar
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

    // 1. Ambil daftar Guru
    const guruWhere: any = {
      tenant_id: tenantId,
      jenis_ptk: { in: ['PENDIDIK', 'GURU', 'KEPALA_SEKOLAH'] },
    };
    if (guru_id) guruWhere.id = guru_id;
    if (status_kepegawaian && status_kepegawaian !== 'ALL') {
      guruWhere.status_kepegawaian = status_kepegawaian;
    }

    const gurus = await prisma.guru.findMany({
      where: guruWhere,
      select: {
        id: true,
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
    if (guruIds.length === 0) {
      return {
        summary: {
          totalGuru: 0,
          avgScore: 0,
          predikatDist: { A: 0, B: 0, C: 0, D: 0 },
          topPerformers: [],
          needsAttentionCount: 0,
        },
        data: [],
      };
    }

    // 2. Ambil Presensi Gerbang & Presensi Kelas Guru
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
      },
    });

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

    // 3. Ambil Perencanaan Beban Mengajar (JadwalKBM & StrukturKurikulum)
    const templates = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: { in: guruIds },
        tahun_pelajaran_id: tahun_pelajaran_id || undefined,
        semester_id: semester_id || undefined,
      },
      include: {
        Mapel: { select: { nama_mapel: true } },
        Kelas: { select: { tingkat: true } },
      },
    });

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

    // 4. Ambil Realisasi Sesi KBM & Jurnal
    const sesiList = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: { in: guruIds },
        tahun_pelajaran_id: tahun_pelajaran_id || undefined,
        semester_id: semester_id || undefined,
      },
      select: {
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
      },
    });

    // 5. Ambil Perangkat Ajar
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
      },
    });

    // 6. Ambil Supervisi Akademik Guru
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
        catatan: true,
        tanggal: true,
      },
    });

    // ── Agregasi Lintas Pilar per Guru ──
    const results: TeacherEvaluationRecord[] = [];

    for (const guru of gurus) {
      // Pilar 1: Presensi & Kedisiplinan
      const myGerbang = absenGerbangList.filter(a => a.guru_id === guru.id);
      const mySesiAbsen = absenSesiGuruList.filter(a => a.guru_id === guru.id);
      
      const hadirCount = myGerbang.filter(a => a.status === 'HADIR' || a.status === 'TEPAT_WAKTU').length +
        mySesiAbsen.filter(a => a.status === 'HADIR' || a.status === 'TEPAT_WAKTU').length;
      const lateCount = myGerbang.filter(a => a.is_terlambat || a.status === 'TERLAMBAT').length +
        mySesiAbsen.filter(a => a.is_terlambat || a.status === 'TERLAMBAT').length;
      const izinSakitCount = myGerbang.filter(a => a.status === 'IZIN' || a.status === 'SAKIT').length +
        mySesiAbsen.filter(a => a.status === 'IZIN' || a.status === 'SAKIT').length;
      const alpaCount = myGerbang.filter(a => a.status === 'ALPA').length +
        mySesiAbsen.filter(a => a.status === 'ALPA').length;
      
      const totalLateMinutes = myGerbang.reduce((sum, a) => sum + (a.menit_keterlambatan || 0), 0) +
        mySesiAbsen.reduce((sum, a) => sum + (a.menit_keterlambatan || 0), 0);

      const effectiveTotalPresensi = (myGerbang.length + mySesiAbsen.length) || 1;
      const kehadiranPct = Math.min(100, Math.round(((hadirCount + lateCount) / effectiveTotalPresensi) * 100)) || 100;
      
      // Hitung skor presensi: mulai dari kehadiran %, dikurangi penalti keterlambatan & alpa
      const presensiDeduction = (alpaCount * 15) + (lateCount * 3) + Math.floor(totalLateMinutes / 30);
      const presensiScore = Math.max(0, Math.min(100, kehadiranPct - presensiDeduction));

      // Pilar 2: Beban & Realisasi Jam Mengajar (KBM)
      const myTemplates = templates.filter(t => t.guru_id === guru.id);
      const mapelNames = Array.from(new Set(myTemplates.map(t => t.Mapel?.nama_mapel).filter(Boolean)));
      const mapelStr = mapelNames.join(', ') || 'Semua Mata Pelajaran';

      const totalJpRencana = myTemplates.length || 24; // Default beban standar 24 JP jika baru
      const mySesi = sesiList.filter(s => s.guru_id === guru.id);
      const closedSesi = mySesi.filter(s => s.status === 'CLOSED');
      const totalJpRealisasi = closedSesi.reduce((sum, s) => sum + (s.slot_kbm || 1), 0);

      const kbmScore = totalJpRencana > 0 
        ? Math.min(100, Math.round((totalJpRealisasi / totalJpRencana) * 100))
        : 85;

      // Pilar 3: Jurnal KBM & Administrasi Materi
      const sesiWithJournal = closedSesi.filter(s => {
        const hasText = Boolean(s.keterangan);
        const hasProgres = Boolean(s.ProgresMateri?.judul_materi || s.ProgresMateri?.deskripsi);
        return hasText || hasProgres;
      });
      const jurnalTerisiPct = closedSesi.length > 0
        ? Math.round((sesiWithJournal.length / closedSesi.length) * 100)
        : (mySesi.length > 0 ? 80 : 90);
      const jurnalScore = jurnalTerisiPct;

      // Pilar 4: Perangkat Ajar (RPP / Modul)
      const myPerangkat = perangkatList.filter(p => p.guru_id === guru.id);
      const approvedPerangkat = myPerangkat.filter(p => p.status === 'APPROVED' || p.status === 'DISETUJUI');
      let perangkatStatus: 'LENGKAP' | 'REVIEW' | 'KURANG' = 'KURANG';
      let perangkatScore = 70;

      if (myPerangkat.length >= 4 && approvedPerangkat.length >= 3) {
        perangkatStatus = 'LENGKAP';
        perangkatScore = 95;
      } else if (myPerangkat.length >= 2) {
        perangkatStatus = 'REVIEW';
        perangkatScore = 80;
      } else if (myPerangkat.length > 0) {
        perangkatStatus = 'KURANG';
        perangkatScore = 65;
      } else {
        perangkatScore = 75; // Baseline netral jika modul belum wajib upload
      }

      // Pilar 5: Supervisi Akademik
      const mySupervisi = supervisiList.filter(s => s.guru_id === guru.id);
      const latestSupervisi = mySupervisi[0] || null;
      const supervisiSkor = latestSupervisi?.nilai || 85;
      const supervisiTanggal = latestSupervisi ? new Date(latestSupervisi.tanggal).toISOString().slice(0, 10) : null;
      const catatanPenilai = latestSupervisi?.catatan || null;

      // Pilar 6: Tugas Tambahan (Wali Kelas / Piket / Jabatan)
      const tugasTambahanScore = guru.jabatan ? 90 : 80;

      // ── Skor Komposit (Weighted 5 Pillars) ──
      // Bobot: Presensi 20%, Realisasi KBM 25%, Jurnal 20%, Perangkat 15%, Supervisi 20%
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

      // ── AI/Rule-based Prescriptive Recommendations ──
      let rekomendasi = '';
      let pembinaanKhusus: string | null = null;

      if (compositeScore >= 90) {
        rekomendasi = `Kinerja unggul dan sangat memuaskan di seluruh pilar. Pertahankan kepatuhan administrasi dan jadikan teladan bagi rekan pendidik.`;
      } else if (presensiScore < 75) {
        rekomendasi = `Tingkatkan kedisiplinan kehadiran gerbang & jam masuk kelas untuk meminimalkan akumulasi menit keterlambatan.`;
        pembinaanKhusus = `Evaluasi jadwal piket dan toleransi jam masuk dengan Waka Kurikulum.`;
      } else if (jurnalScore < 75) {
        rekomendasi = `Kepatuhan pengisian ringkasan materi & absensi siswa pada jurnal KBM perlu ditingkatkan setiap kali selesai sesi.`;
        pembinaanKhusus = `Bimbingan teknis pengisian jurnal KBM mandiri via aplikasi.`;
      } else if (perangkatScore < 75) {
        rekomendasi = `Segera lengkapi unggahan modul ajar/RPP dan perangkat kurikulum semester untuk proses verifikasi.`;
        pembinaanKhusus = `Pendampingan penyusunan perangkat pembelajaran bersama MGMPS.`;
      } else if (supervisiSkor < 75) {
        rekomendasi = `Fokus pada variasi model pembelajaran interaktif dan diferensiasi kelas sesuai masukan supervisi.`;
        pembinaanKhusus = `Observasi klinis lanjutan bersama Kepala Sekolah/Pengawas.`;
      } else {
        rekomendasi = `Kinerja telah memenuhi standar regulasi kurikulum dengan baik. Tingkatkan realisasi jam mengajar.`;
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
          kehadiranPct,
          keterlambatanMenit: totalLateMinutes,
          izinSakitCount,
          alpaCount,
          jamMengajarTotal: totalJpRencana,
          jamMengajarRealisasi: totalJpRealisasi,
          jurnalTerisiPct,
          perangkatTotal: myPerangkat.length,
          perangkatApproved: approvedPerangkat.length,
          perangkatStatus,
          supervisiSkor,
          supervisiTanggal,
          catatanPenilai,
        },
        rekomendasi,
        pembinaanKhusus,
      });
    }

    // Filter results berdasarkan search dan predikat jika diminta
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
      .map(r => ({ id: r.id, nama: r.nama, score: r.compositeScore, predikat: r.predikat }));
    const needsAttentionCount = predikatDist.C + predikatDist.D;

    return {
      summary: {
        totalGuru,
        avgScore,
        predikatDist,
        topPerformers,
        needsAttentionCount,
      },
      data: filteredResults,
    };
  }
}
