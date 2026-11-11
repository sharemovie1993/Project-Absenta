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
import { CbtProctorMonitoringView } from '../sesi/CbtProctorMonitoringView';
import { CbtPanitiaOrchestratorView } from './CbtPanitiaOrchestratorView';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
import { formatLocalTimeFromISO, getTimezone, getTimezoneLabel } from '@/utils/attendance/time';

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
  const { isOrkestrasi, eventName, lockTeacherScheduling } = useCbtOperationMode();
  const isTeacherLocked = Boolean(guruId) && isOrkestrasi && lockTeacherScheduling;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedJadwal, setSelectedJadwal] = useState<CbtJadwalUjian | null>(null);
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

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                  {row.nama_sesi}
                </span>
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
        render: (_val: unknown, row: CbtJadwalUjian) => (
          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="font-mono text-xs font-black tracking-widest text-indigo-700 dark:text-indigo-300">
              {row.token_ujian}
            </span>
            <button
              type="button"
              onClick={() => handleCopyToken(row.token_ujian)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5"
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
        ),
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
              <Badge variant="outline" className="text-[10px] font-bold text-slate-500">
                SELESAI
              </Badge>
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
        render: (_val: unknown, row: CbtJadwalUjian) => (
          <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
            {row._count?.Peserta || 0} Siswa
          </span>
        ),
      },
      {
        key: 'aksi',
        title: 'Aksi & Proctor',
        label: 'Aksi & Proctor',
        className: 'min-w-[260px] text-right',
        render: (_val: unknown, row: CbtJadwalUjian) => {
          const pesertaCount = row._count?.Peserta || 0;
          const isOwnerOrAdmin =
            !guruId ||
            row.BankSoal?.guru_id === guruId ||
            row.setting_keamanan?.created_by_guru_id === guruId;
          const isProktor =
            Boolean(guruId) &&
            (row.setting_keamanan?.proktor_id === guruId ||
              row.setting_keamanan?.pengawas_2_id === guruId);
          const isPengawas =
            Boolean(guruId) && row.setting_keamanan?.pengawas_1_id === guruId;

          const isSessionUsed = row.status !== 'DRAFT' || pesertaCount > 0;
          const canOpenMonitor = isSessionUsed || isPengawas || isProktor;
          // Pengawas Ruang (1 pengawas di kelas ujian HP) maupun Proktor memiliki akses penuh kontrol jalannya sesi & token
          const canControlSession = !readOnly && (isOwnerOrAdmin || isProktor || isPengawas);
          const canTransferRapor = !readOnly && isOwnerOrAdmin && row.status !== 'DRAFT' && pesertaCount > 0;
          const canEditSchedule = !readOnly && isOwnerOrAdmin;

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
    [copiedToken, readOnly, guruId, onNavigateMonitor]
  );

  // Jika pengguna mengklik tombol Monitor dan CbtJadwalView tidak menerima onNavigateMonitor eksternal,
  // tampilkan CbtProctorMonitoringView secara inline
  if (internalMonitorJadwalId) {
    return (
      <CbtProctorMonitoringView
        initialJadwalId={internalMonitorJadwalId}
        guruId={guruId}
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
          !guruId && !readOnly ? (
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

      {isMobile ? (
        <MobileAcademicList
          title="Jadwal Ujian CBT"
          data={items}
          isLoading={isLoading}
          totalItems={pagination?.totalItems || 0}
          emptyMessage="Belum ada jadwal ujian dibuat"
          titleKey="nama_sesi"
          badgeKey="status"
          subtitleKey="display_mapel"
          metaKey="token_ujian"
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
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <Table
            data={items}
            columns={columns}
            loading={isLoading}
            hoverable={true}
            emptyMessage="Belum ada jadwal ujian dibuat"
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
    </div>
  );
});

export default CbtJadwalView;
