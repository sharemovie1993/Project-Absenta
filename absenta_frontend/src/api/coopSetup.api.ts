import api from '../lib/axiosInstance';

export type BackendSetupMode = 'NEW' | 'ANNUAL_TRANSITION' | 'MID_YEAR_CUTOFF';
export type FrontendSetupMode = 'NEW_COOP' | 'MIGRATION_START_YEAR' | 'MIGRATION_MID_YEAR';
export type SetupMode = BackendSetupMode | FrontendSetupMode;

export type SetupCompletionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface SetupChecklistStatus {
  profileConfigured: boolean;
  coaInitialized: boolean;
  openingBalancePosted: boolean;
  membersImported: boolean;
  storeProductsImported: boolean;
}

export interface SetupChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  required: boolean;
}

export interface SetupSimulationStats {
  hasSimulationData: boolean;
  totalJournals: number;
  totalSales: number;
  totalLoans: number;
  totalSavingsTransactions: number;
}

export interface SetupStatusData {
  status: SetupCompletionStatus;
  setupStatus: SetupCompletionStatus; // fallback compatibility
  mode: BackendSetupMode | null;
  setupMode: FrontendSetupMode; // normalized for UI
  cutoffDate: string | null;
  completedAt?: string | null;
  coaCount: number;
  coaInitialized: boolean;
  hasOpeningJournal: boolean;
  memberCount: number;
  membersWithSavingsCount: number;
  readinessPercentage: number;
  checklist: SetupChecklistItem[];
  rawChecklist: SetupChecklistStatus;
  simulationStats?: SetupSimulationStats;
}

export interface SetModePayload {
  mode: SetupMode;
  cutoffDate?: string;
  cutoff_date?: string;
}

export interface OpeningBalanceRawEntry {
  account_id?: string;
  accountCode?: string;
  debit: number;
  credit: number;
  notes?: string;
}

export type OpeningBalanceEntry = OpeningBalanceRawEntry;

export interface PostOpeningBalancePayload {
  mode?: SetupMode;
  cutoffDate?: string;
  cutoff_date?: string;
  entries: OpeningBalanceRawEntry[];
  notes?: string;
}

export interface SubledgerMemberImport {
  nik: string;
  nama: string;
  phone?: string;
  email?: string;
  alamat?: string;
  simpanan_pokok?: number;
  simpanan_wajib?: number;
  simpanan_sukarela?: number;
  pinjaman_pokok_berjalan?: number;
  pinjaman_sisa_bunga?: number;
  pinjaman_sisa_tenor_bulan?: number;
}

export interface ImportSubledgerPayload {
  members: SubledgerMemberImport[];
}

// Helper to normalize mode from UI to backend
export const toBackendMode = (mode: SetupMode): BackendSetupMode => {
  if (mode === 'NEW_COOP' || mode === 'NEW') return 'NEW';
  if (mode === 'MIGRATION_START_YEAR' || mode === 'ANNUAL_TRANSITION') return 'ANNUAL_TRANSITION';
  return 'MID_YEAR_CUTOFF';
};

// Helper to normalize mode from backend to UI
export const toFrontendMode = (mode?: BackendSetupMode | null): FrontendSetupMode => {
  if (mode === 'NEW') return 'NEW_COOP';
  if (mode === 'ANNUAL_TRANSITION') return 'MIGRATION_START_YEAR';
  if (mode === 'MID_YEAR_CUTOFF') return 'MIGRATION_MID_YEAR';
  return 'NEW_COOP';
};

export const coopSetupApi = {
  /**
   * Mengambil status kesiapan onboarding 360 derajat koperasi
   */
  getStatus: async (): Promise<SetupStatusData> => {
    const res = await api.get<{ success: boolean; data: any }>('/cooperative/setup/status');
    const d = res.data.data;
    
    const rawChecklist: SetupChecklistStatus = d.checklist || {
      profileConfigured: false,
      coaInitialized: false,
      openingBalancePosted: false,
      membersImported: false,
      storeProductsImported: false,
    };

    const uiChecklist: SetupChecklistItem[] = [
      { key: 'profile', label: 'Profil Koperasi & Pengurus Terdaftar', passed: !!rawChecklist.profileConfigured, required: true },
      { key: 'coa', label: 'Bagan Akun SAK ETAP Diinisialisasi (31 Akun)', passed: !!rawChecklist.coaInitialized, required: true },
      { key: 'openingJournal', label: 'Jurnal Saldo Awal Neraca Terposting (Seimbang)', passed: !!rawChecklist.openingBalancePosted, required: d.mode !== 'NEW' },
      { key: 'members', label: 'Anggota Koperasi Terdaftar / Terimpor', passed: !!rawChecklist.membersImported, required: false },
      { key: 'products', label: 'Katalog Produk Minimarket (Opsional)', passed: !!rawChecklist.storeProductsImported, required: false },
    ];

    return {
      status: d.status || 'NOT_STARTED',
      setupStatus: d.status || 'NOT_STARTED',
      mode: d.mode || null,
      setupMode: toFrontendMode(d.mode),
      cutoffDate: d.cutoffDate || null,
      completedAt: d.completedAt || null,
      coaCount: rawChecklist.coaInitialized ? 31 : 0,
      coaInitialized: !!rawChecklist.coaInitialized,
      hasOpeningJournal: !!rawChecklist.openingBalancePosted,
      memberCount: rawChecklist.membersImported ? 1 : 0,
      membersWithSavingsCount: rawChecklist.membersImported ? 1 : 0,
      readinessPercentage: d.progressPercentage || 0,
      checklist: uiChecklist,
      rawChecklist,
      simulationStats: d.simulationStats || undefined,
    };
  },

  /**
   * Memilih mode onboarding koperasi (NEW, ANNUAL_TRANSITION, MID_YEAR_CUTOFF)
   */
  setMode: async (payload: SetModePayload): Promise<{ success: boolean; message: string; data: any }> => {
    const backendMode = toBackendMode(payload.mode);
    const cutoffDate = payload.cutoffDate || payload.cutoff_date;
    const res = await api.post<{ success: boolean; message: string; data: any }>('/cooperative/setup/mode', {
      mode: backendMode,
      cutoffDate,
    });
    return res.data;
  },

  /**
   * Menginisialisasi COA standar SAK ETAP Koperasi (31 akun hierarkis)
   */
  initializeCoa: async (): Promise<{ success: boolean; message: string; count: number }> => {
    const res = await api.post<{ success: boolean; message: string; data: any }>('/cooperative/setup/initialize-coa');
    return {
      success: res.data.success,
      message: res.data.message || 'COA berhasil diinisialisasi',
      count: res.data.data?.count || 31,
    };
  },

  /**
   * Menginput / Memposting Saldo Awal Neraca (Strict Double-Entry Balanced)
   */
  postOpeningBalance: async (payload: PostOpeningBalancePayload): Promise<{ success: boolean; message: string; data: any }> => {
    // Transform entries into accountCode, type, amount
    const transformedEntries: { accountCode: string; type: 'DEBIT' | 'CREDIT'; amount: number }[] = [];
    
    for (const e of payload.entries) {
      const code = e.accountCode || '';
      if (e.debit > 0) {
        transformedEntries.push({
          accountCode: code,
          type: 'DEBIT',
          amount: Number(e.debit),
        });
      }
      if (e.credit > 0) {
        transformedEntries.push({
          accountCode: code,
          type: 'CREDIT',
          amount: Number(e.credit),
        });
      }
    }

    const backendMode = payload.mode ? toBackendMode(payload.mode) : 'ANNUAL_TRANSITION';
    const cutoffDate = payload.cutoffDate || payload.cutoff_date || new Date().toISOString().split('T')[0];

    const res = await api.post<{ success: boolean; message: string; data: any }>('/cooperative/setup/opening-balance', {
      mode: backendMode,
      cutoffDate,
      entries: transformedEntries,
      notes: payload.notes,
    });
    return res.data;
  },

  /**
   * Mengimpor anggota & saldo sub-ledger (Simpanan & Pinjaman)
   */
  importSubledger: async (payload: ImportSubledgerPayload): Promise<{ success: boolean; message: string; data: any }> => {
    const formattedMembers = payload.members.map((m, idx) => ({
      memberNo: m.nik || `MBR-${String(idx + 1).padStart(4, '0')}`,
      type: 'GENERAL',
      identityNo: m.nik || `ID-${idx + 1}`,
      name: m.nama,
      phone: m.phone,
      email: m.email,
      address: m.alamat,
      savings: {
        pokok: Number(m.simpanan_pokok) || 0,
        wajib: Number(m.simpanan_wajib) || 0,
        sukarela: Number(m.simpanan_sukarela) || 0,
      },
      activeLoan: Number(m.pinjaman_pokok_berjalan) > 0 ? {
        remainingPrincipal: Number(m.pinjaman_pokok_berjalan),
        remainingMonths: Number(m.pinjaman_sisa_tenor_bulan) || 12,
      } : undefined,
    }));

    const res = await api.post<{ success: boolean; message: string; data: any }>('/cooperative/setup/import-subledger', {
      members: formattedMembers,
    });
    const nestedData = res.data?.data?.data || res.data?.data || {};
    return {
      success: res.data.success,
      message: res.data?.data?.message || res.data?.message || 'Subledger berhasil diimpor',
      data: {
        total_members_imported: nestedData.successCount ?? formattedMembers.length,
        successCount: nestedData.successCount ?? formattedMembers.length,
        failCount: nestedData.failCount ?? 0,
        errors: nestedData.errors ?? [],
        ...nestedData,
      }
    };
  },

  /**
   * Menyelesaikan setup wizard & mengaktifkan operasional penuh koperasi
   */
  completeSetup: async (): Promise<{ success: boolean; message: string }> => {
    const res = await api.post<{ success: boolean; message: string }>('/cooperative/setup/complete');
    return res.data;
  },

  /**
   * Membersihkan data simulasi / uji coba koperasi
   */
  resetSimulationData: async (payload: ResetSimulationPayload = {}): Promise<{
    success: boolean;
    message: string;
    purged: Record<string, number>;
  }> => {
    const res = await api.post<{
      success: boolean;
      message: string;
      purged: Record<string, number>;
    }>('/cooperative/setup/reset-simulation-data', payload);
    return res.data;
  },
};

export interface ResetSimulationPayload {
  purgeTransactions?: boolean;
  purgeOpeningBalances?: boolean;
  purgeMembers?: boolean;
  purgeProducts?: boolean;
  resetSetupStatus?: boolean;
}

