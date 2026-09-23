import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  Layers, 
  Loader2, 
  ShieldAlert,
  Search,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { raporApi, type P5FasilitatorItem } from '../../../api/rapor.api';
import { useGuruOptions } from '../../../hooks/useGuruOptions';
import { useKelasOptions } from '../../../hooks/useKelasOptions';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Modal } from '../../ui/Modal';
import { cn } from '../../../lib/utils';

interface P5FacilitatorSettingsTabProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  canManage: boolean;
}

export const P5FacilitatorSettingsTab: React.FC<P5FacilitatorSettingsTabProps> = ({
  tahunPelajaranId,
  semesterId,
  canManage,
}) => {
  const queryClient = useQueryClient();
  const [selectedProjekId, setSelectedProjekId] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFasilitatorId, setEditingFasilitatorId] = useState<string | null>(null);
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [classSearchQuery, setClassSearchQuery] = useState('');

  // 1. Fetch Projek P5 for active academic period
  const { data: projekListRes, isLoading: isLoadingProjek } = useQuery({
    queryKey: ['p5-projek-list-settings', tahunPelajaranId, semesterId],
    queryFn: () => raporApi.getP5Projek({
      tahun_pelajaran_id: tahunPelajaranId,
      semester_id: semesterId,
    }),
    enabled: !!tahunPelajaranId,
  });

  const projekList = useMemo(() => {
    return (projekListRes?.data || []) as Array<{
      id: string;
      judul: string;
      deskripsi?: string;
      Fasilitator?: P5FasilitatorItem[];
    }>;
  }, [projekListRes]);

  // Auto-sync project selection when academic period or project list changes
  React.useEffect(() => {
    if (projekList.length > 0) {
      const exists = projekList.some((p) => p.id === selectedProjekId);
      if (!exists) {
        setSelectedProjekId(projekList[0].id);
      }
    } else {
      setSelectedProjekId('');
    }
  }, [projekList, selectedProjekId]);

  const activeProjek = useMemo(() => {
    return projekList.find((p) => p.id === selectedProjekId) || null;
  }, [projekList, selectedProjekId]);

  // 2. Fetch Fasilitator for selected project
  const { data: fasilitatorRes, isLoading: isLoadingFasilitator } = useQuery({
    queryKey: ['p5-fasilitator-list', selectedProjekId],
    queryFn: () => raporApi.getP5Fasilitator(selectedProjekId),
    enabled: !!selectedProjekId,
  });

  const fasilitatorList = useMemo(() => {
    return (fasilitatorRes?.data || []) as P5FasilitatorItem[];
  }, [fasilitatorRes]);

  // 3. Guru & Kelas Master Options
  const { options: guruOptions, isLoading: isLoadingGurus } = useGuruOptions({
    jenisPtk: 'PENDIDIK',
    onlyActive: true,
  });

  const { rawList: kelasRawList, isLoading: isLoadingClasses } = useKelasOptions({
    onlyActive: true,
  });

  const filteredKelasList = useMemo(() => {
    if (!classSearchQuery.trim()) return kelasRawList;
    const q = classSearchQuery.toLowerCase();
    return kelasRawList.filter((k: any) =>
      (k.nama_kelas || k.nama || '').toLowerCase().includes(q)
    );
  }, [kelasRawList, classSearchQuery]);

  // 4. Mutations
  const upsertMutation = useMutation({
    mutationFn: (payload: { guru_id: string; kelas_ids: string[] }) =>
      raporApi.upsertP5Fasilitator(selectedProjekId, payload),
    onSuccess: () => {
      toast.success('Tim fasilitator projek berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['p5-fasilitator-list', selectedProjekId] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      queryClient.invalidateQueries({ queryKey: ['my-p5-projects-hero'] });
      setIsModalOpen(false);
      resetModalForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan fasilitator projek');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (guruId: string) =>
      raporApi.removeP5Fasilitator(selectedProjekId, guruId),
    onSuccess: () => {
      toast.success('Guru berhasil dihapus dari tim fasilitator');
      queryClient.invalidateQueries({ queryKey: ['p5-fasilitator-list', selectedProjekId] });
      queryClient.invalidateQueries({ queryKey: ['p5-projek-list-settings'] });
      queryClient.invalidateQueries({ queryKey: ['my-p5-projects-hero'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus fasilitator');
    },
  });

  const resetModalForm = () => {
    setEditingFasilitatorId(null);
    setSelectedGuruId('');
    setSelectedKelasIds([]);
    setClassSearchQuery('');
  };

  const handleOpenAddModal = () => {
    resetModalForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: P5FasilitatorItem) => {
    setEditingFasilitatorId(item.id);
    setSelectedGuruId(item.guru_id);
    const existingClassIds = item.Kelas?.map((k) => k.kelas_id) || [];
    setSelectedKelasIds(existingClassIds);
    setIsModalOpen(true);
  };

  const handleToggleClass = (classId: string) => {
    setSelectedKelasIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSelectAllFilteredClasses = () => {
    const allFilteredIds = filteredKelasList.map((k: any) => k.id);
    setSelectedKelasIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
  };

  const handleClearSelectedClasses = () => {
    setSelectedKelasIds([]);
  };

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuruId) {
      toast.error('Pilih guru fasilitator terlebih dahulu');
      return;
    }
    upsertMutation.mutate({
      guru_id: selectedGuruId,
      kelas_ids: selectedKelasIds,
    });
  };

  const projectSelectOptions = useMemo(() => {
    return projekList.map((p) => ({
      value: p.id,
      label: p.judul,
    }));
  }, [projekList]);

  return (
    <div className="space-y-6">
      {/* ── Header & Info Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Tim Fasilitator Projek P5
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Petakan guru-guru pendidik yang bertugas mendampingi dan menginput nilai kualitatif P5 per rombongan belajar.
          </p>
        </div>

        {canManage && activeProjek && (
          <Button
            type="button"
            variant="toolbarPrimary"
            size="toolbar"
            onClick={handleOpenAddModal}
            className="rounded-xl font-bold shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Fasilitator
          </Button>
        )}
      </div>

      {/* ── Project Selector ── */}
      <Card className="p-4 sm:p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pilih Projek P5 Aktif
            </label>
            <SearchableSelect
              id="select-p5-project"
              value={selectedProjekId}
              onValueChange={setSelectedProjekId}
              options={projectSelectOptions}
              placeholder="-- Pilih Projek P5 --"
              isLoading={isLoadingProjek}
            />
          </div>

          {activeProjek && (
            <div className="md:col-span-2 flex flex-col justify-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400">
                Deskripsi Projek Terpilih:
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                {activeProjek.deskripsi || 'Tidak ada catatan deskripsi projek.'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ── Facilitator List ── */}
      {!selectedProjekId ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent rounded-2xl">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Pilih Projek P5</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Silakan pilih projek P5 di atas untuk melihat dan mengelola tim fasilitator serta kelas yang ditugaskan.
          </p>
        </Card>
      ) : isLoadingFasilitator ? (
        <div className="py-16 text-center text-xs text-slate-400 italic">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
          Memuat tim fasilitator projek...
        </div>
      ) : fasilitatorList.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent rounded-2xl space-y-3">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <div>
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Belum Ada Fasilitator Terdaftar</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Belum ada guru yang ditugaskan untuk projek ini. Klik tombol <span className="font-bold text-indigo-600">Tambah Fasilitator</span> untuk memetakan guru beserta kelas binaannya.
            </p>
          </div>
          {canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAddModal}
              className="rounded-xl font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Tugaskan Guru Sekarang
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fasilitatorList.map((item) => {
            const coveredClasses = item.Kelas?.map((k) => k.Kelas) || [];

            return (
              <Card
                key={item.id}
                className="p-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs space-y-3 relative flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100 dark:border-indigo-900">
                        {item.Guru?.nama_guru?.charAt(0) || 'G'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-white line-clamp-1">
                          {item.Guru?.nama_guru || 'Nama Guru'}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          NIP: {item.Guru?.nip || '-'}
                        </span>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 h-auto text-slate-500 hover:text-indigo-600 rounded-lg"
                          title="Edit Kelas Binaan"
                        >
                          <Edit3 size={13} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Hapus ${item.Guru?.nama_guru} dari tim fasilitator projek ini?`)) {
                              deleteMutation.mutate(item.guru_id);
                            }
                          }}
                          className="p-1.5 h-auto text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                          title="Hapus Fasilitator"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Covered Classes Chips */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Kelas yang Dikover ({coveredClasses.length} Rombel):
                    </span>
                    {coveredClasses.length === 0 ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                        Belum ada kelas yang dipetakan
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                        {coveredClasses.map((cls) => (
                          <span
                            key={cls.id}
                            className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800"
                          >
                            {cls.nama_kelas}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 pt-2 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 mt-2">
                  <span>Status: Terdaftar Resmi</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Aktif
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Modal Add / Edit Fasilitator ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFasilitatorId ? 'Edit Kelas Fasilitator P5' : 'Tugaskan Guru Fasilitator P5'}
      >
        <form onSubmit={handleSubmitModal} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Pilih Guru Pendidik *
            </label>
            <SearchableSelect
              id="modal-select-guru"
              value={selectedGuruId}
              onValueChange={setSelectedGuruId}
              options={guruOptions}
              placeholder="-- Pilih Guru --"
              isLoading={isLoadingGurus}
              disabled={!!editingFasilitatorId}
            />
            {editingFasilitatorId && (
              <span className="text-[10px] text-slate-400">
                Nama guru tidak dapat diubah saat mode edit rombel.
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih Kelas yang Dikover ({selectedKelasIds.length} Terpilih)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFilteredClasses}
                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleClearSelectedClasses}
                  className="text-[10px] font-bold text-rose-500 hover:underline"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            {/* Search Input for Classes */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kelas (misal: X TKJ 1)..."
                value={classSearchQuery}
                onChange={(e) => setClassSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Checklist Grid */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 max-h-52 overflow-y-auto space-y-1 bg-slate-50/50 dark:bg-slate-950/30">
              {isLoadingClasses ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">Memuat kelas...</div>
              ) : filteredKelasList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">Tidak ada kelas yang cocok.</div>
              ) : (
                filteredKelasList.map((cls: any) => {
                  const isChecked = selectedKelasIds.includes(cls.id);
                  return (
                    <div
                      key={cls.id}
                      onClick={() => handleToggleClass(cls.id)}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer select-none transition-all",
                        isChecked
                          ? "bg-indigo-600 text-white font-bold shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-4 h-4 rounded-md flex items-center justify-center border transition-all",
                            isChecked
                              ? "bg-white text-indigo-600 border-white"
                              : "border-slate-300 dark:border-slate-600 bg-transparent"
                          )}
                        >
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span>{cls.nama_kelas || cls.nama}</span>
                      </div>
                      <span className={cn("text-[10px]", isChecked ? "text-indigo-100" : "text-slate-400")}>
                        Tingkat {cls.tingkat || 10}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="toolbarPrimary"
              size="sm"
              disabled={upsertMutation.isPending}
              className="rounded-xl font-bold"
            >
              {upsertMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Simpan Penugasan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
