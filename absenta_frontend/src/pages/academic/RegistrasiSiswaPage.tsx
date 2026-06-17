import React, { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionCard } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Table } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { getSiswaList, syncSiswaAkademik, getAcademicRegistrationStats, checkAcademicStatus } from '../../api/academic/siswa.api';
import { getKelasForDropdown, getActiveTahunPelajaran, getActiveSemester, getTahunPelajaranForDropdown, getSemesterByTahunPelajaranForDropdown } from '../../api/dropdown.api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import type { Siswa, TahunPelajaran, Semester, Kelas } from '../../types/academic';
import { RefreshCw, CheckCircle2, XCircle, Search, History, Info, AlertCircle, Pencil, Sparkles, LayoutDashboard, ArrowUpCircle, Users } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Progress } from '../../components/ui/Progress';
import Tooltip from '../../components/ui/Tooltip';
import { Loader } from '../../components/ui/Loader';

// Lazy load Modal dan Komponen Berat
const Modal = lazy(() => import('../../components/ui/Modal').then(module => ({ default: module.Modal })));
const SiswaHistory = lazy(() => import('../../components/academic/siswa/SiswaHistory').then(module => ({ default: module.SiswaHistory })));

const RegistrasiSiswaPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const canManage = useMemo(() => can('academic.students.update'), [can]);
  const canView = useMemo(() => can('academic.students.view.list'), [can]);

  const { showToast } = useToast();
  const [siswas, setSiswas] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [kelasOptions, setKelasOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [activeYear, setActiveYear] = useState<TahunPelajaran | null>(null);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [yearOptions, setYearOptions] = useState<{ value: string; label: string }[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [checkingMap, setCheckingMap] = useState<Record<string, string | null>>({});

  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{ created: number; skipped: number; total: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [akademikFilter, setAkademikFilter] = useState<'ALL' | 'TERDAFTAR' | 'BELUM'>('ALL');
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [historySiswaId, setHistorySiswaId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [globalStats, setGlobalStats] = useState<{ registered: number; total_active: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);

  const fetchStats = useCallback(async () => {
    if (!activeYear || !activeSemester) return;
    try {
      setStatsLoading(true);
      const stats = await getAcademicRegistrationStats(activeYear.id, activeSemester.id);
      setGlobalStats(stats);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  }, [activeYear, activeSemester]);

  useEffect(() => { if (canView) fetchStats(); }, [canView, fetchStats]);

  const loadActiveRefs = useCallback(async () => {
    try {
      const [years, activeY, activeS] = await Promise.all([
        getTahunPelajaranForDropdown(),
        getActiveTahunPelajaran(),
        getActiveSemester()
      ]);
      setYearOptions(years || []);
      setActiveYear(activeY);
      setActiveSemester(activeS);
      if (!selectedYearId && activeY) setSelectedYearId(activeY.id);
    } catch (error: unknown) { console.error('Error loading academic references:', error); }
  }, [selectedYearId]);

  useEffect(() => {
    const loadSemesters = async () => {
      if (!selectedYearId) { setSemesterOptions([]); return; }
      try {
        const semesters = await getSemesterByTahunPelajaranForDropdown(selectedYearId);
        setSemesterOptions(semesters || []);
        if (!selectedSemesterId && activeSemester && activeYear && selectedYearId === activeYear.id) {
          setSelectedSemesterId(activeSemester.id);
        } else if (selectedSemesterId) {
          if (!semesters?.some(s => s.value === selectedSemesterId)) setSelectedSemesterId('');
        }
      } catch (error: unknown) { console.error('Error loading semesters:', error); setSemesterOptions([]); }
    };
    loadSemesters();
  }, [selectedYearId, activeYear, activeSemester]);

  const fetchSiswas = useCallback(async (page = 1) => {
    try {
      setLoading(true); setSyncError(null);
      const res = await getSiswaList(page, itemsPerPage, debouncedSearchTerm, selectedKelasId, '');
      setSiswas(res?.data || []);
      setTotalPages(res?.pagination?.totalPages || 1);
      setCurrentPage(res?.pagination?.page || page);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Gagal memuat data siswa';
      showToast(errorMsg, 'error');
    }
    finally { setLoading(false); }
  }, [itemsPerPage, debouncedSearchTerm, selectedKelasId]);

  const checkActiveSnapshots = useCallback(async () => {
    if (!selectedYearId || !selectedSemesterId || siswas.length === 0) { setCheckingMap({}); return; }
    try {
      const ids = siswas?.map(s => s.id) || [];
      const map = await checkAcademicStatus(ids, selectedYearId, selectedSemesterId);
      setCheckingMap(map || {});
    } catch (e: unknown) { console.error('Error checking academic status:', e); }
  }, [selectedYearId, selectedSemesterId, siswas]);

  useEffect(() => {
    if (!canView) return;
    loadActiveRefs();
    getKelasForDropdown().then(opts => setKelasOptions([{ value: '', label: 'Semua Kelas' }, ...(opts || [])]));
  }, [canView, loadActiveRefs]);

  useEffect(() => { if (canView) fetchSiswas(1); }, [canView, debouncedSearchTerm, selectedKelasId, itemsPerPage, fetchSiswas]);
  useEffect(() => { if (canView) checkActiveSnapshots(); }, [canView, siswas, selectedYearId, selectedSemesterId, checkActiveSnapshots]);

  const filteredSiswas = useMemo(() => {
    if (akademikFilter === 'ALL') return siswas;
    if (akademikFilter === 'TERDAFTAR') return siswas.filter(s => checkingMap[s.id] !== null);
    return siswas.filter(s => checkingMap[s.id] === null);
  }, [siswas, akademikFilter, checkingMap]);

  const isActiveContext = useMemo(() => {
    return activeYear && activeSemester && selectedYearId === activeYear.id && selectedSemesterId === activeSemester.id;
  }, [activeYear, activeSemester, selectedYearId, selectedSemesterId]);

  const needsSync = useMemo(() => {
    return (globalStats?.total_active || 0) > (globalStats?.registered || 0);
  }, [globalStats]);

  const academicStats = useMemo(() => [
    {
      title: "Total Siswa Aktif",
      value: globalStats?.total_active || 0,
      icon: <Users size={14} />,
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      title: "Sudah Terdaftar",
      value: globalStats?.registered || 0,
      icon: <CheckCircle2 size={14} />,
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Belum Terdaftar",
      value: Math.max(0, (globalStats?.total_active || 0) - (globalStats?.registered || 0)),
      icon: <XCircle size={14} />,
      gradient: "from-rose-500 to-pink-600"
    }
  ], [globalStats]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'nama_siswa', label: 'Nama Siswa', sortable: true, render: (val: unknown, s: unknown) => {
        const row = s as Siswa;
        return (
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{val as string}</div>
            <div className="text-[10px] text-gray-500">{row?.User?.email || '-'}</div>
          </div>
        );
      }
    },
    {
      key: 'Kelas', label: 'Kelas', render: (kelas: unknown) => {
        const k = kelas as Kelas | undefined;
        return (
          <div className="text-sm font-medium">{k?.nama_kelas || '-'}</div>
        );
      }
    },
    {
      key: '_akademik_status', label: 'Status', render: (_: unknown, s: Siswa) => {
        const status = checkingMap[s.id];
        if (!status) return <Badge variant="secondary" className="text-[10px] font-bold">BELUM AKTIF</Badge>;
        const color = status === 'AKTIF' ? 'success' : (['NAIK', 'TINGGAL'].includes(status) ? 'warning' : 'destructive');
        return <Badge variant={color} className="text-[10px] font-bold">{status === 'AKTIF' ? 'TERDAFTAR AKTIF' : status}</Badge>;
      }
    },
    {
      key: '_actions', label: 'Aksi', render: (_: unknown, s: Siswa) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Tooltip content="Riwayat Akademik">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setHistorySiswaId(s.id); setHistoryOpen(true); }}
              className="h-7 w-7 p-0 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            >
              <History className="w-4 h-4" />
            </Button>
          </Tooltip>

          <div className="w-[1px] h-3 bg-slate-100 dark:bg-slate-800" />

          <Tooltip content="Edit Bio Data">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(`/academic/siswa?edit=${s.id}`, '_blank')}
              className="h-7 w-7 p-0 flex items-center justify-center hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      )
    },
  ], [checkingMap]);

  const doSyncAkademik = async () => {
    try {
      setSyncLoading(true); setSyncError(null); setSyncResult(null);
      const res = await syncSiswaAkademik(selectedKelasId || undefined);
      setSyncResult(res.data); fetchSiswas(currentPage); checkActiveSnapshots();
      fetchStats();
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Gagal sinkronisasi';
      setSyncError(errorMsg);
    }
    finally { setSyncLoading(false); }
  };

  const registrationPercentage = useMemo(() => {
    if (!globalStats?.total_active) return 0;
    return Math.round((globalStats.registered / globalStats.total_active) * 100);
  }, [globalStats]);

  const breadcrumbs = useMemo(() => [
    { label: 'Akademik' },
    { label: 'Registrasi Siswa' },
  ], []);

  const toolbarLeft = (
    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
      <div className="relative w-full md:w-52">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Cari nama siswa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9 text-[12px] font-medium rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm"
        />
      </div>
      <div className="w-full md:w-44">
        <SearchableSelect
          triggerClassName="h-9 text-[11px] font-bold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm"
          value={akademikFilter}
          onValueChange={(v: string) => setAkademikFilter(v as 'ALL' | 'TERDAFTAR' | 'BELUM')}
          options={[
            { label: 'Tampilkan Semua', value: 'ALL' },
            { label: 'Sudah Terdaftar', value: 'TERDAFTAR' },
            { label: 'Belum Aktif', value: 'BELUM' }
          ]}
        />
      </div>
      <div className="w-full md:w-44">
        <SearchableSelect
          triggerClassName="h-9 text-[11px] font-bold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm"
          value={selectedKelasId}
          onValueChange={setSelectedKelasId}
          options={kelasOptions}
          placeholder="Semua Kelas"
        />
      </div>
    </div>
  );

  const toolbarRight = (
    <div className="flex items-center gap-2 w-full md:w-auto">
      {canManage && isActiveContext && (
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={doSyncAkademik}
          disabled={syncLoading}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
          Sinkronisasi
        </Button>
      )}

      <Button
        variant="toolbarOutline"
        size="toolbar"
        onClick={() => navigate('/academic/transition')}
        className="gap-1.5"
      >
        <ArrowUpCircle className="w-3.5 h-3.5" />
        Transisi
      </Button>

      <Button
        variant="toolbarOutline"
        size="toolbarIcon"
        onClick={() => fetchSiswas(currentPage)}
        title="Refresh Data"
        disabled={loading}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );

  return (
    <AcademicPageLayout
      title="Registrasi Siswa Semesteran"
      description="Kelola aktivasi dan pendataan akademik siswa setiap awal semester secara massal untuk periode aktif."
      stats={academicStats}
      isLoadingStats={statsLoading}
      breadcrumbs={breadcrumbs}
      instruction={{
        title: "Pusat Aktivasi & Registrasi Siswa",
        description: "Langkah ini adalah kunci agar data siswa muncul di aplikasi Absensi & Jurnal Kelas. Pastikan semua siswa sudah didaftarkan ke semester aktif saat ini.",
        items: [
          { text: "Pilih Tahun Pelajaran dan Semester yang ingin dikelola pada bilah kontrol di bawah." },
          { text: "Klik tombol 'Aktivasi & Daftarkan Siswa' untuk mendaftarkan siswa secara massal ke periode terpilih." },
          { text: "Lakukan sinkronisasi ulang setiap kali ada penambahan siswa baru di menu Biodata." }
        ]
      }}
      canView={canView}
      isLoading={authLoading}
      hardeningModuleKey="registrasisiswapage"
    >
      <div className="flex flex-col bg-transparent">
        {/* 1. Control Bar - Period Selection */}
        <div className="px-6 py-3 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl px-4 py-1 border border-slate-200/60 dark:border-slate-800 shadow-sm">
              <History size={14} className="text-slate-400 mr-2" />
              <SearchableSelect
                triggerClassName="h-8 text-[11px] w-40 border-none bg-transparent shadow-none font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight"
                value={selectedYearId}
                onValueChange={setSelectedYearId}
                options={yearOptions}
                placeholder="Tahun"
              />
              <div className="w-[1px] h-4 bg-slate-100 dark:bg-slate-800 mx-2" />
              <SearchableSelect
                triggerClassName="h-8 text-[11px] w-36 border-none bg-transparent shadow-none font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight"
                value={selectedSemesterId}
                onValueChange={setSelectedSemesterId}
                options={semesterOptions}
                placeholder="Semester"
              />
            </div>

            {isActiveContext ? (
              <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Periode Aktif</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <History size={14} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Mode Historis</span>
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
             <div className="flex flex-col items-end mr-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cakupan Data</p>
                <p className="text-xs font-black text-slate-700 dark:text-slate-200">{filteredSiswas.length} / {siswas.length} Siswa</p>
             </div>
             <Progress value={(filteredSiswas.length / Math.max(1, siswas.length)) * 100} className="w-20 h-1.5" />
          </div>
        </div>

        {/* 2. Action Card - Sync Needed */}
        {isActiveContext && needsSync && !syncLoading && (
          <div className="p-4 bg-amber-50/20 dark:bg-amber-900/5 border-b border-amber-100 dark:border-amber-900/20">
            <SectionCard
              fullWidth
              className="p-6 border-2 border-amber-100 dark:border-amber-900/30 shadow-xl shadow-amber-500/5 bg-white/80 dark:bg-slate-900/80"
              noPadding
            >
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 w-full">
                <div className="w-16 h-16 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0 shadow-md border-2 border-white dark:border-slate-900">
                  <Sparkles size={32} className="animate-pulse" />
                </div>
                
                <div className="flex-1 text-center md:text-left space-y-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                     <h3 className="text-lg font-black text-slate-900 dark:text-white italic tracking-tight">Sinkronisasi Diperlukan!</h3>
                     <Badge className="w-fit mx-auto md:mx-0 bg-amber-500 text-white font-black text-[9px] px-2 rounded-full border-none">WAJIB AKTIVASI</Badge>
                  </div>
                  <p className="text-[13px] font-medium text-slate-500 max-w-2xl">
                    Terdapat <span className="text-amber-600 font-black">{(globalStats?.total_active || 0) - (globalStats?.registered || 0)} siswa</span> yang belum terdaftar. Lakukan aktivasi massal sekarang.
                  </p>
                </div>

                <Button
                  onClick={doSyncAkademik}
                  className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.1em] text-[11px] gap-3 shadow-lg shadow-blue-500/20 hover:scale-102 active:scale-98 transition-all group"
                >
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                  Mulai Aktivasi Massal
                </Button>
              </div>
            </SectionCard>
          </div>
        )}

        {/* 3. Sync Results */}
        {(syncResult || syncError) && (
          <div className="px-6 py-4 animate-in slide-in-from-top-4 duration-500">
            <Alert variant={syncError ? 'destructive' : 'default'} className={`rounded-xl border-2 border-dashed ${syncError ? 'bg-rose-50/50 border-rose-100' : 'bg-emerald-50/50 border-emerald-100'} p-5`}>
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${syncError ? 'bg-white text-rose-600' : 'bg-white text-emerald-600'}`}>
                  {syncError ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <div className="flex-1">
                  <h5 className={`text-xs font-black uppercase tracking-[0.15em] mb-1 ${syncError ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {syncError ? 'Operasi Gagal' : 'Aktivasi Berhasil Diselesaikan'}
                  </h5>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-normal">
                    {syncError || `Berhasil mendaftarkan ${syncResult?.created} siswa baru. Data akademik kini sinkron dengan Biodata Induk.`}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setSyncResult(null); setSyncError(null); }} className="hover:bg-white/50 rounded-full">
                  <XCircle size={18} className="opacity-40" />
                </Button>
              </div>
            </Alert>
          </div>
        )}

        {/* 4. Loading State */}
        {syncLoading && (
          <div className="p-20 flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="w-32 h-32 relative mb-10 group">
               <div className="absolute inset-0 rounded-3xl border-8 border-blue-500/10 border-t-blue-600 animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center text-blue-600 drop-shadow-sm">
                 <RefreshCw size={50} className="animate-spin duration-1000" />
               </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-4">Aktivasi Data...</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center max-w-md leading-relaxed opacity-80">
              Sistem sedang melakukan sinkronisasi data bio-akademik siswa secara massal. Harap tetap berada di halaman ini hingga proses selesai.
            </p>
          </div>
        )}

        <div className="flex-1 bg-transparent">
          <Table
            columns={columns}
            data={filteredSiswas}
            loading={loading}
            emptyMessage="Tidak ada data siswa ditemukan untuk kriteria ini."
            compact={true}
            className="border-none"
            selectedRowKeys={selectedIds}
            onSelectedRowKeysChange={setSelectedIds}
            toolbarLeft={toolbarLeft}
            toolbarRight={toolbarRight}
            pagination={{
              currentPage,
              totalPages,
              totalItems: siswas.length,
              itemsPerPage,
              onLimitChange: (limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              },
              onPageChange: fetchSiswas,
            }}
          />
        </div>
      </div>

      <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader size="lg" /></div>}>
        <Modal 
          isOpen={historyOpen} 
          onClose={() => setHistoryOpen(false)} 
          title={
            <div className="flex items-center gap-3">
               <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600">
                  <History size={20} />
               </div>
               <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Riwayat Akademik Siswa</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Snapshot Semesteral History</p>
               </div>
            </div>
          } 
          size="lg"
        >
          <div className="mt-4">
            {historySiswaId && <SiswaHistory siswaId={historySiswaId} />}
          </div>
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
};

export default RegistrasiSiswaPage;
