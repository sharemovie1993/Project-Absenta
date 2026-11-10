/**
 * 🎯 CBT Text & Image Drag-and-Drop / Smart Paste Helper
 * Memungkinkan guru menarik (drag and drop) atau menempel (paste) teks soal dari:
 * - Browser (Google Chrome, Edge, Firefox, ChatGPT, Google Docs, Portal Belajar)
 * - Aplikasi Desktop (Microsoft Word, Notepad, WPS Office, PDF Viewer, Telegram, WhatsApp)
 * - File lokal (.txt, .md, screenshot, gambar soal)
 */

export interface ParsedQuestionResult {
  isFullQuestion: boolean;
  question: string;
  options: { kode: 'A' | 'B' | 'C' | 'D' | 'E'; teks: string }[];
  kunciJawaban?: 'A' | 'B' | 'C' | 'D' | 'E';
  pembahasan?: string;
}

const OPTION_CODES: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

/**
 * Deteksi dan ekstraksi otomatis teks soal lengkap (Pertanyaan + Opsi A-E + Kunci + Pembahasan)
 */
export function parseFullQuestionText(rawText: string): ParsedQuestionResult | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleanInput = rawText.trim();
  if (!cleanInput) return null;

  // Normalisasi line breaks
  const rawLines = cleanInput.split(/\r?\n/).map((l) => l.trim());

  // 1. Ekstrak Kunci Jawaban & Pembahasan jika ada di bagian bawah
  let detectedKey: ('A' | 'B' | 'C' | 'D' | 'E') | undefined = undefined;
  let pembahasan: string | undefined = undefined;
  const contentLines: string[] = [];

  for (const line of rawLines) {
    if (!line) continue;

    // Pola kunci jawaban: "Kunci: A", "Kunci Jawaban: B", "Jawaban: C", "Answer: D", "Key: E"
    const keyMatch = line.match(
      /^(?:kunci|kunci\s*jawaban|jawaban|answer|ans|key)\s*[:=-]\s*\(?([A-Ea-e])\)?/i
    );
    if (keyMatch) {
      const code = keyMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
      if (OPTION_CODES.includes(code)) {
        detectedKey = code;
        continue;
      }
    }

    // Pola pembahasan: "Pembahasan: ...", "Penjelasan: ...", "Explanation: ..."
    const pembMatch = line.match(/^(?:pembahasan|penjelasan|explanation)\s*[:=-]\s*(.+)/i);
    if (pembMatch) {
      pembahasan = pembMatch[1].trim();
      continue;
    }

    contentLines.push(line);
  }

  if (contentLines.length === 0) return null;

  // 2. Deteksi Opsi Jawaban (Multi-baris atau format inline)
  // Pola regex opsi: "A. ", "A) ", "(A) ", "[A] ", "*A. ", "A - "
  const optionPrefixRegex = /^(?:\*?\s*)(?:[A-Ea-e][.)\]:-]\s+|\([A-Ea-e]\)\s+|\[[A-Ea-e]\]\s+)/;

  const firstOptionIdx = contentLines.findIndex((l) => optionPrefixRegex.test(l));

  if (firstOptionIdx > 0) {
    // Bagian pertanyaan adalah baris-baris sebelum opsi pertama
    let questionPart = contentLines.slice(0, firstOptionIdx).join('\n');

    // Bersihkan nomor soal di awal jika ada (contoh: "1. ", "1) ", "Soal 1. ", "No. 1: ")
    questionPart = questionPart
      .replace(/^(?:soal\s*(?:no\.?)?\s*\d+[:.-]?|\d+[.)\]:-]\s+)/i, '')
      .trim();

    const optionLines = contentLines.slice(firstOptionIdx);
    const options: { kode: 'A' | 'B' | 'C' | 'D' | 'E'; teks: string }[] = [];

    for (let i = 0; i < optionLines.length && i < 5; i++) {
      const line = optionLines[i];
      const code = OPTION_CODES[i];

      // Format Moodle / Aiken: tanda bintang (*) menandai kunci jawaban
      if (line.startsWith('*') || line.endsWith('*')) {
        detectedKey = code;
      }

      const cleanOptText = line
        .replace(/^\*\s*/, '')
        .replace(/\s*\*$/, '')
        .replace(/^(?:[A-Ea-e][.)\]:-]\s+|\([A-Ea-e]\)\s+|\[[A-Ea-e]\]\s+)/, '')
        .trim();

      options.push({ kode: code, teks: cleanOptText });
    }

    if (options.length >= 2) {
      return {
        isFullQuestion: true,
        question: questionPart,
        options,
        kunciJawaban: detectedKey,
        pembahasan,
      };
    }
  }

  // Cek jika seluruh opsi ada dalam 1 baris inline: "A. Apel  B. Jeruk  C. Mangga ..."
  const inlineOptionMatch = cleanInput.match(/\b([A-Ea-e])[.)\]:-]\s+([^A-Ea-e[\]()]+)/g);
  if (inlineOptionMatch && inlineOptionMatch.length >= 2) {
    const firstMatch = cleanInput.search(/\b[Aa][.)\]:-]\s+/);
    if (firstMatch > 0) {
      const questionPart = cleanInput.slice(0, firstMatch).trim().replace(/^(?:soal\s*(?:no\.?)?\s*\d+[:.-]?|\d+[.)\]:-]\s+)/i, '');
      const options: { kode: 'A' | 'B' | 'C' | 'D' | 'E'; teks: string }[] = [];

      inlineOptionMatch.slice(0, 5).forEach((item, idx) => {
        const code = OPTION_CODES[idx];
        const text = item.replace(/^[A-Ea-e][.)\]:-]\s+/, '').trim();
        options.push({ kode: code, teks: text });
      });

      return {
        isFullQuestion: true,
        question: questionPart,
        options,
        kunciJawaban: detectedKey,
        pembahasan,
      };
    }
  }

  // Bukan soal lengkap dengan opsi, kembalikan sebagai teks pertanyaan biasa
  return {
    isFullQuestion: false,
    question: cleanInput.replace(/^(?:soal\s*(?:no\.?)?\s*\d+[:.-]?|\d+[.)\]:-]\s+)/i, '').trim(),
    options: [],
    kunciJawaban: detectedKey,
    pembahasan,
  };
}

/**
 * Ekstraksi teks yang di-drop ke salah satu baris opsi jawaban (Opsi A, B, C, D, atau E)
 * Mendukung teks single-line maupun multi-line opsi yang didistribusikan ke bawah.
 */
export function parseOptionDroppedText(
  rawText: string,
  startOptionIndex: number
): { isMulti: boolean; items: { index: number; kode: 'A' | 'B' | 'C' | 'D' | 'E'; text: string }[] } {
  if (!rawText) return { isMulti: false, items: [] };

  let lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Jika 1 baris berisi "A. ... B. ... C. ..."
  if (lines.length === 1 && /\b[A-Ea-e][.)]\s+.+\s+[B-Eb-e][.)]\s+/.test(lines[0])) {
    lines = lines[0]
      .split(/(?=\b[A-Ea-e][.)]\s+)/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Jika multi baris
  if (lines.length > 1) {
    const items: { index: number; kode: 'A' | 'B' | 'C' | 'D' | 'E'; text: string }[] = [];
    for (let i = 0; i < lines.length && startOptionIndex + i < 5; i++) {
      const targetIdx = startOptionIndex + i;
      const cleanText = lines[i]
        .replace(/^(?:[A-Ea-e][.)\]:-]\s+|\([A-Ea-e1-5]\)\s+|[1-5][.)\]:-]\s+|[•●▪◦*-]\s+)/, '')
        .trim();
      items.push({
        index: targetIdx,
        kode: OPTION_CODES[targetIdx],
        text: cleanText,
      });
    }
    return { isMulti: true, items };
  }

  // Single line: bersihkan prefix huruf opsi jika ada (misal di-drop "A. Soekarno" ke slot A)
  const singleText = rawText
    .trim()
    .replace(/^(?:[A-Ea-e][.)\]:-]\s+|\([A-Ea-e1-5]\)\s+|[1-5][.)\]:-]\s+|[•●▪◦*-]\s+)/, '')
    .trim();

  return {
    isMulti: false,
    items: [
      {
        index: startOptionIndex,
        kode: OPTION_CODES[startOptionIndex] || 'A',
        text: singleText,
      },
    ],
  };
}

/**
 * Ekstrak data teks dan/atau file dari Event Drag & Drop
 */
export async function extractDragDropPayload(e: React.DragEvent): Promise<{
  text: string;
  imageFile?: File;
  textFile?: File;
}> {
  let text = '';

  // 1. Ambil teks biasa
  if (e.dataTransfer) {
    text = e.dataTransfer.getData('text/plain') || '';
    if (!text) {
      const html = e.dataTransfer.getData('text/html') || '';
      if (html) {
        // Ekstrak teks bersih dari HTML yang di-drag
        const doc = new DOMParser().parseFromString(html, 'text/html');
        text = doc.body.textContent || '';
      }
    }
  }

  // 2. Ambil file jika ada
  let imageFile: File | undefined = undefined;
  let textFile: File | undefined = undefined;

  const files = Array.from(e.dataTransfer?.files || []);
  if (files.length > 0) {
    const img = files.find((f) => f.type.startsWith('image/'));
    if (img) imageFile = img;

    const txt = files.find((f) => f.name.endsWith('.txt') || f.name.endsWith('.md') || f.type.startsWith('text/'));
    if (txt) {
      textFile = txt;
      if (!text) {
        try {
          text = await txt.text();
        } catch {
          // Abaikan jika gagal baca
        }
      }
    }
  }

  return { text: text.trim(), imageFile, textFile };
}
