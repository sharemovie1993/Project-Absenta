/**
 * kepsek-briefing.collector.ts
 * Implementasi pengumpul data laporan harian eksekutif untuk Kepala Sekolah.
 *
 * Mengagregasi data makro seluruh divisi:
 * 1. Kesiswaan (Kehadiran siswa, Gerbang keterlambatan, Izin keluar piket)
 * 2. Kurikulum & Guru (Kehadiran guru, Sesi KBM berjalan, Jurnal KBM terisi, Inval)
 * 3. Wali Kelas & Rombel (Kelas dengan perhatian khusus / alpa tertinggi)
 * 4. BP/BK (Konseling & atensi siswa hari ini)
 * 5. Hubin & PKL (Kehadiran siswa magang di DUDI)
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
        Sekolah: true,
      },
    });

    const sekolahNama = tenant?.Sekolah?.nama_sekolah || tenant?.name || 'Sekolah';
    const targetName = tenant?.Sekolah?.kepala_sekolah || 'Bapak/Ibu Kepala Sekolah';

    // ── 2. Kesiswaan: Kehadiran Siswa ──────────────────────────────────────────
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

    // ── 4. Wali Kelas: Rombel dengan Alpa Terbanyak ───────────────────────────
    let topRombelAlpa: Array<{ kelasNama: string; alpaCount: number }> = [];
    try {
      const alpaByKelas = await prisma.absenSiswa.groupBy({
        by: ['kelas_nama_snapshot'],
        where: {
          tenant_id: tenantId,
          status: 'ALPA',
          created_at: { gte: startUTC, lte: endUTC },
        },
        _count: { id: true },
      });

      topRombelAlpa = alpaByKelas
        .filter(k => k.kelas_nama_snapshot && k._count.id > 0)
        .map(k => ({
          kelasNama: k.kelas_nama_snapshot as string,
          alpaCount: k._count.id,
        }))
        .sort((a, b) => b.alpaCount - a.alpaCount)
        .slice(0, 4);
    } catch {}

    // ── 5. BP/BK & Pembinaan ──────────────────────────────────────────────────
    let bpbkItems: Array<{ title: string; note: string; status: string }> = [];
    try {
      const konselingList = await prisma.konselingSiswa.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startUTC, lte: endUTC },
        },
        select: {
          id: true,
          jenis_konseling: true,
          ringkasan_masalah: true,
          status: true,
        },
        take: 3,
      });

      bpbkItems = konselingList.map(k => ({
        title: k.jenis_konseling || 'Konseling Siswa',
        note: k.ringkasan_masalah || 'Tindak lanjut pembinaan',
        status: k.status || 'PROSES',
      }));
    } catch {}

    // ── 6. Hubin & PKL Industri ───────────────────────────────────────────────
    let totalSiswaPklAktif = 0;
    let siswaPklHadir = 0;
    let siswaPklKendala = 0;

    try {
      totalSiswaPklAktif = await prisma.siswaPkl.count({
        where: { tenant_id: tenantId, status: 'AKTIF' },
      });

      const pklStats = await prisma.absensiPkl.groupBy({
        by: ['status'],
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startUTC, lte: endUTC },
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

    // ── 7. Komposisi Metrics Utama (Bento Grid Header) ────────────────────────
    const metrics: BriefingMetricItem[] = [
      {
        id: 'presensi_siswa',
        label: 'Kehadiran Siswa',
        value: `${persentaseSiswa}%`,
        sub: `${siswaHadir.toLocaleString('id-ID')} dari ${totalSiswaAktif.toLocaleString('id-ID')} Siswa`,
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

    // ── 8. Highlights (Poin-Poin Kritis 30 Detik) ─────────────────────────────
    const highlights: string[] = [
      `Tingkat kehadiran siswa mencapai ${persentaseSiswa}% (${siswaHadir} Hadir, ${siswaSakit} Sakit, ${siswaIzin} Izin, ${siswaAlpa} Alpa).`,
      `Sebanyak ${guruHadir} dari ${totalGuru} guru hadir aktif melaksanakan tugas KBM (${persentaseGuru}%).`,
    ];

    if (totalSesiKbm > 0) {
      highlights.push(`Sebanyak ${sesiKbmTerlaksana} dari ${totalSesiKbm} sesi KBM telah tuntas tercatat di sistem.`);
    }

    if (siswaTerlambat > 0) {
      highlights.push(`Tercatat ${siswaTerlambat} siswa tiba terlambat di gerbang sekolah dan telah ditertibkan.`);
    } else {
      highlights.push('Ketertiban gerbang optimal: 0 siswa terlambat hari ini.');
    }

    if (topRombelAlpa.length > 0 && topRombelAlpa[0].alpaCount > 1) {
      highlights.push(`Perhatian Rombel: ${topRombelAlpa[0].kelasNama} mencatat ${topRombelAlpa[0].alpaCount} siswa alpa.`);
    }

    // ── 9. Sections per Divisi (Detail Lengkap) ──────────────────────────────
    const sections: BriefingSection[] = [
      // DIVISI 1: KESISWAAN
      {
        id: 'kesiswaan',
        title: 'Divisi Kesiswaan & Ketertiban',
        category: 'Kesiswaan',
        badge: persentaseSiswa >= 95 ? 'Optimal' : 'Perlu Perhatian',
        summary: `Presensi siswa berada pada angka ${persentaseSiswa}%. Terdapat ${siswaTerlambat} siswa terlambat di gerbang dan ${siswaIzinKeluar} siswa izin keluar via piket.`,
        stats: [
          { label: 'Siswa Hadir', value: siswaHadir },
          { label: 'Sakit', value: siswaSakit },
          { label: 'Izin', value: siswaIzin },
          { label: 'Alpa / Tanpa Keterangan', value: siswaAlpa },
          { label: 'Terlambat di Gerbang', value: siswaTerlambat },
          { label: 'Izin Keluar Kampus', value: siswaIzinKeluar },
        ],
        items: topRombelAlpa.map(r => ({
          title: `Rombel ${r.kelasNama}`,
          subtitle: 'Perlu tindak lanjut pembinaan oleh Wali Kelas',
          badge: `${r.alpaCount} Siswa Alpa`,
          badgeColor: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50',
        })),
      },

      // DIVISI 2: KURIKULUM & KBM
      {
        id: 'kurikulum',
        title: 'Divisi Kurikulum & KBM Guru',
        category: 'Kurikulum',
        badge: `${persentaseGuru}% Guru Hadir`,
        summary: `Sebanyak ${guruHadir} guru aktif mengajar. Total sesi KBM terjadwal sebanyak ${totalSesiKbm} sesi dengan ${guruInvalCount} sesi ditangani guru inval/pengganti.`,
        stats: [
          { label: 'Guru Hadir', value: guruHadir },
          { label: 'Guru Izin / Sakit', value: guruTidakHadir },
          { label: 'Total Sesi KBM', value: totalSesiKbm },
          { label: 'KBM Terlaksana', value: sesiKbmTerlaksana },
          { label: 'Guru Inval / Pengganti', value: guruInvalCount },
        ],
      },

      // DIVISI 3: BP/BK & PEMBINAAN
      {
        id: 'bpbk',
        title: 'Divisi BP/BK & Bimbingan Konseling',
        category: 'Bimbingan Siswa',
        badge: bpbkItems.length > 0 ? `${bpbkItems.length} Catatan Hari Ini` : 'Kondusif',
        summary: bpbkItems.length > 0
          ? `Tercatat ${bpbkItems.length} sesi layanan konseling & pembinaan karakter siswa hari ini.`
          : 'Situasi sekolah terpantau kondusif, tidak ada laporan insiden darurat atau pembinaan khusus hari ini.',
        items: bpbkItems.map(b => ({
          title: b.title,
          subtitle: b.note,
          status: b.status,
          badge: b.status,
          badgeColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
        })),
      },
    ];

    // DIVISI 4: HUBIN & PKL (Jika sekolah SMK / ada siswa PKL)
    if (totalSiswaPklAktif > 0) {
      sections.push({
        id: 'hubin_pkl',
        title: 'Divisi Hubungan Industri & PKL',
        category: 'Hubin & PKL',
        badge: `${totalSiswaPklAktif} Siswa PKL`,
        summary: `Terdapat ${totalSiswaPklAktif} siswa aktif magang di mitra industri DUDI. ${siswaPklHadir} siswa tercatat telah melakukan absensi harian.`,
        stats: [
          { label: 'Total Siswa di DUDI', value: totalSiswaPklAktif },
          { label: 'Lapor Hadir Hari Ini', value: siswaPklHadir },
          { label: 'Kendala / Tidak Hadir', value: siswaPklKendala },
        ],
      });
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    return {
      title: 'Laporan Eksekutif Harian Kepala Sekolah',
      role: 'KEPALA_SEKOLAH',
      roleLabel: 'Kepala Sekolah',
      tenantId,
      sekolahNama,
      targetName,
      tanggalStr,
      tanggalIso: dateStr,
      generatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      metrics,
      highlights,
      sections,
    };
  }
}
