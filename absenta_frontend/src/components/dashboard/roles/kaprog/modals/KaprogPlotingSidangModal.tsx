import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  GraduationCap,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { hubinApi } from '@/api/hubin.api';
import { getKaprogStats } from '@/api/dashboard.api';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { GuruProduktifItem } from '../types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export interface KaprogPlotingSidangModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  guruProduktifList?: GuruProduktifItem[];
  onSuccess?: () => void;
}

export const KaprogPlotingSidangModal: React.FC<KaprogPlotingSidangModalProps> = ({
  isOpen,
  onClose,
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId,
  semesterId,
  guruProduktifList: propGuruProduktif,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // State
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('ALL');
  const [plotFilter, setPlotFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<Set<string>>(new Set());

  // 1. Ambil Data Guru Produktif Jurusan (Prioritas SSOT Khusus Guru Kejuruan)
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['kaprog-stats-guru-produktif-modal', jurusanId],
    queryFn: () => getKaprogStats({ jurusan_id: jurusanId }).catch(() => null),
    enabled: isOpen && Boolean(jurusanId) && (!propGuruProduktif || propGuruProduktif.length === 0),
    staleTime: 5 * 60 * 1000,
  });

  const { rawList: allGuruList, isLoading: loadingAllGuru } = useGuruOptions({
    jenisPtk: 'ALL',
    onlyActive: false,
  });

  // Resolusi Daftar Guru Penguji Khusus Produktif Jurusan
  const examinerOptions = useMemo(() => {
    const listProduktif: GuruProduktifItem[] =
      (propGuruProduktif && propGuruProduktif.length > 0)
        ? propGuruProduktif
        : (statsData?.data?.guruProduktif || statsData?.guruProduktif || []);

    if (listProduktif.length > 0) {
      return listProduktif.map((g) => ({
        id: g.id,
        nama_guru: g.nama,
        nip: g.nip || null,
        mapel: g.mapel || 'Guru Produktif Kejuruan',
        isProduktif: true,
      }));
    }

    // Fallback jika belum ada jadwal KBM produktif terdata di database
    return (allGuruList || []).map((g) => ({
      id: g.id,
      nama_guru: g.nama_guru,
      nip: g.nip || null,
      mapel: 'Guru Pengajar',
      isProduktif: false,
    }));
  }, [propGuruProduktif, statsData, allGuruList]);

  // 2. Query Siswa PKL Jurusan
  const { data: pklData, isLoading: loadingSiswa, refetch } = useQuery({
    queryKey: ['kaprog-ploting-siswa-list', jurusanId, tahunPelajaranId, semesterId],
    queryFn: async () => {
      const res = await hubinApi.getRekapPklSiswa({
        tahun_pelajaran_id: tahunPelajaranId || undefined,
        semester_id: semesterId || undefined,
        status: 'ELIGIBLE',
      });
      const list: any[] = Array.isArray(res) ? res : res?.data?.list || res?.data || [];
      return list;
    },
    enabled: isOpen,
    staleTime: 30 * 1000,
  });

  // Filter Siswa Scoped Jurusan
  const rawSiswaList = useMemo(() => {
    if (!Array.isArray(pklData)) return [];
    if (!jurusanId) return pklData;
    return pklData.filter((item: any) => {
      const sJurusanId =
        item.Siswa?.jurusan_id ||
        item.Siswa?.Kelas?.jurusan_id ||
        item.SiswaAkademik?.kelas?.jurusan_id;
      return !sJurusanId || sJurusanId === jurusanId;
    });
  }, [pklData, jurusanId]);

  // Daftar Kelas Unik untuk Filter
  const availableKelasList = useMemo(() => {
    const set = new Set<string>();
    rawSiswaList.forEach((item: any) => {
      const k = item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas;
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [rawSiswaList]);

  // Filtered Siswa List
  const filteredSiswaList = useMemo(() => {
    return rawSiswaList.filter((item: any) => {
      const nama = item.Siswa?.nama_siswa || '';
      const nis = item.Siswa?.nis || '';
      const kelas = item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas || '';
      const pengujiId = item.nilai_json?.penguji_id;
      const pengujiNama = item.nilai_json?.penguji_nama;
      const isAssigned = Boolean(pengujiId || (pengujiNama && pengujiNama.trim() !== ''));

      // Filter Status Ploting
      if (plotFilter === 'UNASSIGNED' && isAssigned) return false;
      if (plotFilter === 'ASSIGNED' && !isAssigned) return false;

      // Filter Kelas
      if (selectedKelasFilter !== 'ALL' && kelas !== selectedKelasFilter) return false;

      // Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return nama.toLowerCase().includes(q) || nis.toLowerCase().includes(q);
      }

      return true;
    });
  }, [rawSiswaList, plotFilter, selectedKelasFilter, searchQuery]);

  // Handle Toggle Select
  const handleToggleSelectSiswa = (id: string) => {
    setSelectedSiswaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllFilteredSelected =
    filteredSiswaList.length > 0 &&
    filteredSiswaList.every((s: any) => selectedSiswaIds.has(s.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedSiswaIds((prev) => {
        const next = new Set(prev);
        filteredSiswaList.forEach((s: any) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedSiswaIds((prev) => {
        const next = new Set(prev);
        filteredSiswaList.forEach((s: any) => next.add(s.id));
        return next;
      });
    }
  };

  // Selected Guru Meta
  const selectedGuru = useMemo(() => {
    return examinerOptions.find((g) => g.id === selectedGuruId) || null;
  }, [examinerOptions, selectedGuruId]);

  // Mutation Assign Penguji Batch
  const plotingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGuruId || !selectedGuru) throw new Error('Silakan pilih guru penguji sidang.');
      if (selectedSiswaIds.size === 0) throw new Error('Pilih minimal 1 siswa untuk diploting.');

      const payloadScores = Array.from(selectedSiswaIds).map((siswaPklId) => ({
        siswa_pkl_id: siswaPklId,
        penguji_id: selectedGuru.id,
        penguji_nama: selectedGuru.nama_guru,
      }));

      return hubinApi.upsertNilaiPklBatch({
        scores: payloadScores,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });
    },
    onSuccess: () => {
      toast.success(
        `Berhasil memploting ${selectedSiswaIds.size} siswa ke penguji ${selectedGuru?.nama_guru}!`
      );
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-ploting-siswa-list'] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-pkl-summary'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-list'] });
      setSelectedSiswaIds(new Set());
      refetch();
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan ploting penguji.');
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
      {/* ── Modal Header ── */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <GraduationCap size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
              Ploting Guru Penguji Sidang PKL
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Tugaskan guru penyidang bersama siswa PKL Jurusan {jurusanNama}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Modal Body (Scrollable) ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
        {/* Section 1: Target Penguji Card (Khusus Guru Produktif Jurusan) */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              1. Pilih Guru Penguji Sidang PKL <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-900/40">
              Khusus Guru Produktif {jurusanNama} ({examinerOptions.length} Guru)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <select
                aria-label="Pilih Guru Penguji"
                value={selectedGuruId}
                onChange={(e) => setSelectedGuruId(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all cursor-pointer"
              >
                <option value="">-- Pilih Guru Produktif Penguji Sidang --</option>
                {examinerOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama_guru} {g.nip ? `(NIP. ${g.nip})` : ''} - [{g.mapel}]
                  </option>
                ))}
              </select>
            </div>
            {selectedGuru && (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 rounded-xl text-xs text-indigo-800 dark:text-indigo-300 font-bold shrink-0">
                <UserCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                <div className="min-w-0">
                  <div className="truncate max-w-[200px]">{selectedGuru.nama_guru}</div>
                  <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-normal truncate max-w-[200px]">{selectedGuru.mapel}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Filter Siswa Toolbar */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              2. Pilih Siswa PKL Jurusan ({filteredSiswaList.length} Siswa)
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['ALL', 'UNASSIGNED', 'ASSIGNED'] as const).map((pf) => (
                <button
                  key={pf}
                  type="button"
                  onClick={() => setPlotFilter(pf)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer',
                    plotFilter === pf
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  {pf === 'ALL' && 'Semua Siswa'}
                  {pf === 'UNASSIGNED' && 'Belum Diploting'}
                  {pf === 'ASSIGNED' && 'Sudah Diploting'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-2.5">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama siswa atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <select
              aria-label="Filter Kelas Siswa"
              value={selectedKelasFilter}
              onChange={(e) => setSelectedKelasFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {availableKelasList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 3: List Siswa dengan Checkbox */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {/* Header Row */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                onChange={handleToggleSelectAll}
                disabled={filteredSiswaList.length === 0}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <span>Pilih Semua yang Ditampilkan</span>
            </label>
            <span className="text-[11px] text-slate-500">
              Terpilih: <strong>{selectedSiswaIds.size}</strong> siswa
            </span>
          </div>

          {/* List Content */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px] overflow-y-auto">
            {loadingSiswa ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <span>Memuat daftar siswa PKL...</span>
              </div>
            ) : filteredSiswaList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Tidak ada siswa yang sesuai dengan filter.
              </div>
            ) : (
              filteredSiswaList.map((item: any) => {
                const isSelected = selectedSiswaIds.has(item.id);
                const sNama = item.Siswa?.nama_siswa || '-';
                const sNis = item.Siswa?.nis || '-';
                const sKelas = item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas || '-';
                const mitraNama = item.Mitra?.nama || item.mitra_nama || '-';
                const currentPengujiNama = item.nilai_json?.penguji_nama;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleSelectSiswa(item.id)}
                    className={cn(
                      'flex items-center justify-between p-3 text-xs transition-colors cursor-pointer select-none',
                      isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        aria-label={`Pilih ${sNama}`}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 shrink-0 cursor-pointer pointer-events-none"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {sNama}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                            {sKelas}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          <span>NIS: {sNis}</span>
                          <span>•</span>
                          <span className="truncate flex items-center gap-1">
                            <Building2 size={11} className="text-slate-400 shrink-0" />
                            {mitraNama}
                          </span>
                          {item.Pembimbing?.nama_guru && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400 truncate">
                                Pembimbing DU/DI: {item.Pembimbing.nama_guru}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {currentPengujiNama ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                          <UserCheck size={11} />
                          <span className="max-w-[130px] truncate">Penguji: {currentPengujiNama}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                          Penguji Belum Diploting
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Footer ── */}
      <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-10">
        <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
          {selectedGuru ? (
            <span>
              Akan menugaskan <strong>{selectedSiswaIds.size} siswa</strong> kepada{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">{selectedGuru.nama_guru}</strong>
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <AlertCircle size={14} /> Pilih guru penguji sidang terlebih dahulu.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1 sm:flex-initial rounded-xl text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!selectedGuruId || selectedSiswaIds.size === 0 || plotingMutation.isPending}
            onClick={() => plotingMutation.mutate()}
            className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            {plotingMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" />
                Menyimpan...
              </>
            ) : (
              <>
                <UserCheck size={14} className="mr-1.5" />
                Tugaskan Penguji ({selectedSiswaIds.size})
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default KaprogPlotingSidangModal;
