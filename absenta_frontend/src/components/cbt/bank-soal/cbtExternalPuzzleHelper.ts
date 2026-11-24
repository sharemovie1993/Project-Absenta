import type { OpsiJawaban } from '@/types/cbt.types';
import { parseFullQuestionText } from './cbtTextDragDropHelper';

export type OptionCode = 'A' | 'B' | 'C' | 'D' | 'E';
export const PUZZLE_OPTION_CODES: OptionCode[] = ['A', 'B', 'C', 'D', 'E'];

export interface PuzzleQuestionDraft {
  tempId: string;
  selected: boolean;
  nomor_urut: number;
  konten_pertanyaan: string;
  gambar_stimulus_url: string | null;
  bobot: number;
  opsi_jawaban_json: OpsiJawaban[];
  kunci_jawaban: OptionCode;
  pembahasan: string;
  raw_source_block: string;
}

export interface RawScanBlock {
  id: string;
  index: number;
  text: string;
}

export interface PuzzleScanResult {
  cards: PuzzleQuestionDraft[];
  rawBlocks: RawScanBlock[];
  detectedKeysCount: number;
}

export function createEmptyPuzzleOptions(): OpsiJawaban[] {
  return PUZZLE_OPTION_CODES.map((kode) => ({ kode, teks: '', gambar_url: null }));
}

export function normalizePuzzleOptions(opts?: Array<{ kode: string; teks: string; gambar_url?: string | null }>): OpsiJawaban[] {
  const map = new Map<string, OpsiJawaban>();
  (opts || []).forEach((o, idx) => {
    const code = (o.kode || PUZZLE_OPTION_CODES[idx] || 'A').toUpperCase() as OptionCode;
    if (PUZZLE_OPTION_CODES.includes(code)) {
      map.set(code, { kode: code, teks: (o.teks || '').trim(), gambar_url: o.gambar_url || null });
    }
  });
  return PUZZLE_OPTION_CODES.map((kode) => map.get(kode) || { kode, teks: '', gambar_url: null });
}

export function isPuzzleCardReady(card: PuzzleQuestionDraft): boolean {
  if (!card.konten_pertanyaan.trim()) return false;
  const filledOpts = card.opsi_jawaban_json.filter((o) => o.teks.trim().length > 0);
  if (filledOpts.length < 2) return false;
  const keyOpt = card.opsi_jawaban_json.find((o) => o.kode === card.kunci_jawaban);
  return Boolean(keyOpt && keyOpt.teks.trim().length > 0);
}

/**
 * Memecah opsi yang tertulis sejajar dalam 1 baris (misal: "A. Satu   B. Dua   C. Tiga")
 */
function expandInlineOptions(line: string): string[] {
  const inlineMatches = line.match(/(?:^|\s)[A-Ea-e][.)]\s+/g);
  if (inlineMatches && inlineMatches.length >= 2) {
    return line
      .replace(/\s+([A-Ea-e][.)]\s+)/g, '\n$1')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [line];
}

/**
 * Ekstrak kunci jawaban massal dari berbagai format:
 * - "1. A  2. C  3. B" / "1) A, 2) B" / "1: A"
 * - "A, B, C, D, E" atau "A B C D E"
 */
export function parseBulkAnswerKeys(rawKeyText: string): Map<number, OptionCode> {
  const result = new Map<number, OptionCode>();
  if (!rawKeyText || !rawKeyText.trim()) return result;

  // Pola berpasangan nomor + huruf: "1. A", "1) B", "1: C", "1-D", "01. E"
  const numberedRegex = /(?:^|[\s,;|\n])(\d{1,3})\s*[.):\-=]\s*\(?([A-Ea-e])\)?(?=$|[\s,;|\n])/g;
  let match: RegExpExecArray | null;
  while ((match = numberedRegex.exec(rawKeyText)) !== null) {
    const num = parseInt(match[1], 10);
    const code = match[2].toUpperCase() as OptionCode;
    if (num >= 1 && PUZZLE_OPTION_CODES.includes(code)) {
      result.set(num, code);
    }
  }

  if (result.size > 0) return result;

  // Fallback berurutan tanpa nomor: "A, C, B, D, E" atau "A B C D E"
  const tokens = rawKeyText
    .trim()
    .split(/[\s,;|\n]+/)
    .map((t) => t.replace(/[().]/g, '').toUpperCase())
    .filter((t): t is OptionCode => PUZZLE_OPTION_CODES.includes(t as OptionCode));

  tokens.forEach((code, idx) => {
    result.set(idx + 1, code);
  });

  return result;
}

/**
 * Helper Scanner Utama: Memindai teks mentah dari Word / PDF / Teks Bebas
 * menjadi blok-blok puzzle soal siap susun sebelum di-insert ke editor.
 */
export function scanDocumentToPuzzle(rawText: string, startingNomor = 1): PuzzleScanResult {
  const cleanText = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!cleanText) {
    return { cards: [], rawBlocks: [], detectedKeysCount: 0 };
  }

  // Pisahkan bagian lampiran "Kunci Jawaban" di akhir dokumen jika ada
  let bodyText = cleanText;
  let trailingKeys = new Map<number, OptionCode>();
  const keySectionMatch = cleanText.match(
    /\n(?:KUNCI\s+JAWABAN|DAFTAR\s+KUNCI|ANSWER\s+KEY)\s*:?\s*\n([\s\S]+)$/i
  );
  if (keySectionMatch && keySectionMatch.index !== undefined) {
    const parsedTrailing = parseBulkAnswerKeys(keySectionMatch[1]);
    if (parsedTrailing.size >= 2) {
      trailingKeys = parsedTrailing;
      bodyText = cleanText.slice(0, keySectionMatch.index).trim();
    }
  }

  // Ekspansi opsi inline dan normalisasi baris
  const rawLines: string[] = [];
  bodyText.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rawLines.push('');
      return;
    }
    expandInlineOptions(trimmed).forEach((part) => rawLines.push(part));
  });

  // Segmentasi menjadi blok soal berdasarkan nomor soal (misal "1. ", "1) ", "Soal 1")
  const questionStartRegex = /^(?:soal\s*(?:no\.?)?\s*\d+\s*[:.-]?|\d{1,3}[.)]\s+)/i;
  const blocks: string[] = [];
  let currentLines: string[] = [];

  for (const line of rawLines) {
    if (questionStartRegex.test(line)) {
      if (currentLines.some((l) => l.trim().length > 0)) {
        blocks.push(currentLines.join('\n').trim());
      }
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.some((l) => l.trim().length > 0)) {
    blocks.push(currentLines.join('\n').trim());
  }

  // Jika tidak ada nomor soal sama sekali, coba pecah berdasarkan paragraf kosong ganda
  const finalBlocks =
    blocks.length <= 1 && bodyText.includes('\n\n')
      ? bodyText
          .split(/\n{2,}/)
          .map((b) => b.trim())
          .filter(Boolean)
      : blocks;

  const rawBlocks: RawScanBlock[] = finalBlocks.map((text, idx) => ({
    id: `raw-blk-${Date.now()}-${idx}`,
    index: idx + 1,
    text,
  }));

  let detectedKeysCount = 0;
  const cards: PuzzleQuestionDraft[] = finalBlocks.map((blockText, idx) => {
    const parsed = parseFullQuestionText(blockText);
    const numMatch = blockText.match(/^(?:soal\s*(?:no\.?)?\s*|no\.?\s*)?(\d{1,3})[.):]/i);
    const detectedNumber = numMatch ? parseInt(numMatch[1], 10) : idx + 1;
    const trailingKey = trailingKeys.get(detectedNumber) || trailingKeys.get(idx + 1);

    const kunci: OptionCode = parsed?.kunciJawaban || trailingKey || 'A';
    if (parsed?.kunciJawaban || trailingKey) {
      detectedKeysCount++;
    }

    const questionClean = parsed?.isFullQuestion
      ? parsed.question
      : blockText.replace(questionStartRegex, '').trim();

    return {
      tempId: `puzzle-${Date.now()}-${idx}`,
      selected: true,
      nomor_urut: startingNomor + idx,
      konten_pertanyaan: questionClean,
      gambar_stimulus_url: null,
      bobot: 1.0,
      opsi_jawaban_json: parsed?.isFullQuestion
        ? normalizePuzzleOptions(parsed.options)
        : createEmptyPuzzleOptions(),
      kunci_jawaban: kunci,
      pembahasan: parsed?.pembahasan || '',
      raw_source_block: blockText,
    };
  });

  return { cards, rawBlocks, detectedKeysCount };
}
