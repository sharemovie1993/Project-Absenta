import React, { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Search, 
  History, 
  Users, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, type Column } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { Loader } from '@/components/ui/Loader';
import Tooltip from '@/components/ui/Tooltip';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import type { Siswa, TahunPelajaran, Semester, Kelas } from '@/types/academic';
import { 
  getSiswaList, 
  syncSiswaAkademik, 
  getAcademicRegistrationStats, 
  checkAcademicStatus,
  type AcademicStatusResult
} from '@/api/academic/siswa.api';
import { 
  getKelasForDropdown, 
  getActiveTahunPelajaran, 
  getActiveSemester, 
  getTahunPelajaranForDropdown, 
  getSemesterByTahunPelajaranForDropdown 
} from '@/api/dropdown.api';

// Internal Components
import { RegistrationPeriodControl } from '@/components/academic/registrasi-siswa/RegistrationPeriodControl';
import { RegistrationSyncCard } from '@/components/academic/registrasi-siswa/RegistrationSyncCard';
import { RegistrationSyncResult } from '@/components/academic/registrasi-siswa/RegistrationSyncResult';

// Lazy Loaded Modal
const Modal = lazy(() => import('@/components/ui/Modal').then(module => ({ default: module.Modal })));
const SiswaHistory = lazy(() => import('@/components/academic/siswa/SiswaHistory').then(module => ({ default: module.SiswaHistory })));

export const RegistrasiSiswaPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();

  const canManage = useMemo(() => can('academic.students.update') || can('academic.students.manage'), [can]);
  const canView = useMemo(() => can('academic.students.view.list'), [can]);

  // Data States
  const [siswas, setSiswas] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Filter States
  const [kelasOptions, setKelasOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREGISTERED' | 'REGISTERED'>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalStudents, setTotalStudents] = useState<number>(0);

  // Academic Period Context
  const [activeYear, setActiveYear] = useState<TahunPelajaran | null>(null);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [yearOptions, setYearOptions] = useState<{ value: string; label: string }[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  // Academic Status Check Map
  const [checkingMap, setCheckingMap] = useState<Record<string, AcademicStatusResult | string | null>>({});
  const [checkingLoading, setCheckingLoading] = useState<boolean>(false);

  // Sync Operations
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [syncSingleLoading, setSyncSingleLoading] = useState<Record<string, boolean>>({});
  const [syncResult, setSyncResult] = useState<{ created: number; skipped: number; total: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Selection & Modal States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [historySiswaId, setHistorySiswaId] = useState<string | null>(null);
  const [historySiswaNama, setHistorySiswaNama] = useState<string>('');

  // Global Registration Statistics
  const [globalStats, setGlobalStats] = useState<{ registered: number; total_active: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);

  const isActiveContext = useMemo(() => {
    if (!activeYear || !activeSemester) return true;
    return selectedYearId === activeYear.id && selectedSemesterId === activeSemester.id;
  }, [activeYear, activeSemester, selectedYearId, selectedSemesterId]);

  // Load Active Academic Period Reference
  const loadPeriodReferences = useCallback(async () => {
    try {
      const [years, activeY, activeS] = await Promise.all([
        getTahunPelajaranForDropdown(),
        getActiveTahunPelajaran(),
        getActiveSemester()
      ]);

      // getTahunPelajaranForDropdown returns DropdownOption[] ({ value, label })
      const normalizedYears = Array.isArray(years) ? years.map((y: any) => ({
        value: String(y.value || y.id || ''),
        label: String(y.label || y.tahun || '')
      })).filter(y => Boolean(y.value)) : [];

      setYearOptions(normalizedYears);
      setActiveYear(activeY);
      setActiveSemester(activeS);

      const targetYearId = activeY?.id || (normalizedYears.length > 0 ? normalizedYears[0].value : '');
      const targetSemId = activeS?.id || '';

      if (targetYearId) {
        setSelectedYearId(targetYearId);
        const sems = await getSemesterByTahunPelajaranForDropdown(targetYearId);
        const normalizedSems = Array.isArray(sems) ? sems.map((s: any) => ({
          value: String(s.value || s.id || ''),
          label: String(s.label || s.nama_semester || '')
        })).filter(s => Boolean(s.value)) : [];
        setSemesterOptions(normalizedSems);

        if (targetSemId && normalizedSems.some(s => s.value === targetSemId)) {
          setSelectedSemesterId(targetSemId);
        } else if (normalizedSems.length > 0) {
          setSelectedSemesterId(normalizedSems[0].value);
        }
      }
    } catch (e: unknown) {
      console.error('Failed to load period references:', e);
      toast.error('Gagal memuat referensi periode akademik.');
    }
  }, []);

  // Update semester options when year changes
  const handleYearChange = useCallback(async (yearId: string) => {
    setSelectedYearId(yearId);
    if (!yearId) return;
    try {
      const sems = await getSemesterByTahunPelajaranForDropdown(yearId);
      const normalizedSems = Array.isArray(sems) ? sems.map((s: any) => ({
        value: String(s.value || s.id || ''),
        label: String(s.label || s.nama_semester || '')
      })).filter(s => Boolean(s.value)) : [];
      setSemesterOptions(normalizedSems);
      if (normalizedSems.length > 0) {
        setSelectedSemesterId(normalizedSems[0].value);
      }
    } catch (err) {
      console.error('Failed to load semesters for year:', err);
    }
  }, []);

  // Fetch Class Options
  useEffect(() => {
    getKelasForDropdown()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.data || []);
        setKelasOptions([
          { value: '', label: 'Semua Kelas (Seluruh Rombel)' },
          ...list.map((k: any) => ({
            value: String(k.value || k.id || ''),
            label: String(k.label || k.nama_kelas || '')
          })).filter(k => Boolean(k.value))
        ]);
      })
      .catch(console.error);
  }, []);

  // Initial Load
  useEffect(() => {
    loadPeriodReferences();
  }, [loadPeriodReferences]);

  // Fetch Global Stats for Current Year & Semester
  const fetchStats = useCallback(async () => {
    if (!selectedYearId || !selectedSemesterId) return;
    try {
      setStatsLoading(true);
      const stats = await getAcademicRegistrationStats(selectedYearId, selectedSemesterId);
      setGlobalStats(stats);
    } catch (e: unknown) {
      console.error('Failed to fetch registration stats:', e);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedYearId, selectedSemesterId]);

  useEffect(() => {
    if (selectedYearId && selectedSemesterId) {
      fetchStats();
    }
  }, [selectedYearId, selectedSemesterId, fetchStats]);

  // Fetch Students & Check Academic Status
  const fetchStudents = useCallback(async () => {
    if (!selectedYearId || !selectedSemesterId) return;
    try {
      setLoading(true);
      const res = await getSiswaList(
        currentPage,
        itemsPerPage,
        debouncedSearchTerm,
        selectedKelasId || '',
        'AKTIF' // Only verify active students
      );

      const studentList = res?.data || [];
      setSiswas(studentList);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalStudents(res?.pagination?.total || 0);

      // Verify academic enrollment for loaded students
      if (studentList.length > 0) {
        setCheckingLoading(true);
        const ids = studentList.map(s => s.id);
        const statusMap = await checkAcademicStatus(ids, selectedYearId, selectedSemesterId);
        setCheckingMap(statusMap);
        setCheckingLoading(false);
      } else {
        setCheckingMap({});
      }
    } catch (e: unknown) {
      console.error('Failed to load students:', e);
      toast.error('Gagal memuat daftar siswa.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, selectedKelasId, selectedYearId, selectedSemesterId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Mass Academic Sync
  const handleMassSync = async () => {
    if (!selectedYearId || !selectedSemesterId) {
      toast.error('Pilih Tahun Pelajaran dan Semester terlebih dahulu.');
      return;
    }

    try {
      setSyncLoading(true);
      setSyncError(null);
      const res = await syncSiswaAkademik(selectedKelasId || undefined, {
        tahun_pelajaran_id: selectedYearId,
        semester_id: selectedSemesterId,
      });

      if (res?.success) {
        setSyncResult(res.data);
        toast.success(res.message || 'Sinkronisasi SiswaAkademik berhasil!');
        fetchStats();
        fetchStudents();
        setSelectedIds(new Set());
      } else {
        setSyncError(res?.message || 'Sinkronisasi gagal');
        toast.error(res?.message || 'Gagal sinkronisasi data.');
      }
    } catch (e: any) {
      const msg = e?.message || 'Terjadi kesalahan sistem saat sinkronisasi.';
      setSyncError(msg);
      toast.error(msg);
    } finally {
      setSyncLoading(false);
    }
  };

  // Sync Selected Students
  const handleSyncSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('Pilih minimal satu siswa.');
      return;
    }

    try {
      setSyncLoading(true);
      setSyncError(null);
      const res = await syncSiswaAkademik(undefined, {
        tahun_pelajaran_id: selectedYearId,
        semester_id: selectedSemesterId,
        siswa_ids: Array.from(selectedIds),
      });

      if (res?.success) {
        toast.success(`Berhasil mengaktivasi ${selectedIds.size} siswa terpilih!`);
        setSelectedIds(new Set());
        fetchStats();
        fetchStudents();
      } else {
        toast.error(res?.message || 'Gagal mengaktivasi siswa terpilih.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Gagal aktivasi data.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Sync Single Student
  const handleSyncSingle = async (siswaId: string, nama: string) => {
    try {
      setSyncSingleLoading(prev => ({ ...prev, [siswaId]: true }));
      const res = await syncSiswaAkademik(undefined, {
        tahun_pelajaran_id: selectedYearId,
        semester_id: selectedSemesterId,
        siswa_id: siswaId,
      });

      if (res?.success) {
        toast.success(`Siswa ${nama} berhasil didaftarkan ke SiswaAkademik!`);
        fetchStats();
        fetchStudents();
      } else {
        toast.error(res?.message || 'Gagal mendaftarkan siswa.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Gagal aktivasi siswa.');
    } finally {
      setSyncSingleLoading(prev => ({ ...prev, [siswaId]: false }));
    }
  };

  // Open Student Academic History Modal
  const handleOpenHistory = (siswa: Siswa) => {
    setHistorySiswaId(siswa.id);
    setHistorySiswaNama(siswa.nama_siswa);
    setHistoryOpen(true);
  };

  // Filtered Students (Client-side tab filtering based on checkingMap status)
  const filteredStudents = useMemo(() => {
    return siswas.filter(s => {
      const entry = checkingMap[s.id];
      const isRegistered = Boolean(entry);

      if (statusFilter === 'UNREGISTERED') return !isRegistered;
      if (statusFilter === 'REGISTERED') return isRegistered;
      return true;
    });
  }, [siswas, checkingMap, statusFilter]);

  // Status Summary Numbers
  const totalActiveMaster = globalStats?.total_active ?? totalStudents;
  const totalRegistered = globalStats?.registered ?? 0;
  const totalUnregistered = Math.max(0, totalActiveMaster - totalRegistered);
  const completionPercentage = totalActiveMaster > 0 
    ? Math.min(100, Math.round((totalRegistered / totalActiveMaster) * 100)) 
    : 100;
  const needsSync = totalUnregistered > 0;

  // Stat Cards for Layout Header
  const statCards = useMemo(() => [
    {
      title: "Total Siswa Aktif",
      value: `${totalActiveMaster} Siswa`,
      icon: <Users size={16} />,
      gradient: "from-blue-600 to-indigo-600",
      subtitle: "Master Biodata Pokok"
    },
    {
      title: "Terdaftar di Siswa Akademik",
      value: `${totalRegistered} Siswa`,
      icon: <UserCheck size={16} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: `Periode ${selectedYearId ? 'Terpilih' : 'Aktif'}`
    },
    {
      title: "Belum Terdaftar",
      value: `${totalUnregistered} Siswa`,
      icon: <UserX size={16} />,
      gradient: totalUnregistered > 0 ? "from-rose-500 to-amber-600" : "from-slate-500 to-slate-700",
      subtitle: totalUnregistered > 0 ? "Perlu Sinkronisasi Massal" : "Semua Siswa Terpetakan"
    },
    {
      title: "Kelengkapan Registrasi",
      value: `${completionPercentage}%`,
      icon: <Sparkles size={16} />,
      gradient: completionPercentage >= 95 ? "from-emerald-600 to-cyan-600" : "from-amber-500 to-orange-600",
      subtitle: `${completionPercentage}% Terdaftar di KBM & Rapor`
    }
  ], [totalActiveMaster, totalRegistered, totalUnregistered, completionPercentage, selectedYearId]);

  // Table Columns Definition conforming to Table.tsx Column interface (key, label, render)
  const columns = useMemo<Column[]>(() => [
    {
      key: 'no',
      label: 'No.',
      className: 'w-12 text-center text-xs font-bold text-slate-400',
      render: (_val: any, _row: any, index: number) => (
        <span>{(currentPage - 1) * itemsPerPage + index + 1}</span>
      )
    },
    {
      key: 'nama_siswa',
      label: 'Identitas Siswa',
      className: 'min-w-[240px]',
      render: (_val: any, siswa: Siswa) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-xs shrink-0 border border-slate-200/60 dark:border-slate-700">
            {siswa.nama_siswa?.charAt(0) || 'S'}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-xs tracking-tight">
              {siswa.nama_siswa}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-medium text-slate-500">
              <span>NIS: <strong className="text-slate-700 dark:text-slate-300">{siswa.nis || '-'}</strong></span>
              {siswa.nisn && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>NISN: {siswa.nisn}</span>
                </>
              )}
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">{siswa.jenis_kelamin || 'L'}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'kelas',
      label: 'Kelas Master',
      className: 'w-36',
      render: (_val: any, siswa: Siswa) => (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            {siswa.Kelas?.nama_kelas || 'Tanpa Kelas'}
          </Badge>
        </div>
      )
    },
    {
      key: 'status_akademik',
      label: 'Status Siswa Akademik',
      className: 'min-w-[220px]',
      render: (_val: any, siswa: Siswa) => {
        if (checkingLoading) {
          return (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Loader size="sm" />
              <span>Memeriksa...</span>
            </div>
          );
        }

        const entry = checkingMap[siswa.id];
        const isRegistered = Boolean(entry);
        const registeredClass = typeof entry === 'object' && entry !== null ? entry.nama_kelas : null;
        const masterClass = siswa.Kelas?.nama_kelas;
        const hasClassMismatch = isRegistered && registeredClass && masterClass && registeredClass !== masterClass;

        if (isRegistered) {
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                  TERDAFTAR
                </span>
                {registeredClass && (
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Rombel: <strong>{registeredClass}</strong>
                  </span>
                )}
              </div>
              {hasClassMismatch && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={11} />
                  <span>Beda rombel (Master: {masterClass})</span>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-0.5">
            <span className="w-fit inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
              <XCircle size={12} className="text-rose-600 dark:text-rose-400" />
              BELUM TERDAFTAR
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              Tidak akan muncul di Presensi & Rapor
            </span>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status Biodata',
      className: 'w-28 text-center',
      render: (_val: any, siswa: Siswa) => (
        <Badge variant={siswa.status === 'AKTIF' ? 'default' : 'secondary'} className="text-[10px] font-black">
          {siswa.status || 'AKTIF'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi & Tindakan',
      className: 'w-44 text-right',
      render: (_val: any, siswa: Siswa) => {
        const entry = checkingMap[siswa.id];
        const isRegistered = Boolean(entry);
        const isThisSyncing = syncSingleLoading[siswa.id] || false;

        return (
          <div className="flex items-center justify-end gap-1.5">
            {!isRegistered && canManage && (
              <Button
                size="sm"
                onClick={() => handleSyncSingle(siswa.id, siswa.nama_siswa)}
                disabled={isThisSyncing}
                className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1 rounded-lg shadow-sm"
              >
                {isThisSyncing ? <Loader size="sm" /> : <CheckCircle2 size={13} />}
                Daftarkan
              </Button>
            )}

            <Tooltip content="Lihat riwayat semester & kenaikan kelas siswa ini">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenHistory(siswa)}
                className="h-8 px-2.5 text-slate-700 dark:text-slate-300 font-bold text-[11px] gap-1 rounded-lg"
              >
                <History size={13} />
                Riwayat
              </Button>
            </Tooltip>
          </div>
        );
      }
    }
  ], [currentPage, itemsPerPage, checkingLoading, checkingMap, canManage, syncSingleLoading]);

  // Toolbar Component for Table Left (Status filter tabs)
  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            statusFilter === 'ALL'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Semua ({siswas.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('UNREGISTERED')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
            statusFilter === 'UNREGISTERED'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          }`}
        >
          <span>Belum Terdaftar</span>
          {totalUnregistered > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              statusFilter === 'UNREGISTERED' ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'
            }`}>
              {totalUnregistered}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('REGISTERED')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
            statusFilter === 'REGISTERED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          <span>Terdaftar</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
            statusFilter === 'REGISTERED' ? 'bg-white text-emerald-600' : 'bg-emerald-600 text-white'
          }`}>
            {totalRegistered}
          </span>
        </button>
      </div>

      {selectedIds.size > 0 && canManage && (
        <Button
          size="sm"
          onClick={handleSyncSelected}
          disabled={syncLoading}
          className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
        >
          {syncLoading ? <Loader size="sm" /> : <CheckCircle2 size={13} />}
          Aktivasi {selectedIds.size} Siswa Terpilih
        </Button>
      )}
    </div>
  );

  // Toolbar Component for Table Right (Search & Class Filter)
  const toolbarRight = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-56">
        <SearchableSelect
          value={selectedKelasId}
          onValueChange={(val) => {
            setSelectedKelasId(val);
            setCurrentPage(1);
          }}
          options={kelasOptions}
          placeholder="Filter Kelas"
          triggerClassName="h-9 text-xs font-medium"
        />
      </div>

      <div className="w-60">
        <DebouncedSearchInput
          placeholder="Cari NIS, NISN, Nama..."
          aria-label="Cari Siswa"
          value={searchTerm}
          onChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
          isLoading={loading}
          className="w-full"
          inputClassName="h-9 text-xs rounded-xl"
        />
      </div>

      <Tooltip content="Segarkan data status akademik">
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            fetchStats();
            fetchStudents();
          }}
          disabled={loading || checkingLoading}
          className="h-9 w-9 rounded-xl text-slate-600"
        >
          <RefreshCw size={14} className={loading || checkingLoading ? 'animate-spin' : ''} />
        </Button>
      </Tooltip>
    </div>
  );

  return (
    <AcademicPageLayout
      title="Keberadaan Siswa di Siswa Akademik"
      description="Verifikasi ketersediaan snapshot siswa di tabel SiswaAkademik per tahun ajaran dan semester. Menjamin kehadiran siswa di Terminal Presensi, Jurnal Guru, CBT, dan Rapor."
      breadcrumbs={[
        { label: 'Data Master', path: '/academic' },
        { label: 'Data Siswa', path: '/academic/siswa' },
        { label: 'Keberadaan Siswa Akademik' }
      ]}
      stats={statCards}
      isLoadingStats={statsLoading}
      canView={canView}
      isLoading={authLoading}
      instruction={{
        title: "Panduan Audit Siswa Akademik",
        description: (
          <div className="space-y-2 text-xs">
            <p>
              Tabel <strong>SiswaAkademik</strong> merupakan jembatan legal semesteran yang menghubungkan Biodata Induk Siswa dengan KBM harian, Terminal Presensi, Penilaian E-Rapor, dan Ketarunaan.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Kenapa Siswa Harus Ada di SiswaAkademik?</strong> Jika siswa hanya ada di master biodata namun belum ada di SiswaAkademik pada semester aktif, nama mereka tidak akan muncul saat guru mengabsen atau mengisi nilai rapor.</p>
              <p><strong>Langkah Aktivasi:</strong> Klik tombol <em>Mulai Aktivasi Massal</em> untuk mendaftarkan semua siswa aktif ke semester terpilih secara otomatis.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Pilih Tahun Pelajaran dan Semester yang ingin diaudit pada kontrol periode di atas." },
          { text: "Periksa tab 'Belum Terdaftar' untuk melihat siswa yang belum memiliki record akademik." },
          { text: "Gunakan 'Mulai Aktivasi Massal' atau klik tombol 'Daftarkan' pada baris siswa untuk sinkronisasi instan." }
        ]
      }}
      hardeningModuleKey="registrasisiswapage"
    >
      <div className="flex flex-col bg-transparent space-y-4">
        {/* Period Control Bar */}
        <RegistrationPeriodControl
          selectedYearId={selectedYearId}
          setSelectedYearId={handleYearChange}
          yearOptions={yearOptions}
          selectedSemesterId={selectedSemesterId}
          setSelectedSemesterId={setSelectedSemesterId}
          semesterOptions={semesterOptions}
          isActiveContext={isActiveContext}
          filteredCount={filteredStudents.length}
          totalCount={totalStudents}
        />

        {/* Sync Alert Banner if there are unregistered students */}
        <RegistrationSyncCard
          needsSync={needsSync}
          unregisteredCount={totalUnregistered}
          onSync={handleMassSync}
          syncLoading={syncLoading}
        />

        {/* Sync Result Banner */}
        <RegistrationSyncResult
          syncResult={syncResult}
          syncError={syncError}
          onClear={() => {
            setSyncResult(null);
            setSyncError(null);
          }}
        />

        {/* Main Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-hidden shadow-sm">
          <Table
            columns={columns}
            data={filteredStudents}
            loading={loading}
            emptyMessage={
              statusFilter === 'UNREGISTERED'
                ? "Luar biasa! Tidak ada siswa yang belum terdaftar. Seluruh siswa aktif sudah masuk ke SiswaAkademik."
                : "Tidak ada data siswa ditemukan untuk kriteria pencarian ini."
            }
            compact={true}
            className="border-none"
            selectedRowKeys={selectedIds}
            onSelectedRowKeysChange={setSelectedIds}
            toolbarLeft={toolbarLeft}
            toolbarRight={toolbarRight}
            pagination={{
              currentPage,
              totalPages,
              totalItems: totalStudents,
              itemsPerPage,
              onLimitChange: (limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              },
              onPageChange: (page) => {
                setCurrentPage(page);
              },
            }}
          />
        </div>
      </div>

      {/* Student Academic History Modal */}
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
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Riwayat Akademik Siswa
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  {historySiswaNama}
                </p>
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
