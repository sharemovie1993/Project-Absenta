/**
 * dapodikClassUtils.ts
 * Standar Normalisasi Kesetaraan Rombel Dapodik vs Platform Absenta (Rombel Halal / Equivalent).
 * 
 * Mengatasi variasi penulisan antara Dapodik dan Platform Absenta:
 * - KULINER = KUL (KULINER 1/2 -> KUL 1/2)
 * - TP 1..3 = TM 1..3 (Teknik Pemesinan di Dapodik setara Teknik Mesin di Absenta)
 * - TKJ 1..3 = TJKT 1..3 (Teknik Komputer Jaringan setara TJKT Kurikulum Merdeka)
 * - Format spasi & angka (e.g. "XAKL1" <-> "X AKL 1")
 */

export function normalizeClassEquivalent(className?: string | null): string {
  if (!className) return '';

  let s = String(className).toUpperCase().trim();

  // 1. Hilangkan prefix "KELAS " atau "TINGKAT " jika ada
  s = s.replace(/^(?:KELAS|TINGKAT)\s+/i, '');

  // 2. Normalisasi angka tingkat ke romawi di awal: 10 -> X, 11 -> XI, 12 -> XII, 13 -> XIII
  s = s.replace(/^10\b|^10(?=[A-Z\s\-_])/, 'X');
  s = s.replace(/^11\b|^11(?=[A-Z\s\-_])/, 'XI');
  s = s.replace(/^12\b|^12(?=[A-Z\s\-_])/, 'XII');
  s = s.replace(/^13\b|^13(?=[A-Z\s\-_])/, 'XIII');

  // 3. Bersihkan tanda hubung / titik / spasi ganda
  s = s.replace(/[\-_.]+/g, ' ').replace(/\s+/g, ' ').trim();

  // 4. Substitusi Alias Jurusan / Rombel Resmi:
  // KULINER -> KUL
  s = s.replace(/\bKULINER\b/g, 'KUL');
  s = s.replace(/KULINER(\d+)/g, 'KUL $1');

  // TKJ -> TJKT
  s = s.replace(/\bTKJ\b/g, 'TJKT');
  s = s.replace(/TKJ(\d+)/g, 'TJKT $1');

  // TP -> TM
  s = s.replace(/\bTP\b/g, 'TM');
  s = s.replace(/TP(\d+)/g, 'TM $1');

  // 5. Normalisasi spasi dan digit (misal: "XTM1" -> "X TM 1")
  s = s.replace(/([A-Z])(\d+)/g, '$1 $2');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

export function isClassEquivalent(classA?: string | null, classB?: string | null): boolean {
  if (!classA && !classB) return true;
  if (!classA || !classB) return false;

  const rawA = String(classA).trim().toUpperCase();
  const rawB = String(classB).trim().toUpperCase();

  // 1. Exact match langsung (dengan atau tanpa spasi)
  if (rawA === rawB) return true;
  if (rawA.replace(/\s+/g, '') === rawB.replace(/\s+/g, '')) return true;

  // 2. Bandingkan setelah substitusi alias halal
  const normA = normalizeClassEquivalent(rawA);
  const normB = normalizeClassEquivalent(rawB);

  if (normA === normB) return true;
  if (normA.replace(/\s+/g, '') === normB.replace(/\s+/g, '')) return true;

  // 3. Toleransi fleksibel jika salah satu pihak tidak mencantumkan tingkat "X/XI/XII" di awal
  const stripGradeA = normA.replace(/^(?:XIII|XII|XI|X)\s*/, '').replace(/\s+/g, '');
  const stripGradeB = normB.replace(/^(?:XIII|XII|XI|X)\s*/, '').replace(/\s+/g, '');
  if (stripGradeA && stripGradeB && stripGradeA === stripGradeB) {
    return true;
  }

  return false;
}
