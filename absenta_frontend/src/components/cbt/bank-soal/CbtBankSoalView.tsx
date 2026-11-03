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
  BookOpen,
  Edit2,
  Trash2,
  Layers,
  Clock,
  Eye,
  Calendar,
  Share2,
} from 'lucide-react';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtBankSoal } from '@/types/cbt.types';
import { CbtBankSoalFormModal } from './CbtBankSoalFormModal';
import { CbtBankSoalDetailModal } from './CbtBankSoalDetailModal';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';

export interface UniversalCbtBankSoalViewProps {
  guruId?: string;
  mapelId?: string;
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;
  onClose?: () => void;
}

export const CbtBankSoalView: React.FC<UniversalCbtBankSoalViewProps> = React.memo(({
  guruId,
  mapelId,
  isModal = false,
  hideLayout = false,
  readOnly = false,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { confirm } = useConfirm();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBankSoal, setSelectedBankSoal] = useState<CbtBankSoal | null>(null);

  // 1. Unified Academic Filter Hook
  const filter = useAcademicFilter({
    enableTp: false,
    enableSemester: false,
    enableTingkat: true,
    enableMapel: !mapelId,
    enableSearch: true,
    searchDebounceMs: 400,
    allowAllKelas: true,
    onFilterChange: () => setPage(1),
  });

  // Normalisasi tingkat filter (misal: 10 -> 'X') agar presisi dengan schema DB CBT
  const normalizedTingkat = useMemo(() => {
    const raw = filter.values.tingkat;
    if (!raw) return undefined;
    if (raw === 10 || raw === '10' || raw === 'X') return 'X';
    if (raw === 11 || raw === '11' || raw === 'XI') return 'XI';
    if (raw === 12 || raw === '12' || raw === 'XII') return 'XII';
    return String(raw);
  }, [filter.values.tingkat]);

  // 2. Fetch Bank Soal via TanStack Query
  const { data, isLoading } = useQuery({
    queryKey: cbtQueryKeys.bankSoal({
      page,
      limit,
      search: filter.debouncedSearchQuery,
      tingkat: normalizedTingkat,
      mapel_id: mapelId || filter.values.mapelId,
      guru_id: guruId,
    }),
    queryFn: () =>
      cbtApi.getBankSoalList({
        page,
        limit,
        search: filter.debouncedSearchQuery,
        tingkat: normalizedTingkat,
        mapel_id: mapelId || filter.values.mapelId,
        guru_id: guruId,
      }),
  });

  const items = data?.items || [];
  const pagination = data?.pagination;

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => cbtApi.deleteBankSoal(id),
    onSuccess: async () => {
      toast.success('Bank soal berhasil dihapus');
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.bankSoal(),
        exact: false,
        refetchType: 'all',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus bank soal');
    },
  });

  const handleDelete = async (bankSoal: CbtBankSoal) => {
    const isConfirmed = await confirm({
      title: 'Hapus Bank Soal?',
      message: `Apakah Anda yakin ingin menghapus bank soal "${bankSoal.judul}" (${bankSoal.kode_bank})? Semua butir soal di dalamnya akan terhapus.`,
      confirmLabel: 'Ya, Hapus',
      cancelLabel: 'Batal',
    });

    if (isConfirmed) {
      deleteMutation.mutate(bankSoal.id);
    }
  };

  // Table Columns Definition
  const columns: Column[] = useMemo(
    () => [
      {
        key: 'kode_bank',
        title: 'Kode & Judul Bank Soal',
        label: 'Kode & Judul Bank Soal',
        className: 'min-w-[240px]',
        render: (_val: unknown, row: CbtBankSoal) => (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40">
                {row.kode_bank}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">
                Tingkat {row.tingkat}
              </Badge>
            </div>
            <p className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1 pt-0.5">
              {row.judul}
            </p>
          </div>
        ),
      },
      {
        key: 'mapel',
        title: 'Mata Pelajaran',
        label: 'Mata Pelajaran',
        className: 'min-w-[180px]',
        render: (_val: unknown, row: CbtBankSoal) => (
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {row.Mapel?.nama_mapel || '-'}
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
        className: 'min-w-[180px]',
        render: (_val: unknown, row: CbtBankSoal) => (
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
            {row.Guru?.nama_guru || '-'}
          </div>
        ),
      },
      {
        key: 'aksi',
        title: 'Aksi',
        label: 'Aksi',
        className: 'min-w-[200px] text-right',
        render: (_val: unknown, row: CbtBankSoal) => (
          <div className="flex items-center justify-end gap-1 flex-nowrap" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedBankSoal(row);
                setIsDetailModalOpen(true);
              }}
              className="text-xs h-7 px-2.5 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold rounded-lg"
            >
              <Eye size={13} className="mr-1" />
              <span>Kelola Soal</span>
            </Button>

            {!readOnly && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedBankSoal(row);
                    setIsFormModalOpen(true);
                  }}
                  className="text-xs h-7 px-2 text-slate-600 hover:text-slate-900 rounded-lg"
                  title="Edit Bank Soal"
                >
                  <Edit2 size={13} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(row)}
                  className="text-xs h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                  title="Hapus Bank Soal"
                >
                  <Trash2 size={13} />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [readOnly]
  );

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* Filter Engine Terpadu */}
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
        className="shadow-2xs"
      />

      {/* Konten Data: Mobile List vs Desktop Table */}
      {isMobile ? (
        <MobileAcademicList
          title="Bank Soal CBT"
          data={items}
          isLoading={isLoading}
          totalItems={pagination?.totalItems || 0}
          emptyMessage="Belum ada bank soal terdaftar"
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
          onItemClick={(item) => {
            setSelectedBankSoal(item);
            setIsDetailModalOpen(true);
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <Table
            data={items}
            columns={columns}
            loading={isLoading}
            hoverable={true}
            emptyMessage="Belum ada bank soal terdaftar"
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

      {/* Modal Form Tambah / Edit Bank Soal */}
      {isFormModalOpen && (
        <CbtBankSoalFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setSelectedBankSoal(null);
          }}
          bankSoalToEdit={selectedBankSoal}
          defaultGuruId={guruId}
          defaultMapelId={mapelId || (filter.values.mapelId as string) || undefined}
          onSuccess: async () => {
            setPage(1);
            await queryClient.invalidateQueries({
              queryKey: cbtQueryKeys.bankSoal(),
              exact: false,
              refetchType: 'all',
            });
          },
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
          readOnly={readOnly}
        />
      )}
    </div>
  );
});
