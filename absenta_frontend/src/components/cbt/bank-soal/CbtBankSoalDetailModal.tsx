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
  Download,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtBankSoal, CbtSoal } from '@/types/cbt.types';
import { CbtContentRenderer } from '../common/CbtContentRenderer';
import { CbtOptionsRenderer } from '../common/CbtOptionsRenderer';
import { CbtInlineSoalCard } from './CbtSoalEditorModal';
import { CbtGoogleFormImportModal } from './CbtGoogleFormImportModal';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface CbtBankSoalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoal: CbtBankSoal | null;
  readOnly?: boolean;
  onAktifkanUjian?: (bankSoal: CbtBankSoal) => void;
}

export const CbtBankSoalDetailModal: React.FC<CbtBankSoalDetailModalProps> = ({
  isOpen,
  onClose,
  bankSoal,
  readOnly = false,
  onAktifkanUjian,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // activeCardId: ID soal yang sedang diedit inline, atau 'NEW' untuk form soal baru di bagian bawah, atau null
  const [activeCardId, setActiveCardId] = useState<string | 'NEW' | null>(null);
  const [isGformImportOpen, setIsGformImportOpen] = useState(false);

  // Fetch list of questions for this bank
  const { data: soalList = [], isLoading, refetch } = useQuery({
    queryKey: cbtQueryKeys.soalList(bankSoal?.id || ''),
    queryFn: () => (bankSoal?.id ? cbtApi.getSoalList(bankSoal.id) : Promise.resolve([])),
    enabled: Boolean(isOpen && bankSoal?.id),
  });

  // Jika bank soal masih kosong dan tidak readOnly, langsung buka kartu Soal #1 secara inline
  useEffect(() => {
    if (!isLoading && isOpen && !readOnly && soalList.length === 0) {
      setActiveCardId('NEW');
    }
  }, [isLoading, isOpen, readOnly, soalList.length]);

  const totalPoin = useMemo(() => {
    return soalList.reduce((acc, curr) => acc + (Number(curr.bobot) || 1), 0);
  }, [soalList]);

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

  const handleDeleteSoal = async (soal: CbtSoal) => {
    const isConfirmed = await confirm({
      title: 'Hapus Butir Soal?',
      message: `Apakah Anda yakin ingin menghapus butir soal nomor ${soal.nomor_urut}?`,
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
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                    {bankSoal.Mapel?.nama_mapel || 'Mata Pelajaran'}
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
                      size="sm"
                      onClick={() => setIsGformImportOpen(true)}
                      className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 font-bold text-xs h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      title="Impor soal pilihan ganda dari Google Form secara otomatis"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">Import Google Form</span>
                      <span className="sm:hidden">G-Form</span>
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
        </div>

        {/* ── 2. SCROLLABLE LIVE FORM STREAM (1 LAYAR KE BAWAH) ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-3.5 pb-32 sm:pb-20">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800">
                <Loader size="lg" className="text-indigo-600" />
                <p className="text-xs font-bold text-slate-500">Memuat daftar soal...</p>
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
                {soalList.map((soal, index) => {
                  const isEditingThisCard = !readOnly && activeCardId === soal.id;

                  if (isEditingThisCard) {
                    return (
                      <CbtInlineSoalCard
                        key={soal.id}
                        bankSoalId={bankSoal.id}
                        soal={soal}
                        nomorUrut={soal.nomor_urut || index + 1}
                        onSaved={() => {
                          setActiveCardId(null);
                          refetch();
                        }}
                        onCancel={() => setActiveCardId(null)}
                        onDelete={() => handleDeleteSoal(soal)}
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
                            {soal.nomor_urut || index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            Soal #{soal.nomor_urut || index + 1}
                          </span>
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
                                aria-label={`Edit Soal Nomor ${soal.nomor_urut}`}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSoal(soal)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                title="Hapus Soal"
                                aria-label={`Hapus Soal Nomor ${soal.nomor_urut}`}
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
                        onSaved={(mode) => {
                          refetch();
                          if (mode === 'stay') {
                            setActiveCardId(null);
                          } else {
                            setActiveCardId('NEW');
                          }
                        }}
                        onCancel={soalList.length > 0 ? () => setActiveCardId(null) : undefined}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveCardId('NEW')}
                        className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-white/80 dark:bg-slate-900/70 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus size={16} />
                        <span>Tambah Soal #{soalList.length + 1} di Bawah</span>
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isGformImportOpen && bankSoal && (
        <CbtGoogleFormImportModal
          isOpen={isGformImportOpen}
          onClose={() => setIsGformImportOpen(false)}
          bankSoalId={bankSoal.id}
          bankSoalJudul={bankSoal.judul}
          onSuccess={async () => {
            await queryClient.invalidateQueries({
              queryKey: cbtQueryKeys.soalList(bankSoal.id),
              exact: false,
              refetchType: 'all',
            });
            await queryClient.invalidateQueries({
              queryKey: cbtQueryKeys.bankSoal(),
              exact: false,
              refetchType: 'all',
            });
            refetch();
          }}
        />
      )}
    </Modal>
  );
};
