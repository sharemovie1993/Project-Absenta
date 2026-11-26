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
import { UniversalBriefingData, BriefingMetricItem, BriefingSection } from '../../types/briefing.types';

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

    // ── 2. Kesiswaan: Kehadiran Siswa Hari Ini ──────────────────────────────────
    let totalSiswaAktif = 0;
    let siswaHadir = 0;
    let siswaSakit = 0;
    let siswaIzin = 0;
    let siswaAlpa = 0;

    try {
      totalSiswaAktif = await prisma.siswa.count({
        where: { tenant_id: tenantId, status: 'AKTIF' },
      });

      const absenSiswaStats = await prisma.absenSiswa.groupBy({
        by: ['status'],
        where: {
          tenant_id: tenantId,
          created_at: { gte: startUTC, lte: endUTC },
        },
        _count: { id: true },
      });

      for (const stat of absenSiswaStats) {
        const count = stat._count.id;
        const s = (stat.status || '').toUpperCase();
        if (s === 'HADIR') siswaHadir += count;
        else if (s === 'SAKIT') siswaSakit += count;
        else if (s === 'IZIN') siswaIzin += count;
        else if (s === 'ALPA') siswaAlpa += count;
      }
    } catch (err) {
      console.warn('[Briefing:Siswa] Error querying student attendance:', err);
    }

    const persentaseSiswa = totalSiswaAktif > 0
      ? Math.round((siswaHadir / totalSiswaAktif) * 100)
      : (siswaHadir > 0 ? 100 : 0);

    // ── 2.1 Perhitungan Tren Kehadiran Siswa vs Kemarin ────────────────────────
    let kemarinHadir = 0;
    try {
      const prevDate = new Date(dateObj);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().slice(0, 10);
      const { startUTC: prevStartUTC, endUTC: prevEndUTC } = getTenantDayRangeUTC(prevDateStr, tz);

      const prevStats = await prisma.absenSiswa.groupBy({
        by: ['status'],
        where: {
          tenant_id: tenantId,
          created_at: { gte: prevStartUTC, lte: prevEndUTC },
        },
        _count: { id: true },
      });
      for (const p of prevStats) {
        if ((p.status || '').toUpperCase() === 'HADIR') kemarinHadir += p._count.id;
      }
    } catch {}

    const kemarinKehadiranPct = totalSiswaAktif > 0 ? Math.round((kemarinHadir / totalSiswaAktif) * 100) : null;
    const kehadiranDeltaPct = kemarinKehadiranPct !== null ? Math.round((persentaseSiswa - kemarinKehadiranPct) * 10) / 10 : null;

    // Kedisiplinan: Gerbang & Piket
    let siswaTerlambat = 0;
    let siswaIzinKeluar = 0;

    try {
      siswaTerlambat = await prisma.absenGerbangSiswa.count({
        where: {
          tenant_id: tenantId,
          is_terlambat: true,
          created_at: { gte: startUTC, lte: endUTC },
        },
      });
    } catch {}

    try {
      siswaIzinKeluar = await prisma.izinKeluarSiswa.count({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startUTC, lte: endUTC },
        },
      });
    } catch {}

    // ── 3. Kurikulum: Kehadiran Guru & KBM ─────────────────────────────────────
    let totalGuru = 0;
    let guruHadir = 0;
    let guruTidakHadir = 0;
    let totalSesiKbm = 0;
    let sesiKbmTerlaksana = 0;
    let guruInvalCount = 0;

    try {
      totalGuru = await prisma.guru.count({
        where: { tenant_id: tenantId },
      });

      const guruAttendance = await prisma.absenGuru.groupBy({
        by: ['status'],
        where: {
          tenant_id: tenantId,
          created_at: { gte: startUTC, lte: endUTC },
        },
        _count: { guru_id: true },
      });

      for (const g of guruAttendance) {
        const count = g._count.guru_id;
        const s = (g.status || '').toUpperCase();
        if (s === 'HADIR') guruHadir += count;
        else guruTidakHadir += count;
      }

      // Sesi KBM hari ini
      const sesiList = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startUTC, lte: endUTC },
        },
        select: {
          id: true,
          status: true,
          is_delegasi: true,
          keterangan: true,
        },
      });

      totalSesiKbm = sesiList.length;
      sesiKbmTerlaksana = sesiList.filter(s => s.status === 'SELESAI' || s.keterangan).length;
      guruInvalCount = sesiList.filter(s => s.is_delegasi).length;
    } catch (err) {
      console.warn('[Briefing:Kurikulum] Error querying KBM & teachers:', err);
    }

    const persentaseGuru = totalGuru > 0
      ? Math.round((guruHadir / totalGuru) * 100)
      : (guruHadir > 0 ? 100 : 0);

    const persentaseJurnal = totalSesiKbm > 0
      ? Math.round((sesiKbmTerlaksana / totalSesiKbm) * 100)
      : 100;

    // ── 3.1 Guru Berhalangan Hadir & Status Inval ──────────────────────────────
    let guruBerhalanganItems: Array<{ nama: string; status: string; catatan?: string; isInval: boolean }> = [];
    try {
      const absGuruList = await prisma.absenGuru.findMany({
        where: {
          tenant_id: tenantId,
          status: { not: 'HADIR' },
          created_at: { gte: startUTC, lte: endUTC },
        },
        include: {
          Guru: { select: { nama_guru: true } },
          SesiAbsensi: { select: { is_delegasi: true } },
        },
        take: 6,
      });

      guruBerhalanganItems = absGuruList.map(ag => ({
        nama: ag.Guru?.nama_guru || 'Guru',
        status: ag.status,
        catatan: ag.catatan || undefined,
        isInval: Boolean(ag.SesiAbsensi?.is_delegasi),
      }));
    } catch {}

    // ── 4. Early Warning System: Siswa Alpa Berturut-turut ─────────────────────
    let consecutiveAlpaItems: Array<{ nama: string; kelas: string; count: number }> = [];
    try {
      const todayAlpaRecords = await prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          status: 'ALPA',
          created_at: { gte: startUTC, lte: endUTC },
        },
        select: {
          siswa_id: true,
          kelas_nama_snapshot: true,
          Siswa: { select: { nama_siswa: true } },
          SiswaAkademik: { select: { siswa: { select: { nama_siswa: true } } } },
        },
        take: 15,
      });

      const sevenDaysAgo = new Date(startUTC);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const rec of todayAlpaRecords) {
        if (!rec.siswa_id) continue;
        const pastAlpa = await prisma.absenSiswa.count({
          where: {
            tenant_id: tenantId,
            siswa_id: rec.siswa_id,
            status: 'ALPA',
            created_at: { gte: sevenDaysAgo, lt: startUTC },
          },
        });
        const totalAlpaRecent = pastAlpa + 1;
        if (totalAlpaRecent >= 2) {
          const studentName = rec.Siswa?.nama_siswa || rec.SiswaAkademik?.siswa?.nama_siswa || 'Siswa';
          consecutiveAlpaItems.push({
            nama: studentName,
            kelas: rec.kelas_nama_snapshot || 'Kelas',
            count: totalAlpaRecent,
          });
        }
      }
      consecutiveAlpaItems.sort((a, b) => b.count - a.count);
    } catch (err) {
      console.warn('[Briefing:EarlyWarning] Error checking consecutive alpa:', err);
    }

    // ── 4.1 Siswa Izin Keluar Sekolah (Buku Piket) ─────────────────────────────
    let izinKeluarItems: Array<{ nama: string; kelas: string; alasan: string; status: string; jamKeluar: string; jamKembali?: string }> = [];
    try {
      const ikList = await prisma.izinKeluarSiswa.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startUTC, lte: endUTC },
        },
        include: {
          SiswaAkademik: {
            include: {
              siswa: { select: { nama_siswa: true } },
              kelas: { select: { nama_kelas: true } },
            },
          },
        },
        take: 5,
        orderBy: { jam_keluar: 'desc' },
      });

      izinKeluarItems = ikList.map(ik => {
        const jamK = ik.jam_keluar ? new Date(ik.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz }) : '-';
        const jamB = ik.jam_kembali ? new Date(ik.jam_kembali).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz }) : undefined;
        return {
          nama: ik.SiswaAkademik?.siswa?.nama_siswa || 'Siswa',
          kelas: ik.SiswaAkademik?.kelas?.nama_kelas || 'Kelas',
          alasan: ik.alasan,
          status: ik.status === 'KEMBALI' ? 'Sudah Kembali' : 'Masih di Luar',
          jamKeluar: jamK,
          jamKembali: jamB,
        };
      });
    } catch {}

    // ── 5. Wali Kelas: Rombel dengan Alpa Terbanyak vs Kehadiran 100% ──────────
    let topRombelAlpa: Array<{ kelasNama: string; alpaCount: number }> = [];
    let rombelSempurna: string[] = [];

    try {
      const kelasGroup = await prisma.absenSiswa.groupBy({
        by: ['kelas_nama_snapshot', 'status'],
        where: {
          tenant_id: tenantId,
          created_at: { gte: startUTC, lte: endUTC },
        },
        _count: { id: true },
      });

      const mapKelas = new Map<string, { hadir: number; alpa: number; sakitIzin: number }>();
      for (const kg of kelasGroup) {
        const kName = kg.kelas_nama_snapshot;
        if (!kName) continue;
        if (!mapKelas.has(kName)) mapKelas.set(kName, { hadir: 0, alpa: 0, sakitIzin: 0 });
        const obj = mapKelas.get(kName)!;
        const st = (kg.status || '').toUpperCase();
        if (st === 'HADIR') obj.hadir += kg._count.id;
        else if (st === 'ALPA') obj.alpa += kg._count.id;
        else obj.sakitIzin += kg._count.id;
      }

      mapKelas.forEach((val, kName) => {
        if (val.hadir > 0 && val.alpa === 0 && val.sakitIzin === 0) {
          rombelSempurna.push(kName);
        }
        if (val.alpa > 0) {
          topRombelAlpa.push({ kelasNama: kName, alpaCount: val.alpa });
        }
      });

      topRombelAlpa.sort((a, b) => b.alpaCount - a.alpaCount);
      topRombelAlpa = topRombelAlpa.slice(0, 4);
      rombelSempurna = rombelSempurna.slice(0, 4);
    } catch {}

    // ── 6. BP/BK & Pembinaan ──────────────────────────────────────────────────
    let bpbkItems: Array<{ title: string; note: string; status: string }> = [];
    try {
      const konselingList = await prisma.konselingSiswa.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startUTC, lte: endUTC },
        },
        select: {
          id: true,
          tipe: true,
          masalah: true,
          status: true,
        },
        take: 3,
      });

      bpbkItems = konselingList.map(k => ({
        title: k.tipe ? `Konseling ${k.tipe}` : 'Konseling Siswa',
        note: k.masalah || 'Tindak lanjut pembinaan',
        status: k.status || 'PROSES',
      }));
    } catch {}

    // ── 7. Konteks Akademik Aktif & Hubin PKL / Sidang ────────────────────────
    const [activeTp, activeSem] = await Promise.all([
      prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, tahun: true } }),
      prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, nama_semester: true } }),
    ]);
    const activeTpLabel = activeTp ? `${activeTp.tahun}${activeSem ? ` (${activeSem.nama_semester})` : ''}` : '';

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

    // ── 7b. Hubin & PKL: Progres Input Nilai PKL & Sidang (Scoped TP Aktif) ──
    let totalPklAll = 0;
    let pklNilaiTerisi = 0;
    let pklSidangTerisi = 0;
    let pklSidangScheduled = 0;
    let pklAssessmentMode = 'DUDI_ONLY';
    try {
      if (activeTp) {
        const hubinSetting = await prisma.hubinSetting.findUnique({
          where: {
            tenant_id_tahun_pelajaran_id: {
              tenant_id: tenantId,
              tahun_pelajaran_id: activeTp.id,
            },
          },
          select: { assessment_mode: true },
        });
        if (hubinSetting?.assessment_mode) {
          pklAssessmentMode = hubinSetting.assessment_mode;
        }
      }

      const pklRows = await prisma.siswaPkl.findMany({
        where: {
          tenant_id: tenantId,
          status: { in: ['AKTIF', 'SELESAI'] },
          ...pklAcademicScope,
        },
        select: {
          nilai_akhir_pkl: true,
          hard_kompetensi_teknis: true,
          soft_kedisiplinan: true,
          nomor_sertifikat: true,
          nilai_json: true,
        },
      });
      totalPklAll = pklRows.length;
      for (const row of pklRows) {
        const nj = (row.nilai_json && typeof row.nilai_json === 'object' ? row.nilai_json : {}) as Record<string, any>;
        const hasNilaiPkl =
          row.nilai_akhir_pkl !== null ||
          row.hard_kompetensi_teknis !== null ||
          row.soft_kedisiplinan !== null ||
          (nj.dudi_avg !== undefined && nj.dudi_avg !== null) ||
          (nj.nilai_akhir !== undefined && nj.nilai_akhir !== null);
        if (hasNilaiPkl) pklNilaiTerisi++;

        if (nj.penguji_id) pklSidangScheduled++;
        const hasSidang =
          (nj.nilai_sidang !== undefined && nj.nilai_sidang !== null) ||
          (nj.sidang_avg !== undefined && nj.sidang_avg !== null) ||
          Boolean(nj.sidang_completed_at);
        if (hasSidang) pklSidangTerisi++;
      }
    } catch (err) {
      console.warn('[Briefing:PKL] Error querying PKL grading:', err);
    }
    const progresNilaiPklPct = totalPklAll > 0 ? Math.round((pklNilaiTerisi / totalPklAll) * 100) : 0;
    const sidangDenominator = pklSidangScheduled > 0 ? pklSidangScheduled : totalPklAll;
    const progresSidangPklPct = sidangDenominator > 0 ? Math.round((pklSidangTerisi / sidangDenominator) * 100) : 0;

    // ── 7c. Kurikulum: Event CBT Aktif & Progres Pengumpulan Soal ─────────────
    let activeCbtEvents: Array<{ nama_event: string; kode_event: string; semester: string }> = [];
    let cbtTotalBank = 0;
    let cbtSiapBank = 0;
    let cbtTotalSoal = 0;
    try {
      activeCbtEvents = await prisma.cbtEvent.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { nama_event: true, kode_event: true, semester: true },
      });

      const bankWhere: any = { tenant_id: tenantId };
      if (activeTp?.id) bankWhere.tahun_pelajaran_id = activeTp.id;

      const bankList = await prisma.cbtBankSoal.findMany({
        where: bankWhere,
        select: { status: true, jumlah_soal: true },
      });
      cbtTotalBank = bankList.length;
      for (const b of bankList) {
        cbtTotalSoal += b.jumlah_soal || 0;
        if ((b.jumlah_soal || 0) > 0 && b.status !== 'ARCHIVED') {
          cbtSiapBank++;
        }
      }
    } catch (err) {
      console.warn('[Briefing:CBT] Error querying CBT progress:', err);
    }
    const cbtProgressPct = cbtTotalBank > 0 ? Math.round((cbtSiapBank / cbtTotalBank) * 100) : 0;

    // ── 7d. Fase Penilaian KBM: Kesiapan Biodata & Keterisian Nilai Sumatif ───
    let biodataLengkapCount = 0;
    let nilaiSumatifTerisiCount = 0;
    let nilaiSumatifTargetCount = 0;
    let activeSemesterLabel = '';
    try {
      const activeSiswaList = await prisma.siswa.findMany({
        where: { tenant_id: tenantId, status: 'AKTIF' },
        select: {
          nisn: true,
          nik: true,
          tempat_lahir: true,
          tanggal_lahir: true,
          alamat: true,
          nama_ibu: true,
          nama_ayah: true,
        },
      });
      for (const s of activeSiswaList) {
        const isComplete = Boolean(
          s.nisn && s.tempat_lahir && s.tanggal_lahir && s.alamat && (s.nama_ibu || s.nama_ayah)
        );
        if (isComplete) biodataLengkapCount++;
      }

      if (activeTp && activeSem) {
        activeSemesterLabel = `${activeTp.tahun} (${activeSem.nama_semester})`;
        const nilaiRows = await prisma.nilaiSiswa.findMany({
          where: {
            tenant_id: tenantId,
            tahun_pelajaran_id: activeTp.id,
            semester_id: activeSem.id,
          },
          select: {
            sumatif_1: true,
            nilai_akhir_sumatif: true,
            nilai_rapor_final: true,
            nilai: true,
          },
        });
        nilaiSumatifTargetCount = nilaiRows.length;
        for (const n of nilaiRows) {
          if (
            n.nilai_akhir_sumatif !== null ||
            n.nilai_rapor_final !== null ||
            n.sumatif_1 !== null ||
            (n.nilai && n.nilai > 0)
          ) {
            nilaiSumatifTerisiCount++;
          }
        }
      }
    } catch (err) {
      console.warn('[Briefing:Rapor] Error querying rapor readiness:', err);
    }
    const biodataSiapPct = totalSiswaAktif > 0 ? Math.round((biodataLengkapCount / totalSiswaAktif) * 100) : 0;
    const nilaiSumatifPct =
      nilaiSumatifTargetCount > 0 ? Math.round((nilaiSumatifTerisiCount / nilaiSumatifTargetCount) * 100) : 0;

    // ── 7e. Kesiswaan: Tren Penurunan Pelanggaran Siswa (7 Hari vs 7 Hari Lalu)
    let pelanggaranMingguIni = 0;
    let pelanggaranMingguLalu = 0;
    let pelanggaranDeltaPct: number | null = null;
    try {
      const nowEnd = endUTC;
      const week1Start = new Date(startUTC.getTime() - 6 * 24 * 3600 * 1000);
      const week2End = new Date(week1Start.getTime() - 1);
      const week2Start = new Date(week1Start.getTime() - 7 * 24 * 3600 * 1000);

      const [c1, c2] = await Promise.all([
        prisma.pelanggaranSiswa.count({
          where: { tenant_id: tenantId, tanggal: { gte: week1Start, lte: nowEnd } },
        }),
        prisma.pelanggaranSiswa.count({
          where: { tenant_id: tenantId, tanggal: { gte: week2Start, lte: week2End } },
        }),
      ]);
      pelanggaranMingguIni = c1;
      pelanggaranMingguLalu = c2;
      if (c2 > 0) {
        pelanggaranDeltaPct = Math.round(((c1 - c2) / c2) * 100);
      } else if (c1 === 0) {
        pelanggaranDeltaPct = 0;
      }
    } catch (err) {
      console.warn('[Briefing:Pelanggaran] Error querying violation trend:', err);
    }

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
      summary: `Presensi siswa berada pada angka ${persentaseSiswa}%. Terdapat ${siswaTerlambat} siswa terlambat gerbang, ${siswaIzinKeluar} izin keluar, dan ${pelanggaranMingguIni} catatan pelanggaran (7 hari terakhir).`,
      stats: [
        { label: 'Siswa Hadir', value: siswaHadir },
        { label: 'Sakit / Izin', value: siswaSakit + siswaIzin },
        { label: 'Alpa / Tanpa Ket.', value: siswaAlpa },
        { label: 'Terlambat Gerbang', value: siswaTerlambat },
        { label: 'Pelanggaran (7 Hari)', value: pelanggaranMingguIni },
        {
          label: 'Tren Pelanggaran',
          value:
            pelanggaranDeltaPct === null
              ? 'Data Awal'
              : pelanggaranDeltaPct <= 0
              ? `Turun ${Math.abs(pelanggaranDeltaPct)}%`
              : `Naik +${pelanggaranDeltaPct}%`,
        },
      ],
      progressBars: [
        {
          label: 'Persentase Kehadiran Siswa di KBM',
          value: persentaseSiswa,
          detail: `${siswaHadir} / ${totalSiswaAktif} Siswa Hadir`,
          color: persentaseSiswa >= 95 ? 'emerald' : persentaseSiswa >= 85 ? 'amber' : 'rose',
        },
        {
          label: 'Indeks Penurunan Pelanggaran (7 Hari vs Sebelumnya)',
          value: pelanggaranDeltaPct === null ? 100 : Math.max(0, Math.min(100, 100 - Math.max(0, pelanggaranDeltaPct))),
          detail: `${pelanggaranMingguIni} kasus minggu ini vs ${pelanggaranMingguLalu} minggu lalu`,
          color: pelanggaranDeltaPct !== null && pelanggaranDeltaPct <= 0 ? 'emerald' : 'amber',
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
      summary: `Sebanyak ${guruHadir} guru aktif mengajar (${persentaseGuru}%). Total sesi KBM terjadwal ${totalSesiKbm} sesi dengan kepatuhan jurnal ${persentaseJurnal}%.`,
      stats: [
        { label: 'Guru Hadir', value: guruHadir },
        { label: 'Guru Izin / Sakit', value: guruTidakHadir },
        { label: 'Total Sesi KBM', value: totalSesiKbm },
        { label: 'KBM Terlaksana', value: sesiKbmTerlaksana },
        { label: 'Guru Inval / Pengganti', value: guruInvalCount },
      ],
      progressBars: [
        {
          label: 'Persentase Kehadiran Guru di KBM',
          value: persentaseGuru,
          detail: `${guruHadir} / ${totalGuru} Guru Hadir`,
          color: persentaseGuru >= 95 ? 'emerald' : persentaseGuru >= 85 ? 'amber' : 'rose',
        },
        {
          label: 'Kepatuhan Pengisian Jurnal KBM',
          value: persentaseJurnal,
          detail: `${sesiKbmTerlaksana} / ${totalSesiKbm} Sesi Terlaksana`,
          color: persentaseJurnal >= 90 ? 'blue' : 'amber',
        },
      ],
      items: kurikulumItems.length > 0 ? kurikulumItems : undefined,
    });

    // SEKSI 3b: EVENT CBT & PENGUMPULAN SOAL
    if (activeCbtEvents.length > 0 || cbtTotalBank > 0) {
      sections.push({
        id: 'cbt_kurikulum',
        title: 'Event CBT & Progres Pengumpulan Soal',
        category: 'Kurikulum • CBT',
        badge: activeCbtEvents.length > 0 ? `${activeCbtEvents.length} Event Aktif` : `${cbtTotalBank} Bank Soal`,
        summary: activeCbtEvents.length > 0
          ? `Event CBT aktif: ${activeCbtEvents.map(e => e.nama_event).join(', ')}. Kesiapan bank soal mencapai ${cbtProgressPct}% (${cbtSiapBank}/${cbtTotalBank} bank siap, ${cbtTotalSoal} butir soal).`
          : `Terdapat ${cbtTotalBank} bank soal terdaftar dengan ${cbtTotalSoal} butir soal terkumpul.`,
        stats: [
          { label: 'Event CBT Aktif', value: activeCbtEvents.length },
          { label: 'Bank Soal Siap', value: `${cbtSiapBank} / ${cbtTotalBank}` },
          { label: 'Total Butir Soal', value: cbtTotalSoal },
        ],
        progressBars: [
          {
            label: 'Progres Pengumpulan Soal CBT',
            value: cbtProgressPct,
            detail: `${cbtSiapBank} dari ${cbtTotalBank} Bank Soal terisi (${cbtTotalSoal} soal)`,
            color: cbtProgressPct >= 90 ? 'emerald' : cbtProgressPct >= 60 ? 'indigo' : 'amber',
          },
        ],
      });
    }

    // SEKSI 3c: FASE PENILAIAN KBM & KESIAPAN RAPOR
    sections.push({
      id: 'penilaian_rapor',
      title: 'Fase Penilaian KBM & Kesiapan Rapor',
      category: 'Penilaian & Rapor',
      badge: `Rapor ${nilaiSumatifPct}%`,
      summary: `Kesiapan biodata siswa aktif mencapai ${biodataSiapPct}% (${biodataLengkapCount}/${totalSiswaAktif}) dan keterisian nilai sumatif/rapor${activeSemesterLabel ? ` ${activeSemesterLabel}` : ''} sebesar ${nilaiSumatifPct}%.`,
      stats: [
        { label: 'Biodata Siswa Siap', value: `${biodataSiapPct}%` },
        { label: 'Nilai Sumatif Terisi', value: `${nilaiSumatifPct}%` },
        { label: 'Entri Nilai Masuk', value: `${nilaiSumatifTerisiCount} / ${nilaiSumatifTargetCount}` },
      ],
      progressBars: [
        {
          label: 'Kesiapan Keterisian Biodata Siswa',
          value: biodataSiapPct,
          detail: `${biodataLengkapCount} / ${totalSiswaAktif} Siswa Lengkap`,
          color: biodataSiapPct >= 95 ? 'emerald' : biodataSiapPct >= 75 ? 'blue' : 'amber',
        },
        {
          label: 'Keterisian Nilai Sumatif & Rapor',
          value: nilaiSumatifPct,
          detail: `${nilaiSumatifTerisiCount} / ${nilaiSumatifTargetCount} Data Nilai Terisi`,
          color: nilaiSumatifPct >= 90 ? 'emerald' : nilaiSumatifPct >= 50 ? 'indigo' : 'amber',
        },
      ],
    });

    // SEKSI 4: BP/BK & PEMBINAAN
    sections.push({
      id: 'bpbk',
      title: 'Divisi BP/BK & Bimbingan Konseling',
      category: 'Bimbingan Siswa',
      badge: bpbkItems.length > 0 ? `${bpbkItems.length} Catatan Hari Ini` : 'Kondusif',
      summary: bpbkItems.length > 0
        ? `Tercatat ${bpbkItems.length} sesi layanan konseling & pembinaan karakter siswa hari ini.`
        : 'Situasi pembinaan terpantau kondusif, tidak ada laporan insiden darurat atau pembinaan khusus hari ini.',
      items: bpbkItems.map(b => ({
        title: b.title,
        subtitle: b.note,
        status: b.status,
        badge: b.status,
        badgeColor: 'text-amber-700 bg-amber-100 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
      })),
    });

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
        stats: [
          { label: 'Total Siswa PKL', value: totalPklAll || totalSiswaPklAktif },
          { label: 'Lapor Hadir Hari Ini', value: siswaPklHadir },
          { label: 'Kendala / Tidak Hadir', value: siswaPklKendala },
          { label: 'Input Nilai PKL', value: `${progresNilaiPklPct}%` },
          { label: 'Nilai Sidang PKL', value: `${progresSidangPklPct}%` },
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
      });
    }

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
    };
  }
}
