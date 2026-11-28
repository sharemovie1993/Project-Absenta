import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  Briefcase,
  Layers,
  CalendarOff,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Button, Switch } from '@/components/ui';
import { Loader } from '@/components/ui/Loader';
import { useAcademicFilter } from '@/components/common/academic-filter';
import { useConfirm } from '@/providers/ConfirmProvider';
import {
  getPeriodeOperasionalKbm,
  createPeriodeOperasionalKbm,
  updatePeriodeOperasionalKbm,
  deletePeriodeOperasionalKbm,
  type PeriodeOperasionalKbmItem,
  type SavePeriodeOperasionalKbmPayload,
} from '@/api/kurikulum/periodeKbm.api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const PeriodeOperasionalKbmModal = lazy(() => import('./PeriodeOperasionalKbmModal'));

export interface UniversalPeriodeOperasionalKbmViewProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  scope?: 'ALL' | 'PKL' | 'KBM_BLOK';
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  className?: string;
}

function formatIdDate(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const PeriodeOperasionalKbmView: React.FC<UniversalPeriodeOperasionalKbmViewProps> = React.memo(({
  tahunPelajaranId: propTpId,
  semesterId: propSemId,
  scope = 'ALL',
  isModal = false,
  readOnly = false,
  className,
}) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const internalAcademic = useAcademicFilter({ enableTp: true, enableSemester: true });

  const effectiveTpId = propTpId || internalAcademic.values.tahunPelajaranId || internalAcademic.activeTpYear?.id || '';
  const effectiveTpName = internalAcademic.activeTpYear?.tahun || '';
  const effectiveSemId = propSemId || internalAcademic.values.semesterId || undefined;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PeriodeOperasionalKbmItem | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['periode-operasional-kbm', effectiveTpId || 'ALL', scope],
    queryFn: () =>
      getPeriodeOperasionalKbm({
        tahun_pelajaran_id: effectiveTpId || undefined,
        tipe: scope === 'PKL' ? 'PKL' : scope === 'KBM_BLOK' ? 'KBM_BLOK' : undefined,
      }),
    staleTime: 30_000,
  });

  const items = useMemo(() => (Array.isArray(res?.data) ? res!.data : []), [res]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['periode-operasional-kbm'] });
    queryClient.invalidateQueries({ queryKey: ['unified-kbm-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['sesi-absensi'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-dashboard-live'] });
  }, [queryClient]);

  const handleOpenCreate = useCallback(() => {
    if (readOnly) return;
    setEditingItem(null);
    setIsFormOpen(true);
  }, [readOnly]);

  const handleOpenEdit = useCallback((item: PeriodeOperasionalKbmItem) => {
    if (readOnly) return;
    setEditingItem(item);
    setIsFormOpen(true);
  }, [readOnly]);

  const handleSave = useCallback(
    async (payload: SavePeriodeOperasionalKbmPayload) => {
      try {
        if (editingItem) {
          await updatePeriodeOperasionalKbm(editingItem.id, payload);
          toast.success('Periode berhasil diperbarui');
        } else {
          await createPeriodeOperasionalKbm(payload);
          toast.success('Periode berhasil ditambahkan');
        }
        invalidateAll();
        setIsFormOpen(false);
        setEditingItem(null);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan periode');
        throw err;
      }
    },
    [editingItem, invalidateAll]
  );

  const handleToggleActive = useCallback(
    async (item: PeriodeOperasionalKbmItem, checked: boolean) => {
      if (readOnly) return;
      try {
        await updatePeriodeOperasionalKbm(item.id, { aktif: checked });
        invalidateAll();
        toast.success(`Periode "${item.nama}" ${checked ? 'diaktifkan' : 'dinonaktifkan'}`);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal mengubah status periode');
      }
    },
    [invalidateAll, readOnly]
  );

  const handleDelete = useCallback(
    async (item: PeriodeOperasionalKbmItem) => {
      if (readOnly) return;
      const ok = await confirm({
        title: 'Hapus Periode Operasional?',
        description: `Hapus periode "${item.nama}"? Jadwal KBM kelas terkait akan kembali aktif normal.`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger',
      });
      if (!ok) return;
      try {
        await deletePeriodeOperasionalKbm(item.id);
        invalidateAll();
        toast.success(`Periode "${item.nama}" dihapus`);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menghapus periode');
      }
    },
    [confirm, invalidateAll, readOnly]
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className={cn('space-y-4 w-full min-w-0', isModal && 'p-2 sm:p-4', className)}>
      {/* Header Bersih */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {scope === 'PKL'
              ? 'Periode Pelaksanaan PKL (Bebas KBM Kelas)'
              : 'Periode PKL, KBM Sistem Blok & Agenda Non-KBM'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kartu KBM virtual pada tingkat/kelas yang sedang PKL atau di luar giliran Blok otomatis disembunyikan dan tidak dihitung alpa.
          </p>
        </div>

        {!readOnly && (
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 px-3.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>{scope === 'PKL' ? 'Tambah Periode PKL' : 'Tambah Periode'}</span>
          </Button>
        )}
      </div>

      {/* Daftar Periode */}
      {isLoading ? (
        <div className="py-10 flex justify-center">
          <Loader size="sm" />
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-center space-y-2">
          <Calendar className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Belum ada periode {scope === 'PKL' ? 'PKL' : 'PKL / KBM Blok'} yang ditetapkan.
          </p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Tambahkan rentang tanggal PKL (mis. Tingkat 12 Semester Ganjil) atau KBM Blok (mis. 3 bulan Produktif) agar jadwal KBM yang sedang libur tidak memicu alpa virtual.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const mulaiStr = String(item.tanggal_mulai || '').slice(0, 10);
            const selesaiStr = String(item.tanggal_selesai || '').slice(0, 10);
            const isRunningNow = item.aktif && todayStr >= mulaiStr && todayStr <= selesaiStr;
            const isUpcoming = item.aktif && todayStr < mulaiStr;

            const Icon =
              item.tipe === 'PKL' ? Briefcase : item.tipe === 'KBM_BLOK' ? Layers : CalendarOff;

            const tipeLabel =
              item.tipe === 'PKL'
                ? 'PKL • Prioritas 1'
                : item.tipe === 'KBM_BLOK'
                ? `KBM Blok • ${item.kelompok_aktif === 'UMUM' ? 'Umum Aktif' : 'Produktif Aktif'}`
                : 'Non-KBM';

            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-2xl border bg-white dark:bg-slate-900 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all',
                  !item.aktif
                    ? 'border-slate-200/70 dark:border-slate-800 opacity-60'
                    : isRunningNow
                    ? 'border-emerald-300 dark:border-emerald-800/70'
                    : 'border-slate-200/80 dark:border-slate-800'
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                      item.tipe === 'PKL'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                        : item.tipe === 'KBM_BLOK'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    )}
                  >
                    <Icon size={16} />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.nama}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {tipeLabel}
                      </span>
                      {isRunningNow ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          Sedang Berjalan
                        </span>
                      ) : isUpcoming ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          Terjadwal
                        </span>
                      ) : item.aktif ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Selesai
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.target_tingkat_label || (item.target_semua_kelas ? 'Seluruh Kelas' : `${item.target_kelas_ids?.length || 0} rombel`)}
                      </span>
                      <span>·</span>
                      <span>
                        {formatIdDate(item.tanggal_mulai)} – {formatIdDate(item.tanggal_selesai)}
                      </span>
                    </div>
                  </div>
                </div>

                {!readOnly && (
                  <div className="flex items-center justify-end gap-2 shrink-0 pl-12 sm:pl-0">
                    <Switch
                      checked={item.aktif}
                      onCheckedChange={(val) => handleToggleActive(item, val)}
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit periode"
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      title="Hapus periode"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <Suspense fallback={null}>
          <PeriodeOperasionalKbmModal
            editingItem={editingItem}
            lockedScope={scope}
            tahunPelajaranId={effectiveTpId}
            tahunPelajaranName={effectiveTpName}
            semesterId={effectiveSemId}
            onClose={() => {
              setIsFormOpen(false);
              setEditingItem(null);
            }}
            onSubmit={handleSave}
          />
        </Suspense>
      )}
    </div>
  );
});

export default PeriodeOperasionalKbmView;
