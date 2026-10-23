import { prisma } from '../../../../utils/prisma';

export interface TuDashboardOptions {
  tahunPelajaranId?: string;
  semesterId?: string;
}

// In-Memory Cache dengan TTL 60 detik (Dual-Layer Caching Strategy)
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const tuStatsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

export class DashboardTuStatsService {
  async getTuStats(tenantId: string, _userId: string, options?: TuDashboardOptions) {
    const cacheKey = `${tenantId}:${options?.tahunPelajaranId || 'default'}:${options?.semesterId || 'default'}`;
    const nowTimestamp = Date.now();
    const cached = tuStatsCache.get(cacheKey);

    if (cached && cached.expiresAt > nowTimestamp) {
      return cached.data;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Konteks Akademik Aktif
    const [tpAktif, semesterAktif] = await Promise.all([
      prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, tahun: true },
      }),
      prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, nama_semester: true },
      }),
    ]);

    // 2. Query Agregasi Paralel
    const [
      totalSiswaAktif,
      totalSuratBulanIni,
      suratKeteranganBulanIni,
      mutasiKeluarTotal,
      mutasiMasukTotal,
      totalLulusan,
      bastIjazahDiserahkan,
      dknArsipCount,
      totalPtk,
      suratMasukTotal,
      suratMasukBaru,
      suratMasukDisposisi,
      suratKeluarTotal,
      suratKeluarDraft,
      recentSuratKeluar,
    ] = await Promise.all([
      // Total Siswa Aktif untuk Buku Induk
      prisma.siswa.count({
        where: { tenant_id: tenantId, status: 'AKTIF' },
      }),
      // Total Surat Keluar Bulan Ini
      prisma.suratKeluar.count({
        where: {
          tenant_id: tenantId,
          tanggal_surat: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      // Surat Keterangan Bulan Ini
      prisma.suratKeluar.count({
        where: {
          tenant_id: tenantId,
          kategori_surat: 'Keterangan',
          tanggal_surat: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      // Siswa Mutasi Keluar
      prisma.siswa.count({
        where: {
          tenant_id: tenantId,
          status: 'MUTASI',
        },
      }),
      // Siswa Mutasi Masuk
      prisma.suratKeluar.count({
        where: {
          tenant_id: tenantId,
          kategori_surat: 'MutasiMasuk',
        },
      }),
      // Total Kelulusan Siswa
      prisma.kelulusanSiswa.count({
        where: { tenant_id: tenantId },
      }),
      // BAST Ijazah yang sudah diserahkan
      prisma.suratKeluar.count({
        where: {
          tenant_id: tenantId,
          kategori_surat: 'BAST',
        },
      }),
      // Berkas DKN yang sudah diarsipkan
      prisma.suratKeluar.count({
        where: {
          tenant_id: tenantId,
          kategori_surat: 'DKN',
        },
      }),
      // Total PTK (Guru & Tendik)
      prisma.guru.count({
        where: { tenant_id: tenantId },
      }),
      // Surat Masuk: Total
      prisma.suratMasuk.count({
        where: { tenant_id: tenantId },
      }),
      // Surat Masuk: Baru
      prisma.suratMasuk.count({
        where: { tenant_id: tenantId, status: 'BARU' },
      }),
      // Surat Masuk: Disposisi
      prisma.suratMasuk.count({
        where: { tenant_id: tenantId, status: 'DISPOSISI' },
      }),
      // Surat Keluar: Total
      prisma.suratKeluar.count({
        where: { tenant_id: tenantId },
      }),
      // Surat Keluar: Draft / Menunggu TTD
      prisma.suratKeluar.count({
        where: {
          tenant_id: tenantId,
          status: { in: ['DRAFT', 'MENUNGGU_TTD'] },
        },
      }),
      // Recent Surat Keluar
      prisma.suratKeluar.findMany({
        where: { tenant_id: tenantId },
        take: 5,
        orderBy: { tanggal_surat: 'desc' },
        select: {
          id: true,
          nomor_surat: true,
          judul: true,
          kategori_surat: true,
          tujuan_surat: true,
          tanggal_surat: true,
          status: true,
        },
      }),
    ]);

    const sisaBrankasIjazah = Math.max(0, totalLulusan - bastIjazahDiserahkan);

    const result = {
      konteksAkademik: {
        tahunPelajaran: tpAktif?.tahun || '2025/2026',
        tahunPelajaranId: tpAktif?.id || null,
        semester: semesterAktif?.nama_semester || 'Semester Ganjil',
        semesterId: semesterAktif?.id || null,
      },
      bukuInduk: {
        totalSiswaAktif,
      },
      persuratan: {
        totalSuratBulanIni,
        suratKeteranganBulanIni,
      },
      mutasi: {
        keluar: mutasiKeluarTotal,
        masuk: mutasiMasukTotal,
        total: mutasiKeluarTotal + mutasiMasukTotal,
      },
      ijazah: {
        totalLulusan,
        sudahDiserahkan: bastIjazahDiserahkan,
        sisaBrankas: sisaBrankasIjazah,
        persentaseDiambil: totalLulusan > 0
          ? Math.round((bastIjazahDiserahkan / totalLulusan) * 100)
          : 0,
      },
      dkn: {
        totalArsip: dknArsipCount,
      },
      kepegawaian: {
        totalPtk,
      },
      suratMasuk: {
        total: suratMasukTotal,
        baru: suratMasukBaru,
        disposisi: suratMasukDisposisi,
      },
      suratKeluar: {
        total: suratKeluarTotal,
        draft: suratKeluarDraft,
      },
      recentActivities: recentSuratKeluar.map((item) => ({
        id: item.id,
        nomor_surat: item.nomor_surat,
        title: item.judul,
        kategori: item.kategori_surat,
        tujuan: item.tujuan_surat || '-',
        tanggal: item.tanggal_surat.toISOString(),
        status: item.status,
      })),
    };

    tuStatsCache.set(cacheKey, {
      data: result,
      expiresAt: nowTimestamp + CACHE_TTL_MS,
    });

    return result;
  }
}
