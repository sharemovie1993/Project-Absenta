/**
 * whatsappSettings.types.ts
 * Shared types, Zod schemas, constants, dan helper untuk modul WhatsApp Settings.
 * Ikuti asas DRY — satu definisi, dipakai di semua subkomponen.
 */

import { z } from 'zod';
import type { WhatsappConfig } from '@/api/whatsapp.api';

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/** Validasi penuh form konfigurasi gateway (tab Koneksi + Template). */
export const WhatsappConfigSchema = z.object({
  provider_name: z
    .string()
    .min(1, 'Provider name wajib diisi')
    .max(50, 'Provider name terlalu panjang'),

  api_url: z
    .string()
    .refine(
      (val) => val === '' || val.startsWith('https://') || val.startsWith('http://'),
      { message: 'URL harus dimulai dengan https:// atau http://' },
    )
    .optional(),

  api_token: z
    .string()
    .max(512, 'API Token terlalu panjang')
    .optional(),

  sender_number: z
    .string()
    .max(20, 'Nomor pengirim terlalu panjang')
    .regex(/^\d*$/, { message: 'Nomor pengirim hanya boleh angka' })
    .optional(),

  is_active: z.boolean(),

  template_absen_masuk: z
    .string()
    .max(1000, 'Template terlalu panjang')
    .optional(),

  template_absen_pulang: z
    .string()
    .max(1000, 'Template terlalu panjang')
    .optional(),

  template_izin: z
    .string()
    .max(1000, 'Template terlalu panjang')
    .optional(),
});

export type WhatsappConfigFormData = z.infer<typeof WhatsappConfigSchema>;

/** Validasi nomor HP pada tab Uji Coba. */
export const TestConnectionSchema = z.object({
  phone: z
    .string()
    .min(9, 'Nomor WA minimal 9 digit')
    .max(15, 'Nomor WA maksimal 15 digit')
    .regex(/^[0-9+]+$/, { message: 'Nomor WA hanya boleh angka atau diawali +' }),
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type LocalStatus = 'disconnected' | 'connecting' | 'connected' | null;

export interface TestResult {
  success: boolean;
  message: string;
}

export interface WaApiResponse {
  success: boolean;
  data?: WhatsappConfig;
  message?: string;
}

export interface WaLocalStatusResponse {
  success: boolean;
  data?: {
    status: string;
    number?: string;
  };
}

export interface WaQrResponse {
  success: boolean;
  qr?: string;
}

/** Tipe error map dari Zod yang digunakan lintas form. */
export type WaValidationErrors = Partial<Record<keyof WhatsappConfigFormData | 'phone', string>>;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default state kosong.
 * api_url sengaja dikosongkan — URL gateway diambil dari DB via API,
 * bukan dari hardcode di sisi frontend.
 */
export const EMPTY_WA_CONFIG: WhatsappConfig = {
  provider_name: 'FONNTE',
  api_url: '',
  api_token: '',
  sender_number: '',
  is_active: true,
  template_absen_masuk:
    'Halo Orang Tua/Wali dari {{nama_siswa}}, ananda telah tiba di sekolah pada pukul {{waktu}}. Terima kasih.',
  template_absen_pulang:
    'Halo Orang Tua/Wali dari {{nama_siswa}}, ananda telah meninggalkan sekolah pada pukul {{waktu}}. Terima kasih.',
  template_izin:
    'Informasi: {{nama_siswa}} telah dikonfirmasi {{tipe}} pada pukul {{waktu}}.',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Ekstrak pesan error dari `unknown` secara aman — dipakai di semua handler. */
export function extractWaError(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Konversi Zod parse error → map field → pesan. */
export function parseZodFieldErrors<T extends z.ZodTypeAny>(
  result: z.SafeParseError<z.infer<T>>,
): Partial<Record<string, string>> {
  const fieldErrors: Partial<Record<string, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as string | undefined;
    if (key) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
