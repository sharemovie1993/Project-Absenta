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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtBankSoal } from '@/types/cbt.types';
import { CbtBankSoalFormModal } from './CbtBankSoalFormModal';
import { CbtBankSoalDetailModal } from './CbtBankSoalDetailModal';
import { CbtJadwalFormModal } from '../jadwal/CbtJadwalFormModal';
import { getTingkatRoman } from './cbtAsesmenHelper';
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
  const currentGuruId = guruId || user?.guru_profile?.id;

  // Konteks Mode: Panitia CBT (Kurikulum / Admin) vs Guru Mandiri
  const isPanitiaCbt = useMemo(() => {
    if (roleContext === 'KURIKULUM' || roleContext === 'ADMIN') return true;
    if (roleContext === 'GURU') return false;
    if (guruId) return false;
    return Boolean(isAdmin || isKurikulum);
  }, [roleContext, guruId, isAdmin, isKurikulum]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBankSoal, setSelectedBankSoal] = useState<CbtBankSoal | null>(null);
  const [isJadwalModalOpen, setIsJadwalModalOpen] = useState(false);
  const [bankSoalForJadwal, setBankSoalForJadwal] = useState<CbtBankSoal | null>(null);

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

  // 2. Fetch Bank Soal via TanStack Query
  const { data, isLoading } = useQuery({
    queryKey: cbtQueryKeys.bankSoal({
      page,
      limit,
      search: filter.debouncedSearchQuery,
      tingkat: isPanitiaCbt ? normalizedTingkat : undefined,
      mapel_id: mapelId || (isPanitiaCbt ? filter.values.mapelId : undefined),
      guru_id: guruId,
    }),
    queryFn: () =>
      cbtApi.getBankSoalList({
        page,
        limit,
        search: filter.debouncedSearchQuery,
        tingkat: isPanitiaCbt ? normalizedTingkat : undefined,
        mapel_id: mapelId || (isPanitiaCbt ? filter.values.mapelId : undefined),
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
      toast.success('Bank soal berhasil disalin ke daftar Bank Soal Anda');
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.bankSoal(),
        exact: false,
        refetchType: 'all',
      });
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
  const columns: Column[] = useMemo(
    () => [
      {
        key: 'kode_bank',
        title: 'Kode & Judul Bank Soal',
        label: 'Kode & Judul Bank Soal',
        className: 'min-w-[240px]',
        render: (_val: unknown, row: CbtBankSoal) => {
          const isSharedBank = row.status === 'PUBLISHED';
          const isFromColleague = Boolean(currentGuruId && row.guru_id !== currentGuruId);
          const code = (row.kode_bank || '').toUpperCase();
          const isMassalPackage =
            code.startsWith('SAS-') ||
            code.startsWith('SAT-') ||
            code.startsWith('STS-') ||
            code.startsWith('PSAJ-') ||
            code.startsWith('PAS-') ||
            code.startsWith('PAT-') ||
            code.startsWith('PTS-') ||
            code.startsWith('US-') ||
            code.startsWith('UAS-') ||
            code.startsWith('TRYOUT-');

          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40">
                  {row.kode_bank}
                </span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  Tingkat {row.tingkat}
                </Badge>
                {isMassalPackage ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    🏛️ Paket Terpusat
                  </span>
                ) : isSharedBank ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                    <Share2 size={10} />
                    <span>{isFromColleague ? 'Bersama (Se-Mapel)' : 'Dibagikan'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                    Mandiri
                  </span>
                )}
              </div>
              <p className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1 pt-0.5">
                {row.judul}
              </p>
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
        className: 'min-w-[220px] text-right',
        render: (_val: unknown, row: CbtBankSoal) => {
          const isFromColleague = Boolean(currentGuruId && row.guru_id !== currentGuruId);
          const questionCount = row.jumlah_soal || row._count?.Soal || 0;
          return (
            <div className="flex items-center justify-end gap-1 flex-nowrap" onClick={(e) => e.stopPropagation()}>
              {!readOnly && !isFromColleague && questionCount > 0 && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => handleOpenJadwalModal(row)}
                  className="text-xs h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Jadwalkan & Aktifkan Ujian untuk Kelas Binaan Anda"
                >
                  <Rocket size={12} />
                  <span>Aktifkan</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedBankSoal(row);
                  setIsDetailModalOpen(true);
                }}
                className="text-xs h-7 px-2.5 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold rounded-lg cursor-pointer"
              >
                <Eye size={13} className="mr-1" />
                <span>{isFromColleague || readOnly ? 'Lihat Soal' : 'Kelola Soal'}</span>
              </Button>

              {!readOnly && isFromColleague && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicate(row)}
                  disabled={duplicateMutation.isPending}
                  className="text-xs h-7 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold rounded-lg flex items-center gap-1"
                  title="Klaim & Salin Master Soal MGMP ini ke Akun Anda"
                >
                  <Copy size={12} />
                  <span>Klaim Master</span>
                </Button>
              )}

              {!readOnly && !isFromColleague && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicate(row)}
                  disabled={duplicateMutation.isPending}
                  className="text-xs h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg cursor-pointer"
                  title="Duplikat Bank Soal"
                >
                  <Copy size={13} />
                </Button>
              )}

              {!readOnly && !isFromColleague && (
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
          );
        },
      },
    ],
    [readOnly, currentGuruId, duplicateMutation.isPending]
  );

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* ── Toolbar: Panitia CBT menggunakan AcademicFilterToolbar, Guru cukup tombol '+ Buat Bank Soal' ── */}
      {isPanitiaCbt ? (
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
      ) : (
        /* Area Guru: Cukup tombol '+ Buat Bank Soal' ramping tanpa card banner & tanpa input pencarian */
        !readOnly && (
          <div className="flex items-center justify-end">
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
              <span>+ Buat Bank Soal</span>
            </Button>
          </div>
        )
      )}

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
          renderCard={(item: CbtBankSoal) => {
            const isSharedBank = item.status === 'PUBLISHED';
            const isFromColleague = Boolean(currentGuruId && item.guru_id !== currentGuruId);
            const questionCount = item.jumlah_soal || item._count?.Soal || 0;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5"
              >
                {/* Header: Kode, Tingkat & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40">
                        {item.kode_bank}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Tingkat {item.tingkat}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-1 leading-tight line-clamp-2">
                      {item.judul}
                    </h4>
                  </div>

                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border",
                      isSharedBank
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                    )}
                  >
                    {isSharedBank ? 'Telah Terbit' : 'Draft'}
                  </span>
                </div>

                {/* Strip Detail: Mapel, Durasi & Jumlah Soal */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Mata Pelajaran
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                      {item.Mapel?.nama_mapel || '-'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 pl-2.5 border-l border-slate-200 dark:border-slate-700">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Butir Soal
                    </span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">
                      {questionCount} Soal
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">({item.alokasi_menit}m)</span>
                  </div>
                </div>

                {/* Tombol Aksi: Aktifkan Ujian & Kelola Soal */}
                <div className="space-y-1.5 pt-0.5">
                  {questionCount > 0 && !readOnly && !isFromColleague && (
                    <button
                      type="button"
                      onClick={() => handleOpenJadwalModal(item)}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                    >
                      <Rocket size={14} />
                      <span>Aktifkan Ujian untuk Kelas Binaan</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBankSoal(item);
                        setIsDetailModalOpen(true);
                      }}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5",
                        questionCount > 0 && !readOnly && !isFromColleague
                          ? "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      )}
                    >
                      <BookOpen size={14} />
                      <span>{isFromColleague || readOnly ? 'Lihat Soal' : (questionCount > 0 ? 'Susun & Kelola Soal' : 'Mulai Susun Soal')}</span>
                    </button>

                    {!readOnly && !isFromColleague && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBankSoal(item);
                            setIsFormModalOpen(true);
                          }}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                          title="Edit Informasi Bank Soal"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Hapus Bank Soal"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
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
          roleContext={roleContext}
          onSuccess={async () => {
            setPage(1);
            await queryClient.invalidateQueries({
              queryKey: cbtQueryKeys.bankSoal(),
              exact: false,
              refetchType: 'all',
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
          readOnly={readOnly || Boolean(currentGuruId && selectedBankSoal.guru_id !== currentGuruId)}
          onAktifkanUjian={(b) => {
            setIsDetailModalOpen(false);
            handleOpenJadwalModal(b);
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
    </div>
  );
});

export default CbtBankSoalView;
