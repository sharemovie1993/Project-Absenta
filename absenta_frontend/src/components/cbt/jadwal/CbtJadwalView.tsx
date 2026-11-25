import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Badge,
  Table,
} from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import {
  Plus,
  Calendar,
  Clock,
  Play,
  Pause,
  CheckCircle,
  RotateCw,
  Printer,
  Activity,
  Copy,
  Edit2,
  Trash2,
  ShieldCheck,
  Check,
  ArrowRightLeft,
  Lock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CornerDownRight,
  Sparkles,
  Users,
  GitBranch,
  BookOpen,
} from 'lucide-react';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import { useCbtOperationMode } from '../cbtModeHelper';
import { CbtJadwalFormModal } from './CbtJadwalFormModal';
import { CbtBeritaAcaraPrintModal } from './CbtBeritaAcaraPrintModal';
import { CbtTransferNilaiModal } from './CbtTransferNilaiModal';
import { CbtRemedialModal } from './CbtRemedialModal';
import { CbtProctorMonitoringView } from '../sesi/CbtProctorMonitoringView';
import { CbtPanitiaOrchestratorView } from './CbtPanitiaOrchestratorView';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
import { formatLocalTimeFromISO, getTimezone, getTimezoneLabel } from '@/utils/attendance/time';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

export interface UniversalCbtJadwalViewProps {
  guruId?: string;
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;
  onNavigateMonitor?: (jadwalId: string) => void;
  onClose?: () => void;
}

export const CbtJadwalView: React.FC<UniversalCbtJadwalViewProps> = React.memo(({
  guruId,
  readOnly = false,
  onNavigateMonitor,
}) => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const { user } = useAuthStore();
  const roleName = String(user?.role?.name || '').toUpperCase();
  const authGuruId = (user as any)?.guru_profile?.id || (user as any)?.guru_id;
  const currentGuruId = guruId || authGuruId;
  const currentUserId = user?.id;

  const isPrivilegedPanitia = [
    'ADMIN',
    'SUPERADMIN',
    'KEPALA_SEKOLAH',
    'WAKIL_KURIKULUM',
    'KURIKULUM',
    'PANITIA_CBT',
    'ADMIN_CBT',
  ].includes(roleName);

  const { isOrkestrasi, eventName, lockTeacherScheduling } = useCbtOperationMode();
  const isTeacherLocked = Boolean(currentGuruId) && isOrkestrasi && lockTeacherScheduling;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isRemedialModalOpen, setIsRemedialModalOpen] = useState(false);
  const [selectedJadwal, setSelectedJadwal] = useState<CbtJadwalUjian | null>(null);
  const [remedialJadwal, setRemedialJadwal] = useState<CbtJadwalUjian | null>(null);
  const [internalMonitorJadwalId, setInternalMonitorJadwalId] = useState<string | null>(null);
  const [isOrchestratorOpen, setIsOrchestratorOpen] = useState(false);

  const handleOpenMonitor = (jadwalId: string) => {
    if (onNavigateMonitor) {
      onNavigateMonitor(jadwalId);
    } else {
      setInternalMonitorJadwalId(jadwalId);
    }
  };

  // 1. Unified Filter Hook
  const filter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableSearch: true,
    searchDebounceMs: 400,
    onFilterChange: () => setPage(1),
  });

  // 2. Fetch Jadwal Data
  const { data, isLoading } = useQuery({
    queryKey: cbtQueryKeys.jadwal({
      page,
      limit,
      search: filter.debouncedSearchQuery,
      guru_id: guruId,
    }),
    queryFn: () =>
      cbtApi.getJadwalList({
        page,
        limit,
        search: filter.debouncedSearchQuery,
        guru_id: guruId,
      }),
  });

  const items = data?.items || [];
  const pagination = data?.pagination;

  const [sessionFilter, setSessionFilter] = useState<'all' | 'main' | 'remedial'>('all');
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [hasInitializedExpanded, setHasInitializedExpanded] = useState(false);
  const [collapsedMapels, setCollapsedMapels] = useState<Set<string>>(new Set());

  const toggleMapelGroup = (mapelName: string) => {
    setCollapsedMapels((prev) => {
      const next = new Set(prev);
      if (next.has(mapelName)) next.delete(mapelName);
      else next.add(mapelName);
      return next;
    });
  };

  // Auto-expand all parents that have remedial children on data load
  useEffect(() => {
    if (!hasInitializedExpanded && items.length > 0) {
      const parentIdsWithRemedial = new Set<string>();
      items.forEach((item) => {
        const isRemedial = Boolean((item.setting_keamanan as any)?.is_remedial || item.nama_sesi?.startsWith('[REMEDIAL]'));
        if (isRemedial) {
          const pId = (item.setting_keamanan as any)?.parent_jadwal_id;
          if (pId) parentIdsWithRemedial.add(pId);
        }
      });
      if (parentIdsWithRemedial.size > 0) {
        setExpandedParents(parentIdsWithRemedial);
      }
      setHasInitializedExpanded(true);
    }
  }, [items, hasInitializedExpanded]);

  const toggleExpandParent = (parentId: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  // SSOT Struktur Hirarki Tree (Sesi Utama -> Anak Sesi Remedial)
  const { flattenedData, totalMainCount, totalRemedialCount } = useMemo(() => {
    const childrenMap = new Map<string, CbtJadwalUjian[]>();
    const childIds = new Set<string>();
    let remedialCount = 0;

    // 1. Petakan sesi remedial ke sesi induknya
    items.forEach((item) => {
      const isRemedial = Boolean((item.setting_keamanan as any)?.is_remedial || item.nama_sesi?.startsWith('[REMEDIAL]'));
      if (isRemedial) {
        remedialCount++;
        const parentId = (item.setting_keamanan as any)?.parent_jadwal_id;
        if (parentId && items.some((p) => p.id === parentId)) {
          if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
          childrenMap.get(parentId)!.push(item);
          childIds.add(item.id);
          return;
        }

        // Fallback matching: Cocokkan via bank_soal_id dan nama bersih
        const cleanName = item.nama_sesi.replace(/^\[REMEDIAL\]\s*/i, '').trim();
        const matchedParent = items.find(
          (p) =>
            !childIds.has(p.id) &&
            p.id !== item.id &&
            !p.nama_sesi?.startsWith('[REMEDIAL]') &&
            !(p.setting_keamanan as any)?.is_remedial &&
            (p.nama_sesi === cleanName || p.bank_soal_id === item.bank_soal_id)
        );
        if (matchedParent) {
          if (!childrenMap.has(matchedParent.id)) childrenMap.set(matchedParent.id, []);
          childrenMap.get(matchedParent.id)!.push(item);
          childIds.add(item.id);
          return;
        }
      }
    });

    // 2. Bangun urutan baris bertingkat (Sesi Utama langsung diikuti anak remedialnya)
    const getMapelName = (item: any) =>
      item?.BankSoal?.Mapel?.nama_mapel || item?.BankSoal?.judul || 'Mata Pelajaran Lainnya';

    const getKelasSortKey = (item: any) => {
      const cfg = (item?.setting_keamanan as any) || {};
      if (cfg.rombel_nama) return String(cfg.rombel_nama);
      if (cfg.kelas_nama) return String(cfg.kelas_nama);
      const match = String(item?.nama_sesi || '').match(/\(([^)-]+?)(?:\s*-\s*[^)]*)?\)/);
      if (match?.[1]) return match[1].trim();
      return String(item?.nama_sesi || '');
    };

    const parentItems = items.filter((item) => !childIds.has(item.id));
    if (guruId) {
      parentItems.sort((a, b) => {
        const mCmp = getMapelName(a).localeCompare(getMapelName(b), 'id', { sensitivity: 'base' });
        if (mCmp !== 0) return mCmp;
        return getKelasSortKey(a).localeCompare(getKelasSortKey(b), 'id', { numeric: true, sensitivity: 'base' });
      });
    }

    const result: any[] = [];
    let mainCount = 0;

    parentItems.forEach((item) => {
      const children = childrenMap.get(item.id) || [];
      if (guruId && children.length > 1) {
        children.sort((a, b) =>
          getKelasSortKey(a).localeCompare(getKelasSortKey(b), 'id', { numeric: true, sensitivity: 'base' })
        );
      }
      const hasChildren = children.length > 0;
      const isExpanded = expandedParents.has(item.id);
      mainCount++;

      result.push({
        ...item,
        _isParent: hasChildren,
        _childCount: children.length,
        _isExpanded: isExpanded,
        _mapelGroup: getMapelName(item),
      });

      if (hasChildren && isExpanded) {
        children.forEach((child, childIdx) => {
          result.push({
            ...child,
            _isChildRow: true,
            _parentId: item.id,
            _parentName: item.nama_sesi,
            _isLastChild: childIdx === children.length - 1,
            _mapelGroup: getMapelName(item),
          });
        });
      }
    });

    return {
      flattenedData: result,
      totalMainCount: mainCount,
      totalRemedialCount: remedialCount,
    };
  }, [items, expandedParents, guruId]);

  const displayData = useMemo(() => {
    if (sessionFilter === 'main') {
      return flattenedData.filter((d: any) => !d._isChildRow && !(d.setting_keamanan as any)?.is_remedial);
    }
    if (sessionFilter === 'remedial') {
      return flattenedData.filter((d: any) => d._isChildRow || (d.setting_keamanan as any)?.is_remedial);
    }
    return flattenedData;
  }, [flattenedData, sessionFilter]);

  const groupedDisplayData = useMemo(() => {
    if (!guruId) return [];
    const groups = new Map<string, any[]>();
    displayData.forEach((row: any) => {
      const key = row._mapelGroup || row?.BankSoal?.Mapel?.nama_mapel || 'Mata Pelajaran Lainnya';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    });
    return Array.from(groups.entries()).map(([mapelName, rows]) => ({
      mapelName,
      rows,
    }));
  }, [displayData, guruId]);

  // Copy token helper
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast.success(`Token ujian "${token}" disalin ke clipboard`);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Mutations
  const activateMutation = useMutation({
    mutationFn: (id: string) => cbtApi.activateJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian aktif & bundle soal berhasil di-cache ke Redis!');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.jadwal(), exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mengaktifkan ujian'),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => cbtApi.pauseJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian dijeda');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.jadwal(), exact: false, refetchType: 'all' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => cbtApi.completeJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian diselesaikan');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.jadwal(), exact: false, refetchType: 'all' });
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: (id: string) => cbtApi.regenerateToken(id),
    onSuccess: async (res) => {
      toast.success(`Token baru berhasil dirilis: ${res.token_ujian}`);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.jadwal(), exact: false, refetchType: 'all' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cbtApi.deleteJadwal(id),
    onSuccess: async () => {
      toast.success('Jadwal ujian berhasil dihapus');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menghapus jadwal'),
  });

  const handleDeleteJadwal = async (jdw: CbtJadwalUjian) => {
    const isConfirmed = await confirm({
      title: 'Hapus Jadwal Ujian?',
      message: `Jadwal "${jdw.nama_sesi}" beserta seluruh data peserta akan dihapus secara permanen. Lanjutkan?`,
      confirmText: 'Ya, Hapus Permanen',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (isConfirmed) deleteMutation.mutate(jdw.id);
  };

  const handleActivate = async (jdw: CbtJadwalUjian) => {
    const isConfirmed = await confirm({
      title: 'Aktifkan Sesi Ujian?',
      message: `Sesi "${jdw.nama_sesi}" akan dibuka untuk siswa dengan token ${jdw.token_ujian}. Bundle soal akan dimuat ke Redis in-memory cache.`,
      confirmText: 'Aktifkan Sekarang',
      cancelText: 'Batal',
      style: 'primary',
    });
    if (isConfirmed) activateMutation.mutate(jdw.id);
  };

  const handleComplete = async (jdw: CbtJadwalUjian) => {
    const isConfirmed = await confirm({
      title: 'Selesaikan Sesi Ujian?',
      message: `Sesi "${jdw.nama_sesi}" akan ditutup permanen. Siswa yang belum mengumpulkan jawaban tidak dapat melanjutkan ujian lagi.`,
      confirmText: 'Ya, Selesaikan Sesi',
      cancelText: 'Batal',
      style: 'warning',
    });
    if (isConfirmed) completeMutation.mutate(jdw.id);
  };

  // Table Columns
  const columns: Column[] = useMemo(
    () => [
      {
        key: 'sesi',
        title: 'Sesi Ujian',
        label: 'Sesi Ujian',
        className: 'min-w-[200px]',
        render: (_val: unknown, row: CbtJadwalUjian) => {
          const autoRapor = row.setting_keamanan?.auto_transfer_rapor;
          const targetSlot = row.setting_keamanan?.target_rapor_slot;
          const slotLabel =
            targetSlot === 'sumatif_1'
              ? 'SUM 1'
              : targetSlot === 'sumatif_2'
              ? 'SUM 2'
              : targetSlot === 'sumatif_3'
              ? 'SUM 3'
              : targetSlot === 'sumatif_4'
              ? 'SUM 4'
              : targetSlot === 'sumatif_akhir'
              ? 'SUM AKHIR'
              : null;

          const isOwner =
            !guruId ||
            row.BankSoal?.guru_id === guruId ||
            row.setting_keamanan?.created_by_guru_id === guruId;
          const isProktorDuty =
            Boolean(guruId) &&
            !isOwner &&
            (row.setting_keamanan?.proktor_id === guruId ||
              row.setting_keamanan?.pengawas_2_id === guruId);
          const isPengawasDuty =
            Boolean(guruId) &&
            !isOwner &&
            !isProktorDuty &&
            row.setting_keamanan?.pengawas_1_id === guruId;
          const ruangUjian = row.setting_keamanan?.ruang_ujian;
          const pengawas1Nama = row.setting_keamanan?.pengawas_1_nama;
          const proktorNama = row.setting_keamanan?.proktor_nama || row.setting_keamanan?.pengawas_2_nama;

          if (row._isChildRow) {
            const isSusulanChild = (row.nama_sesi || '').toLowerCase().includes('susulan');
            const targetCount = row.setting_keamanan?.target_siswa_ids?.length || (row as any)._count?.Peserta || 0;
            const policyText = row.setting_keamanan?.remedial_policy
              ? String(row.setting_keamanan.remedial_policy).replace('_', ' ')
              : 'Max KKTP';

            return (
              <div className="flex items-start gap-2.5 pl-3 sm:pl-6 py-0.5">
                <div className="flex items-center text-slate-400 dark:text-slate-500 select-none shrink-0 pt-0.5">
                  <CornerDownRight size={13} className="text-slate-400 dark:text-slate-500" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                      <Sparkles size={9} />
                      <span>{isSusulanChild ? 'Remedial & Susulan' : 'Sesi Remedial'}</span>
                    </span>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">
                      {row.nama_sesi}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                    <span>{targetCount} Siswa Terdaftar</span>
                    <span>•</span>
                    <span className="capitalize">Kebijakan: {policyText}</span>
                    {row.setting_keamanan?.ruang_ujian && (
                      <>
                        <span>•</span>
                        <span>{row.setting_keamanan.ruang_ujian}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                  {row.nama_sesi}
                </span>

                {/* Indikator & Toggle Buka/Tutup Anak Sesi Remedial / Susulan */}
                {row._isParent && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpandParent(row.id);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-all shadow-2xs",
                      row._isExpanded
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
                    )}
                    title={row._isExpanded ? "Sembunyikan Sesi Lanjutan" : "Tampilkan Sesi Lanjutan (Remedial & Susulan)"}
                  >
                    <GitBranch size={10} className="text-indigo-500 shrink-0" />
                    <span>{row._childCount} Sesi Lanjutan</span>
                    <ChevronDown
                      size={11}
                      className={cn("transition-transform duration-200 text-slate-400", row._isExpanded && "rotate-180")}
                    />
                  </button>
                )}

                {isProktorDuty && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    title="Anda ditugaskan sebagai Proktor Teknis pada sesi ujian ini"
                  >
                    <ShieldCheck size={9} />
                    <span>Tugas Proktor</span>
                  </span>
                )}
                {isPengawasDuty && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    title="Anda ditugaskan sebagai Pengawas Ruang pada sesi ujian ini"
                  >
                    <ShieldCheck size={9} />
                    <span>Tugas Pengawas</span>
                  </span>
                )}
                {isOwner && autoRapor && slotLabel && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60"
                    title={`Nilai otomatis ditransfer ke kolom ${slotLabel} di e-Rapor`}
                  >
                    <ArrowRightLeft size={9} />
                    <span>Auto → {slotLabel}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                <span className="font-mono">{row.BankSoal?.kode_bank || '-'}</span>
                {ruangUjian && (
                  <>
                    <span>•</span>
                    <span className="text-slate-500 font-medium">{ruangUjian}</span>
                  </>
                )}
                {(pengawas1Nama || proktorNama) && (
                  <>
                    <span>•</span>
                    <span className="text-slate-500 truncate max-w-[180px]" title={`Pengawas: ${pengawas1Nama || '-'} | Proktor: ${proktorNama || '-'}`}>
                      Pengawas: {pengawas1Nama || proktorNama}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'mapel',
        title: 'Mata Pelajaran',
        label: 'Mata Pelajaran',
        className: 'min-w-[170px]',
        render: (_val: unknown, row: CbtJadwalUjian) => {
          const badge = row.kolaborasi_badge || row.BankSoal?.kolaborasi_badge;
          const unitNama = row.BankSoal?.UnitPengajaran?.nama_unit;
          const mapelLabel =
            row.display_mapel ||
            row.BankSoal?.display_mapel ||
            row.BankSoal?.Mapel?.nama_mapel ||
            '-';
          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 line-clamp-1">
                  {mapelLabel}
                </span>
                {badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {badge}
                  </span>
                )}
                {unitNama && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Unit
                  </span>
                )}
              </div>
              {row.BankSoal?.tingkat && (
                <span className="text-[10px] font-bold text-slate-400">
                  Kelas {row.BankSoal.tingkat}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'token',
        title: 'Token Masuk',
        label: 'Token Masuk',
        className: 'min-w-[130px] text-center',
        render: (_val: unknown, row: any) => {
          if (row._isChildRow && row.setting_keamanan?.tokenless) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <span>Bebas Token</span>
              </span>
            );
          }
          return (
            <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-mono text-xs font-black tracking-widest text-indigo-700 dark:text-indigo-300">
                {row.token_ujian}
              </span>
              <button
                type="button"
                onClick={() => handleCopyToken(row.token_ujian)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
                title="Salin Token"
                aria-label={`Salin token ${row.token_ujian}`}
              >
                {copiedToken === row.token_ujian ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
          );
        },
      },
      {
        key: 'status',
        title: 'Status Sesi',
        label: 'Status Sesi',
        className: 'min-w-[130px] text-center',
        render: (_val: unknown, row: CbtJadwalUjian) => {
          if (row.status === 'ACTIVE') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span>AKTIF (BERJALAN)</span>
              </span>
            );
          }
          if (row.status === 'PAUSED') {
            return (
              <Badge variant="warning" className="text-[10px] font-bold">
                DIJEDA
              </Badge>
            );
          }
          if (row.status === 'COMPLETED') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                <CheckCircle size={11} className="stroke-[2.5] text-emerald-600 dark:text-emerald-400" />
                <span>SELESAI</span>
              </span>
            );
          }
          return (
            <Badge variant="outline" className="text-[10px] font-bold">
              DRAFT
            </Badge>
          );
        },
      },
      {
        key: 'waktu',
        title: 'Jadwal & Durasi',
        label: 'Jadwal & Durasi',
        className: 'min-w-[190px]',
        render: (_val: unknown, row: CbtJadwalUjian) => {
          const tgl = new Date(row.tanggal_mulai);
          const tz = getTimezone();
          const tzLabel = getTimezoneLabel(tz);
          const jamMulai = formatLocalTimeFromISO(row.tanggal_mulai);
          const jamSelesai = formatLocalTimeFromISO(row.tanggal_selesai);
          return (
            <div className="space-y-0.5 text-xs">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                {tgl.toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  timeZone: tz,
                })}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock size={11} className="shrink-0" />
                <span>
                  {jamMulai && jamSelesai ? `${jamMulai}–${jamSelesai} ${tzLabel} • ` : ''}
                  {row.durasi_menit} mnt
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'peserta',
        title: 'Peserta Ujian',
        label: 'Peserta Ujian',
        className: 'min-w-[110px] text-center',
        render: (_val: unknown, row: any) => {
          if (row._isChildRow && row.setting_keamanan?.target_siswa_ids) {
            return (
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                {row.setting_keamanan.target_siswa_ids.length} Siswa
              </span>
            );
          }
          return (
            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
              {row._count?.Peserta || 0} Siswa
            </span>
          );
        },
      },
      {
        key: 'aksi',
        title: 'Aksi & Proctor',
        label: 'Aksi & Proctor',
        className: 'min-w-[260px] text-right',
        render: (_val: unknown, row: CbtJadwalUjian) => {
          const pesertaCount = row._count?.Peserta || 0;
          const sec = (row.setting_keamanan as any) || {};
          const p1Id = sec.pengawas_1_id || sec.pengawas_1_guru_id;
          const p2Id = sec.pengawas_2_id || sec.pengawas_2_guru_id;
          const proktorId = sec.proktor_id || sec.pengawas_guru_id;

          // Pengawas Ruang atau Proktor yang resmi diploting di sesi ini
          const isAssignedProctor = Boolean(
            (currentGuruId && (p1Id === currentGuruId || p2Id === currentGuruId || proktorId === currentGuruId)) ||
            (currentUserId && (p1Id === currentUserId || p2Id === currentUserId || proktorId === currentUserId))
          );

          // Guru Pengampu Mapel Pemilik Bank Soal / Pembuat Jadwal ini
          const isSubjectTeacherOwner = Boolean(
            currentGuruId &&
            (row.BankSoal?.guru_id === currentGuruId || sec.created_by_guru_id === currentGuruId)
          );

          const isSessionUsed = row.status !== 'DRAFT' || pesertaCount > 0;

          // Live Monitoring: Panitia, Pengawas Ruang resmi, atau Guru Mapel pemilik soal (Mode Spectator)
          const canOpenMonitor = isPrivilegedPanitia || isAssignedProctor || isSubjectTeacherOwner || isSessionUsed;

          // KONTROL OPERASIONAL SESI (JEDA, SELESAIKAN, AKTIFKAN, REGENERATE TOKEN):
          // HANYA Panitia CBT / Admin resmi di tingkat manajemen sekolah.
          // Di tab Sesi Ujian Kelas Binaan (kacamata Guru), tombol ini MUTLAK DITIADAKAN
          // bahkan jika guru tersebut kebetulan adalah pengawas ruang pada mapel tersebut.
          const canControlSession = !readOnly && isPrivilegedPanitia && !guruId;

          // Transfer Nilai ke Rapor: Guru Mapel pemilik Bank Soal atau Panitia, ketika sesi aktif/selesai & ada peserta
          const canTransferRapor = !readOnly && (isPrivilegedPanitia || isSubjectTeacherOwner) && isSessionUsed;

          // Penerbitan Remedial CBT:
          // Hak Prerogatif Guru Pengampu Mapel (atau Panitia) pada Sesi Utama (bukan anak remedial) yang aktif/selesai & ada peserta
          const canPublishRemedial =
            !readOnly &&
            !row._isChildRow &&
            !(row.setting_keamanan as any)?.is_remedial &&
            (isPrivilegedPanitia || isSubjectTeacherOwner || Boolean(guruId)) &&
            (row.status === 'ACTIVE' || row.status === 'COMPLETED') &&
            pesertaCount > 0;

          // Edit & Hapus Jadwal:
          // - Panitia berhak mengedit/menghapus
          // - Guru Mapel pembuat soal HANYA berhak jika sesi MASIH DRAFT MURNI (belum diaktifkan & belum ada peserta)
          const canEditSchedule = !readOnly && (
            isPrivilegedPanitia ||
            (isSubjectTeacherOwner && !isTeacherLocked && row.status === 'DRAFT' && pesertaCount === 0)
          );

          return (
            <div className="flex items-center justify-end gap-1 flex-nowrap" onClick={(e) => e.stopPropagation()}>
              {/* Live Monitoring Button: Tampil ketika sesi sudah diaktifkan/digunakan atau bagi Guru Pengawas/Proktor yang diploting */}
              {canOpenMonitor && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenMonitor(row.id)}
                  className="text-xs h-7 px-2 text-indigo-600 border-indigo-200 dark:border-indigo-800 font-bold bg-indigo-50/50 hover:bg-indigo-100"
                  title="Monitoring Peserta & Token Ujian Real-time"
                >
                  <Activity size={13} className="mr-1" />
                  <span>Monitor</span>
                </Button>
              )}

              {/* Transfer Nilai ke e-Rapor (Hanya untuk Guru Pengampu Mapel / Admin ketika sesi aktif/selesai & ada peserta) */}
              {canTransferRapor && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedJadwal(row);
                    setIsTransferModalOpen(true);
                  }}
                  className="text-xs h-7 px-2 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold bg-indigo-50/60 hover:bg-indigo-100 cursor-pointer"
                  title="Transfer Nilai Hasil CBT ke Slot Rapor (SUM 1, SUM 2, SUM 3, SUM 4, SUM AKHIR)"
                >
                  <ArrowRightLeft size={12} className="mr-1" />
                  <span>Transfer Rapor</span>
                </Button>
              )}

              {/* Penerbitan Sesi Remedial CBT (Khusus Guru Pengampu Mapel di Tab Sesi Binaan) */}
              {canPublishRemedial && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRemedialJadwal(row);
                    setIsRemedialModalOpen(true);
                  }}
                  className="text-xs h-7 px-2 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 cursor-pointer"
                  title="Terbitkan Sesi Ujian Remedial CBT untuk Siswa Belum Tuntas"
                >
                  <Sparkles size={12} className="mr-1 text-amber-600 dark:text-amber-400" />
                  <span>Remedial</span>
                </Button>
              )}

              {/* Sesi Controls (Guru Pengampu / Kurikulum / Proktor yang Diploting) */}
              {canControlSession && (
                <>
                  {row.status === 'DRAFT' || row.status === 'PAUSED' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleActivate(row)}
                      className="text-xs h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold"
                      title="Aktifkan Sesi Ujian"
                    >
                      <Play size={13} className="mr-1" />
                      <span>Aktifkan</span>
                    </Button>
                  ) : row.status === 'ACTIVE' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => pauseMutation.mutate(row.id)}
                      className="text-xs h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      title="Jeda Sesi Ujian"
                    >
                      <Pause size={13} className="mr-1" />
                      <span>Jeda</span>
                    </Button>
                  ) : null}

                  {row.status === 'ACTIVE' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleComplete(row)}
                      className="text-xs h-7 px-2 text-slate-600 hover:text-slate-900"
                      title="Selesaikan Sesi Ujian"
                    >
                      <CheckCircle size={13} className="mr-1" />
                      <span>Selesai</span>
                    </Button>
                  )}

                  {/* Regenerate Token */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => regenerateTokenMutation.mutate(row.id)}
                    className="text-xs h-7 px-1.5 text-slate-500 hover:text-slate-800"
                    title="Generate Ulang Token Ujian"
                  >
                    <RotateCw size={12} />
                  </Button>
                </>
              )}

              {/* Cetak Berita Acara (Tersedia bagi Pengampu, Pengawas Ruang, maupun Proktor) */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedJadwal(row);
                  setIsPrintModalOpen(true);
                }}
                className="text-xs h-7 px-2 text-slate-600 hover:text-slate-900"
                title="Cetak Berita Acara Pelaksanaan Ujian"
              >
                <Printer size={13} />
              </Button>

              {canEditSchedule && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedJadwal(row);
                      setIsFormModalOpen(true);
                    }}
                    className="text-xs h-7 px-1.5 text-slate-500 hover:text-slate-800"
                    title="Edit Jadwal"
                  >
                    <Edit2 size={12} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteJadwal(row)}
                    disabled={deleteMutation.isPending}
                    className="text-xs h-7 px-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Hapus Jadwal Ujian"
                  >
                    <Trash2 size={12} />
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [
      copiedToken,
      readOnly,
      guruId,
      currentGuruId,
      currentUserId,
      isPrivilegedPanitia,
      isTeacherLocked,
      onNavigateMonitor,
    ]
  );

  // Jika pengguna mengklik tombol Monitor dan CbtJadwalView tidak menerima onNavigateMonitor eksternal,
  // tampilkan CbtProctorMonitoringView secara inline
  if (internalMonitorJadwalId) {
    return (
      <CbtProctorMonitoringView
        initialJadwalId={internalMonitorJadwalId}
        guruId={currentGuruId}
        onBack={() => setInternalMonitorJadwalId(null)}
      />
    );
  }

  if (isOrchestratorOpen) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOrchestratorOpen(false)}
            className="text-xs h-8 px-3 font-bold"
          >
            ← Kembali ke Tabel Jadwal Ujian
          </Button>
        </div>
        <CbtPanitiaOrchestratorView />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      <AcademicFilterToolbar
        {...filter.toolbarProps}
        extraActions={
          isPrivilegedPanitia && !readOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOrchestratorOpen(true)}
              className="text-xs h-9 px-3.5 font-bold text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100"
              title="Rangkai Jadwal Serentak & Ploting Pengawas Ruang Secara Massal"
            >
              <span>Orkestrasi &amp; Ploting Pengawas</span>
            </Button>
          ) : undefined
        }
        onAdd={
          !readOnly && !isTeacherLocked
            ? () => {
                setSelectedJadwal(null);
                setIsFormModalOpen(true);
              }
            : undefined
        }
        addLabel={isTeacherLocked ? undefined : "Jadwalkan Ujian"}
        className="shadow-2xs"
      />

      {/* Lock Notice jika Guru dibatasi dalam Mode Orkestrasi */}
      {isTeacherLocked && (
        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-xs flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-indigo-600 shrink-0" />
            <span>
              <strong>Mode Orkestrasi Aktif ({eventName}):</strong> Pembuatan sesi baru dikelola terpusat oleh Panitia CBT.
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-300 font-bold">
            Jadwal Terpusat Panitia
          </Badge>
        </div>
      )}

      {/* Filter Kategori: Sesi Utama vs Sesi Remedial Bertingkat */}
      {totalRemedialCount > 0 && (
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setSessionFilter('all')}
            className={cn(
              'px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              sessionFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <span>Semua Sesi</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-bold">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSessionFilter('main')}
            className={cn(
              'px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              sessionFilter === 'main'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <span>Sesi Utama</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-bold">
              {totalMainCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSessionFilter('remedial')}
            className={cn(
              'px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              sessionFilter === 'remedial'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <GitBranch size={12} className="text-indigo-500" />
            <span>Sesi Lanjutan</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold">
              {totalRemedialCount}
            </span>
          </button>
        </div>
      )}

      {isMobile ? (
        <MobileAcademicList
          title="Jadwal Ujian CBT"
          data={displayData}
          loading={isLoading}
          totalItems={pagination?.totalItems || 0}
          emptyMessage="Belum ada jadwal ujian dibuat"
          renderCard={(item: any) => {
            if (item._isChildRow) {
              const isSusulanChild = (item.nama_sesi || '').toLowerCase().includes('susulan');
              const targetCount = item.setting_keamanan?.target_siswa_ids?.length || (item as any)._count?.Peserta || 0;
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenMonitor(item.id)}
                  className="ml-3 sm:ml-5 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 border-l-2 border-l-indigo-500 shadow-2xs space-y-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                        <CornerDownRight size={9} />
                        <span>{isSusulanChild ? 'Remedial & Susulan' : 'Sesi Remedial'}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {targetCount} Siswa Terdaftar
                      </span>
                    </div>
                    <Badge
                      variant={item.status === 'ACTIVE' || item.status === 'COMPLETED' ? 'success' : item.status === 'PAUSED' ? 'warning' : 'outline'}
                      className="text-[10px] font-bold"
                    >
                      {item.status === 'COMPLETED' ? 'SELESAI' : item.status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {item.nama_sesi}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.BankSoal?.judul || item.display_mapel} • {item.durasi_menit} Menit
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-800/50 text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {item.setting_keamanan?.tokenless ? 'Bebas Token' : `Token: ${item.token_ujian}`}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1">
                      Buka Monitor ➔
                    </span>
                  </div>
                </div>
              );
            }

            // ── REGULAR PARENT EXAM SESSION CARD (MOBILE) ──
            const pesertaCount = item._count?.Peserta || 0;
            const sec = (item.setting_keamanan as any) || {};
            const p1Id = sec.pengawas_1_id || sec.pengawas_1_guru_id;
            const p2Id = sec.pengawas_2_id || sec.pengawas_2_guru_id;
            const proktorId = sec.proktor_id || sec.pengawas_guru_id;

            const isAssignedProctor = Boolean(
              (currentGuruId && (p1Id === currentGuruId || p2Id === currentGuruId || proktorId === currentGuruId)) ||
              (currentUserId && (p1Id === currentUserId || p2Id === currentUserId || proktorId === currentUserId))
            );

            const isSubjectTeacherOwner = Boolean(
              currentGuruId &&
              (item.BankSoal?.guru_id === currentGuruId || sec.created_by_guru_id === currentGuruId)
            );

            const isSessionUsed = item.status !== 'DRAFT' || pesertaCount > 0;
            const canOpenMonitor = isPrivilegedPanitia || isAssignedProctor || isSubjectTeacherOwner || isSessionUsed;
            const canControlSession = !readOnly && isPrivilegedPanitia && !guruId;
            const canTransferRapor = !readOnly && (isPrivilegedPanitia || isSubjectTeacherOwner) && isSessionUsed;
            const canPublishRemedial =
              !readOnly &&
              !item._isChildRow &&
              !(item.setting_keamanan as any)?.is_remedial &&
              (isPrivilegedPanitia || isSubjectTeacherOwner || Boolean(guruId)) &&
              (item.status === 'ACTIVE' || item.status === 'COMPLETED') &&
              pesertaCount > 0;

            const tgl = new Date(item.tanggal_mulai);
            const tz = getTimezone();
            const tzLabel = getTimezoneLabel(tz);
            const jamMulai = formatLocalTimeFromISO(item.tanggal_mulai);
            const jamSelesai = formatLocalTimeFromISO(item.tanggal_selesai);
            const mapelLabel =
              item.BankSoal?.MataPelajaran?.nama_mapel ||
              item.display_mapel ||
              item.BankSoal?.display_mapel ||
              item.BankSoal?.Mapel?.nama_mapel ||
              '-';

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3 transition-all"
              >
                {/* Header: Mapel & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 line-clamp-1">
                      {mapelLabel}
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 line-clamp-2 mt-0.5">
                      {item.nama_sesi}
                    </h4>
                    {item.deskripsi_ruang && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.deskripsi_ruang}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {item.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                        <span>AKTIF</span>
                      </span>
                    ) : item.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                        <CheckCircle size={10} className="stroke-[2.5] text-emerald-600 dark:text-emerald-400" />
                        <span>SELESAI</span>
                      </span>
                    ) : item.status === 'PAUSED' ? (
                      <Badge variant="warning" className="text-[10px] font-bold">
                        DIJEDA
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold">
                        DRAFT
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Meta Grid: Token, Peserta, Tanggal */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-xs">
                  {/* Token Masuk */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Token:</span>
                    <div className="inline-flex items-center gap-1">
                      <span className="font-mono text-xs font-black tracking-wider text-indigo-700 dark:text-indigo-300">
                        {item.token_ujian || '-'}
                      </span>
                      {item.token_ujian && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyToken(item.token_ujian);
                          }}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                          title="Salin Token"
                        >
                          {copiedToken === item.token_ujian ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Peserta */}
                  <div className="flex items-center justify-end gap-1.5 text-slate-600 dark:text-slate-300">
                    <Users size={12} className="text-slate-400 shrink-0" />
                    <span className="font-bold">{pesertaCount} Siswa</span>
                  </div>

                  {/* Jadwal & Durasi */}
                  <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <Clock size={11} className="shrink-0 text-slate-400" />
                    <span>
                      {tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: tz })}
                      {jamMulai && jamSelesai ? ` • ${jamMulai}–${jamSelesai} ${tzLabel}` : ''} • {item.durasi_menit} mnt
                    </span>
                  </div>
                </div>

                {/* Sub-sesi Remedial / Susulan Expander */}
                {item._isParent && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpandParent(item.id);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all",
                      item._isExpanded
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <GitBranch size={12} className="text-indigo-500" />
                      <span>{item._childCount} Sesi Lanjutan (Remedial &amp; Susulan)</span>
                    </div>
                    {item._isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}

                {/* Action Buttons Footer */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedJadwal(item);
                        setIsPrintModalOpen(true);
                      }}
                      className="text-xs h-7 px-2 text-slate-600 hover:text-slate-900"
                      title="Cetak Berita Acara"
                    >
                      <Printer size={13} className="mr-1" />
                      <span>Cetak</span>
                    </Button>

                    {canControlSession && item.status === 'ACTIVE' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleComplete(item)}
                        className="text-xs h-7 px-2 text-slate-600 hover:text-slate-900"
                      >
                        <CheckCircle size={13} className="mr-1" />
                        <span>Selesai</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {canTransferRapor && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedJadwal(item);
                          setIsTransferModalOpen(true);
                        }}
                        className="text-xs h-7 px-2 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold bg-indigo-50/60 hover:bg-indigo-100"
                      >
                        <ArrowRightLeft size={12} className="mr-1" />
                        <span>Transfer Rapor</span>
                      </Button>
                    )}

                    {canPublishRemedial && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRemedialJadwal(item);
                          setIsRemedialModalOpen(true);
                        }}
                        className="text-xs h-7 px-2 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40"
                      >
                        <Sparkles size={12} className="mr-1 text-amber-600 dark:text-amber-400" />
                        <span>Remedial</span>
                      </Button>
                    )}

                    {canOpenMonitor && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenMonitor(item.id)}
                        className="text-xs h-7 px-2.5 font-bold"
                      >
                        <Activity size={12} className="mr-1" />
                        <span>Monitor</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
          pagination={{
            currentPage: page,
            totalPages: pagination?.totalPages || 1,
            totalItems: pagination?.totalItems || 0,
            itemsPerPage: limit,
            onPageChange: setPage,
            onLimitChange: setLimit,
          }}
          onItemClick={(item) => handleOpenMonitor(item.id)}
        />
      ) : guruId && groupedDisplayData.length > 0 ? (
        <div className="space-y-4">
          {groupedDisplayData.map((group) => {
            const isCollapsed = collapsedMapels.has(group.mapelName);
            return (
              <div
                key={group.mapelName}
                className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleMapelGroup(group.mapelName)}
                  className="w-full px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                      <BookOpen size={14} />
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                      {group.mapelName}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-white dark:bg-slate-900">
                      {group.rows.length} Sesi
                    </Badge>
                  </div>
                  <span className="text-slate-400 shrink-0">
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                {!isCollapsed && (
                  <Table
                    data={group.rows}
                    columns={columns}
                    loading={false}
                    hoverable={true}
                    emptyMessage="Belum ada jadwal ujian pada mapel ini"
                    rowClassName={(row: any) => {
                      if (row._isChildRow) {
                        return 'bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors border-l-2 border-l-indigo-400 dark:border-l-indigo-500/80';
                      }
                      if (row._isParent && row._isExpanded) {
                        return 'bg-slate-50/40 dark:bg-slate-800/20';
                      }
                      return '';
                    }}
                  />
                )}
              </div>
            );
          })}
          {pagination && (pagination.totalPages || 1) > 1 && (
            <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <Table
                data={[]}
                columns={[]}
                loading={false}
                pagination={{
                  currentPage: page,
                  totalPages: pagination?.totalPages || 1,
                  totalItems: pagination?.totalItems || 0,
                  itemsPerPage: limit,
                  onPageChange: (newPage) => setPage(newPage),
                  onLimitChange: (newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  },
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <Table
            data={displayData}
            columns={columns}
            loading={isLoading}
            hoverable={true}
            emptyMessage="Belum ada jadwal ujian dibuat"
            rowClassName={(row: any) => {
              if (row._isChildRow) {
                return 'bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors border-l-2 border-l-indigo-400 dark:border-l-indigo-500/80';
              }
              if (row._isParent && row._isExpanded) {
                return 'bg-slate-50/40 dark:bg-slate-800/20';
              }
              return '';
            }}
            pagination={{
              currentPage: page,
              totalPages: pagination?.totalPages || 1,
              totalItems: pagination?.totalItems || 0,
              itemsPerPage: limit,
              onPageChange: (newPage) => setPage(newPage),
              onLimitChange: (newLimit) => {
                setLimit(newLimit);
                setPage(1);
              },
            }}
          />
        </div>
      )}

      {/* Form Modal */}
      {isFormModalOpen && (
        <CbtJadwalFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setSelectedJadwal(null);
          }}
          jadwalToEdit={selectedJadwal}
          defaultGuruId={guruId}
          initialTahunPelajaranId={(filter.values.tahunPelajaranId as string) || undefined}
          initialSemesterId={(filter.values.semesterId as string) || undefined}
          onSuccess={async () => {
            setPage(1);
            await queryClient.invalidateQueries({
              queryKey: cbtQueryKeys.jadwal(),
              exact: false,
              refetchType: 'all',
            });
          }}
        />
      )}

      {/* Berita Acara Print Modal */}
      {isPrintModalOpen && selectedJadwal && (
        <CbtBeritaAcaraPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setSelectedJadwal(null);
          }}
          jadwal={selectedJadwal}
        />
      )}

      {/* Transfer Nilai ke e-Rapor Modal */}
      {isTransferModalOpen && selectedJadwal && (
        <CbtTransferNilaiModal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setSelectedJadwal(null);
          }}
          jadwal={selectedJadwal}
          defaultTpId={filter.values.tahunPelajaranId}
          defaultSemesterId={filter.values.semesterId}
        />
      )}

      {/* Modal Penerbitan Remedial CBT Khusus Guru Mapel */}
      {isRemedialModalOpen && remedialJadwal && (
        <CbtRemedialModal
          isOpen={isRemedialModalOpen}
          onClose={() => {
            setIsRemedialModalOpen(false);
            setRemedialJadwal(null);
          }}
          jadwal={remedialJadwal}
          onSuccess={async () => {
            await queryClient.invalidateQueries({
              queryKey: cbtQueryKeys.jadwal(),
              exact: false,
              refetchType: 'all',
            });
          }}
        />
      )}
    </div>
  );
});

export default CbtJadwalView;
