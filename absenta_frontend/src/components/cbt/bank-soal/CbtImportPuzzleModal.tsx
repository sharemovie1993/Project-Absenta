import React, { useState, useMemo, useRef } from 'react';
import { Modal, Button } from '@/components/ui';
import {
  UploadCloud,
  FileText,
  Link2,
  ClipboardPaste,
  Puzzle,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Sparkles,
  ArrowUpCircle,
  Loader2,
  KeyRound,
  Plus,
  Send,
  Code2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { parseFullQuestionText } from './cbtTextDragDropHelper';
import {
  PUZZLE_OPTION_CODES,
  type OptionCode,
  type PuzzleQuestionDraft,
  createEmptyPuzzleOptions,
  normalizePuzzleOptions,
  isPuzzleCardReady,
  parseBulkAnswerKeys,
  scanDocumentToPuzzle,
} from './cbtExternalPuzzleHelper';

export interface CbtImportPuzzleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoalId: string;
  bankJudul: string;
  startingNomor: number;
  onSuccessImport: () => void;
}

type SourceTab = 'document' | 'google_form' | 'paste_text';

export const CbtImportPuzzleModal: React.FC<CbtImportPuzzleModalProps> = ({
  isOpen,
  onClose,
  bankSoalId,
  bankJudul,
  startingNomor,
  onSuccessImport,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourceTab, setSourceTab] = useState<SourceTab>('document');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [pastedRawText, setPastedRawText] = useState('');
  const [bulkKeysInput, setBulkKeysInput] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [puzzleCards, setPuzzleCards] = useState<PuzzleQuestionDraft[]>([]);
  const [expandedRawIds, setExpandedRawIds] = useState<Record<string, boolean>>({});

  const readyCount = useMemo(
    () => puzzleCards.filter((c) => c.selected && isPuzzleCardReady(c)).length,
    [puzzleCards]
  );
  const incompleteCount = useMemo(
    () => puzzleCards.filter((c) => c.selected && !isPuzzleCardReady(c)).length,
    [puzzleCards]
  );

  const handleReset = () => {
    setPuzzleCards([]);
    setSourceLabel('');
    setBulkKeysInput('');
    setExpandedRawIds({});
  };

  // ── 1A. Scan File Word (.docx) / PDF (.pdf) / Teks (.txt) ──
  const handleFileUpload = async (file: File) => {
    try {
      setIsScanning(true);
      const res = await cbtApi.parseExternalDocument(file);
      const scanned = scanDocumentToPuzzle(res.raw_text, startingNomor);
      if (scanned.cards.length === 0) {
        toast.error('Teks dokumen terbaca, tetapi belum ada blok soal yang terdeteksi.');
        setPastedRawText(res.raw_text);
        setSourceTab('paste_text');
        return;
      }
      setPuzzleCards(scanned.cards);
      setSourceLabel(`${res.filename} (${res.source_type.toUpperCase()})`);
      toast.success(
        `Berhasil memindai ${scanned.cards.length} blok puzzle soal${
          scanned.detectedKeysCount > 0 ? ` (${scanned.detectedKeysCount} kunci terdeteksi)` : ''
        }.`
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memindai dokumen');
    } finally {
      setIsScanning(false);
    }
  };

  // ── 1B. Scan Google Form (Preview / viewform URL) ──
  const handleScanGoogleForm = async () => {
    if (!googleFormUrl.trim()) {
      toast.error('Masukkan URL Google Form terlebih dahulu.');
      return;
    }
    try {
      setIsScanning(true);
      const res = await cbtApi.parseGoogleForm(googleFormUrl.trim());
      const mapped: PuzzleQuestionDraft[] = (res.items || []).map((item, idx) => ({
        tempId: `gform-${Date.now()}-${idx}`,
        selected: true,
        nomor_urut: startingNomor + idx,
        konten_pertanyaan: item.konten_pertanyaan || '',
        gambar_stimulus_url: item.gambar_stimulus_url || null,
        bobot: Number(item.bobot) || 1.0,
        opsi_jawaban_json: normalizePuzzleOptions(item.opsi_jawaban_json),
        kunci_jawaban: (item.kunci_jawaban || 'A') as OptionCode,
        pembahasan: item.pembahasan || '',
        raw_source_block: `${item.konten_pertanyaan}\n${(item.opsi_jawaban_json || [])
          .map((o) => `${o.kode}. ${o.teks}`)
          .join('\n')}`,
      }));

      setPuzzleCards(mapped);
      setSourceLabel(`Google Form: ${res.title || 'Preview Form'}`);
      toast.success(`Berhasil mengekstrak ${mapped.length} soal ke Puzzle Workbench.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memindai Google Form');
    } finally {
      setIsScanning(false);
    }
  };

  // ── 1C. Scan Teks Mentah (Tempel Teks) ──
  const handleScanPastedText = () => {
    if (!pastedRawText.trim()) {
      toast.error('Tempel teks soal terlebih dahulu.');
      return;
    }
    const scanned = scanDocumentToPuzzle(pastedRawText, startingNomor);
    if (scanned.cards.length === 0) {
      toast.error('Tidak ditemukan pola soal yang dapat dipindai.');
      return;
    }
    setPuzzleCards(scanned.cards);
    setSourceLabel('Tempel Teks Manual');
    toast.success(`Helper berhasil menyusun ${scanned.cards.length} kartu puzzle soal.`);
  };

  // ── 2. Operasi Puzzle Workbench ──
  const updateCard = (tempId: string, updater: (prev: PuzzleQuestionDraft) => PuzzleQuestionDraft) => {
    setPuzzleCards((prev) => prev.map((c) => (c.tempId === tempId ? updater(c) : c)));
  };

  const handleApplyBulkKeys = () => {
    const keyMap = parseBulkAnswerKeys(bulkKeysInput);
    if (keyMap.size === 0) {
      toast.error('Format kunci tidak dikenali. Contoh: "1.A 2.C 3.B" atau "A, C, B, D".');
      return;
    }
    let applied = 0;
    setPuzzleCards((prev) =>
      prev.map((card, idx) => {
        const key = keyMap.get(idx + 1) || keyMap.get(card.nomor_urut);
        if (key) {
          applied++;
          return { ...card, kunci_jawaban: key };
        }
        return card;
      })
    );
    toast.success(`Berhasil menerapkan ${applied} kunci jawaban ke kartu puzzle.`);
  };

  const handleReparseCardRaw = (tempId: string) => {
    setPuzzleCards((prev) =>
      prev.map((card) => {
        if (card.tempId !== tempId) return card;
        const parsed = parseFullQuestionText(card.raw_source_block);
        if (!parsed?.isFullQuestion) {
          toast.error('Blok teks belum memenuhi pola Pertanyaan + minimal 2 opsi (A. / B.).');
          return card;
        }
        toast.success('Blok soal berhasil di-parse ulang.');
        return {
          ...card,
          konten_pertanyaan: parsed.question,
          opsi_jawaban_json: normalizePuzzleOptions(parsed.options),
          kunci_jawaban: parsed.kunciJawaban || card.kunci_jawaban,
          pembahasan: parsed.pembahasan || card.pembahasan,
        };
      })
    );
  };

  const handleMergeWithPrevious = (idx: number) => {
    if (idx <= 0) return;
    setPuzzleCards((prev) => {
      const current = prev[idx];
      const target = prev[idx - 1];
      const mergedRaw = `${target.raw_source_block}\n${current.raw_source_block}`.trim();
      const parsed = parseFullQuestionText(mergedRaw);
      const updatedTarget: PuzzleQuestionDraft = parsed?.isFullQuestion
        ? {
            ...target,
            raw_source_block: mergedRaw,
            konten_pertanyaan: parsed.question,
            opsi_jawaban_json: normalizePuzzleOptions(parsed.options),
            kunci_jawaban: parsed.kunciJawaban || target.kunci_jawaban,
            pembahasan: parsed.pembahasan || target.pembahasan,
          }
        : {
            ...target,
            raw_source_block: mergedRaw,
            konten_pertanyaan: `${target.konten_pertanyaan}\n${current.konten_pertanyaan}`.trim(),
          };
      return prev
        .map((c, i) => (i === idx - 1 ? updatedTarget : c))
        .filter((_, i) => i !== idx)
        .map((c, i) => ({ ...c, nomor_urut: startingNomor + i }));
    });
    toast.success('Blok digabungkan ke soal di atasnya.');
  };

  const handleAddEmptyPuzzleCard = () => {
    setPuzzleCards((prev) => [
      ...prev,
      {
        tempId: `manual-${Date.now()}`,
        selected: true,
        nomor_urut: startingNomor + prev.length,
        konten_pertanyaan: '',
        gambar_stimulus_url: null,
        bobot: 1.0,
        opsi_jawaban_json: createEmptyPuzzleOptions(),
        kunci_jawaban: 'A',
        pembahasan: '',
        raw_source_block: '',
      },
    ]);
  };

  // ── 3. Insert ke Editor Soal (Bulk Import ke Backend) ──
  const handleInsertToEditor = async () => {
    const readyCards = puzzleCards.filter((c) => c.selected && isPuzzleCardReady(c));
    if (readyCards.length === 0) {
      toast.error('Tidak ada soal berstatus "Siap Import" yang dipilih.');
      return;
    }

    try {
      setIsInserting(true);
      const itemsPayload = readyCards.map((c, idx) => ({
        nomor_urut: startingNomor + idx,
        jenis_soal: 'PG' as const,
        konten_pertanyaan: c.konten_pertanyaan.trim(),
        gambar_stimulus_url: c.gambar_stimulus_url || null,
        bobot: Number(c.bobot) || 1.0,
        opsi_jawaban_json: c.opsi_jawaban_json
          .filter((o) => o.teks.trim().length > 0)
          .map((o) => ({ kode: o.kode, teks: o.teks.trim(), gambar_url: o.gambar_url || null })),
        kunci_jawaban: c.kunci_jawaban,
        pembahasan: c.pembahasan.trim() || null,
      }));

      const res = await cbtApi.bulkImportSoal(bankSoalId, itemsPayload);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cbtQueryKeys.soalList(bankSoalId) }),
        queryClient.invalidateQueries({ queryKey: cbtQueryKeys.bankSoal() }),
      ]);
      toast.success(`Berhasil memasukkan ${res.importedCount} soal ke Editor Soal!`);
      handleReset();
      onSuccessImport();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengimpor soal ke editor');
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      title={`Helper Import & Puzzle Soal: ${bankJudul}`}
    >
      <div className="flex flex-col max-h-[84vh] overflow-hidden text-slate-800 dark:text-slate-100">
        {/* ── TAHAP 1: PILIH SUMBER EKSTERNAL ── */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSourceTab('document')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  sourceTab === 'document'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <FileText size={14} />
                <span>Word (.docx) / PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceTab('google_form')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  sourceTab === 'google_form'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <Link2 size={14} />
                <span>Google Form (Preview)</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceTab('paste_text')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  sourceTab === 'paste_text'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <ClipboardPaste size={14} />
                <span>Tempel Teks</span>
              </button>
            </div>

            {puzzleCards.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  {readyCount} Siap Import
                </span>
                {incompleteCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                    {incompleteCount} Perlu Lengkapi
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer ml-1"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Input Sumber Aktif */}
          {sourceTab === 'document' && (
            <div
              onClick={() => !isScanning && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl p-4 bg-white dark:bg-slate-900 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {isScanning ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {isScanning
                      ? 'Helper sedang memindai dokumen...'
                      : 'Klik atau Drag & Drop file Word (.docx), PDF (.pdf), atau Teks (.txt)'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Hasil scan masuk ke Puzzle Workbench terlebih dahulu agar bisa disusun sebelum di-insert ke editor soal.
                  </p>
                </div>
              </div>
              {sourceLabel && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  {sourceLabel}
                </span>
              )}
            </div>
          )}

          {sourceTab === 'google_form' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={googleFormUrl}
                onChange={(e) => setGoogleFormUrl(e.target.value)}
                placeholder="Tempel URL Google Form Preview / viewform (contoh: https://docs.google.com/forms/d/e/.../viewform)"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <Button
                type="button"
                onClick={handleScanGoogleForm}
                disabled={isScanning}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 rounded-xl cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>Scan Google Form</span>
              </Button>
            </div>
          )}

          {sourceTab === 'paste_text' && (
            <div className="space-y-2">
              <textarea
                rows={4}
                value={pastedRawText}
                onChange={(e) => setPastedRawText(e.target.value)}
                placeholder="Tempel teks soal dari Word, PDF, ChatGPT, atau Notepad di sini (misal: 1. Pertanyaan... A. ... B. ... Kunci: A)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleScanPastedText}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Puzzle size={14} />
                  <span>Scan ke Puzzle Soal</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── TAHAP 2: PUZZLE SOAL WORKBENCH ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/70 dark:bg-slate-950/60">
          {puzzleCards.length === 0 ? (
            <div className="py-14 text-center space-y-2 text-slate-400">
              <Puzzle size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Belum ada puzzle soal yang dipindai
              </p>
              <p className="text-xs max-w-md mx-auto">
                Unggah file Word (.docx) / PDF, masukkan link Google Form mode preview, atau tempel teks mentah di atas untuk mulai menyusun soal.
              </p>
            </div>
          ) : (
            <>
              {/* Bar Bantu: Tempel Kunci Jawaban Massal */}
              <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                  <KeyRound size={14} />
                  <span>Kunci Massal:</span>
                </div>
                <input
                  type="text"
                  value={bulkKeysInput}
                  onChange={(e) => setBulkKeysInput(e.target.value)}
                  placeholder="Tempel daftar kunci (contoh: 1.A 2.C 3.B 4.D atau A, C, B, D)"
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyBulkKeys}
                  className="text-xs font-bold border-indigo-300 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg cursor-pointer shrink-0"
                >
                  Terapkan Kunci
                </Button>
              </div>

              {/* Daftar Kartu Puzzle Soal */}
              {puzzleCards.map((card, idx) => {
                const ready = isPuzzleCardReady(card);
                const showRaw = Boolean(expandedRawIds[card.tempId]);

                return (
                  <div
                    key={card.tempId}
                    className={cn(
                      'bg-white dark:bg-slate-900 rounded-2xl border p-3.5 space-y-3 shadow-2xs transition-all',
                      !card.selected && 'opacity-55',
                      ready
                        ? 'border-slate-200 dark:border-slate-800'
                        : 'border-amber-300 dark:border-amber-700/80 ring-1 ring-amber-200/70'
                    )}
                  >
                    {/* Header Kartu Puzzle */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={card.selected}
                          onChange={(e) =>
                            updateCard(card.tempId, (p) => ({ ...p, selected: e.target.checked }))
                          }
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          aria-label={`Pilih soal nomor ${card.nomor_urut}`}
                        />
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-black">
                          Soal #{card.nomor_urut}
                        </span>
                        {ready ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                            <CheckCircle2 size={12} /> Siap Import
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                            <AlertTriangle size={12} /> Perlu Lengkapi (Min. 2 Opsi &amp; Kunci Terisi)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMergeWithPrevious(idx)}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                            title="Gabungkan blok ini ke soal di atasnya (jika terpotong halaman PDF)"
                          >
                            <ArrowUpCircle size={12} />
                            <span>Gabung Atas</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRawIds((prev) => ({
                              ...prev,
                              [card.tempId]: !prev[card.tempId],
                            }))
                          }
                          className="px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1 cursor-pointer"
                        >
                          <Code2 size={12} />
                          <span>{showRaw ? 'Tutup Teks Mentah' : 'Teks Mentah'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPuzzleCards((prev) =>
                              prev
                                .filter((c) => c.tempId !== card.tempId)
                                .map((c, i) => ({ ...c, nomor_urut: startingNomor + i }))
                            )
                          }
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Hapus kartu puzzle ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Panel Teks Mentah (Opsional untuk Edit & Auto-Parse Ulang) */}
                    {showRaw && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                        <textarea
                          rows={4}
                          value={card.raw_source_block}
                          onChange={(e) =>
                            updateCard(card.tempId, (p) => ({
                              ...p,
                              raw_source_block: e.target.value,
                            }))
                          }
                          className="w-full text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:outline-hidden"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleReparseCardRaw(card.tempId)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles size={11} />
                            <span>Auto-Parse Ulang Blok Ini</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Pertanyaan */}
                    <div className="space-y-1.5">
                      <textarea
                        rows={2}
                        value={card.konten_pertanyaan}
                        onChange={(e) =>
                          updateCard(card.tempId, (p) => ({
                            ...p,
                            konten_pertanyaan: e.target.value,
                          }))
                        }
                        placeholder="Teks pertanyaan soal..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      {card.gambar_stimulus_url && (
                        <img
                          src={card.gambar_stimulus_url}
                          alt={`Stimulus ${card.nomor_urut}`}
                          className="max-h-32 rounded-lg border border-slate-200 object-contain"
                        />
                      )}
                    </div>

                    {/* Opsi Jawaban A-E + Pilih Kunci */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {card.opsi_jawaban_json.map((opt, optIdx) => {
                        const isKey = card.kunci_jawaban === opt.kode;
                        return (
                          <div
                            key={opt.kode}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all',
                              isKey
                                ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                updateCard(card.tempId, (p) => ({
                                  ...p,
                                  kunci_jawaban: opt.kode as OptionCode,
                                }))
                              }
                              title={`Jadikan ${opt.kode} sebagai Kunci Jawaban`}
                              className={cn(
                                'w-6 h-6 rounded-lg text-[11px] font-black shrink-0 cursor-pointer transition-all',
                                isKey
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100'
                              )}
                            >
                              {opt.kode}
                            </button>
                            <input
                              type="text"
                              value={opt.teks}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCard(card.tempId, (p) => ({
                                  ...p,
                                  opsi_jawaban_json: p.opsi_jawaban_json.map((o, i) =>
                                    i === optIdx ? { ...o, teks: val } : o
                                  ),
                                }));
                              }}
                              placeholder={`Opsi ${opt.kode}${optIdx >= 4 ? ' (opsional)' : ''}`}
                              className="flex-1 text-xs bg-transparent focus:outline-hidden min-w-0"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer Kartu: Bobot & Pembahasan */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                      <div className="sm:col-span-3 flex items-center gap-2 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-[11px] font-bold text-slate-500">Bobot:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          value={card.bobot}
                          onChange={(e) =>
                            updateCard(card.tempId, (p) => ({
                              ...p,
                              bobot: parseFloat(e.target.value) || 1.0,
                            }))
                          }
                          className="w-full text-xs font-bold bg-transparent focus:outline-hidden"
                        />
                      </div>
                      <div className="sm:col-span-9">
                        <input
                          type="text"
                          value={card.pembahasan}
                          onChange={(e) =>
                            updateCard(card.tempId, (p) => ({ ...p, pembahasan: e.target.value }))
                          }
                          placeholder="Pembahasan (opsional)..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddEmptyPuzzleCard}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-400 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Kartu Puzzle Kosong</span>
              </button>
            </>
          )}
        </div>

        {/* ── TAHAP 3: FOOTER INSERT KE EDITOR SOAL ── */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-slate-500">
            Klik huruf opsi (<strong className="text-emerald-600">A–E</strong>) pada kartu untuk mengatur Kunci Jawaban. Hanya soal berstatus <strong>Siap Import</strong> yang akan di-insert.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold rounded-xl cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={readyCount === 0 || isInserting}
              onClick={handleInsertToEditor}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isInserting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Insert {readyCount} Soal ke Editor Soal</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
