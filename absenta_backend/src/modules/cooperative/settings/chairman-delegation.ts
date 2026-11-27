import { STRUKTUR_CAPABILITIES } from '@/config/position-capabilities';
import { STRUKTUR_CODES } from '@/config/organization-structure';

export const CHAIRMAN_DELEGATION_CONFIG_KEY = 'cooperative_chairman_delegation';

export interface ChairmanDelegationConfig {
  enabled: boolean;
  targetPositions: string[];
  mode: 'ALL' | 'CUSTOM';
  capabilities: string[];
  notes?: string;
  updatedAt?: string;
  updatedByUserId?: string;
  updatedByName?: string;
}

export const DEFAULT_CHAIRMAN_DELEGATION: ChairmanDelegationConfig = {
  enabled: false,
  targetPositions: [],
  mode: 'ALL',
  capabilities: [],
  notes: '',
};

export interface DelegationCapabilityItem {
  code: string;
  label: string;
}

export interface DelegationCapabilityGroup {
  id: string;
  label: string;
  description: string;
  capabilities: DelegationCapabilityItem[];
}

export const CHAIRMAN_CAPABILITY_LIST: string[] = Array.from(
  new Set(STRUKTUR_CAPABILITIES[STRUKTUR_CODES.KETUA_KOPERASI] || [])
);

export const CHAIRMAN_CAPABILITY_SET = new Set<string>(CHAIRMAN_CAPABILITY_LIST);

export const CHAIRMAN_DELEGATION_GROUPS: DelegationCapabilityGroup[] = [
  {
    id: 'loans',
    label: 'Pinjaman & Persetujuan Kredit',
    description: 'Melihat daftar pinjaman, menyetujui/menolak pengajuan pinjaman, angsuran, dan jenis pinjaman.',
    capabilities: [
      { code: 'cooperative.loans.view.list', label: 'Lihat Daftar Pinjaman' },
      { code: 'cooperative.loans.view.detail', label: 'Lihat Detail Pinjaman' },
      { code: 'cooperative.loans.approve', label: 'Setujui Pengajuan Pinjaman (Approval Ketua)' },
      { code: 'cooperative.loans.reject', label: 'Tolak Pengajuan Pinjaman' },
      { code: 'cooperative.loans.apply', label: 'Ajukan Pinjaman' },
      { code: 'cooperative.loans.repay', label: 'Catat Pembayaran Angsuran' },
      { code: 'cooperative.loans.types.manage', label: 'Kelola Jenis & Skema Pinjaman' },
    ],
  },
  {
    id: 'members',
    label: 'Keanggotaan Koperasi',
    description: 'Persetujuan keanggotaan baru, aktivasi/nonaktif anggota, dan pengelolaan data anggota.',
    capabilities: [
      { code: 'cooperative.members.view.list', label: 'Lihat Daftar Anggota' },
      { code: 'cooperative.members.view.detail', label: 'Lihat Detail Anggota' },
      { code: 'cooperative.members.view.status', label: 'Lihat Status Keanggotaan' },
      { code: 'cooperative.members.create', label: 'Tambah Anggota Baru' },
      { code: 'cooperative.members.update', label: 'Ubah Data Anggota' },
      { code: 'cooperative.members.delete', label: 'Hapus Anggota' },
      { code: 'cooperative.members.manage', label: 'Kelola Penuh Anggota' },
      { code: 'cooperative.members.activate', label: 'Aktifkan Anggota' },
      { code: 'cooperative.members.deactivate', label: 'Nonaktifkan Anggota' },
    ],
  },
  {
    id: 'reports_shu_assets',
    label: 'Laporan Keuangan, SHU & Aset',
    description: 'Akses laporan keuangan, persetujuan/perhitungan SHU, dan pengelolaan aset koperasi.',
    capabilities: [
      { code: 'cooperative.reports.view.financial', label: 'Lihat Laporan Keuangan (Neraca, Laba Rugi, Arus Kas)' },
      { code: 'cooperative.reports.view.daily', label: 'Lihat Laporan Harian' },
      { code: 'cooperative.reports.view.monthly', label: 'Lihat Laporan Bulanan' },
      { code: 'cooperative.shu.view.report', label: 'Lihat Laporan SHU' },
      { code: 'cooperative.shu.calculate', label: 'Hitung Estimasi & Alokasi SHU' },
      { code: 'cooperative.shu.approve', label: 'Setujui Pembagian SHU (Approval Ketua)' },
      { code: 'cooperative.shu.manage', label: 'Kelola Pengaturan & Periode SHU' },
      { code: 'cooperative.assets.view.list', label: 'Lihat Daftar Aset' },
      { code: 'cooperative.assets.view.detail', label: 'Lihat Detail Aset' },
      { code: 'cooperative.assets.create', label: 'Tambah Aset' },
      { code: 'cooperative.assets.update', label: 'Ubah Aset' },
      { code: 'cooperative.assets.delete', label: 'Hapus Aset' },
    ],
  },
  {
    id: 'savings_store',
    label: 'Simpanan, Toko & Pengadaan',
    description: 'Monitoring simpanan anggota, katalog toko, stok, pesanan, pemasok, dan voucher.',
    capabilities: [
      { code: 'cooperative.savings.view.list', label: 'Lihat Daftar Simpanan' },
      { code: 'cooperative.savings.view.detail', label: 'Lihat Detail Simpanan' },
      { code: 'cooperative.savings.view.history', label: 'Lihat Riwayat Transaksi Simpanan' },
      { code: 'cooperative.suppliers.view.list', label: 'Lihat Daftar Pemasok' },
      { code: 'cooperative.store.view.catalog', label: 'Lihat Katalog Toko' },
      { code: 'cooperative.store.products.view.list', label: 'Lihat Daftar Produk' },
      { code: 'cooperative.store.products.view.detail', label: 'Lihat Detail Produk' },
      { code: 'cooperative.store.orders.view.list', label: 'Lihat Pesanan Toko' },
      { code: 'cooperative.store.transactions.view', label: 'Lihat Transaksi Toko' },
      { code: 'cooperative.store.inventory.manage', label: 'Kelola Stok & Inventori Toko' },
      { code: 'cooperative.vouchers.view.list', label: 'Lihat Daftar Voucher' },
      { code: 'cooperative.vouchers.manage', label: 'Kelola Voucher' },
    ],
  },
  {
    id: 'governance_settings',
    label: 'Pengaturan, Setup, RAT & Komunikasi',
    description: 'Setup awal koperasi, pengaturan profil, Rapat Anggota Tahunan (RAT), pengumuman, dan tiket.',
    capabilities: [
      { code: 'cooperative.dashboard.view.overview', label: 'Lihat Overview Dashboard Koperasi' },
      { code: 'cooperative.setup.view', label: 'Lihat Wizard Setup Koperasi' },
      { code: 'cooperative.setup.manage', label: 'Kelola Setup & Saldo Awal Koperasi' },
      { code: 'cooperative.settings.view', label: 'Lihat Pengaturan Koperasi' },
      { code: 'cooperative.settings.update', label: 'Ubah Pengaturan Koperasi' },
      { code: 'cooperative.rat.view', label: 'Lihat Agenda & Dokumen RAT' },
      { code: 'cooperative.rat.manage', label: 'Kelola Rapat Anggota Tahunan (RAT)' },
      { code: 'cooperative.rat.vote', label: 'Voting RAT' },
      { code: 'cooperative.announcements.view.list', label: 'Lihat Pengumuman Koperasi' },
      { code: 'cooperative.announcements.create', label: 'Buat Pengumuman Koperasi' },
      { code: 'cooperative.announcements.delete', label: 'Hapus Pengumuman Koperasi' },
      { code: 'cooperative.tickets.view.list', label: 'Lihat Daftar Tiket' },
      { code: 'cooperative.tickets.view.detail', label: 'Lihat Detail Tiket' },
      { code: 'cooperative.tickets.create', label: 'Buat Tiket' },
      { code: 'cooperative.tickets.reply', label: 'Balas Tiket' },
      { code: 'cooperative.tickets.update.status', label: 'Ubah Status Tiket' },
    ],
  },
];

export function parseChairmanDelegationConfig(raw?: string | null): ChairmanDelegationConfig {
  if (!raw) return { ...DEFAULT_CHAIRMAN_DELEGATION };
  try {
    const parsed = JSON.parse(raw);
    const targetPositions: string[] = Array.isArray(parsed?.targetPositions)
      ? Array.from(
          new Set<string>(
            parsed.targetPositions
              .map((p: unknown) => String(p || '').trim().toUpperCase())
              .filter((p: string) => Boolean(p) && p !== STRUKTUR_CODES.KETUA_KOPERASI)
          )
        )
      : [];

    const mode: 'ALL' | 'CUSTOM' = parsed?.mode === 'CUSTOM' ? 'CUSTOM' : 'ALL';
    const capabilities: string[] = Array.isArray(parsed?.capabilities)
      ? Array.from(
          new Set<string>(
            parsed.capabilities
              .map((c: unknown) => String(c || '').trim())
              .filter((c: string) => CHAIRMAN_CAPABILITY_SET.has(c))
          )
        )
      : [];

    return {
      enabled: Boolean(parsed?.enabled) && targetPositions.length > 0,
      targetPositions,
      mode,
      capabilities,
      notes: parsed?.notes ? String(parsed.notes) : '',
      updatedAt: parsed?.updatedAt ? String(parsed.updatedAt) : undefined,
      updatedByUserId: parsed?.updatedByUserId ? String(parsed.updatedByUserId) : undefined,
      updatedByName: parsed?.updatedByName ? String(parsed.updatedByName) : undefined,
    };
  } catch {
    return { ...DEFAULT_CHAIRMAN_DELEGATION };
  }
}

export function resolveDelegatedChairmanCapabilities(
  config: ChairmanDelegationConfig,
  userPositionCodes: string[]
): string[] {
  if (!config.enabled || config.targetPositions.length === 0) return [];

  const normalizedUserCodes = userPositionCodes.map((c) => String(c || '').trim().toUpperCase());
  const isTarget = normalizedUserCodes.some(
    (code) => code !== STRUKTUR_CODES.KETUA_KOPERASI && config.targetPositions.includes(code)
  );
  if (!isTarget) return [];

  if (config.mode === 'CUSTOM') {
    return config.capabilities.filter((c) => CHAIRMAN_CAPABILITY_SET.has(c));
  }
  return CHAIRMAN_CAPABILITY_LIST;
}
