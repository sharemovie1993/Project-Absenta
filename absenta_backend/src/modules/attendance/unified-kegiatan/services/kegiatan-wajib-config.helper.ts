import { prisma } from '@/utils/prisma';

/** Posisi khusus siswa yang bukan unsur guru/pegawai */
export const NON_GURU_KEGIATAN_POSITION_CODES = ['PETUGAS_KELAS'];

/**
 * Default kode posisi jabatan organisasi pendamping kegiatan (non-Apel Pulang)
 * jika JadwalKegiatan belum pernah dikonfigurasi khusus (wajib_positions_configured = false).
 */
export const DEFAULT_ORG_KEGIATAN_POSITION_CODES = [
  'KETUA_PEMBINA_TARUNA',
  'PEMBINA_TARUNA',
  'KESISWAAN',
  'KAPROG',
  'BPBK',
  'WALIKELAS',
];

export const DHUHA_EXTRA_ORG_POSITION_CODES = [
  'KOORDINATOR_DHUHA',
  'PEMBINA_ROHIS',
];

export interface ResolvedJadwalKegiatanPolicy {
  wajibTapTerminalGuru: boolean;
  wajibGuruBeririsan: boolean;
  wajibPositionsConfigured: boolean;
  orgPositionIds: string[];
  orgPositionCodes: string[];
  isApelPulang: boolean;
  isDhuha: boolean;
}

export function isApelPulangActivity(nama?: string | null, jenisKegiatan?: string | null): boolean {
  const kegType = String(jenisKegiatan || '').toUpperCase();
  const kegName = String(nama || '');
  return kegType === 'APEL_SORE' || /pulang|apel\s*sore|apel_sore/i.test(kegName);
}

export function isDhuhaActivity(nama?: string | null, jenisKegiatan?: string | null): boolean {
  return /duha|dhuha|rohis/i.test(`${jenisKegiatan || ''} ${nama || ''}`);
}

export function resolveJadwalKegiatanPolicy(
  jadwal?: {
    nama?: string | null;
    jenis_kegiatan?: string | null;
    wajib_tap_terminal_guru?: boolean | null;
    wajib_guru_beririsan?: boolean | null;
    wajib_positions_configured?: boolean | null;
    WajibPositions?: Array<{
      position_id: string;
      Position?: { id?: string; code?: string | null; name?: string | null } | null;
    }>;
  } | null
): ResolvedJadwalKegiatanPolicy {
  const isApelPulang = isApelPulangActivity(jadwal?.nama, jadwal?.jenis_kegiatan);
  const isDhuha = isDhuhaActivity(jadwal?.nama, jadwal?.jenis_kegiatan);

  const wajibTapTerminalGuru = isApelPulang ? false : (jadwal?.wajib_tap_terminal_guru !== false);
  const wajibGuruBeririsan = isApelPulang ? false : (jadwal?.wajib_guru_beririsan !== false);
  const wajibPositionsConfigured = Boolean(jadwal?.wajib_positions_configured);

  let orgPositionIds: string[] = [];
  let orgPositionCodes: string[] = [];

  if (wajibPositionsConfigured) {
    const rows = Array.isArray(jadwal?.WajibPositions) ? jadwal!.WajibPositions : [];
    orgPositionIds = rows.map((r) => r.position_id).filter(Boolean);
    orgPositionCodes = Array.from(
      new Set(
        rows
          .map((r) => String(r.Position?.code || '').trim().toUpperCase())
          .filter(Boolean)
      )
    );
    if (orgPositionCodes.includes('KOORDINATOR_DHUHA') && !orgPositionCodes.includes('PEMBINA_ROHIS')) {
      orgPositionCodes.push('PEMBINA_ROHIS');
    }
  } else {
    orgPositionCodes = isDhuha
      ? [...DEFAULT_ORG_KEGIATAN_POSITION_CODES, ...DHUHA_EXTRA_ORG_POSITION_CODES]
      : [...DEFAULT_ORG_KEGIATAN_POSITION_CODES];
  }

  return {
    wajibTapTerminalGuru,
    wajibGuruBeririsan,
    wajibPositionsConfigured,
    orgPositionIds,
    orgPositionCodes,
    isApelPulang,
    isDhuha,
  };
}

export async function getEffectivePolicyForJadwalKegiatan(
  tenantId: string,
  jadwalKegiatanId?: string | null,
  fallbackNama?: string | null,
  fallbackJenis?: string | null
): Promise<ResolvedJadwalKegiatanPolicy> {
  if (!jadwalKegiatanId) {
    return resolveJadwalKegiatanPolicy({
      nama: fallbackNama,
      jenis_kegiatan: fallbackJenis,
    });
  }

  const jadwal = await prisma.jadwalKegiatan.findFirst({
    where: { id: jadwalKegiatanId, tenant_id: tenantId },
    select: {
      id: true,
      nama: true,
      jenis_kegiatan: true,
      wajib_tap_terminal_guru: true,
      wajib_guru_beririsan: true,
      wajib_positions_configured: true,
      WajibPositions: {
        select: {
          position_id: true,
          Position: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });

  if (!jadwal) {
    return resolveJadwalKegiatanPolicy({
      nama: fallbackNama,
      jenis_kegiatan: fallbackJenis,
    });
  }

  return resolveJadwalKegiatanPolicy(jadwal);
}

/**
 * Urutan hierarki jabatan struktural sekolah dari tertinggi sampai terendah
 * (Pimpinan → Waka → Kepala Unit/Koordinator → Pembina/Walas → Koperasi → Staf TU → Teknis/Operasional)
 */
export const POSITION_HIERARCHY_RANK: Record<string, number> = {
  KEPALA_SEKOLAH: 1,
  KURIKULUM: 10,
  KESISWAAN: 11,
  HUBIN: 12,
  SARPRAS: 13,
  TU_KEPALA: 20,
  TU: 21,
  KAPROG: 22,
  KABENG: 23,
  BPBK: 24,
  BKK: 25,
  KETUA_PEMBINA_TARUNA: 30,
  KOORDINATOR_DHUHA: 31,
  PEMBINA_ROHIS: 32,
  PEMBINA_TARUNA: 33,
  PEMBINA_ESKUL: 34,
  WALIKELAS: 35,
  KETUA_KOPERASI: 40,
  PENGAWAS_KOPERASI: 41,
  SEKRETARIS_KOPERASI: 42,
  BENDAHARA_KOPERASI: 43,
  MANAJER_TOKO_KOPERASI: 44,
  TU_KEPEGAWAIAN: 50,
  TU_KEUANGAN: 51,
  TU_PERSURATAN: 52,
  TU_SARPRAS: 53,
  TOOLMAN: 60,
  GERBANG: 61,
};

export async function getAvailableKegiatanPositions(tenantId: string) {
  const rows = await prisma.organizationalPosition.findMany({
    where: {
      tenant_id: tenantId,
      is_active: true,
      code: { notIn: NON_GURU_KEGIATAN_POSITION_CODES },
    },
    select: {
      id: true,
      code: true,
      name: true,
      scope_type: true,
      order: true,
    },
  });

  return rows
    .sort((a, b) => {
      const ra = POSITION_HIERARCHY_RANK[a.code.toUpperCase()] ?? 100 + (a.order || 0);
      const rb = POSITION_HIERARCHY_RANK[b.code.toUpperCase()] ?? 100 + (b.order || 0);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, 'id');
    })
    .map(({ id, code, name, scope_type }) => ({ id, code, name, scope_type }));
}

export function formatOrgDutyLabel(assign: {
  Position?: { code?: string | null; name?: string | null } | null;
  Kelas?: { nama_kelas?: string | null } | null;
  Unit?: { nama?: string | null } | null;
}): string {
  const code = String(assign.Position?.code || '').toUpperCase();
  if (code === 'WALIKELAS') return `Wali Kelas ${assign.Kelas?.nama_kelas || ''}`.trim();
  if (code === 'KAPROG') return `Kaprog ${assign.Unit?.nama || ''}`.trim();
  if (code === 'BPBK') return 'Guru BK / BP-BK';
  if (code === 'KETUA_PEMBINA_TARUNA') return 'Ketua Pembina Taruna';
  if (code === 'PEMBINA_TARUNA') return 'Pembina Ketarunaan';
  if (code === 'KESISWAAN') return 'Waka Kesiswaan';
  if (code === 'KOORDINATOR_DHUHA' || code === 'PEMBINA_ROHIS') return 'Pembina Dhuha / Rohis';
  const baseName = assign.Position?.name || code;
  if (assign.Unit?.nama) return `${baseName} ${assign.Unit.nama}`.trim();
  if (assign.Kelas?.nama_kelas) return `${baseName} ${assign.Kelas.nama_kelas}`.trim();
  return baseName;
}
