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

const QUESTION_START_REGEX = /^(?:soal\s*(?:no\.?)?\s*\d+\s*[:.-]?|\d{1,3}[.)]\s+)/i;
const OPTION_PREFIX_REGEX = /^(?:[A-Ea-e][.)\]:-]\s+|\([A-Ea-e]\)\s+|\[[A-Ea-e]\]\s+)/;
const GOOGLE_FORM_OVAL_MARKER_REGEX = /^(?:tandai\s+satu\s+oval\s+saja\.?|mark\s+only\s+one\s+oval\.?)$/i;
const GOOGLE_FORM_POINTS_LINE_REGEX = /^(?:\d{1,3}[.)]?\s*)?\d+\s*(?:poin|points?)\s*$/i;
const GOOGLE_FORM_STANDALONE_NUM_REGEX = /^\d{1,3}[.)]\s*$/;
const GOOGLE_FORM_NOISE_REGEX =
  /^(?:konten ini tidak dibuat atau didukung oleh google\.?|this content is neither created nor endorsed by google\.?|google\s+formulir|google\s+forms|\*\s*menunjukkan pertanyaan yang wajib diisi|\*\s*indicates required question|halaman\s+\d+\s+dari\s+\d+|page\s+\d+\s+of\s+\d+|https?:\/\/docs\.google\.com\/forms\/.*|\*)$/i;

function cleanGoogleFormQuestionText(text: string): string {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !GOOGLE_FORM_POINTS_LINE_REGEX.test(l) &&
        !GOOGLE_FORM_STANDALONE_NUM_REGEX.test(l) &&
        !GOOGLE_FORM_NOISE_REGEX.test(l)
    )
    .join('\n')
    .replace(QUESTION_START_REGEX, '')
    .replace(/\s*\*+\s*$/gm, '')
    .replace(/\s*\(\d+\s*(?:poin|points?)\)\s*$/i, '')
    .replace(/\s+\d+\s*(?:poin|points?)\s*$/i, '')
    .trim();
}

/**
 * Parse satu blok teks soal (mendukung format standar A-E maupun format Google Form "Tandai satu oval saja.")
 */
export function parsePuzzleBlockText(blockText: string): {
  isFullQuestion: boolean;
  question: string;
  options: OpsiJawaban[];
  kunciJawaban?: OptionCode;
  pembahasan?: string;
} | null {
  const lines = (blockText || '').split(/\r?\n/).map((l) => l.trim());
  const ovalIdx = lines.findIndex((l) => GOOGLE_FORM_OVAL_MARKER_REGEX.test(l));

  if (ovalIdx > 0) {
    const qLines = lines
      .slice(0, ovalIdx)
      .filter((l) => l.length > 0 && !GOOGLE_FORM_NOISE_REGEX.test(l));
    const optLines = lines
      .slice(ovalIdx + 1)
      .filter((l) => l.length > 0 && !GOOGLE_FORM_NOISE_REGEX.test(l));

    let detectedKey: OptionCode | undefined;
    let pembahasan: string | undefined;
    const cleanedOpts: string[] = [];

    for (const line of optLines) {
      const keyMatch = line.match(
        /^(?:kunci|kunci\s*jawaban|jawaban|answer|ans|key)\s*[:=-]\s*\(?([A-Ea-e])\)?/i
      );
      if (keyMatch) {
        detectedKey = keyMatch[1].toUpperCase() as OptionCode;
        continue;
      }
      const pembMatch = line.match(/^(?:pembahasan|penjelasan|explanation)\s*[:=-]\s*(.+)/i);
      if (pembMatch) {
        pembahasan = pembMatch[1].trim();
        continue;
      }
      if (cleanedOpts.length < 5) {
        const cleanOpt = line
          .replace(/^(?:[A-Ea-e][.)\]:-]\s+|\([A-Ea-e]\)\s+|\[[A-Ea-e]\]\s+)/, '')
          .trim();
        if (cleanOpt) cleanedOpts.push(cleanOpt);
      }
    }

    if (qLines.length > 0 && cleanedOpts.length >= 2) {
      return {
        isFullQuestion: true,
        question: cleanGoogleFormQuestionText(qLines.join('\n')),
        options: normalizePuzzleOptions(
          cleanedOpts.map((teks, i) => ({ kode: PUZZLE_OPTION_CODES[i], teks }))
        ),
        kunciJawaban: detectedKey,
        pembahasan,
      };
    }
  }

  const parsed = parseFullQuestionText(blockText);
  if (!parsed?.isFullQuestion) return null;
  return {
    isFullQuestion: true,
    question: parsed.question,
    options: normalizePuzzleOptions(parsed.options),
    kunciJawaban: parsed.kunciJawaban,
    pembahasan: parsed.pembahasan,
  };
}

/**
 * Segmentasi dokumen hasil Print-to-PDF Google Form menggunakan jangkar "Tandai satu oval saja."
 */
function segmentGoogleFormPdfToBlocks(bodyText: string): string[] {
  const lines = bodyText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !GOOGLE_FORM_NOISE_REGEX.test(l));

  const ovalIndices: number[] = [];
  lines.forEach((l, idx) => {
    if (GOOGLE_FORM_OVAL_MARKER_REGEX.test(l)) {
      ovalIndices.push(idx);
    }
  });

  if (ovalIndices.length === 0) return [];

  const blocks: string[] = [];
  let cursor = 0;

  for (let i = 0; i < ovalIndices.length; i++) {
    const ovalIdx = ovalIndices[i];
    const nextOvalIdx = i + 1 < ovalIndices.length ? ovalIndices[i + 1] : lines.length;

    // Baris pertanyaan = baris non-kosong antara cursor dan ovalIdx
    const qLines = lines.slice(cursor, ovalIdx).filter(Boolean);

    // Cari batas akhir opsi di antara ovalIdx+1 .. nextOvalIdx
    const betweenLines = lines.slice(ovalIdx + 1, nextOvalIdx);
    let splitOffset = betweenLines.length;

    if (i + 1 < ovalIndices.length) {
      // 1. Jika opsi memakai awalan a./b./c./d./e., ambil berurutan sampai baris non-opsi muncul
      const firstNonEmpty = betweenLines.find((l) => l.length > 0) || '';
      if (OPTION_PREFIX_REGEX.test(firstNonEmpty)) {
        let lastOptIdx = -1;
        for (let k = 0; k < betweenLines.length; k++) {
          const l = betweenLines[k];
          if (!l) continue;
          if (OPTION_PREFIX_REGEX.test(l)) {
            lastOptIdx = k;
          } else {
            break;
          }
        }
        if (lastOptIdx >= 0) {
          splitOffset = lastOptIdx + 1;
        }
      } else {
        // 2. Tanpa awalan a.-e.: cek baris nomor soal ("2. "), baris "4 poin", atau baris wajib "*"
        const nextQuestionBoundary = betweenLines.findIndex(
          (l) =>
            QUESTION_START_REGEX.test(l) ||
            GOOGLE_FORM_POINTS_LINE_REGEX.test(l) ||
            GOOGLE_FORM_STANDALONE_NUM_REGEX.test(l) ||
            /\*$/.test(l)
        );
        if (nextQuestionBoundary >= 2) {
          splitOffset = nextQuestionBoundary;
        } else {
          // Fallback: sisakan minimal 1 baris non-kosong terakhir sebagai pertanyaan berikutnya
          const nonEmptyPositions: number[] = [];
          betweenLines.forEach((l, idx) => {
            if (l.length > 0) nonEmptyPositions.push(idx);
          });
          if (nonEmptyPositions.length >= 3) {
            const lastOptPos =
              nonEmptyPositions.length > 5
                ? nonEmptyPositions[4]
                : nonEmptyPositions[nonEmptyPositions.length - 2];
            splitOffset = lastOptPos + 1;
          }
        }
      }
    } else {
      // Soal terakhir: ambil maksimal 5 baris opsi non-kosong + kunci/pembahasan jika ada
      const nonEmptyOptLines = betweenLines.filter(Boolean).slice(0, 7);
      const blockLines = [...qLines, lines[ovalIdx], ...nonEmptyOptLines];
      if (blockLines.length > 0) blocks.push(blockLines.join('\n').trim());
      break;
    }

    const optLines = betweenLines.slice(0, splitOffset).filter(Boolean).slice(0, 6);
    const blockLines = [...qLines, lines[ovalIdx], ...optLines];
    if (blockLines.length > 0) {
      blocks.push(blockLines.join('\n').trim());
    }
    cursor = ovalIdx + 1 + splitOffset;
  }

  return blocks;
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

  // Deteksi khusus PDF hasil Print Google Form ("Tandai satu oval saja." / "Mark only one oval.")
  const hasGoogleFormOvalMarker = bodyText
    .split('\n')
    .some((l) => GOOGLE_FORM_OVAL_MARKER_REGEX.test(l.trim()));

  let finalBlocks: string[] = [];

  if (hasGoogleFormOvalMarker) {
    finalBlocks = segmentGoogleFormPdfToBlocks(bodyText);
  } else {
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
    const blocks: string[] = [];
    let currentLines: string[] = [];

    for (const line of rawLines) {
      if (QUESTION_START_REGEX.test(line)) {
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
    finalBlocks =
      blocks.length <= 1 && bodyText.includes('\n\n')
        ? bodyText
            .split(/\n{2,}/)
            .map((b) => b.trim())
            .filter(Boolean)
        : blocks;
  }

  const rawBlocks: RawScanBlock[] = finalBlocks.map((text, idx) => ({
    id: `raw-blk-${Date.now()}-${idx}`,
    index: idx + 1,
    text,
  }));

  let detectedKeysCount = 0;
  const cards: PuzzleQuestionDraft[] = finalBlocks.map((blockText, idx) => {
    const parsed = parsePuzzleBlockText(blockText);
    const numMatch = blockText.match(/^(?:soal\s*(?:no\.?)?\s*|no\.?\s*)?(\d{1,3})[.):]/i);
    const detectedNumber = numMatch ? parseInt(numMatch[1], 10) : idx + 1;
    const trailingKey = trailingKeys.get(detectedNumber) || trailingKeys.get(idx + 1);

    const kunci: OptionCode = parsed?.kunciJawaban || trailingKey || 'A';
    if (parsed?.kunciJawaban || trailingKey) {
      detectedKeysCount++;
    }

    const questionClean = parsed?.isFullQuestion
      ? parsed.question
      : cleanGoogleFormQuestionText(blockText);

    return {
      tempId: `puzzle-${Date.now()}-${idx}`,
      selected: true,
      nomor_urut: startingNomor + idx,
      konten_pertanyaan: questionClean,
      gambar_stimulus_url: null,
      bobot: 1.0,
      opsi_jawaban_json: parsed?.isFullQuestion
        ? parsed.options
        : createEmptyPuzzleOptions(),
      kunci_jawaban: kunci,
      pembahasan: parsed?.pembahasan || '',
      raw_source_block: blockText,
    };
  });

  return { cards, rawBlocks, detectedKeysCount };
}
