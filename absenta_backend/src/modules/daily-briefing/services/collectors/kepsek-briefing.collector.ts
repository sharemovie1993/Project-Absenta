/**
 * kepsek-briefing.collector.ts
 * Implementasi pengumpul data laporan harian eksekutif untuk Kepala Sekolah.
 *
 * Mengagregasi data makro seluruh divisi:
 * 1. Early Warning & Radar Atensi (Siswa alpa berturut-turut, izin keluar piket)
 * 2. Kesiswaan (Kehadiran siswa, Tren vs kemarin, Gerbang keterlambatan, Rombel apresiasi 100%)
 * 3. Kurikulum & Guru (Kehadiran guru, Guru berhalangan & Inval, Sesi KBM, Jurnal KBM terisi)
 * 4. Wali Kelas & Rombel (Rombel alpa terbanyak vs 100% hadir)
 * 5. BP/BK (Konseling & pembinaan siswa hari ini)
 * 6. Hubin & PKL (Kehadiran siswa magang di DUDI)
 */

import { prisma } from '@/utils/prisma';
import { getTenantTimezone, getTenantDayRangeUTC } from '@/utils/timezone.utils';
import { IBriefingCollector } from './briefing-collector.interface';
import {
  UniversalBriefingData,
  BriefingMetricItem,
  BriefingSection,
  BriefingAiPillar,
  BriefingAiVerdict,
} from '../../types/briefing.types';
import { BpbkAnalyticsService } from '@/modules/bpbk/services/sub/bpbk-analytics.service';
import { NilaiMonitoringService } from '@/modules/rapor/services/sub/nilai-monitoring.service';
import { CbtSettingsService } from '@/modules/cbt/services/cbt-settings.service';
import { guruRekapService } from '@/modules/attendance/rekap/services/guru-rekap.service';
import { PelanggaranService } from '@/modules/kesiswaan/services/pelanggaran.service';
import { programKetarunaanService } from '@/modules/kesiswaan/program-ketarunaan/services/program-ketarunaan.service';
import { DashboardAttendanceStatsService } from '@/modules/dashboard/services/sub/dashboard-attendance-stats.service';
import { PerangkatAjarService } from '@/modules/kurikulum/services/perangkat-ajar.service';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { HubinService } from '@/modules/hubin/services/hubin.service';

export class KepsekBriefingCollector implements IBriefingCollector {
  async collect(
    tenantId: string,
    tanggal?: string,
    _targetUserId?: string,
    _targetEntityId?: string
  ): Promise<UniversalBriefingData> {
    const tz = await getTenantTimezone(tenantId);

    // Tentukan tanggal YYYY-MM-DD
    let dateStr = tanggal;
    if (!dateStr) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      dateStr = formatter.format(new Date());
    }

    const { startUTC, endUTC } = getTenantDayRangeUTC(dateStr, tz);

    // Format tanggal Indonesia (contoh: "Rabu, 18 November 2026")
    const dateObj = new Date(`${dateStr}T12:00:00+07:00`);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayName = dayNames[dateObj.getDay()];
    const dayDate = dateObj.getDate();
    const monthName = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    const tanggalStr = `${dayName}, ${dayDate} ${monthName} ${year}`;

    // ── 1. Profil Sekolah & Kepala Sekolah ─────────────────────────────────────
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        sekolah: true,
      },
    });

    const sekolahData = (tenant as any)?.sekolah?.[0];
    const sekolahNama = sekolahData?.nama || tenant?.name || 'Sekolah';
    const targetName = sekolahData?.kepala_sekolah || 'Bapak/Ibu Kepala Sekolah';

    // ── 2. Kesiswaan (SSOT via PelanggaranService, Scoped Konteks Akademik Aktif)
    let totalSiswaAktif = 0;
    let siswaHadir = 0;
    let siswaSakit = 0;
    let siswaIzin = 0;
    let siswaAlpa = 0;
    let persentaseSiswa = 0;
    let kemarinKehadiranPct: number | null = null;
    let kehadiranDeltaPct: number | null = null;
    let siswaTerlambat = 0;
    let siswaIzinKeluar = 0;
    let consecutiveAlpaItems: Array<{ nama: string; kelas: string; count: number }> = [];
    let izinKeluarItems: Array<{ nama: string; kelas: string; alasan: string; status: string; jamKeluar: string; jamKembali?: string }> = [];
    let topRombelAlpa: Array<{ kelasNama: string; alpaCount: number }> = [];
    let rombelSempurna: string[] = [];
    let pelanggaranMingguIni = 0;
    let pelanggaranMingguLalu = 0;
    let pelanggaranDeltaPct: number | null = null;
    let pelanggaranSemesterTotal = 0;
    let pelanggaranSemesterSelesai = 0;
    let progresPenangananPelanggaranPct = 100;

    try {
      const kesiswaan = await PelanggaranService.getAcademicScopedKesiswaanSummary(tenantId, dateStr);
      totalSiswaAktif = kesiswaan.totalSiswaAktif;
      siswaHadir = kesiswaan.siswaHadir;
      siswaSakit = kesiswaan.siswaSakit;
      siswaIzin = kesiswaan.siswaIzin;
      siswaAlpa = kesiswaan.siswaAlpa;
      persentaseSiswa = kesiswaan.persentaseSiswa;
      kemarinKehadiranPct = kesiswaan.kemarinKehadiranPct;
      kehadiranDeltaPct = kesiswaan.kehadiranDeltaPct;
      siswaTerlambat = kesiswaan.siswaTerlambat;
      siswaIzinKeluar = kesiswaan.siswaIzinKeluar;
      consecutiveAlpaItems = kesiswaan.consecutiveAlpaItems;
      izinKeluarItems = kesiswaan.izinKeluarItems;
      topRombelAlpa = kesiswaan.topRombelAlpa;
      rombelSempurna = kesiswaan.rombelSempurna;
      pelanggaranMingguIni = kesiswaan.pelanggaranMingguIni;
      pelanggaranMingguLalu = kesiswaan.pelanggaranMingguLalu;
      pelanggaranDeltaPct = kesiswaan.pelanggaranDeltaPct;
      pelanggaranSemesterTotal = kesiswaan.pelanggaranSemesterTotal;
      pelanggaranSemesterSelesai = kesiswaan.pelanggaranSemesterSelesai;
      progresPenangananPelanggaranPct = kesiswaan.progresPenangananPelanggaranPct;
    } catch (err) {
      console.warn('[Briefing:Kesiswaan] Error querying SSOT Kesiswaan summary:', err);
    }

    // ── 3. Kurikulum: Kedisiplinan Guru & KBM (SSOT via GuruRekapService, Scoped TP & Semester Aktif)
    let totalGuru = 0;
    let guruHadir = 0;
    let guruTidakHadir = 0;
    let totalSesiKbm = 0;
    let sesiKbmTerlaksana = 0;
    let guruInvalCount = 0;
    let persentaseGuru = 0;
    let persentaseJurnal = 100;
    let persentaseKbmTerlaksana = 100;
    let guruBerhalanganItems: Array<{ nama: string; status: string; catatan?: string; isInval: boolean }> = [];

    try {
      const kbmDiscipline = await guruRekapService.getAcademicScopedKbmDiscipline(tenantId, dateStr);
      totalGuru = kbmDiscipline.totalGuru;
      guruHadir = kbmDiscipline.guruHadir;
      guruTidakHadir = kbmDiscipline.guruTidakHadir;
      totalSesiKbm = kbmDiscipline.totalSesiKbm;
      sesiKbmTerlaksana = kbmDiscipline.sesiKbmTerlaksana;
      guruInvalCount = kbmDiscipline.guruInvalCount;
      persentaseGuru = kbmDiscipline.persentaseGuru;
      persentaseJurnal = kbmDiscipline.persentaseJurnal;
      persentaseKbmTerlaksana = kbmDiscipline.persentaseKbmTerlaksana;
      guruBerhalanganItems = kbmDiscipline.guruBerhalanganItems;
    } catch (err) {
      console.warn('[Briefing:Kurikulum] Error querying SSOT Guru KBM discipline:', err);
    }

    // ── 6. BP/BK & Pembinaan (SSOT via BpbkAnalyticsService, Scoped Konteks Akademik Aktif)
    let bpbkProgress: Awaited<ReturnType<typeof BpbkAnalyticsService.getAcademicScopedProgress>> | null = null;
    let bpbkItems: Array<{ title: string; note: string; status: string }> = [];
    try {
      bpbkProgress = await BpbkAnalyticsService.getAcademicScopedProgress(tenantId, {
        startUTC,
        endUTC,
      });
      bpbkItems = [
        ...bpbkProgress.konselingHariIni,
        ...bpbkProgress.kasusPrioritasTinggi.map((k) => ({
          title: `[Prioritas Tinggi] ${k.siswaNama} — ${k.judul}`,
          note: `Kategori: ${k.kategori} • Memerlukan tindak lanjut intensif`,
          status: k.status,
        })),
      ];
    } catch (err) {
      console.warn('[Briefing:BPBK] Error querying SSOT BPBK progress:', err);
    }

    // ── 7. Konteks Akademik Aktif & Hubin PKL / Sidang ────────────────────────
    const [activeTp, activeSem] = await Promise.all([
      prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, tahun: true } }),
      prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, nama_semester: true } }),
    ]);
    const activeTpLabel = activeTp ? `${activeTp.tahun}${activeSem ? ` (${activeSem.nama_semester})` : ''}` : '';

    // ── 6b. Program Ketarunaan (SSOT langsung via programKetarunaanService.getStats - Scope 1 Semester Ganjil)
    let ketarunaanStats: Awaited<ReturnType<typeof programKetarunaanService.getStats>> | null = null;
    try {
      const ganjilSem = activeTp
        ? await prisma.semester.findFirst({
            where: {
              tenant_id: tenantId,
              tahun_pelajaran_id: activeTp.id,
              nama_semester: { contains: 'Ganjil', mode: 'insensitive' },
            },
            select: { id: true, nama_semester: true },
          })
        : null;

      ketarunaanStats = await programKetarunaanService.getStats(tenantId, {
        scope_periode: '1_semester',
        tahun_pelajaran_id: activeTp?.id,
        semester_id: ganjilSem?.id || activeSem?.id,
      });
    } catch (err) {
      console.warn('[Briefing:Ketarunaan] Error querying SSOT programKetarunaanService.getStats:', err);
    }

    const pklAcademicScope: any = activeTp
      ? {
          OR: [
            { SiswaAkademik: { tahun_pelajaran_id: activeTp.id } },
            { siswa_akademik_id: null, tanggal_mulai: { gte: new Date(`${activeTp.tahun.slice(0, 4)}-01-01T00:00:00Z`) } },
          ],
        }
      : {};

    let totalSiswaPklAktif = 0;
    let siswaPklHadir = 0;
    let siswaPklKendala = 0;

    try {
      totalSiswaPklAktif = await prisma.siswaPkl.count({
        where: { tenant_id: tenantId, status: 'AKTIF', ...pklAcademicScope },
      });

      const pklStats = await prisma.absensiPkl.groupBy({
        by: ['status'],
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startUTC, lte: endUTC },
          ...(activeTp ? { SiswaPkl: pklAcademicScope } : {}),
        },
        _count: { id: true },
      });

      for (const p of pklStats) {
        const count = p._count.id;
        const s = (p.status || '').toUpperCase();
        if (s === 'HADIR') siswaPklHadir += count;
        else if (s === 'ALPA' || s === 'IZIN') siswaPklKendala += count;
      }
    } catch {}

    // ── 7b. Hubin & PKL: Progres Input Nilai PKL, Sidang & Mitra DUDI (SSOT via HubinService) ──
    let totalPklAll = 0;
    let pklNilaiTerisi = 0;
    let pklSidangTerisi = 0;
    let pklSidangScheduled = 0;
    let pklAssessmentMode = 'DUDI_ONLY';
    let totalMitraDudi = 0;
    let filledMitraTp = 0;
    try {
      const hubinService = new HubinService();
      const [hubinSettings, hubinSummary] = await Promise.all([
        hubinService.getSettings(tenantId, activeTp?.id),
        hubinService.getKaprogPklSummary(tenantId, undefined, { tahunPelajaranId: activeTp?.id }),
      ]);
      if (hubinSettings?.assessmentMode) {
        pklAssessmentMode = hubinSettings.assessmentMode;
      }
      if (hubinSummary) {
        totalPklAll = hubinSummary.penilaianStatus?.totalSiswaPkl ?? 0;
        pklNilaiTerisi = hubinSummary.penilaianStatus?.sudahDinilaiDudi ?? 0;
        pklSidangTerisi = hubinSummary.penilaianStatus?.sudahSidang ?? 0;
        pklSidangScheduled = hubinSummary.plotingPengujiStatus?.sudahDiplot ?? 0;
        totalMitraDudi = hubinSummary.tpStatus?.totalMitra ?? 0;
        filledMitraTp = hubinSummary.tpStatus?.filledMitra ?? 0;
      }
    } catch (err) {
      console.warn('[Briefing:PKL] Error querying SSOT HubinService summary:', err);
    }
    const progresNilaiPklPct = totalPklAll > 0 ? Math.round((pklNilaiTerisi / totalPklAll) * 100) : 0;
    const sidangDenominator = pklSidangScheduled > 0 ? pklSidangScheduled : totalPklAll;
    const progresSidangPklPct = sidangDenominator > 0 ? Math.round((pklSidangTerisi / sidangDenominator) * 100) : 0;

    // ── 7b2. Kurikulum: Pengumpulan Perangkat Ajar (SSOT via PerangkatAjarService, Scoped TP & Semester Aktif)
    let perangkatProgress: Awaited<ReturnType<typeof PerangkatAjarService.getAcademicScopedPerangkatProgress>> = null;
    try {
      perangkatProgress = await PerangkatAjarService.getAcademicScopedPerangkatProgress(tenantId, {
        startUTC,
        endUTC,
      });
    } catch (err) {
      console.warn('[Briefing:PerangkatAjar] Error querying SSOT Perangkat Ajar progress:', err);
    }

    // ── 7b3. Adopsi Platform & Aktivitas Pengguna Guru (SSOT via ActivityLogService)
    let adoptionProgress: Awaited<ReturnType<typeof activityLogService.getAcademicScopedPlatformAdoption>> | null = null;
    try {
      adoptionProgress = await activityLogService.getAcademicScopedPlatformAdoption(tenantId, {
        startUTC,
        endUTC,
      });
    } catch (err) {
      console.warn('[Briefing:Adoption] Error querying SSOT platform adoption:', err);
    }

    // ── 7c. Kurikulum: Event CBT Aktif & Pengumpulan Soal (SSOT via CbtSettingsService)
    let cbtProgress: Awaited<ReturnType<typeof CbtSettingsService.getAcademicScopedEventProgress>> | null = null;
    try {
      cbtProgress = await CbtSettingsService.getAcademicScopedEventProgress(tenantId);
    } catch (err) {
      console.warn('[Briefing:CBT] Error querying SSOT CBT progress:', err);
    }

    // ── 7d. Fase Penilaian KBM & Rapor (SSOT via NilaiMonitoringService, Scoped TP & Semester Aktif)
    let raporReadiness: Awaited<ReturnType<typeof NilaiMonitoringService.getAcademicScopedRaporReadiness>> | null = null;
    try {
      raporReadiness = await NilaiMonitoringService.getAcademicScopedRaporReadiness(tenantId);
    } catch (err) {
      console.warn('[Briefing:Rapor] Error querying SSOT rapor readiness:', err);
    }
    const biodataSiapPct = raporReadiness?.biodataSiapPct ?? 0;
    const nilaiSumatifPct = raporReadiness?.nilaiSumatifPct ?? 0;

    // ── 8. Indeks Kesehatan Sekolah (Traffic Light Status) ─────────────────────
    const healthScore = Math.round(persentaseSiswa * 0.45 + persentaseGuru * 0.35 + persentaseJurnal * 0.20);
    const statusBadge = {
      score: healthScore,
      label: healthScore >= 90 ? 'Sekolah Kondusif' : (healthScore >= 75 ? 'Perlu Atensi' : 'Butuh Intervensi'),
      variant: (healthScore >= 90 ? 'success' : (healthScore >= 75 ? 'warning' : 'danger')) as 'success' | 'warning' | 'danger',
    };

    // ── 9. Komposisi Metrics Utama (Bento Grid Header) ────────────────────────
    let siswaSub = `${siswaHadir.toLocaleString('id-ID')} dari ${totalSiswaAktif.toLocaleString('id-ID')} Siswa`;
    if (kehadiranDeltaPct !== null) {
      const deltaSign = kehadiranDeltaPct >= 0 ? '+' : '';
      siswaSub += ` (${deltaSign}${kehadiranDeltaPct}% vs kemarin)`;
    }

    const metrics: BriefingMetricItem[] = [
      {
        id: 'presensi_siswa',
        label: 'Kehadiran Siswa',
        value: `${persentaseSiswa}%`,
        sub: siswaSub,
        status: persentaseSiswa >= 95 ? 'success' : (persentaseSiswa >= 85 ? 'warning' : 'danger'),
        icon: 'GraduationCap',
      },
      {
        id: 'kehadiran_guru',
        label: 'Kehadiran Guru',
        value: `${persentaseGuru}%`,
        sub: `${guruHadir} dari ${totalGuru} Guru Terdata`,
        status: persentaseGuru >= 95 ? 'success' : 'warning',
        icon: 'UserCheck',
      },
      {
        id: 'kbm_terlaksana',
        label: 'KBM Terlaksana',
        value: `${totalSesiKbm > 0 ? sesiKbmTerlaksana : 0} Sesi`,
        sub: totalSesiKbm > 0 ? `Kepatuhan Jurnal ${persentaseJurnal}%` : 'Tidak Ada Sesi Terjadwal',
        status: persentaseJurnal >= 90 ? 'success' : 'warning',
        icon: 'BookOpen',
      },
      {
        id: 'kedisiplinan_gerbang',
        label: 'Kedisiplinan Gerbang',
        value: `${siswaTerlambat} Siswa`,
        sub: siswaTerlambat === 0 ? 'Semua Tepat Waktu' : 'Terlambat Masuk Gerbang',
        status: siswaTerlambat <= 5 ? 'success' : 'warning',
        icon: 'Clock',
      },
    ];

    if (totalSiswaPklAktif > 0) {
      metrics.push({
        id: 'pkl_industri',
        label: 'Siswa PKL Industri',
        value: `${totalSiswaPklAktif} Siswa`,
        sub: `${siswaPklHadir} Lapor Hadir Hari Ini`,
        status: 'info',
        icon: 'Briefcase',
      });
    }

    // ── 10. Highlights (Poin-Poin Kritis 30 Detik) ────────────────────────────
    const trendText = kehadiranDeltaPct !== null
      ? (kehadiranDeltaPct >= 0 ? `naik +${kehadiranDeltaPct}% dibanding kemarin` : `turun ${kehadiranDeltaPct}% dibanding kemarin`)
      : 'data awal';

    const highlights: string[] = [
      `Tingkat kehadiran siswa mencapai ${persentaseSiswa}% (${trendText}).`,
      `Status Operasional Sekolah: ${statusBadge.label} (Indeks Keterlaksanaan: ${statusBadge.score}%).`,
      `Kehadiran guru aktif tercatat ${persentaseGuru}% dengan kepatuhan jurnal KBM ${persentaseJurnal}%.`,
    ];

    if (consecutiveAlpaItems.length > 0) {
      highlights.push(`Radar Peringatan Dini: Terdeteksi ${consecutiveAlpaItems.length} siswa alpa berturut-turut yang butuh penanganan segera.`);
    }

    if (siswaTerlambat > 0) {
      highlights.push(`Ketertiban Gerbang: ${siswaTerlambat} siswa tiba terlambat di gerbang dan telah ditertibkan.`);
    } else {
      highlights.push('Ketertiban gerbang optimal: 0 siswa terlambat hari ini.');
    }

    if (rombelSempurna.length > 0) {
      highlights.push(`Apresiasi Rombel: ${rombelSempurna.length} kelas berhasil mencapai kehadiran 100% hari ini (${rombelSempurna.slice(0, 2).join(', ')}).`);
    }

    // ── 11. Sections per Divisi (Detail Lengkap) ─────────────────────────────
    const sections: BriefingSection[] = [];

    // SEKSI 1: RADAR ATENSI & PERINGATAN DINI (Jika ada temuan)
    if (consecutiveAlpaItems.length > 0 || izinKeluarItems.length > 0) {
      const earlyWarningItems = [
        ...consecutiveAlpaItems.map(c => ({
          title: c.nama,
          subtitle: `Rombel ${c.kelas} • ${c.count} Hari Berturut-turut Alpa`,
          badge: `${c.count}x Alpa Berulang`,
          badgeColor: 'text-rose-700 bg-rose-100 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
          note: 'Rekomendasi tindakan: Pemanggilan orang tua / home visit oleh Wali Kelas & Guru BK.',
        })),
        ...izinKeluarItems.map(ik => ({
          title: `${ik.nama} (${ik.kelas})`,
          subtitle: `Izin Keluar Pukul ${ik.jamKeluar} • Keperluan: ${ik.alasan}`,
          badge: ik.status,
          badgeColor: ik.status === 'Sudah Kembali'
            ? 'text-blue-700 bg-blue-100 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
            : 'text-amber-700 bg-amber-100 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
          note: ik.jamKembali ? `Tercatat telah kembali pada pukul ${ik.jamKembali}` : 'Masih dalam masa izin / belum kembali ke sekolah.',
        })),
      ];

      sections.push({
        id: 'early_warning',
        title: '🚨 Radar Atensi & Peringatan Dini Pimpinan',
        category: 'Atensi Pimpinan',
        badge: consecutiveAlpaItems.length > 0 ? `${consecutiveAlpaItems.length} Alpa Berulang` : 'Perhatian',
        summary: `Deteksi dini siswa dengan ketidakhadiran berulang dan rekap pergerakan siswa keluar kampus via buku piket.`,
        items: earlyWarningItems,
      });
    }

    // SEKSI 2: KESISWAAN & KETERTIBAN
    const kesiswaanItems = [
      ...rombelSempurna.map(r => ({
        title: `Rombel ${r}`,
        subtitle: 'Tingkat Kehadiran Sempurna',
        badge: '100% Hadir 🏆',
        badgeColor: 'text-emerald-700 bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
        note: 'Apresiasi kedisiplinan: Seluruh siswa terdata hadir lengkap tanpa catatan alpa/izin.',
      })),
      ...topRombelAlpa.map(r => ({
        title: `Rombel ${r.kelasNama}`,
        subtitle: 'Perlu atensi pembinaan oleh Wali Kelas',
        badge: `${r.alpaCount} Siswa Alpa`,
        badgeColor: 'text-rose-700 bg-rose-100 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
        note: 'Rombongan belajar dengan tingkat alpa tertinggi hari ini.',
      })),
    ];

    sections.push({
      id: 'kesiswaan',
      title: 'Divisi Kesiswaan & Kedisiplinan Siswa',
      category: 'Kesiswaan',
      badge: persentaseSiswa >= 95 ? 'Optimal' : 'Perlu Perhatian',
      summary: `Presensi siswa hari ini ${persentaseSiswa}% (${siswaTerlambat} terlambat gerbang, ${siswaIzinKeluar} izin keluar). Rentang 7 hari terakhir tercatat ${pelanggaranMingguIni} pelanggaran.`,
      todayStats: [
        { label: 'Siswa Hadir Hari Ini', value: siswaHadir },
        { label: 'Sakit / Izin Hari Ini', value: siswaSakit + siswaIzin },
        { label: 'Alpa Hari Ini', value: siswaAlpa },
        { label: 'Terlambat Gerbang', value: siswaTerlambat },
        { label: 'Izin Keluar Piket', value: siswaIzinKeluar },
      ],
      rangeStats: [
        { label: 'Pelanggaran (7 Hari)', value: pelanggaranMingguIni },
        { label: '7 Hari Sebelumnya', value: pelanggaranMingguLalu },
        {
          label: 'Tren Pelanggaran',
          value:
            pelanggaranDeltaPct === null
              ? 'Data Awal'
              : pelanggaranDeltaPct <= 0
              ? `Turun ${Math.abs(pelanggaranDeltaPct)}%`
              : `Naik +${pelanggaranDeltaPct}%`,
        },
        { label: 'Total Kasus Semester', value: pelanggaranSemesterTotal },
        { label: 'Kasus Selesai Semester', value: `${pelanggaranSemesterSelesai} (${progresPenangananPelanggaranPct}%)` },
      ],
      progressBars: [
        {
          label: '[Hari Ini] Persentase Kehadiran Siswa di KBM',
          value: persentaseSiswa,
          detail: `${siswaHadir} / ${totalSiswaAktif} Siswa Hadir Hari Ini`,
          color: persentaseSiswa >= 95 ? 'emerald' : persentaseSiswa >= 85 ? 'amber' : 'rose',
        },
        {
          label: '[Rentang 7 Hari] Indeks Penurunan Pelanggaran',
          value: pelanggaranDeltaPct === null ? 100 : Math.max(0, Math.min(100, 100 - Math.max(0, pelanggaranDeltaPct))),
          detail: `${pelanggaranMingguIni} kasus (7 hari ini) vs ${pelanggaranMingguLalu} (7 hari lalu) • Semester: ${pelanggaranSemesterSelesai}/${pelanggaranSemesterTotal} selesai`,
          color: pelanggaranDeltaPct !== null && pelanggaranDeltaPct <= 0 ? 'emerald' : 'amber',
        },
      ],
      charts: [
        {
          type: 'pie',
          title: 'Komposisi Kehadiran Siswa (Hari Ini)',
          subtitle: 'Distribusi status kehadiran siswa unik hari ini',
          centerLabel: `${persentaseSiswa}%`,
          data: [
            { label: 'Hadir', value: siswaHadir, color: 'emerald' },
            { label: 'Sakit / Izin', value: siswaSakit + siswaIzin, color: 'amber' },
            { label: 'Alpa', value: siswaAlpa, color: 'rose' },
            {
              label: 'Belum Tercatat',
              value: Math.max(0, totalSiswaAktif - (siswaHadir + siswaSakit + siswaIzin + siswaAlpa)),
              color: 'slate',
            },
          ],
        },
        {
          type: 'bar',
          title: 'Tren & Penanganan Pelanggaran Siswa',
          subtitle: 'Perbandingan kasus 7 hari terakhir vs penyelesaian semester',
          data: [
            { label: '7 Hari Lalu', value: pelanggaranMingguLalu, color: 'slate', unit: 'Kasus' },
            { label: '7 Hari Ini', value: pelanggaranMingguIni, color: 'amber', unit: 'Kasus' },
            { label: 'Terlambat Hari Ini', value: siswaTerlambat, color: 'rose', unit: 'Siswa' },
            { label: 'Selesai (Semester)', value: pelanggaranSemesterSelesai, color: 'emerald', unit: 'Kasus' },
          ],
        },
      ],
      items: kesiswaanItems,
    });

    // SEKSI 3: KURIKULUM & KBM GURU
    const kurikulumItems = guruBerhalanganItems.map(g => ({
      title: g.nama,
      subtitle: `Status: ${g.status} ${g.catatan ? `• ${g.catatan}` : ''}`,
      badge: g.isInval ? 'Inval Tertangani' : 'Mandiri / Tugas',
      badgeColor: g.isInval
        ? 'text-emerald-700 bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
        : 'text-amber-700 bg-amber-100 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
      note: g.isInval ? 'Jam KBM di kelas telah diisi oleh guru inval/piket.' : 'Perlu pemantauan keterlaksanaan materi modul ajar mandiri.',
    }));

    sections.push({
      id: 'kurikulum',
      title: 'Divisi Kurikulum & Kedisiplinan Guru KBM',
      category: 'Kurikulum',
      badge: `${persentaseGuru}% Guru Hadir`,
      summary: `Hari ini: ${guruHadir} guru aktif mengajar (${persentaseGuru}%), ${totalSesiKbm} sesi KBM terjadwal dengan kepatuhan jurnal ${persentaseJurnal}%.`,
      todayStats: [
        { label: 'Guru Hadir Hari Ini', value: guruHadir },
        { label: 'Guru Izin / Sakit', value: guruTidakHadir },
        { label: 'Sesi KBM Hari Ini', value: totalSesiKbm },
        { label: 'KBM Terlaksana', value: sesiKbmTerlaksana },
        { label: 'Inval Hari Ini', value: guruInvalCount },
      ],
      progressBars: [
        {
          label: '[Hari Ini] Persentase Kehadiran Guru di KBM',
          value: persentaseGuru,
          detail: `${guruHadir} / ${totalGuru} Guru Terjadwal Hadir Hari Ini`,
          color: persentaseGuru >= 95 ? 'emerald' : persentaseGuru >= 85 ? 'amber' : 'rose',
        },
        {
          label: '[Hari Ini] Keterlaksanaan Sesi KBM Terjadwal',
          value: persentaseKbmTerlaksana,
          detail: `${sesiKbmTerlaksana} / ${totalSesiKbm} Sesi Terlaksana Hari Ini (Jurnal ${persentaseJurnal}%)`,
          color: persentaseKbmTerlaksana >= 90 ? 'blue' : 'amber',
        },
      ],
      charts: [
        {
          type: 'pie',
          title: 'Komposisi Kehadiran Guru (Hari Ini)',
          subtitle: 'Distribusi kehadiran guru terjadwal pada KBM hari ini',
          centerLabel: `${persentaseGuru}%`,
          data: [
            { label: 'Guru Hadir', value: guruHadir, color: 'emerald' },
            { label: 'Izin / Sakit', value: guruTidakHadir, color: 'amber' },
            {
              label: 'Belum Tap',
              value: Math.max(0, totalGuru - (guruHadir + guruTidakHadir)),
              color: 'slate',
            },
          ],
        },
        {
          type: 'bar',
          title: 'Realisasi Sesi KBM & Jurnal (Hari Ini)',
          subtitle: 'Perbandingan sesi terjadwal, terlaksana, dan inval',
          data: [
            { label: 'Terjadwal', value: totalSesiKbm, color: 'indigo', unit: 'Sesi' },
            { label: 'Terlaksana', value: sesiKbmTerlaksana, color: 'emerald', unit: 'Sesi' },
            { label: 'Sesi Inval', value: guruInvalCount, color: 'amber', unit: 'Sesi' },
          ],
        },
      ],
      items: kurikulumItems.length > 0 ? kurikulumItems : undefined,
    });

    // SEKSI 3a2: PROGRES PENGUMPULAN & VERIFIKASI PERANGKAT AJAR (SSOT)
    if (perangkatProgress) {
      sections.push({
        id: 'perangkat_ajar',
        title: 'Pengumpulan & Verifikasi Perangkat Ajar Guru',
        category: 'Kurikulum • Perangkat Ajar',
        badge: `${perangkatProgress.progresGuruMengumpulkanPct}% Guru Kumpul`,
        summary: `Konteks ${perangkatProgress.academicContext}: ${perangkatProgress.guruSudahMengumpulkan}/${perangkatProgress.totalGuruWajib} guru telah mengumpulkan total ${perangkatProgress.totalDokumen} dokumen perangkat ajar (${perangkatProgress.approvedCount} disetujui, ${perangkatProgress.pendingCount} menunggu review, ${perangkatProgress.rejectedCount} revisi).`,
        todayStats: [
          { label: 'Diunggah Hari Ini', value: `${perangkatProgress.diunggahHariIni} Dokumen` },
          { label: 'Direview Hari Ini', value: `${perangkatProgress.direviewHariIni} Dokumen` },
        ],
        rangeStats: [
          { label: 'Guru Sudah Kumpul', value: `${perangkatProgress.guruSudahMengumpulkan} / ${perangkatProgress.totalGuruWajib}` },
          { label: 'Guru Belum Kumpul', value: perangkatProgress.guruBelumMengumpulkan },
          { label: 'Total Dokumen', value: perangkatProgress.totalDokumen },
          { label: 'Disetujui (Approved)', value: perangkatProgress.approvedCount },
          { label: 'Menunggu Review', value: perangkatProgress.pendingCount },
          { label: 'Perlu Revisi', value: perangkatProgress.rejectedCount },
        ],
        progressBars: [
          {
            label: '[Rentang Semester] Kepatuhan Guru Mengumpulkan Perangkat Ajar',
            value: perangkatProgress.progresGuruMengumpulkanPct,
            detail: `${perangkatProgress.guruSudahMengumpulkan} dari ${perangkatProgress.totalGuruWajib} Guru Pengampu (${perangkatProgress.guruBelumMengumpulkan} belum mengumpulkan)`,
            color:
              perangkatProgress.progresGuruMengumpulkanPct >= 85
                ? 'emerald'
                : perangkatProgress.progresGuruMengumpulkanPct >= 50
                ? 'indigo'
                : 'amber',
          },
          {
            label: '[Rentang Semester] Progres Verifikasi & Approval Perangkat Ajar',
            value: perangkatProgress.progresApprovalPct,
            detail: `${perangkatProgress.approvedCount} Disetujui • ${perangkatProgress.pendingCount} Pending • ${perangkatProgress.rejectedCount} Revisi (Total ${perangkatProgress.totalDokumen} dokumen)`,
            color: perangkatProgress.progresApprovalPct >= 80 ? 'emerald' : 'blue',
          },
        ],
        charts: [
          {
            type: 'pie',
            title: 'Proporsi Kepatuhan Guru (Perangkat Ajar)',
            subtitle: 'Perbandingan guru yang sudah vs belum mengumpulkan',
            centerLabel: `${perangkatProgress.progresGuruMengumpulkanPct}%`,
            data: [
              { label: 'Sudah Kumpul', value: perangkatProgress.guruSudahMengumpulkan, color: 'emerald' },
              { label: 'Belum Kumpul', value: perangkatProgress.guruBelumMengumpulkan, color: 'rose' },
            ],
          },
          {
            type: 'bar',
            title: 'Status Verifikasi Dokumen Perangkat Ajar',
            subtitle: 'Distribusi status review dokumen oleh Kurikulum',
            data: [
              { label: 'Approved', value: perangkatProgress.approvedCount, color: 'emerald', unit: 'Dok' },
              { label: 'Pending Review', value: perangkatProgress.pendingCount, color: 'amber', unit: 'Dok' },
              { label: 'Perlu Revisi', value: perangkatProgress.rejectedCount, color: 'rose', unit: 'Dok' },
              { label: 'Unggah Hari Ini', value: perangkatProgress.diunggahHariIni, color: 'blue', unit: 'Dok' },
            ],
          },
        ],
      });
    }

    // SEKSI 3a3: ADOPSI PLATFORM & KEAKTIFAN DIGITAL GURU (SSOT)
    if (adoptionProgress) {
      const adoptionItems = [
        ...adoptionProgress.topActiveToday.map((g, idx) => ({
          title: `[Teraktif #${idx + 1} Hari Ini] ${g.nama}`,
          subtitle: g.detail,
          badge: 'Aktif Hari Ini',
          badgeColor:
            'text-emerald-700 bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
        })),
        ...adoptionProgress.belumPernahMasukItems.map((g) => ({
          title: g.nama,
          subtitle: `NIP: ${g.nip} • Belum tercatat login atau aktivitas di platform`,
          badge: 'Belum Pernah Login',
          badgeColor:
            'text-rose-700 bg-rose-100 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
          note: 'Perlu pendampingan aktivasi akun oleh operator / Tim Kurikulum.',
        })),
      ];

      sections.push({
        id: 'adopsi_platform',
        title: 'Adopsi Platform Digital & Keaktifan Guru',
        category: 'Transformasi Digital',
        badge: `${adoptionProgress.progresAdopsiPct}% Adopsi`,
        summary: `Sebanyak ${adoptionProgress.guruSudahMasuk}/${adoptionProgress.totalGuru} guru (${adoptionProgress.progresAdopsiPct}%) telah aktif menggunakan platform (${adoptionProgress.guruBelumPernahMasuk} guru belum pernah masuk). Hari ini tercatat ${adoptionProgress.guruAktifHariIni} guru aktif berinteraksi di sistem.`,
        todayStats: [
          { label: 'Guru Aktif Hari Ini', value: `${adoptionProgress.guruAktifHariIni} Guru` },
          { label: 'Rasio Aktif Hari Ini', value: `${adoptionProgress.progresAktifHariIniPct}%` },
        ],
        rangeStats: [
          { label: 'Total Guru Terdaftar', value: adoptionProgress.totalGuru },
          { label: 'Sudah Adopsi Platform', value: adoptionProgress.guruSudahMasuk },
          { label: 'Belum Pernah Masuk', value: adoptionProgress.guruBelumPernahMasuk },
          { label: 'Tingkat Adopsi', value: `${adoptionProgress.progresAdopsiPct}%` },
        ],
        progressBars: [
          {
            label: '[Hari Ini] Keaktifan Login & Interaksi Guru Hari Ini',
            value: adoptionProgress.progresAktifHariIniPct,
            detail: `${adoptionProgress.guruAktifHariIni} / ${adoptionProgress.totalGuru} Guru Beraktivitas di Sistem Hari Ini`,
            color: adoptionProgress.progresAktifHariIniPct >= 75 ? 'emerald' : 'blue',
          },
          {
            label: '[Akumulasi] Progres Adopsi Platform Digital Guru',
            value: adoptionProgress.progresAdopsiPct,
            detail: `${adoptionProgress.guruSudahMasuk} Sudah Masuk • ${adoptionProgress.guruBelumPernahMasuk} Belum Pernah Masuk Platform`,
            color:
              adoptionProgress.progresAdopsiPct >= 90
                ? 'emerald'
                : adoptionProgress.progresAdopsiPct >= 60
                ? 'indigo'
                : 'amber',
          },
        ],
        charts: [
          {
            type: 'pie',
            title: 'Segmentasi Adopsi Platform Guru',
            subtitle: 'Proporsi guru aktif hari ini, sudah adopsi, dan belum pernah login',
            centerLabel: `${adoptionProgress.progresAdopsiPct}%`,
            data: [
              { label: 'Aktif Hari Ini', value: adoptionProgress.guruAktifHariIni, color: 'emerald' },
              {
                label: 'Sudah Adopsi (Pasif Hari Ini)',
                value: Math.max(0, adoptionProgress.guruSudahMasuk - adoptionProgress.guruAktifHariIni),
                color: 'blue',
              },
              { label: 'Belum Pernah Login', value: adoptionProgress.guruBelumPernahMasuk, color: 'rose' },
            ],
          },
          {
            type: 'bar',
            title: 'Perbandingan Populasi & Aktivitas Digital Guru',
            subtitle: 'Rincian total guru terdaftar vs adopsi & keaktifan harian',
            data: [
              { label: 'Total Guru', value: adoptionProgress.totalGuru, color: 'indigo', unit: 'Guru' },
              { label: 'Sudah Adopsi', value: adoptionProgress.guruSudahMasuk, color: 'emerald', unit: 'Guru' },
              { label: 'Aktif Hari Ini', value: adoptionProgress.guruAktifHariIni, color: 'blue', unit: 'Guru' },
              { label: 'Belum Login', value: adoptionProgress.guruBelumPernahMasuk, color: 'rose', unit: 'Guru' },
            ],
          },
        ],
        items: adoptionItems.length > 0 ? adoptionItems : undefined,
      });
    }

    // SEKSI 3b: EVENT CBT & PENGUMPULAN SOAL (SSOT)
    if (cbtProgress && (cbtProgress.activeEvent || cbtProgress.totalBank > 0)) {
      sections.push({
        id: 'cbt_kurikulum',
        title: 'Event CBT & Progres Pengumpulan Soal',
        category: 'Kurikulum • CBT',
        badge: cbtProgress.activeEvent
          ? `${cbtProgress.activeEvent.kode_event} (${cbtProgress.progresPelaksanaanPct}% Terlaksana)`
          : `${cbtProgress.totalBank} Bank Soal`,
        summary: cbtProgress.activeEvent
          ? `Konteks ${cbtProgress.academicContext} — Event Aktif: ${cbtProgress.activeEvent.nama_event}. Bank soal ${cbtProgress.progresPengumpulanPct}% siap (${cbtProgress.bankTerisiSoal}/${cbtProgress.totalBank}). Pelaksanaan: ${cbtProgress.sudahMelaksanakan}/${cbtProgress.totalPeserta} peserta selesai (rata-rata ${cbtProgress.rataRataNilai}), ${cbtProgress.belumMelaksanakan} belum mulai, ${cbtProgress.jumlahKecurangan} indikasi kecurangan, dan ${cbtProgress.jumlahRemedial} peserta remedial.`
          : `Terdapat ${cbtProgress.totalBank} bank soal terdaftar dengan ${cbtProgress.totalSoal} butir soal terkumpul.`,
        todayStats: [
          { label: 'Sesi Ujian Aktif', value: cbtProgress.jadwalAktif },
          { label: 'Sedang Mengerjakan', value: cbtProgress.sedangMengerjakan },
        ],
        rangeStats: [
          { label: 'Sudah CBT (Event)', value: `${cbtProgress.sudahMelaksanakan} / ${cbtProgress.totalPeserta}` },
          { label: 'Belum CBT (Event)', value: cbtProgress.belumMelaksanakan },
          { label: 'Rata-Rata Nilai', value: cbtProgress.rataRataNilai },
          { label: 'Kecurangan (Event)', value: cbtProgress.jumlahKecurangan },
          { label: 'Perlu Remedial', value: cbtProgress.jumlahRemedial },
          { label: 'Bank Soal Terisi', value: `${cbtProgress.bankTerisiSoal} / ${cbtProgress.totalBank}` },
        ],
        progressBars: [
          {
            label: 'Progres Pengumpulan Bank Soal CBT',
            value: cbtProgress.progresPengumpulanPct,
            detail: `${cbtProgress.bankTerisiSoal} / ${cbtProgress.totalBank} Bank Soal Terisi (${cbtProgress.totalSoal} butir soal • ${cbtProgress.bankPublished} Published)`,
            color: cbtProgress.progresPengumpulanPct >= 90 ? 'emerald' : cbtProgress.progresPengumpulanPct >= 60 ? 'indigo' : 'amber',
          },
          {
            label: 'Progres Pelaksanaan Ujian CBT',
            value: cbtProgress.progresPelaksanaanPct,
            detail: `${cbtProgress.sudahMelaksanakan} Selesai • ${cbtProgress.sedangMengerjakan} Berlangsung • ${cbtProgress.belumMelaksanakan} Belum Melaksanakan`,
            color: cbtProgress.progresPelaksanaanPct >= 90 ? 'emerald' : 'blue',
          },
          {
            label: 'Ketuntasan Nilai CBT (Di Atas KKM)',
            value: cbtProgress.progresTuntasPct,
            detail: `Rata-rata perolehan: ${cbtProgress.rataRataNilai} • ${cbtProgress.jumlahRemedial} peserta di bawah KKM (Remedial)`,
            color: cbtProgress.progresTuntasPct >= 80 ? 'emerald' : cbtProgress.progresTuntasPct >= 50 ? 'amber' : 'rose',
          },
        ],
        charts: [
          {
            type: 'pie',
            title: 'Proporsi Pelaksanaan & Ketuntasan Peserta CBT',
            subtitle: 'Perbandingan peserta tuntas, remedial, sedang ujian, & belum mulai',
            centerLabel: `${cbtProgress.progresPelaksanaanPct}%`,
            data: [
              {
                label: 'Selesai (Tuntas ≥ KKM)',
                value: Math.max(0, cbtProgress.sudahMelaksanakan - cbtProgress.jumlahRemedial),
                color: 'emerald',
              },
              { label: 'Perlu Remedial (< KKM)', value: cbtProgress.jumlahRemedial, color: 'amber' },
              { label: 'Sedang Mengerjakan', value: cbtProgress.sedangMengerjakan, color: 'blue' },
              { label: 'Belum Melaksanakan', value: cbtProgress.belumMelaksanakan, color: 'slate' },
            ],
          },
          {
            type: 'bar',
            title: 'Kesiapan Bank Soal & Integritas CBT',
            subtitle: 'Rincian bank soal, sesi aktif, dan indikasi pelanggaran',
            data: [
              { label: 'Bank Terisi', value: cbtProgress.bankTerisiSoal, color: 'indigo', unit: 'Bank' },
              { label: 'Bank Published', value: cbtProgress.bankPublished, color: 'emerald', unit: 'Bank' },
              { label: 'Kecurangan', value: cbtProgress.jumlahKecurangan, color: 'rose', unit: 'Siswa' },
              { label: 'Remedial', value: cbtProgress.jumlahRemedial, color: 'amber', unit: 'Siswa' },
            ],
          },
        ],
        items:
          cbtProgress.kecuranganItems.length > 0
            ? cbtProgress.kecuranganItems.map((c) => ({
                title: `${c.namaSiswa} (${c.kelas})`,
                subtitle: `Ujian: ${c.namaSesi} • ${c.jumlahPelanggaran} catatan pelanggaran`,
                badge: c.status === 'DISQUALIFIED' ? 'Diskualifikasi' : `${c.jumlahPelanggaran}x Pelanggaran`,
                badgeColor:
                  'text-rose-700 bg-rose-100 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
                note: 'Terdeteksi perpindahan tab/pelanggaran pengawas selama sesi CBT.',
              }))
            : undefined,
      });
    }

    // SEKSI 3c: FASE PENILAIAN KBM & KESIAPAN RAPOR (SSOT)
    sections.push({
      id: 'penilaian_rapor',
      title: 'Fase Penilaian KBM & Kesiapan Rapor',
      category: 'Penilaian & Rapor',
      badge: `Rapor ${nilaiSumatifPct}%`,
      summary: raporReadiness
        ? `Konteks ${raporReadiness.academicContext}: Kesiapan biodata siswa mencapai ${biodataSiapPct}% (${raporReadiness.biodataLengkapCount}/${raporReadiness.totalSiswaAkademik}), keterisian nilai sumatif ${nilaiSumatifPct}% (${raporReadiness.completedTasks}/${raporReadiness.totalTasks} tugas mapel tuntas dari ${raporReadiness.totalGuruMapel} guru).`
        : 'Data kesiapan penilaian & rapor belum tersedia.',
      rangeStats: raporReadiness
        ? [
            { label: 'Biodata Siswa Siap', value: `${biodataSiapPct}%` },
            { label: 'Nilai Sumatif Terisi', value: `${nilaiSumatifPct}%` },
            { label: 'Tugas Mapel Tuntas', value: `${raporReadiness.completedTasks} / ${raporReadiness.totalTasks}` },
            { label: 'Guru Tuntas Input', value: `${raporReadiness.guruCompleted} / ${raporReadiness.totalGuruMapel}` },
            { label: 'Catatan Wali Kelas', value: `${raporReadiness.catatanWalasPct}%` },
          ]
        : undefined,
      progressBars: raporReadiness
        ? [
            {
              label: 'Kesiapan Keterisian Biodata Siswa',
              value: biodataSiapPct,
              detail: `${raporReadiness.biodataLengkapCount} / ${raporReadiness.totalSiswaAkademik} Siswa Lengkap`,
              color: biodataSiapPct >= 95 ? 'emerald' : biodataSiapPct >= 75 ? 'blue' : 'amber',
            },
            {
              label: 'Keterisian Nilai Sumatif & Rapor',
              value: nilaiSumatifPct,
              detail: `${raporReadiness.siswaNilaiTerisi.toLocaleString('id-ID')} / ${raporReadiness.totalSiswaNilaiTarget.toLocaleString('id-ID')} Entri Nilai (${raporReadiness.guruCompleted}/${raporReadiness.totalGuruMapel} Guru Tuntas)`,
              color: nilaiSumatifPct >= 90 ? 'emerald' : nilaiSumatifPct >= 50 ? 'indigo' : 'amber',
            },
          ]
        : undefined,
      charts: raporReadiness
        ? [
            {
              type: 'pie',
              title: 'Distribusi Progres Input Nilai Guru',
              subtitle: 'Proporsi penyelesaian input nilai rapor per guru pengampu',
              centerLabel: `${nilaiSumatifPct}%`,
              data: [
                { label: 'Guru Tuntas 100%', value: raporReadiness.guruCompleted, color: 'emerald' },
                { label: 'Dalam Proses (Parsial)', value: raporReadiness.guruPartial, color: 'amber' },
                { label: 'Belum Menginput', value: raporReadiness.guruEmpty, color: 'rose' },
              ],
            },
            {
              type: 'bar',
              title: 'Indeks Kesiapan Komponen Rapor (%)',
              subtitle: 'Perbandingan kesiapan biodata, nilai sumatif, dan catatan walas',
              maxValue: 100,
              data: [
                { label: 'Biodata Siswa', value: biodataSiapPct, color: 'blue', unit: '%' },
                { label: 'Nilai Sumatif', value: nilaiSumatifPct, color: 'indigo', unit: '%' },
                { label: 'Catatan Walas', value: raporReadiness.catatanWalasPct, color: 'emerald', unit: '%' },
              ],
            },
          ]
        : undefined,
    });

    // SEKSI 4: BP/BK & PEMBINAAN (SSOT & Scoped Konteks Akademik Aktif)
    sections.push({
      id: 'bpbk',
      title: 'Divisi BP/BK & Bimbingan Konseling',
      category: 'Bimbingan Siswa',
      badge: bpbkProgress
        ? (bpbkProgress.kasusAktif > 0 ? `${bpbkProgress.kasusAktif} Kasus Aktif` : 'Kondusif')
        : (bpbkItems.length > 0 ? `${bpbkItems.length} Catatan Hari Ini` : 'Kondusif'),
      summary: bpbkProgress
        ? `Konteks ${bpbkProgress.academicContext}: ${bpbkProgress.totalKasus} kasus tercatat (${bpbkProgress.kasusSelesai} selesai, ${bpbkProgress.kasusAktif} aktif), ${bpbkProgress.totalKonseling} sesi konseling (${bpbkProgress.konselingHariIni.length} hari ini), ${bpbkProgress.pemanggilanPending} panggilan ortu pending, dan ${bpbkProgress.homeVisitTotal} home visit.`
        : 'Situasi pembinaan terpantau kondusif, tidak ada laporan insiden darurat atau pembinaan khusus hari ini.',
      todayStats: bpbkProgress
        ? [
            { label: 'Konseling Hari Ini', value: bpbkProgress.konselingHariIni.length },
          ]
        : undefined,
      rangeStats: bpbkProgress
        ? [
            { label: 'Kasus Aktif (Semester)', value: bpbkProgress.kasusAktif },
            { label: 'Kasus Selesai (Semester)', value: bpbkProgress.kasusSelesai },
            { label: 'Konseling Berjalan', value: bpbkProgress.konselingProses },
            { label: 'Panggilan Ortu Pending', value: bpbkProgress.pemanggilanPending },
            { label: 'Home Visit (Semester)', value: bpbkProgress.homeVisitTotal },
          ]
        : undefined,
      progressBars: bpbkProgress
        ? [
            {
              label: 'Progres Penyelesaian Kasus BK',
              value: bpbkProgress.progresPenangananKasusPct,
              detail: `${bpbkProgress.kasusSelesai} / ${bpbkProgress.totalKasus} Kasus Selesai`,
              color: bpbkProgress.progresPenangananKasusPct >= 85 ? 'emerald' : bpbkProgress.progresPenangananKasusPct >= 50 ? 'indigo' : 'amber',
            },
            {
              label: 'Progres Tindak Lanjut Konseling',
              value: bpbkProgress.progresKonselingPct,
              detail: `${bpbkProgress.konselingSelesai} / ${bpbkProgress.totalKonseling} Sesi Tuntas`,
              color: bpbkProgress.progresKonselingPct >= 85 ? 'emerald' : 'blue',
            },
          ]
        : undefined,
      charts: bpbkProgress
        ? [
            {
              type: 'pie',
              title: 'Proporsi Penyelesaian Kasus & Konseling BK',
              subtitle: 'Perbandingan kasus/konseling yang telah selesai vs berjalan',
              centerLabel: `${bpbkProgress.progresPenangananKasusPct}%`,
              data: [
                { label: 'Kasus Selesai', value: bpbkProgress.kasusSelesai, color: 'emerald' },
                { label: 'Kasus Aktif', value: bpbkProgress.kasusAktif, color: 'rose' },
                { label: 'Konseling Tuntas', value: bpbkProgress.konselingSelesai, color: 'blue' },
                { label: 'Konseling Berjalan', value: bpbkProgress.konselingProses, color: 'amber' },
              ],
            },
            {
              type: 'bar',
              title: 'Volume Layanan & Penanganan BP/BK',
              subtitle: 'Rincian kasus, konseling, panggilan orang tua, dan home visit',
              data: [
                { label: 'Kasus Selesai', value: bpbkProgress.kasusSelesai, color: 'emerald', unit: 'Kasus' },
                { label: 'Kasus Aktif', value: bpbkProgress.kasusAktif, color: 'rose', unit: 'Kasus' },
                { label: 'Konseling Tuntas', value: bpbkProgress.konselingSelesai, color: 'blue', unit: 'Sesi' },
                { label: 'Panggilan Ortu', value: bpbkProgress.pemanggilanTotal, color: 'amber', unit: 'Surat' },
                { label: 'Home Visit', value: bpbkProgress.homeVisitTotal, color: 'indigo', unit: 'Kunjungan' },
              ],
            },
          ]
        : undefined,
      items: bpbkItems.map(b => ({
        title: b.title,
        subtitle: b.note,
        status: b.status,
        badge: b.status,
        badgeColor: b.title.startsWith('[Prioritas Tinggi]')
          ? 'text-rose-700 bg-rose-100 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
          : 'text-amber-700 bg-amber-100 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
      })),
    });

    // SEKSI 4b: PROGRAM KETARUNAAN (SSOT langsung via programKetarunaanService.getStats • Scope 1 Semester Ganjil)
    if (ketarunaanStats && (ketarunaanStats.ringkasan_periode?.total_sesi > 0 || (ketarunaanStats.status_breakdown?.total || 0) > 0)) {
      const rk = ketarunaanStats.ringkasan_periode as any;
      const bm = ketarunaanStats.barometer_sertifikasi;
      const sb = ketarunaanStats.status_breakdown;
      const agendas = (ketarunaanStats as any).agenda_breakdown || [];
      const topTaruna = ketarunaanStats.taruna_ranking?.top_global?.slice(0, 3) || [];
      const atRiskTaruna = ketarunaanStats.at_risk_students?.slice(0, 3) || [];

      const cdiPct = rk?.avg_persen_siswa ?? bm?.indeks_disiplin ?? 0;
      const pembinaPct = rk?.avg_persen_guru ?? 0;
      const kelayakanPct = bm?.persen_kelayakan ?? 0;
      const siapSertifikasi = bm?.siap_sertifikasi ?? 0;
      const butuhPembinaan = bm?.butuh_pembinaan ?? 0;
      const totalTarunaPeserta = bm?.total_taruna ?? 0;
      const totalPertemuan = rk?.total_pertemuan_taruna ?? rk?.total_sesi ?? 0;
      const totalHariKalender = rk?.total_sesi ?? 0;
      const totalSesiKelas = rk?.total_sesi_kelas ?? 0;
      const targetKelasCount = rk?.target_kelas_count ?? 20;

      const ketarunaanItems = [
        ...topTaruna.map((t: any, idx: number) => ({
          title: `[Teladan #${idx + 1}] ${t.nama_siswa} (${t.nama_kelas})`,
          subtitle: `Kehadiran: ${t.persen_hadir}% (${t.hadir}/${t.total_sesi} sesi) • Alpa: ${t.alpa} • Terlambat: ${t.terlambat}x`,
          badge: `Skor ${t.skor_disiplin} • ${t.predikat}`,
          badgeColor:
            'text-emerald-700 bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
        })),
        ...atRiskTaruna.map((r: any) => ({
          title: `[Atensi Pembinaan] ${r.nama_siswa} (${r.nama_kelas})`,
          subtitle: `NIS: ${r.nis} • Tercatat ${r.total_alpa} kali alpa pada apel/latihan ketarunaan`,
          badge: `${r.total_alpa}x Alpa Taruna`,
          badgeColor:
            'text-rose-700 bg-rose-100 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
          note: 'Perlu pembinaan kedisiplinan oleh Pembina Ketarunaan & Wali Kelas.',
        })),
      ];

      sections.push({
        id: 'ketarunaan',
        title: 'Program Ketarunaan & Disiplin Taruna Kelas X (1 Semester Ganjil)',
        category: 'Ketarunaan',
        badge: `CDI ${cdiPct}% • Sertifikasi ${kelayakanPct}%`,
        summary: `Scope 1 Semester Ganjil (${targetKelasCount} Rombel Kelas X • ${totalTarunaPeserta.toLocaleString('id-ID')} Taruna): Indeks Disiplin (CDI) mencapai ${cdiPct}% (${rk?.evaluasi || 'Baik'}), Kesiapan Sertifikasi ${kelayakanPct}% (${siapSertifikasi.toLocaleString('id-ID')} siap lulus ≥80%, ${butuhPembinaan.toLocaleString('id-ID')} butuh pembinaan), Kepatuhan Pembina Lapangan ${pembinaPct}% dalam ${totalPertemuan} pertemuan (${totalHariKalender} hari kalender • ${totalSesiKelas.toLocaleString('id-ID')} sesi kelas).`,
        rangeStats: [
          { label: 'Indeks Disiplin (CDI)', value: `${cdiPct}%` },
          { label: 'Kesiapan Sertifikasi', value: `${kelayakanPct}% (${siapSertifikasi}/${totalTarunaPeserta})` },
          { label: 'Kepatuhan Pembina', value: `${pembinaPct}%` },
          { label: 'Pertemuan Terlaksana', value: `${totalPertemuan} Sesi (${totalHariKalender} Hari)` },
          { label: 'Total Sesi Kelas', value: `${totalSesiKelas.toLocaleString('id-ID')} (${targetKelasCount} Rombel)` },
          { label: 'Butuh Pembinaan (<80%)', value: `${butuhPembinaan} Taruna` },
        ],
        progressBars: [
          {
            label: '[1 Semester Ganjil] Indeks Disiplin Taruna (CDI) & Kehadiran Apel',
            value: cdiPct,
            detail: `${(rk?.total_hadir_siswa ?? sb?.HADIR ?? 0).toLocaleString('id-ID')} Akumulasi Taruna Hadir • Evaluasi: ${rk?.evaluasi || 'Baik'} • Kepatuhan Pembina: ${pembinaPct}%`,
            color: cdiPct >= 85 ? 'emerald' : cdiPct >= 75 ? 'blue' : 'amber',
          },
          {
            label: '[1 Semester Ganjil] Barometer Kesiapan Sertifikasi Taruna (Syarat ≥80%)',
            value: kelayakanPct,
            detail: `${siapSertifikasi.toLocaleString('id-ID')} Taruna Siap Lulus Sertifikasi • ${butuhPembinaan.toLocaleString('id-ID')} Taruna Butuh Pembinaan dari ${totalTarunaPeserta.toLocaleString('id-ID')} Taruna`,
            color: kelayakanPct >= 85 ? 'emerald' : kelayakanPct >= 70 ? 'indigo' : 'amber',
          },
        ],
        charts: [
          {
            type: 'pie',
            title: 'Komposisi Status Presensi Taruna (1 Semester Ganjil)',
            subtitle: 'Proporsi kehadiran tepat waktu, sakit, izin, dispensasi, dan alpa taruna',
            centerLabel: `${cdiPct}%`,
            data: [
              { label: 'Hadir Tepat', value: sb?.HADIR || 0, color: 'emerald' },
              { label: 'Sakit', value: sb?.SAKIT || 0, color: 'amber' },
              { label: 'Izin', value: sb?.IZIN || 0, color: 'blue' },
              { label: 'Dispensasi', value: sb?.DISPENSASI || 0, color: 'purple' },
              { label: 'Alpa / Mangkir', value: sb?.ALPA || 0, color: 'rose' },
            ],
          },
          {
            type: 'bar',
            title: 'Capaian 4 Agenda Siklus Disiplin Taruna (%)',
            subtitle: 'Persentase kehadiran & jumlah pertemuan per pilar siklus ketarunaan',
            maxValue: 100,
            data:
              agendas.length > 0
                ? agendas.map((ag: any) => {
                    const colorMap: Record<string, 'blue' | 'indigo' | 'emerald' | 'purple'> = {
                      UPACARA: 'blue',
                      KETARUNAAN: 'indigo',
                      DUHA: 'emerald',
                      APEL_SORE: 'purple',
                    };
                    const shortLabelMap: Record<string, string> = {
                      UPACARA: `Upacara (${ag.total_pertemuan}x • ${ag.total_sesi_kelas} Sesi)`,
                      KETARUNAAN: `Ketarunaan (${ag.total_pertemuan}x • ${ag.total_sesi_kelas} Sesi)`,
                      DUHA: `Dhuha (${ag.total_pertemuan}x • ${ag.total_sesi_kelas} Sesi)`,
                      APEL_SORE: `Apel Sore (${ag.total_pertemuan}x • ${ag.total_sesi_kelas} Sesi)`,
                    };
                    return {
                      label: shortLabelMap[ag.kode] || ag.nama,
                      value: ag.persen_hadir || 0,
                      color: colorMap[ag.kode] || 'indigo',
                      unit: '%',
                    };
                  })
                : [
                    { label: 'Indeks Disiplin (CDI)', value: cdiPct, color: 'emerald', unit: '%' },
                    { label: 'Kesiapan Sertifikasi', value: kelayakanPct, color: 'blue', unit: '%' },
                    { label: 'Kepatuhan Pembina', value: pembinaPct, color: 'indigo', unit: '%' },
                  ],
          },
        ],
        items: ketarunaanItems.length > 0 ? ketarunaanItems : undefined,
      });
    }

    // SEKSI 5: HUBIN & PKL (Jika sekolah SMK / ada siswa PKL)
    if (totalSiswaPklAktif > 0 || totalPklAll > 0) {
      const sidangProgressDetail =
        pklAssessmentMode === 'DUDI_ONLY' && pklSidangScheduled === 0 && pklSidangTerisi === 0
          ? 'Mode Penilaian: DUDI Only (Tanpa Sidang)'
          : `${pklSidangTerisi} / ${sidangDenominator} Siswa Selesai Sidang`;

      sections.push({
        id: 'hubin_pkl',
        title: 'Divisi Hubungan Industri, PKL & Sidang',
        category: 'Hubin & PKL',
        badge: `Nilai PKL ${progresNilaiPklPct}%`,
        summary: `Konteks ${activeTpLabel || 'TP Aktif'}: ${totalPklAll} siswa PKL (${totalSiswaPklAktif} aktif di DUDI, ${siswaPklHadir} lapor hadir hari ini). Progres input nilai PKL ${progresNilaiPklPct}% dan penilaian sidang ${progresSidangPklPct}%.`,
        todayStats: [
          { label: 'Lapor Hadir Hari Ini', value: siswaPklHadir },
          { label: 'Kendala / Alpa Hari Ini', value: siswaPklKendala },
        ],
        rangeStats: [
          { label: 'Total Siswa PKL (Periode)', value: totalPklAll || totalSiswaPklAktif },
          { label: 'Mitra DUDI Aktif', value: `${totalMitraDudi} Mitra (${filledMitraTp} TP Siap)` },
          { label: 'Ploting Penguji Sidang', value: `${pklSidangScheduled} / ${totalPklAll || totalSiswaPklAktif}` },
          { label: 'Input Nilai PKL (Periode)', value: `${progresNilaiPklPct}%` },
          { label: 'Nilai Sidang PKL (Periode)', value: `${progresSidangPklPct}%` },
        ],
        progressBars: [
          {
            label: 'Progres Input Nilai PKL (DUDI)',
            value: progresNilaiPklPct,
            detail: `${pklNilaiTerisi} / ${totalPklAll} Siswa Dinilai`,
            color: progresNilaiPklPct >= 90 ? 'emerald' : progresNilaiPklPct >= 50 ? 'indigo' : 'amber',
          },
          {
            label: 'Progres Penilaian Sidang PKL',
            value: progresSidangPklPct,
            detail: sidangProgressDetail,
            color: progresSidangPklPct >= 90 ? 'emerald' : 'blue',
          },
        ],
        charts: [
          {
            type: 'pie',
            title: 'Komposisi Kehadiran Harian Siswa PKL',
            subtitle: 'Proporsi siswa PKL aktif yang lapor hadir vs belum/kendala hari ini',
            centerLabel: `${
              totalSiswaPklAktif > 0 ? Math.round((siswaPklHadir / totalSiswaPklAktif) * 100) : 0
            }%`,
            data: [
              { label: 'Lapor Hadir Hari Ini', value: siswaPklHadir, color: 'emerald' },
              { label: 'Kendala / Alpa', value: siswaPklKendala, color: 'rose' },
              {
                label: 'Belum Lapor Presensi',
                value: Math.max(0, totalSiswaPklAktif - siswaPklHadir - siswaPklKendala),
                color: 'slate',
              },
            ],
          },
          {
            type: 'bar',
            title: 'Progres Penempatan, Presensi & Penilaian PKL',
            subtitle: 'Perbandingan jumlah siswa PKL, kehadiran hari ini, nilai DUDI, dan sidang',
            data: [
              { label: 'Total PKL', value: totalPklAll || totalSiswaPklAktif, color: 'indigo', unit: 'Siswa' },
              { label: 'Hadir Hari Ini', value: siswaPklHadir, color: 'emerald', unit: 'Siswa' },
              { label: 'Sudah Nilai DUDI', value: pklNilaiTerisi, color: 'blue', unit: 'Siswa' },
              { label: 'Selesai Sidang', value: pklSidangTerisi, color: 'purple', unit: 'Siswa' },
            ],
          },
        ],
      });
    }

    // ── 11b. Leaderboard (Guru Terbaik & Siswa Terbaik) & Galeri Bukti KBM Hari Ini (SSOT)
    let leaderboardData: UniversalBriefingData['leaderboard'] = undefined;
    let kbmGalleryData: UniversalBriefingData['kbmGallery'] = undefined;
    try {
      const attendanceStatsService = new DashboardAttendanceStatsService();
      const lbAndGallery = await attendanceStatsService.getAcademicScopedLeaderboardAndGallery(
        tenantId,
        { startUTC, endUTC, tz, limit: 5 }
      );
      leaderboardData = lbAndGallery.leaderboard;
      kbmGalleryData = lbAndGallery.kbmGallery;
    } catch (err) {
      console.warn('[Briefing:LeaderboardGallery] Error querying leaderboard & KBM gallery:', err);
    }

    // ── 11c. AI Executive Verdict & Gelar Sekolah (Multi-Divisi Holistic Intelligence)
    const toGrade = (s: number): 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' => {
      if (s >= 92) return 'A+';
      if (s >= 84) return 'A';
      if (s >= 75) return 'B+';
      if (s >= 65) return 'B';
      if (s >= 50) return 'C';
      return 'D';
    };
    const toStatus = (s: number): 'excellent' | 'good' | 'warning' | 'critical' => {
      if (s >= 88) return 'excellent';
      if (s >= 75) return 'good';
      if (s >= 55) return 'warning';
      return 'critical';
    };

    const aiPillars: BriefingAiPillar[] = [];

    // Pilar 1: Kedisiplinan & Presensi Siswa
    const latePenalty = totalSiswaAktif > 0 ? Math.min(20, Math.round((siswaTerlambat / totalSiswaAktif) * 100 * 1.5)) : 0;
    const p1Score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          persentaseSiswa * 0.65 +
            (pelanggaranSemesterTotal > 0 ? progresPenangananPelanggaranPct : 95) * 0.35 -
            latePenalty
        )
      )
    );
    aiPillars.push({
      id: 'pilar_kesiswaan',
      label: 'Kedisiplinan & Presensi Siswa',
      score: p1Score,
      grade: toGrade(p1Score),
      status: toStatus(p1Score),
      summary: `Kehadiran siswa ${persentaseSiswa}%, ${siswaTerlambat} terlambat gerbang, penyelesaian kasus ${progresPenangananPelanggaranPct}%.`,
    });

    // Pilar 2: Eksekusi KBM & Kinerja Guru
    const realisasiKbmPct = totalSesiKbm > 0 ? Math.round((sesiKbmTerlaksana / totalSesiKbm) * 100) : persentaseGuru;
    const p2Score = Math.max(
      0,
      Math.min(100, Math.round(persentaseGuru * 0.4 + realisasiKbmPct * 0.35 + persentaseJurnal * 0.25))
    );
    aiPillars.push({
      id: 'pilar_kbm',
      label: 'Eksekusi KBM & Kepatuhan Jurnal',
      score: p2Score,
      grade: toGrade(p2Score),
      status: toStatus(p2Score),
      summary: `Kehadiran guru ${persentaseGuru}%, realisasi sesi KBM ${realisasiKbmPct}%, kepatuhan jurnal ${persentaseJurnal}%.`,
    });

    // Pilar 3: Tata Kelola Administrasi & Akademik (Perangkat Ajar, CBT, Rapor)
    const perangkatScore = perangkatProgress ? perangkatProgress.progresGuruMengumpulkanPct : 70;
    const raporScore = raporReadiness ? Math.round(biodataSiapPct * 0.4 + nilaiSumatifPct * 0.6) : 70;
    const cbtScore = cbtProgress && cbtProgress.totalBank > 0 ? cbtProgress.progresPengumpulanPct : raporScore;
    const p3Score = Math.max(
      0,
      Math.min(100, Math.round(perangkatScore * 0.35 + raporScore * 0.45 + cbtScore * 0.2))
    );
    aiPillars.push({
      id: 'pilar_akademik',
      label: 'Kesiapan Perangkat Ajar, CBT & Rapor',
      score: p3Score,
      grade: toGrade(p3Score),
      status: toStatus(p3Score),
      summary: `Perangkat ajar ${perangkatScore}%, nilai rapor ${nilaiSumatifPct}%, biodata ${biodataSiapPct}%.`,
    });

    // Pilar 4: Transformasi Digital & Adopsi Platform
    const adoptionPct = adoptionProgress ? adoptionProgress.progresAdopsiPct : 75;
    const activeTodayPct = adoptionProgress ? adoptionProgress.progresAktifHariIniPct : 70;
    const p4Score = Math.max(0, Math.min(100, Math.round(adoptionPct * 0.7 + activeTodayPct * 0.3)));
    aiPillars.push({
      id: 'pilar_digital',
      label: 'Transformasi Digital & Adopsi Guru',
      score: p4Score,
      grade: toGrade(p4Score),
      status: toStatus(p4Score),
      summary: adoptionProgress
        ? `Adopsi platform ${adoptionPct}% (${adoptionProgress.guruSudahMasuk}/${adoptionProgress.totalGuru} guru), ${adoptionProgress.guruBelumPernahMasuk} belum pernah login.`
        : `Tingkat adopsi platform guru tercatat ${adoptionPct}%.`,
    });

    // Pilar 5: Pembinaan Karakter, BP/BK & Ketarunaan
    const bkCasePct =
      bpbkProgress && bpbkProgress.totalKasus > 0 ? bpbkProgress.progresPenangananKasusPct : 90;
    const hasKetarunaanStats =
      ketarunaanStats &&
      ((ketarunaanStats.ringkasan_periode?.total_sesi || 0) > 0 ||
        (ketarunaanStats.status_breakdown?.total || 0) > 0);
    const ketarunaanCdiPct = hasKetarunaanStats
      ? ketarunaanStats!.ringkasan_periode?.avg_persen_siswa ||
        ketarunaanStats!.barometer_sertifikasi?.indeks_disiplin ||
        0
      : bkCasePct;
    const ketarunaanSertifikasiPct = hasKetarunaanStats
      ? ketarunaanStats!.barometer_sertifikasi?.persen_kelayakan || ketarunaanCdiPct
      : bkCasePct;
    const ketarunaanPct = hasKetarunaanStats
      ? Math.round(ketarunaanCdiPct * 0.6 + ketarunaanSertifikasiPct * 0.4)
      : bkCasePct;
    const p5Score = Math.max(0, Math.min(100, Math.round(bkCasePct * 0.55 + ketarunaanPct * 0.45)));
    aiPillars.push({
      id: 'pilar_karakter',
      label: 'Pembinaan Karakter, BK & Ketarunaan',
      score: p5Score,
      grade: toGrade(p5Score),
      status: toStatus(p5Score),
      summary: `Penanganan kasus BK ${bkCasePct}%${
        hasKetarunaanStats
          ? `, CDI Ketarunaan ${ketarunaanCdiPct}% (Sertifikasi ${ketarunaanSertifikasiPct}%)`
          : ''
      }.`,
    });

    // Pilar 6 (Opsional jika ada PKL): Kemitraan Industri & PKL
    if (totalSiswaPklAktif > 0 || totalPklAll > 0) {
      const pklHadirPct =
        totalSiswaPklAktif > 0 ? Math.round((siswaPklHadir / totalSiswaPklAktif) * 100) : 85;
      const p6Score = Math.max(
        0,
        Math.min(100, Math.round(pklHadirPct * 0.4 + progresNilaiPklPct * 0.35 + progresSidangPklPct * 0.25))
      );
      aiPillars.push({
        id: 'pilar_hubin',
        label: 'Kemitraan Industri & PKL',
        score: p6Score,
        grade: toGrade(p6Score),
        status: toStatus(p6Score),
        summary: `Presensi PKL hari ini ${siswaPklHadir}/${totalSiswaPklAktif}, nilai DUDI ${progresNilaiPklPct}%, sidang ${progresSidangPklPct}%.`,
      });
    }

    const overallAiScore = Math.round(
      aiPillars.reduce((acc, p) => acc + p.score, 0) / Math.max(1, aiPillars.length)
    );
    const overallGrade = toGrade(overallAiScore);

    let schoolTitle = 'Sekolah Berkembang — Perlu Akselerasi Kepatuhan & Digitalisasi';
    let tagline = 'Operasional berjalan moderat namun sejumlah indikator akademik membutuhkan dorongan pimpinan.';
    let verdictVariant: BriefingAiVerdict['variant'] = 'indigo';

    if (overallAiScore >= 92) {
      schoolTitle = 'Sekolah Unggul Berintegritas & Transformasi Digital Paripurna';
      tagline = 'Standar emas kedisiplinan, pelaksanaan KBM, tata kelola akademik, dan adopsi digital berjalan sangat prima.';
      verdictVariant = 'emerald';
    } else if (overallAiScore >= 84) {
      schoolTitle = 'Sekolah Kondusif, Produktif & Disiplin Eksekusi Tinggi';
      tagline = 'Stabilitas KBM dan kedisiplinan terjaga kuat dengan tingkat kepatuhan administrasi di atas rata-rata.';
      verdictVariant = 'emerald';
    } else if (overallAiScore >= 75) {
      schoolTitle = 'Sekolah Progresif dengan Kinerja Akademik Stabil';
      tagline = 'Fondasi pengajaran dan adopsi digital sudah baik, dengan ruang optimalisasi pada ketuntasan administrasi guru.';
      verdictVariant = 'indigo';
    } else if (overallAiScore >= 62) {
      schoolTitle = 'Sekolah Transisi — Perlu Akselerasi Kepatuhan & Digitalisasi';
      tagline = 'Terdapat kesenjangan antara aktivitas lapangan dan ketuntasan pencatatan jurnal/perangkat ajar/rapor.';
      verdictVariant = 'amber';
    } else {
      schoolTitle = 'Status Atensi Eksekutif — Butuh Penertiban Operasional & KBM';
      tagline = 'Sejumlah indikator vital (kehadiran, jurnal KBM, atau administrasi akademik) berada di bawah ambang standar.';
      verdictVariant = 'rose';
    }

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    if (persentaseSiswa >= 92) {
      strengths.push(
        `Tingkat kehadiran siswa hari ini sangat solid (${persentaseSiswa}%)${
          rombelSempurna.length > 0 ? ` dengan ${rombelSempurna.length} rombel mencapai kehadiran 100%` : ''
        }.`
      );
    } else {
      weaknesses.push(
        `Kehadiran siswa tercatat ${persentaseSiswa}% (${siswaAlpa} alpa, ${siswaTerlambat} terlambat gerbang).`
      );
      recommendations.push(
        `Instruksikan Wakasek Kesiswaan & Wali Kelas menindaklanjuti ${
          consecutiveAlpaItems.length > 0 ? `${consecutiveAlpaItems.length} siswa alpa beruntun dan ` : ''
        }rombel dengan alpa tertinggi hari ini.`
      );
    }

    if (persentaseGuru >= 90 && persentaseJurnal >= 85) {
      strengths.push(
        `Disiplin mengajar guru tinggi (${persentaseGuru}% hadir) dengan kepatuhan pengisian jurnal KBM ${persentaseJurnal}%.`
      );
    } else {
      weaknesses.push(
        `Realisasi kehadiran mengajar (${persentaseGuru}%) atau kepatuhan pengisian jurnal KBM (${persentaseJurnal}%) belum optimal.`
      );
      recommendations.push(
        `Minta Wakasek Kurikulum & Guru Piket mengingatkan guru pengampu untuk menuntaskan presensi sesi KBM beserta jurnal dan foto bukti mengajar hari ini.`
      );
    }

    if (adoptionProgress) {
      if (adoptionProgress.progresAdopsiPct >= 90) {
        strengths.push(
          `Adopsi digital guru sangat matang: ${adoptionProgress.progresAdopsiPct}% guru aktif menggunakan platform (${adoptionProgress.guruAktifHariIni} aktif hari ini).`
        );
      } else if (adoptionProgress.guruBelumPernahMasuk > 0) {
        weaknesses.push(
          `Masih terdapat ${adoptionProgress.guruBelumPernahMasuk} guru aktif yang belum pernah login/masuk ke platform sama sekali.`
        );
        recommendations.push(
          `Lakukan pendampingan teknis singkat kepada ${adoptionProgress.guruBelumPernahMasuk} guru yang belum pernah masuk platform agar mencapai 100% digitalisasi.`
        );
      }
    }

    if (perangkatProgress) {
      if (perangkatProgress.progresGuruMengumpulkanPct >= 80) {
        strengths.push(
          `Kepatuhan pengumpulan Perangkat Ajar mencapai ${perangkatProgress.progresGuruMengumpulkanPct}% (${perangkatProgress.approvedCount} dokumen telah disetujui).`
        );
      } else {
        weaknesses.push(
          `Baru ${perangkatProgress.guruSudahMengumpulkan} dari ${perangkatProgress.totalGuruWajib} guru (${perangkatProgress.progresGuruMengumpulkanPct}%) yang mengumpulkan Perangkat Ajar${
            perangkatProgress.pendingCount > 0 ? `, serta ${perangkatProgress.pendingCount} dokumen menunggu verifikasi` : ''
          }.`
        );
        recommendations.push(
          `Tetapkan tenggat pengumpulan Perangkat Ajar bagi ${perangkatProgress.guruBelumMengumpulkan} guru yang belum mengunggah dokumen pada semester aktif ini.`
        );
      }
    }

    if (raporReadiness) {
      if (nilaiSumatifPct >= 85 && biodataSiapPct >= 90) {
        strengths.push(
          `Kesiapan Rapor semester aktif sangat terjaga (Biodata ${biodataSiapPct}%, Nilai Sumatif ${nilaiSumatifPct}%).`
        );
      } else if (nilaiSumatifPct < 75) {
        weaknesses.push(
          `Progres input nilai sumatif rapor masih ${nilaiSumatifPct}% (${raporReadiness.guruEmpty} guru belum menginput nilai).`
        );
        recommendations.push(
          `Dorong percepatan cicilan input nilai sumatif agar tidak menumpuk menjelang pembagian rapor.`
        );
      }
    }

    if (bpbkProgress && bpbkProgress.progresPenangananKasusPct >= 85 && bpbkProgress.totalKasus > 0) {
      strengths.push(
        `Responsivitas BP/BK sangat baik dengan rasio penyelesaian kasus ${bpbkProgress.progresPenangananKasusPct}% (${bpbkProgress.kasusSelesai}/${bpbkProgress.totalKasus} kasus selesai).`
      );
    }

    if (strengths.length === 0) {
      strengths.push(
        `Sistem pemantauan lintas divisi berjalan aktif merekam data real-time pada konteks ${activeTpLabel || 'Tahun Pelajaran Aktif'}.`
      );
    }
    if (weaknesses.length === 0) {
      weaknesses.push('Tidak ditemukan hambatan struktural mayor hari ini; seluruh indikator utama berada pada zona hijau.');
    }
    if (recommendations.length === 0) {
      recommendations.push(
        'Pertahankan ritme supervisi harian dan berikan apresiasi kepada guru/siswa terbaik pada leaderboard minggu ini.'
      );
    }

    const sortedPillars = [...aiPillars].sort((a, b) => b.score - a.score);
    const bestPillar = sortedPillars[0];
    const lowestPillar = sortedPillars[sortedPillars.length - 1];

    const executiveVerdict = `Berdasarkan sintesis algoritma AI terhadap seluruh data SSOT lintas divisi pada ${tanggalStr}, ${sekolahNama} memperoleh Indeks Performa Holistik ${overallAiScore}/100 (Grade ${overallGrade}) dan dianugerahi predikat "${schoolTitle}". Kekuatan terkuat sekolah saat ini bertumpu pada pilar ${bestPillar.label} (skor ${bestPillar.score}/100), sementara fokus akselerasi utama berada pada pilar ${lowestPillar.label} (skor ${lowestPillar.score}/100).`;

    const aiVerdict: BriefingAiVerdict = {
      overallScore: overallAiScore,
      grade: overallGrade,
      schoolTitle,
      tagline,
      variant: verdictVariant,
      executiveVerdict,
      pillars: aiPillars,
      strengths,
      weaknesses,
      recommendations,
    };

    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    return {
      title: 'Laporan Harian Eksekutif Sekolah',
      role: 'KEPALA_SEKOLAH',
      roleLabel: 'Kepala Sekolah',
      tenantId,
      sekolahNama,
      targetName,
      tanggalStr,
      tanggalIso: dateStr,
      generatedAt: new Date().toISOString(),
      expiresAt,
      statusBadge,
      trend: {
        kehadiranDeltaPct,
        kemarinKehadiranPct,
      },
      metrics,
      highlights,
      sections,
      leaderboard: leaderboardData,
      kbmGallery: kbmGalleryData,
      aiVerdict,
    };
  }
}
