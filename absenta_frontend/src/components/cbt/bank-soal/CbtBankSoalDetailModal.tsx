import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  Button,
  Loader,
} from '@/components/ui';
import {
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Rocket,
  X,
  Layers,
  AlertCircle,
  RefreshCw,
  RotateCw,
  Puzzle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { listTenantUnits } from '@/api/kurikulum/guru-mapel.api';
import type { CbtBankSoal, CbtSoal, CbtUnitPengajaranSummary } from '@/types/cbt.types';
import { CbtContentRenderer } from '../common/CbtContentRenderer';
import { CbtOptionsRenderer } from '../common/CbtOptionsRenderer';
import { CbtInlineSoalCard } from './CbtSoalEditorModal';
import { CbtImportPuzzleModal } from './CbtImportPuzzleModal';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface CbtBankSoalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoal: CbtBankSoal | null;
  readOnly?: boolean;
  onAktifkanUjian?: (bankSoal: CbtBankSoal) => void;
  onMultiRemedial?: (bankSoal: CbtBankSoal) => void;
}

export const CbtBankSoalDetailModal: React.FC<CbtBankSoalDetailModalProps> = ({
  isOpen,
  onClose,
  bankSoal,
  readOnly = false,
  onAktifkanUjian,
  onMultiRemedial,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // activeCardId: ID soal yang sedang diedit inline, atau 'NEW' untuk form soal baru di bagian bawah, atau null
  const [activeCardId, setActiveCardId] = useState<string | 'NEW' | null>(null);
  const [droppedDraftText, setDroppedDraftText] = useState<string | null>(null);
  const [isDragOverAddBtn, setIsDragOverAddBtn] = useState(false);
  const [filterUnitId, setFilterUnitId] = useState<string>('ALL');
  const [isPuzzleImportOpen, setIsPuzzleImportOpen] = useState(false);

  useEffect(() => {
    setFilterUnitId('ALL');
  }, [isOpen, bankSoal?.id]);

  // Ambil daftar Unit Pengajaran aktif untuk mapel kolaborasi (dipakai sebagai tag & filter butir soal)
  const { data: tenantUnitsRes } = useQuery({
    queryKey: ['kurikulum-units-by-mapel', bankSoal?.mapel_id || ''],
    queryFn: () =>
      bankSoal?.mapel_id
        ? listTenantUnits({ mapel_id: bankSoal.mapel_id, is_active: true }).catch(() => null)
        : Promise.resolve(null),
    enabled: Boolean(
      isOpen &&
        bankSoal?.mapel_id &&
        !bankSoal.unit_pengajaran_id &&
        (!bankSoal.available_units || bankSoal.available_units.length === 0)
    ),
  });

  const availableUnits: CbtUnitPengajaranSummary[] = useMemo(() => {
    if (bankSoal?.unit_pengajaran_id) return [];
    if (Array.isArray(bankSoal?.available_units) && bankSoal.available_units.length > 0) {
      return bankSoal.available_units.filter((u) => {
        const name = (u.nama_unit || '').trim();
        return name && name.toLowerCase() !== 'null';
      });
    }
    const raw = tenantUnitsRes?.data || [];
    const seen = new Map<string, CbtUnitPengajaranSummary>();
    raw.forEach((u) => {
      const name = (u.nama_unit || '').trim();
      if (u.id && name && name.toLowerCase() !== 'null' && !seen.has(u.id)) {
        seen.set(u.id, {
          id: u.id,
          nama_unit: u.nama_unit,
          kode_unit: u.kode_unit,
          guru_id: u.guru_id,
          Guru: u.Guru ? { id: u.Guru.id, nama_guru: u.Guru.nama_guru } : null,
        });
      }
    });
    return Array.from(seen.values());
  }, [bankSoal?.unit_pengajaran_id, bankSoal?.available_units, tenantUnitsRes?.data]);

  // Fetch list of questions for this bank with robust network resilience
  const {
    data: soalList = [],
    isLoading,
    isError,
    error: soalError,
    refetch,
  } = useQuery({
    queryKey: cbtQueryKeys.soalList(bankSoal?.id || ''),
    queryFn: () => (bankSoal?.id ? cbtApi.getSoalList(bankSoal.id) : Promise.resolve([])),
    enabled: Boolean(isOpen && bankSoal?.id),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 3000),
  });

  // Hanya unit yang valid dan memiliki minimal 1 soal yang relevan di bank soal ini
  const relevantUnits = useMemo(() => {
    return availableUnits.filter((unit) => {
      return soalList.some((s) => s.unit_pengajaran_id === unit.id);
    });
  }, [availableUnits, soalList]);

  const unitMap = useMemo(() => {
    const map = new Map<string, CbtUnitPengajaranSummary>();
    availableUnits.forEach((u) => map.set(u.id, u));
    return map;
  }, [availableUnits]);

  // Jika bank soal masih kosong dan tidak readOnly, langsung buka kartu Soal #1 secara inline
  useEffect(() => {
    if (!isLoading && isOpen && !readOnly && soalList.length === 0) {
      setActiveCardId('NEW');
    }
  }, [isLoading, isOpen, readOnly, soalList.length]);

  const totalPoin = useMemo(() => {
    return soalList.reduce((acc, curr) => acc + (Number(curr.bobot) || 1), 0);
  }, [soalList]);

  const filteredSoalList = useMemo(() => {
    if (filterUnitId === 'ALL') return soalList;
    if (filterUnitId === 'UNASSIGNED') {
      return soalList.filter((s) => !s.unit_pengajaran_id);
    }
    return soalList.filter((s) => s.unit_pengajaran_id === filterUnitId);
  }, [soalList, filterUnitId]);

  // Delete question mutation
  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => cbtApi.deleteSoal(questionId),
    onSuccess: async () => {
      toast.success('Butir soal berhasil dihapus');
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.soalList(bankSoal?.id || ''),
        exact: false,
        refetchType: 'all',
      });
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.bankSoal(),
        exact: false,
        refetchType: 'all',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus butir soal');
    },
  });

  // Reset filter unit jika unit aktif tidak lagi relevan
  useEffect(() => {
    if (filterUnitId !== 'ALL' && filterUnitId !== 'UNASSIGNED') {
      const exists = relevantUnits.some((u) => u.id === filterUnitId);
      if (!exists) {
        setFilterUnitId('ALL');
      }
    }
  }, [relevantUnits, filterUnitId]);

  const handleDeleteSoal = async (soal: CbtSoal, displayNomor?: number) => {
    const nomor = displayNomor || soal.nomor_urut || 1;
    const isConfirmed = await confirm({
      title: 'Hapus Butir Soal?',
      message: `Apakah Anda yakin ingin menghapus butir soal nomor ${nomor}?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });

    if (isConfirmed) {
      if (activeCardId === soal.id) {
        setActiveCardId(null);
      }
      deleteMutation.mutate(soal.id);
    }
  };

  const clearAllMutation = useMutation({
    mutationFn: (bankId: string) => cbtApi.clearAllSoal(bankId),
    onSuccess: async (res) => {
      setActiveCardId(null);
      toast.success(`Berhasil mengosongkan ${res?.deletedCount ?? 0} butir soal`);
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.soalList(bankSoal?.id || ''),
        exact: false,
        refetchType: 'all',
      });
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.bankSoal(),
        exact: false,
        refetchType: 'all',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal mengosongkan soal');
    },
  });

  const handleClearAllSoal = async () => {
    if (!bankSoal || soalList.length === 0) return;
    const isConfirmed = await confirm({
      title: 'Kosongkan Semua Soal?',
      message: `Seluruh ${soalList.length} butir soal pada "${bankSoal.judul}" akan dihapus permanen. Lanjutkan?`,
      confirmText: 'Ya, Kosongkan Semua',
      cancelText: 'Batal',
      style: 'danger',
    });

    if (isConfirmed) {
      clearAllMutation.mutate(bankSoal.id);
    }
  };

  if (!bankSoal) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="full"
      disableClose={true}
      className="p-0 border-0 bg-transparent shadow-2xl"
      contentClassName="p-0 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 max-h-[96vh] sm:max-h-[92vh]"
    >
      <div className="flex flex-col h-full max-h-[96vh] sm:max-h-[92vh] overflow-hidden text-slate-800 dark:text-slate-100">
        {/* ── 1. STICKY TOP HEADER CARD ── */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 shrink-0 z-20 shadow-xs">
          <div className="h-1.5 bg-indigo-600 w-full" />

          <div className="px-3.5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                    {bankSoal.kode_bank}
                  </span>
                  {bankSoal.kolaborasi_badge && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {bankSoal.kolaborasi_badge}
                    </span>
                  )}
                  {bankSoal.UnitPengajaran && bankSoal.UnitPengajaran.nama_unit && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      Unit: {bankSoal.UnitPengajaran.nama_unit}
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                    {bankSoal.display_mapel || bankSoal.Mapel?.nama_mapel || 'Mata Pelajaran'}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Kelas <strong className="text-slate-800 dark:text-slate-200">{bankSoal.tingkat}</strong>
                  </span>
                </div>

                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {bankSoal.judul}
                </h1>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/80 dark:border-indigo-800/80 text-[11px]">
                    {totalPoin} Poin
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                    {soalList.length} Soal
                  </span>
                </div>

                {!readOnly && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPuzzleImportOpen(true)}
                      className="border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs h-8 sm:h-9 px-3 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                      title="Import & Susun Puzzle Soal dari Link Google Form atau Copy Teks"
                    >
                      <Puzzle size={14} />
                      <span className="hidden sm:inline">Import Puzzle</span>
                      <span className="sm:hidden">Import</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setActiveCardId('NEW')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Tambah Soal</span>
                    </Button>
                  </>
                )}

                {!readOnly && soalList.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={clearAllMutation.isPending}
                    onClick={handleClearAllSoal}
                    className="border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs h-8 sm:h-9 px-3 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Hapus seluruh butir soal di bank soal ini"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">
                      {clearAllMutation.isPending ? 'Mengosongkan...' : 'Kosongkan Soal'}
                    </span>
                    <span className="sm:hidden">Kosongkan</span>
                  </Button>
                )}

                {!readOnly && soalList.length > 0 && onAktifkanUjian && (
                  <Button
                    type="button"
                    onClick={() => onAktifkanUjian(bankSoal)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Jadwalkan & Aktifkan Ujian untuk Kelas Binaan"
                  >
                    <Rocket size={14} />
                    <span className="hidden sm:inline">Aktifkan Ujian</span>
                    <span className="sm:hidden">Aktifkan</span>
                  </Button>
                )}

                {soalList.length > 0 && onMultiRemedial && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onMultiRemedial(bankSoal)}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-700 font-bold text-xs h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Aktivasi Sesi Remedial Akbar Terpadu Seluruh Rombel Binaan (1-Click)"
                  >
                    <RotateCw size={13} className="text-amber-600 dark:text-amber-400" />
                    <span className="hidden sm:inline">Remedial Akbar</span>
                    <span className="sm:hidden">Remedial</span>
                  </Button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Tutup modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Unit Pengajaran (Hanya muncul jika ada unit valid yang memiliki butir soal) */}
          {relevantUnits.length > 0 && soalList.length > 0 && (
            <div className="px-3.5 py-2 sm:px-6 bg-slate-50/90 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
              <Layers size={12} className="text-sky-600 dark:text-sky-400 shrink-0 mr-1" />
              <button
                type="button"
                onClick={() => setFilterUnitId('ALL')}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border',
                  filterUnitId === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                )}
              >
                Semua Unit ({soalList.length})
              </button>
              {relevantUnits.map((unit) => {
                const count = soalList.filter((s) => s.unit_pengajaran_id === unit.id).length;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => setFilterUnitId(unit.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border',
                      filterUnitId === unit.id
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-300'
                    )}
                  >
                    {unit.nama_unit} ({count})
                  </button>
                );
              })}
              {soalList.some((s) => !s.unit_pengajaran_id) && (
                <button
                  type="button"
                  onClick={() => setFilterUnitId('UNASSIGNED')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border',
                    filterUnitId === 'UNASSIGNED'
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  )}
                >
                  Umum ({soalList.filter((s) => !s.unit_pengajaran_id).length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── 2. SCROLLABLE LIVE FORM STREAM (1 LAYAR KE BAWAH) ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-3.5 pb-32 sm:pb-20">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800">
                <Loader size="lg" className="text-indigo-600" />
                <p className="text-xs font-bold text-slate-500">Memuat daftar soal...</p>
              </div>
            ) : isError ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-rose-200/80 dark:border-rose-900/50">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Gagal Mengambil Butir Soal
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    {(soalError as any)?.response?.data?.message || (soalError as any)?.message || 'Terjadi gangguan jaringan saat memuat daftar pertanyaan.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => refetch()}
                  className="mt-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Coba Lagi</span>
                </Button>
              </div>
            ) : (
              <>
                {soalList.length === 0 && readOnly && (
                  <div className="py-14 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                      <BookOpen size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Bank soal ini belum memiliki butir pertanyaan.
                    </p>
                  </div>
                )}

                {/* Daftar Soal Live Berurutan ke Bawah */}
                {filteredSoalList.map((soal, index) => {
                  const isEditingThisCard = !readOnly && activeCardId === soal.id;
                  const taggedUnit =
                    soal.UnitPengajaran ||
                    (soal.unit_pengajaran_id ? unitMap.get(soal.unit_pengajaran_id) : null);

                  // Hitung nomor urut kontinu (anti nomor lompat) sesuai urutan asli bank soal
                  const globalIndex = soalList.findIndex((s) => s.id === soal.id);
                  const displayNomor = (globalIndex !== -1 ? globalIndex : index) + 1;

                  if (isEditingThisCard) {
                    return (
                      <CbtInlineSoalCard
                        key={soal.id}
                        bankSoalId={bankSoal.id}
                        soal={soal}
                        nomorUrut={displayNomor}
                        availableUnits={availableUnits}
                        onSaved={() => {
                          setActiveCardId(null);
                          refetch();
                        }}
                        onCancel={() => setActiveCardId(null)}
                        onDelete={() => handleDeleteSoal(soal, displayNomor)}
                      />
                    );
                  }

                  return (
                    <div
                      key={soal.id}
                      onClick={() => {
                        if (!readOnly) setActiveCardId(soal.id);
                      }}
                      className={cn(
                        'bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 dark:border-slate-800 transition-all space-y-3 relative',
                        !readOnly &&
                          'hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer group'
                      )}
                    >
                      {/* Header Nomor Soal & Poin (Single-Line, Anti-Wrap) */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
                          <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black text-xs font-mono shrink-0">
                            {displayNomor}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            Soal #{displayNomor}
                          </span>
                          {taggedUnit && taggedUnit.nama_unit && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800 whitespace-nowrap">
                              Unit: {taggedUnit.nama_unit}
                            </span>
                          )}
                          {!readOnly && (
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline whitespace-nowrap">
                              (Klik untuk edit langsung)
                            </span>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
                            {soal.bobot} Poin
                          </span>

                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveCardId(soal.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                                title="Edit Soal"
                                aria-label={`Edit Soal Nomor ${displayNomor}`}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSoal(soal, displayNomor)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                title="Hapus Soal"
                                aria-label={`Hapus Soal Nomor ${displayNomor}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Konten Pertanyaan & Gambar */}
                      <CbtContentRenderer
                        content={soal.konten_pertanyaan}
                        imageUrl={soal.gambar_stimulus_url}
                        imageAlt={`Stimulus Soal No ${soal.nomor_urut}`}
                      />

                      {/* Daftar Opsi Jawaban A-E (Auto-Adaptive: Grid 1 Baris, 2 Kolom, atau 1 Kolom Penuh) */}
                      <CbtOptionsRenderer
                        options={soal.opsi_jawaban_json}
                        kunciJawaban={soal.kunci_jawaban}
                        modeContext="preview"
                        readOnly={true}
                        className="pt-1"
                      />

                      {soal.pembahasan && (
                        <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 rounded-xl text-xs">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px] block">
                            Pembahasan:
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 text-xs">
                            {soal.pembahasan}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ── KARTU TAMBAH SOAL BARU INLINE DI BAWAH (TANPA PINDAH MODAL) ── */}
                {!readOnly && (
                  <>
                    {activeCardId === 'NEW' ? (
                      <CbtInlineSoalCard
                        bankSoalId={bankSoal.id}
                        soal={null}
                        nomorUrut={soalList.length + 1}
                        initialRawText={droppedDraftText || undefined}
                        availableUnits={availableUnits}
                        onSaved={(mode) => {
                          setDroppedDraftText(null);
                          refetch();
                          if (mode === 'stay') {
                            setActiveCardId(null);
                          } else {
                            setActiveCardId('NEW');
                          }
                        }}
                        onCancel={() => {
                          setDroppedDraftText(null);
                          if (soalList.length > 0) {
                            setActiveCardId(null);
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDroppedDraftText(null);
                          setActiveCardId('NEW');
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragOverAddBtn(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragOverAddBtn(false);
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragOverAddBtn(false);
                          let text = e.dataTransfer?.getData('text/plain') || '';
                          if (!text && e.dataTransfer?.files?.[0]) {
                            try {
                              text = await e.dataTransfer.files[0].text();
                            } catch {
                              // ignore
                            }
                          }
                          if (text) {
                            setDroppedDraftText(text);
                            setActiveCardId('NEW');
                          }
                        }}
                        className={cn(
                          "w-full py-3.5 px-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer shadow-2xs font-bold text-xs flex items-center justify-center gap-2",
                          isDragOverAddBtn
                            ? "border-indigo-600 bg-indigo-100 text-indigo-900 ring-4 ring-indigo-300 scale-[1.01]"
                            : "border-indigo-300 dark:border-indigo-800 bg-white/80 dark:bg-slate-900/70 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                        )}
                      >
                        <Plus size={16} />
                        <span>
                          {isDragOverAddBtn
                            ? 'Lepaskan di sini untuk membuat Soal Baru dari teks yang di-drag!'
                            : `Tambah Soal #${soalList.length + 1} di Bawah (Bisa Drag & Drop Teks Langsung ke Sini)`}
                        </span>
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isPuzzleImportOpen && (
        <CbtImportPuzzleModal
          isOpen={isPuzzleImportOpen}
          onClose={() => setIsPuzzleImportOpen(false)}
          bankSoalId={bankSoal.id}
          bankJudul={bankSoal.judul}
          startingNomor={soalList.length + 1}
          onSuccessImport={() => {
            refetch();
          }}
        />
      )}
    </Modal>
  );
};
