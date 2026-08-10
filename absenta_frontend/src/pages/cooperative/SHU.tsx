import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axiosInstance';
import { Button, SectionCard } from '../../components/ui';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { NonMemberBanner } from '../../components/cooperative/shared/NonMemberBanner';
import { AlertCircle, Plus, Eye, Trash2, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import useConfirm from '../../hooks/useConfirm';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';

const hardeningModuleKey = 'coop_shu';

export interface MyShuHistory {
  id: string;
  totalSimpananModal: string | number;
  totalTransaksi: string | number;
  jasaModal: string | number;
  jasaTransaksi: string | number;
  totalShu: string | number;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'DISTRIBUTED';
  Period: {
    year: number;
  };
}

export interface ShuConfig {
  porsiJasaModal: string;
  porsiJasaTransaksi: string;
  porsiCadangan: string;
  porsiPengurus: string;
  porsiSosial: string;
  porsiPembangunan: string;
}

export interface ShuPeriod {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  totalRevenue: string;
  totalExpense: string;
  totalShu: string;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'DISTRIBUTED';
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface ShuAllocation {
  id: string;
  memberId: string;
  totalSimpananModal: string;
  totalTransaksi: string;
  jasaModal: string;
  jasaTransaksi: string;
  totalShu: string;
  status: 'PENDING' | 'DISTRIBUTED';
  Member: {
    name: string;
    memberNo: string;
  };
}

const PeriodFormModal = lazy(() =>
  import('../../components/cooperative/shu/PeriodFormModal').then(module => ({ default: module.PeriodFormModal }))
);

const ShuMemberView = lazy(() =>
  import('../../components/cooperative/shu/ShuMemberView').then(module => ({ default: module.ShuMemberView }))
);

const ShuPeriodDetail = lazy(() =>
  import('../../components/cooperative/shu/ShuPeriodDetail').then(module => ({ default: module.ShuPeriodDetail }))
);

const ShuRulesForm = lazy(() =>
  import('../../components/cooperative/shu/ShuRulesForm').then(module => ({ default: module.ShuRulesForm }))
);

const SHUPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isKoperasiHead, isKoperasiFinance, isAdmin, can } = useCapabilities();
  const confirm = useConfirm();

  const adminInstruction = {
    title: "Panduan Manajemen SHU",
    description: "Kelola siklus perhitungan, persetujuan, dan pendistribusian Sisa Hasil Usaha (SHU).",
    items: [
      { text: "Tentukan aturan pembagian persentase pada tab 'Aturan Distribusi SHU'." },
      { text: "Buat periode tahun buku baru dan tarik data Laba-Rugi keuangan dari sistem." },
      { text: "Lakukan kalkulasi alokasi SHU anggota, mintakan persetujuan Ketua, lalu distribusikan." }
    ]
  };

  const memberInstruction = {
    title: "Panduan SHU Saya",
    description: "Lihat laporan penerimaan Sisa Hasil Usaha (SHU) koperasi sekolah Anda.",
    items: [
      { text: "Total SHU didasarkan pada Jasa Modal (jumlah simpanan) dan Jasa Transaksi (belanja di koperasi)." },
      { text: "SHU yang telah didistribusikan otomatis masuk ke saldo Simpanan Sukarela Anda." }
    ]
  };
  
  // Tentukan mode berdasarkan pathname URL (apakah di rute manajemen /manage)
  const isManageMode = window.location.pathname.endsWith('/manage');
  
  // Hak akses staff/pengurus koperasi untuk mengakses panel manajemen
  const isCoopStaff = can('cooperative.shu.view.report');
                      
  const isOperator = isManageMode && isCoopStaff;
  const isStudent = !isOperator;

  // Pemisahan peran berdasarkan capabilities
  const canCalculate = can('cooperative.shu.calculate');
  const canApprove = can('cooperative.shu.approve');
  const canDistribute = can('cooperative.savings.deposit');
  const canManageShu = can('cooperative.shu.manage');

  // Tabs for Admin
  const [activeTab, setActiveTab] = useState<'periods' | 'config'>('periods');
  
  // Selected Period Detail View
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [searchMember, setSearchMember] = useState('');

  // Config State
  const [localConfig, setLocalConfig] = useState<ShuConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // New Period Modal State
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);

  // Member status
  const memberStatusQuery = useQuery({
    queryKey: ['koperasi-member-status-me'],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/members/me');
        const data = res?.data?.data;
        return (data && data.status === 'ACTIVE' ? 'member' : 'non-member') as 'member' | 'non-member';
      } catch {
        return 'non-member' as const;
      }
    },
    enabled: !isOperator,
    staleTime: 5 * 60 * 1000,
  });
  const memberStatus = isOperator ? 'member' : (memberStatusQuery.data || (memberStatusQuery.isLoading ? 'loading' : 'non-member'));

  // Fetch all periods
  const periodsQuery = useQuery({
    queryKey: ['koperasi-shu-periods'],
    queryFn: async () => {
      const res = await api.get('/cooperative/shu/periods');
      return (res.data?.success ? res.data.data : []) as ShuPeriod[];
    },
    enabled: isOperator,
    staleTime: 5 * 60 * 1000,
  });
  const periods = periodsQuery.data || [];
  const loadingPeriods = periodsQuery.isLoading;
  const fetchPeriods = useCallback(async () => {
    await periodsQuery.refetch();
  }, [periodsQuery]);

  // Fetch configuration
  const configQuery = useQuery({
    queryKey: ['koperasi-shu-config'],
    queryFn: async () => {
      const res = await api.get('/cooperative/shu/config');
      if (res.data?.success && res.data.data) {
        return {
          porsiJasaModal: String(res.data.data.porsiJasaModal),
          porsiJasaTransaksi: String(res.data.data.porsiJasaTransaksi),
          porsiCadangan: String(res.data.data.porsiCadangan),
          porsiPengurus: String(res.data.data.porsiPengurus),
          porsiSosial: String(res.data.data.porsiSosial),
          porsiPembangunan: String(res.data.data.porsiPembangunan)
        } as ShuConfig;
      }
      return null;
    },
    enabled: isOperator,
    staleTime: 5 * 60 * 1000,
  });

  const defaultConfig: ShuConfig = useMemo(() => ({
    porsiJasaModal: '30',
    porsiJasaTransaksi: '30',
    porsiCadangan: '20',
    porsiPengurus: '5',
    porsiSosial: '5',
    porsiPembangunan: '10'
  }), []);

  const config = localConfig || configQuery.data || defaultConfig;
  const setConfig = setLocalConfig;

  const fetchConfig = useCallback(async () => {
    await configQuery.refetch();
  }, [configQuery]);

  // Fetch member personal history
  const myHistoryQuery = useQuery({
    queryKey: ['koperasi-shu-my-history'],
    queryFn: async () => {
      const res = await api.get('/cooperative/shu/my-history');
      return (res.data?.success ? res.data.data : []) as MyShuHistory[];
    },
    enabled: isStudent && memberStatus === 'member',
    staleTime: 5 * 60 * 1000,
  });
  const myHistory = myHistoryQuery.data || [];
  const loadingHistory = myHistoryQuery.isLoading;
  const fetchMyHistory = useCallback(async () => {
    await myHistoryQuery.refetch();
  }, [myHistoryQuery]);

  // Fetch single period details
  const periodDetailQuery = useQuery({
    queryKey: ['koperasi-shu-period-detail', selectedPeriodId],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const res = await api.get(`/cooperative/shu/periods/${selectedPeriodId}`);
      return res.data?.success ? res.data.data : null;
    },
    enabled: !!selectedPeriodId,
    staleTime: 5 * 60 * 1000,
  });
  const periodDetail = periodDetailQuery.data?.period || null;
  const allocations: ShuAllocation[] = useMemo(() => periodDetailQuery.data?.allocations || [], [periodDetailQuery.data]);
  const loadingDetail = periodDetailQuery.isLoading;

  const fetchPeriodDetail = useCallback(async (id: string) => {
    setSelectedPeriodId(id);
    await queryClient.invalidateQueries({ queryKey: ['koperasi-shu-period-detail', id] });
  }, [queryClient]);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchPeriodDetail(selectedPeriodId);
    }
  }, [selectedPeriodId, fetchPeriodDetail]);

  // Config Form Submit
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sum = 
      Number(config.porsiJasaModal) + 
      Number(config.porsiJasaTransaksi) + 
      Number(config.porsiCadangan) + 
      Number(config.porsiPengurus) + 
      Number(config.porsiSosial) + 
      Number(config.porsiPembangunan);

    if (sum !== 100) {
      toast.error(`Total persentase alokasi harus tepat 100%. Saat ini: ${sum}%`);
      return;
    }

    setSavingConfig(true);
    try {
      const payload = {
        porsiJasaModal: Number(config.porsiJasaModal),
        porsiJasaTransaksi: Number(config.porsiJasaTransaksi),
        porsiCadangan: Number(config.porsiCadangan),
        porsiPengurus: Number(config.porsiPengurus),
        porsiSosial: Number(config.porsiSosial),
        porsiPembangunan: Number(config.porsiPembangunan)
      };
      const res = await api.put('/cooperative/shu/config', payload);
      if (res.data?.success) {
        toast.success('Konfigurasi persentase alokasi SHU berhasil disimpan!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan konfigurasi');
    } finally {
      setSavingConfig(false);
    }
  };

  // Run calculation
  const handleCalculateShu = async () => {
    if (!selectedPeriodId) return;
    try {
      toast.loading('Mengkalkulasi alokasi SHU anggota...', { id: 'calc-shu' });
      const res = await api.post(`/cooperative/shu/periods/${selectedPeriodId}/calculate`);
      if (res.data?.success) {
        toast.success('Kalkulasi SHU selesai!', { id: 'calc-shu' });
        fetchPeriodDetail(selectedPeriodId);
        fetchPeriods();
      }
    } catch (err: unknown) {
      console.error(err);
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Gagal melakukan kalkulasi SHU', { id: 'calc-shu' });
    }
  };

  // Sync financial data manually
  const handleSyncFinancials = async () => {
    if (!selectedPeriodId) return;
    try {
      setLoadingSync(true);
      toast.loading('Menyinkronkan data keuangan Laba-Rugi...', { id: 'sync-fin' });
      const res = await api.post(`/cooperative/shu/periods/${selectedPeriodId}/sync`);
      if (res.data?.success) {
        toast.success('Sinkronisasi data keuangan berhasil!', { id: 'sync-fin' });
        fetchPeriodDetail(selectedPeriodId);
        fetchPeriods();
      }
    } catch (err: unknown) {
      console.error(err);
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Gagal melakukan sinkronisasi keuangan', { id: 'sync-fin' });
    } finally {
      setLoadingSync(false);
    }
  };

  // Chairman approval
  const handleApproveShu = async () => {
    if (!selectedPeriodId) return;
    try {
      toast.loading('Meyetujui pembagian SHU...', { id: 'app-shu' });
      const res = await api.post(`/cooperative/shu/periods/${selectedPeriodId}/approve`);
      if (res.data?.success) {
        toast.success('Pembagian SHU disetujui Ketua!', { id: 'app-shu' });
        fetchPeriodDetail(selectedPeriodId);
        fetchPeriods();
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Gagal menyetujui SHU', { id: 'app-shu' });
    }
  };

  // Bendahara distribution
  const handleDistributeShu = async () => {
    if (!selectedPeriodId) return;
    try {
      toast.loading('Mendistribusikan SHU ke simpanan sukarela...', { id: 'dist-shu' });
      const res = await api.post(`/cooperative/shu/periods/${selectedPeriodId}/distribute`);
      if (res.data?.success) {
        toast.success('SHU sukses didistribusikan ke tabungan anggota!', { id: 'dist-shu' });
        fetchPeriodDetail(selectedPeriodId);
        fetchPeriods();
      }
    } catch (err: unknown) {
      console.error(err);
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Gagal mendistribusikan SHU', { id: 'dist-shu' });
    }
  };

  // Delete SHU period
  const handleDeletePeriod = async (id: string, year: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus Periode SHU',
      description: `Apakah Anda yakin ingin menghapus periode SHU Tahun Buku ${year}? Seluruh data kalkulasi alokasi anggota terkait juga akan dihapus permanen.`,
      style: 'danger'
    });
    if (!isConfirmed) return;
    try {
      toast.loading('Menghapus periode SHU...', { id: 'delete-shu' });
      const res = await api.delete(`/cooperative/shu/periods/${id}`);
      if (res.data?.success) {
        toast.success(`Periode SHU tahun ${year} berhasil dihapus!`, { id: 'delete-shu' });
        fetchPeriods();
      }
    } catch (err: unknown) {
      console.error(err);
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Gagal menghapus periode SHU', { id: 'delete-shu' });
    }
  };

  // Config validation check
  const sumConfig = useMemo(() => {
    return (
      Number(config.porsiJasaModal || 0) +
      Number(config.porsiJasaTransaksi || 0) +
      Number(config.porsiCadangan || 0) +
      Number(config.porsiPengurus || 0) +
      Number(config.porsiSosial || 0) +
      Number(config.porsiPembangunan || 0)
    );
  }, [config]);

  // Render Member Area
  if (isStudent) {
    return (
      <Suspense fallback={
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-650/20 border-t-indigo-650 rounded-full animate-spin"></div>
        </div>
      }>
        <ShuMemberView
          memberStatus={memberStatus}
          myHistory={myHistory}
          loadingHistory={loadingHistory}
          hardeningModuleKey={hardeningModuleKey}
          memberInstruction={memberInstruction}
        />
      </Suspense>
    );
  }

  // Render Period Detail View for Admin
  if (selectedPeriodId && periodDetail) {
    return (
      <Suspense fallback={
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-655/20 border-t-indigo-655 rounded-full animate-spin"></div>
        </div>
      }>
        <ShuPeriodDetail
          selectedPeriodId={selectedPeriodId}
          periodDetail={periodDetail}
          allocations={allocations}
          config={config}
          searchMember={searchMember}
          setSearchMember={setSearchMember}
          loadingDetail={loadingDetail}
          loadingSync={loadingSync}
          canCalculate={canCalculate}
          canApprove={canApprove}
          canDistribute={canDistribute}
          canManageShu={canManageShu}
          user={user}
          handleSyncFinancials={handleSyncFinancials}
          handleCalculateShu={handleCalculateShu}
          handleApproveShu={handleApproveShu}
          handleDistributeShu={handleDistributeShu}
          setSelectedPeriodId={setSelectedPeriodId}
          isOperator={isOperator}
          hardeningModuleKey={hardeningModuleKey}
          adminInstruction={adminInstruction}
        />
      </Suspense>
    );
  }

  // Render Admin Layout (Period Lists & Configurations)
  return (
    <PremiumFeatureGate moduleName="KOPERASI" featureName="Manajemen SHU">
      <AcademicPageLayout
        title="Manajemen SHU Koperasi"
        description="Kelola konfigurasi alokasi persentase dan rekapitulasi pembagian SHU tahunan"
        hardeningModuleKey={hardeningModuleKey}
        breadcrumbs={[
          { label: 'Koperasi', path: '/cooperative' },
          { label: 'SHU', path: isOperator ? '/cooperative/shu/manage' : '/cooperative/shu' }
        ]}
        instruction={adminInstruction}
      >
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 space-x-6">
        <button
          onClick={() => setActiveTab('periods')}
          className={`pb-3 font-black text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'periods'
              ? 'border-indigo-600 text-indigo-655 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Periode & Tahun Buku
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 font-black text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'config'
              ? 'border-indigo-600 text-indigo-655 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Aturan Distribusi SHU
        </button>
      </div>

      {activeTab === 'periods' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Card Panduan Alur Kerja SHU */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-900/50 dark:to-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/10">
                <AlertCircle size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Panduan Siklus Pembagian SHU</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Berikut adalah langkah-langkah dalam memproses pembagian Sisa Hasil Usaha (SHU):</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Step 1 */}
              <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs relative group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all duration-300">
                <div className="absolute top-3 right-3 text-[18px] font-black text-slate-150 dark:text-slate-800 select-none">01</div>
                <h5 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 mb-1 tracking-wider">Atur Aturan</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Buka tab <strong>Aturan Distribusi SHU</strong> untuk menentukan porsi pembagian (Jasa Modal, Jasa Transaksi, Cadangan, Pengurus, Sosial, dll). Total aturan harus 100%.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs relative group hover:border-purple-300 dark:hover:border-purple-800 transition-all duration-300">
                <div className="absolute top-3 right-3 text-[18px] font-black text-slate-150 dark:text-slate-800 select-none">02</div>
                <h5 className="text-xs font-black uppercase text-purple-600 dark:text-purple-400 mb-1 tracking-wider">Buat Periode</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Klik tombol <strong>Buat Periode SHU Baru</strong>. Masukkan tahun buku, rentang tanggal, serta Total Pendapatan & Biaya Koperasi pada periode tersebut.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs relative group hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-300">
                <div className="absolute top-3 right-3 text-[18px] font-black text-slate-150 dark:text-slate-800 select-none">03</div>
                <h5 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 mb-1 tracking-wider">Kalkulasi & Setujui</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Pilih <strong>Kelola SHU</strong> pada periode yang dibuat. Klik <strong>Hitung Alokasi SHU</strong> (oleh Bendahara), lalu minta Ketua Koperasi untuk meninjau dan klik <strong>Setujui Pembagian</strong>.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs relative group hover:border-emerald-300 dark:hover:border-emerald-800 transition-all duration-300">
                <div className="absolute top-3 right-3 text-[18px] font-black text-slate-150 dark:text-slate-800 select-none">04</div>
                <h5 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1 tracking-wider">Distribusikan</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Setelah disetujui, klik <strong>Distribusikan ke Tabungan</strong>. Sistem secara otomatis menyetor dana SHU masing-masing anggota ke rekening Simpanan Sukarela mereka.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Tahun Buku SHU</h3>
              <p className="text-xs text-slate-455">Daftar periode pembukuan pembagian SHU koperasi</p>
            </div>
            {canManageShu && (
              <Button
                onClick={() => setShowPeriodModal(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 rounded-xl shadow-md shadow-indigo-600/10"
              >
                <Plus size={14} /> Buat Periode SHU Baru
              </Button>
            )}
          </div>

          {loadingPeriods ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : periods.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs border border-slate-150 dark:border-slate-800 rounded-2xl">
              {canManageShu 
                ? 'Belum ada periode SHU yang dikonfigurasi. Klik tombol "+ Buat Periode SHU Baru".' 
                : 'Belum ada periode SHU yang dikonfigurasi.'}
            </div>
          ) : (
            <SectionCard className="p-0 border border-slate-150 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-855 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="p-4 w-12 text-center">No</th>
                      <th className="p-4 text-center">Tahun Buku</th>
                      <th className="p-4">Tanggal Awal s.d Akhir</th>
                      <th className="p-4 text-right">Total SHU Bersih</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                    {periods?.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                        <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-4 text-center font-extrabold text-slate-855 dark:text-slate-100">{p.year}</td>
                        <td className="p-4 font-medium text-slate-600 dark:text-slate-400">
                          {new Date(p.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} s.d{' '}
                          {new Date(p.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-right font-black text-slate-855 dark:text-slate-100">
                          Rp {Number(p.totalShu).toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                            p.status === 'DISTRIBUTED' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/20' 
                              : p.status === 'APPROVED' 
                              ? 'bg-blue-50 text-blue-650 border-blue-500/20 dark:bg-blue-950/20' 
                              : p.status === 'CALCULATED' 
                              ? 'bg-purple-50 text-purple-650 border-purple-500/20 dark:bg-purple-950/20' 
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <Button
                              onClick={() => setSelectedPeriodId(p.id)}
                              size="xs"
                              variant="outline"
                              className="text-indigo-655 border-indigo-200 hover:bg-indigo-50 font-bold inline-flex items-center gap-1 text-[10px]"
                            >
                              <Eye size={10} /> Kelola SHU <ArrowUpRight size={10} />
                            </Button>
                            {canManageShu && (p.status === 'DRAFT' || p.status === 'CALCULATED') && (
                              <Button
                                onClick={() => handleDeletePeriod(p.id, p.year)}
                                size="xs"
                                variant="outline"
                                className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold inline-flex items-center gap-1 text-[10px]"
                              >
                                <Trash2 size={10} /> Hapus
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>
      ) : (
        <Suspense fallback={
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-650/20 border-t-indigo-650 rounded-full animate-spin"></div>
          </div>
        }>
          <ShuRulesForm
            config={config}
            setConfig={setConfig}
            handleConfigSubmit={handleConfigSubmit}
            savingConfig={savingConfig}
            sumConfig={sumConfig}
            canManageShu={canManageShu}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <PeriodFormModal
          isOpen={showPeriodModal}
          onClose={() => setShowPeriodModal(false)}
          onSuccess={fetchPeriods}
        />
      </Suspense>
    </AcademicPageLayout>
  </PremiumFeatureGate>
  );
});

export default SHUPage;
