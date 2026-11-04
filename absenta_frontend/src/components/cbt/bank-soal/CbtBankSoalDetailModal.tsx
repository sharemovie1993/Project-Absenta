import React, { useState, useMemo } from 'react';
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
  Clock,
  CheckCircle2,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtBankSoal, CbtSoal } from '@/types/cbt.types';
import { CbtContentRenderer } from '../common/CbtContentRenderer';
import { CbtSoalEditorModal } from './CbtSoalEditorModal';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface CbtBankSoalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoal: CbtBankSoal | null;
  readOnly?: boolean;
}

export const CbtBankSoalDetailModal: React.FC<CbtBankSoalDetailModalProps> = ({
  isOpen,
  onClose,
  bankSoal,
  readOnly = false,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [soalToEdit, setSoalToEdit] = useState<CbtSoal | null>(null);

  // Fetch list of questions for this bank
  const { data: soalList = [], isLoading, refetch } = useQuery({
    queryKey: cbtQueryKeys.soalList(bankSoal?.id || ''),
    queryFn: () => (bankSoal?.id ? cbtApi.getSoalList(bankSoal.id) : Promise.resolve([])),
    enabled: Boolean(isOpen && bankSoal?.id),
  });

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
      message: `Apakah Anda yakin ingin menghapus butir soal nomor ${soal.nomor_urut}? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });

    if (isConfirmed) {
      deleteMutation.mutate(soal.id);
    }
  };

  if (!bankSoal) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        size="full"
        disableClose={true}
        className="p-0 border-0 bg-transparent shadow-2xl"
        contentClassName="p-0 overflow-hidden flex flex-col bg-[#f0ebf8] dark:bg-slate-950 max-h-[96vh] sm:max-h-[92vh]"
      >
        <div className="flex flex-col h-full max-h-[96vh] sm:max-h-[92vh] overflow-hidden text-slate-800 dark:text-slate-100">
          {/* ── 1. STICKY GOOGLE FORMS TOP HEADER CARD ── */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 shrink-0 z-20 shadow-xs">
            {/* Signature Google Forms Top Purple Strip */}
            <div className="h-2 sm:h-2.5 bg-[#673ab7] w-full" />

            <div className="px-3.5 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-purple-100 text-[#673ab7] dark:bg-purple-950/70 dark:text-purple-300">
                      {bankSoal.kode_bank}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      {bankSoal.Mapel?.nama_mapel || 'Mata Pelajaran'}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Tingkat: <strong className="text-slate-800 dark:text-slate-200">{bankSoal.tingkat}</strong>
                    </span>
                  </div>

                  <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {bankSoal.judul}
                  </h1>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                  {/* Google Forms Quiz Stats Pill */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-[#673ab7] dark:text-purple-300 font-bold border border-purple-200/80 dark:border-purple-800/80 text-[11px] sm:text-xs">
                      {totalPoin} Poin
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] sm:text-xs">
                      {soalList.length} Soal
                    </span>
                  </div>

                  {!readOnly && (
                    <Button
                      type="button"
                      onClick={() => {
                        setSoalToEdit(null);
                        setIsEditorModalOpen(true);
                      }}
                      className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold text-xs h-8 sm:h-9 px-3 sm:px-4 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                    >
                      <Plus size={15} />
                      <span className="hidden xs:inline">Tambah Pertanyaan</span>
                      <span className="xs:hidden">Tambah</span>
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

          {/* ── 2. SCROLLABLE QUESTIONS CANVAS (DESKTOP & HP COMFORT) ── */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
            <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-3.5 sm:space-y-4">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800">
                  <Loader size="lg" className="text-[#673ab7]" />
                  <p className="text-xs font-bold text-slate-500">Memuat butir soal kuis...</p>
                </div>
              ) : soalList.length === 0 ? (
                <div className="py-14 sm:py-16 text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-[#673ab7] dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
                    <BookOpen size={26} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200">
                      Formulir Kuis Ini Belum Memiliki Pertanyaan
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Mulai tambahkan butir soal pilihan ganda lengkap dengan opsi A s.d. E, gambar stimulus, dan kunci jawaban otomatis.
                    </p>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      onClick={() => {
                        setSoalToEdit(null);
                        setIsEditorModalOpen(true);
                      }}
                      className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold text-xs px-4.5 py-2.5 h-auto rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Buat Pertanyaan Pertama</span>
                    </Button>
                  )}
                </div>
              ) : (
                soalList.map((soal, index) => (
                  <div
                    key={soal.id}
                    className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800/80 transition-all space-y-3.5 relative"
                  >
                    {/* Top: Nomor Urut & Points Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-[#673ab7] dark:text-purple-300 flex items-center justify-center font-black text-xs font-mono">
                          {soal.nomor_urut || index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Pilihan Ganda
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] sm:text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {soal.bobot} Poin
                        </span>

                        {!readOnly && (
                          <div className="flex items-center gap-0.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => {
                                setSoalToEdit(soal);
                                setIsEditorModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#673ab7] hover:bg-purple-50 dark:hover:bg-purple-950/60 transition-colors cursor-pointer"
                              title="Edit Butir Soal"
                              aria-label={`Edit Soal Nomor ${soal.nomor_urut}`}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSoal(soal)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                              title="Hapus Butir Soal"
                              aria-label={`Hapus Soal Nomor ${soal.nomor_urut}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Question Content & Stimulus */}
                    <CbtContentRenderer
                      content={soal.konten_pertanyaan}
                      imageUrl={soal.gambar_stimulus_url}
                      imageAlt={`Stimulus Soal No ${soal.nomor_urut}`}
                    />

                    {/* 5 Options List (Google Forms Style - Stacked for Responsive View) */}
                    <div className="space-y-2 pt-1">
                      {soal.opsi_jawaban_json?.map((opt) => {
                        const isCorrectKey = soal.kunci_jawaban === opt.kode;
                        return (
                          <div
                            key={opt.kode}
                            className={cn(
                              "p-2 sm:p-2.5 rounded-xl border flex items-start gap-2.5 transition-all",
                              isCorrectKey
                                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                                : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
                            )}
                          >
                            <div
                              className={cn(
                                "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5",
                                isCorrectKey
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "border-2 border-slate-300 dark:border-slate-600 text-slate-600"
                              )}
                            >
                              {isCorrectKey ? <Check size={13} /> : opt.kode}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <p className={cn(
                                "text-xs font-medium leading-relaxed",
                                isCorrectKey
                                  ? "text-emerald-950 dark:text-emerald-200 font-bold"
                                  : "text-slate-800 dark:text-slate-200"
                              )}>
                                {opt.teks || '-'}
                              </p>
                              {opt.gambar_url && (
                                <img
                                  src={opt.gambar_url}
                                  alt={`Opsi ${opt.kode}`}
                                  className="h-14 sm:h-16 w-auto object-contain rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
                                />
                              )}
                            </div>

                            {isCorrectKey && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 shrink-0 flex items-center gap-1">
                                <CheckCircle2 size={11} />
                                <span>Kunci</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pembahasan Box if provided */}
                    {soal.pembahasan && (
                      <div className="p-2.5 sm:p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 rounded-xl text-xs space-y-0.5">
                        <span className="font-bold text-[#673ab7] dark:text-purple-300 text-[11px] block">
                          Penjelasan Pembahasan:
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">{soal.pembahasan}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Editor Butir Soal (Google Forms Question Studio) */}
      {isEditorModalOpen && (
        <CbtSoalEditorModal
          isOpen={isEditorModalOpen}
          onClose={() => {
            setIsEditorModalOpen(false);
            setSoalToEdit(null);
          }}
          bankSoalId={bankSoal.id}
          soalToEdit={soalToEdit}
          nomorUrutSuggested={soalList.length + 1}
          onSuccess={async () => {
            refetch();
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
          }}
        />
      )}
    </>
  );
};
