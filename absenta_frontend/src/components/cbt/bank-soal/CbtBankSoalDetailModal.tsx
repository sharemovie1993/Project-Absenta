import React, { useState } from 'react';
import {
  Modal,
  Button,
  Badge,
  Loader,
} from '@/components/ui';
import {
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Clock,
  Layers,
  Award,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtBankSoal, CbtSoal } from '@/types/cbt.types';
import { CbtContentRenderer } from '../common/CbtContentRenderer';
import { CbtSoalEditorModal } from './CbtSoalEditorModal';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';

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
  const { confirm } = useConfirm();

  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [soalToEdit, setSoalToEdit] = useState<CbtSoal | null>(null);

  // Fetch list of questions for this bank
  const { data: soalList = [], isLoading, refetch } = useQuery({
    queryKey: cbtQueryKeys.soalList(bankSoal?.id || ''),
    queryFn: () => (bankSoal?.id ? cbtApi.getSoalList(bankSoal.id) : Promise.resolve([])),
    enabled: Boolean(isOpen && bankSoal?.id),
  });

  // Delete question mutation
  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => cbtApi.deleteSoal(questionId),
    onSuccess: () => {
      toast.success('Butir soal berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: cbtQueryKeys.soalList(bankSoal?.id || '') });
      queryClient.invalidateQueries({ queryKey: cbtQueryKeys.bankSoal() });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus butir soal');
    },
  });

  const handleDeleteSoal = async (soal: CbtSoal) => {
    const isConfirmed = await confirm({
      title: 'Hapus Butir Soal?',
      message: `Apakah Anda yakin ingin menghapus butir soal nomor ${soal.nomor_urut}? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Hapus',
      cancelLabel: 'Batal',
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
        title={`Daftar Butir Soal: ${bankSoal.judul}`}
        size="full"
      >
        <div className="space-y-4">
          {/* Header Metadata Strip */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default" className="text-xs font-black">
                {bankSoal.kode_bank}
              </Badge>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {bankSoal.Mapel?.nama_mapel || '-'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                Tingkat: <span className="font-semibold text-slate-700 dark:text-slate-300">{bankSoal.tingkat}</span>
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                Alokasi: <span className="font-semibold text-slate-700 dark:text-slate-300">{bankSoal.alokasi_menit} Menit</span>
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                Guru: <span className="font-semibold text-slate-700 dark:text-slate-300">{bankSoal.Guru?.nama_guru || '-'}</span>
              </span>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSoalToEdit(null);
                    setIsEditorModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-xs"
                >
                  <Plus size={14} className="mr-1" />
                  <span>Tambah Butir Soal</span>
                </Button>
              </div>
            )}
          </div>

          {/* List Soal */}
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2">
              <Loader size="lg" />
              <p className="text-xs text-slate-400">Memuat butir soal...</p>
            </div>
          ) : soalList.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <BookOpen size={24} />
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                Bank soal ini belum memiliki butir soal
              </p>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSoalToEdit(null);
                    setIsEditorModalOpen(true);
                  }}
                  className="text-xs"
                >
                  <Plus size={14} className="mr-1" /> Buat Butir Soal Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {soalList.map((soal, index) => (
                <div
                  key={soal.id}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3 hover:border-slate-300 transition-colors"
                >
                  {/* Top: Nomor Urut & Aksi */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                        {soal.nomor_urut || index + 1}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        Bobot: {soal.bobot}
                      </Badge>
                      <Badge variant="success" className="text-[10px] font-bold">
                        Kunci: {soal.kunci_jawaban}
                      </Badge>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSoalToEdit(soal);
                            setIsEditorModalOpen(true);
                          }}
                          className="h-7 px-2 text-xs text-slate-600 hover:text-indigo-600"
                          title="Edit Butir Soal"
                        >
                          <Edit2 size={13} className="mr-1" /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSoal(soal)}
                          className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          title="Hapus Butir Soal"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Konten Pertanyaan & Stimulus */}
                  <CbtContentRenderer
                    content={soal.konten_pertanyaan}
                    imageUrl={soal.gambar_stimulus_url}
                    imageAlt={`Stimulus Soal No ${soal.nomor_urut}`}
                  />

                  {/* 5 Opsi Jawaban (A s.d. E) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {soal.opsi_jawaban_json?.map((opt) => (
                      <div
                        key={opt.kode}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                          soal.kunci_jawaban === opt.kode
                            ? 'border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs'
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                            soal.kunci_jawaban === opt.kode
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {opt.kode}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                            {opt.teks || '-'}
                          </p>
                          {opt.gambar_url && (
                            <img
                              src={opt.gambar_url}
                              alt={`Opsi ${opt.kode}`}
                              className="h-14 w-auto object-contain rounded border border-slate-200 dark:border-slate-800"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pembahasan jika ada */}
                  {soal.pembahasan && (
                    <div className="p-2.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-xl text-xs space-y-0.5">
                      <span className="font-bold text-amber-800 dark:text-amber-300 text-[11px]">Pembahasan:</span>
                      <p className="text-slate-600 dark:text-slate-400 text-xs">{soal.pembahasan}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Editor Butir Soal */}
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
          onSuccess={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: cbtQueryKeys.bankSoal() });
          }}
        />
      )}
    </>
  );
};
