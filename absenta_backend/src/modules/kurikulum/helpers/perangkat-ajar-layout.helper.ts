/**
 * perangkat-ajar-layout.helper.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Barrel / Router utama untuk semua layout perangkat ajar.
 * File ini hanya bertugas sebagai titik masuk tunggal (single entry point)
 * yang mendelegasikan setiap jenis dokumen ke file layout-nya masing-masing.
 *
 * Struktur layout per jenis:
 *   layouts/layout-shared.ts      → Context interface + buildTtdBlock (shared)
 *   layouts/layout-atp.ts         → ATP (Alur Tujuan Pembelajaran)
 *   layouts/layout-prota.ts       → PROTA (Program Tahunan)
 *   layouts/layout-promes.ts      → PROMES (Program Semester)
 *   layouts/layout-kktp.ts        → KKTP (Kriteria Ketercapaian TP)
 *   layouts/layout-modul-ajar.ts  → Modul Ajar / RPP Plus
 *   layouts/layout-modul-p5.ts    → Modul Projek P5
 *
 * Standar: Permendikbudristek No. 12 Tahun 2024 (Kurikulum Merdeka)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Re-export shared types ───────────────────────────────────────────────────
export type { PerangkatLayoutContext } from './layouts/layout-shared';
export { buildTtdBlock } from './layouts/layout-shared';

// ─── Import per-jenis builders ───────────────────────────────────────────────
import { buildAtpHtml, buildAtpAIPrompt } from './layouts/layout-atp';
import { buildProtaHtml, buildProtaAIPrompt } from './layouts/layout-prota';
import { buildPromesHtml, buildPromesAIPrompt } from './layouts/layout-promes';
import { buildKktpHtml, buildKktpAIPrompt } from './layouts/layout-kktp';
import { buildModulAjarHtml, buildModulAjarAIPrompt } from './layouts/layout-modul-ajar';
import { buildModulP5Html, buildModulP5AIPrompt } from './layouts/layout-modul-p5';

// Import tipe lokal agar barrel bisa mendeklarasikan fungsi
import type { PerangkatLayoutContext } from './layouts/layout-shared';

// ─── Router: AI Prompt ────────────────────────────────────────────────────────
/**
 * Membangun AI prompt sesuai jenis perangkat ajar.
 * Mendelegasikan ke layout builder per jenis.
 */
export function buildAIPromptForJenis(ctx: PerangkatLayoutContext): string {
  const upper = String(ctx.jenis || '').toUpperCase();

  if (upper.includes('ATP')) return buildAtpAIPrompt(ctx);
  if (upper.includes('PROTA')) return buildProtaAIPrompt(ctx);
  if (upper.includes('PROMES')) return buildPromesAIPrompt(ctx);
  if (upper.includes('KKTP')) return buildKktpAIPrompt(ctx);
  if (upper.includes('PROJEK') || upper.includes('P5')) return buildModulP5AIPrompt(ctx);

  // Default: Modul Ajar / RPP Plus
  return buildModulAjarAIPrompt(ctx);
}

// ─── Router: Fallback HTML ────────────────────────────────────────────────────
/**
 * Membangun HTML fallback sesuai jenis perangkat ajar.
 * Digunakan saat AI tidak menghasilkan response yang valid.
 */
export function buildFallbackHtmlForJenis(ctx: PerangkatLayoutContext): string {
  const upper = String(ctx.jenis || '').toUpperCase();

  if (upper.includes('ATP')) return buildAtpHtml(ctx);
  if (upper.includes('PROTA')) return buildProtaHtml(ctx);
  if (upper.includes('PROMES')) return buildPromesHtml(ctx);
  if (upper.includes('KKTP')) return buildKktpHtml(ctx);
  if (upper.includes('PROJEK') || upper.includes('P5')) return buildModulP5Html(ctx);

  // Default: Modul Ajar / RPP Plus
  return buildModulAjarHtml(ctx);
}
