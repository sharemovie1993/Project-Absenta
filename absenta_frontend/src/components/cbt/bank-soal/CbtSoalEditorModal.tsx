import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Badge,
} from '@/components/ui';
import {
  UploadCloud,
  Trash2,
  CheckCircle2,
  Eye,
  Edit3,
  ImageIcon,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import axiosInstance from '@/lib/axiosInstance';
import toast from 'react-hot-toast';
import { z } from 'zod';
import type { CbtSoal, OpsiJawaban } from '@/types/cbt.types';
import { CbtContentRenderer } from '../common/CbtContentRenderer';

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

  useEffect(() => {
    if (soalToEdit) {
      setNomorUrut(soalToEdit.nomor_urut);
      setKontenPertanyaan(soalToEdit.konten_pertanyaan);
      setGambarStimulusUrl(soalToEdit.gambar_stimulus_url || null);
      setBobot(Number(soalToEdit.bobot) || 1.0);
      setKunciJawaban(soalToEdit.kunci_jawaban);
      setPembahasan(soalToEdit.pembahasan || '');

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
        toast.success('Gambar stimulus soal berhasil diunggah');
      }
    } catch {
      toast.error('Gagal mengunggah gambar stimulus');
    } finally {
      setUploadingStimulus(false);
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
        toast.success(`Gambar opsi ${opsiJawaban[index].kode} berhasil diunggah`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      title={soalToEdit ? `Edit Butir Soal Nomor ${soalToEdit.nomor_urut}` : 'Tambah Butir Soal Baru (PG)'}
      size="xl"
    >
      <div className="space-y-4">
        {/* Tab Switcher: Editor vs Live Preview */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Edit3 size={14} />
              <span>Editor Soal</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Eye size={14} />
              <span>Pratinjau Siswa</span>
            </button>
          </div>

          <Badge variant="default" className="text-[10px] font-bold">
            Pilihan Ganda (5 Opsi A–E)
          </Badge>
        </div>

        {activeTab === 'preview' ? (
          /* Live Preview Mode (WYSIWYG Tampilan Siswa) */
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/20 dark:bg-slate-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                Simulasi Nomor {nomorUrut}
              </span>
              <span className="text-[11px] font-bold text-slate-500">Bobot: {bobot}</span>
            </div>

            <CbtContentRenderer
              content={kontenPertanyaan || '(Teks pertanyaan belum diisi)'}
              imageUrl={gambarStimulusUrl}
              imageAlt="Stimulus Soal"
            />

            <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              {opsiJawaban.map((opt) => (
                <div
                  key={opt.kode}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                    kunciJawaban === opt.kode
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      kunciJawaban === opt.kode
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt.kode}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium pt-1">
                      {opt.teks || '(Teks opsi belum diisi)'}
                    </p>
                    {opt.gambar_url && (
                      <img
                        src={opt.gambar_url}
                        alt={`Opsi ${opt.kode}`}
                        className="max-h-32 object-contain rounded-lg border border-slate-200 dark:border-slate-800"
                      />
                    )}
                  </div>
                  {kunciJawaban === opt.kode && (
                    <Badge variant="success" className="text-[10px] shrink-0 font-bold">
                      Kunci Jawaban
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {pembahasan && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-xs space-y-1">
                <div className="font-bold text-amber-800 dark:text-amber-300">Pembahasan:</div>
                <div className="text-slate-600 dark:text-slate-400">{pembahasan}</div>
              </div>
            )}
          </div>
        ) : (
          /* Editor Mode */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Meta Soal: Nomor Urut & Bobot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="soal-nomor-urut" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Urut Soal <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="soal-nomor-urut"
                  type="number"
                  min={1}
                  value={nomorUrut}
                  onChange={(e) => setNomorUrut(Number(e.target.value))}
                  aria-label="Nomor Urut Soal"
                  required
                />
              </div>

              <div>
                <label htmlFor="soal-bobot" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bobot Nilai <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="soal-bobot"
                  type="number"
                  step="0.1"
                  min={0.1}
                  value={bobot}
                  onChange={(e) => setBobot(Number(e.target.value))}
                  aria-label="Bobot Nilai Soal"
                  required
                />
              </div>
            </div>

            {/* Pertanyaan / Teks Stimulus */}
            <div>
              <label htmlFor="soal-konten" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Isi Pertanyaan / Narasi Soal <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="soal-konten"
                rows={4}
                value={kontenPertanyaan}
                onChange={(e) => setKontenPertanyaan(e.target.value)}
                placeholder="Tuliskan pertanyaan soal di sini... (Mendukung rumus matematika atau baris baru)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Isi Pertanyaan Soal"
                required
              />
            </div>

            {/* Upload Gambar Stimulus Soal */}
            <div className="p-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-indigo-500" />
                  <span>Gambar / Diagram Stimulus Soal (Opsional)</span>
                </span>
                {gambarStimulusUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setGambarStimulusUrl(null)}
                    className="text-rose-500 hover:text-rose-600 h-6 px-2 text-[10px]"
                  >
                    <Trash2 size={12} className="mr-1" /> Hapus Gambar
                  </Button>
                )}
              </div>

              {gambarStimulusUrl ? (
                <div className="relative inline-block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-40">
                  <img src={gambarStimulusUrl} alt="Stimulus preview" className="max-h-40 object-contain rounded" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors">
                  <UploadCloud size={20} className="text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {uploadingStimulus ? 'Mengunggah gambar...' : 'Klik untuk unggah gambar stimulus (PNG/JPG maks 5MB)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadStimulus}
                    disabled={uploadingStimulus}
                    className="hidden"
                    aria-label="Unggah Gambar Stimulus Soal"
                  />
                </label>
              )}
            </div>

            {/* 5 Opsi Pilihan Ganda (A s.d. E) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pilihan Jawaban & Kunci Jawaban <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] text-slate-500">Pilih radio button untuk menentukan kunci jawaban</span>
              </div>

              {opsiJawaban.map((opt, index) => (
                <div
                  key={opt.kode}
                  className={`p-3 rounded-xl border transition-all ${
                    kunciJawaban === opt.kode
                      ? 'border-indigo-500/80 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Radio Button Kunci */}
                    <input
                      type="radio"
                      name="kunci_jawaban_group"
                      id={`kunci-jawaban-${opt.kode}`}
                      checked={kunciJawaban === opt.kode}
                      onChange={() => setKunciJawaban(opt.kode)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      aria-label={`Pilih Opsi ${opt.kode} sebagai Kunci Jawaban`}
                    />

                    <label
                      htmlFor={`kunci-jawaban-${opt.kode}`}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-black shrink-0 cursor-pointer"
                    >
                      {opt.kode}
                    </label>

                    {/* Input Teks Opsi */}
                    <div className="flex-1">
                      <Input
                        value={opt.teks}
                        onChange={(e) => handleOpsiTeksChange(index, e.target.value)}
                        placeholder={`Teks pilihan jawaban ${opt.kode}...`}
                        aria-label={`Teks Pilihan Jawaban ${opt.kode}`}
                        className="text-xs h-9"
                      />
                    </div>

                    {/* Tombol Upload Gambar Opsi */}
                    <label className="cursor-pointer p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors shrink-0">
                      <ImageIcon size={16} />
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

                    {kunciJawaban === opt.kode && (
                      <Badge variant="success" className="text-[10px] font-bold shrink-0">
                        Kunci
                      </Badge>
                    )}
                  </div>

                  {/* Pratinjau Gambar Opsi jika ada */}
                  {opt.gambar_url && (
                    <div className="mt-2 ml-14 flex items-center gap-3">
                      <img
                        src={opt.gambar_url}
                        alt={`Opsi ${opt.kode}`}
                        className="h-16 w-auto object-contain rounded border border-slate-200 dark:border-slate-800"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOpsiGambar(index)}
                        className="text-rose-500 h-6 px-2 text-[10px]"
                      >
                        <Trash2 size={12} className="mr-1" /> Hapus Gambar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pembahasan (Opsional) */}
            <div>
              <label htmlFor="soal-pembahasan" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Pembahasan / Kunci Telaah (Opsional)
              </label>
              <textarea
                id="soal-pembahasan"
                rows={2}
                value={pembahasan}
                onChange={(e) => setPembahasan(e.target.value)}
                placeholder="Penjelasan mengapa kunci jawaban tersebut benar..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Catatan Pembahasan Soal"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {isSubmitting ? 'Menyimpan...' : soalToEdit ? 'Simpan Perubahan' : 'Tambahkan Butir Soal'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
