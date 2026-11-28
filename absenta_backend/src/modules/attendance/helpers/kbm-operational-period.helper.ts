import { prisma } from '@/utils/prisma';

export type KbmKelompokCategory = 'PRODUKTIF' | 'UMUM' | 'MUATAN_LOKAL';

export interface ActivePeriodeKbmRule {
  id: string;
  nama: string;
  tipe: 'PKL' | 'KBM_BLOK' | 'NON_KBM' | string;
  kelompok_aktif: string | null;
  tanggal_mulai: Date;
  tanggal_selesai: Date;
  target_semua_kelas: boolean;
  target_kelas_ids: string[];
}

export interface KbmScheduleCandidate {
  kelas_id?: string | null;
  mapel_id?: string | null;
  Kelas?: { id?: string; tingkat?: number | null } | null;
  Mapel?: { id?: string; nama_mapel?: string | null; kelompok_mapel?: string | null } | null;
}

export interface KbmSuspensionCheckResult {
  suspended: boolean;
  tipe?: string;
  periodeNama?: string;
  reason?: string;
}

/**
 * Klasifikasi kanonikal kelompok mata pelajaran untuk KBM Sistem Blok SMK:
 * - PRODUKTIF: Kejuruan / Produktif / Konsentrasi Keahlian / Dasar Program Keahlian / PKK / Pilihan (B, C, C1, C2, C3)
 * - MUATAN_LOKAL: Muatan Lokal / Bahasa Daerah
 * - UMUM: Mata Pelajaran Umum / Normatif & Adaptif (A)
 */
export function classifyMapelKelompok(
  rawKelompok?: string | null,
  namaMapel?: string | null
): KbmKelompokCategory {
  const g = String(rawKelompok || '').trim().toLowerCase();
  const n = String(namaMapel || '').trim().toLowerCase();

  if (
    g === 'b' ||
    g === 'c' ||
    g === 'c1' ||
    g === 'c2' ||
    g === 'c3' ||
    g.includes('kejuruan') ||
    g.includes('produktif') ||
    g.includes('konsentrasi') ||
    g.includes('pilihan') ||
    g.includes('vokasi')
  ) {
    return 'PRODUKTIF';
  }

  if (g.includes('mulok') || g.includes('muatan lokal') || g.includes('muatan_lokal')) {
    return 'MUATAN_LOKAL';
  }

  if (
    g === 'a' ||
    g.includes('umum') ||
    g.includes('normatif') ||
    g.includes('adaptif')
  ) {
    // Namun cek jika default DB 'UMUM' ternyata nama mapelnya jelas kejuruan/produktif
    if (
      g === 'umum' &&
      (n.includes('konsentrasi keahlian') ||
        n.includes('dasar-dasar') ||
        n.includes('dasar program keahlian') ||
        n.includes('projek kreatif') ||
        n.includes('produk kreatif') ||
        n.includes('kewirausahaan') ||
        n.startsWith('kk ') ||
        n.startsWith('pkk ') ||
        n === 'pkk')
    ) {
      return 'PRODUKTIF';
    }
    return 'UMUM';
  }

  // Fallback dari nama mapel jika kelompok kosong
  if (
    n.includes('konsentrasi') ||
    n.includes('dasar-dasar') ||
    n.includes('kejuruan') ||
    n.includes('produktif') ||
    n.includes('kewirausahaan') ||
    n.startsWith('kk ') ||
    n === 'pkk'
  ) {
    return 'PRODUKTIF';
  }

  if (n.includes('bahasa sunda') || n.includes('bahasa jawa') || n.includes('bahasa daerah') || n.includes('muatan lokal')) {
    return 'MUATAN_LOKAL';
  }

  return 'UMUM';
}

export interface KbmOperationalFilterContext {
  hasActiveRules: boolean;
  rules: ActivePeriodeKbmRule[];
  checkSchedule: (item: KbmScheduleCandidate) => KbmSuspensionCheckResult;
  filterActiveSchedules: <T extends KbmScheduleCandidate>(items: T[]) => T[];
}

const NOOP_CONTEXT: KbmOperationalFilterContext = {
  hasActiveRules: false,
  rules: [],
  checkSchedule: () => ({ suspended: false }),
  filterActiveSchedules: <T>(items: T[]) => items,
};

/**
 * Single Source of Truth (SSOT) penyaring jadwal KBM berdasarkan Periode Operasional KBM aktif
 * pada tanggal tertentu (`YYYY-MM-DD`).
 *
 * Urutan Prioritas (sesuai standar SMK):
 * 1. `PKL` — prioritas tertinggi: menangguhkan seluruh KBM pada rombel target selama periode PKL.
 * 2. `NON_KBM` — menangguhkan seluruh KBM reguler pada rombel target (mis. P5 / Ujian / UKK).
 * 3. `KBM_BLOK` — hanya mengaktifkan kelompok mapel yang sedang mendapat giliran blok (`PRODUKTIF` / `UMUM`),
 *    dan menangguhkan kelompok mapel di luar blok aktif pada rombel target.
 */
export async function resolveKbmOperationalFilter(
  tenantId: string,
  targetDateStr: string
): Promise<KbmOperationalFilterContext> {
  if (!tenantId || !targetDateStr) return NOOP_CONTEXT;

  const cleanDate = targetDateStr.slice(0, 10);
  const dateUtc = new Date(`${cleanDate}T00:00:00.000Z`);
  if (isNaN(dateUtc.getTime())) return NOOP_CONTEXT;

  let rawRules: any[] = [];
  try {
    rawRules = await (prisma as any).periodeOperasionalKbm.findMany({
      where: {
        tenant_id: tenantId,
        aktif: true,
        tanggal_mulai: { lte: dateUtc },
        tanggal_selesai: { gte: dateUtc },
      },
      orderBy: { created_at: 'desc' },
    });
  } catch {
    return NOOP_CONTEXT;
  }

  if (!rawRules || rawRules.length === 0) {
    return NOOP_CONTEXT;
  }

  const rules: ActivePeriodeKbmRule[] = rawRules.map((r: any) => ({
    id: r.id,
    nama: r.nama,
    tipe: String(r.tipe || '').toUpperCase(),
    kelompok_aktif: r.kelompok_aktif ? String(r.kelompok_aktif).toUpperCase() : null,
    tanggal_mulai: r.tanggal_mulai,
    tanggal_selesai: r.tanggal_selesai,
    target_semua_kelas: Boolean(r.target_semua_kelas),
    target_kelas_ids: Array.isArray(r.target_kelas_ids) ? r.target_kelas_ids : [],
  }));

  const hasBlokRule = rules.some((r) => r.tipe === 'KBM_BLOK');

  // Preload metadata Mapel & StrukturKurikulum hanya jika ada rule KBM_BLOK aktif hari ini
  const mapelMetaMap = new Map<string, { nama_mapel: string; kelompok_mapel: string | null }>();
  const strukturKelompokMap = new Map<string, string>(); // key: `${mapelId}_${tingkat}` atau `${mapelId}`
  const kelasTingkatMap = new Map<string, number>();

  if (hasBlokRule) {
    const [mapels, strukturs, kelasList] = await Promise.all([
      prisma.mapel.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, nama_mapel: true, kelompok_mapel: true },
      }),
      prisma.strukturKurikulum.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { mapel_id: true, tingkat: true, kelompok: true },
      }),
      prisma.kelas.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, tingkat: true },
      }),
    ]);

    for (const m of mapels) {
      mapelMetaMap.set(m.id, { nama_mapel: m.nama_mapel, kelompok_mapel: m.kelompok_mapel });
    }
    for (const k of kelasList) {
      if (k.tingkat !== null && k.tingkat !== undefined) {
        kelasTingkatMap.set(k.id, Number(k.tingkat));
      }
    }
    for (const st of strukturs) {
      if (st.kelompok) {
        strukturKelompokMap.set(`${st.mapel_id}_${st.tingkat}`, st.kelompok);
        if (!strukturKelompokMap.has(st.mapel_id)) {
          strukturKelompokMap.set(st.mapel_id, st.kelompok);
        }
      }
    }
  }

  const ruleMatchesKelas = (rule: ActivePeriodeKbmRule, kelasId?: string | null): boolean => {
    if (rule.target_semua_kelas) return true;
    if (!kelasId) return false;
    return rule.target_kelas_ids.includes(kelasId);
  };

  // Pisahkan menurut urutan prioritas: 1. PKL, 2. NON_KBM, 3. KBM_BLOK
  const pklRules = rules.filter((r) => r.tipe === 'PKL');
  const nonKbmRules = rules.filter((r) => r.tipe === 'NON_KBM');
  const blokRules = rules.filter((r) => r.tipe === 'KBM_BLOK');

  const checkSchedule = (item: KbmScheduleCandidate): KbmSuspensionCheckResult => {
    const kelasId = item.kelas_id || item.Kelas?.id || null;

    // Prioritas 1: PKL
    const matchedPkl = pklRules.find((r) => ruleMatchesKelas(r, kelasId));
    if (matchedPkl) {
      return {
        suspended: true,
        tipe: 'PKL',
        periodeNama: matchedPkl.nama,
        reason: `Kelas sedang periode PKL (${matchedPkl.nama})`,
      };
    }

    // Prioritas 2: NON_KBM (Ujian / P5 / UKK)
    const matchedNonKbm = nonKbmRules.find((r) => ruleMatchesKelas(r, kelasId));
    if (matchedNonKbm) {
      return {
        suspended: true,
        tipe: 'NON_KBM',
        periodeNama: matchedNonKbm.nama,
        reason: `Kelas sedang agenda non-KBM (${matchedNonKbm.nama})`,
      };
    }

    // Prioritas 3: KBM_BLOK (Kelompok Mapel)
    const matchedBlok = blokRules.find((r) => ruleMatchesKelas(r, kelasId));
    if (matchedBlok && matchedBlok.kelompok_aktif) {
      const mapelId = item.mapel_id || item.Mapel?.id || null;
      if (!mapelId) return { suspended: false };

      const tingkat =
        item.Kelas?.tingkat ??
        (kelasId ? kelasTingkatMap.get(kelasId) : undefined);

      const meta = mapelMetaMap.get(mapelId);
      const rawKelompok =
        (tingkat !== undefined ? strukturKelompokMap.get(`${mapelId}_${tingkat}`) : undefined) ||
        strukturKelompokMap.get(mapelId) ||
        item.Mapel?.kelompok_mapel ||
        meta?.kelompok_mapel ||
        null;
      const namaMapel = item.Mapel?.nama_mapel || meta?.nama_mapel || null;

      const mapelCategory = classifyMapelKelompok(rawKelompok, namaMapel);
      const activeGroup = matchedBlok.kelompok_aktif;

      let isAllowedInBlock = true;
      if (activeGroup === 'PRODUKTIF' || activeGroup === 'KEJURUAN') {
        isAllowedInBlock = mapelCategory === 'PRODUKTIF';
      } else if (activeGroup === 'UMUM') {
        // Saat Blok Umum berjalan, mapel Umum & Muatan Lokal tetap jalan; Produktif ditangguhkan
        isAllowedInBlock = mapelCategory === 'UMUM' || mapelCategory === 'MUATAN_LOKAL';
      } else if (activeGroup === 'MUATAN_LOKAL') {
        isAllowedInBlock = mapelCategory === 'MUATAN_LOKAL';
      }

      if (!isAllowedInBlock) {
        return {
          suspended: true,
          tipe: 'KBM_BLOK',
          periodeNama: matchedBlok.nama,
          reason: `Sedang giliran ${matchedBlok.nama} (kelompok ${activeGroup})`,
        };
      }
    }

    return { suspended: false };
  };

  return {
    hasActiveRules: true,
    rules,
    checkSchedule,
    filterActiveSchedules: <T extends KbmScheduleCandidate>(items: T[]): T[] =>
      items.filter((it) => !checkSchedule(it).suspended),
  };
}
