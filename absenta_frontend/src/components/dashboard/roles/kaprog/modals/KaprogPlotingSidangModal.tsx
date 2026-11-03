import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  GraduationCap,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  Building2,
  Check,
} from 'lucide-react';
import { Modal, Button } from '@/components/ui';
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
  const { data: statsData } = useQuery({
    queryKey: ['kaprog-stats-guru-produktif-modal', jurusanId],
    queryFn: () => getKaprogStats({ jurusan_id: jurusanId }).catch(() => null),
    enabled: isOpen && Boolean(jurusanId) && (!propGuruProduktif || propGuruProduktif.length === 0),
    staleTime: 5 * 60 * 1000,
  });

  const { rawList: allGuruList } = useGuruOptions({
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
  const handleToggleSelectSiswa = useCallback((id: string) => {
    setSelectedSiswaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isAllFilteredSelected =
    filteredSiswaList.length > 0 &&
    filteredSiswaList.every((s: any) => selectedSiswaIds.has(s.id));

  const handleToggleSelectAll = useCallback(() => {
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
  }, [isAllFilteredSelected, filteredSiswaList]);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      disableClose={true}
      contentClassName="p-0 flex flex-col h-[94vh] sm:h-[86vh] max-h-[760px] overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
    >
      {/* ── 1. MODAL HEADER (Pinned Sticky Top, Zero Double-X) ── */}
      <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <GraduationCap size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              Ploting Guru Penguji Sidang PKL
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Khusus Guru Produktif Jurusan {jurusanNama}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup Modal"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── 2. PINNED CONTROL HUB (Sticky Top, Never Scrolls Away) ── */}
      <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 space-y-2.5 shrink-0">
        {/* Step 1: Pilih Guru Produktif Penguji */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Pilih Guru Penguji Sidang:</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-900/40">
              {examinerOptions.length} Guru Produktif Terdata
            </span>
          </div>

          <div className="relative">
            <select
              aria-label="Pilih Guru Penguji Sidang"
              value={selectedGuruId}
              onChange={(e) => setSelectedGuruId(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 sm:py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all cursor-pointer truncate shadow-2xs"
            >
              <option value="">-- Pilih Guru Produktif Penguji Sidang --</option>
              {examinerOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama_guru} {g.nip ? `(NIP. ${g.nip})` : ''} - [{g.mapel}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Search, Filter Kelas, dan Filter Status Ploting */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
            />
          </div>

          {/* Filter Kelas */}
          <div className="w-full sm:w-44 shrink-0">
            <select
              aria-label="Filter Kelas"
              value={selectedKelasFilter}
              onChange={(e) => setSelectedKelasFilter(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer shadow-2xs truncate"
            >
              <option value="ALL">Semua Kelas</option>
              {availableKelasList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 py-0.5">
            {(['ALL', 'UNASSIGNED', 'ASSIGNED'] as const).map((pf) => (
              <button
                key={pf}
                type="button"
                onClick={() => setPlotFilter(pf)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition-colors cursor-pointer',
                  plotFilter === pf
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                )}
              >
                {pf === 'ALL' && 'Semua'}
                {pf === 'UNASSIGNED' && 'Belum Diploting'}
                {pf === 'ASSIGNED' && 'Sudah Diploting'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. LIST HEADER BAR (Select All & Counter) ── */}
      <div className="flex items-center justify-between px-3.5 sm:px-5 py-2 bg-slate-100/90 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAllFilteredSelected}
            onChange={handleToggleSelectAll}
            disabled={filteredSiswaList.length === 0}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
          />
          <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">
            Pilih Semua ({filteredSiswaList.length} siswa)
          </span>
        </label>
        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
          Terpilih: {selectedSiswaIds.size}
        </span>
      </div>

      {/* ── 4. SCROLLABLE STUDENT LIST (The ONLY Scroll Container) ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-h-0 bg-white dark:bg-slate-900">
        {loadingSiswa ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
            <span>Memuat daftar siswa PKL...</span>
          </div>
        ) : filteredSiswaList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Tidak ada siswa yang sesuai dengan filter.
          </div>
        ) : (
          filteredSiswaList.map((item: any) => {
            const isSelected = selectedSiswaIds.has(item.id);
            const sNama = item.Siswa?.nama_siswa || '-';
            const sNis = item.Siswa?.nis || '-';
            const sKelas = item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas || '-';
            const mitraNama = item.Mitra?.nama || item.mitra_nama || '-';
            const pembimbingNama = item.Pembimbing?.nama_guru;
            const currentPengujiNama = item.nilai_json?.penguji_nama;

            return (
              <div
                key={item.id}
                onClick={() => handleToggleSelectSiswa(item.id)}
                className={cn(
                  'flex items-center justify-between px-3.5 sm:px-5 py-2.5 text-xs transition-colors cursor-pointer select-none',
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-850/60'
                )}
              >
                {/* Kolom Kiri: Checkbox & Informasi Siswa */}
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      aria-label={`Pilih ${sNama}`}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer pointer-events-none"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] truncate">
                        {sNama}
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        {sKelas}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      <span>NIS: {sNis}</span>
                      <span>•</span>
                      <span className="truncate flex items-center gap-1">
                        <Building2 size={11} className="text-slate-400 shrink-0" />
                        {mitraNama}
                      </span>
                      {pembimbingNama && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-slate-400 dark:text-slate-500 hidden sm:inline truncate">
                            Pembimbing: {pembimbingNama}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kolom Kanan: Status Penguji Sidang */}
                <div className="shrink-0 text-right">
                  {currentPengujiNama ? (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 shadow-2xs">
                      <UserCheck size={11} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="max-w-[120px] sm:max-w-[160px] truncate">
                        {currentPengujiNama}
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                      Belum Diploting
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 5. PINNED MODAL FOOTER (Sticky Bottom) ── */}
      <div className="px-3.5 sm:px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left min-w-0">
          {selectedGuru ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓ Target:</span>
              <span className="truncate">
                <strong>{selectedSiswaIds.size} siswa</strong> ➔{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">{selectedGuru.nama_guru}</strong>
              </span>
            </div>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center sm:justify-start gap-1">
              <AlertCircle size={14} className="shrink-0" />
              <span>Pilih guru penguji sidang terlebih dahulu.</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1 sm:flex-initial rounded-xl text-xs h-9 px-3.5"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!selectedGuruId || selectedSiswaIds.size === 0 || plotingMutation.isPending}
            onClick={() => plotingMutation.mutate()}
            className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer h-9 px-4"
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
