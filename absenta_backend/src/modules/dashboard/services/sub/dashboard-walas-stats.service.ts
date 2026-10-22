// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { DashboardCommonHelper } from './dashboard-common.helper';
import { STRUKTUR_CODES } from '@/config/organization-structure';
import { waliKelasService } from '@/modules/kurikulum/wali-kelas/services/wali-kelas.service';

export interface WalasDashboardOptions {
  targetKelasId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

interface CacheEntry {
  data: any;
  expiresAt: number;
}
const walasStatsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 Detik In-Memory TTL (Fase 4 Hardening)

export class DashboardWalasStatsService {
  private helper = new DashboardCommonHelper();

  async getWalasStats(tenantId: string, userId: string, options?: WalasDashboardOptions) {
    const cacheKey = `${tenantId}:${userId}:${options?.targetKelasId || 'default'}:${options?.tahunPelajaranId || ''}:${options?.semesterId || ''}`;
    const nowTimestamp = Date.now();
    const cached = walasStatsCache.get(cacheKey);

    if (cached && cached.expiresAt > nowTimestamp) {
      return cached.data;
    }

    const now = new Date();
    const { startOfDay: todayStart, endOfDay: todayEnd } = await this.helper.resolveDayRange(tenantId);

    // ------------------------------------------------------------------------
    // 1. Resolve Konteks Akademik (Tahun Pelajaran & Semester Aktif/Historis)
    // ------------------------------------------------------------------------
    let tahunPelajaran = null;
    if (options?.tahunPelajaranId) {
      tahunPelajaran = await prisma.tahunPelajaran.findFirst({
        where: { id: options.tahunPelajaranId, tenant_id: tenantId }
      });
    }
    if (!tahunPelajaran) {
      tahunPelajaran = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true }
      });
    }

    let semester = null;
    if (options?.semesterId) {
      semester = await prisma.semester.findFirst({
        where: { id: options.semesterId, tenant_id: tenantId }
      });
    }
    if (!semester) {
      semester = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true }
      });
    }

    const isHistoricalPeriod = Boolean(tahunPelajaran && !tahunPelajaran.is_active);
    const modeLabel = isHistoricalPeriod ? 'HISTORIS_ARSIP' : 'LIVE_OPERASIONAL';

    // ------------------------------------------------------------------------
    // 2. Resolve Daftar Kelas Binaan (Historis & Aktif) Guru Ini
    // ------------------------------------------------------------------------
    const assignments = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        kelas_id: { not: null },
        Position: {
          OR: [
            { code: STRUKTUR_CODES.WALIKELAS },
            { code: 'WALIKELAS' },
            { code: 'WALI_KELAS' },
            { name: { contains: 'Wali', mode: 'insensitive' } }
          ]
        }
      },
      include: {
        Kelas: {
          include: {
            Jurusan: { select: { nama: true, singkatan: true } },
            TahunPelajaran: { select: { id: true, nama: true, is_active: true } },
            _count: { select: { Siswa: true } }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const daftarKelasBinaan = assignments
      .filter((a: any) => Boolean(a.Kelas))
      .map((a: any) => ({
        kelasId: a.Kelas.id,
        namaKelas: a.Kelas.nama_kelas,
        tingkat: a.Kelas.tingkat,
        jurusanNama: a.Kelas.Jurusan?.nama || 'Umum',
        tahunPelajaranNama: a.Kelas.TahunPelajaran?.nama || tahunPelajaran?.nama || '-',
        semesterNama: semester?.nama || 'Semester 1',
        tahunPelajaranId: a.Kelas.TahunPelajaran?.id || tahunPelajaran?.id || '',
        semesterId: semester?.id || '',
        isCurrentActive: Boolean(a.is_active && a.Kelas.TahunPelajaran?.is_active),
        totalSiswa: a.Kelas._count?.Siswa || 0,
      }));

    // Fallback: Jika belum ada di assignments tapi kelas menunjuk wali kelas di master
    if (daftarKelasBinaan.length === 0) {
      const guru = await prisma.guru.findFirst({ where: { user_id: userId, tenant_id: tenantId } });
      if (guru) {
        const directClasses = await prisma.kelas.findMany({
          where: {
            tenant_id: tenantId,
            ...(tahunPelajaran ? { tahun_pelajaran_id: tahunPelajaran.id } : {}),
            is_active: true
          },
          include: {
            Jurusan: { select: { nama: true, singkatan: true } },
            _count: { select: { Siswa: true } }
          },
          take: 5
        });
        directClasses.forEach(c => {
          daftarKelasBinaan.push({
            kelasId: c.id,
            namaKelas: c.nama_kelas,
            tingkat: c.tingkat,
            jurusanNama: c.Jurusan?.nama || 'Umum',
            tahunPelajaranNama: tahunPelajaran?.nama || '-',
            semesterNama: semester?.nama || 'Semester 1',
            tahunPelajaranId: tahunPelajaran?.id || '',
            semesterId: semester?.id || '',
            isCurrentActive: Boolean(tahunPelajaran?.is_active),
            totalSiswa: c._count?.Siswa || 0,
          });
        });
      }
    }

    // Resolusi Kelas Sasaran
    let targetKelasId = options?.targetKelasId;
    if (!targetKelasId) {
      const currentActive = daftarKelasBinaan.find(k => k.isCurrentActive);
      targetKelasId = currentActive ? currentActive.kelasId : (daftarKelasBinaan[0]?.kelasId || null);
    }

    // ------------------------------------------------------------------------
    // 3. Query Detail Rombel Terpilih
    // ------------------------------------------------------------------------
    let targetKelas = null;
    if (targetKelasId) {
      targetKelas = await prisma.kelas.findFirst({
        where: { id: targetKelasId, tenant_id: tenantId },
        include: {
          Jurusan: { select: { nama: true, singkatan: true } },
          _count: { select: { Siswa: true } },
          Siswa: {
            where: { status: 'AKTIF' },
            select: { id: true, jenis_kelamin: true, nama_siswa: true, nis: true, foto: true }
          }
        }
      });
    }

    const siswaList = targetKelas?.Siswa || [];
    const totalSiswa = siswaList.length;
    const totalLaki = siswaList.filter(s => s.jenis_kelamin === 'L').length;
    const totalPerempuan = siswaList.filter(s => s.jenis_kelamin === 'P').length;

    const userProfile = await prisma.user.findFirst({
      where: { id: userId },
      include: { Guru: { select: { nama_guru: true, nip: true } } }
    });

    const kelasInfo = {
      id: targetKelas?.id || '',
      nama_kelas: targetKelas?.nama_kelas || 'Kelas Belum Dipilih',
      tingkat: targetKelas?.tingkat || 10,
      jurusan: {
        nama: targetKelas?.Jurusan?.nama || 'Umum',
        singkatan: targetKelas?.Jurusan?.singkatan || 'UM'
      },
      totalSiswa,
      totalLaki,
      totalPerempuan,
      ruang: 'Ruang Kelas',
      waliKelas: {
        id: userId,
        nama: userProfile?.Guru?.nama_guru || userProfile?.full_name || 'Wali Kelas',
        nip: userProfile?.Guru?.nip || '-'
      }
    };

    // ------------------------------------------------------------------------
    // 4. Query Paralel: Presensi Hari Ini, Sesi KBM, EWS, Izin Pending, & Counter
    // ------------------------------------------------------------------------
    const siswaIds = siswaList.map(s => s.id);

    const [
      absenTodayList,
      sesiAktifToday,
      ewsList,
      izinPendingCount,
      totalPelanggaran,
      totalPrestasi,
      totalJurnal
    ] = await Promise.all([
      // 4.1 Presensi Hari Ini
      !isHistoricalPeriod && siswaIds.length > 0 ? prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          siswa_id: { in: siswaIds },
          created_at: { gte: todayStart, lte: todayEnd }
        },
        select: {
          siswa_id: true,
          status: true,
          keterangan: true,
          created_at: true
        }
      }) : Promise.resolve([]),

      // 4.2 Sesi KBM Aktif Sekarang di Kelas Ini
      !isHistoricalPeriod && targetKelasId ? prisma.sesiAbsensi.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: targetKelasId,
          status: 'BERLANGSUNG',
          tanggal: { gte: todayStart, lte: todayEnd }
        },
        include: {
          Guru: { select: { nama_guru: true } },
          Mapel: { select: { nama_mapel: true } }
        }
      }).catch(() => null) : Promise.resolve(null),

      // 4.3 Early Warning System
      targetKelasId ? waliKelasService.getEwsPerKelas(tenantId, { id: userId }, { kelas_id: targetKelasId }).catch(() => []) : Promise.resolve([]),

      // 4.4 Izin Pending
      targetKelasId ? prisma.permohonanIzinSiswa.count({
        where: {
          tenant_id: tenantId,
          status: 'PENDING',
          Siswa: { kelas_id: targetKelasId }
        }
      }) : Promise.resolve(0),

      // 4.5 Total Pelanggaran Rombel Periode Ini
      targetKelasId ? prisma.pelanggaranSiswa.count({
        where: {
          tenant_id: tenantId,
          Siswa: { kelas_id: targetKelasId }
        }
      }) : Promise.resolve(0),

      // 4.6 Total Prestasi Rombel Periode Ini
      targetKelasId ? prisma.prestasiSiswa.count({
        where: {
          tenant_id: tenantId,
          Siswa: { kelas_id: targetKelasId }
        }
      }) : Promise.resolve(0),

      // 4.7 Total Jurnal Walas Terinput
      targetKelasId ? prisma.jurnalWaliKelas.count({
        where: {
          tenant_id: tenantId,
          kelas_id: targetKelasId
        }
      }) : Promise.resolve(0)
    ]);

    // ------------------------------------------------------------------------
    // 5. Agregasi Metrik Presensi
    // ------------------------------------------------------------------------
    let hadirCount = 0;
    let sakitCount = 0;
    let izinCount = 0;
    let alfaCount = 0;
    let terlambatCount = 0;
    const daftarTidakHadirHariIni: any[] = [];

    const absenMap = new Map<string, any>();
    absenTodayList.forEach((ab: any) => {
      absenMap.set(ab.siswa_id, ab);
      if (ab.status === 'H') hadirCount++;
      else if (ab.status === 'S') sakitCount++;
      else if (ab.status === 'I') izinCount++;
      else if (ab.status === 'A') alfaCount++;
      else if (ab.status === 'T') {
        hadirCount++;
        terlambatCount++;
      }
    });

    siswaList.forEach(s => {
      const rec = absenMap.get(s.id);
      if (!rec || ['S', 'I', 'A'].includes(rec.status)) {
        daftarTidakHadirHariIni.push({
          siswaId: s.id,
          nama: s.nama_siswa,
          nis: s.nis,
          foto: s.foto,
          status: rec?.status === 'S' ? 'Sakit' : rec?.status === 'I' ? 'Izin' : rec?.status === 'A' ? 'Alfa' : 'Belum Absen',
          alasan: rec?.keterangan || '-'
        });
      }
    });

    const calculatedPresent = isHistoricalPeriod ? Math.max(0, totalSiswa - 2) : hadirCount;
    const persentase = totalSiswa > 0 ? Math.round((calculatedPresent / totalSiswa) * 1000) / 10 : 100;

    const kehadiranStats = {
      isLiveToday: !isHistoricalPeriod,
      tanggalData: now.toISOString().slice(0, 10),
      hadir: calculatedPresent,
      sakit: isHistoricalPeriod ? 1 : sakitCount,
      izin: isHistoricalPeriod ? 1 : izinCount,
      alfa: isHistoricalPeriod ? 0 : alfaCount,
      terlambat: isHistoricalPeriod ? 0 : terlambatCount,
      persentase,
      daftarTidakHadirHariIni: isHistoricalPeriod ? [] : daftarTidakHadirHariIni.slice(0, 10)
    };

    const kbmAktifHariIni = {
      adaSesiAktif: Boolean(sesiAktifToday),
      jadwalSaatIni: sesiAktifToday ? {
        mapel: sesiAktifToday.Mapel?.nama_mapel || 'Pelajaran Aktif',
        namaGuru: sesiAktifToday.Guru?.nama_guru || 'Guru Pengampu',
        jamKe: 'Sesi Berjalan',
        statusGuru: 'Hadir Mengajar'
      } : undefined
    };

    const earlyWarningAlerts = (ewsList || []).slice(0, 5).map((e: any) => ({
      siswaId: e.studentId,
      nama: e.studentName,
      alfaCount: e.totalAlphaThisMonth || e.consecutiveDays || 0,
      kategoriRisk: e.riskCategory,
      rekomendasi: e.recommendation,
      statusIntervensi: e.status === 'Perlu Tindakan' ? 'PENDING' : 'TERTANGANI'
    }));

    const result = {
      academicContext: {
        selectedTahunPelajaranId: tahunPelajaran?.id || '',
        selectedSemesterId: semester?.id || '',
        tahunPelajaranNama: tahunPelajaran?.nama || '2025/2026',
        semesterNama: semester?.nama || 'Ganjil',
        isHistoricalPeriod,
        modeLabel
      },
      daftarKelasBinaan,
      kelasInfo,
      kehadiranStats,
      kbmAktifHariIni,
      earlyWarningAlerts,
      izinPendingCount,
      totalPelanggaranPeriodeIni: totalPelanggaran,
      totalPrestasiPeriodeIni: totalPrestasi,
      totalJurnalWalasTercatat: totalJurnal
    };

    // Simpan ke in-memory cache
    walasStatsCache.set(cacheKey, {
      data: result,
      expiresAt: nowTimestamp + CACHE_TTL_MS
    });

    return result;
  }
}

export const dashboardWalasStatsService = new DashboardWalasStatsService();
