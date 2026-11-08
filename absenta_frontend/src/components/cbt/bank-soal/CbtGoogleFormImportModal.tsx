import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Loader,
} from '@/components/ui';
import {
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Download,
  Check,
} from 'lucide-react';
import { cbtApi } from '@/api/cbt.api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export interface CbtGoogleFormImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoalId: string;
  bankSoalJudul: string;
  onSuccess: () => void;
}

interface ParsedQuestionItem {
  nomor_urut: number;
  jenis_soal: 'PG';
  konten_pertanyaan: string;
  gambar_stimulus_url: string | null;
  bobot: number;
  opsi_jawaban_json: Array<{ kode: string; teks: string }>;
  kunci_jawaban: 'A' | 'B' | 'C' | 'D' | 'E';
  pembahasan: string | null;
}

export const CbtGoogleFormImportModal: React.FC<CbtGoogleFormImportModalProps> = ({
  isOpen,
  onClose,
  bankSoalId,
  bankSoalJudul,
  onSuccess,
}) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [url, setUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [questions, setQuestions] = useState<ParsedQuestionItem[]>([]);

  // Reset state saat modal ditutup
  const handleClose = () => {
    if (isParsing || isImporting) return;
    setStep('input');
    setUrl('');
    setQuestions([]);
    onClose();
  };

  // 1. Ekstraksi Soal dari URL Google Form
  const handleParse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error('Silakan tempel tautan Google Form terlebih dahulu');
      return;
    }

    if (!trimmed.includes('docs.google.com/forms') && !trimmed.includes('forms.gle')) {
      toast.error('Tautan harus berasal dari Google Form (forms.gle atau docs.google.com/forms)');
      return;
    }

    setIsParsing(true);
    try {
      const data = await cbtApi.parseGoogleForm(trimmed);
      setFormTitle(data.title || 'Asesmen Google Form');
      
      const parsedItems: ParsedQuestionItem[] = (data.items || []).map((item, idx) => ({
        nomor_urut: idx + 1,
        jenis_soal: 'PG',
        konten_pertanyaan: item.konten_pertanyaan,
        gambar_stimulus_url: item.gambar_stimulus_url || null,
        bobot: 1.0,
        opsi_jawaban_json: item.opsi_jawaban_json || [],
        kunci_jawaban: (item.kunci_jawaban || 'A') as 'A' | 'B' | 'C' | 'D' | 'E',
        pembahasan: null,
      }));

      if (parsedItems.length === 0) {
        toast.error('Tidak ditemukan butir soal pilihan ganda pada Google Form tersebut.');
        return;
      }

      setQuestions(parsedItems);
      setStep('preview');
      toast.success(`Berhasil mengekstrak ${parsedItems.length} butir soal!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal mengekstrak soal dari Google Form';
      toast.error(msg, { duration: 6000 });
    } finally {
      setIsParsing(false);
    }
  };

  // 2. Bagi rata bobot ke total 100 poin
  const handleDistributePoints = () => {
    if (questions.length === 0) return;
    const perItem = Number((100 / questions.length).toFixed(2));
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        bobot: perItem,
      }))
    );
    toast.success(`Bobot nilai telah dibagi rata: ~${perItem} poin per butir soal.`);
  };

  // 3. Ubah Kunci Jawaban Soal
  const handleSetKey = (qIndex: number, key: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, kunci_jawaban: key } : q))
    );
  };

  // 4. Ubah Bobot Nilai Soal
  const handleSetBobot = (qIndex: number, val: number) => {
    const safeVal = Math.max(0.1, isNaN(val) ? 1.0 : val);
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, bobot: safeVal } : q))
    );
  };

  // 5. Hapus Pertanyaan dari Daftar Impor (misal pertanyaan identitas seperti "Nama" atau "Kelas")
  const handleDeleteItem = (qIndex: number) => {
    setQuestions((prev) =>
      prev
        .filter((_, idx) => idx !== qIndex)
        .map((q, idx) => ({ ...q, nomor_urut: idx + 1 }))
    );
    toast.success('Butir soal dihapus dari daftar impor');
  };

  // 6. Simpan Seluruh Soal ke Database Absenta
  const handleCommitImport = async () => {
    if (questions.length === 0) {
      toast.error('Tidak ada butir soal untuk diimpor.');
      return;
    }

    setIsImporting(true);
    try {
      const itemsToImport = questions.map((q, idx) => ({
        nomor_urut: idx + 1,
        jenis_soal: 'PG' as const,
        konten_pertanyaan: q.konten_pertanyaan,
        gambar_stimulus_url: q.gambar_stimulus_url || null,
        bobot: Number(q.bobot) || 1.0,
        opsi_jawaban_json: q.opsi_jawaban_json,
        kunci_jawaban: q.kunci_jawaban,
        pembahasan: null,
      }));

      await cbtApi.bulkImportSoal(bankSoalId, itemsToImport);
      toast.success(`Selamat! ${itemsToImport.length} butir soal berhasil diimpor.`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan butir soal ke bank soal';
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const totalPoints = questions.reduce((acc, curr) => acc + (Number(curr.bobot) || 1), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'input' ? 'Impor Soal dari Google Form' : 'Pratinjau & Kunci Jawaban Soal'}
      size={step === 'input' ? 'md' : 'xl'}
    >
      <div className="-mt-3 sm:-mt-6 -mx-3 sm:-mx-6 mb-3 sm:mb-4 h-1.5 bg-indigo-600" />

      {step === 'input' ? (
        <form onSubmit={handleParse} className="space-y-4">
          <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 shrink-0 mt-0.5">
              <Sparkles size={16} />
            </div>
            <div className="text-xs space-y-1 min-w-0">
              <h4 className="font-bold text-slate-800 dark:text-slate-100">
                Target Bank Soal: <span className="text-indigo-700 dark:text-indigo-300">{bankSoalJudul}</span>
              </h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                Sistem akan membaca teks soal, stimulus, dan opsi jawaban (A, B, C, D, E) langsung dari formulir Google Anda secara instan tanpa perlu mengetik ulang satu per satu.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="gform-url-input" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Tempel Tautan / Link Google Form
            </label>
            <div className="relative">
              <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="gform-url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Contoh: https://forms.gle/xyz123 atau https://docs.google.com/forms/d/..."
                className="pl-9 pr-3 text-xs w-full"
                aria-label="URL Tautan Google Form"
                required
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
              <span>💡 Didukung: Link pendek (<code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">forms.gle/...</code>) maupun link panjang Google Form.</span>
            </p>
          </div>

          {/* Petunjuk Praktis */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <HelpCircle size={13} className="text-indigo-600" />
              <span>Tips Agar Impor Berhasil:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-500 dark:text-slate-400">
              <li>Pastikan form dapat dibuka publik (bukan form khusus internal yang wajib login email Google).</li>
              <li>Jika form kuis di Google Form memuat pertanyaan identitas (Nama Siswa, Kelas), Anda dapat menghapusnya di tahap pratinjau sebelum disimpan.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isParsing}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isParsing || !url.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {isParsing ? (
                <>
                  <Loader size="sm" className="text-white mr-1" />
                  <span>Mengekstrak Soal...</span>
                </>
              ) : (
                <>
                  <span>Ekstrak &amp; Pratinjau</span>
                  <ArrowRight size={14} />
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        /* STEP 2: PREVIEW & KUNCI JAWABAN */
        <div className="space-y-3.5">
          {/* Header Ringkasan & Action Tools */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                  {formTitle}
                </span>
                <span className="px-2 py-0.2 rounded-md font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px]">
                  {questions.length} Butir Soal
                </span>
                <span className="px-2 py-0.2 rounded-md font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px]">
                  Total {Number(totalPoints.toFixed(1))} Poin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Periksa butir soal di bawah ini. Klik huruf opsi untuk menentukan <strong>Kunci Jawaban</strong> yang benar.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDistributePoints}
                className="text-xs h-8 px-2.5 font-bold text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 hover:bg-indigo-100 cursor-pointer"
                title="Bagi rata nilai butir soal agar total tepat 100 poin"
              >
                <Sparkles size={13} className="mr-1" />
                <span>Bagi Rata (100 Poin)</span>
              </Button>
            </div>
          </div>

          {/* List Butir Soal */}
          <div className="max-h-[58vh] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5"
              >
                {/* Header Kartu Soal */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {q.nomor_urut}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pilihan Ganda
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <label htmlFor={`bobot-soal-${qIndex}`} className="text-[11px] font-semibold text-slate-500">
                        Bobot:
                      </label>
                      <input
                        id={`bobot-soal-${qIndex}`}
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="100"
                        value={q.bobot}
                        onChange={(e) => handleSetBobot(qIndex, parseFloat(e.target.value))}
                        className="w-16 h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-center text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800"
                        aria-label={`Bobot nilai soal nomor ${q.nomor_urut}`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(qIndex)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Hapus butir ini dari daftar impor (misal jika berupa pertanyaan nama/identitas)"
                      aria-label={`Hapus butir soal ${q.nomor_urut}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Teks Pertanyaan */}
                <div className="text-xs text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap leading-relaxed pl-8">
                  {q.konten_pertanyaan}
                </div>

                {/* Stimulus Gambar jika ada */}
                {q.gambar_stimulus_url && (
                  <div className="pl-8 pt-1">
                    <img
                      src={q.gambar_stimulus_url}
                      alt={`Stimulus Soal ${q.nomor_urut}`}
                      className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Opsi Jawaban Interaktif (Pilih Kunci 1-Klik) */}
                <div className="pl-8 pt-1 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilihan Jawaban (Klik opsi untuk menandai Kunci Jawaban):
                  </div>
                  <div className="space-y-1.5">
                    {q.opsi_jawaban_json.map((opt) => {
                      const isCorrect = q.kunci_jawaban === opt.kode;
                      return (
                        <button
                          key={opt.kode}
                          type="button"
                          onClick={() => handleSetKey(qIndex, opt.kode as any)}
                          className={cn(
                            'w-full flex items-center gap-2 p-2 rounded-xl text-xs text-left transition-all border cursor-pointer',
                            isCorrect
                              ? 'bg-indigo-50 border-indigo-400 dark:bg-indigo-950/70 dark:border-indigo-600 shadow-2xs font-semibold'
                              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                          )}
                        >
                          <span
                            className={cn(
                              'w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border transition-all',
                              isCorrect
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            )}
                          >
                            {opt.kode}
                          </span>
                          <span className="flex-1 min-w-0">{opt.teks}</span>
                          {isCorrect && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0 flex items-center gap-1 shadow-2xs">
                              <Check size={11} className="stroke-[3]" />
                              <span>Kunci</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep('input')}
              disabled={isImporting}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Ganti Tautan</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCommitImport}
              disabled={isImporting || questions.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader size="sm" className="text-white mr-1" />
                  <span>Mengimpor ke Bank Soal...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Impor {questions.length} Butir Soal</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CbtGoogleFormImportModal;
