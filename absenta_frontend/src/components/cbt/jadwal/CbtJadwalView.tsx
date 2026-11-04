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
} from 'lucide-react';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import { CbtJadwalFormModal } from './CbtJadwalFormModal';
import { CbtBeritaAcaraPrintModal } from './CbtBeritaAcaraPrintModal';
import { CbtTransferNilaiModal } from './CbtTransferNilaiModal';
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

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedJadwal, setSelectedJadwal] = useState<CbtJadwalUjian | null>(null);

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
    mutationFn: (id: string) => cbtApi.updateJadwal(id, { status: 'ARCHIVED' }),
    onSuccess: async () => {
      toast.success('Jadwal ujian diarsipkan');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.jadwal(), exact: false, refetchType: 'all' });
    },
  });

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
        title: 'Sesi Ujian & Mapel',
        label: 'Sesi Ujian & Mapel',
        className: 'min-w-[220px]',
        render: (_val: unknown, row: CbtJadwalUjian) => (
          <div className="space-y-1">
            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
              {row.nama_sesi}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {row.BankSoal?.Mapel?.nama_mapel || '-'}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-400">{row.BankSoal?.kode_bank}</span>
            </div>
          </div>
        ),
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
        render: (_val: unknown, row: CbtJadwalUjian) => (
          <div className="flex items-center justify-end gap-1 flex-nowrap" onClick={(e) => e.stopPropagation()}>
            {/* Live Monitoring Proctor Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigateMonitor?.(row.id)}
              className="text-xs h-7 px-2 text-indigo-600 border-indigo-200 dark:border-indigo-800 font-bold bg-indigo-50/50 hover:bg-indigo-100"
              title="Monitoring Peserta Real-time"
            >
              <Activity size={13} className="mr-1" />
              <span>Monitor</span>
            </Button>

            {/* Transfer Nilai ke e-Rapor */}
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedJadwal(row);
                  setIsTransferModalOpen(true);
                }}
                className="text-xs h-7 px-2 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 font-bold bg-violet-50/60 hover:bg-violet-100"
                title="Transfer Nilai Hasil CBT ke Slot Rapor (SUM 1, SUM 2, SUM 3, SUM AKHIR)"
              >
                <ArrowRightLeft size={12} className="mr-1" />
                <span>Transfer Rapor</span>
              </Button>
            )}

            {/* Sesi Controls */}
            {!readOnly && (
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

            {/* Cetak Berita Acara */}
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

            {!readOnly && (
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
            )}
          </div>
        ),
      },
    ],
    [copiedToken, readOnly, onNavigateMonitor]
  );

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      <AcademicFilterToolbar
        {...filter.toolbarProps}
        onAdd={
          !readOnly
            ? () => {
                setSelectedJadwal(null);
                setIsFormModalOpen(true);
              }
            : undefined
        }
        addLabel="Jadwalkan Ujian"
        className="shadow-2xs"
      />

      {isMobile ? (
        <MobileAcademicList
          title="Jadwal Ujian CBT"
          data={items}
          isLoading={isLoading}
          totalItems={pagination?.totalItems || 0}
          emptyMessage="Belum ada jadwal ujian dibuat"
          titleKey="nama_sesi"
          badgeKey="status"
          subtitleKey="BankSoal.Mapel.nama_mapel"
          metaKey="token_ujian"
          pagination={{
            currentPage: page,
            totalPages: pagination?.totalPages || 1,
            totalItems: pagination?.totalItems || 0,
            itemsPerPage: limit,
            onPageChange: setPage,
            onLimitChange: setLimit,
          }}
          onItemClick={(item) => onNavigateMonitor?.(item.id)}
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
