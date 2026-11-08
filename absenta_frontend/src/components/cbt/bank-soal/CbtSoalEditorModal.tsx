import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui';
import {
  UploadCloud,
  Trash2,
  CheckCircle2,
  ImageIcon,
  Copy,
  Plus,
  Check,
  Circle,
  MessageSquare,
  Save,
  X,
} from 'lucide-react';
import axiosInstance from '@/lib/axiosInstance';
import { useQueryClient } from '@tanstack/react-query';
import { cbtQueryKeys } from '@/api/cbt.api';
import toast from 'react-hot-toast';
import { z } from 'zod';
import type { CbtSoal, OpsiJawaban } from '@/types/cbt.types';
import { cn } from '@/lib/utils';
import { getOptionBadgeColor } from '../common/CbtOptionsRenderer';

export interface CbtInlineSoalCardProps {
  bankSoalId: string;
  soal?: CbtSoal | null;
  nomorUrut: number;
  onSaved: (savedMode: 'stay' | 'add-next') => void;
  onCancel?: () => void;
  onDelete?: () => void;
  autoFocus?: boolean;
}

const soalSchema = z.object({
  nomor_urut: z.number().int().min(1, 'Nomor urut minimal 1'),
  konten_pertanyaan: z.string(),
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

export const CbtInlineSoalCard: React.FC<CbtInlineSoalCardProps> = ({
  bankSoalId,
  soal,
  nomorUrut: initialNomorUrut,
  onSaved,
  onCancel,
  onDelete,
  autoFocus = true,
}) => {
  const queryClient = useQueryClient();
  const [nomorUrut, setNomorUrut] = useState<number>(soal?.nomor_urut || initialNomorUrut);
  const [kontenPertanyaan, setKontenPertanyaan] = useState(soal?.konten_pertanyaan || '');
  const [gambarStimulusUrl, setGambarStimulusUrl] = useState<string | null>(
    soal?.gambar_stimulus_url || null
  );
  const [bobot, setBobot] = useState<number>(Number(soal?.bobot) || 1.0);
  const [kunciJawaban, setKunciJawaban] = useState<'A' | 'B' | 'C' | 'D' | 'E'>(
    soal?.kunci_jawaban || 'A'
  );
  const [pembahasan, setPembahasan] = useState(soal?.pembahasan || '');
  const [opsiJawaban, setOpsiJawaban] = useState<OpsiJawaban[]>(
    Array.isArray(soal?.opsi_jawaban_json) && soal!.opsi_jawaban_json.length > 0
      ? soal!.opsi_jawaban_json
      : DEFAULT_OPTIONS.map((o) => ({ ...o }))
  );

  const [uploadingStimulus, setUploadingStimulus] = useState(false);
  const [uploadingOpsiIndex, setUploadingOpsiIndex] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<'question' | number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPembahasanBox, setShowPembahasanBox] = useState(Boolean(soal?.pembahasan));

  const fileInputStimulusRef = useRef<HTMLInputElement>(null);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNomorUrut(soal?.nomor_urut || initialNomorUrut);
    setKontenPertanyaan(soal?.konten_pertanyaan || '');
    setGambarStimulusUrl(soal?.gambar_stimulus_url || null);
    setBobot(Number(soal?.bobot) || 1.0);
    setKunciJawaban(soal?.kunci_jawaban || 'A');
    setPembahasan(soal?.pembahasan || '');
    setShowPembahasanBox(Boolean(soal?.pembahasan));
    setOpsiJawaban(
      Array.isArray(soal?.opsi_jawaban_json) && soal!.opsi_jawaban_json.length > 0
        ? soal!.opsi_jawaban_json.map((o) => ({ ...o }))
        : DEFAULT_OPTIONS.map((o) => ({ ...o }))
    );
  }, [soal, initialNomorUrut]);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        questionInputRef.current?.focus();
      }, 60);
    }
  }, [autoFocus]);

  // Helper konversi Data URL (base64) menjadi File
  const dataUrlToFile = (dataUrl: string, filename: string): File | null => {
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0]?.match(/:(.*?);/);
      if (!mimeMatch || !arr[1]) return null;
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch {
      return null;
    }
  };

  // Helper ekstrak BANYAK file gambar dari Clipboard (Ctrl+V Multi-File / HTML <img> / Screenshot)
  const extractImagesFromClipboard = async (
    clipboardData?: DataTransfer | null
  ): Promise<{ files: File[]; wordLocalMultiImageDetected: boolean }> => {
    const resultFiles: File[] = [];
    if (!clipboardData) return { files: resultFiles, wordLocalMultiImageDetected: false };

    // 1. Cek daftar file langsung di clipboard (misal Copy beberapa file gambar dari Explorer)
    if (clipboardData.files && clipboardData.files.length > 0) {
      const imageFiles = Array.from(clipboardData.files).filter((f) =>
        f.type.startsWith('image/')
      );
      resultFiles.push(...imageFiles);
    }

    // 2. Cek items jika files masih kosong
    if (resultFiles.length === 0 && clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) resultFiles.push(f);
        }
      }
    }

    // 3. Cek text/html apabila menyalin beberapa gambar dari dokumen (Google Docs / Web / Word)
    const html = clipboardData.getData('text/html') || '';
    let wordLocalMultiImageDetected = false;
    if (html && /<img\b/i.test(html)) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const imgs = Array.from(doc.querySelectorAll('img'));

        if (imgs.length > 1) {
          const htmlFiles: File[] = [];
          let localFileCount = 0;

          for (let i = 0; i < imgs.length; i++) {
            const src = imgs[i].getAttribute('src') || '';
            if (src.startsWith('data:image/')) {
              const converted = dataUrlToFile(src, `paste-opt-${i + 1}.png`);
              if (converted) htmlFiles.push(converted);
            } else if (src.startsWith('file://')) {
              localFileCount++;
            } else if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')) {
              try {
                const resp = await fetch(src);
                const blob = await resp.blob();
                if (blob.type.startsWith('image/')) {
                  htmlFiles.push(new File([blob], `paste-opt-${i + 1}.png`, { type: blob.type }));
                }
              } catch {
                // Abaikan jika gagal fetch CORS
              }
            }
          }

          if (htmlFiles.length > 1) {
            return { files: htmlFiles, wordLocalMultiImageDetected: false };
          }
          if (localFileCount > 1) {
            wordLocalMultiImageDetected = true;
          }
        }
      } catch {
        // Fallback ke resultFiles
      }
    }

    return { files: resultFiles, wordLocalMultiImageDetected };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  /**
   * Smart Client-Side Image Compression (WebP + Proportional Max Dimension)
   * Dilakukan 1x saat guru upload/paste agar file di server sudah ringan (~80-180 KB)
   * dan langsung cepat dimuat oleh ratusan HP siswa saat ujian serentak.
   */
  const compressImageForCbt = (
    file: File,
    maxDimension: number = 1280,
    quality: number = 0.84
  ): Promise<File> => {
    if (
      !file.type.startsWith('image/') ||
      file.type === 'image/svg+xml' ||
      file.type === 'image/gif'
    ) {
      return Promise.resolve(file);
    }

    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let targetWidth = img.naturalWidth || img.width;
        let targetHeight = img.naturalHeight || img.height;

        if (!targetWidth || !targetHeight) {
          resolve(file);
          return;
        }

        const needsResize = targetWidth > maxDimension || targetHeight > maxDimension;

        // Jika gambar sudah sangat kecil (<= 30 KB) dan dimensinya tidak melebihi batas, biarkan apa adanya
        // agar potongan rumus kecil (Snipping Tool) tidak mengalami generation loss
        if (!needsResize && file.size <= 30 * 1024) {
          resolve(file);
          return;
        }

        if (needsResize) {
          if (targetWidth >= targetHeight) {
            targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
            targetWidth = maxDimension;
          } else {
            targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
            targetHeight = maxDimension;
          }
        }

        // Formula/Table Aware Quality: jika rasio melebar/memanjang atau tinggi kecil (ciri khas rumus/tabel),
        // naikkan kualitas WebP ke 0.90 agar indeks/pangkat kecil tetap tajam di semua jenjang
        const aspectRatio = targetWidth / Math.max(1, targetHeight);
        const isFormulaOrTableStrip =
          aspectRatio >= 2.2 || aspectRatio <= 0.45 || targetHeight <= 240;
        const effectiveQuality = isFormulaOrTableStrip ? Math.max(quality, 0.9) : quality;

        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              // Gunakan hasil kompresi jika lebih ringan dari file asli
              if (blob.size < file.size) {
                const baseName = file.name.replace(/\.[^.]+$/, '') || `cbt-img-${Date.now()}`;
                const compressedFile = new File([blob], `${baseName}.webp`, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/webp',
            effectiveQuality
          );
        } catch {
          resolve(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  };

  // Upload Gambar Stimulus Soal (dari File Input, Paste Ctrl+V, atau Drag & Drop)
  const uploadStimulusFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Ukuran sumber gambar maksimal 15 MB');
      return;
    }

    try {
      setUploadingStimulus(true);
      const originalSize = file.size;
      const processedFile = await compressImageForCbt(file, 1280, 0.84);

      const formData = new FormData();
      formData.append('file', processedFile);

      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = res.data?.data?.url || res.data?.url;
      if (url) {
        setGambarStimulusUrl(url);
        const savedInfo =
          originalSize > 300 * 1024 && processedFile.size < originalSize
            ? ` (dikompres ${formatFileSize(originalSize)} → ${formatFileSize(processedFile.size)})`
            : '';
        toast.success(`Gambar soal berhasil disisipkan${savedInfo}`);
      }
    } catch {
      toast.error('Gagal mengunggah gambar');
    } finally {
      setUploadingStimulus(false);
      if (fileInputStimulusRef.current) {
        fileInputStimulusRef.current.value = '';
      }
    }
  };

  const handleUploadStimulus = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadStimulusFile(file);
  };

  // Upload Gambar Opsi (A, B, C, D, E)
  const handleUploadOpsi = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Ukuran sumber gambar opsi maksimal 15 MB');
      return;
    }

    try {
      setUploadingOpsiIndex(index);
      const originalSize = file.size;
      const processedFile = await compressImageForCbt(file, 800, 0.82);

      const formData = new FormData();
      formData.append('file', processedFile);

      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = res.data?.data?.url || res.data?.url;
      if (url) {
        setOpsiJawaban((prev) =>
          prev.map((opt, i) => (i === index ? { ...opt, gambar_url: url } : opt))
        );
        const savedInfo =
          originalSize > 300 * 1024 && processedFile.size < originalSize
            ? ` (${formatFileSize(originalSize)} → ${formatFileSize(processedFile.size)})`
            : '';
        toast.success(`Gambar opsi ${opsiJawaban[index]?.kode || ''} berhasil disisipkan${savedInfo}`);
      }
    } catch {
      toast.error('Gagal mengunggah gambar opsi');
    } finally {
      setUploadingOpsiIndex(null);
    }
  };

  // Upload Banyak Gambar Opsi Sekaligus (Otomatis sebar ke Opsi A, B, C, D, E)
  const handleUploadMultiOpsi = async (startIndex: number, files: File[]) => {
    const validFiles = files
      .filter((f) => f.type.startsWith('image/') && f.size <= 15 * 1024 * 1024)
      .slice(0, 5 - startIndex);

    if (validFiles.length === 0) {
      toast.error('Tidak ada file gambar valid (PNG/JPG maks 15 MB)');
      return;
    }

    if (validFiles.length === 1) {
      await handleUploadOpsi(startIndex, validFiles[0]);
      return;
    }

    const allCodes: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

    // Pastikan jumlah slot opsi cukup untuk menampung seluruh gambar yang di-drop/paste
    setOpsiJawaban((prev) => {
      const neededCount = Math.min(5, Math.max(prev.length, startIndex + validFiles.length));
      const nextList: OpsiJawaban[] = [];
      for (let i = 0; i < neededCount; i++) {
        nextList.push(prev[i] || { kode: allCodes[i], teks: '', gambar_url: null });
      }
      return nextList;
    });

    try {
      setUploadingOpsiIndex(startIndex);
      const uploadedUrls = await Promise.all(
        validFiles.map(async (file) => {
          const processedFile = await compressImageForCbt(file, 800, 0.82);
          const formData = new FormData();
          formData.append('file', processedFile);
          const res = await axiosInstance.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          return (res.data?.data?.url || res.data?.url || null) as string | null;
        })
      );

      setOpsiJawaban((prev) =>
        prev.map((opt, idx) => {
          const offset = idx - startIndex;
          if (offset >= 0 && offset < uploadedUrls.length && uploadedUrls[offset]) {
            return { ...opt, gambar_url: uploadedUrls[offset] };
          }
          return opt;
        })
      );

      const successCount = uploadedUrls.filter(Boolean).length;
      toast.success(`${successCount} gambar otomatis disebar ke Opsi ${allCodes.slice(startIndex, startIndex + successCount).join(', ')}`);
    } catch {
      toast.error('Gagal mengunggah beberapa gambar opsi');
    } finally {
      setUploadingOpsiIndex(null);
    }
  };

  const handleOpsiTeksChange = (index: number, text: string) => {
    setOpsiJawaban((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, teks: text } : opt))
    );
  };

  /**
   * Smart Paste pada Opsi (Mendukung Multi-Gambar, Screenshot Ctrl+V & Multi-Line List):
   */
  const handleOpsiPaste = async (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const rawText = e.clipboardData?.getData('text/plain') || '';
    const hasFilesOrHtmlImg =
      (e.clipboardData?.files && e.clipboardData.files.length > 0) ||
      /<img\b/i.test(e.clipboardData?.getData('text/html') || '');

    // 1. Jika clipboard berisi gambar (1 atau banyak gambar sekaligus)
    if (hasFilesOrHtmlImg) {
      e.preventDefault();
      const { files: imageFiles, wordLocalMultiImageDetected } = await extractImagesFromClipboard(
        e.clipboardData
      );
      if (wordLocalMultiImageDetected && imageFiles.length <= 1) {
        toast.error(
          'MS Word Desktop menggabungkan multi-gambar di clipboard. Silakan Drag & Drop 5 file gambar atau klik ikon Gambar di Opsi A untuk pilih 5 gambar sekaligus.',
          { duration: 5000 }
        );
        return;
      }
      if (imageFiles.length > 0) {
        await handleUploadMultiOpsi(index, imageFiles);
        return;
      }
    }

    // 2. Cek apakah yang di-paste adalah teks multi-baris
    if (!rawText) return;

    // Pecah per baris, buang baris kosong (misal spasi antar paragraf dari MS Word)
    let lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Jika hanya 1 baris tapi memiliki pola "A. ... B. ... C. ..." dalam 1 baris
    if (lines.length === 1 && /\b[A-Ea-e][.)]\s+.+\s+[B-Eb-e][.)]\s+/.test(lines[0])) {
      lines = lines[0]
        .split(/(?=\b[A-Ea-e][.)]\s+)/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (lines.length <= 1) return;

    // Bersihkan prefix huruf/bullet di awal baris jika ada (contoh: "A. ", "a) ", "(A) ", "• ", "- ")
    const cleanedLines = lines.map((line) =>
      line
        .replace(/^(?:[A-Ea-e][.)\]:-]\s+|\([A-Ea-e1-5]\)\s+|[1-5][.)\]:-]\s+|[•●▪◦*-]\s+)/, '')
        .trim()
    );

    e.preventDefault();

    const allCodes: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    setOpsiJawaban((prev) => {
      const neededCount = Math.min(5, Math.max(prev.length, index + cleanedLines.length));
      const nextList: OpsiJawaban[] = [];

      for (let i = 0; i < neededCount; i++) {
        const existing = prev[i] || { kode: allCodes[i], teks: '', gambar_url: null };
        const lineOffset = i - index;
        if (lineOffset >= 0 && lineOffset < cleanedLines.length) {
          nextList.push({
            ...existing,
            kode: allCodes[i],
            teks: cleanedLines[lineOffset],
          });
        } else {
          nextList.push({
            ...existing,
            kode: allCodes[i],
          });
        }
      }

      return nextList;
    });

    const pastedCount = Math.min(cleanedLines.length, 5 - index);
    toast.success(`${pastedCount} opsi jawaban otomatis terisi per baris`);
  };

  /**
   * Smart Paste pada kotak Pertanyaan (Mendukung Paste Gambar Screenshot Ctrl+V & Paket Soal + Opsi):
   */
  const handleQuestionPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 1. Cek apakah yang di-paste adalah gambar (Screenshot / Copy Image)
    const hasFiles = e.clipboardData?.files && e.clipboardData.files.length > 0;
    if (hasFiles) {
      const firstImg = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
      if (firstImg) {
        e.preventDefault();
        await uploadStimulusFile(firstImg);
        return;
      }
    }

    // 2. Cek apakah yang di-paste adalah teks Pertanyaan + Opsi A-E
    const rawText = e.clipboardData?.getData('text/plain') || '';
    if (!rawText) return;

    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 3) return;

    const firstOptionLineIdx = lines.findIndex((l) => /^(?:[Aa][.)\]:-]\s+|\([Aa]\)\s+)/.test(l));
    if (firstOptionLineIdx <= 0) return;

    const optionLines = lines.slice(firstOptionLineIdx);
    const looksLikeOptionList =
      optionLines.length >= 2 &&
      optionLines.every((l) => /^(?:[A-Ea-e][.)\]:-]\s+|\([A-Ea-e]\)\s+)/.test(l));

    if (!looksLikeOptionList) return;

    e.preventDefault();

    const questionPart = lines.slice(0, firstOptionLineIdx).join('\n');
    const cleanedOptions = optionLines
      .slice(0, 5)
      .map((l) => l.replace(/^(?:[A-Ea-e][.)\]:-]\s+|\([A-Ea-e]\)\s+)/, '').trim());

    setKontenPertanyaan((prev) => (prev ? `${prev}\n${questionPart}` : questionPart));

    const allCodes: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    setOpsiJawaban((prev) => {
      const neededCount = Math.min(5, Math.max(prev.length, cleanedOptions.length));
      const nextList: OpsiJawaban[] = [];
      for (let i = 0; i < neededCount; i++) {
        const existing = prev[i] || { kode: allCodes[i], teks: '', gambar_url: null };
        nextList.push({
          ...existing,
          kode: allCodes[i],
          teks: i < cleanedOptions.length ? cleanedOptions[i] : existing.teks,
        });
      }
      return nextList;
    });

    toast.success(`Pertanyaan & ${cleanedOptions.length} opsi jawaban terisi otomatis`);
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

  const handleSave = async (mode: 'stay' | 'add-next' | 'duplicate') => {
    const trimmedQuestion = kontenPertanyaan.trim();
    if (!trimmedQuestion && !gambarStimulusUrl) {
      toast.error('Isi teks pertanyaan atau sisipkan gambar soal terlebih dahulu');
      return;
    }

    const validation = soalSchema.safeParse({
      nomor_urut: Number(nomorUrut),
      konten_pertanyaan: trimmedQuestion,
      bobot: Number(bobot),
      kunci_jawaban: kunciJawaban,
    });

    if (!validation.success) {
      toast.error(
        (validation.error.issues || []).map((err) => err.message).join(', ') || 'Data soal belum lengkap'
      );
      return;
    }

    const emptyOptions = (opsiJawaban || []).filter(
      (opt) => !(opt?.teks || '').trim() && !opt?.gambar_url
    );
    if (emptyOptions.length > 0) {
      toast.error(
        `Opsi ${emptyOptions.map((o) => o.kode).join(', ')} belum diisi teks atau gambar`
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        nomor_urut: mode === 'duplicate' ? Number(nomorUrut) + 1 : Number(nomorUrut),
        jenis_soal: 'PG' as const,
        konten_pertanyaan: trimmedQuestion || 'Perhatikan gambar berikut:',
        gambar_stimulus_url: gambarStimulusUrl,
        bobot: Number(bobot),
        opsi_jawaban_json: opsiJawaban,
        kunci_jawaban: kunciJawaban,
        pembahasan: pembahasan.trim() || null,
      };

      if (soal && mode !== 'duplicate') {
        await axiosInstance.put(`/cbt/soal/${soal.id}`, payload);
        toast.success(`Soal #${nomorUrut} disimpan`);
      } else {
        await axiosInstance.post(`/cbt/bank-soal/${bankSoalId}/soal`, payload);
        toast.success(
          mode === 'duplicate'
            ? `Soal berhasil diduplikasi ke #${payload.nomor_urut}`
            : `Soal #${payload.nomor_urut} ditambahkan`
        );
      }

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

      if (mode === 'add-next' && !soal) {
        // Reset form untuk soal berikutnya langsung di tempat
        setNomorUrut((prev) => prev + 1);
        setKontenPertanyaan('');
        setGambarStimulusUrl(null);
        setPembahasan('');
        setShowPembahasanBox(false);
        setKunciJawaban('A');
        setOpsiJawaban(DEFAULT_OPTIONS.map((o) => ({ ...o })));
        setTimeout(() => {
          cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          questionInputRef.current?.focus();
        }, 60);
      }

      onSaved(mode === 'add-next' ? 'add-next' : 'stay');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan butir soal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={cardRef}
      className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-md border border-purple-300 dark:border-purple-800 border-l-[6px] border-l-[#673ab7] p-4 sm:p-5 space-y-4 transition-all"
    >
      {/* ── 1. HEADER BAR: Nomor Soal & Kunci Aktif ── */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#673ab7] text-white flex items-center justify-center font-black text-xs font-mono shrink-0">
            {nomorUrut}
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
            {soal ? `Edit Soal #${nomorUrut}` : `Soal Baru #${nomorUrut}`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold whitespace-nowrap shrink-0">
            <CheckCircle2 size={12} />
            <span>Kunci: {kunciJawaban}</span>
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Tutup mode edit"
              aria-label="Tutup mode edit soal"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. PERTANYAAN + TOMBOL GAMBAR STIMULUS (SUPPORT PASTE & DRAG-DROP GAMBAR) ── */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragTarget !== 'question') setDragTarget('question');
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragTarget === 'question') setDragTarget(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragTarget(null);
          const file = e.dataTransfer?.files?.[0];
          if (file) uploadStimulusFile(file);
        }}
        className={cn(
          'space-y-2 rounded-xl transition-all',
          dragTarget === 'question' &&
            'ring-2 ring-[#673ab7] bg-purple-50/50 dark:bg-purple-950/30 p-2'
        )}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <textarea
              ref={questionInputRef}
              id={`soal-konten-${nomorUrut}`}
              rows={2}
              value={kontenPertanyaan}
              onChange={(e) => setKontenPertanyaan(e.target.value)}
              onPaste={handleQuestionPaste}
              placeholder="Ketik pertanyaan di sini... (Bisa Ctrl+V atau Drag & Drop gambar soal)"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl bg-slate-50/90 hover:bg-slate-100/70 focus:bg-white dark:bg-slate-800/60 dark:focus:bg-slate-900 text-slate-900 dark:text-white border-b-2 border-b-slate-200 dark:border-b-slate-700 focus:border-b-[#673ab7] focus:outline-none transition-all resize-y min-h-[60px]"
              aria-label="Pertanyaan Soal"
            />
          </div>

          <button
            type="button"
            onClick={() => fileInputStimulusRef.current?.click()}
            className={cn(
              'p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0',
              gambarStimulusUrl
                ? 'bg-purple-50 text-[#673ab7] border-purple-300 dark:bg-purple-950/60 dark:border-purple-800'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#673ab7] hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
            title="Sisipkan gambar soal"
            aria-label="Sisipkan gambar pertanyaan"
          >
            <ImageIcon size={17} />
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
        </div>

        {uploadingStimulus ? (
          <div className="p-2.5 rounded-xl border border-dashed border-purple-300 bg-purple-50/40 flex items-center justify-center gap-2 text-xs font-bold text-[#673ab7]">
            <UploadCloud size={15} className="animate-bounce" />
            <span>Mengunggah gambar...</span>
          </div>
        ) : gambarStimulusUrl ? (
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-start justify-between gap-3">
            <img
              src={gambarStimulusUrl}
              alt="Stimulus soal"
              className="max-h-36 object-contain rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setGambarStimulusUrl(null)}
              className="text-rose-500 hover:text-rose-600 text-xs h-7 px-2 shrink-0"
            >
              <Trash2 size={13} className="mr-1" /> Hapus
            </Button>
          </div>
        ) : null}
      </div>

      {/* ── 3. OPSI PILIHAN GANDA A–E (KLIK HURUF UNTUK KUNCI JAWABAN) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            Pilihan Jawaban (Klik huruf A–E untuk memilih Kunci Jawaban)
          </span>
        </div>

        {opsiJawaban.map((opt, index) => {
          const isKey = kunciJawaban === opt.kode;
          const isDragOverThisOption = dragTarget === index;
          return (
            <div
              key={opt.kode}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragTarget !== index) setDragTarget(index);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragTarget === index) setDragTarget(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragTarget(null);
                const droppedFiles = Array.from(e.dataTransfer?.files || []);
                if (droppedFiles.length > 0) {
                  handleUploadMultiOpsi(index, droppedFiles);
                }
              }}
              className={cn(
                'rounded-xl px-2.5 py-1.5 transition-all flex flex-col gap-1.5',
                isDragOverThisOption
                  ? 'ring-2 ring-[#673ab7] bg-purple-50/60 dark:bg-purple-950/30 border border-purple-400'
                  : isKey
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-300/80 dark:border-emerald-800/80'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'
              )}
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setKunciJawaban(opt.kode)}
                  className={cn(
                    'w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 cursor-pointer transition-all border shadow-2xs',
                    getOptionBadgeColor(opt.kode, isKey)
                  )}
                  title={`Jadikan Opsi ${opt.kode} sebagai Kunci Jawaban`}
                  aria-label={`Jadikan Opsi ${opt.kode} sebagai Kunci Jawaban`}
                >
                  {isKey ? <Check size={13} className="stroke-[2.5]" /> : opt.kode}
                </button>

                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={opt.teks}
                    onChange={(e) => handleOpsiTeksChange(index, e.target.value)}
                    onPaste={(e) => handleOpsiPaste(index, e)}
                    placeholder={`Teks opsi ${opt.kode}... (Bisa paste daftar opsi / Ctrl+V gambar)`}
                    className={cn(
                      'w-full py-1 px-1.5 text-xs sm:text-sm font-medium bg-transparent border-b border-b-slate-200 dark:border-b-slate-700 focus:border-b-[#673ab7] focus:outline-none transition-colors',
                      isKey && 'font-bold text-emerald-950 dark:text-emerald-200'
                    )}
                    aria-label={`Teks Pilihan Jawaban ${opt.kode}`}
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <label
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#673ab7] hover:bg-purple-50 dark:hover:bg-purple-950/60 cursor-pointer transition-colors"
                    title={`Sisipkan 1 atau beberapa gambar sekaligus mulai dari Opsi ${opt.kode}`}
                    aria-label={`Sisipkan gambar untuk Opsi ${opt.kode}`}
                  >
                    <ImageIcon size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        if (selectedFiles.length > 0) {
                          handleUploadMultiOpsi(index, selectedFiles);
                        }
                        e.target.value = '';
                      }}
                      disabled={uploadingOpsiIndex !== null}
                      className="hidden"
                      aria-label={`Unggah Gambar Opsi ${opt.kode}`}
                    />
                  </label>

                  {opsiJawaban.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus opsi"
                      aria-label={`Hapus Opsi ${opt.kode}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {uploadingOpsiIndex === index ? (
                <div className="ml-8 flex items-center gap-1.5 text-[11px] font-bold text-[#673ab7]">
                  <UploadCloud size={13} className="animate-bounce" />
                  <span>Mengunggah gambar opsi {opt.kode}...</span>
                </div>
              ) : opt.gambar_url ? (
                <div className="ml-8 flex items-center gap-2">
                  <img
                    src={opt.gambar_url}
                    alt={`Opsi ${opt.kode}`}
                    className="h-12 w-auto object-contain rounded border border-slate-200 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOpsiGambar(index)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={11} /> Hapus
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}

        {opsiJawaban.length < 5 && (
          <div className="flex items-center gap-2 pt-1 pl-2">
            <Circle size={15} className="text-slate-300 dark:text-slate-600" />
            <button
              type="button"
              onClick={handleAddOption}
              className="text-xs font-bold text-slate-500 hover:text-[#673ab7] transition-colors flex items-center gap-1 cursor-pointer py-0.5"
            >
              <Plus size={13} />
              <span>Tambahkan opsi</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 4. PEMBAHASAN (OPSIONAL) ── */}
      {showPembahasanBox && (
        <div className="pt-1">
          <textarea
            id={`soal-pembahasan-${nomorUrut}`}
            rows={2}
            value={pembahasan}
            onChange={(e) => setPembahasan(e.target.value)}
            placeholder="Tuliskan pembahasan / alasan kunci jawaban..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#673ab7]"
            aria-label="Catatan Pembahasan Soal"
          />
        </div>
      )}

      {/* ── 5. GOOGLE FORMS INLINE FOOTER TOOLBAR ── */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPembahasanBox((prev) => !prev)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
              showPembahasanBox
                ? 'bg-purple-50 text-[#673ab7] border-purple-200 dark:bg-purple-950/60 dark:border-purple-800'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            )}
          >
            <MessageSquare size={13} />
            <span>Pembahasan</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <input
              type="number"
              step="0.5"
              min={0.5}
              value={bobot}
              onChange={(e) => setBobot(Number(e.target.value))}
              className="w-12 px-1.5 py-1 text-center font-mono font-black text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-[#673ab7]"
              aria-label="Bobot Nilai"
            />
            <span className="text-[11px] text-slate-500">Poin</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {soal && (
            <button
              type="button"
              onClick={() => handleSave('duplicate')}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#673ab7] hover:bg-purple-50 transition-colors cursor-pointer"
              title="Duplikat Soal Ini"
              aria-label="Duplikat Soal"
            >
              <Copy size={15} />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Hapus Soal Ini"
              aria-label="Hapus Soal"
            >
              <Trash2 size={15} />
            </button>
          )}

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
              className="text-xs h-8 px-3"
            >
              Batal
            </Button>
          )}

          <Button
            type="button"
            variant={soal ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleSave('stay')}
            disabled={isSubmitting}
            className={cn(
              'text-xs h-8 px-3 font-bold flex items-center gap-1',
              soal && 'bg-[#673ab7] hover:bg-[#5e35b1] text-white'
            )}
          >
            <Save size={13} />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</span>
          </Button>

          {!soal && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleSave('add-next')}
              disabled={isSubmitting}
              className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold text-xs h-8 px-3.5 flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Simpan & Lanjut Soal #{nomorUrut + 1}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
