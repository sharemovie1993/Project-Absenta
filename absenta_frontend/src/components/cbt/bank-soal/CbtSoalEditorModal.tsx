import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Button,
} from '@/components/ui';
import {
  UploadCloud,
  Trash2,
  CheckCircle2,
  Eye,
  Edit3,
  ImageIcon,
  Copy,
  Plus,
  Check,
  Circle,
  ChevronDown,
  X,
  MessageSquare,
  Save,
  HelpCircle,
} from 'lucide-react';
import axiosInstance from '@/lib/axiosInstance';
import { useQueryClient } from '@tanstack/react-query';
import { cbtQueryKeys } from '@/api/cbt.api';
import toast from 'react-hot-toast';
import { z } from 'zod';
import type { CbtSoal, OpsiJawaban } from '@/types/cbt.types';
import { CbtContentRenderer } from '../common/CbtContentRenderer';
import { cn } from '@/lib/utils';

interface CbtSoalEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoalId: string;
  soalToEdit?: CbtSoal | null;
  nomorUrutSuggested?: number;
  onSuccess: () => void;
}

const soalSchema = z.object({
  nomor_urut: z.number().int().min(1, 'Nomor urut minimal 1'),
  konten_pertanyaan: z.string().min(3, 'Konten pertanyaan minimal 3 karakter'),
  bobot: z.number().min(0.1, 'Bobot minimal 0.1'),
  kunci_jawaban: z.enum(['A', 'B', 'C', 'D', 'E']),
});

const DEFAULT_OPTIONS: OpsiJawaban[] = [
  { kode: 'A', teks: '', gambar_url: null },
  { kode: 'B', teks: '', gambar_url: null },
  { kode: 'C', teks: '', gambar_url: null },
  { kode: 'D', teks: '', gambar_url: null },
  { kode: 'E', teks: '', gambar_url: null },
];

export const CbtSoalEditorModal: React.FC<CbtSoalEditorModalProps> = ({
  isOpen,
  onClose,
  bankSoalId,
  soalToEdit,
  nomorUrutSuggested = 1,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [nomorUrut, setNomorUrut] = useState<number>(nomorUrutSuggested);
  const [kontenPertanyaan, setKontenPertanyaan] = useState('');
  const [gambarStimulusUrl, setGambarStimulusUrl] = useState<string | null>(null);
  const [bobot, setBobot] = useState<number>(1.0);
  const [kunciJawaban, setKunciJawaban] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [pembahasan, setPembahasan] = useState('');
  const [opsiJawaban, setOpsiJawaban] = useState<OpsiJawaban[]>(DEFAULT_OPTIONS);

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [uploadingStimulus, setUploadingStimulus] = useState(false);
  const [uploadingOpsiIndex, setUploadingOpsiIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWajibDiisi, setIsWajibDiisi] = useState(true);
  const [showPembahasanBox, setShowPembahasanBox] = useState(false);

  const fileInputStimulusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (soalToEdit) {
      setNomorUrut(soalToEdit.nomor_urut);
      setKontenPertanyaan(soalToEdit.konten_pertanyaan);
      setGambarStimulusUrl(soalToEdit.gambar_stimulus_url || null);
      setBobot(Number(soalToEdit.bobot) || 1.0);
      setKunciJawaban(soalToEdit.kunci_jawaban);
      setPembahasan(soalToEdit.pembahasan || '');
      setShowPembahasanBox(Boolean(soalToEdit.pembahasan));

      if (Array.isArray(soalToEdit.opsi_jawaban_json) && soalToEdit.opsi_jawaban_json.length > 0) {
        setOpsiJawaban(soalToEdit.opsi_jawaban_json);
      } else {
        setOpsiJawaban(DEFAULT_OPTIONS);
      }
    } else {
      setNomorUrut(nomorUrutSuggested);
      setKontenPertanyaan('');
      setGambarStimulusUrl(null);
      setBobot(1.0);
      setKunciJawaban('A');
      setPembahasan('');
      setShowPembahasanBox(false);
      setOpsiJawaban(DEFAULT_OPTIONS);
    }
    setActiveTab('editor');
  }, [soalToEdit, nomorUrutSuggested, isOpen]);

  // Upload Gambar Stimulus Soal
  const handleUploadStimulus = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5 MB');
      return;
    }

    try {
      setUploadingStimulus(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = res.data?.data?.url || res.data?.url;
      if (url) {
        setGambarStimulusUrl(url);
        toast.success('Gambar stimulus soal berhasil disisipkan');
      }
    } catch {
      toast.error('Gagal mengunggah gambar stimulus');
    } finally {
      setUploadingStimulus(false);
      if (fileInputStimulusRef.current) {
        fileInputStimulusRef.current.value = '';
      }
    }
  };

  // Upload Gambar Opsi (A, B, C, D, E)
  const handleUploadOpsi = async (index: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar opsi maksimal 5 MB');
      return;
    }

    try {
      setUploadingOpsiIndex(index);
      const formData = new FormData();
      formData.append('file', file);

      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = res.data?.data?.url || res.data?.url;
      if (url) {
        setOpsiJawaban((prev) =>
          prev.map((opt, i) => (i === index ? { ...opt, gambar_url: url } : opt))
        );
        toast.success(`Gambar opsi ${opsiJawaban[index].kode} berhasil disisipkan`);
      }
    } catch {
      toast.error('Gagal mengunggah gambar opsi');
    } finally {
      setUploadingOpsiIndex(null);
    }
  };

  const handleOpsiTeksChange = (index: number, text: string) => {
    setOpsiJawaban((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, teks: text } : opt))
    );
  };

  const handleRemoveOpsiGambar = (index: number) => {
    setOpsiJawaban((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, gambar_url: null } : opt))
    );
  };

  const handleAddOption = () => {
    if (opsiJawaban.length >= 5) {
      toast.error('Maksimal 5 opsi jawaban (A–E)');
      return;
    }
    const nextCodes: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    const nextCode = nextCodes[opsiJawaban.length];
    setOpsiJawaban((prev) => [...prev, { kode: nextCode, teks: '', gambar_url: null }]);
  };

  const handleRemoveOption = (index: number) => {
    if (opsiJawaban.length <= 2) {
      toast.error('Minimal harus ada 2 opsi jawaban');
      return;
    }
    const targetCode = opsiJawaban[index].kode;
    const remaining = opsiJawaban.filter((_, i) => i !== index);
    const reindexed = remaining.map((opt, i) => ({
      ...opt,
      kode: (['A', 'B', 'C', 'D', 'E'][i]) as 'A' | 'B' | 'C' | 'D' | 'E',
    }));
    setOpsiJawaban(reindexed);
    if (kunciJawaban === targetCode) {
      setKunciJawaban('A');
    }
  };

  const handleDuplicateCurrent = () => {
    setNomorUrut((prev) => prev + 1);
    toast.success('Soal berhasil diduplikasi ke nomor urut berikutnya');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Zod Validation
    const validation = soalSchema.safeParse({
      nomor_urut: Number(nomorUrut),
      konten_pertanyaan: kontenPertanyaan.trim(),
      bobot: Number(bobot),
      kunci_jawaban: kunciJawaban,
    });

    if (!validation.success) {
      toast.error(validation.error.errors.map((err) => err.message).join(', '));
      return;
    }

    // 2. Validasi kelengkapan opsi jawaban (teks atau gambar)
    const emptyOptions = opsiJawaban.filter((opt) => !opt.teks.trim() && !opt.gambar_url);
    if (emptyOptions.length > 0) {
      toast.error(`Opsi ${emptyOptions.map((o) => o.kode).join(', ')} belum memiliki teks atau gambar`);
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        nomor_urut: Number(nomorUrut),
        jenis_soal: 'PG' as const,
        konten_pertanyaan: kontenPertanyaan.trim(),
        gambar_stimulus_url: gambarStimulusUrl,
        bobot: Number(bobot),
        opsi_jawaban_json: opsiJawaban,
        kunci_jawaban: kunciJawaban,
        pembahasan: pembahasan.trim() || null,
      };

      if (soalToEdit) {
        await axiosInstance.put(`/cbt/soal/${soalToEdit.id}`, payload);
        toast.success('Butir soal berhasil diperbarui');
      } else {
        await axiosInstance.post(`/cbt/bank-soal/${bankSoalId}/soal`, payload);
        toast.success('Butir soal berhasil ditambahkan ke bank soal');
      }

      // 🛡️ Invalidate Cache secara agresif & refetch aktif
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.soalList(bankSoalId),
        exact: false,
        refetchType: 'all',
      });
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.bankSoal(),
        exact: false,
        refetchType: 'all',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan butir soal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="2xl"
      className="p-0 border-0 bg-transparent shadow-2xl"
      contentClassName="p-0 overflow-hidden flex flex-col bg-[#f0ebf8] dark:bg-slate-950 max-h-[96vh] sm:max-h-[90vh]"
    >
      <div className="flex flex-col h-full max-h-[96vh] sm:max-h-[90vh] overflow-hidden text-slate-800 dark:text-slate-100">
        {/* ── 1. STICKY GOOGLE FORMS TOP HEADER ── */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 shrink-0 z-20 shadow-xs">
          {/* Signature Google Forms Top Purple Strip */}
          <div className="h-2 sm:h-2.5 bg-[#673ab7] w-full" />

          <div className="px-3.5 py-2.5 sm:px-6 sm:py-3.5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-100 text-[#673ab7] dark:bg-purple-950/80 dark:text-purple-300 flex items-center justify-center font-black text-xs shrink-0 font-mono">
                #{nomorUrut}
              </span>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {soalToEdit ? `Edit Soal #${soalToEdit.nomor_urut}` : 'Butir Soal Baru (Mode Kuis)'}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate hidden xs:block">
                  Pilihan Ganda • Kunci: <strong>Opsi {kunciJawaban}</strong> • {bobot} Poin
                </p>
              </div>
            </div>

            {/* Google Forms Navigation Tabs (Pertanyaan vs Pratinjau Kuis) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center p-0.5 sm:p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={cn(
                    "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                    activeTab === 'editor'
                      ? "bg-white dark:bg-slate-900 text-[#673ab7] dark:text-purple-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  )}
                >
                  <Edit3 size={13} />
                  <span className="hidden xs:inline">Pertanyaan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={cn(
                    "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                    activeTab === 'preview'
                      ? "bg-white dark:bg-slate-900 text-[#673ab7] dark:text-purple-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  )}
                >
                  <Eye size={13} />
                  <span className="hidden xs:inline">Pratinjau</span>
                </button>
              </div>

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

        {/* ── 2. SCROLLABLE MIDDLE CANVAS (DESKTOP & HP COMFORT) ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
          <div className="max-w-2xl mx-auto space-y-4">
            {activeTab === 'preview' ? (
              /* WYSIWYG Pratinjau Kuis Google Form */
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/90 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Soal Nomor {nomorUrut} <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-md bg-purple-50 text-[#673ab7] dark:bg-purple-950/60 dark:text-purple-300">
                    {bobot} Poin
                  </span>
                </div>

                <CbtContentRenderer
                  content={kontenPertanyaan || '(Teks pertanyaan belum diisi)'}
                  imageUrl={gambarStimulusUrl}
                  imageAlt="Stimulus Soal"
                />

                <div className="space-y-2 pt-1">
                  {opsiJawaban.map((opt) => (
                    <div
                      key={opt.kode}
                      className={cn(
                        "p-2.5 sm:p-3 rounded-xl border flex items-start gap-3 transition-all",
                        kunciJawaban === opt.kode
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                          : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900"
                      )}
                    >
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5",
                          kunciJawaban === opt.kode
                            ? "bg-emerald-600 text-white"
                            : "border-2 border-slate-300 dark:border-slate-600 text-slate-600"
                        )}
                      >
                        {kunciJawaban === opt.kode ? <Check size={14} /> : opt.kode}
                      </div>

                      <div className="flex-1 space-y-1.5 min-w-0">
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          {opt.teks || <span className="italic text-slate-400">(Teks opsi belum diisi)</span>}
                        </p>
                        {opt.gambar_url && (
                          <img
                            src={opt.gambar_url}
                            alt={`Opsi ${opt.kode}`}
                            className="max-h-24 sm:max-h-32 object-contain rounded-lg border border-slate-200 dark:border-slate-800"
                          />
                        )}
                      </div>

                      {kunciJawaban === opt.kode && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 shrink-0 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span className="hidden sm:inline">Kunci</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {pembahasan && (
                  <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-[#673ab7] dark:text-purple-300 flex items-center gap-1.5">
                      <MessageSquare size={13} />
                      <span>Masukan Jawaban (Pembahasan):</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">{pembahasan}</p>
                  </div>
                )}
              </div>
            ) : (
              /* ── GOOGLE FORMS SIGNATURE QUESTION CARD ── */
              <form id="form-cbt-soal" onSubmit={handleSubmit} className="space-y-3.5">
                <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 border-l-[5px] sm:border-l-[6px] border-l-[#673ab7] p-4 sm:p-6 space-y-4 sm:space-y-5 transition-all">
                  {/* ── QUESTION HEADER ROW (Textarea + Image Icon + Type Dropdown) ── */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2.5">
                      {/* Question Text with Google Forms Underline Style */}
                      <div className="flex-1 w-full min-w-0">
                        <textarea
                          id="soal-konten"
                          rows={2}
                          value={kontenPertanyaan}
                          onChange={(e) => setKontenPertanyaan(e.target.value)}
                          placeholder="Pertanyaan tanpa judul..."
                          className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-xl bg-slate-50/80 hover:bg-slate-100/70 focus:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:focus:bg-slate-900 text-slate-900 dark:text-white border-b-2 border-b-slate-200 dark:border-b-slate-700 focus:border-b-[#673ab7] dark:focus:border-b-purple-400 focus:outline-none transition-all resize-y min-h-[64px]"
                          aria-label="Pertanyaan Soal"
                          required
                        />
                      </div>

                      {/* Controls beside question: Image Button & Type Dropdown */}
                      <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                        {/* Google Forms Question Image Button */}
                        <button
                          type="button"
                          onClick={() => fileInputStimulusRef.current?.click()}
                          className={cn(
                            "px-3 py-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold",
                            gambarStimulusUrl
                              ? "bg-purple-50 text-[#673ab7] border-purple-300 dark:bg-purple-950/60 dark:border-purple-800"
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#673ab7] hover:bg-slate-50 dark:hover:bg-slate-800"
                          )}
                          title="Sisipkan gambar pada pertanyaan"
                          aria-label="Sisipkan gambar pertanyaan"
                        >
                          <ImageIcon size={16} />
                          <span className="sm:hidden text-xs">Sisipkan Gambar</span>
                        </button>
                        <input
                          ref={fileInputStimulusRef}
                          type="file"
                          accept="image/*"
                          onChange={handleUploadStimulus}
                          disabled={uploadingStimulus}
                          className="hidden"
                          aria-label="Unggah Gambar Stimulus Soal"
                        />

                        {/* Google Forms Question Type Dropdown Indicator */}
                        <div className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs select-none">
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#673ab7] flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#673ab7]"></span>
                          </span>
                          <span className="truncate">Pilihan ganda</span>
                          <ChevronDown size={13} className="text-slate-400 shrink-0" />
                        </div>
                      </div>
                    </div>

                    {/* Stimulus Image Preview Box (If Attached) */}
                    {uploadingStimulus ? (
                      <div className="p-3 rounded-xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 flex items-center justify-center gap-2 text-xs font-bold text-[#673ab7]">
                        <UploadCloud size={16} className="animate-bounce" />
                        <span>Mengunggah gambar stimulus...</span>
                      </div>
                    ) : gambarStimulusUrl ? (
                      <div className="p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Gambar Stimulus Soal</span>
                          <img
                            src={gambarStimulusUrl}
                            alt="Stimulus preview"
                            className="max-h-36 sm:max-h-44 object-contain rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setGambarStimulusUrl(null)}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-xs h-7 px-2 shrink-0"
                        >
                          <Trash2 size={13} className="mr-1" /> Hapus
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {/* ── GOOGLE FORMS OPTIONS LIST (A s.d. E) ── */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Opsi Jawaban ({opsiJawaban.length})
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Kunci: Opsi {kunciJawaban} (Klik lingkaran untuk ganti)
                      </span>
                    </div>

                    {opsiJawaban.map((opt, index) => {
                      const isKey = kunciJawaban === opt.kode;
                      return (
                        <div
                          key={opt.kode}
                          className={cn(
                            "rounded-xl p-2 sm:p-2.5 transition-all flex flex-col gap-1.5",
                            isKey
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300/80 dark:border-emerald-800/80"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            {/* Google Forms Radio Key Toggle */}
                            <button
                              type="button"
                              onClick={() => setKunciJawaban(opt.kode)}
                              className={cn(
                                "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 cursor-pointer transition-all",
                                isKey
                                  ? "bg-emerald-600 text-white shadow-xs scale-105"
                                  : "border-2 border-slate-300 dark:border-slate-600 text-slate-600 hover:border-[#673ab7] hover:text-[#673ab7]"
                              )}
                              title={`Tandai Opsi ${opt.kode} sebagai Kunci Jawaban`}
                              aria-label={`Tandai Opsi ${opt.kode} sebagai Kunci Jawaban`}
                            >
                              {isKey ? <Check size={14} /> : opt.kode}
                            </button>

                            {/* Google Forms Underlined Option Input */}
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={opt.teks}
                                onChange={(e) => handleOpsiTeksChange(index, e.target.value)}
                                placeholder={`Opsi ${opt.kode}`}
                                className={cn(
                                  "w-full py-1.5 px-2 text-xs sm:text-sm font-medium bg-transparent border-b border-b-slate-200 dark:border-b-slate-700 focus:border-b-[#673ab7] dark:focus:border-b-purple-400 focus:outline-none transition-colors",
                                  isKey && "font-bold text-emerald-950 dark:text-emerald-200"
                                )}
                                aria-label={`Teks Pilihan Jawaban ${opt.kode}`}
                              />
                            </div>

                            {/* Right Controls: Option Image & Remove Option */}
                            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                              {/* Upload Option Image Button */}
                              <label
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#673ab7] hover:bg-purple-50 dark:hover:bg-purple-950/60 cursor-pointer transition-colors"
                                title={`Sisipkan gambar untuk Opsi ${opt.kode}`}
                                aria-label={`Sisipkan gambar untuk Opsi ${opt.kode}`}
                              >
                                <ImageIcon size={15} />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadOpsi(index, file);
                                  }}
                                  disabled={uploadingOpsiIndex === index}
                                  className="hidden"
                                  aria-label={`Unggah Gambar Opsi ${opt.kode}`}
                                />
                              </label>

                              {/* Remove Option Button */}
                              {opsiJawaban.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(index)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                  title="Hapus opsi ini"
                                  aria-label={`Hapus Opsi ${opt.kode}`}
                                >
                                  <X size={15} />
                                </button>
                              )}

                              {isKey && (
                                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                                  <Check size={11} /> Kunci
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Option Attached Image Preview */}
                          {opt.gambar_url && (
                            <div className="ml-8 sm:ml-10 flex items-center gap-2">
                              <img
                                src={opt.gambar_url}
                                alt={`Opsi ${opt.kode}`}
                                className="h-12 sm:h-14 w-auto object-contain rounded border border-slate-200 dark:border-slate-800 bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveOpsiGambar(index)}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded text-[10px] flex items-center gap-1 cursor-pointer"
                                title="Hapus gambar opsi"
                              >
                                <Trash2 size={12} /> Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Option Button (Google Forms Style) */}
                    {opsiJawaban.length < 5 && (
                      <div className="flex items-center gap-2.5 pt-1 pl-2">
                        <Circle size={16} className="text-slate-300 dark:text-slate-600" />
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="text-xs font-bold text-slate-500 hover:text-[#673ab7] dark:hover:text-purple-400 transition-colors flex items-center gap-1.5 cursor-pointer py-1"
                        >
                          <Plus size={13} />
                          <span>Tambahkan opsi</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── GOOGLE FORMS QUIZ FOOTER BAR (Points, Duplicate, Required, Feedback) ── */}
                  <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                    {/* Left: Feedback Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPembahasanBox((prev) => !prev)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
                          showPembahasanBox
                            ? "bg-purple-50 text-[#673ab7] border-purple-200 dark:bg-purple-950/60 dark:border-purple-800"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        <MessageSquare size={13} />
                        <span>{showPembahasanBox ? 'Tutup Pembahasan' : 'Tambah Pembahasan'}</span>
                      </button>
                    </div>

                    {/* Right: Points, Duplication & Required Switch */}
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                      {/* Points Input (Google Forms Point Badge) */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="number"
                          step="0.1"
                          min={0.1}
                          value={bobot}
                          onChange={(e) => setBobot(Number(e.target.value))}
                          className="w-12 sm:w-14 px-1.5 py-1 text-center font-mono font-black text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-[#673ab7]"
                          aria-label="Bobot Nilai"
                          title="Bobot Nilai Soal"
                          required
                        />
                        <span className="text-[11px] text-slate-500">Poin</span>
                      </div>

                      <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                      {/* Google Forms Duplicate Button */}
                      <button
                        type="button"
                        onClick={handleDuplicateCurrent}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#673ab7] hover:bg-purple-50 dark:hover:bg-purple-950/60 transition-colors cursor-pointer"
                        title="Duplikasi Butir Soal"
                        aria-label="Duplikasi Soal"
                      >
                        <Copy size={15} />
                      </button>

                      <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                      {/* Required / Wajib Toggle */}
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <span className="text-[11px]">Wajib</span>
                        <input
                          type="checkbox"
                          checked={isWajibDiisi}
                          onChange={(e) => setIsWajibDiisi(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#673ab7] rounded cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Collapsible Feedback / Pembahasan Box */}
                  {showPembahasanBox && (
                    <div className="w-full pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <label htmlFor="soal-pembahasan" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Penjelasan Pembahasan:
                      </label>
                      <textarea
                        id="soal-pembahasan"
                        rows={2}
                        value={pembahasan}
                        onChange={(e) => setPembahasan(e.target.value)}
                        placeholder="Tuliskan alasan mengapa kunci jawaban tersebut benar..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#673ab7]"
                        aria-label="Catatan Pembahasan Soal"
                      />
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── 3. STICKY GOOGLE FORMS BOTTOM ACTION BAR (RESPONSIVE FOR DESKTOP & MOBILE) ── */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3.5 py-2.5 sm:px-6 sm:py-3.5 shrink-0 z-20 shadow-md">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            {/* Status Kunci Jawaban Aktif */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 shrink-0">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Kunci: <strong>Opsi {kunciJawaban}</strong></span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                ({bobot} Poin)
              </span>
            </div>

            {/* Tombol Aksi Batal & Simpan */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs h-9 px-3.5"
              >
                Batal
              </Button>

              <Button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold text-xs h-9 px-4.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98 transition-all"
              >
                <Save size={14} />
                <span>{isSubmitting ? 'Menyimpan...' : soalToEdit ? 'Simpan' : 'Tambahkan'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
