import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Badge,
  Table,
} from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import {
  Edit2,
  Trash2,
  Clock,
  Eye,
  Share2,
  Copy,
  BookOpen,
  Plus,
  Rocket,
  Users,
  FileEdit,
  RotateCw,
  Sparkles,
  User,
  Layers,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useTahunPelajaranOptions, useSemesterOptions } from '@/components/common';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtBankSoal } from '@/types/cbt.types';
import { CbtBankSoalFormModal } from './CbtBankSoalFormModal';
import { CbtRolloverModal } from '../shared/CbtRolloverModal';
import { History } from 'lucide-react';
import { CbtBankSoalDetailModal } from './CbtBankSoalDetailModal';
import { TeacherCbtDutyCard } from './TeacherCbtDutyCard';
import { CbtJadwalFormModal } from '../jadwal/CbtJadwalFormModal';
import { CbtMultiClassRemedialModal } from '../jadwal/CbtMultiClassRemedialModal';
import { CbtSharedDistributionModal } from './CbtSharedDistributionModal';
import { getTingkatRoman, formatDisplayJudulBankSoal } from './cbtAsesmenHelper';
import { useCbtOperationMode } from '../cbtModeHelper';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';

export interface UniversalCbtBankSoalViewProps {
  guruId?: string;
  mapelId?: string;
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;
  roleContext?: 'GURU' | 'KURIKULUM' | 'ADMIN';
  onScheduleSuccess?: () => void;
  onClose?: () => void;
}

export const CbtBankSoalView: React.FC<UniversalCbtBankSoalViewProps> = React.memo(({
  guruId,
  mapelId,
  isModal = false,
  hideLayout = false,
  readOnly = false,
  roleContext,
  onScheduleSuccess,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const { user } = useAuthStore();
  const { isAdmin, isKurikulum } = useCapabilities();
  const { activeEvent, eventName, targetTingkat, isOrkestrasi, lockTeacherScheduling } = useCbtOperationMode();
  const currentGuruId = guruId || user?.guru_profile?.id;

  // Konteks Mode: Panitia CBT (Kurikulum / Admin) vs Guru Mandiri
  const isPanitiaCbt = useMemo(() => {
    if (roleContext === 'KURIKULUM' || roleContext === 'ADMIN') return true;
    if (roleContext === 'GURU') return false;
    if (guruId) return false;
    return Boolean(isAdmin || isKurikulum);
  }, [roleContext, guruId, isAdmin, isKurikulum]);

  // Hak menjadwalkan/mengaktifkan ujian:
  // Dalam event Ujian Orkestrasi (ASAS/PSAS terpusat), aktivasi dikendalikan penuh oleh Panitia CBT,
  // sehingga tombol "Aktifkan" disembunyikan dari guru agar tidak membingungkan atau menimbulkan konflik jadwal.
  const canSchedule = useMemo(() => {
    if (readOnly) return false;
    if (isPanitiaCbt) return true;
    return !isOrkestrasi && !lockTeacherScheduling;
  }, [readOnly, isPanitiaCbt, isOrkestrasi, lockTeacherScheduling]);

  const [ownershipTab, setOwnershipTab] = useState<'OWN' | 'SHARED' | 'ALL'>('OWN');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBankSoal, setSelectedBankSoal] = useState<CbtBankSoal | null>(null);
  const [defaultMapelForCreate, setDefaultMapelForCreate] = useState<string | undefined>(undefined);
  const [defaultTingkatForCreate, setDefaultTingkatForCreate] = useState<string | undefined>(undefined);
  const [defaultJurusanForCreate, setDefaultJurusanForCreate] = useState<string | undefined>(undefined);
  const [isJadwalModalOpen, setIsJadwalModalOpen] = useState(false);
  const [bankSoalForJadwal, setBankSoalForJadwal] = useState<CbtBankSoal | null>(null);
  const [multiRemedialBank, setMultiRemedialBank] = useState<CbtBankSoal | null>(null);
  const [distributionBank, setDistributionBank] = useState<CbtBankSoal | null>(null);

  const handleOpenJadwalModal = (bankSoal: CbtBankSoal) => {
    setBankSoalForJadwal(bankSoal);
    setIsJadwalModalOpen(true);
  };

  // 1. Unified Academic Filter Hook
  const filter = useAcademicFilter({
    enableTp: false,
    enableSemester: false,
    enableTingkat: isPanitiaCbt,
    enableMapel: isPanitiaCbt && !mapelId,
    enableSearch: true,
    searchDebounceMs: 400,
    allowAllKelas: true,
    onFilterChange: () => setPage(1),
  });

  // Normalisasi tingkat filter multi-jenjang (misal: 10 -> 'X', 7 -> 'VII', 1 -> 'I')
  const normalizedTingkat = useMemo(() => {
    const raw = filter.values.tingkat;
    if (!raw) return undefined;
    return getTingkatRoman(raw);
  }, [filter.values.tingkat]);

  const { activeEvent: activeCbtEvent } = useCbtOperationMode();
  const { activeYear: activeTp } = useTahunPelajaranOptions();
  const { activeSemester, rawList: semRawList = [] } = useSemesterOptions();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const { data: eventsSummaryRes } = useQuery({
    queryKey: cbtQueryKeys.eventsSummary(),
    queryFn: () => cbtApi.getEventsSummary(),
    staleTime: 60 * 1000,
  });

  const availableEvents = useMemo(() => {
    const groups = eventsSummaryRes?.summary || [];
    const list: any[] = [];
    const seen = new Set<string>();
    const activeTpIdFilter = activeTp?.id;

    groups.forEach((grp: any) => {
      (grp?.events || []).forEach((ev: any) => {
        if (!ev?.id || seen.has(ev.id)) return;
        if (activeTpIdFilter && ev.tahun_pelajaran_id && ev.tahun_pelajaran_id !== activeTpIdFilter) return;
        seen.add(ev.id);
        list.push(ev);
      });
    });

    if (activeCbtEvent?.id && !seen.has(activeCbtEvent.id)) {
      list.unshift(activeCbtEvent);
    }

    // Event aktif tampil paling atas
    return list.sort((a, b) => Number(Boolean(b.is_active)) - Number(Boolean(a.is_active)));
  }, [eventsSummaryRes, activeTp?.id, activeCbtEvent]);

  const viewedEvent = useMemo(() => {
    if (selectedEventId) {
      const matched = availableEvents.find((e) => e.id === selectedEventId);
      if (matched) return matched;
    }
    return activeCbtEvent || availableEvents[0] || null;
  }, [selectedEventId, availableEvents, activeCbtEvent]);

  const isViewingNonActiveEvent = Boolean(
    viewedEvent?.id && activeCbtEvent?.id && viewedEvent.id !== activeCbtEvent.id
  );

  const effectiveTpId = activeTp?.id || viewedEvent?.tahun_pelajaran_id;
  const effectiveSemId = useMemo(() => {
    if (activeSemester?.id) return activeSemester.id;
    if (viewedEvent?.semester && semRawList.length > 0) {
      const target = String(viewedEvent.semester).toUpperCase().trim();
      const matched = semRawList.find((s: any) =>
        String(s.nama_semester || s.nama || '').toUpperCase().includes(target)
      );
      if (matched?.id) return matched.id;
    }
    return undefined;
  }, [activeSemester?.id, viewedEvent?.semester, semRawList]);

  // 2. Fetch Bank Soal via TanStack Query (Terikat Konteks TP, Semester, & Event yang Dipilih)
  const effectiveOwnership = !isPanitiaCbt ? ownershipTab : undefined;
  const { data, isLoading } = useQuery({
    queryKey: cbtQueryKeys.bankSoal({
      page,
      limit,
      search: filter.debouncedSearchQuery,
      tingkat: isPanitiaCbt ? normalizedTingkat : undefined,
      mapel_id: mapelId || (isPanitiaCbt ? filter.values.mapelId : undefined),
      guru_id: currentGuruId,
      ownership: effectiveOwnership,
      tahun_pelajaran_id: effectiveTpId,
      semester_id: effectiveSemId,
      event_id: viewedEvent?.id,
    }),
    queryFn: () =>
      cbtApi.getBankSoalList({
        page,
        limit,
        search: filter.debouncedSearchQuery,
        tingkat: isPanitiaCbt ? normalizedTingkat : undefined,
        mapel_id: mapelId || (isPanitiaCbt ? filter.values.mapelId : undefined),
        guru_id: currentGuruId,
        ownership: effectiveOwnership,
        ...(effectiveTpId ? { tahun_pelajaran_id: effectiveTpId } : {}),
        ...(effectiveSemId ? { semester_id: effectiveSemId } : {}),
        ...(viewedEvent?.id ? { event_id: viewedEvent.id } : {}),
      }),
  });

  const items = data?.items || [];
  const pagination = data?.pagination;
  const counts = data?.counts;

  const emptyMessage = useMemo(() => {
    if (ownershipTab === 'OWN') {
      return 'Belum ada bank soal buatan Anda sendiri. Klik "+ Buat Bank Soal" untuk membuat naskah ujian mandiri atau naskah bersama (Master MGMP).';
    }
    if (ownershipTab === 'SHARED') {
      return 'Belum ada bank soal bersama yang dibagikan oleh rekan guru MGMP kepada Anda.';
    }
    return 'Belum ada bank soal terdaftar';
  }, [ownershipTab]);

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => cbtApi.deleteBankSoal(id),
    onSuccess: async () => {
      toast.success('Bank soal berhasil dihapus');
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: cbtQueryKeys.bankSoal(),
          exact: false,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['cbt-bank-soal-for-teacher-duty'],
          exact: false,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['teacher-cbt-duty-status'],
          exact: false,
          refetchType: 'all',
        }),
      ]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus bank soal');
    },
  });

  const handleDelete = async (bankSoal: CbtBankSoal) => {
    const isConfirmed = await confirm({
      title: 'Hapus Bank Soal?',
      message: `Apakah Anda yakin ingin menghapus bank soal "${bankSoal.judul}" (${bankSoal.kode_bank})? Semua butir soal di dalamnya akan terhapus.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });

    if (isConfirmed) {
      deleteMutation.mutate(bankSoal.id);
    }
  };

  // Duplicate Mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => cbtApi.duplicateBankSoal(id, currentGuruId),
    onSuccess: async () => {
      toast.success('Bank soal berhasil disalin!');
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: cbtQueryKeys.bankSoal(),
          exact: false,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['cbt-bank-soal-for-teacher-duty'],
          exact: false,
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['teacher-cbt-duty-status'],
          exact: false,
          refetchType: 'all',
        }),
      ]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menyalin bank soal');
    },
  });

  const handleDuplicate = async (bankSoal: CbtBankSoal) => {
    const isConfirmed = await confirm({
      title: 'Salin Bank Soal?',
      message: `Salin paket "${bankSoal.judul}" beserta seluruh butir soalnya menjadi Bank Soal milik Anda sendiri?`,
      confirmText: 'Ya, Salin',
      cancelText: 'Batal',
      style: 'info',
    });

    if (isConfirmed) {
      duplicateMutation.mutate(bankSoal.id);
    }
  };

  // Table Columns Definition
  const columns: Column[] = useMemo(() => {
    const isRowMassalPackage = (row: CbtBankSoal): boolean => {
      const code = (row.kode_bank || '').toUpperCase();
      return (
        Boolean(row.is_shared) ||
        Boolean(row.kolaborasi_badge) ||
        Boolean(row.Kontributor && row.Kontributor.length > 0) ||
        Boolean(row.judul && row.judul.trim().startsWith('[')) ||
        code.startsWith('PSAS-') ||
        code.startsWith('PSAT-') ||
        code.startsWith('PSTS-') ||
        code.startsWith('PSAJ-') ||
        code.startsWith('UKK-') ||
        code.startsWith('SAS-') ||
        code.startsWith('SAT-') ||
        code.startsWith('STS-') ||
        code.startsWith('PAS-') ||
        code.startsWith('PAT-') ||
        code.startsWith('PTS-') ||
        code.startsWith('US-') ||
        code.startsWith('UAS-') ||
        code.startsWith('TRYOUT-')
      );
    };

    return [
      {
        key: 'kode_bank',
        title: 'Kode & Judul Bank Soal',
        label: 'Kode & Judul Bank Soal',
        className: 'min-w-[280px]',
        render: (_val: unknown, row: CbtBankSoal) => {
          const isSharedBank = row.status === 'PUBLISHED' || Boolean(row.is_shared);
          const isFromColleague = Boolean(currentGuruId && row.guru_id !== currentGuruId);
          const isMassalPackage = isRowMassalPackage(row);

          const cleanJudul = formatDisplayJudulBankSoal(row.judul, row.kode_bank, row.tingkat);
          const hasTingkatInTitle = cleanJudul.toLowerCase().includes('tingkat') || cleanJudul.toLowerCase().includes('kelas');

          return (
            <div className="space-y-1 py-0.5">
              <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 line-clamp-1 leading-snug" title={row.judul}>
                {cleanJudul}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10.5px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/50">
                  {row.kode_bank}
                </span>
                {!hasTingkatInTitle && row.tingkat && (
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                    Tingkat {getTingkatRoman(row.tingkat)}
                  </span>
                )}
                {row.kolaborasi_badge && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/50">
                    {row.kolaborasi_badge}
                  </span>
                )}
                {row.UnitPengajaran && row.UnitPengajaran.nama_unit && (
                  <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-200/60 dark:border-sky-800/50">
                    Unit: {row.UnitPengajaran.nama_unit}
                  </span>
                )}
                {isFromColleague ? (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60"
                    title={`Paket ujian MGMP disusun oleh rekan: ${row.Guru?.nama_guru || 'Rekan Pengampu'}`}
                  >
                    <Users size={10} />
                    <span>MGMP</span>
                  </span>
                ) : (row.kolaborasi_badge || isMassalPackage) ? (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                    title="Paket Soal MGMP Terpusat (Anda adalah Penyusun Utamanya)"
                  >
                    <Users size={10} />
                    <span>Master MGMP</span>
                  </span>
                ) : isSharedBank ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                    <Share2 size={10} />
                    <span>Dibagikan</span>
                  </span>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        key: 'mapel',
        title: 'Mata Pelajaran',
        label: 'Mata Pelajaran',
        className: 'min-w-[180px]',
        render: (_val: unknown, row: CbtBankSoal) => (
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {row.display_mapel || row.Mapel?.nama_mapel || '-'}
            </div>
            {row.UnitPengajaran?.Guru?.nama_guru && (
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                Pengampu Unit: {row.UnitPengajaran.Guru.nama_guru}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'jumlah_soal',
        title: 'Jumlah Butir Soal',
        label: 'Jumlah Soal',
        className: 'min-w-[120px] text-center',
        render: (_val: unknown, row: CbtBankSoal) => (
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-black text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              {row.jumlah_soal || row._count?.Soal || 0} Soal
            </span>
          </div>
        ),
      },
      {
        key: 'alokasi',
        title: 'Durasi Default',
        label: 'Durasi Default',
        className: 'min-w-[120px] text-center',
        render: (_val: unknown, row: CbtBankSoal) => (
          <div className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Clock size={13} className="text-slate-400" />
            <span>{row.alokasi_menit} Menit</span>
          </div>
        ),
      },
      {
        key: 'guru',
        title: 'Guru Pengampu',
        label: 'Guru Pengampu',
        className: 'min-w-[190px]',
        render: (_val: unknown, row: CbtBankSoal) => {
          const isFromColleague = Boolean(currentGuruId && row.guru_id !== currentGuruId);
          const isMassalPackage = isRowMassalPackage(row);
          const isMgmpOrShared =
            Boolean(row.kolaborasi_badge) ||
            isMassalPackage ||
            Boolean(row.is_shared) ||
            Boolean(row.Kontributor && row.Kontributor.length > 0);

          return (
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={row.Guru?.nama_guru}>
                {row.Guru?.nama_guru || '-'}
              </div>
              {(isFromColleague || isMgmpOrShared) && (
                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDistributionBank(row);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 cursor-pointer bg-indigo-50/80 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/70 dark:border-indigo-800/60 transition-colors"
                    title="Lihat rekan guru yang menerima / berbagi naskah ini (Aman & Read-Only)"
                  >
                    <Users size={11} />
                    <span>Lihat Rekan Penerima</span>
                  </button>
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'aksi',
        title: 'Aksi',
        label: 'Aksi',
        className: 'min-w-[260px] text-right',
        render: (_val: unknown, row: CbtBankSoal) => {
          const isFromColleague = Boolean(currentGuruId && row.guru_id !== currentGuruId);
          const isContributor = Boolean(
            currentGuruId &&
            row.Kontributor?.some((c) => c.guru_id === currentGuruId && c.can_edit_soal !== false)
          );
          const canManageSoal = !readOnly && (!isFromColleague || isContributor);
          const questionCount = row.jumlah_soal || row._count?.Soal || 0;
          return (
            <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedBankSoal(row);
                  setIsDetailModalOpen(true);
                }}
                className="text-xs h-7 px-2.5 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold rounded-lg cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Eye size={13} className="shrink-0" />
                <span className="whitespace-nowrap">{canManageSoal ? (isFromColleague ? 'Kontribusi Soal' : 'Kelola Soal') : 'Lihat Soal'}</span>
              </Button>

              {canSchedule && questionCount > 0 && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => handleOpenJadwalModal(row)}
                  className="text-xs h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                  title="Jadwalkan & Aktifkan Ujian untuk Kelas Binaan Anda"
                >
                  <Rocket size={12} className="shrink-0" />
                  <span className="whitespace-nowrap">Aktifkan</span>
                </Button>
              )}

              {questionCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMultiRemedialBank(row)}
                  className="text-xs h-7 px-2.5 bg-amber-50/70 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-800 font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0"
                  title="Aktivasi Sesi Remedial Akbar Terpadu Seluruh Rombel Binaan (1-Click)"
                >
                  <RotateCw size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="whitespace-nowrap">Remedial Akbar</span>
                </Button>
              )}

              {!readOnly && !isFromColleague && (
                <div className="flex items-center gap-0.5 pl-1 ml-0.5 border-l border-slate-200 dark:border-slate-700/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(row)}
                    disabled={duplicateMutation.isPending}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Duplikat Bank Soal"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBankSoal(row);
                      setIsFormModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Edit Informasi Bank Soal"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Bank Soal"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        },
      },
    ];
  }, [readOnly, currentGuruId, duplicateMutation.isPending]);

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 pb-28 md:pb-6">
      {/* ── Banner Status Kesiapan / Bebas Tugas Bank Soal (Mode Guru) ── */}
      {!isPanitiaCbt && (
        <TeacherCbtDutyCard
          guruId={currentGuruId}
          overrideEvent={viewedEvent}
          variant="detailed"
          onCreateBankSoal={(mId, tRoman, jur) => {
            setSelectedBankSoal(null);
            setDefaultMapelForCreate(mId);
            setDefaultTingkatForCreate(tRoman);
            setDefaultJurusanForCreate(jur);
            setIsFormModalOpen(true);
          }}
          onPreviewBankSoal={(bank) => {
            setSelectedBankSoal(bank);
            setIsDetailModalOpen(true);
          }}
        />
      )}

      {/* ── Toolbar: Panitia CBT menggunakan AcademicFilterToolbar, Guru cukup tombol '+ Buat Bank Soal' ── */}
      {isPanitiaCbt ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <AcademicFilterToolbar
            {...filter.toolbarProps}
            onAdd={
              !readOnly
                ? () => {
                    setSelectedBankSoal(null);
                    setIsFormModalOpen(true);
                  }
                : undefined
            }
            addLabel="Buat Bank Soal"
            className="shadow-2xs flex-1"
          />
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRolloverModalOpen(true)}
              className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-bold text-xs h-9 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Tarik Bank Soal dari Event atau Tahun Pelajaran Sebelumnya"
            >
              <History size={14} />
              <span>Rollover Soal</span>
            </Button>
          )}
        </div>
      ) : (
        /* Area Guru: 3-Pill Switcher (Soal Buatan Saya vs Dibagikan Kepada Saya vs Semua Naskah) & Tombol Buat */
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setOwnershipTab('OWN');
                setPage(1);
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                ownershipTab === 'OWN'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <User size={13} />
              <span>Soal Buatan Saya</span>
              {counts?.own !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    ownershipTab === 'OWN'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  )}
                >
                  {counts.own}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setOwnershipTab('SHARED');
                setPage(1);
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                ownershipTab === 'SHARED'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Users size={13} />
              <span>Dibagikan Kepada Saya</span>
              {counts?.shared !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    ownershipTab === 'SHARED'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  )}
                >
                  {counts.shared}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setOwnershipTab('ALL');
                setPage(1);
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                ownershipTab === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Layers size={13} />
              <span>Semua Naskah</span>
              {counts?.all !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    ownershipTab === 'ALL'
                      ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  )}
                >
                  {counts.all}
                </span>
              )}
            </button>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2 flex-wrap shrink-0 self-end sm:self-auto">
              {availableEvents.length > 1 && (
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 h-8 sm:h-9 shadow-2xs">
                  <Calendar size={13} className={isViewingNonActiveEvent ? 'text-amber-600 shrink-0' : 'text-indigo-600 shrink-0'} />
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    Event:
                  </span>
                  <select
                    value={viewedEvent?.id || ''}
                    onChange={(e) => {
                      setSelectedEventId(e.target.value);
                      setPage(1);
                    }}
                    aria-label="Pilih Konteks Event CBT"
                    className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer min-w-[220px] sm:min-w-[280px] max-w-[380px]"
                  >
                    {availableEvents.map((ev) => (
                      <option key={ev.id} value={ev.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                        {ev.nama_event}{ev.is_active ? ' (Aktif)' : ' (Non-Aktif)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRolloverModalOpen(true)}
                className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-bold text-xs h-8 sm:h-9 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                title="Tarik Bank Soal dari Event atau Tahun Pelajaran Sebelumnya"
              >
                <History size={14} />
                <span>Rollover</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedBankSoal(null);
                  setIsFormModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs h-8 sm:h-9 px-3.5 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Buat Bank Soal</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {isViewingNonActiveEvent && viewedEvent && (
        <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2 flex-wrap">
          <span>
            Anda sedang melihat &amp; mengelola Bank Soal pada event <strong>{viewedEvent.nama_event}</strong> (belum aktif di siswa). Event aktif saat ini tetap aman berjalan.
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedEventId('');
              setPage(1);
            }}
            className="text-[11px] font-bold text-amber-900 dark:text-amber-100 underline cursor-pointer shrink-0"
          >
            Kembali ke Event Aktif
          </button>
        </div>
      )}

      {/* Konten Data: Mobile List vs Desktop Table */}
      {isMobile ? (
        <MobileAcademicList
          title="Bank Soal CBT"
          data={items}
          isLoading={isLoading}
          totalItems={pagination?.totalItems || 0}
          emptyMessage={emptyMessage}
          titleKey="judul"
          badgeKey="tingkat"
          subtitleKey="Mapel.nama_mapel"
          metaKey="kode_bank"
          pagination={{
            currentPage: page,
            totalPages: pagination?.totalPages || 1,
            totalItems: pagination?.totalItems || 0,
            itemsPerPage: limit,
            onPageChange: setPage,
            onLimitChange: setLimit,
          }}
          renderCard={(item: CbtBankSoal) => {
            const isSharedBank = item.status === 'PUBLISHED';
            const isFromColleague = Boolean(currentGuruId && item.guru_id !== currentGuruId);
            const isContributor = Boolean(
              currentGuruId &&
              item.Kontributor?.some((c) => c.guru_id === currentGuruId && c.can_edit_soal !== false)
            );
            const canManageSoal = !readOnly && (!isFromColleague || isContributor);
            const questionCount = item.jumlah_soal || item._count?.Soal || 0;
            const cleanJudul = formatDisplayJudulBankSoal(item.judul, item.kode_bank, item.tingkat);
            const romanTingkat = getTingkatRoman(item.tingkat);
            const isMgmp =
              Boolean(item.kolaborasi_badge) ||
              Boolean(item.is_shared) ||
              Boolean(item.Kontributor && item.Kontributor.length > 0) ||
              isFromColleague;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5"
              >
                {/* 1. Header: Judul Utama di Atas (Sesuai Hirarki Desktop) */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug line-clamp-2" title={item.judul}>
                    {cleanJudul}
                  </h4>
                  {/* Metadata Chips: Kode Bank, MGMP badge, Mapel */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span className="font-mono text-[10.5px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/80 dark:border-indigo-800/60">
                      {item.kode_bank}
                    </span>

                    {/* Badge MGMP ringkas */}
                    {isMgmp && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <Users size={10} />
                        <span>MGMP</span>
                      </span>
                    )}

                    {/* Tingkat hanya jika tidak ada di judul */}
                    {!cleanJudul.toLowerCase().includes(`tingkat ${romanTingkat}`.toLowerCase()) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Tingkat {romanTingkat}
                      </span>
                    )}

                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold truncate max-w-[140px]">
                      {item.display_mapel || item.Mapel?.nama_mapel || '-'}
                    </span>
                  </div>
                </div>

                {/* 2. Detail Row: Penyusun, Butir Soal, Durasi */}
                <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="truncate text-slate-500 dark:text-slate-400">
                    {isFromColleague ? (
                      <span>Oleh: <strong className="text-slate-800 dark:text-slate-200">{(item.Guru?.nama_guru || 'Rekan').split(',')[0]}</strong></span>
                    ) : (
                      <strong className="text-emerald-700 dark:text-emerald-400">Mandiri (Anda)</strong>
                    )}
                  </div>
                  <div className="shrink-0 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">{questionCount} Soal</span>
                    <span className="text-slate-400 font-normal">({item.alokasi_menit}m)</span>
                  </div>
                </div>

                {/* 3. Aksi Kompak */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBankSoal(item);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex-1 text-xs h-8 rounded-xl font-bold flex items-center justify-center gap-1 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
                  >
                    {canManageSoal ? (isFromColleague ? <Users size={12} /> : <FileEdit size={12} />) : <Eye size={12} />}
                    <span>{isFromColleague ? 'Kontribusi Soal' : (questionCount > 0 ? 'Kelola Soal' : 'Mulai Buat')}</span>
                  </Button>

                  {!isFromColleague && !readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBankSoal(item);
                          setIsFormModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Edit Bank Soal"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Hapus Bank Soal"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}

                  {questionCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMultiRemedialBank(item)}
                      className="text-xs h-8 px-2.5 rounded-xl font-bold border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 shrink-0 flex items-center gap-1"
                      title="Sesi Remedial Akbar (Multi-Rombel)"
                    >
                      <RotateCw size={11} className="text-amber-600" />
                      <span>Remedial Akbar</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <Table
            data={items}
            columns={columns}
            loading={isLoading}
            hoverable={true}
            emptyMessage={emptyMessage}
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

      {!readOnly && (
        <CbtRolloverModal
          isOpen={isRolloverModalOpen}
          onClose={() => setIsRolloverModalOpen(false)}
          mode="bank-soal"
          targetEvent={viewedEvent || activeCbtEvent}
          targetTpId={effectiveTpId}
          targetSemId={effectiveSemId}
          guruId={!isPanitiaCbt ? currentGuruId : undefined}
        />
      )}

      {/* Modal Form Tambah / Edit Bank Soal */}
      {isFormModalOpen && (
        <CbtBankSoalFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setSelectedBankSoal(null);
            setDefaultMapelForCreate(undefined);
            setDefaultTingkatForCreate(undefined);
            setDefaultJurusanForCreate(undefined);
          }}
          bankSoalToEdit={selectedBankSoal}
          defaultGuruId={guruId}
          defaultMapelId={defaultMapelForCreate || mapelId || (filter.values.mapelId as string) || undefined}
          defaultTingkat={defaultTingkatForCreate}
          defaultJurusan={defaultJurusanForCreate}
          roleContext={roleContext}
          activeEvent={viewedEvent || activeEvent}
          eventName={viewedEvent?.nama_event || eventName}
          targetTingkat={targetTingkat}
          onSuccess={async () => {
            setPage(1);
            setDefaultMapelForCreate(undefined);
            setDefaultTingkatForCreate(undefined);
            setDefaultJurusanForCreate(undefined);
            await queryClient.invalidateQueries({
              queryKey: cbtQueryKeys.bankSoal(),
              exact: false,
              refetchType: 'all',
            });
            await queryClient.invalidateQueries({
              queryKey: ['cbt-bank-soal-for-teacher-duty'],
              exact: false,
            });
          }}
        />
      )}

      {/* Modal Detail & Pengelolaan Butir Soal */}
      {isDetailModalOpen && selectedBankSoal && (
        <CbtBankSoalDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedBankSoal(null);
          }}
          bankSoal={selectedBankSoal}
          readOnly={
            readOnly ||
            Boolean(
              currentGuruId &&
              selectedBankSoal.guru_id !== currentGuruId &&
              !selectedBankSoal.Kontributor?.some((c) => c.guru_id === currentGuruId && c.can_edit_soal !== false)
            )
          }
          onAktifkanUjian={
            canSchedule
              ? (b) => {
                  setIsDetailModalOpen(false);
                  handleOpenJadwalModal(b);
                }
              : undefined
          }
          onMultiRemedial={(b) => {
            setIsDetailModalOpen(false);
            setMultiRemedialBank(b);
          }}
        />
      )}

      {/* Modal Aktivasi Sesi Ujian Langsung dari Bank Soal */}
      {isJadwalModalOpen && (
        <CbtJadwalFormModal
          isOpen={isJadwalModalOpen}
          onClose={() => {
            setIsJadwalModalOpen(false);
            setBankSoalForJadwal(null);
          }}
          defaultGuruId={currentGuruId}
          initialBankSoalId={bankSoalForJadwal?.id}
          onSuccess={() => {
            const judul = bankSoalForJadwal?.judul;
            setIsJadwalModalOpen(false);
            setBankSoalForJadwal(null);
            queryClient.invalidateQueries({
              queryKey: cbtQueryKeys.jadwal(),
              exact: false,
              refetchType: 'all',
            });
            toast.success(`Ujian "${judul || 'Bank Soal'}" berhasil diaktifkan!`);
            onScheduleSuccess?.();
          }}
        />
      )}

      {/* Modal Sesi Remedial Terpadu Multi-Rombel (1-Click) */}
      {Boolean(multiRemedialBank) && (
        <CbtMultiClassRemedialModal
          isOpen={Boolean(multiRemedialBank)}
          onClose={() => setMultiRemedialBank(null)}
          bankSoal={multiRemedialBank}
          onSuccess={() => {
            setMultiRemedialBank(null);
            onScheduleSuccess?.();
          }}
        />
      )}

      {/* Modal Distribusi Rekan MGMP (Read-Only & Bebas Human Error) */}
      <CbtSharedDistributionModal
        isOpen={Boolean(distributionBank)}
        onClose={() => setDistributionBank(null)}
        bankSoal={distributionBank}
        currentGuruId={currentGuruId}
      />
    </div>
  );
});

export default CbtBankSoalView;
